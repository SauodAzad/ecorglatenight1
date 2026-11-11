import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  Users, FileText, Activity, AlertTriangle, Check, X, XCircle, Shield, 
  Package, Trash2, CheckCircle, Loader2, ArrowRight, Truck, 
  Mail, Phone, Clock, Eye, AlertCircle, FileCheck, Send, MessageSquare, 
  MapPin, Calendar, LayoutGrid, Radio
} from 'lucide-react';
import { logisticsAPI, authAPI, adminAPI, socket } from '../../api';
import BiltyModal from '../../components/BiltyModal';
import { ChamakRibbon, TruckTaj, UrduMotto, WorkshopBadge, TruckPoetryBanner, TruckLotusArchBadge, TruckMorBadge, NazarBattuBadge } from '../../components/TruckArt';
import MapViewer from '../../components/MapViewer';
import { calculateFreightTariff, VEHICLE_MULTIPLIERS, getIntercityDistance, formatFreightPrice, formatWeightTons } from '../../utils/fareCalculator';
import SearchSelect from '../../components/SearchSelect';
import UnitInput from '../../components/UnitInput';
import FormField from '../../components/FormField';
import { 
  PAKISTAN_CITIES, 
  VEHICLE_TYPES, 
  WEIGHT_UNITS, 
  RATE_TYPES,
  convertToTons 
} from '../../data/logisticsData';
import { validatePositiveNumber } from '../../utils/validation';

const safeJsonParse = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    const res = JSON.parse(val);
    return res != null ? res : fallback;
  } catch (e) {
    return fallback;
  }
};

