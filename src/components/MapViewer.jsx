import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Radio, Truck, MapPin, Phone, User, CheckCircle, Layers, Clock, ShieldCheck } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChamakRibbon } from './TruckArt';
import { useLanguage } from '../contexts/LanguageContext';

function MapViewUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(center) && center.length === 2 && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center?.[0], center?.[1], map]);
  return null;
}

// 100% Free, Public Tile Providers (Zero API Key Required)
export const TILE_PROVIDERS = {
  streets: {
    name: 'Street Logistics',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Street Logistics & Highways',
    maxZoom: 19
  },
  roads: {
    name: 'OSM Highways',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, Humanitarian Team',
    maxZoom: 19
  },
  satellite: {
    name: 'Satellite Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery & Terrain',
    maxZoom: 18
  }
};

// Pakistani Major Hub Coordinates Dictionary
export const CITY_COORDINATES = {
  'karachi': [24.8607, 67.0011],
  'lahore': [31.5204, 74.3587],
  'islamabad': [33.6844, 73.0479],
  'rawalpindi': [33.5651, 73.0169],
  'faisalabad': [31.4504, 73.1350],
  'multan': [30.1575, 71.5249],
  'peshawar': [34.0151, 71.5249],
  'quetta': [30.1798, 66.9750],
  'sialkot': [32.4945, 74.5229],
  'gujranwala': [32.1877, 74.1945],
  'hyderabad': [25.3960, 68.3578],
  'sukkur': [27.7052, 68.8574],
  'hub': [25.0298, 66.8837],
  'gwadar': [25.1264, 62.3225],
  'sargodha': [32.0836, 72.6711],
  'bahawalpur': [29.3544, 71.6911],
};

export const getCoordinatesForLocation = (loc, fallback = [31.5204, 74.3587]) => {
  if (Array.isArray(loc) && loc.length === 2) {
    const lat = parseFloat(loc[0]);
    const lng = parseFloat(loc[1]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  if (typeof loc === 'string') {
    const clean = loc.toLowerCase().trim();
    for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
      if (clean.includes(city)) return coords;
    }
  }
  return fallback;
};

// Create a custom Pakistani Truck-Art GPS marker with pulsing ring, crown accent and plate label
export const createCustomIcon = (color, label = '') => {
  const accentColor = 
    color === 'neon-blue' || color === 'teal' || color === 'cyan' ? '#F89020' : 
    color === 'rose' || color === 'red' ? '#E11D48' : 
    color === 'emerald' || color === 'green' ? '#10B981' : 
    '#F89020';
  
  const iconMarkup = renderToStaticMarkup(
    <div className="relative flex flex-col items-center justify-center -mt-4 -ml-4 pointer-events-auto">
      {/* Outer Pulsing Ring */}
      <div 
        className="absolute w-8 h-8 rounded-full animate-ping opacity-60"
        style={{ backgroundColor: accentColor }}
      />
      {/* Decorative Ornate Border */}
      <div 
        className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border-2 shadow-md"
        style={{ borderColor: accentColor }}
      >
        <Navigation size={14} className="rotate-45" style={{ color: accentColor }} />
        {/* Status center dot on top */}
        <div className="absolute -top-1.5 w-2 h-2 rounded-full bg-[#F89020] border border-white shadow-xs"></div>
      </div>
      {label && (
        <span className="mt-1 px-1.5 py-0.5 rounded bg-slate-900/95 text-[9px] font-mono font-bold text-orange-300 border border-orange-500/40 whitespace-nowrap shadow-md">
          {label}
        </span>
      )}
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-leaflet-icon',
    iconSize: [36, 46],
    iconAnchor: [18, 23],
    popupAnchor: [0, -22]
  });
};

