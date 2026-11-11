import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  X, Truck, MapPin, Calculator, FileText, ShieldCheck,
  CheckCircle2, ArrowRight, Search, QrCode, Radio
} from 'lucide-react';
import {
  calculateFreightTariff,
  VEHICLE_MULTIPLIERS,
  SPECIAL_HANDLING_FLAGS,
  formatWeightTons
} from '../utils/fareCalculator';

const ROUTE_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sukkur', 'Gujranwala',
  'Sialkot', 'Hyderabad', 'Gwadar', 'Hub'
];

const VEHICLE_CLASSES = [
  { name: '22-Wheeler', payload: '35 - 50 Tons', ideal: 'Export Containers, Steel & Bulk Grain' },
  { name: '18-Wheeler Trailer', payload: '28 - 40 Tons', ideal: 'Heavy Machinery & Industrial Bales' },
  { name: 'Container (40ft)', payload: '24 - 30 Tons', ideal: 'Port Clearance & Sealed Factory Goods' },
  { name: 'Container (20ft)', payload: '16 - 22 Tons', ideal: 'FMCG, Pharma & Garment Cartons' },
  { name: 'Full Body Truck', payload: '12 - 18 Tons', ideal: 'Intercity Wholesale & Agri Produce' },
  { name: 'Half Body Truck', payload: '7 - 12 Tons', ideal: 'Regional City Distribution' },
  { name: 'Mini Truck', payload: '3 - 6 Tons', ideal: 'Light Hardware & Packaging' },
  { name: 'Shehzore / Pickup', payload: '1 - 2.5 Tons', ideal: 'Intra-City Fast Last-Mile Drops' },
];

const getStatusBadge = (status) => {
  switch (status) {
    case 'Available':
    case 'Completed':
    case 'Delivered':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35';
    case 'In Transit':
    case 'Loaded':
      return 'bg-cyan-500/15 text-cyan-300 border-cyan-400/35';
    case 'Truck Assigned':
      return 'bg-orange-500/15 text-orange-300 border-orange-400/35';
    default:
      return 'bg-slate-500/15 text-slate-300 border-white/20';
  }
};

