import json
from pathlib import Path
from PIL import Image, ImageDraw

root = Path('scripts/visual-qa/mascot/gait-reference')
meta = json.loads((root / 'native-metadata.json').read_text())
(root / 'robot-crops').mkdir(exist_ok=True)
tracked = []
for frame in meta['frames']:
    image = Image.open(root / 'native-frames' / frame['name']).convert('RGB')
    small = image.resize((image.width // 2, image.height // 2))
    pixels = small.load()
    mask = {(x, y) for y in range(small.height) for x in range(small.width) if (lambda r, g, b: b > 100 and b > r * 1.18 and b > g * 1.08)(*pixels[x, y])}
    largest = []
    while mask:
        point = mask.pop()
        component, queue = [point], [point]
        while queue:
            x, y = queue.pop()
            for adjacent in [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]:
                if adjacent in mask:
                    mask.remove(adjacent); component.append(adjacent); queue.append(adjacent)
        if len(component) > len(largest): largest = component
    if len(largest) < 40: continue
    left, right = min(p[0] for p in largest) * 2, max(p[0] for p in largest) * 2
    top, bottom = min(p[1] for p in largest) * 2, max(p[1] for p in largest) * 2
    x, y = (left + right) / 2, top + (bottom - top) / 2
    crop = image.crop((round(x - 64), top - 12, round(x + 64), top + 136))
    crop.save(root / 'robot-crops' / frame['name'])
    tracked.append({**frame, 'x': x, 'y': y, 'headWidth': right - left, 'headHeight': bottom - top})
for page in range(0, len(tracked), 90):
    selected = tracked[page:page + 90:3]
    sheet = Image.new('RGB', (768, 800), '#eef1f5')
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(selected):
        crop = Image.open(root / 'robot-crops' / frame['name'])
        x, y = index % 6 * 128, index // 6 * 160
        sheet.paste(crop, (x, y)); draw.text((x + 4, y + 148), f"{frame['time']:.2f}s", fill='#111')
    sheet.save(root / f'gait-detail-{page // 90}.png')
(root / 'tracked-reference.json').write_text(json.dumps({'frames': tracked}, indent=2))
print(f'Tracked {len(tracked)} reference frames; full-clip gait contact sheets saved.')
