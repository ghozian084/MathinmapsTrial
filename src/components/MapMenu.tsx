import React from 'react';
import { Map as MapIcon, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MapData {
  id: string;
  name: string;
  description: string;
}

interface MapMenuProps {
  isOpen: boolean;
  onClose: () => void;
  maps: MapData[];
  currentMapName: string;
  onSelectMap: (mapName: string) => void;
}

export default function MapMenu({ isOpen, onClose, maps, currentMapName, onSelectMap }: MapMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapIcon className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-stone-900">Pilih Peta</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {maps.map((map) => (
                <button
                  key={map.id}
                  onClick={() => {
                    onSelectMap(map.name);
                    onClose();
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                    currentMapName === map.name
                      ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20'
                      : 'bg-white border-stone-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold ${
                      currentMapName === map.name ? 'text-blue-900' : 'text-stone-900'
                    }`}>
                      {map.name}
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                      currentMapName === map.name ? 'text-blue-500' : 'text-stone-400'
                    }`} />
                  </div>
                  {map.description && (
                    <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">
                      {map.description}
                    </p>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6 border-t border-stone-100 bg-stone-50">
              <p className="text-xs text-stone-400 text-center">
                Pilih lokasi untuk memulai petualangan matematika Anda!
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