export default function LandingExplorerModal({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  initialOrigin = 'Lahore',
  initialDestination = 'Karachi',
  overview,
  isUrdu
}) {
  const [fleetFilter, setFleetFilter] = useState('All');
  const [fleetSearch, setFleetSearch] = useState('');
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [tons, setTons] = useState(20);
  const [vehicleType, setVehicleType] = useState('18-Wheeler Trailer');
  const [handlingFlags, setHandlingFlags] = useState([]);
  const [selectedSampleIdx, setSelectedSampleIdx] = useState(0);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  const tariff = useMemo(
    () =>
      calculateFreightTariff({
        origin,
        destination,
        chargeableTons: tons,
        vehicleType,
        handlingFlags,
      }),
    [origin, destination, tons, vehicleType, handlingFlags]
  );

  const fleetVehicles = overview?.fleetVehicles || [];
  const recentDispatches = overview?.recentDispatches || [];
  const stats = overview?.stats || {
    totalTrucks: fleetVehicles.length,
    availableTrucks: fleetVehicles.filter((t) => t.status === 'Available').length,
    inTransitTrucks: fleetVehicles.filter((t) => t.status === 'In Transit').length,
    totalBilties: recentDispatches.length,
    completedDeliveries: recentDispatches.filter((d) => d.status === 'Completed' || d.status === 'Delivered').length,
    activeHubs: 14,
  };

  const filteredFleet = fleetVehicles.filter((t) => {
    const matchesStatus = fleetFilter === 'All' || t.status === fleetFilter;
    const q = fleetSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      (t.plateNumber || '').toLowerCase().includes(q) ||
      (t.loc || '').toLowerCase().includes(q) ||
      (t.truckType || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const sampleDispatch = recentDispatches[selectedSampleIdx] || {
    biltyNo: 'BLT-15',
    title: 'Faisalabad Export Garments & Denim Batch',
    origin: 'Faisalabad',
    destination: 'Karachi',
    weight: '26',
    status: 'Completed',
    assignedTruck: 'KHI-6634',
  };

  const toggleFlag = (id) => {
    setHandlingFlags((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openEstimatorFromVehicle = (truck) => {
    if (truck.loc) setOrigin(truck.loc);
    if (truck.truckType && VEHICLE_MULTIPLIERS[truck.truckType]) {
      setVehicleType(truck.truckType);
    }
    const parsedCap = parseFloat(truck.capacity);
    if (!Number.isNaN(parsedCap) && parsedCap > 0) {
      setTons(parsedCap);
    }
    onTabChange('post');
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const tabs = [
    { id: 'fleet', label: isUrdu ? 'فلیٹ ڈائریکٹری' : 'Live Fleet', Icon: Truck },
    { id: 'post', label: isUrdu ? 'کرایہ کیلکولیٹر' : '01 Post & Tariff', Icon: Calculator },
    { id: 'bilty', label: isUrdu ? 'ڈیجیٹل بلٹی' : '02 QR e-Bilty', Icon: FileText },
    { id: 'tracking', label: isUrdu ? 'لائیو ٹریکنگ' : '03 Live GPS & POD', Icon: Radio },
  ];

  const alignText = isUrdu ? 'text-right' : 'text-left';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6 bg-[#020617]/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Interactive Logistics Explorer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[88dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-[#0B1325] border border-white/15 shadow-[0_32px_90px_rgba(0,0,0,0.92)] overflow-hidden text-slate-100 modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-[#080F1E] flex items-center justify-between gap-3 shrink-0">
          <div className={`min-w-0 ${alignText}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest text-orange-400 ${isUrdu ? 'font-urdu text-xs' : 'font-mono'}`}>
              {isUrdu ? 'انٹرایکٹو لاجسٹکس سینٹر' : 'INTERACTIVE NETWORK EXPLORER'}
            </p>
            <h3 className={`text-base sm:text-xl font-black text-white leading-tight mt-0.5 truncate ${isUrdu ? 'font-urdu' : ''}`}>
              {isUrdu ? 'فلیٹ، کرایہ کیلکولیٹر اور لائیو بلٹی تفصیلات' : 'Fleet Availability, Fare Estimator & Digital Dispatch'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl bg-white/[0.07] hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#091020] border-b border-white/10 flex items-center gap-2 overflow-x-auto shrink-0">
          {tabs.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white shadow-md shadow-orange-500/30'
                    : 'bg-white/[0.05] hover:bg-white/10 text-slate-300 border border-white/10'
                } ${isUrdu ? 'font-urdu text-sm' : ''}`}
              >
                <Icon size={14} className="shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
          {/* TAB 1: LIVE FLEET DIRECTORY */}
          {activeTab === 'fleet' && (
            <div className="space-y-5">
              {/* Live Fleet KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: isUrdu ? 'کل رجسٹرڈ ٹرک' : 'Registered Trucks', value: stats.totalTrucks, accent: 'text-white', border: 'border-white/12' },
                  { label: isUrdu ? 'بکنگ کے لیے دستیاب' : 'Available Now', value: stats.availableTrucks, accent: 'text-emerald-400', border: 'border-emerald-500/25' },
                  { label: isUrdu ? 'ہائی وے پر رواں دواں' : 'In Transit', value: stats.inTransitTrucks, accent: 'text-cyan-400', border: 'border-cyan-500/25' },
                  { label: isUrdu ? 'فعال لاجسٹکس شہر' : 'Active Hubs', value: stats.activeHubs || 14, accent: 'text-orange-400', border: 'border-orange-500/25' },
                ].map((k) => (
                  <div key={k.label} className={`rounded-2xl bg-white/[0.04] border ${k.border} px-4 py-3 flex flex-col justify-between`}>
                    <p className={`text-[11px] text-slate-400 font-semibold leading-snug ${alignText} ${isUrdu ? 'font-urdu text-xs' : ''}`}>{k.label}</p>
                    <p className={`text-2xl font-black font-mono tabular-nums mt-1.5 ${alignText} ${k.accent}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['All', 'Available', 'In Transit'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFleetFilter(st)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        fleetFilter === st
                          ? 'bg-orange-500/20 border-orange-400 text-orange-200'
                          : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={fleetSearch}
                    onChange={(e) => setFleetSearch(e.target.value)}
                    placeholder={isUrdu ? 'نمبر پلیٹ یا شہر تلاش کریں...' : 'Filter by plate, city, type...'}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-white placeholder:text-slate-400 outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              {/* Live Truck List */}
              {filteredFleet.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredFleet.map((truck) => (
                    <div
                      key={truck.id}
                      className="rounded-2xl bg-white/[0.04] border border-white/10 hover:border-orange-400/45 p-4 flex flex-col justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-sm text-white tracking-wide">{truck.plateNumber}</span>
                            {truck.verified && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-bold text-emerald-300">
                                <ShieldCheck size={11} /> KYC
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-1 truncate">{truck.truckType}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${getStatusBadge(truck.status)}`}>
                          {truck.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs text-slate-300 pt-2.5 border-t border-white/10">
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <MapPin size={12} className="text-orange-400 shrink-0" />
                          <span className="truncate">{truck.loc}</span>
                          <span className="text-slate-500 shrink-0">•</span>
                          <span className="font-semibold text-white whitespace-nowrap shrink-0">{formatWeightTons(truck.capacity)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => openEstimatorFromVehicle(truck)}
                          className="text-orange-300 hover:text-orange-200 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>{isUrdu ? 'کرایہ دیکھیں' : 'Estimate Fare'}</span>
                          <ArrowRight size={12} className={isUrdu ? 'rotate-180' : ''} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 text-center text-xs text-slate-400">
                  {isUrdu ? 'فلٹر کے مطابق کوئی گاڑی نہیں ملی۔' : 'No registered trucks match that filter right now.'}
                </div>
              )}

              {/* Standard Vehicle Tiers */}
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5 ${alignText} ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                  {isUrdu ? 'دستیاب گاڑیوں کی اقسام اور گنجائش' : 'Supported Commercial Vehicle Categories'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {VEHICLE_CLASSES.map((vc) => (
                    <button
                      key={vc.name}
                      type="button"
                      onClick={() => {
                        setVehicleType(vc.name);
                        onTabChange('post');
                      }}
                      className={`${alignText} h-full rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-orange-400/45 p-3 flex flex-col justify-between transition-all cursor-pointer`}
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{vc.name}</p>
                        <p className="text-[11px] font-mono text-orange-300 mt-0.5">{vc.payload}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">{vc.ideal}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 01 POST CARGO & LIVE NHA TARIFF CALCULATOR */}
          {activeTab === 'post' && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-orange-500/10 border border-orange-400/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className={alignText}>
                  <h4 className={`text-sm font-black text-white ${isUrdu ? 'font-urdu text-base' : ''}`}>
                    {isUrdu ? 'مرحلہ 01: کارگو پوسٹ کریں اور فوری کرایہ جانیں' : 'Step 01 — Interactive NHA Freight Tariff & Cargo Estimator'}
                  </h4>
                  <p className={`text-xs text-slate-300 mt-1 leading-relaxed ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                    {isUrdu
                      ? 'شہر، وزن اور گاڑی کی قسم منتخب کریں — سرکاری فارمولے کے مطابق کل کرایہ فوری دیکھیں۔'
                      : 'Select pickup/destination hubs, cargo weight, and truck category to preview official NHA distance, fuel surcharge (8%), and provincial tax (16%).'}
                  </p>
                </div>
                <Link
                  to="/register?role=business"
                  className="btn-primary text-xs font-bold !py-2 !px-4 whitespace-nowrap shrink-0 text-center"
                >
                  {isUrdu ? 'کارگو پوسٹ کریں' : 'Post Cargo in Portal'}
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Calculator Controls */}
                <div className={`md:col-span-7 space-y-3.5 rounded-2xl bg-white/[0.04] border border-white/10 p-4 ${alignText}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                        {isUrdu ? 'روانگی کا شہر' : 'Origin City'}
                      </label>
                      <select
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="w-full rounded-xl bg-[#080F1E] border border-white/15 px-3 py-2 text-xs text-white outline-none focus:border-orange-400"
                      >
                        {ROUTE_CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                        {isUrdu ? 'منزل مقصود' : 'Destination City'}
                      </label>
                      <select
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full rounded-xl bg-[#080F1E] border border-white/15 px-3 py-2 text-xs text-white outline-none focus:border-orange-400"
                      >
                        {ROUTE_CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                        {isUrdu ? 'کارگو وزن (ٹن)' : 'Cargo Weight (Tons)'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={tons}
                        onChange={(e) => setTons(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                        className="w-full rounded-xl bg-[#080F1E] border border-white/15 px-3 py-2 text-xs font-mono text-white outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                        {isUrdu ? 'گاڑی کی قسم' : 'Vehicle Category'}
                      </label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full rounded-xl bg-[#080F1E] border border-white/15 px-3 py-2 text-xs text-white outline-none focus:border-orange-400"
                      >
                        {Object.keys(VEHICLE_MULTIPLIERS).map((vt) => (
                          <option key={vt} value={vt}>
                            {vt} ({VEHICLE_MULTIPLIERS[vt]}x)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                      {isUrdu ? 'خصوصی ہینڈلنگ' : 'Special Cargo Handling'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SPECIAL_HANDLING_FLAGS.map((flag) => {
                        const selected = handlingFlags.includes(flag.id);
                        return (
                          <button
                            key={flag.id}
                            type="button"
                            onClick={() => toggleFlag(flag.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              selected
                                ? 'bg-orange-500/20 border-orange-400 text-orange-200'
                                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {isUrdu ? flag.urdu : flag.label.split(' (')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Live Result Breakdown */}
                <div className="md:col-span-5 rounded-2xl bg-gradient-to-br from-[#12203B] to-[#08101E] border border-orange-400/35 p-4 flex flex-col justify-between">
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                      <span className="font-bold text-orange-300 uppercase tracking-wider text-[11px] truncate">
                        {origin} → {destination}
                      </span>
                      <span className="font-mono font-bold text-white whitespace-nowrap shrink-0">{tariff.distanceKm} km</span>
                    </div>
                    <div className="flex justify-between gap-2 text-slate-300">
                      <span>Base Freight ({tariff.vehicleMultiplier}x):</span>
                      <span className="font-mono font-bold text-white tabular-nums">Rs. {tariff.baseFreight.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-2 text-slate-300">
                      <span>Fuel Surcharge (8%):</span>
                      <span className="font-mono font-bold text-white tabular-nums">Rs. {tariff.fuelSurcharge.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-2 text-slate-300">
                      <span>Provincial Tax (16%):</span>
                      <span className="font-mono font-bold text-white tabular-nums">Rs. {tariff.salesTax.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className={`mt-4 pt-3 border-t border-white/15 ${alignText}`}>
                    <p className="text-[10px] font-mono uppercase text-slate-400">Estimated Official e-Bilty Total</p>
                    <p className="text-2xl font-black font-mono tabular-nums text-orange-300 mt-0.5">
                      PKR {tariff.totalFreight.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 02 ASSIGN & ISSUE QR E-BILTY */}
          {activeTab === 'bilty' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className={alignText}>
                  <h4 className={`text-sm font-black text-white ${isUrdu ? 'font-urdu text-base' : ''}`}>
                    {isUrdu ? 'مرحلہ 02: تصدیق شدہ ٹرک اور ڈیجیٹل کیو آر بلٹی' : 'Step 02 — Broker Dispatch Assignment & Official QR e-Bilty'}
                  </h4>
                  <p className={`text-xs text-slate-300 mt-1 leading-relaxed ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                    {isUrdu
                      ? 'ہر بکنگ کے ساتھ قانونی پی ڈی ایف بلٹی، گاڑی نمبر اور کیو آر ویریفکیشن کوڈ جاری ہوتا ہے۔'
                      : 'Once a carrier accepts, E-Cargo-Bilty locks agreed rates and issues a tamper-evident Digital Lorry Receipt with scannable verification.'}
                  </p>
                </div>
                {recentDispatches.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSampleIdx((prev) => (prev + 1) % recentDispatches.length)}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/15 border border-white/15 text-xs font-bold text-orange-300 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    {isUrdu ? 'اگلی بلٹی دیکھیں' : 'Cycle Live Bilty Sample'}
                  </button>
                )}
              </div>

              {/* Interactive Sample Digital Bilty Preview */}
              <div className="rounded-2xl bg-white/[0.04] border border-cyan-400/30 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-white text-slate-950 flex items-center justify-center shrink-0">
                      <QrCode size={24} />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-[10px] font-mono uppercase text-cyan-300 font-bold">VERIFIED DIGITAL LORRY RECEIPT</p>
                      <h5 className="text-base font-black font-mono text-white">{sampleDispatch.biltyNo}</h5>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap shrink-0 ${getStatusBadge(sampleDispatch.status)}`}>
                    {sampleDispatch.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-left">
                  <div className="rounded-xl bg-[#080F1E] border border-white/10 p-3.5 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 uppercase">Consignment</p>
                      <p className="font-bold text-white mt-1 leading-snug">{sampleDispatch.title}</p>
                    </div>
                    <p className="font-mono text-orange-300 mt-2">{formatWeightTons(sampleDispatch.weight)}</p>
                  </div>
                  <div className="rounded-xl bg-[#080F1E] border border-white/10 p-3.5 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 uppercase">Highway Corridor</p>
                      <p className="font-bold text-white mt-1 leading-snug">{sampleDispatch.origin} → {sampleDispatch.destination}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">NHA Insured Transit</p>
                  </div>
                  <div className="rounded-xl bg-[#080F1E] border border-white/10 p-3.5 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 uppercase">Assigned Vehicle</p>
                      <p className="font-mono font-bold text-emerald-300 mt-1">{sampleDispatch.assignedTruck || 'Pending Plate'}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">KYC & Fitness Verified</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 03 LIVE GPS TELEMETRY & DIGITAL E-POD */}
          {activeTab === 'tracking' && (
            <div className="space-y-4">
              <div className={alignText}>
                <h4 className={`text-sm font-black text-white ${isUrdu ? 'font-urdu text-base' : ''}`}>
                  {isUrdu ? 'مرحلہ 03: لائیو جی پی ایس ٹریکنگ اور ڈیجیٹل رسید (e-POD)' : 'Step 03 — Live Highway Dispatches, WhatsApp Alerts & Digital e-POD'}
                </h4>
                <p className={`text-xs text-slate-300 mt-1 leading-relaxed ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                  {isUrdu
                    ? 'گاڑی کی لائیو لوکیشن نقشے پر دیکھیں اور منزل پر پہنچنے پر ڈیجیٹل دستخط کے ساتھ ترسیل مکمل کریں۔'
                    : 'Shippers and brokers monitor live transit milestones from pickup to warehouse unloading with digital receiver signature capture.'}
                </p>
              </div>

              {/* Lifecycle Pipeline */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {['1. Pending', '2. Truck Assigned', '3. Loaded', '4. In Transit', '5. Completed e-POD'].map((stage) => (
                  <div key={stage} className="rounded-xl bg-white/[0.04] border border-white/10 p-3 flex flex-col items-center justify-center text-center gap-1.5">
                    <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-200 leading-tight">{stage}</span>
                  </div>
                ))}
              </div>

              {/* Live Dispatches Table */}
              <div className="space-y-2.5">
                <p className={`text-[11px] font-mono font-bold uppercase text-slate-400 ${alignText}`}>
                  Recent Active & Completed Network Shipments ({recentDispatches.length})
                </p>
                {recentDispatches.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-orange-300 shrink-0">{item.biltyNo}</span>
                        <span className="font-bold text-white truncate">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">
                        {item.origin} → {item.destination} • {formatWeightTons(item.weight)}
                        {item.assignedTruck ? ` • Truck ${item.assignedTruck}` : ''}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-white/10 bg-[#080F1E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <span className={`text-[11px] text-slate-400 ${alignText}`}>
            {isUrdu
              ? 'مکمل ڈیش بورڈ اور لائیو بکنگ کے لیے اپنے پورٹل میں لاگ ان کریں۔'
              : 'Sign in or create a free portal account to book trucks, issue e-Bilties, and track live GPS.'}
          </span>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Link
              to="/login"
              className="btn-primary text-xs font-bold !py-2 !px-4 whitespace-nowrap"
            >
              {isUrdu ? 'پورٹل لاگ ان' : 'Portal Login'}
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-2 rounded-xl border border-white/20 bg-white/[0.06] hover:bg-white/15 text-xs font-bold text-white transition-colors whitespace-nowrap"
            >
              {isUrdu ? 'رجسٹر کریں' : 'Register'}
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
