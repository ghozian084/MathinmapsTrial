import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

interface MapData {
  id: string;
  name: string;
}

interface MapPoint {
  id: string;
  mapId: string;
  title: string;
}

interface MapConnection {
  id: string;
  mapId: string;
  pointIds?: string[];
  startPointId?: string;
  endPointId?: string;
  connectionType: 'walking' | 'road' | 'water';
}

export default function ConnectionsManager() {
  const [connections, setConnections] = useState<MapConnection[]>([]);
  const [maps, setMaps] = useState<MapData[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<MapConnection | null>(null);
  
  const [formData, setFormData] = useState({
    mapId: '',
    pointIds: ['', ''] as string[],
    connectionType: 'walking' as 'walking' | 'road' | 'water',
  });

  useEffect(() => {
    const unsubConnections = onSnapshot(collection(db, 'mapConnections'), (snapshot) => {
      setConnections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapConnection)));
    });
    const unsubMaps = onSnapshot(collection(db, 'maps'), (snapshot) => {
      setMaps(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as MapData)));
    });
    const unsubPoints = onSnapshot(collection(db, 'mapPoints'), (snapshot) => {
      setPoints(snapshot.docs.map(doc => ({ id: doc.id, mapId: doc.data().mapId, title: doc.data().title } as MapPoint)));
    });
    return () => { unsubConnections(); unsubMaps(); unsubPoints(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.pointIds.some(id => !id)) {
      alert('Please select all points or remove empty ones.');
      return;
    }
    if (new Set(formData.pointIds).size !== formData.pointIds.length) {
      alert('Points in a connection route must be unique.');
      return;
    }
    try {
      // Always store as pointIds, but for backwards compatibility in existing code you could map start/end
      const dataToSave = {
        mapId: formData.mapId,
        pointIds: formData.pointIds,
        // Legacy fields for robustness
        startPointId: formData.pointIds[0] || '',
        endPointId: formData.pointIds[formData.pointIds.length - 1] || '',
        connectionType: formData.connectionType,
      };

      if (editingConnection) {
        await updateDoc(doc(db, 'mapConnections', editingConnection.id), dataToSave);
      } else {
        await addDoc(collection(db, 'mapConnections'), dataToSave);
      }
      setIsModalOpen(false);
      setEditingConnection(null);
      setFormData({ mapId: '', pointIds: ['', ''], connectionType: 'walking' });
    } catch (error) {
      console.error('Error saving connection:', error);
      alert('Error saving connection');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      await deleteDoc(doc(db, 'mapConnections', id));
    }
  };

  const openEditModal = (conn: MapConnection) => {
    setEditingConnection(conn);
    setFormData({
      mapId: conn.mapId,
      pointIds: conn.pointIds || [conn.startPointId || '', conn.endPointId || ''],
      connectionType: conn.connectionType,
    });
    setIsModalOpen(true);
  };

  const filteredPoints = points.filter(p => p.mapId === formData.mapId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">Manage Connections</h2>
        <button
          onClick={() => {
            setEditingConnection(null);
            setFormData({ mapId: maps[0]?.id || '', pointIds: ['', ''], connectionType: 'walking' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Connection
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
            <tr>
              <th className="px-6 py-4 font-medium">Map</th>
              <th className="px-6 py-4 font-medium">Route Points</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {connections.map((conn) => {
              const map = maps.find(m => m.id === conn.mapId);
              const routeIds = conn.pointIds || [conn.startPointId, conn.endPointId];
              const routeNames = routeIds.map(id => points.find(p => p.id === id)?.title || 'Unknown').join(' ➔ ');
              
              return (
                <tr key={conn.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 font-medium text-stone-900">{map?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-stone-600 font-mono text-xs">{routeNames}</td>
                  <td className="px-6 py-4 text-stone-600 capitalize">{conn.connectionType}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(conn)}
                      className="p-2 text-stone-400 hover:text-blue-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(conn.id)}
                      className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {connections.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-stone-500">No connections found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-stone-900">
                {editingConnection ? 'Edit Connection' : 'Add New Connection'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form id="conn-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Map</label>
                  <select
                    required
                    value={formData.mapId}
                    onChange={(e) => setFormData({ ...formData, mapId: e.target.value, pointIds: ['', ''] })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="" disabled>Select a map</option>
                    {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-stone-700">Route Sequence</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pointIds: [...formData.pointIds, ''] })}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                      disabled={!formData.mapId}
                    >
                      + Add Point
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.pointIds.map((pointId, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-stone-400 font-mono text-sm">{index + 1}.</span>
                        <select
                          required
                          value={pointId}
                          onChange={(e) => {
                            const newPointIds = [...formData.pointIds];
                            newPointIds[index] = e.target.value;
                            setFormData({ ...formData, pointIds: newPointIds });
                          }}
                          className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          disabled={!formData.mapId}
                        >
                          <option value="" disabled>Select point</option>
                          {filteredPoints.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                        {formData.pointIds.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPointIds = formData.pointIds.filter((_, i) => i !== index);
                              setFormData({ ...formData, pointIds: newPointIds });
                            }}
                            className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Connection Type</label>
                  <select
                    required
                    value={formData.connectionType}
                    onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="walking">Walking (Dashed Green)</option>
                    <option value="road">Road (Solid Green)</option>
                    <option value="water">Water (Dashed Blue)</option>
                  </select>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-200 shrink-0 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="conn-form"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                Save Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
