import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  zoom: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function LocationPickerMap({ lat, lng, zoom, onLocationSelect }: LocationPickerMapProps) {
  const [position, setPosition] = React.useState<L.LatLng | null>(
    lat !== 0 && lng !== 0 ? new L.LatLng(lat, lng) : null
  );

  useEffect(() => {
    if (position) {
      onLocationSelect(position.lat, position.lng);
    }
  }, [position]);

  useEffect(() => {
    if (lat !== 0 && lng !== 0 && (!position || position.lat !== lat || position.lng !== lng)) {
      setPosition(new L.LatLng(lat, lng));
    }
  }, [lat, lng]);

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border border-stone-300">
      <MapContainer
        center={[lat || -6.200000, lng || 106.816666]} // Default to Jakarta if 0,0
        zoom={zoom}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>
    </div>
  );
}
