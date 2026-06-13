import { parseTileKey, hexToRgba } from '../../lib/geo';
import { GRID_SIZE } from '../../lib/constants';
import type { TileState } from '../../types';

const OverlayViewBase = typeof window !== 'undefined' && (window as any).google
  ? (window as any).google.maps.OverlayView
  : class {};

export class TileGridOverlay extends (OverlayViewBase as any) {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private tiles: Map<string, TileState>;
  private pendingTiles: Set<string>;
  private currentUserColor: string;
  private animatingTiles: Map<string, { progress: number; color: string; type: 'claim' | 'steal' }>;
  
  constructor(tiles: Map<string, TileState>, pendingTiles: Set<string>, userColor: string) {
    super();
    this.tiles = tiles;
    this.pendingTiles = pendingTiles;
    this.currentUserColor = userColor;
    this.animatingTiles = new Map();
  }

  private handleTileAnimate = (e: Event) => {
    const { tileKey, color, type } = (e as CustomEvent).detail;
    this.triggerAnimation(tileKey, color, type);
  };

  onAdd() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.pointerEvents = 'none'; // Let map events pass through
    this.ctx = this.canvas.getContext('2d')!;
    this.getPanes()!.overlayLayer.appendChild(this.canvas);

    if (typeof window !== 'undefined') {
      window.addEventListener('tile-animate', this.handleTileAnimate);
    }
  }

  draw() {
    const projection = this.getProjection();
    if (!projection) return;

    const map = this.getMap() as google.maps.Map;
    const bounds = map.getBounds();
    if (!bounds) return;

    const sw = projection.fromLatLngToDivPixel(bounds.getSouthWest())!;
    const ne = projection.fromLatLngToDivPixel(bounds.getNorthEast())!;

    const width  = ne.x - sw.x;
    const height = sw.y - ne.y;

    this.canvas.style.left   = `${sw.x}px`;
    this.canvas.style.top    = `${ne.y}px`;
    this.canvas.width  = width;
    this.canvas.height = height;

    this.renderAll(width, height);
  }

  private renderAll(width: number, height: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);
    
    const tileW = width  / GRID_SIZE;
    const tileH = height / GRID_SIZE;

    this.tiles.forEach((tile, key) => {
      const { row, col } = parseTileKey(key);
      const x =                      col * tileW;
      const y = (GRID_SIZE - 1 - row) * tileH; // Flip Y (latitude increases upward)

      const isPending  = this.pendingTiles.has(key);
      const animating  = this.animatingTiles.get(key);

      if (tile.ownerId) {
        const alpha = isPending ? 0.65 : 0.42;
        ctx.fillStyle = hexToRgba(tile.ownerColor!, alpha);
        ctx.fillRect(x, y, tileW, tileH);

        ctx.strokeStyle = isPending
          ? hexToRgba(tile.ownerColor!, 0.9)
          : hexToRgba(tile.ownerColor!, 0.6);
        ctx.lineWidth = isPending ? 1.5 : 0.8;
        ctx.strokeRect(x + 0.5, y + 0.5, tileW - 1, tileH - 1);
      } else {
        // Unclaimed: very subtle grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, tileW, tileH);
      }

      // Ripple animation overlay
      if (animating) {
        const p = animating.progress; // 0 → 1
        const radius = Math.max(tileW, tileH) * p * 2.5;
        const cx = x + tileW / 2;
        const cy = y + tileH / 2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0,   hexToRgba(animating.color, 0.7 * (1 - p)));
        grad.addColorStop(1,   hexToRgba(animating.color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Trigger a ripple animation on a tile (after claim/steal)
  triggerAnimation(tileKey: string, color: string, type: 'claim' | 'steal') {
    const startTime = performance.now();
    const duration  = 600; // ms

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      this.animatingTiles.set(tileKey, { progress, color, type });
      this.draw(); // Re-render
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.animatingTiles.delete(tileKey);
        this.draw();
      }
    };

    requestAnimationFrame(animate);
  }

  updateTiles(tiles: Map<string, TileState>, pending: Set<string>, userColor: string) {
    this.tiles = tiles;
    this.pendingTiles = pending;
    this.currentUserColor = userColor;
    this.draw();
  }

  onRemove() {
    this.canvas.remove();
    if (typeof window !== 'undefined') {
      window.removeEventListener('tile-animate', this.handleTileAnimate);
    }
  }
}
