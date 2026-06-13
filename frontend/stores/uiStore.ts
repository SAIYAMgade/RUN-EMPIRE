import { create } from 'zustand';

type MapStyle = 'roadmap' | 'satellite';
type InteractMode = 'click' | 'draw';

interface UIStoreState {
  mapStyle:      MapStyle;
  interactMode:  InteractMode;
  hoveredTileKey:string | null;
  tooltipCoords: { x: number; y: number } | null;
  
  setMapStyle:      (style: MapStyle) => void;
  setInteractMode:  (mode: InteractMode) => void;
  setHoveredTileKey:(key: string | null) => void;
  setTooltipCoords: (coords: { x: number; y: number } | null) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  mapStyle:      'roadmap',
  interactMode:  'click',
  hoveredTileKey:null,
  tooltipCoords: null,

  setMapStyle:      (style) => set({ mapStyle: style }),
  setInteractMode:  (mode) => set({ interactMode: mode }),
  setHoveredTileKey:(key) => set({ hoveredTileKey: key }),
  setTooltipCoords: (coords) => set({ tooltipCoords: coords }),
}));