export default function MapViewer({ 
  coordinates, 
  popupText, 
  trucks = null,
  route = null, // { origin, destination, truckCoords, driverName, driverMobile, eta, truckPlate }
  onAssignTruck = null,
  height = '320px', 
  color = 'neon-blue',
  zoom = 13,
  title = null
}) {
  const { isUrdu } = useLanguage();
  const [defaultIcon, setDefaultIcon] = useState(null);
  const [originIcon, setOriginIcon] = useState(null);
  const [destIcon, setDestIcon] = useState(null);
  const [mapStyle, setMapStyle] = useState('streets');

  useEffect(() => {
    setDefaultIcon(createCustomIcon(color));
    setOriginIcon(createCustomIcon('emerald', 'ORIGIN'));
    setDestIcon(createCustomIcon('rose', 'DESTINATION'));
  }, [color]);

  // Determine route coordinates if route mode is active
  let originCoords = null;
  let destCoords = null;
  let activeTruckCoords = null;
  let polylinePositions = [];

  if (route) {
    originCoords = getCoordinatesForLocation(route.origin, [31.5204, 74.3587]);
    destCoords = getCoordinatesForLocation(route.destination, [24.8607, 67.0011]);
    activeTruckCoords = route.truckCoords 
      ? getCoordinatesForLocation(route.truckCoords)
      : [
          (originCoords[0] + destCoords[0]) / 2,
          (originCoords[1] + destCoords[1]) / 2
        ];
    polylinePositions = [originCoords, activeTruckCoords, destCoords];
  }

  // Determine center coordinates
  let center = [31.5204, 74.3587]; // Default to Lahore hub
  if (route && activeTruckCoords) {
    center = activeTruckCoords;
  } else if (coordinates && Array.isArray(coordinates) && coordinates.length === 2 && !isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
    center = [parseFloat(coordinates[0]), parseFloat(coordinates[1])];
  } else if (trucks && trucks.length > 0) {
    const firstCoords = getCoordinatesForLocation(trucks[0].coordinates || [trucks[0].lat, trucks[0].lng] || trucks[0].loc);
    center = firstCoords;
  }

  const effectiveZoom = route ? 6 : (trucks && trucks.length > 1 ? (zoom > 7 ? 6 : zoom) : zoom);

  if (!defaultIcon) return null;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl relative bg-[#070A11]" style={{ height }}>
      {/* Top Left: Map Style Selector (100% Free, Zero API Key Required) */}
      <div className="absolute top-3 left-3 z-[450] bg-slate-900/95 border border-slate-700/80 rounded-lg p-0.5 flex items-center gap-1 shadow-lg text-[10px] font-mono">
        <button
          type="button"
          onClick={() => setMapStyle('streets')}
          className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
            mapStyle === 'streets' 
              ? 'bg-[#F89020] text-slate-950 font-bold shadow-xs' 
              : 'text-slate-300 hover:text-white'
          }`}
          title="Esri World Street Map (No API Key)"
        >
          {isUrdu ? 'سڑکیں' : 'Streets'}
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('roads')}
          className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
            mapStyle === 'roads' 
              ? 'bg-[#F89020] text-slate-950 font-bold shadow-xs' 
              : 'text-slate-300 hover:text-white'
          }`}
          title="Humanitarian OpenStreetMap (No API Key)"
        >
          {isUrdu ? 'ہائی وے' : 'Highways'}
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('satellite')}
          className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
            mapStyle === 'satellite' 
              ? 'bg-[#F89020] text-slate-950 font-bold shadow-xs' 
              : 'text-slate-300 hover:text-white'
          }`}
          title="Satellite Imagery (No API Key)"
        >
          {isUrdu ? 'سیٹلائٹ' : 'Satellite'}
        </button>
      </div>

      {/* Radar telemetry badge overlay */}
      <div className="hidden sm:flex absolute top-3 right-14 z-[450] bg-slate-900/95 border border-orange-500/40 rounded-lg px-2.5 py-1.5 items-center gap-2 text-[10px] font-mono text-orange-300 shadow-lg">
        <Radio size={13} className="text-[#F89020] animate-pulse shrink-0" />
        <span className="font-bold tracking-wider">
          {trucks ? `FLEET RADAR • ${trucks.length} TRUCKS` : (title || (route ? `ROUTE: ${route.origin} → ${route.destination}` : 'LIVE TELEMETRY ACTIVE'))}
        </span>
        <span className="text-gray-500">•</span>
        <span className={isUrdu ? "font-urdu text-[11px] text-orange-400 font-bold" : "font-sans font-bold text-[10px] text-emerald-400 uppercase tracking-widest"}>
          {isUrdu ? 'سفرِ خیر' : 'LIVE GPS'}
        </span>
      </div>

      {/* Driver & Telemetry Banner for Active Shipments */}
      {route && (route.driverName || route.eta) && (
        <div className="absolute bottom-3 left-3 right-3 z-[450] bg-slate-900/96 border border-orange-500/50 rounded-xl p-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-orange-300">
              <Truck size={16} />
            </div>
            <div>
              <p className="font-mono font-bold text-orange-300 text-xs">
                {route.truckPlate || 'Assigned Carrier'}
              </p>
              <p className="text-[11px] text-slate-300 flex items-center gap-1.5">
                <User size={11} className="text-orange-400 shrink-0" />
                <span>{route.driverName || 'Driver'}</span>
                {route.driverMobile && (
                  <>
                    <span className="text-slate-500">•</span>
                    <Phone size={11} className="text-emerald-400 shrink-0" />
                    <span className="font-mono text-emerald-300">{route.driverMobile}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            {route.eta && (
              <div className="bg-slate-800/90 border border-orange-500/40 rounded-lg px-2.5 py-1 text-orange-300 text-[11px] flex items-center gap-1">
                <Clock size={12} className="text-[#F89020]" />
                <span>ETA: <strong>{route.eta}</strong></span>
              </div>
            )}
            <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-lg px-2 py-1 text-emerald-300 text-[10px] flex items-center gap-1 font-bold">
              <ShieldCheck size={11} /> NHA GPS Active
            </div>
          </div>
        </div>
      )}

      {/* Bottom telemetry coordinates tag (when no route footer) */}
      {!route && (
        <div className="absolute bottom-2 left-3 z-[450] bg-slate-900/92 border border-slate-700 rounded-md px-2 py-0.5 text-[9px] font-mono text-slate-300 pointer-events-none">
          LAT: {center[0].toFixed(4)} | LNG: {center[1].toFixed(4)}
        </div>
      )}

      <MapContainer 
        center={center} 
        zoom={effectiveZoom} 
        zoomControl={false}
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <ZoomControl position="topright" />
        <MapViewUpdater center={center} />
        {/* Dynamic Tile Layer with 100% Free Public Basemaps - Zero API Key Needed */}
        <TileLayer
          key={mapStyle}
          attribution={TILE_PROVIDERS[mapStyle].attribution}
          url={TILE_PROVIDERS[mapStyle].url}
          maxZoom={TILE_PROVIDERS[mapStyle].maxZoom}
        />

        {/* Route Mode: Origin, Destination, Polyline, Truck Pin */}
        {route && originCoords && destCoords && (
          <>
            {/* Origin Marker */}
            <Marker position={originCoords} icon={originIcon || defaultIcon}>
              <Popup className="futuristic-popup">
                <div className="p-2.5 bg-slate-900 text-white rounded-xl min-w-[170px] border border-emerald-500/40">
                  <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MapPin size={12} className="text-emerald-400" /> Dispatch Origin
                  </div>
                  <p className="text-xs font-bold text-slate-200">{route.origin}</p>
                </div>
              </Popup>
            </Marker>

            {/* Destination Marker */}
            <Marker position={destCoords} icon={destIcon || defaultIcon}>
              <Popup className="futuristic-popup">
                <div className="p-2.5 bg-slate-900 text-white rounded-xl min-w-[170px] border border-rose-500/40">
                  <div className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MapPin size={12} className="text-rose-400" /> Destination Hub
                  </div>
                  <p className="text-xs font-bold text-slate-200">{route.destination}</p>
                </div>
              </Popup>
            </Marker>

            {/* In-Transit Truck Marker */}
            <Marker position={activeTruckCoords} icon={createCustomIcon('neon-blue', route.truckPlate || 'TRUCK')}>
              <Popup className="futuristic-popup">
                <div className="p-3 bg-slate-900 text-white rounded-xl min-w-[200px] border border-orange-500/40">
                  <div className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Truck size={12} className="text-[#F89020]" /> Live In-Transit Telemetry
                  </div>
                  <p className="text-xs font-bold text-slate-200">{route.truckPlate || 'Carrier Unit'}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Driver: {route.driverName || 'Verified'} ({route.driverMobile || 'GPS Linked'})</p>
                  {route.eta && <p className="text-[11px] text-emerald-400 font-mono mt-0.5">ETA: {route.eta}</p>}
                </div>
              </Popup>
            </Marker>

            {/* Polyline Route Connecting Origin -> Truck -> Destination */}
            <Polyline 
              positions={polylinePositions} 
              color="#F89020" 
              weight={4} 
              dashArray="6, 8" 
              opacity={0.85} 
            />
          </>
        )}

        {/* Multi-truck Fleet Radar Mode */}
        {trucks && trucks.map((truck, idx) => {
          const baseCoords = getCoordinatesForLocation(truck.coordinates || [truck.lat, truck.lng] || truck.loc);
          const jitter = (idx % 5) * 0.015 - 0.03;
          const truckPos = [baseCoords[0] + jitter, baseCoords[1] + jitter];
          
          // Green for Available, Cyan/Blue for In Transit
          const iconColor = truck.status === 'Available' ? 'emerald' : 'neon-blue';
          const truckIcon = createCustomIcon(iconColor, truck.plateNumber);

          return (
            <Marker key={truck._id || truck.id || idx} position={truckPos} icon={truckIcon}>
              <Popup className="futuristic-popup">
                <div className="p-3 bg-slate-900 text-white rounded-xl min-w-[210px] border border-orange-500/30">
                  <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-800">
                    <span className="text-[10px] font-mono text-orange-400 font-black tracking-wider uppercase">
                      {truck.plateNumber}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                      truck.status === 'Available'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : 'bg-orange-950 text-orange-300 border-orange-500/40'
                    }`}>
                      {truck.status || 'Available'}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-200 mt-1">{truck.truckType || 'Heavy Truck'} &middot; {truck.capacity}</p>
                  
                  <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                    <p className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-rose-400 shrink-0" />
                      <span>{truck.loc}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User size={11} className="text-orange-400 shrink-0" />
                      <span>{truck.driverName || 'Driver'} {truck.driverMobile ? `(${truck.driverMobile})` : ''}</span>
                    </p>
                  </div>

                  {onAssignTruck && (
                    <button
                      type="button"
                      onClick={() => onAssignTruck(truck)}
                      className="w-full mt-3 py-1.5 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-md"
                    >
                      {isUrdu ? 'گاڑی مقرر کریں' : 'Assign to Shipment'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Single Truck Telemetry Mode */}
        {!route && !trucks && coordinates && (
          <Marker position={center} icon={defaultIcon}>
            <Popup className="futuristic-popup">
              <div className="p-3 bg-slate-900 text-white rounded-xl min-w-[200px] border border-orange-500/30">
                <div className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Truck size={12} className="text-[#F89020]" />
                  <span>Live Vehicle Telemetry</span>
                </div>
                <div className="text-xs font-semibold text-slate-200">{popupText}</div>
                <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle size={10} /> GPS Signal: Verified Transponder
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
