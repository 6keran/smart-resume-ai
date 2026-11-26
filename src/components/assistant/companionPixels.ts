// Keep the face legible at launcher size and bound the cost of larger previews.
export function companionPixelSize(width: number, height: number) {
  const scale = Math.min(1, 96 / Math.max(1, width));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// Hard alpha edges and stepped shades give the existing artwork a crisp sprite finish.
export function posterizeCompanionPixels(pixels: Uint8ClampedArray) {
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) { pixels[index + 3] = 0; continue; }
    for (let channel = 0; channel < 3; channel++) pixels[index + channel] = Math.min(255, Math.round(pixels[index + channel] / 32) * 32);
    pixels[index + 3] = 255;
  }
}
