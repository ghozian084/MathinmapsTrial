import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import LocationPickerMap from '../../components/LocationPickerMap';
import ImageUploader from '../../components/ImageUploader';
import GuideBox from '../../components/GuideBox';

interface MapPoint {
  id: string;
  mapId: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  imageUrl: string;
  taskSetId: string;
}

interface MapData {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
}

export default function PointsManager() {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [maps, setMaps] = useState<MapData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<MapPoint | null>(null);
  const [formData, setFormData] = useState({
    mapId: '',
    lat: 0,
    lng: 0,
    title: '',
    description: '',
    imageUrl: '',
    taskSetId: '',
  });

  useEffect(() => {
    const unsubPoints = onSnapshot(collection(db, 'mapPoints'), (snapshot) => {
      setPoints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapPoint)));
    });
    const unsubMaps = onSnapshot(collection(db, 'maps'), (snapshot) => {
      setMaps(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().name,
        centerLat: doc.data().centerLat || -6.200000,
        centerLng: doc.data().centerLng || 106.816666
      } as MapData)));
    });
    return () => { unsubPoints(); unsubMaps(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPoint) {
        await updateDoc(doc(db, 'mapPoints', editingPoint.id), formData);
      } else {
        await addDoc(collection(db, 'mapPoints'), formData);
      }
      setIsModalOpen(false);
      setEditingPoint(null);
      setFormData({ mapId: '', lat: 0, lng: 0, title: '', description: '', imageUrl: '', taskSetId: '' });
    } catch (error) {
      console.error('Error saving point:', error);
      alert('Error saving point');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this point?')) {
      await deleteDoc(doc(db, 'mapPoints', id));
    }
  };

  const openEditModal = (point: MapPoint) => {
    setEditingPoint(point);
    setFormData({
      mapId: point.mapId,
      lat: point.lat,
      lng: point.lng,
      title: point.title,
      description: point.description || '',
      imageUrl: point.imageUrl || '',
      taskSetId: point.taskSetId || '',
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">Manage Map Points</h2>
        <button
          onClick={() => {
            setEditingPoint(null);
            setFormData({ mapId: maps[0]?.id || '', lat: -6.200000, lng: 106.816666, title: '', description: '', imageUrl: '', taskSetId: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Point
        </button>
      </div>

      <GuideBox title="How to Create a Point">
        <div className="space-y-3">
          <p>A <strong>Point</strong> is a specific location marker on a Map where students will go to complete tasks (e.g., "The Old Oak Tree", "Statue of Liberty").</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Select Map:</strong> Choose which map this point belongs to.</li>
            <li><strong>Title:</strong> The name of the location (e.g., <em>"Main Entrance"</em>).</li>
            <li><strong>Point Location:</strong> Click on the interactive map to place the marker exactly where the student needs to go.</li>
            <li><strong>Image:</strong> A photo of the location so students know what to look for when they arrive.</li>
            <li><strong>Task Set ID:</strong> (Optional) Used to group specific tasks together if you have advanced logic. Usually left blank.</li>
          </ul>
        </div>
      </GuideBox>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
            <tr>
              <th className="px-6 py-4 font-medium">Map</th>
              <th className="px-6 py-4 font-medium">Title</th>
              <th className="px-6 py-4 font-medium">Coordinates</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {points.map((point) => (
              <tr key={point.id} className="hover:bg-stone-50">
                <td className="px-6 py-4 text-stone-600">{maps.find(m => m.id === point.mapId)?.name || 'Unknown'}</td>
                <td className="px-6 py-4 font-medium text-stone-900">{point.title}</td>
                <td className="px-6 py-4 text-stone-600">{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(point)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(point.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {points.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-stone-500">No points found. Add one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-200 shrink-0">
              <h3 className="text-lg font-bold text-stone-900">{editingPoint ? 'Edit Point' : 'Add New Point'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form id="point-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Select Map</label>
                  <select
                    required
                    value={formData.mapId}
                    onChange={(e) => {
                      const selectedMapId = e.target.value;
                      const selectedMap = maps.find(m => m.id === selectedMapId);
                      if (selectedMap && !editingPoint) {
                        setFormData({ 
                          ...formData, 
                          mapId: selectedMapId,
                          lat: selectedMap.centerLat,
                          lng: selectedMap.centerLng
                        });
                      } else {
                        setFormData({ ...formData, mapId: selectedMapId });
                      }
                    }}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="" disabled>Select a map</option>
                    {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Point Location</label>
                  <p className="text-xs text-stone-500 mb-2">Click on the map to set the point location.</p>
                  <LocationPickerMap 
                    lat={formData.lat} 
                    lng={formData.lng} 
                    zoom={15} 
                    onLocationSelect={(lat, lng) => setFormData({ ...formData, lat, lng })} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-stone-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-stone-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Image (Optional)</label>
                  <ImageUploader 
                    value={formData.imageUrl} 
                    onChange={(url) => setFormData({ ...formData, imageUrl: url })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Task Set ID</label>
                  <input
                    type="text"
                    value={formData.taskSetId}
                    onChange={(e) => setFormData({ ...formData, taskSetId: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Optional grouping ID"
                  />
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
                form="point-form"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                {editingPoint ? 'Save Changes' : 'Add Point'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
