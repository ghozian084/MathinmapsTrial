import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Map as MapIcon, ChevronLeft } from 'lucide-react';
import TaskSidebar from './TaskSidebar';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const completedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapData {
  id: string;
  name: string;
  description: string;
  centerLat: number;
  centerLng: number;
  zoom: number;
}

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

interface MapConnection {
  id: string;
  mapId: string;
  startPointId: string;
  endPointId: string;
  connectionType: string;
}

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function UserMap() {
  const { mapName } = useParams();
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();
  
  const [maps, setMaps] = useState<MapData[]>([]);
  const [currentMap, setCurrentMap] = useState<MapData | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [connections, setConnections] = useState<MapConnection[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [completedPoints, setCompletedPoints] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubMaps = onSnapshot(collection(db, 'maps'), (snapshot) => {
      const mapsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapData));
      setMaps(mapsData);
      
      const targetMap = mapsData.find(m => m.name === mapName) || mapsData[0];
      if (targetMap) {
        setCurrentMap(targetMap);
        if (targetMap.name !== mapName) {
          navigate(`/map/${targetMap.name}`, { replace: true });
        }
      }
    });
    return () => unsubMaps();
  }, [mapName, navigate]);

  useEffect(() => {
    if (!currentMap) return;

    const qPoints = query(collection(db, 'mapPoints'), where('mapId', '==', currentMap.id));
    const unsubPoints = onSnapshot(qPoints, (snapshot) => {
      setPoints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapPoint)));
    });

    const qConnections = query(collection(db, 'mapConnections'), where('mapId', '==', currentMap.id));
    const unsubConnections = onSnapshot(qConnections, (snapshot) => {
      setConnections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapConnection)));
    });

    return () => { unsubPoints(); unsubConnections(); };
  }, [currentMap]);

  // Fetch user progress to determine completed points
  useEffect(() => {
    if (!user) return;
    const unsubProgress = onSnapshot(query(collection(db, 'userProgress'), where('userId', '==', user.uid)), (snapshot) => {
      const progress = snapshot.docs.map(doc => doc.data());
      // A point is completed if the user has correct answers for tasks. 
      // For simplicity, we mark it completed if they have at least one correct answer for that point.
      // In a real app, you'd check if ALL tasks for that point are correct.
      const completed = new Set<string>();
      progress.forEach(p => {
        if (p.isCorrect) completed.add(p.pointId);
      });
      setCompletedPoints(completed);
    });
    return () => unsubProgress();
  }, [user]);

  const handleStartTask = (point: MapPoint) => {
    setSelectedPoint(point);
    setIsSidebarOpen(true);
  };

  if (!currentMap) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-100">Loading map...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-stone-100 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between shrink-0 z-10 relative shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MapIcon className="text-blue-600 w-6 h-6" />
            <h1 className="text-xl font-bold text-stone-900">Mathinmaps</h1>
          </div>
          <div className="h-6 w-px bg-stone-300 mx-2"></div>
          
          <button
            onClick={() => navigate('/map-selection')}
            className="flex items-center gap-2 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl hover:bg-stone-100 hover:border-blue-300 transition-all duration-200 group"
          >
            <ChevronLeft className="w-4 h-4 text-stone-500 group-hover:text-blue-600" />
            <span className="text-sm font-semibold text-stone-700 group-hover:text-blue-900">
              Change Map
            </span>
          </button>
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

      {/* Main Content */}
      <div className="flex-1 relative flex">
        <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'mr-96' : ''}`}>
          <MapContainer
            center={[currentMap.centerLat, currentMap.centerLng]}
            zoom={currentMap.zoom}
            className="w-full h-full z-0"
          >
            <ChangeView center={[currentMap.centerLat, currentMap.centerLng]} zoom={currentMap.zoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Connections */}
            {connections.map(conn => {
              const start = points.find(p => p.id === conn.startPointId);
              const end = points.find(p => p.id === conn.endPointId);
              if (!start || !end) return null;
              
              const dashArray = conn.connectionType === 'walking' ? '5, 10' : conn.connectionType === 'water' ? '10, 20' : '';
              const color = conn.connectionType === 'water' ? '#3b82f6' : '#10b981';

              return (
                <Polyline
                  key={conn.id}
                  positions={[[start.lat, start.lng], [end.lat, end.lng]]}
                  color={color}
                  weight={4}
                  dashArray={dashArray}
                  opacity={0.6}
                />
              );
            })}

            {/* Points */}
            {points.map(point => (
              <Marker 
                key={point.id} 
                position={[point.lat, point.lng]}
                icon={completedPoints.has(point.id) ? completedIcon : customIcon}
              >
                <Popup className="custom-popup">
                  <div className="w-64">
                    {point.imageUrl && (
                      <img src={point.imageUrl} alt={point.title} className="w-full h-32 object-cover rounded-t-lg mb-3" />
                    )}
                    <h3 className="font-bold text-lg text-stone-900 mb-1 leading-tight">{point.title}</h3>
                    <p className="text-sm text-stone-600 mb-4 line-clamp-3">{point.description}</p>
                    <button
                      onClick={() => handleStartTask(point)}
                      className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {completedPoints.has(point.id) ? 'Review Tasks' : 'Start Task'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <TaskSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          point={selectedPoint}
          mapName={currentMap.name}
        />
      </div>
    </div>
  );
}
