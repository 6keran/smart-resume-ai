"""Decode the attached recording with already-installed OneDrive FFmpeg libraries."""
import ctypes as c
import json
import os
from pathlib import Path
import sys
from PIL import Image, ImageDraw

codec_dir = Path(os.environ['LOCALAPPDATA']) / 'Microsoft/OneDrive/Codecs/8.0.0.54'
dll_dir = os.add_dll_directory(str(codec_dir))
util = c.CDLL(str(codec_dir / 'avutil-60.dll'))
codec = c.CDLL(str(codec_dir / 'avcodec-62.dll'))
format_lib = c.CDLL(str(codec_dir / 'avformat-62.dll'))
scale = c.CDLL(str(codec_dir / 'swscale-9.dll'))

class Rational(c.Structure):
    _fields_ = [('num', c.c_int), ('den', c.c_int)]

class Stream(c.Structure):
    _fields_ = [('av_class', c.c_void_p), ('index', c.c_int), ('id', c.c_int), ('codecpar', c.c_void_p), ('private', c.c_void_p), ('time_base', Rational)]

class Format(c.Structure):
    _fields_ = [('av_class', c.c_void_p), ('input', c.c_void_p), ('output', c.c_void_p), ('private', c.c_void_p), ('io', c.c_void_p), ('flags', c.c_int), ('count', c.c_uint), ('streams', c.POINTER(c.POINTER(Stream)))]

class Packet(c.Structure):
    _fields_ = [('buffer', c.c_void_p), ('pts', c.c_int64), ('dts', c.c_int64), ('data', c.c_void_p), ('size', c.c_int), ('stream_index', c.c_int)]

class Frame(c.Structure):
    _fields_ = [('data', c.POINTER(c.c_uint8) * 8), ('linesize', c.c_int * 8), ('extended', c.c_void_p), ('width', c.c_int), ('height', c.c_int), ('samples', c.c_int), ('format', c.c_int), ('picture_type', c.c_int), ('aspect', Rational), ('pts', c.c_int64)]

def bind(lib, name, returns, *arguments):
    method = getattr(lib, name)
    method.restype = returns
    method.argtypes = arguments
    return method

open_input = bind(format_lib, 'avformat_open_input', c.c_int, c.POINTER(c.c_void_p), c.c_char_p, c.c_void_p, c.c_void_p)
stream_info = bind(format_lib, 'avformat_find_stream_info', c.c_int, c.c_void_p, c.c_void_p)
best_stream = bind(format_lib, 'av_find_best_stream', c.c_int, c.c_void_p, c.c_int, c.c_int, c.c_int, c.POINTER(c.c_void_p), c.c_int)
frame_rate = bind(format_lib, 'av_guess_frame_rate', Rational, c.c_void_p, c.c_void_p, c.c_void_p)
read_packet = bind(format_lib, 'av_read_frame', c.c_int, c.c_void_p, c.c_void_p)
close_input = bind(format_lib, 'avformat_close_input', None, c.POINTER(c.c_void_p))
alloc_context = bind(codec, 'avcodec_alloc_context3', c.c_void_p, c.c_void_p)
parameters = bind(codec, 'avcodec_parameters_to_context', c.c_int, c.c_void_p, c.c_void_p)
open_codec = bind(codec, 'avcodec_open2', c.c_int, c.c_void_p, c.c_void_p, c.c_void_p)
send_packet = bind(codec, 'avcodec_send_packet', c.c_int, c.c_void_p, c.c_void_p)
receive_frame = bind(codec, 'avcodec_receive_frame', c.c_int, c.c_void_p, c.c_void_p)
packet_alloc = bind(codec, 'av_packet_alloc', c.c_void_p)
packet_unref = bind(codec, 'av_packet_unref', None, c.c_void_p)
packet_free = bind(codec, 'av_packet_free', None, c.POINTER(c.c_void_p))
context_free = bind(codec, 'avcodec_free_context', None, c.POINTER(c.c_void_p))
frame_alloc = bind(util, 'av_frame_alloc', c.c_void_p)
frame_free = bind(util, 'av_frame_free', None, c.POINTER(c.c_void_p))
pixel_format = bind(util, 'av_get_pix_fmt', c.c_int, c.c_char_p)
scale_context = bind(scale, 'sws_getContext', c.c_void_p, c.c_int, c.c_int, c.c_int, c.c_int, c.c_int, c.c_int, c.c_int, c.c_void_p, c.c_void_p, c.c_void_p)
scale_frame = bind(scale, 'sws_scale', c.c_int, c.c_void_p, c.POINTER(c.POINTER(c.c_uint8)), c.POINTER(c.c_int), c.c_int, c.c_int, c.POINTER(c.POINTER(c.c_uint8)), c.POINTER(c.c_int))
scale_free = bind(scale, 'sws_freeContext', None, c.c_void_p)

