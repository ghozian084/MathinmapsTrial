import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import LocationPickerMap from '../../components/LocationPickerMap';
import ImageUploader from '../../components/ImageUploader';
import GuideBox from '../../components/GuideBox';

interface MapData {
  id: string;
  name: string;
  description: string;
  centerLat: number;
  centerLng: number;
  zoom: number;
  imageUrl?: string;
}

export default function MapsManager() {
  const [maps, setMaps] = useState<MapData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<MapData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    centerLat: -6.200000,
    centerLng: 106.816666,
    zoom: 13,
    imageUrl: '',
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'maps'), (snapshot) => {
      const mapsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapData));
      setMaps(mapsData);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMap) {
        await updateDoc(doc(db, 'maps', editingMap.id), formData);
      } else {
        await addDoc(collection(db, 'maps'), formData);
      }
      setIsModalOpen(false);
      setEditingMap(null);
      setFormData({ name: '', description: '', centerLat: -6.200000, centerLng: 106.816666, zoom: 13, imageUrl: '' });
    } catch (error) {
      console.error('Error saving map:', error);
      alert('Error saving map');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this map?')) {
      try {
        await deleteDoc(doc(db, 'maps', id));
      } catch (error) {
        console.error('Error deleting map:', error);
        alert('Error deleting map');
      }
    }
  };

  const openEditModal = (map: MapData) => {
    setEditingMap(map);
    setFormData({
      name: map.name,
      description: map.description || '',
      centerLat: map.centerLat,
      centerLng: map.centerLng,
      zoom: map.zoom,
      imageUrl: map.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">Manage Maps</h2>
        <button
          onClick={() => {
            setEditingMap(null);
            setFormData({ name: '', description: '', centerLat: -6.200000, centerLng: 106.816666, zoom: 13, imageUrl: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Map
        </button>
      </div>

      <GuideBox title="How to Create a Map">
        <div className="space-y-3">
          <p>A <strong>Map</strong> is the main container for your locations and tasks. It represents a specific geographical area (e.g., "City Park", "Historical Downtown").</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Map Name:</strong> The title students will see (e.g., <em>"Botanical Garden Adventure"</em>).</li>
            <li><strong>Center Location:</strong> Click on the interactive map to set the default starting view when students open this map.</li>
            <li><strong>Initial Zoom:</strong> How close the map is zoomed in by default. <em>(15 is good for a neighborhood, 18 is good for a single park)</em>.</li>
            <li><strong>Map Image:</strong> An optional cover photo that represents this area.</li>
          </ul>
        </div>
      </GuideBox>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Center (Lat, Lng)</th>
              <th className="px-6 py-4 font-medium">Zoom</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {maps.map((map) => (
              <tr key={map.id} className="hover:bg-stone-50">
                <td className="px-6 py-4 font-medium text-stone-900">{map.name}</td>
                <td className="px-6 py-4 text-stone-600 truncate max-w-xs">{map.description}</td>
                <td className="px-6 py-4 text-stone-600">{map.centerLat.toFixed(4)}, {map.centerLng.toFixed(4)}</td>
                <td className="px-6 py-4 text-stone-600">{map.zoom}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(map)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(map.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {maps.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-stone-500">No maps found. Add one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-200 shrink-0">
              <h3 className="text-lg font-bold text-stone-900">{editingMap ? 'Edit Map' : 'Add New Map'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form id="map-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Map Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g., Forest Discovery"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Map Image (Optional)</label>
                  <ImageUploader 
                    value={formData.imageUrl} 
                    onChange={(url) => setFormData({ ...formData, imageUrl: url })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Center Location</label>
                  <p className="text-xs text-stone-500 mb-2">Click on the map to set the center point.</p>
                  <LocationPickerMap 
                    lat={formData.centerLat} 
                    lng={formData.centerLng} 
                    zoom={formData.zoom} 
                    onLocationSelect={(lat, lng) => setFormData({ ...formData, centerLat: lat, centerLng: lng })} 
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.centerLat}
                      onChange={(e) => setFormData({ ...formData, centerLat: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-stone-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.centerLng}
                      onChange={(e) => setFormData({ ...formData, centerLng: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-stone-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Initial Zoom</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="20"
                      value={formData.zoom}
                      onChange={(e) => setFormData({ ...formData, zoom: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-200 shrink-0 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="map-form"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                {editingMap ? 'Save Changes' : 'Add Map'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
