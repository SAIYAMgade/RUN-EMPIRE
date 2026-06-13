// List of premium neon/vivid colors for territories
export const TERRITORY_COLORS = [
  '#6366F1', // Indigo Glow
  '#EF4444', // Neon Crimson
  '#10B981', // Emerald Ray
  '#F59E0B', // Amber Spark
  '#3B82F6', // Cobalt blue
  '#8B5CF6', // Electric Purple
  '#EC4899', // Hot Pink
  '#14B8A6', // Cyan Burst
  '#F43F5E', // Rose Glow
  '#06B6D4', // Sky Ice
];

export function getRandomColor(): string {
  return TERRITORY_COLORS[Math.floor(Math.random() * TERRITORY_COLORS.length)];
}