source = Path(sys.argv[1])
step = float(sys.argv[2]) if len(sys.argv) > 2 else .25
out = Path('scripts/visual-qa/mascot/gait-reference')
(out / 'native-frames').mkdir(parents=True, exist_ok=True)
fmt = c.c_void_p()
ctx = c.c_void_p()
pkt = c.c_void_p()
frm = c.c_void_p()
sws = None
samples = []
decoded = 0
next_sample = 0
last_time = 0
dimensions = None

def check(result, operation):
    if result < 0:
        raise RuntimeError(f'{operation} failed with FFmpeg error {result}')

try:
    check(open_input(c.byref(fmt), str(source).encode('utf-8'), None, None), 'open input')
    check(stream_info(fmt, None), 'stream metadata')
    decoder = c.c_void_p()
    stream_index = best_stream(fmt, 0, -1, -1, c.byref(decoder), 0)
    check(stream_index, 'find video stream')
    stream_pointer = c.cast(fmt, c.POINTER(Format)).contents.streams[stream_index]
    stream = stream_pointer.contents
    assert stream.index == stream_index and stream.codecpar and stream.time_base.den > 0
    rate = frame_rate(fmt, c.cast(stream_pointer, c.c_void_p), None)
    fps = rate.num / rate.den if rate.den else 30
    ctx = c.c_void_p(alloc_context(decoder))
    check(parameters(ctx, stream.codecpar), 'decoder parameters')
    check(open_codec(ctx, decoder, None), 'open decoder')
    pkt = c.c_void_p(packet_alloc())
    frm = c.c_void_p(frame_alloc())

    def consume():
        global decoded, next_sample, last_time, dimensions, sws
        while receive_frame(ctx, frm) >= 0:
            frame = c.cast(frm, c.POINTER(Frame)).contents
            assert 0 < frame.width <= 8192 and 0 < frame.height <= 8192
            dimensions = (frame.width, frame.height)
            time = frame.pts * stream.time_base.num / stream.time_base.den if frame.pts > -(2**62) else decoded / fps
            decoded += 1
            last_time = max(last_time, time)
            if time + .00001 < next_sample:
                continue
            if not sws:
                sws = scale_context(frame.width, frame.height, frame.format, frame.width, frame.height, pixel_format(b'rgba'), 2, None, None, None)
                assert sws
            pixels = (c.c_uint8 * (frame.width * frame.height * 4))()
            destination = (c.POINTER(c.c_uint8) * 4)(c.cast(pixels, c.POINTER(c.c_uint8)))
            stride = (c.c_int * 4)(frame.width * 4)
            check(scale_frame(sws, frame.data, frame.linesize, 0, frame.height, destination, stride), 'convert pixels')
            image = Image.frombytes('RGBA', dimensions, bytes(pixels))
            name = f'frame-{time:.3f}.png'
            image.save(out / 'native-frames' / name)
            samples.append({'time': round(time, 4), 'name': name})
            next_sample = time + step

    while read_packet(fmt, pkt) >= 0:
        if c.cast(pkt, c.POINTER(Packet)).contents.stream_index == stream_index:
            check(send_packet(ctx, pkt), 'send packet')
            consume()
        packet_unref(pkt)
    send_packet(ctx, None)
    consume()
    metadata = {'recording': str(source), 'fps': fps, 'duration': last_time + 1 / fps, 'width': dimensions[0], 'height': dimensions[1], 'decodedFrames': decoded, 'sampleStep': step, 'frames': samples}
    (out / 'native-metadata.json').write_text(json.dumps(metadata, indent=2))
    selected = samples[::max(1, round(1 / step))]
    for offset in range(0, len(selected), 20):
        sheet = Image.new('RGB', (1280, 1020), '#e9edf2')
        draw = ImageDraw.Draw(sheet)
        for index, sample in enumerate(selected[offset:offset + 20]):
            image = Image.open(out / 'native-frames' / sample['name']).convert('RGB')
            image.thumbnail((320, 180))
            x, y = index % 4 * 320, index // 4 * 204
            sheet.paste(image, (x, y))
            draw.text((x + 8, y + 184), f"{sample['time']:.2f}s", fill='#111111')
        sheet.save(out / f'native-overview-{offset // 20}.png')
    print(json.dumps({key: value for key, value in metadata.items() if key != 'frames'}))
finally:
    if sws: scale_free(sws)
    if frm: frame_free(c.byref(frm))
    if pkt: packet_free(c.byref(pkt))
    if ctx: context_free(c.byref(ctx))
    if fmt: close_input(c.byref(fmt))
