'use client';

import { useEffect, useRef, useState } from 'react';
import { useTileStore } from '../../stores/tileStore';
import { useUIStore } from '../../stores/uiStore';
import { useUserStore } from '../../stores/userStore';
import { useSocket } from '../../hooks/useSocket';
import { useTileClaim } from '../../hooks/useTileClaim';
import { latLngToTileKey, tileKeyToLatLngBounds } from '../../lib/geo';
import { MAP_CENTER, MAP_DEFAULT_ZOOM, FAMOUS_AREAS } from '../../lib/constants';
import { MapControls } from './MapControls';
import { TileTooltip } from './TileTooltip';
import type { GeoJSONPolygon } from '../../types';
import 'leaflet/dist/leaflet.css';

export function GameMap() {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInstance  = useRef<any>(null);
  const hoverRectRef = useRef<any>(null);
  const claimedRectsRef = useRef<Map<string, any>>(new Map());
  const tileLayersRef   = useRef<any>(null);

  const drawingPoints   = useRef<any[]>([]);
  const drawingPolyline = useRef<any>(null);
  const drawingMarkers  = useRef<any[]>([]);
  const LRef            = useRef<any>(null); // Save L instance

  const [pointCount, setPointCount] = useState(0);

  const { tiles, pendingTiles }   = useTileStore();
  const { mapStyle, interactMode } = useUIStore();
  const { currentUser }           = useUserStore();
  const { claimTile }             = useTileClaim();
  const { socket }                = useSocket();

  // Create stable refs to callbacks/sockets to keep map init dependency array empty
  const claimTileRef = useRef(claimTile);
  useEffect(() => {
    claimTileRef.current = claimTile;
  }, [claimTile]);

  const socketRef = useRef(socket);
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Clear drawing elements
  const clearDrawing = () => {
    if (drawingPolyline.current) {
      drawingPolyline.current.remove();
      drawingPolyline.current = null;
    }
    drawingMarkers.current.forEach(m => m.remove());
    drawingMarkers.current = [];
    drawingPoints.current = [];
    setPointCount(0);
  };

  // Finish polygon drawing
  const finishDrawing = () => {
    if (drawingPoints.current.length < 3) {
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { message: '⚠️ A polygon must have at least 3 points!', type: 'error' }
      }));
      clearDrawing();
      return;
    }

    const coords = drawingPoints.current.map(p => [p.lng, p.lat]);
    coords.push([drawingPoints.current[0].lng, drawingPoints.current[0].lat]);

    const geoJson: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [coords],
    };

    socketRef.current.emit('tiles:draw', geoJson, (res: any) => {
      if (res.error) {
        window.dispatchEvent(new CustomEvent('toast', {
          detail: { message: res.error, type: 'error' }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('toast', {
          detail: { message: `🏆 Successfully claimed ${res.totalClaimed} tiles!`, type: 'success' }
        }));
      }
    });

    clearDrawing();
    useUIStore.getState().setInteractMode('click');
  };

  // Synchronize claimed tiles helper
  const syncTiles = () => {
    if (!mapInstance.current || !LRef.current) return;
    const L = LRef.current;

    tiles.forEach((tile, key) => {
      if (tile.ownerId) {
        const isPending = pendingTiles.has(key);
        const color = tile.ownerColor || '#6366F1';
        const fillOpacity = isPending ? 0.65 : 0.42;
        const weight = isPending ? 1.5 : 0.8;

        const existing = claimedRectsRef.current.get(key);
        if (existing) {
          existing.setStyle({
            fillColor: color,
            color: color,
            fillOpacity,
            weight
          });
        } else {
          const b = tileKeyToLatLngBounds(key);
          const rect = L.rectangle([[b.south, b.west], [b.north, b.east]], {
            fillColor: color,
            color: color,
            fillOpacity,
            weight,
            interactive: false
          }).addTo(mapInstance.current);
          claimedRectsRef.current.set(key, rect);
        }
      } else {
        const existing = claimedRectsRef.current.get(key);
        if (existing) {
          existing.remove();
          claimedRectsRef.current.delete(key);
        }
      }
    });

    // Prune deleted/reverted cells
    claimedRectsRef.current.forEach((rect, key) => {
      if (!tiles.has(key)) {
        rect.remove();
        claimedRectsRef.current.delete(key);
      }
    });
  };

  // Initialize Leaflet Map (Runs exactly ONCE on mount)
  useEffect(() => {
    if (!mapRef.current) return;

    let isMounted = true;
    let map: any = null;

    const initMap = async () => {
      if (mapInstance.current) return;

      const L = (await import('leaflet')).default;
      LRef.current = L;

      if (!isMounted) return;
      if (mapInstance.current) return;

      // Fix Leaflet default marker icon asset paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // 1. Create map
      map = L.map(mapRef.current!, {
        center: [MAP_CENTER.lat, MAP_CENTER.lng],
        zoom: MAP_DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: false,
        maxBounds: [
          [28.20, 76.50],
          [29.10, 77.70]
        ],
        minZoom: 10,
        renderer: L.canvas()
      });
      mapInstance.current = map;

      // 2. Initialize Layer Providers (CartoDB Dark Matter & Esri Satellite)
      const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      });
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
      });

      tileLayersRef.current = {
        roadmap: darkLayer,
        satellite: satelliteLayer
      };

      // Add default layer
      if (useUIStore.getState().mapStyle === 'satellite') {
        satelliteLayer.addTo(map);
      } else {
        darkLayer.addTo(map);
      }

      // 3. Draw cyber-grid lines (rows & cols)
      const DELHI_NCR = { north: 28.88, south: 28.40, west: 76.84, east: 77.35 };
      const GRID_SIZE = 50;
      const latStep = (DELHI_NCR.north - DELHI_NCR.south) / GRID_SIZE;
      const lngStep = (DELHI_NCR.east - DELHI_NCR.west) / GRID_SIZE;

      for (let r = 0; r <= GRID_SIZE; r++) {
        const lat = DELHI_NCR.south + r * latStep;
        L.polyline([[lat, DELHI_NCR.west], [lat, DELHI_NCR.east]], {
          color: 'rgba(255, 255, 255, 0.05)',
          weight: 0.6,
          interactive: false
        }).addTo(map);
      }

      for (let c = 0; c <= GRID_SIZE; c++) {
        const lng = DELHI_NCR.west + c * lngStep;
        L.polyline([[DELHI_NCR.south, lng], [DELHI_NCR.north, lng]], {
          color: 'rgba(255, 255, 255, 0.05)',
          weight: 0.6,
          interactive: false
        }).addTo(map);
      }

      // 4. Create hovered tile indicator
      const hoverRect = L.rectangle([[0, 0], [0, 0]], {
        color: 'rgba(255, 255, 255, 0.25)',
        weight: 1.5,
        fillOpacity: 0,
        interactive: false
      }).addTo(map);
      hoverRectRef.current = hoverRect;

      // 5. Add famous area landmarks
      FAMOUS_AREAS.forEach(area => {
        L.circleMarker([area.lat, area.lng], {
          radius: 5,
          fillColor: '#F59E0B',
          fillOpacity: 0.9,
          color: '#070b12',
          weight: 1.5,
          interactive: true
        }).bindTooltip(area.name, { permanent: false, direction: 'top' }).addTo(map);
      });

      // 6. Click handler: claim tile or draw polygon
      map.on('click', (e: any) => {
        const mode = useUIStore.getState().interactMode;
        const latlng = e.latlng;
        if (!latlng) return;

        if (mode === 'click') {
          const tileKey = latLngToTileKey(latlng.lat, latlng.lng);
          if (tileKey) claimTileRef.current(tileKey);
        } else if (mode === 'draw') {
          const userColor = useUserStore.getState().currentUser?.color || '#6366F1';
          
          if (drawingPoints.current.length === 0) {
            const startMarker = L.circleMarker(latlng, {
              radius: 7,
              fillColor: userColor,
              fillOpacity: 1,
              color: '#F59E0B',
              weight: 2,
              interactive: true
            }).addTo(map);
            
            startMarker.on('click', (ev: any) => {
              if (ev.originalEvent) ev.originalEvent.stopPropagation();
              finishDrawing();
            });
            drawingMarkers.current.push(startMarker);
            
            drawingPolyline.current = L.polyline([latlng], {
              color: userColor,
              opacity: 0.9,
              weight: 3,
              interactive: false
            }).addTo(map);
            
            drawingPoints.current.push(latlng);
            setPointCount(1);
          } else {
            const start = drawingPoints.current[0];
            const distance = Math.hypot(latlng.lat - start.lat, latlng.lng - start.lng);
            if (distance < 0.0008) {
              finishDrawing();
              return;
            }
            
            drawingPoints.current.push(latlng);
            drawingPolyline.current?.setLatLngs(drawingPoints.current);
            setPointCount(drawingPoints.current.length);
            
            const nodeMarker = L.circleMarker(latlng, {
              radius: 4,
              fillColor: userColor,
              fillOpacity: 0.9,
              color: '#ffffff',
              weight: 1,
              interactive: false
            }).addTo(map);
            
            drawingMarkers.current.push(nodeMarker);
          }
        }
      });

      // 7. Mousemove handler: tooltips and rubber-banding
      map.on('mousemove', (e: any) => {
        const latlng = e.latlng;
        if (!latlng) return;
        const uiStore = useUIStore.getState();
        const mode = uiStore.interactMode;

        if (mode === 'click') {
          const tileKey = latLngToTileKey(latlng.lat, latlng.lng);
          if (tileKey !== uiStore.hoveredTileKey) {
            uiStore.setHoveredTileKey(tileKey);
            if (tileKey) {
              const b = tileKeyToLatLngBounds(tileKey);
              hoverRectRef.current?.setBounds([[b.south, b.west], [b.north, b.east]]);
            }
          }
        } else if (mode === 'draw' && drawingPoints.current.length > 0) {
          const tempPath = [...drawingPoints.current, latlng];
          drawingPolyline.current?.setLatLngs(tempPath);
        }

        if (e.originalEvent) {
          uiStore.setTooltipCoords({
            x: e.originalEvent.clientX,
            y: e.originalEvent.clientY,
          });
        }
      });

      // 8. Mouseout handler
      map.on('mouseout', () => {
        const uiStore = useUIStore.getState();
        uiStore.setHoveredTileKey(null);
        uiStore.setTooltipCoords(null);
        hoverRectRef.current?.setBounds([[0, 0], [0, 0]]);
      });

      // Initial sync of claimed tiles
      syncTiles();
    };

    initMap();

    return () => {
      isMounted = false;
      if (map) {
        map.remove();
        mapInstance.current = null;
      } else if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      claimedRectsRef.current.clear();
    };
  }, []);

  // Sync claimed tiles with Leaflet when Zustand store changes
  useEffect(() => {
    syncTiles();
  }, [tiles, pendingTiles]);

  // Handle ripple animations
  useEffect(() => {
    if (!LRef.current) return;
    const L = LRef.current;

    const triggerRippleAnimation = (latLng: any, color: string) => {
      if (!mapInstance.current) return;
      
      const circle = L.circle(latLng, {
        radius: 40,
        fillColor: color,
        fillOpacity: 0.7,
        color: color,
        weight: 1,
        opacity: 0.7,
        interactive: false
      }).addTo(mapInstance.current);
      
      const duration = 600;
      const startTime = performance.now();
      
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentRadius = 40 + progress * 400;
        const currentOpacity = 0.7 * (1 - progress);
        
        circle.setRadius(currentRadius);
        circle.setStyle({
          fillOpacity: currentOpacity,
          opacity: currentOpacity
        });
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          circle.remove();
        }
      };
      
      requestAnimationFrame(animate);
    };

    const handleTileAnimate = (e: Event) => {
      const { tileKey, color } = (e as CustomEvent).detail;
      const bounds = tileKeyToLatLngBounds(tileKey);
      const center = L.latLng((bounds.south + bounds.north) / 2, (bounds.west + bounds.east) / 2);
      triggerRippleAnimation(center, color);
    };
    
    window.addEventListener('tile-animate', handleTileAnimate);
    return () => {
      window.removeEventListener('tile-animate', handleTileAnimate);
    };
  }, []);

  // Sync map style changes
  useEffect(() => {
    if (!mapInstance.current || !tileLayersRef.current) return;
    const map = mapInstance.current;
    const { roadmap, satellite } = tileLayersRef.current;
    
    if (mapStyle === 'roadmap') {
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
      roadmap.addTo(map);
    } else if (mapStyle === 'satellite') {
      if (map.hasLayer(roadmap)) map.removeLayer(roadmap);
      satellite.addTo(map);
    }
  }, [mapStyle]);

  // Sync interaction cursor and drawing overlays on mode change
  useEffect(() => {
    if (!mapInstance.current) return;
    if (interactMode === 'draw') {
      mapRef.current!.style.cursor = 'crosshair';
    } else {
      mapRef.current!.style.cursor = '';
      clearDrawing();
    }
  }, [interactMode]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full bg-[#070b12]" />
      <MapControls />
      <TileTooltip />

      {/* Floating Draw Mode HUD */}
      {interactMode === 'draw' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-4 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 px-6 py-3.5 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col">
            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              Drawing Mode Active
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 max-w-[260px] leading-relaxed">
              {pointCount === 0 
                ? "Click on the map to place the first boundary point." 
                : `Placed ${pointCount} points. Click the first yellow node to close the loop and claim.`}
            </span>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-800/80 pl-4">
            {pointCount >= 3 && (
              <button
                onClick={finishDrawing}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
              >
                Complete
              </button>
            )}
            <button
              onClick={() => {
                clearDrawing();
                useUIStore.getState().setInteractMode('click');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-black text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
