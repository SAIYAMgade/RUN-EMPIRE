import { DELHI_NCR, GRID_SIZE } from './constants';

export function latLngToTileKey(lat: number, lng: number): string | null {
  const row = Math.floor(
    ((lat - DELHI_NCR.south) / (DELHI_NCR.north - DELHI_NCR.south)) * GRID_SIZE
  );
  const col = Math.floor(
    ((lng - DELHI_NCR.west) / (DELHI_NCR.east - DELHI_NCR.west)) * GRID_SIZE
  );
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
  return `r${String(row).padStart(2, '0')}c${String(col).padStart(2, '0')}`;
}

export function parseTileKey(key: string): { row: number; col: number } {
  const row = parseInt(key.slice(1, 3));
  const col = parseInt(key.slice(4, 6));
  return { row, col };
}

export function tileKeyToLatLngBounds(key: string) {
  const { row, col } = parseTileKey(key);
  const latStep = (DELHI_NCR.north - DELHI_NCR.south) / GRID_SIZE;
  const lngStep = (DELHI_NCR.east - DELHI_NCR.west) / GRID_SIZE;
  return {
    south: DELHI_NCR.south + row * latStep,
    north: DELHI_NCR.south + (row + 1) * latStep,
    west:  DELHI_NCR.west + col * lngStep,
    east:  DELHI_NCR.west + (col + 1) * lngStep,
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  // Strip # if present
  const cleanedHex = hex.replace('#', '');
  const r = parseInt(cleanedHex.slice(0, 2), 16);
  const g = parseInt(cleanedHex.slice(2, 4), 16);
  const b = parseInt(cleanedHex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
