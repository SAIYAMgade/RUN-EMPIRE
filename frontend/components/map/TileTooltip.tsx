import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useTileStore } from '../../stores/tileStore';
import { GlassPanel } from '../ui/GlassPanel';
import { parseTileKey } from '../../lib/geo';

export function TileTooltip() {
  const { hoveredTileKey, tooltipCoords } = useUIStore();
  const { tiles } = useTileStore();

  if (!hoveredTileKey || !tooltipCoords) return null;

  const tile = tiles.get(hoveredTileKey);
  const { row, col } = parseTileKey(hoveredTileKey);

  const primaryColor = tile?.ownerColor || '#6366F1';

  return (
    <div
      className="fixed z-[1002] pointer-events-none select-none transition-all duration-75"
      style={{
        left: `${tooltipCoords.x + 15}px`,
        top: `${tooltipCoords.y + 15}px`,
      }}
    >
      <GlassPanel 
        className="px-3.5 py-2.5 flex flex-col gap-1 text-xs min-w-[150px] shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-slate-700/50"
        style={{
          boxShadow: tile?.ownerId ? `0 4px 20px ${primaryColor}15` : undefined
        }}
      >
        {/* Header - Row & Col */}
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5 mb-1">
          <span className="font-bold text-slate-200 tracking-wider">TILE {hoveredTileKey.toUpperCase()}</span>
          <span className="text-[10px] text-slate-500">R{row} C{col}</span>
        </div>

        {/* Content */}
        {tile?.ownerId ? (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <div 
                className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: tile.ownerColor! }}
              />
              <span className="font-semibold text-slate-200 truncate max-w-[110px]">
                {tile.ownerName}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              Claims: <span className="font-medium text-slate-200">{tile.claimCount}</span>
            </span>
            {tile.claimedAt && (
              <span className="text-[9px] text-slate-500">
                {new Date(tile.claimedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        ) : (
          <span className="font-semibold text-slate-500 italic py-0.5">Unclaimed Territory</span>
        )}
      </GlassPanel>
    </div>
  );
}
