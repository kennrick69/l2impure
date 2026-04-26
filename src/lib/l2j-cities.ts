/**
 * Ranges aproximados de coordenadas das principais cidades L2 Interlude.
 * Centros ± buffer pra capturar NPCs em zonas adjacentes.
 *
 * Caso uma cidade não tenha range definido aqui, NPCs lá continuam visíveis
 * — só não casa com o filtro "cidade X".
 */
export type CityRange = {
  name: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export const L2J_CITIES: CityRange[] = [
  { name: "Talking Island", xMin: -88000, xMax: -78000, yMin: 240000, yMax: 252000 },
  { name: "Elven Village", xMin: 44000, xMax: 50000, yMin: 47000, yMax: 53000 },
  { name: "Dark Elven Village", xMin: 9000, xMax: 18000, yMin: 14000, yMax: 22000 },
  { name: "Dwarven Village", xMin: 113000, xMax: 119000, yMin: -185000, yMax: -179000 },
  { name: "Orc Village", xMin: -47000, xMax: -41000, yMin: -116000, yMax: -110000 },
  { name: "Gludin", xMin: -86000, xMax: -78000, yMin: 148000, yMax: 156000 },
  { name: "Gludio", xMin: -16000, xMax: -10000, yMin: 121000, yMax: 128000 },
  { name: "Dion", xMin: 14000, xMax: 21000, yMin: 140000, yMax: 147000 },
  { name: "Giran", xMin: 79000, xMax: 86000, yMin: 145000, yMax: 152000 },
  { name: "Hardin's", xMin: 103000, xMax: 110000, yMin: 109000, yMax: 115000 },
  { name: "Heine", xMin: 108000, xMax: 116000, yMin: 218000, yMax: 226000 },
  { name: "Hunter's Village", xMin: 115000, xMax: 121000, yMin: 73000, yMax: 79000 },
  { name: "Aden", xMin: 144000, xMax: 150000, yMin: 22000, yMax: 28000 },
  { name: "Goddard", xMin: 145000, xMax: 152000, yMin: -53000, yMax: -45000 },
  { name: "Schuttgart", xMin: 76000, xMax: 84000, yMin: -138000, yMax: -130000 },
  { name: "Rune", xMin: 38000, xMax: 45000, yMin: -52000, yMax: -45000 },
  { name: "Oren", xMin: 78000, xMax: 86000, yMin: 47000, yMax: 55000 },
];

export function detectCity(x: number, y: number): string | null {
  for (const c of L2J_CITIES) {
    if (x >= c.xMin && x <= c.xMax && y >= c.yMin && y <= c.yMax) return c.name;
  }
  return null;
}
