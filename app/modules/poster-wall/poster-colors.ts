export interface PosterColor {
  rgb: [number, number, number];
  hue: number;
  saturation: number;
  lightness: number;
  share: number;
}
export interface PosterPalette {
  dominant: PosterColor;
  colors: PosterColor[];
  spectrum: PosterColor;
  neutral: boolean;
}

function describeColor(rgb: [number, number, number], share: number): PosterColor {
  const [r, g, b] = rgb.map(value => value / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const lightness = (max + min) / 2;
  const hue = delta === 0 ? 0 : (60 * (max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) + 360) % 360;
  return { rgb, hue, saturation: delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1)), lightness, share };
}

/** Quantize real pixels; avoid inventing hues from titles, filenames or mixed averages. */
export function extractPosterPalette(pixels: ArrayLike<number>): PosterPalette | null {
  const bins = new Map<number, { count: number; r: number; g: number; b: number }>();
  let total = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
    const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bin.count++; bin.r += r; bin.g += g; bin.b += b; total++;
    bins.set(key, bin);
  }
  if (!total) return null;
  const colors = [...bins.values()].sort((a, b) => b.count - a.count).map(bin => describeColor(
    [Math.round(bin.r / bin.count), Math.round(bin.g / bin.count), Math.round(bin.b / bin.count)], bin.count / total,
  ));
  // A poster's neutral paper/background may dominate. Use a substantial primary
  // chromatic cluster for its spectral position, keeping the true dominant too.
  const hueBins = new Map<number, { share: number; rgb: number[] }>();
  for (const color of colors.filter(color => color.saturation >= 0.18 && color.lightness > 0.06 && color.lightness < 0.94)) {
    const key = Math.floor(color.hue / 15);
    const bin = hueBins.get(key) ?? { share: 0, rgb: [0, 0, 0] };
    bin.share += color.share;
    color.rgb.forEach((value, i) => { bin.rgb[i] += value * color.share; });
    hueBins.set(key, bin);
  }
  const chromatic = [...hueBins.values()].filter(bin => bin.share >= 0.04).map(bin => describeColor(
    bin.rgb.map(value => Math.round(value / bin.share)) as [number, number, number], bin.share,
  ));
  chromatic.sort((a, b) => b.share * Math.sqrt(b.saturation) - a.share * Math.sqrt(a.saturation));
  return { dominant: colors[0], colors: colors.slice(0, 6), spectrum: chromatic[0] ?? colors[0], neutral: chromatic.length === 0 };
}

export function comparePosterPalettes(a?: PosterPalette | null, b?: PosterPalette | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  if (a.neutral !== b.neutral) return a.neutral ? 1 : -1;
  if (a.neutral) return b.dominant.lightness - a.dominant.lightness;
  return Math.floor(a.spectrum.hue / 12) - Math.floor(b.spectrum.hue / 12) ||
    b.spectrum.saturation - a.spectrum.saturation || b.spectrum.lightness - a.spectrum.lightness;
}

export function shufflePosters<T>(posters: readonly T[], seed: number): T[] {
  const result = [...posters];
  let state = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    const j = Math.floor((((value ^ (value >>> 14)) >>> 0) / 4294967296) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
