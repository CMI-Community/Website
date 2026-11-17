import { describe, expect, it } from "vitest";
import { extractPosterPalette, comparePosterPalettes, shufflePosters } from "../app/modules/poster-wall/poster-colors";
const pixels = (rows: [number, number, number, number][]) => rows.flat();
const solid = (r: number, g: number, b: number) => extractPosterPalette(pixels(Array.from({ length: 100 }, () => [r, g, b, 255])))!;

describe("poster color spectrum", () => {
  it("orders sampled primary hues as a spectrum, followed by neutral and unavailable images", () => {
    const colors = [[255, 0, 0], [255, 125, 0], [255, 255, 0], [0, 255, 0], [0, 255, 255], [0, 0, 255], [150, 0, 255], [255, 255, 255], [50, 50, 50]];
    const palettes = colors.map(([r, g, b]) => solid(r, g, b));
    expect([...palettes].reverse().sort(comparePosterPalettes)).toEqual(palettes);
    expect([null, palettes[0], palettes[7]].sort(comparePosterPalettes)).toEqual([palettes[0], palettes[7], null]);
  });
  it("retains true dominant and major colors while choosing the main chromatic cluster above neutral paper", () => {
    const data = pixels([...Array.from({ length: 80 }, (): [number, number, number, number] => [250, 250, 250, 255]), ...Array.from({ length: 20 }, (): [number, number, number, number] => [255, 10, 5, 255])]);
    const palette = extractPosterPalette(data)!;
    expect(palette.dominant.share).toBeCloseTo(0.8);
    expect(palette.colors).toHaveLength(2);
    expect(palette.spectrum.hue).toBeLessThan(10);
    expect(palette.neutral).toBe(false);
    expect(extractPosterPalette([255, 0, 0, 0])).toBeNull();
    expect(solid(128, 128, 128).neutral).toBe(true);
  });
  it("shuffles all posters once per seed without mutating or losing entries", () => {
    const posters = Array.from({ length: 30 }, (_, i) => i);
    const shuffled = shufflePosters(posters, 42);
    expect(shuffled).toEqual(shufflePosters(posters, 42));
    expect(shuffled).not.toEqual(posters);
    expect(shuffled).not.toEqual(shufflePosters(posters, 43));
    expect([...shuffled].sort((a, b) => a - b)).toEqual(posters);
    expect(posters[0]).toBe(0);
  });
});
