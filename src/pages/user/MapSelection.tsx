import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Map as MapIcon, ChevronRight, LogOut, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MapData {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export default function MapSelection() {
  const [maps, setMaps] = useState<MapData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'maps'), (snapshot) => {
      setMaps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapData)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredMaps = maps.filter(map => 
    map.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    map.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <MapIcon className="text-blue-600 w-6 h-6" />
          <h1 className="text-xl font-bold text-stone-900">Mathinmaps</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-stone-700 hidden sm:block">
            {profile?.displayName}
          </span>
          <button
            onClick={signOut}
            className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-stone-900 mb-4">Pilih Petualangan Anda</h2>
          <p className="text-stone-600">
            Jelajahi berbagai lokasi dan selesaikan tantangan matematika yang menarik di setiap sudut peta.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-12 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari peta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {/* Map Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMaps.map((map, index) => (
            <motion.div
              key={map.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedMap(map)}
              className="group bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
            >
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={map.imageUrl || `https://picsum.photos/seed/${map.name}/800/450`}
                  alt={map.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-white font-medium flex items-center gap-2">
                    Lihat Detail <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-stone-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {map.name}
                </h3>
                <p className="text-stone-600 text-sm line-clamp-3 mb-6 flex-1">
                  {map.description}
                </p>
                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                    Tersedia
                  </span>
                  <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredMaps.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-300">
            <MapIcon className="w-16 h-16 mx-auto mb-4 text-stone-200" />
            <h3 className="text-lg font-medium text-stone-900">Tidak ada peta ditemukan</h3>
            <p className="text-stone-500">Coba kata kunci pencarian lain.</p>
          </div>
        )}
      </main>

      {/* Map Preview Modal */}
      <AnimatePresence>
        {selectedMap && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
            >
              <div className="relative aspect-video">
                <img
                  src={selectedMap.imageUrl || `https://picsum.photos/seed/${selectedMap.name}/800/450`}
                  alt={selectedMap.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => setSelectedMap(null)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <MapIcon className="text-blue-600 w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold text-stone-900">{selectedMap.name}</h3>
                </div>
                <p className="text-stone-600 text-lg leading-relaxed mb-8">
                  {selectedMap.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => navigate(`/map/${selectedMap.name}`)}
                    className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
                  >
                    Mulai Petualangan
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => setSelectedMap(null)}
                    className="px-8 py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-200 transition-colors"
                  >
                    Kembali
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
