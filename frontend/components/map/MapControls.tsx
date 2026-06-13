import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useUserStore } from '../../stores/userStore';
import { Layers, MousePointerClick, SquarePen } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';

export function MapControls() {
  const { mapStyle, setMapStyle, interactMode, setInteractMode } = useUIStore();
  const { currentUser } = useUserStore();

  const primaryColor = currentUser?.color || '#6366F1';

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-3 z-[1001]">
      {/* Map Style Controls */}
      <GlassPanel className="p-1 flex flex-col gap-1">
        <button
          onClick={() => setMapStyle('roadmap')}
          className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
            mapStyle === 'roadmap'
              ? 'bg-slate-900 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{
            boxShadow: mapStyle === 'roadmap' ? `0 0 10px ${primaryColor}22` : undefined,
            color: mapStyle === 'roadmap' ? primaryColor : undefined
          }}
          title="Roadmap View"
        >
          <Layers className="w-5 h-5" />
        </button>
        <button
          onClick={() => setMapStyle('satellite')}
          className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
            mapStyle === 'satellite'
              ? 'bg-slate-900 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{
            boxShadow: mapStyle === 'satellite' ? `0 0 10px ${primaryColor}22` : undefined,
            color: mapStyle === 'satellite' ? primaryColor : undefined
          }}
          title="Satellite View"
        >
          <Layers className="w-5 h-5 rotate-90" />
        </button>
      </GlassPanel>

      {/* Interaction Mode Controls */}
      <GlassPanel className="p-1 flex flex-col gap-1">
        <button
          onClick={() => setInteractMode('click')}
          className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
            interactMode === 'click'
              ? 'bg-slate-900 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{
            boxShadow: interactMode === 'click' ? `0 0 10px ${primaryColor}22` : undefined,
            color: interactMode === 'click' ? primaryColor : undefined
          }}
          title="Single Click Claim"
        >
          <MousePointerClick className="w-5 h-5" />
        </button>
        <button
          onClick={() => setInteractMode('draw')}
          className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
            interactMode === 'draw'
              ? 'bg-slate-900 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          style={{
            boxShadow: interactMode === 'draw' ? `0 0 10px ${primaryColor}22` : undefined,
            color: interactMode === 'draw' ? primaryColor : undefined
          }}
          title="Draw Polygon Claim"
        >
          <SquarePen className="w-5 h-5" />
        </button>
      </GlassPanel>
    </div>
  );
}
