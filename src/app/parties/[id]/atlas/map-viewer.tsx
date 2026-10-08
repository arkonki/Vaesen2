"use client";

import { useState, useRef } from "react";
import { MapPin, Plus, Trash2, Maximize2, Minimize2, Image as ImageIcon } from "lucide-react";
import { createMap, saveMapMarker } from "../../actions";
import { cn } from "@/lib/utils";
import type { GameMap } from "@prisma/client";
import Image from "next/image";
import { jsonRecord } from "@/lib/json-fields";

function markersFromJson(value: unknown): Array<{ x: number; y: number; label: string }> {
  if (!Array.isArray(value)) return [];
  return value.map(jsonRecord).filter((marker) => typeof marker.x === "number" && typeof marker.y === "number" && typeof marker.label === "string")
    .map((marker) => ({ x: Number(marker.x), y: Number(marker.y), label: String(marker.label) }));
}

export default function MapViewer({ partyId, initialMaps, isGM }: { partyId: string, initialMaps: GameMap[], isGM: boolean }) {
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

    const markers = [...markersFromJson(activeMap.markers), { x, y, label }];
    const updatedMap = await saveMapMarker(activeMap.id, markers);

    const newMaps = [...maps];
    newMaps[activeMapIndex] = updatedMap;
    setMaps(newMaps);
  }

  async function handleDeleteMarker(idx: number) {
    if (!activeMap) return;
    const markers = markersFromJson(activeMap.markers).filter((_, i) => i !== idx);
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
                  ? "bg-[var(--ledger-paper-deep)] border-[var(--ledger-accent)]/65 text-[var(--ledger-ink)]"
                  : "bg-[var(--ledger-surface-strong)] border-[var(--ledger-line)]/55 text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)]"
              )}
            >
              {map.name}
            </button>
          ))}
          {isGM && (
            <button
              onClick={() => setIsAddingMap(true)}
              className="px-3 py-2 rounded-lg bg-[rgba(127,48,40,0.12)] border border-[var(--ledger-accent)]/65 text-[var(--ledger-accent)] hover:bg-[rgba(127,48,40,0.12)] transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {activeMap && (
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-2 bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-lg text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)]"
          >
            {isZoomed ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        )}
      </div>

      {isAddingMap && (
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
          <h3 className="text-lg font-bold text-[var(--ledger-ink)] mb-4">Add New Map</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Map Name (e.g., Upsala City)"
              className="bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ledger-focus)]"
              value={newMap.name}
              onChange={(e) => setNewMap({ ...newMap, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Image URL (Public or Uploaded URL)"
              className="bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ledger-focus)]"
              value={newMap.imageUrl}
              onChange={(e) => setNewMap({ ...newMap, imageUrl: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 text-sm">
            <button onClick={() => setIsAddingMap(false)} className="text-[var(--ledger-ink-soft)]">Cancel</button>
            <button onClick={handleAddMap} className="bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-6 py-2 rounded-lg font-bold">Add Map</button>
          </div>
        </div>
      )}

      {/* Map Display */}
      <div className={cn(
        "flex-1 relative bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-sm overflow-hidden group shadow-2xl transition-all duration-500",
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
            <Image unoptimized width={1600} height={1200}
              src={activeMap.imageUrl}
              alt={activeMap.name}
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Markers */}
            {markersFromJson(activeMap.markers).map((marker, idx) => (
              <div
                key={idx}
                className="absolute transform -translate-x-1/2 -translate-y-full hover:z-50"
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="group/marker relative">
                  <MapPin className="w-6 h-6 text-[var(--ledger-accent)] drop-shadow-[0_0_5px_rgba(99,102,241,0.5)] fill-indigo-500/20" />

                  {/* Label Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded text-[10px] font-bold text-[var(--ledger-ink)] whitespace-nowrap shadow-xl opacity-0 group-hover/marker:opacity-100 transition-opacity">
                    {marker.label}
                    {isGM && (
                      <button
                        onClick={() => handleDeleteMarker(idx)}
                        className="ml-2 text-[var(--ledger-danger)] hover:text-[var(--ledger-danger)] transition-colors"
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
          <div className="w-full h-full flex flex-col items-center justify-center text-[var(--ledger-ink-soft)] animate-pulse">
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