export default function TransporterDashboard() {
  const { userData, currentUser } = useAuth();
  const { isUrdu } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Live state arrays
  const [cargoRequests, setCargoRequests] = useState([]); // All cargo
  const [availableTrucks, setAvailableTrucks] = useState([]); // All available trucks
  const [bookings, setBookings] = useState([]); // Active and completed bookings
  const [trucksViewMode, setTrucksViewMode] = useState('grid'); // 'grid' | 'radar'

  // Action states
  const [rejectingCargoId, setRejectingCargoId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Assign Truck states & Route Tariff Details
  const [selectedTruckForAssign, setSelectedTruckForAssign] = useState(null);
  const [selectedCargoForAssign, setSelectedCargoForAssign] = useState(null);
  const [assignPrice, setAssignPrice] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignOrigin, setAssignOrigin] = useState('Lahore');
  const [assignDestination, setAssignDestination] = useState('Karachi');
  const [assignWeight, setAssignWeight] = useState('15');
  const [assignWeightUnit, setAssignWeightUnit] = useState('ton');
  const [assignVehicleType, setAssignVehicleType] = useState('Full Body Truck');
  const [assignFormErrors, setAssignFormErrors] = useState({});

  // Quick Tariff Estimator
  const [quickCalcOrigin, setQuickCalcOrigin] = useState('Lahore');
  const [quickCalcDest, setQuickCalcDest] = useState('Karachi');
  const [quickCalcWeight, setQuickCalcWeight] = useState('15');
  const [quickCalcWeightUnit, setQuickCalcWeightUnit] = useState('ton');

  // Active Shipments state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [chatMessageText, setChatMessageText] = useState('');

  // Bilty modal state
  const [biltyModalBooking, setBiltyModalBooking] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const onUiBack = (e) => {
      if (biltyModalBooking) {
        setBiltyModalBooking(null);
        e.preventDefault();
        return;
      }
      if (showAssignModal) {
        setShowAssignModal(false);
        e.preventDefault();
        return;
      }
      if (rejectingCargoId) {
        setRejectingCargoId(null);
        setRejectionReason('');
        e.preventDefault();
        return;
      }
      if (selectedBooking) {
        setSelectedBooking(null);
        e.preventDefault();
        return;
      }
      if (activeTab !== 'requests') {
        setActiveTab('requests');
        e.preventDefault();
      }
    };
    window.addEventListener('ecargo:ui-back', onUiBack);
    return () => window.removeEventListener('ecargo:ui-back', onUiBack);
  }, [biltyModalBooking, showAssignModal, rejectingCargoId, selectedBooking, activeTab]);

  const fetchData = async () => {
    if (currentUser) {
      try {
        const [cargoRes, trucksRes, bookingsRes] = await Promise.all([
          logisticsAPI.getCargo({ transporterId: currentUser.id || currentUser._id }),
          logisticsAPI.getTrucks({ status: 'Available' }),
          logisticsAPI.getBookings({ transporterId: currentUser.id || currentUser._id })
        ]);
        setCargoRequests(cargoRes.data);
        setAvailableTrucks(trucksRes.data);
        setBookings(bookingsRes.data);
        setLoading(false);
      } catch (e) {
        console.error("Error fetching transporter data:", e);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();

    socket.on('booking_updated', fetchData);
    socket.on('notification', fetchData);

    return () => {
      socket.off('booking_updated');
      socket.off('notification');
    };
  }, [currentUser]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedBooking?.messages]);

  useEffect(() => {
    if (!rejectingCargoId && !showAssignModal) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setRejectingCargoId(null);
        setShowAssignModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rejectingCargoId, showAssignModal]);

  // Sync selected booking details when bookings refresh
  useEffect(() => {
    if (selectedBooking) {
      const updated = bookings.find(b => b._id === selectedBooking._id);
      if (updated) setSelectedBooking(updated);
    }
  }, [bookings]);

  const handleCargoResponse = async (cargoId, status) => {
    if (status === 'Rejected') {
      setRejectingCargoId(cargoId);
      setRejectionReason('');
      return;
    }
    if (isSubmittingAction) return;
    setIsSubmittingAction(true);
    try {
      await logisticsAPI.respondToCargo(cargoId, { status });
      toast.success('Cargo request accepted! You can now dispatch a truck to it.');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to update cargo status.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleConfirmRejection = async (e) => {
    e.preventDefault();
    if (!rejectionReason || isSubmittingAction) return;
    setIsSubmittingAction(true);
    try {
      await logisticsAPI.respondToCargo(rejectingCargoId, { status: 'Rejected', rejectionReason });
      setRejectingCargoId(null);
      setRejectionReason('');
      toast.info('Cargo request rejected.');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to reject cargo request.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const openAssignModalForTruck = (truck) => {
    setSelectedTruckForAssign(truck);
    setSelectedCargoForAssign(null);
    const orig = truck.loc ? (PAKISTAN_CITIES.find(c => (c.name || '').toLowerCase() === truck.loc.toLowerCase())?.name || truck.loc) : 'Lahore';
    const dest = 'Karachi';
    const wt = parseFloat(truck.capacity) || 15;
    const vType = truck.truckType || 'Full Body Truck';
    setAssignOrigin(orig);
    setAssignDestination(dest);
    setAssignWeight(wt);
    setAssignVehicleType(vType);
    const tariff = calculateFreightTariff({
      origin: orig,
      destination: dest,
      chargeableTons: wt,
      vehicleType: vType
    });
    setAssignPrice(tariff.totalFare || tariff.totalFreight);
    setShowAssignModal(true);
  };

  const handleCargoSelectInModal = (cargoId) => {
    if (!cargoId) {
      setSelectedCargoForAssign(null);
      return;
    }
    const cargo = cargoRequests.find(c => String(c._id) === String(cargoId) || Number(c._id) === Number(cargoId));
    setSelectedCargoForAssign(cargo || null);
    if (cargo) {
      const orig = cargo.origin || assignOrigin;
      const dest = cargo.destination || assignDestination;
      const wt = cargo.chargeableWeight || cargo.weight || assignWeight;
      setAssignOrigin(orig);
      setAssignDestination(dest);
      setAssignWeight(wt);
      const tariff = calculateFreightTariff({
        origin: orig,
        destination: dest,
        chargeableTons: wt,
        vehicleType: assignVehicleType || selectedTruckForAssign?.truckType || 'Full Body Truck',
        handlingFlags: cargo.specialHandling || []
      });
      setAssignPrice(tariff.totalFare || tariff.totalFreight);
    }
  };

  const handleAssignConfirm = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!selectedCargoForAssign) {
      errors.cargo = isUrdu ? 'برائے مہربانی پہلے مال کا انتخاب کریں' : 'Please select an accepted cargo consignment';
    }
    const priceErr = validatePositiveNumber(assignPrice, 'Agreed Price', isUrdu);
    if (priceErr) errors.price = priceErr;

    if (Object.keys(errors).length > 0) {
      setAssignFormErrors(errors);
      return;
    }
    if (isSubmittingAction) return;
    setIsSubmittingAction(true);

    try {
      const truckId = selectedTruckForAssign._id || selectedTruckForAssign.id;
      const cargoId = selectedCargoForAssign._id || selectedCargoForAssign.id;
      // Create a booking request for the selected truck and cargo
      await logisticsAPI.createBooking({
        truckId: truckId,
        truckPlate: selectedTruckForAssign.plateNumber,
        truckOwnerId: selectedTruckForAssign.ownerId,
        cargoId: cargoId,
        cargoTitle: selectedCargoForAssign.title,
        price: assignPrice,
        transporterName: userData.name
      });
      // Automatically update the Cargo status to show Truck Assigned
      await logisticsAPI.updateCargo(cargoId, {
        status: 'Truck Assigned',
        assignedTruck: selectedTruckForAssign.plateNumber
      });
      setShowAssignModal(false);
      setAssignPrice('');
      setAssignFormErrors({});
      setSelectedCargoForAssign(null);
      setSelectedTruckForAssign(null);
      fetchData();
      toast.success("Booking request submitted to Truck Owner!");
    } catch (error) {
      console.error("Error creating booking:", error.response?.data || error.message);
      toast.error(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !selectedBooking) return;
    try {
      await logisticsAPI.updateBooking(selectedBooking._id || selectedBooking.id, {
        $push: { messages: { sender: userData.name, text: chatMessageText.trim() } }
      });
      setChatMessageText('');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to send message.');
    }
  };

  const handleBiltyClick = (booking) => {
    setBiltyModalBooking(booking);
  };

  const getStatusBadgeStyle = (status) => {
    switch (status?.toUpperCase()) {
      case 'IN TRANSIT':
        return 'bg-orange-50 text-orange-700 border border-orange-200 font-bold';
      case 'DELIVERED':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold';
      case 'LOADED':
        return 'bg-amber-50 text-amber-800 border border-amber-200 font-bold';
      case 'ACCEPTED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold';
      case 'TRUCK ASSIGNED':
        return 'bg-slate-100 text-slate-700 border border-slate-200 font-bold';
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border border-amber-200 font-bold';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200 font-bold';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
        <p className="text-sm text-slate-600 font-bold tracking-wider font-mono">
          {isUrdu ? 'براہ کرم انتظار کریں...' : 'LOADING OPERATOR CENTER...'}
        </p>
      </div>
    );
  }

  const pendingRequests = cargoRequests.filter(c => c.status === 'Pending');

  return (
    <div className="dash-dark-theme max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 relative page-enter">
      {/* Truck Poetry Banner */}
      <div className="mb-6 relative z-10">
        <TruckPoetryBanner />
      </div>

      {/* Command Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 relative z-10 rounded-2xl sm:rounded-3xl bg-[#0B1325]/96 border border-white/15 p-4 sm:p-6 shadow-[0_18px_48px_-14px_rgba(0,0,0,0.75)] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#EA580C] via-[#F89020] to-cyan-400" />
        <div className="text-left">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <TruckMorBadge />
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-300 bg-orange-500/15 px-2.5 py-0.5 rounded-full border border-orange-400/35">Fleet Operations</span>
            <NazarBattuBadge />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{isUrdu ? 'کارگو ٹرانسپورٹر ڈیش بورڈ' : 'Cargo Transporter Dashboard'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">{isUrdu ? 'کارپوریٹ شپنگ کی درخواستیں قبول کریں اور گاڑی ڈسپیچ کریں' : 'Accept corporate shipping requests, coordinate fleet logistics, and dispatch verified drivers.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0F1930]/92 border border-white/15 px-3.5 py-2 rounded-xl text-xs text-slate-200 font-mono shadow-sm">
            <Clock size={14} className="text-orange-400" />
            <span>Operations Live: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation (Obsidian Segmented Dock) */}
      <div className="mb-6 sm:mb-8 relative z-10 overflow-x-auto touch-scroll no-scrollbar">
        <nav className="inline-flex min-w-full sm:min-w-0 items-center gap-1.5 p-1.5 rounded-2xl bg-[#0B1325]/96 border border-white/15 shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
          {[
            { id: 'requests', name: isUrdu ? 'نئی کارگو درخواستیں' : 'Incoming Requests', badge: pendingRequests.length },
            { id: 'trucks', name: isUrdu ? 'دستیاب گاڑیاں' : 'Available Trucks' },
            { id: 'shipments', name: isUrdu ? 'فعال ترسیلات' : 'Active Shipments' },
            { id: 'history', name: isUrdu ? 'تاریخچہ و ریکارڈ' : 'Delivery History' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedBooking(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white shadow-[0_6px_18px_-4px_rgba(249,115,22,0.55)]' 
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {tab.name}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  activeTab === tab.id ? 'bg-white/25 text-white border border-white/30' : 'bg-orange-600 text-white animate-pulse shadow-sm'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6 relative z-10">

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="space-y-6 text-left">
            {pendingRequests.map(req => {
              const reqProducts = Array.isArray(req.products) ? req.products : safeJsonParse(req.products, []);
              const reqPickup = (req.pickupDetails && typeof req.pickupDetails === 'object') ? req.pickupDetails : safeJsonParse(req.pickupDetails, {});
              const reqRecipients = Array.isArray(req.recipients) ? req.recipients : safeJsonParse(req.recipients, []);

              return (
              <div key={req._id || req.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <TruckTaj className="text-orange-600 w-4 h-3" />
                      REQ-{req.id || (req._id ? String(req._id).slice(0, 8) : '')} <span className="font-normal text-sm text-slate-600">from {req.businessOwnerName}</span>
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Recent'}
                  </span>
                </div>

                {/* Details split column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
                  {/* Products */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Consignment</p>
                    <div className="space-y-1.5 mt-2">
                      <p className="font-bold text-slate-900 text-sm">{req.title}</p>
                      <p className="text-xs text-orange-700 font-bold font-mono">
                        {req.chargeableWeight ? `${formatWeightTons(req.chargeableWeight)} (Chargeable)` : formatWeightTons(req.weight)}
                        {req.packagingType && <span className="ml-2 text-slate-600 font-sans">&bull; {req.packagingType}</span>}
                      </p>
                      {reqProducts.map((p, idx) => (
                        <p key={idx} className="text-xs text-slate-600 font-mono">
                          &middot; {p.name || p.title} ({p.quantity || p.qty || '1'} units)
                          {p.length && p.width && p.height ? ` [${p.length}x${p.width}x${p.height}cm]` : ''}
                        </p>
                      ))}

                      {/* Special Handling Badges */}
                      {(() => {
                        const flags = Array.isArray(req.specialHandling) ? req.specialHandling : safeJsonParse(req.specialHandling, []);
                        if (!flags || flags.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {flags.map((flag, fi) => (
                              <span key={fi} className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                ⚠ {flag}
                              </span>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Calculated Recommended NHA Tariff */}
                      {(() => {
                        const reqTariff = calculateFreightTariff({
                          origin: req.origin,
                          destination: req.destination,
                          chargeableTons: parseFloat(req.chargeableWeight || req.weight) || 10,
                          vehicleType: 'Full Body Truck',
                          handlingFlags: req.specialHandling || []
                        });
                        const total = reqTariff.totalFare || reqTariff.totalFreight || 0;
                        const tax = reqTariff.taxAmount || reqTariff.salesTax || 0;
                        const base = reqTariff.baseFreight || reqTariff.baseFare || 0;
                        return (
                          <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl text-left mt-2 flex items-center justify-between shadow-xs">
                            <div>
                              <p className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">
                                Calculated Tariff ({reqTariff.distanceKm || 0} km)
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Base: Rs. {base.toLocaleString()} &bull; Tax: Rs. {tax.toLocaleString()}
                              </p>
                            </div>
                            <span className="text-xs font-black text-emerald-700 font-mono">
                              Rs. {total.toLocaleString()}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Pickup */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Pickup Point</p>
                    <div className="space-y-1 mt-2 text-xs text-slate-700">
                      <p className="font-bold text-slate-900 text-sm">{req.origin}</p>
                      <p><span className="text-slate-500">Address:</span> {reqPickup.address || 'Not specified'}</p>
                      <p><span className="text-slate-500">Landmark:</span> {reqPickup.landmark || '—'}</p>
                      <p><span className="text-slate-500">Contact:</span> {reqPickup.contactName || reqPickup.contact || 'Shipper Contact'} {reqPickup.phone || reqPickup.contactPhone ? `(${reqPickup.phone || reqPickup.contactPhone})` : ''}</p>
                    </div>
                  </div>

                  {/* Recipients */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Recipients</p>
                    <div className="space-y-1 mt-2 text-xs text-slate-700">
                      <p className="font-bold text-slate-900 text-sm">{req.destination}</p>
                      {reqRecipients.map((r, idx) => (
                        <div key={idx} className="mt-1">
                          <p><span className="text-slate-500">To:</span> {r.name || r.fullName} ({r.phone})</p>
                          <p><span className="text-slate-500">Delivery Address:</span> {r.address || r.streetAddress}</p>
                          <p className="text-emerald-700 mt-1 font-bold font-mono">Deadline: {r.expectedDate || r.deadline ? (r.expectedDate || r.deadline).split('T')[0] : '2026-06-14'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Accept/Reject triggers */}
                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => handleCargoResponse(req._id || req.id, 'Accepted')}
                    className="flex-1 btn-primary text-sm font-bold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <CheckCircle size={16} /> {isUrdu ? 'درخواست قبول کریں' : 'Accept Request'}
                  </button>
                  <button 
                    onClick={() => handleCargoResponse(req._id || req.id, 'Rejected')}
                    className="flex-1 btn-outline text-sm font-bold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} className="shrink-0" /> {isUrdu ? 'مسترد کریں' : 'Reject Request'}
                  </button>
                </div>
              </div>
              );
            })}
            {pendingRequests.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-600 shadow-xs">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-70" />
                <p className="font-bold text-slate-800">No incoming shipping requests found.</p>
                <p className="text-xs text-slate-500 mt-1">All incoming shipments are processed!</p>
              </div>
            )}
          </div>
        )}

        {/* AVAILABLE TRUCKS TAB */}
        {activeTab === 'trucks' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-600 tracking-wider uppercase text-left">
                  {isUrdu ? 'دستیاب گاڑیوں کی ڈائریکٹری' : 'Available Trucks Directory'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isUrdu ? 'گاڑیاں تلاش کریں اور فوری طور پر کارگو کے لیے مقرر کریں' : 'Locate verified fleet carriers and dispatch them directly to accepted cargo.'}
                </p>
              </div>

              {/* View Switcher: Grid vs Live Fleet Radar */}
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    onClick={() => setTrucksViewMode('grid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      trucksViewMode === 'grid'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid size={14} />
                    <span>{isUrdu ? 'گرڈ منظر' : 'Cards'}</span>
                  </button>
                  <button
                    onClick={() => setTrucksViewMode('radar')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      trucksViewMode === 'radar'
                        ? 'bg-orange-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Radio size={14} className={trucksViewMode === 'radar' ? 'text-white' : ''} />
                    <span>{isUrdu ? 'لائیو ریڈار نقشہ' : 'Live Fleet Radar'}</span>
                  </button>
                </div>
                <UrduMotto />
              </div>
            </div>

            {/* Quick Inter-City Freight Tariff Estimator Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left relative z-20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <TruckTaj className="text-orange-600 w-4 h-3" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    ⚡ Live Inter-City Freight Tariff Estimator
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-slate-700 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                  Standard Rate: Rs. 45/Ton-km + 8% Fuel + 16% Tax
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div>
                  <SearchSelect
                    label="From (Origin)"
                    options={PAKISTAN_CITIES}
                    value={quickCalcOrigin}
                    onChange={(val) => setQuickCalcOrigin(val)}
                    placeholder="Origin city..."
                    isUrdu={isUrdu}
                  />
                </div>
                <div>
                  <SearchSelect
                    label="To (Destination)"
                    options={PAKISTAN_CITIES}
                    value={quickCalcDest}
                    onChange={(val) => setQuickCalcDest(val)}
                    placeholder="Destination city..."
                    isUrdu={isUrdu}
                  />
                </div>
                <div>
                  <UnitInput
                    label="Payload"
                    value={quickCalcWeight}
                    onChange={(val) => setQuickCalcWeight(val)}
                    selectedUnit={quickCalcWeightUnit}
                    onUnitChange={(unit) => setQuickCalcWeightUnit(unit)}
                    units={WEIGHT_UNITS}
                    placeholder="e.g. 15"
                    isUrdu={isUrdu}
                  />
                </div>
                {(() => {
                  const wtInTons = convertToTons(quickCalcWeight, quickCalcWeightUnit);
                  const quickTariff = calculateFreightTariff({
                    origin: quickCalcOrigin,
                    destination: quickCalcDest,
                    chargeableTons: wtInTons > 0 ? wtInTons : 10,
                    vehicleType: 'Full Body Truck'
                  });
                  const quickTotal = quickTariff.totalFare || quickTariff.totalFreight || 0;
                  return (
                    <div className="bg-orange-50/70 border border-orange-300 rounded-xl p-2 px-3 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase block font-mono">{quickTariff.distanceKm || 0} km</span>
                        <span className="text-sm font-black text-orange-700 font-mono">Rs. {quickTotal.toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                        Estimated
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {trucksViewMode === 'radar' ? (
              /* Live Fleet Radar Map View */
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm overflow-hidden relative">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 px-2">
                    <div className="flex items-center gap-2">
                      <Radio size={16} className="text-emerald-400" />
                      <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                        {isUrdu ? 'ملک گیر بیڑے کا لائیو ریڈار' : 'Nationwide Fleet Radar Telemetry'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {isUrdu ? `${availableTrucks.length} گاڑیاں آن لائن` : `${availableTrucks.length} Available Vehicles Online`}
                    </span>
                  </div>

                  <MapViewer 
                    trucks={availableTrucks}
                    onAssignTruck={(truck) => openAssignModalForTruck(truck)}
                    height="500px"
                    zoom={6}
                  />
                </div>

                {/* Fleet Quick Selection Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {availableTrucks.map(truck => (
                    <div 
                      key={truck._id || truck.id}
                      onClick={() => openAssignModalForTruck(truck)}
                      className="bg-white border border-slate-200 rounded-xl p-3 text-left hover:border-orange-400 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-mono font-bold text-xs text-slate-900 group-hover:text-orange-700 transition-colors">{truck.plateNumber}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-orange-500 shrink-0" /> {truck.loc}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                          {truck.capacity}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-0.5 capitalize">{truck.truckType || 'Heavy'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Grid Cards View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableTrucks.map(truck => (
                  <div key={truck._id} className="bg-white border border-slate-200 rounded-2xl p-5 text-left flex flex-col justify-between h-[290px] shadow-xs hover:border-orange-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                          <Truck size={20} />
                        </div>
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md font-mono shadow-2xs">
                          Available
                        </span>
                      </div>

                      <h4 className="text-xl font-bold text-slate-900 mt-4 font-mono">{truck.plateNumber}</h4>
                      <p className="text-xs text-orange-700 font-semibold mt-1">{truck.truckType} &middot; {truck.capacity}</p>

                      <div className="mt-4 space-y-1 text-xs text-slate-700">
                        <p><span className="text-slate-500">Owner:</span> <span className="text-slate-900 font-bold">{truck.ownerName}</span></p>
                        <p><span className="text-slate-500">Driver:</span> <span className="text-slate-900 font-bold">{truck.driverName}</span> <span className="text-slate-500 font-mono">({truck.driverMobile})</span></p>
                        <p className="flex items-center gap-1 mt-2 text-slate-600 font-medium">
                          <MapPin size={12} className="text-slate-500" /> {truck.loc}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => openAssignModalForTruck(truck)}
                      className="w-full btn-primary font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer mt-4 shadow-xs"
                    >
                      {isUrdu ? 'گاڑی مقرر کریں' : 'Assign to Shipment'}
                    </button>
                  </div>
                ))}
                {availableTrucks.length === 0 && (
                  <div className="col-span-3 bg-white border border-slate-200 rounded-2xl text-center py-16 text-slate-600 shadow-xs">
                    No available trucks found. Register or clear trips to free vehicles.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ACTIVE SHIPMENTS TAB */}
        {activeTab === 'shipments' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-600 tracking-wider uppercase text-left">
              {bookings.filter(b => b.status !== 'Completed' && b.status !== 'Rejected').length} active transits in dispatch
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[480px]">
              {/* Left pane listings */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 overflow-y-auto max-h-[500px] space-y-3 shadow-xs">
                {bookings
                  .filter(b => b.status !== 'Completed' && b.status !== 'Rejected')
                  .map(b => {
                    const isSelected = selectedBooking?._id === b._id;
                    return (
                      <div
                        key={b._id}
                        onClick={() => setSelectedBooking(b)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                          isSelected 
                            ? 'bg-orange-50/50 border-2 border-orange-600 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#F89020]" />
                        )}
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1 pr-1">
                            <h4 className="font-mono text-xs text-orange-700 font-bold">BLT-{b.cargoId || (b._id ? String(b._id).slice(0, 8) : '')}</h4>
                            <h4 className="font-bold text-slate-900 text-sm mt-0.5 truncate" title={b.cargoTitle}>{b.cargoTitle}</h4>
                            <p className="text-xs text-slate-500 mt-1 font-mono">Truck: {b.truckPlate}</p>
                          </div>
                          <span className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeStyle(b.status)}`}>
                            {b.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                {bookings.filter(b => b.status !== 'Completed' && b.status !== 'Rejected').length === 0 && (
                  <div className="text-center py-16 text-slate-500 text-sm">No active shipments in progress.</div>
                )}
              </div>

              {/* Right details review & chat panel */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Details card */}
                <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between text-left shadow-xs">
                  {selectedBooking ? (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start border-b border-slate-200 pb-4 gap-2">
                          <div className="min-w-0 flex-1 pr-2">
                            <h3 className="text-lg font-bold text-slate-900 break-words">{selectedBooking.cargoTitle}</h3>
                            <p className="text-xs text-slate-500 mt-1">
                              Owner ID: USR-{selectedBooking.truckOwnerId} &middot; Plate: <span className="font-mono font-bold text-slate-900">{selectedBooking.truckPlate}</span>
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-mono font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 whitespace-nowrap">
                            BLT-{selectedBooking.cargoId || (selectedBooking._id ? String(selectedBooking._id).slice(0, 8) : '')}
                          </span>
                        </div>

                        {/* Specifications */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-5 sm:mt-6 text-xs text-slate-700">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Route</p>
                            <p className="font-bold text-slate-900 mt-0.5">
                              {selectedBooking.cargo?.origin || 'Lahore'} &rarr; {selectedBooking.cargo?.destination || 'Karachi'}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agreed Price</p>
                            <p className="font-bold text-emerald-700 mt-0.5 font-mono">{formatFreightPrice(selectedBooking.price)}</p>
                          </div>
                          {selectedBooking.cargo?.weight && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Weight</p>
                              <p className="font-bold text-slate-900 mt-0.5 font-mono">{formatWeightTons(selectedBooking.cargo?.weight)}</p>
                            </div>
                          )}
                          {selectedBooking.eta && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ETA</p>
                              <p className="font-bold text-slate-800 mt-0.5 font-mono">{selectedBooking.eta}</p>
                            </div>
                          )}
                        </div>

                        {/* Pickup details */}
                        {(() => {
                          const pickup = (selectedBooking.cargo?.pickupDetails && typeof selectedBooking.cargo?.pickupDetails === 'object')
                            ? selectedBooking.cargo.pickupDetails
                            : safeJsonParse(selectedBooking.cargo?.pickupDetails, {});
                          return (
                            <div className="mt-6 border-t border-slate-200 pt-4 space-y-2">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pickup Address</p>
                              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-700">
                                <p><span className="text-slate-500 font-medium">Point:</span> {pickup.address || 'Corporate depot'}</p>
                                <p className="mt-1"><span className="text-slate-500 font-medium">Contact:</span> {pickup.contactName || pickup.contact || '-'} ({pickup.phone || pickup.contactPhone || '-'})</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* PDF download */}
                      <button 
                        onClick={() => handleBiltyClick(selectedBooking)}
                        className="w-full btn-primary font-bold py-3 rounded-xl text-sm transition-all cursor-pointer mt-8 flex justify-center items-center gap-2 shadow-sm"
                      >
                        <FileText size={16} /> {isUrdu ? 'بلٹی دیکھیں' : 'View & Print Digital Bilty'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-16">
                      <Package size={36} className="text-slate-300" />
                      <p className="text-sm font-semibold font-sans">Select a shipment to view details</p>
                    </div>
                  )}
                </div>

                {/* Chat pane */}
                <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-[400px] md:h-full shadow-xs">
                  {selectedBooking ? (
                    <div className="flex flex-col justify-between h-full text-left">
                      <div className="border-b border-slate-200 pb-2 mb-3 flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Fleet Radio / Chat</h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Plate: {selectedBooking.truckPlate}</p>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>

                      {/* messages bubble log */}
                      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
                        {(selectedBooking.messages || []).map((m, idx) => {
                          const isTransporter = m.sender === userData?.name;
                          return (
                            <div key={idx} className={`flex ${isTransporter ? 'justify-end' : 'justify-start'}`}>
                              <div className={`p-2.5 rounded-2xl max-w-[85%] text-xs text-left shadow-2xs ${
                                isTransporter 
                                  ? 'bg-orange-600 text-white rounded-tr-none' 
                                  : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-none'
                              }`}>
                                <p className={`text-[9px] font-bold mb-0.5 ${isTransporter ? 'text-orange-100' : 'text-slate-500'}`}>{m.sender}</p>
                                <p className="leading-relaxed">{m.text}</p>
                              </div>
                            </div>
                          );
                        })}
                        {(selectedBooking.messages || []).length === 0 && (
                          <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400 italic">No messages exchanged. Type below to text the driver.</div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat text input submit */}
                      <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-slate-200 pt-3">
                        <input 
                          type="text" 
                          value={chatMessageText}
                          onChange={e => setChatMessageText(e.target.value)}
                          placeholder="Type dispatch message..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-orange-500"
                        />
                        <button 
                          type="submit"
                          className="btn-primary p-2.5 rounded-xl cursor-pointer flex items-center justify-center shadow-xs"
                        >
                          <Send size={14} />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <MessageSquare size={28} className="text-slate-300" />
                      <p className="text-xs font-semibold">Select a shipment to open chat</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left shadow-xs">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase">Delivery History</h3>
                <span className="text-xs font-mono font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                  Completed Trips: {bookings.filter(b => b.status === 'Completed').length}
                </span>
              </div>

              <div className="overflow-x-auto touch-scroll">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                      <th className="p-3">Shipment ID</th>
                      <th className="p-3">Bilty No.</th>
                      <th className="p-3">Business Owner</th>
                      <th className="p-3">Route</th>
                      <th className="p-3">Weight</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings
                      .filter(b => b.status === 'Completed')
                      .map((b, idx) => (
                        <tr key={b._id || idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-mono text-slate-600">SHP-{b.cargoId || 10400 + idx}</td>
                          <td className="p-3">
                            <button 
                              onClick={() => handleBiltyClick(b)}
                              className="font-mono font-bold text-orange-700 hover:underline cursor-pointer"
                            >
                              BLT-{b.cargoId || 88000 + idx}
                            </button>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{b.cargo?.businessOwnerName || 'Shipper'}</td>
                          <td className="p-3 text-slate-700">
                            {b.cargo?.origin || b.origin || '—'} &rarr; {b.cargo?.destination || b.destination || '—'}
                          </td>
                          <td className="p-3 text-slate-800 font-mono font-bold">{b.cargo?.weight ? formatWeightTons(b.cargo.weight) : '—'}</td>
                          <td className="p-3 text-slate-500 font-mono text-xs">
                            {b.completedAt ? b.completedAt.split('T')[0] : '—'}
                          </td>
                          <td className="p-3">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                              DELIVERED
                            </span>
                          </td>
                        </tr>
                      ))}
                    {bookings.filter(b => b.status === 'Completed').length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-12 text-slate-500 italic">No completed delivery history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODALS */}

      {/* Rejection popup form */}
      {rejectingCargoId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/78 px-2.5 sm:px-4 py-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRejectingCargoId(null);
              setRejectionReason('');
            }
          }}
        >
          <div className="bg-white w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto relative p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xl modal-enter">
            <button type="button" aria-label="Close modal" onClick={() => { setRejectingCargoId(null); setRejectionReason(''); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-2 mt-1 text-left">Reject Shipment Request</h2>
            <p className="text-xs text-slate-600 mb-6 text-left">Please provide a mandatory reason for rejecting this corporate shipment request.</p>
            <form onSubmit={handleConfirmRejection} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Rejection Reason *</label>
                <textarea 
                  required 
                  value={rejectionReason} 
                  onChange={e => setRejectionReason(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 h-24 text-sm outline-none focus:bg-white focus:border-rose-500" 
                  placeholder="e.g. Schedule conflict or route unavailable. We cannot dispatch vehicles to this route next week." 
                />
              </div>
              <button type="submit" disabled={isSubmittingAction} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-sm transition-all cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed">
                {isSubmittingAction ? 'Submitting...' : (isUrdu ? 'مسترد کریں' : 'Confirm Rejection')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Truck popup form with Dynamic Fare Calculation */}
      {showAssignModal && selectedTruckForAssign && (() => {
        const acceptedCargoList = cargoRequests.filter(c => c.status === 'Accepted');
        const activeTariff = calculateFreightTariff({
          origin: assignOrigin || 'Lahore',
          destination: assignDestination || 'Karachi',
          chargeableTons: Math.max(0.5, convertToTons(assignWeight, assignWeightUnit) || 1),
          vehicleType: assignVehicleType || selectedTruckForAssign?.truckType || '18-Wheeler Trailer',
          handlingFlags: selectedCargoForAssign?.specialHandling || []
        });

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/78 px-2.5 sm:px-4 py-4"
            onClick={(e) => e.target === e.currentTarget && setShowAssignModal(false)}
          >
            <div className="bg-white w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto relative p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xl modal-enter">
              <button type="button" aria-label="Close modal" onClick={() => setShowAssignModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
              <div className="flex items-center gap-2 mb-1 mt-1 text-left">
                <TruckTaj className="text-orange-600 w-4 h-3" />
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Fleet Dispatch &amp; Tariff Engine</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1 text-left">Assign Truck &amp; Calculate Fare</h2>
              <p className="text-xs text-slate-600 mb-4 text-left">
                Select route and consignment details to view automated government/NHA freight tariff for vehicle <span className="text-orange-700 font-bold font-mono">{selectedTruckForAssign.plateNumber}</span>.
              </p>

              {/* Truck summary badge */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-left flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{selectedTruckForAssign.plateNumber}</span>
                    <span className="text-[10px] font-bold bg-orange-50 text-orange-800 px-2 py-0.5 rounded border border-orange-200 font-mono">
                      {selectedTruckForAssign.truckType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Depot: <span className="text-slate-900 font-medium">{selectedTruckForAssign.loc}</span> &bull; Driver: <span className="text-slate-900 font-medium">{selectedTruckForAssign.driverName}</span>
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300">
                    Max: {selectedTruckForAssign.capacity}
                  </span>
                </div>
              </div>

              <form onSubmit={handleAssignConfirm} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Accepted Consignment Request <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={selectedCargoForAssign ? String(selectedCargoForAssign._id) : ''}
                    onChange={e => {
                      handleCargoSelectInModal(e.target.value);
                      if (assignFormErrors.cargo) {
                        setAssignFormErrors(prev => {
                          const copy = { ...prev };
                          delete copy.cargo;
                          return copy;
                        });
                      }
                    }}
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-slate-900 text-xs outline-none transition-colors font-medium cursor-pointer ${
                      assignFormErrors.cargo ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 focus:bg-white focus:border-orange-500'
                    }`}
                  >
                    <option value="">
                      {acceptedCargoList.length === 0
                        ? '-- No accepted cargo available yet --'
                        : '-- Select Consignment Request --'}
                    </option>
                    {acceptedCargoList.map(c => (
                        <option key={c._id} value={String(c._id)}>
                          REQ-{c._id}: {c.title} ({c.weight} tons) &bull; {c.origin} &rarr; {c.destination}
                        </option>
                      ))}
                  </select>
                  {acceptedCargoList.length === 0 && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5 font-medium">
                      Accept a shipment in the Shipment Requests tab first before assigning a truck.
                    </p>
                  )}
                  {assignFormErrors.cargo && (
                    <p className="text-[10px] text-red-600 mt-1 font-medium">{assignFormErrors.cargo}</p>
                  )}
                </div>

                {/* Route Details: From, To, Weight, Vehicle Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <SearchSelect
                      label="From (Origin City)"
                      options={PAKISTAN_CITIES}
                      value={assignOrigin}
                      onChange={(val) => setAssignOrigin(val)}
                      placeholder="Origin city..."
                      required
                      isUrdu={isUrdu}
                    />
                  </div>

                  <div>
                    <SearchSelect
                      label="To (Destination City)"
                      options={PAKISTAN_CITIES}
                      value={assignDestination}
                      onChange={(val) => setAssignDestination(val)}
                      placeholder="Destination city..."
                      required
                      isUrdu={isUrdu}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <UnitInput
                      label="Consignment Weight"
                      value={assignWeight}
                      onChange={(val) => setAssignWeight(val)}
                      selectedUnit={assignWeightUnit}
                      onUnitChange={(unit) => setAssignWeightUnit(unit)}
                      units={WEIGHT_UNITS}
                      placeholder="e.g. 15"
                      required
                      isUrdu={isUrdu}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Vehicle Type
                    </label>
                    <select
                      value={assignVehicleType}
                      onChange={e => setAssignVehicleType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:bg-white focus:border-orange-500 cursor-pointer font-medium"
                    >
                      {VEHICLE_TYPES.map(vt => (
                        <option key={vt.id} value={vt.id}>{vt.label} ({vt.defaultCapacity}t max)</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Dynamic Calculated Fare Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <TruckTaj className="w-3.5 h-3 text-orange-600" />
                      Dynamic Tariff Breakdown
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      🛣️ {activeTariff.distanceKm} km (NHA Highway)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Base Freight</span>
                      <span className="font-mono font-bold text-slate-800">Rs. {(activeTariff.baseFreight || activeTariff.baseFare || 0).toLocaleString()}</span>
                      <span className="text-[9px] text-slate-400 block font-mono">@ Rs. 45/Ton-km x {activeTariff.tons || activeTariff.chargeableTons || 1}T</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Fuel Surcharge (8%)</span>
                      <span className="font-mono font-bold text-slate-800">Rs. {(activeTariff.fuelSurcharge || 0).toLocaleString()}</span>
                      <span className="text-[9px] text-slate-400 block font-mono">National Diesel Index</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Provincial Tax (16%)</span>
                      <span className="font-mono font-bold text-slate-800">Rs. {(activeTariff.taxAmount || activeTariff.salesTax || 0).toLocaleString()}</span>
                      <span className="text-[9px] text-slate-400 block font-mono">PRA / SRB Services</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Vehicle Multiplier</span>
                      <span className="font-mono font-bold text-slate-800">{activeTariff.vehicleMultiplier || 1}x</span>
                      <span className="text-[9px] text-slate-400 block font-mono">{activeTariff.vehicleType || 'Standard'}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">Calculated Fare:</span>
                      <p className="text-xl font-bold text-orange-700 font-mono">Rs. {(activeTariff.totalFare || activeTariff.totalFreight || 0).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignPrice(activeTariff.totalFare || activeTariff.totalFreight);
                        if (assignFormErrors.price) {
                          setAssignFormErrors(prev => {
                            const copy = { ...prev };
                            delete copy.price;
                            return copy;
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      ⚡ Apply Fare
                    </button>
                  </div>
                </div>

                {/* Agreed Price input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Agreed / Contract Price (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number"
                    value={assignPrice}
                    onChange={e => {
                      setAssignPrice(e.target.value);
                      if (assignFormErrors.price) {
                        setAssignFormErrors(prev => {
                          const copy = { ...prev };
                          delete copy.price;
                          return copy;
                        });
                      }
                    }}
                    placeholder="e.g. 75000"
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-bold outline-none font-mono transition-colors ${
                      assignFormErrors.price ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 focus:bg-white focus:border-orange-500'
                    }`}
                  />
                  {assignFormErrors.price ? (
                    <p className="text-[10px] text-red-600 mt-1 font-medium">{assignFormErrors.price}</p>
                  ) : (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tip: Click "⚡ Apply Fare" above to auto-fill with the government/NHA tariff estimate, or adjust manually.
                    </p>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingAction || acceptedCargoList.length === 0}
                  className="w-full btn-primary text-white font-bold py-3 rounded-xl text-sm transition-all cursor-pointer mt-4 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingAction && <Loader2 size={15} className="animate-spin" />}
                  <span>{isSubmittingAction ? 'Dispatching...' : (isUrdu ? 'گاڑی مقرر کریں' : 'Confirm Dispatch & Assignment')}</span>
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Bilty PDF Preview Modal */}
      <BiltyModal
        booking={biltyModalBooking}
        onClose={() => setBiltyModalBooking(null)}
      />

    </div>
  );
}
