import { create } from 'zustand';
import type { TileState, TileUpdateEvent } from '../types';

interface TileStoreState {
  tiles: Map<string, TileState>;
  pendingTiles: Set<string>;          // Optimistically claimed, not confirmed
  lastUpdated:  string | null;

  setInitialState: (tiles: TileState[]) => void;
  applyUpdate:     (update: TileUpdateEvent) => void;
  applyBatchUpdate:(updates: TileUpdateEvent[]) => void;
  setPending:      (tileKey: string) => void;
  clearPending:    (tileKey: string) => void;
  revertOptimistic:(tileKey: string, previous: TileState | undefined) => void;
  updateUserColorInTiles: (userId: string, color: string) => void;
}

export const useTileStore = create<TileStoreState>((set) => ({
  tiles:        new Map(),
  pendingTiles: new Set(),
  lastUpdated:  null,

  setInitialState: (tiles) => set(() => {
    const tileMap = new Map<string, TileState>();
    tiles.forEach(t => tileMap.set(t.tileKey, t));
    return {
      tiles: tileMap,
      lastUpdated: new Date().toISOString()
    };
  }),

  applyUpdate: (update) => set((state) => {
    const newTiles = new Map(state.tiles);
    const existing = newTiles.get(update.tileKey);
    
    newTiles.set(update.tileKey, {
      tileKey:    update.tileKey,
      rowIdx:     existing ? existing.rowIdx : parseInt(update.tileKey.slice(1, 3)),
      colIdx:     existing ? existing.colIdx : parseInt(update.tileKey.slice(4, 6)),
      centerLat:  existing ? existing.centerLat : 0,
      centerLng:  existing ? existing.centerLng : 0,
      ownerId:    update.ownerId,
      ownerColor: update.ownerColor,
      ownerName:  update.ownerName,
      claimedAt:  update.claimedAt,
      claimCount: existing ? existing.claimCount + 1 : 1,
    });

    const newPending = new Set(state.pendingTiles);
    newPending.delete(update.tileKey);

    return {
      tiles: newTiles,
      pendingTiles: newPending,
      lastUpdated: update.claimedAt
    };
  }),

  applyBatchUpdate: (updates) => set((state) => {
    const newTiles = new Map(state.tiles);
    const newPending = new Set(state.pendingTiles);

    updates.forEach(u => {
      const existing = newTiles.get(u.tileKey);
      newTiles.set(u.tileKey, {
        tileKey:    u.tileKey,
        rowIdx:     existing ? existing.rowIdx : parseInt(u.tileKey.slice(1, 3)),
        colIdx:     existing ? existing.colIdx : parseInt(u.tileKey.slice(4, 6)),
        centerLat:  existing ? existing.centerLat : 0,
        centerLng:  existing ? existing.centerLng : 0,
        ownerId:    u.ownerId,
        ownerColor: u.ownerColor,
        ownerName:  u.ownerName,
        claimedAt:  u.claimedAt,
        claimCount: existing ? existing.claimCount + 1 : 1,
      });
      newPending.delete(u.tileKey);
    });

    return {
      tiles: newTiles,
      pendingTiles: newPending,
      lastUpdated: new Date().toISOString()
    };
  }),

  setPending: (tileKey) => set((state) => {
    const newPending = new Set(state.pendingTiles);
    newPending.add(tileKey);
    return { pendingTiles: newPending };
  }),

  clearPending: (tileKey) => set((state) => {
    const newPending = new Set(state.pendingTiles);
    newPending.delete(tileKey);
    return { pendingTiles: newPending };
  }),

  revertOptimistic: (tileKey, previous) => set((state) => {
    const newPending = new Set(state.pendingTiles);
    newPending.delete(tileKey);
    const newTiles = new Map(state.tiles);
    if (previous) {
      newTiles.set(tileKey, previous);
    } else {
      newTiles.delete(tileKey);
    }
    return {
      tiles: newTiles,
      pendingTiles: newPending
    };
  }),

  updateUserColorInTiles: (userId, color) => set((state) => {
    const newTiles = new Map(state.tiles);
    let changed = false;
    newTiles.forEach((tile, key) => {
      if (tile.ownerId === userId && tile.ownerColor !== color) {
        newTiles.set(key, {
          ...tile,
          ownerColor: color
        });
        changed = true;
      }
    });
    if (changed) {
      return { tiles: newTiles, lastUpdated: new Date().toISOString() };
    }
    return {};
  }),
}));
