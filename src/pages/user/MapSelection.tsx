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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'maps'), (snapshot) => {
      setMaps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapData)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <MapIcon className="text-blue-600 w-6 h-6" />
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">MathInMaps</h1>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm text-stone-600">
            Welcome, <span className="font-semibold text-stone-900">{profile?.displayName}</span>
          </span>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-12">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-stone-900 mb-2">Select a Map</h2>
          <p className="text-stone-500 text-lg">
            Choose a map to explore and complete math tasks.
          </p>
        </div>

        {/* Map Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {maps.map((map) => (
            <div
              key={map.id}
              onClick={() => navigate(`/map/${map.name}`)}
              className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col"
            >
              <div className="aspect-[4/3] bg-blue-50 flex items-center justify-center relative overflow-hidden">
                {map.imageUrl ? (
                  <img
                    src={map.imageUrl}
                    alt={map.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <MapIcon className="w-16 h-16 text-blue-200" />
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-stone-900 mb-1">
                  {map.name}
                </h3>
                <p className="text-stone-500 text-sm mb-4 line-clamp-2">
                  {map.description}
                </p>
                <div className="text-blue-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Explore Map <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {maps.length === 0 && (
          <div className="text-center py-20 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
            <MapIcon className="w-12 h-12 mx-auto mb-4 text-stone-300" />
            <h3 className="text-lg font-medium text-stone-900">No maps available</h3>
            <p className="text-stone-500">Check back later for new adventures.</p>
          </div>
        )}
      </main>
    </div>
  );
}
