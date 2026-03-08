"use client";

import { useState, useRef } from "react";
import { MapPin, Plus, Trash2, Maximize2, Minimize2, Image as ImageIcon } from "lucide-react";
import { createMap, saveMapMarker } from "../../actions";
import { cn } from "@/lib/utils";

export default function MapViewer({ partyId, initialMaps, isGM }: { partyId: string, initialMaps: any[], isGM: boolean }) {
  const [maps, setMaps] = useState(initialMaps);
  const [activeMapIndex, setActiveMapIndex] = useState(0);
  const [isAddingMap, setIsAddingMap] = useState(false);
  const [newMap, setNewMap] = useState({ name: "", imageUrl: "" });
  const [isZoomed, setIsZoomed] = useState(false);
  
  const activeMap = maps[activeMapIndex];
  const mapRef = useRef<HTMLDivElement>(null);

  async function handleAddMap() {
    if (!newMap.name || !newMap.imageUrl) return;
    const map = await createMap(partyId, newMap.name, newMap.imageUrl);
    setMaps([...maps, map]);
    setNewMap({ name: "", imageUrl: "" });
    setIsAddingMap(false);
  }

  async function handleMapClick(e: React.MouseEvent) {
    if (!isGM || !mapRef.current || !activeMap) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const label = prompt("Enter a label for this location:");
    if (label === null) return;

    const markers = [...(activeMap.markers as any[]), { x, y, label }];
    const updatedMap = await saveMapMarker(activeMap.id, markers);
    
    const newMaps = [...maps];
    newMaps[activeMapIndex] = updatedMap;
    setMaps(newMaps);
  }

  async function handleDeleteMarker(idx: number) {
    if (!activeMap) return;
    const markers = (activeMap.markers as any[]).filter((_, i) => i !== idx);
    const updatedMap = await saveMapMarker(activeMap.id, markers);
    
    const newMaps = [...maps];
    newMaps[activeMapIndex] = updatedMap;
    setMaps(newMaps);
  }

  return (
    <div className="flex-1 flex flex-col gap-6 h-0 min-h-[600px]">
      {/* Map Selector & Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {maps.map((map, idx) => (
            <button
              key={map.id}
              onClick={() => setActiveMapIndex(idx)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold border transition-all",
                activeMapIndex === idx 
                  ? "bg-neutral-800 border-indigo-500 text-white" 
                  : "bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:text-neutral-300"
              )}
            >
              {map.name}
            </button>
          ))}
          {isGM && (
            <button
              onClick={() => setIsAddingMap(true)}
              className="px-3 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {activeMap && (
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white"
          >
            {isZoomed ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        )}
      </div>

      {isAddingMap && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
          <h3 className="text-lg font-bold text-white mb-4">Add New Map</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Map Name (e.g., Upsala City)"
              className="bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={newMap.name}
              onChange={(e) => setNewMap({ ...newMap, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Image URL (Public or Uploaded URL)"
              className="bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={newMap.imageUrl}
              onChange={(e) => setNewMap({ ...newMap, imageUrl: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 text-sm">
            <button onClick={() => setIsAddingMap(false)} className="text-neutral-500">Cancel</button>
            <button onClick={handleAddMap} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Add Map</button>
          </div>
        </div>
      )}

      {/* Map Display */}
      <div className={cn(
        "flex-1 relative bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden group shadow-2xl transition-all duration-500",
        isZoomed ? "fixed inset-8 z-[100] shadow-[0_0_100px_rgba(0,0,0,0.8)]" : ""
      )}>
        {activeMap ? (
          <div 
            ref={mapRef}
            onClick={handleMapClick}
            className={cn(
              "relative w-full h-full select-none",
              isGM ? "cursor-crosshair" : "cursor-default"
            )}
          >
            <img 
              src={activeMap.imageUrl} 
              alt={activeMap.name}
              className="w-full h-full object-contain pointer-events-none"
            />
            
            {/* Markers */}
            {(activeMap.markers as any[]).map((marker, idx) => (
              <div
                key={idx}
                className="absolute transform -translate-x-1/2 -translate-y-full hover:z-50"
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="group/marker relative">
                  <MapPin className="w-6 h-6 text-indigo-500 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)] fill-indigo-500/20" />
                  
                  {/* Label Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-xl opacity-0 group-hover/marker:opacity-100 transition-opacity">
                    {marker.label}
                    {isGM && (
                      <button 
                        onClick={() => handleDeleteMarker(idx)}
                        className="ml-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-2.5 h-2.5 inline" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 animate-pulse">
            <ImageIcon className="w-24 h-24 mb-4 opacity-20" />
            <p className="font-serif italic">No maps have been catalogued in the Atlas yet.</p>
          </div>
        )}
      </div>

      {isZoomed && (
        <div 
          className="fixed inset-0 bg-black/80 z-[90] backdrop-blur-sm"
          onClick={() => setIsZoomed(false)}
        />
      )}
    </div>
  );
}
