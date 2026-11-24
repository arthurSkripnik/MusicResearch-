// One colour per genre, so territories, styles and arrows read apart; amber stays reserved for the selection.
export const GENRE_COLOR: Record<string, string> = {
  'genre:jazz': '#6f9bc4', 'genre:funk-soul': '#c86a8c', 'genre:latin': '#dd8550', 'genre:reggae': '#7cb36a',
  'genre:hip-hop': '#a088d6', 'genre:electronic': '#45b5ba', 'genre:pop': '#e795bd', 'genre:rock': '#c25a4c',
  'genre:folk-world-country': '#aea65e',
};
export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
