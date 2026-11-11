import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import {
  Users, FileText, Activity, AlertTriangle, Check, X, Shield,
  Package, Trash2, CheckCircle, Loader2, ArrowRight, Truck,
  Mail, Phone, Clock, Eye, AlertCircle, FileCheck, Send, MessageSquare,
  MapPin, Calendar, Plus, Map, Info, Snowflake, Flame, ArrowUp, DollarSign, Calculator, Layers
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { logisticsAPI, authAPI, socket } from '../../api';
import BiltyModal from '../../components/BiltyModal';
import { ChamakRibbon, TruckTaj, UrduMotto, WorkshopBadge, TruckPoetryBanner, SindhiTruckTexture, TruckPatternBorder, TruckLotusArchBadge, TruckMorBadge, NazarBattuBadge } from '../../components/TruckArt';
import MapViewer, { getCoordinatesForLocation } from '../../components/MapViewer';
import {
  calculateFreightTariff,
  calculateVolumetricWeight,
  PACKAGING_TYPES,
  SPECIAL_HANDLING_FLAGS,
  PAYMENT_TERMS_OPTIONS,
  formatFreightPrice,
  formatWeightTons
} from '../../utils/fareCalculator';
import SearchSelect from '../../components/SearchSelect';
import UnitInput from '../../components/UnitInput';
import FormField from '../../components/FormField';
import {
  PAKISTAN_CITIES,
  CARGO_CATEGORIES,
  VEHICLE_TYPES,
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  RATE_TYPES,
  convertToTons
} from '../../data/logisticsData';
import {
  formatPhone,
  formatNTN,
  validatePhone,
  validateNTN,
  validatePositiveNumber,
  validateRequired
} from '../../utils/validation';

export default function BusinessDashboard() {
  const { userData, currentUser } = useAuth();
  const { isUrdu } = useLanguage();
  const { toast, confirm } = useToast();
  const errorSummaryRef = useRef(null);
  const [activeTab, setActiveTab] = useState('new-request');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Database listings state
  const [transporters, setTransporters] = useState([]);
  const [cargoList, setCargoList] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [trucks, setTrucks] = useState([]);

  // New Request Form states
  const [selectedTransporter, setSelectedTransporter] = useState(null);

  const [products, setProducts] = useState([
    { name: '', qty: '', unitWeight: '', weightUnit: 'ton', type: 'Textiles', lengthCm: '', widthCm: '', heightCm: '', dimensionUnit: 'cm' }
  ]);

  const [packagingType, setPackagingType] = useState('Cartons / Boxes');
  const [specialHandling, setSpecialHandling] = useState([]);
  const [senderNTN, setSenderNTN] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Prepaid');
  const [vehicleTypeChoice, setVehicleTypeChoice] = useState('18-Wheeler Trailer');
  const [rateType, setRateType] = useState('ton-km');
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [pickupDetails, setPickupDetails] = useState({
    streetAddress: '',
    city: '',
    province: '',
    landmark: '',
    contactPerson: '',
    contactPhone: ''
  });

  const [recipients, setRecipients] = useState([
    { fullName: '', phone: '', city: '', province: '', streetAddress: '', deadline: '', assignedProducts: '' }
  ]);

  // Track Shipments selection state
  const [selectedCargo, setSelectedCargo] = useState(null);
  const [biltyModalBooking, setBiltyModalBooking] = useState(null);

  useEffect(() => {
    const onUiBack = (e) => {
      if (biltyModalBooking) {
        setBiltyModalBooking(null);
        e.preventDefault();
        return;
      }
      if (selectedCargo) {
        setSelectedCargo(null);
        e.preventDefault();
        return;
      }
      if (activeTab !== 'new-request') {
        setActiveTab('new-request');
        e.preventDefault();
      }
    };
    window.addEventListener('ecargo:ui-back', onUiBack);
    return () => window.removeEventListener('ecargo:ui-back', onUiBack);
  }, [biltyModalBooking, selectedCargo, activeTab]);

  const fetchData = async () => {
    if (currentUser) {
      try {
        const [transRes, cargoRes, bookingsRes, trucksRes] = await Promise.all([
          logisticsAPI.getTransporters(),
          logisticsAPI.getCargo({ businessOwnerId: currentUser.id || currentUser._id }),
          logisticsAPI.getBookings(),
          logisticsAPI.getTrucks()
        ]);

        // Eager load transporter completed shipments counts from the backend user statistics
        setTransporters(transRes.data);
        setCargoList(cargoRes.data);
        setBookings(bookingsRes.data);
        setTrucks(trucksRes.data);
        setLoading(false);
      } catch (e) {
        console.error("Error fetching business dashboard data:", e);
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

  // Sync selected cargo details when cargoList refreshes
  useEffect(() => {
    if (selectedCargo) {
      const updated = cargoList.find(c => c._id === selectedCargo._id);
      if (updated) setSelectedCargo(updated);
    }
  }, [cargoList]);

  // Auto pre-fill saved business names, shipper contact info, and addresses from user profile
  useEffect(() => {
    if (userData || currentUser) {
      setPickupDetails(prev => ({
        ...prev,
        contactPerson: prev.contactPerson || userData?.name || currentUser?.name || '',
        contactPhone: prev.contactPhone || userData?.phone || currentUser?.phone || '',
        streetAddress: prev.streetAddress || (userData?.businessName ? `${userData.businessName} Logistics Yard` : '')
      }));
      if (!senderNTN && userData?.businessRegNumber) {
        setSenderNTN(userData.businessRegNumber);
      }
    }
  }, [userData, currentUser]);

  // Products utilities
  const addProductRow = () => {
    setProducts([...products, {
      name: '',
      qty: '',
      unitWeight: '',
      weightUnit: 'ton',
      type: 'Textiles',
      lengthCm: '',
      widthCm: '',
      heightCm: '',
      dimensionUnit: 'cm'
    }]);
  };

  const removeProductRow = (idx) => {
    setProducts(products.filter((_, i) => i !== idx));
  };

  const handleProductChange = (idx, field, value) => {
    const updated = [...products];
    updated[idx][field] = value;
    setProducts(updated);
  };

  // Recipients utilities
  const addRecipientRow = () => {
    setRecipients([...recipients, { fullName: '', phone: '', city: '', province: '', streetAddress: '', deadline: '', assignedProducts: '' }]);
  };

  const removeRecipientRow = (idx) => {
    setRecipients(recipients.filter((_, i) => i !== idx));
  };

  const handleRecipientChange = (idx, field, value) => {
    const updated = [...recipients];
    updated[idx][field] = value;
    setRecipients(updated);
  };

  // Auto-calculated gross weight converting any unit (Kg, Ton, Maund, Quintal) into Metric Tons
  const calculateGrossWeight = () => {
    return products.reduce((sum, p) => {
      const qty = parseFloat(p.qty) || 0;
      const wtInTons = convertToTons(p.unitWeight, p.weightUnit || 'ton');
      return sum + (qty * wtInTons);
    }, 0);
  };

  // Auto-calculated volumetric weight with dimensional unit support
  const calculateTotalVolumetricWeight = () => {
    return products.reduce((sum, p) => {
      let l = parseFloat(p.lengthCm) || 0;
      let w = parseFloat(p.widthCm) || 0;
      let h = parseFloat(p.heightCm) || 0;
      if (p.dimensionUnit === 'meter') {
        l *= 100;
        w *= 100;
        h *= 100;
      } else if (p.dimensionUnit === 'feet') {
        l *= 30.48;
        w *= 30.48;
        h *= 30.48;
      }
      const vol = calculateVolumetricWeight(l, w, h, p.qty);
      return sum + vol.tons;
    }, 0);
  };

  const grossWeight = calculateGrossWeight();
  const volumetricWeight = calculateTotalVolumetricWeight();
  const chargeableWeight = Math.max(grossWeight, volumetricWeight);

  // Dynamic tariff estimation
  const destinationCity = recipients[0]?.city || 'Karachi';
  const tariffQuote = useMemo(() => {
    return calculateFreightTariff({
      origin: pickupDetails.city || 'Lahore',
      destination: destinationCity,
      chargeableTons: Math.max(0.5, chargeableWeight),
      vehicleType: vehicleTypeChoice,
      handlingFlags: specialHandling
    });
  }, [pickupDetails.city, destinationCity, chargeableWeight, vehicleTypeChoice, specialHandling]);

  const toggleSpecialHandling = (flagId) => {
    if (specialHandling.includes(flagId)) {
      setSpecialHandling(specialHandling.filter(f => f !== flagId));
    } else {
      setSpecialHandling([...specialHandling, flagId]);
    }
  };

  // Strict Form Validation
  const validateForm = () => {
    const errors = {};

    if (!selectedTransporter) {
      errors.transporter = isUrdu ? 'برائے مہربانی پہلے ٹرانسپورٹر کا انتخاب کریں' : 'Please select a transporter for this shipment';
    }

    // Validate products
    products.forEach((p, idx) => {
      if (!p.name?.trim()) {
        errors[`prod_${idx}_name`] = isUrdu ? 'پروڈکٹ کا نام درج کریں' : 'Product name is required';
      }
      const qtyErr = validatePositiveNumber(p.qty, 'Quantity', isUrdu);
      if (qtyErr) errors[`prod_${idx}_qty`] = qtyErr;
      const wtErr = validatePositiveNumber(p.unitWeight, 'Unit Weight', isUrdu);
      if (wtErr) errors[`prod_${idx}_wt`] = wtErr;
    });

    // Validate pickup details
    if (!pickupDetails.streetAddress?.trim()) {
      errors.pickupAddress = isUrdu ? 'روانگی کا پتہ درج کریں' : 'Pickup street address is required';
    }
    if (!pickupDetails.city?.trim()) {
      errors.pickupCity = isUrdu ? 'روانگی کا شہر منتخب کریں' : 'Pickup city is required';
    }
    if (!pickupDetails.contactPerson?.trim()) {
      errors.pickupContact = isUrdu ? 'رابطہ کار کا نام درج کریں' : 'Contact person name is required';
    }
    const phoneErr = validatePhone(pickupDetails.contactPhone, isUrdu);
    if (phoneErr) errors.pickupPhone = phoneErr;

    // Validate recipients
    recipients.forEach((r, idx) => {
      if (!r.fullName?.trim()) {
        errors[`recip_${idx}_name`] = isUrdu ? 'وصول کنندہ کا نام درج کریں' : 'Consignee full name is required';
      }
      const rPhoneErr = validatePhone(r.phone, isUrdu);
      if (rPhoneErr) errors[`recip_${idx}_phone`] = rPhoneErr;
      if (!r.city?.trim()) {
        errors[`recip_${idx}_city`] = isUrdu ? 'منزل کا شہر منتخب کریں' : 'Destination city is required';
      }
      if (!r.streetAddress?.trim()) {
        errors[`recip_${idx}_address`] = isUrdu ? 'منزل کا پتہ درج کریں' : 'Destination delivery address is required';
      }
      if (!r.deadline) {
        errors[`recip_${idx}_deadline`] = isUrdu ? 'آخری تاریخ منتخب کریں' : 'Delivery deadline date is required';
      }
    });

    // Validate sender NTN if provided
    if (senderNTN) {
      const ntnErr = validateNTN(senderNTN, isUrdu, false);
      if (ntnErr) errors.senderNTN = ntnErr;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (formSubmitted) {
      validateForm();
    }
  }, [formSubmitted, selectedTransporter, products, pickupDetails, recipients, senderNTN]);

  const handleRequestSubmit = async (e, status = 'Pending') => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormSubmitted(true);

    if (!validateForm()) {
      toast.error(isUrdu ? 'برائے مہربانی فارم میں نشان زدہ غلطیوں کو درست کریں' : 'Please fix the highlighted form errors before proceeding.');
      setTimeout(() => {
        errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
      return;
    }

    setIsSubmitting(true);
    const cargoTitle = products.map(p => `${p.name || 'Goods'} (x${p.qty || 1} ${p.weightUnit || 'ton'})`).join(', ');

    const payload = {
      title: cargoTitle,
      weight: (chargeableWeight > 0 ? chargeableWeight : 1).toFixed(2),
      chargeableWeight: (chargeableWeight > 0 ? chargeableWeight : 1).toFixed(2),
      volumetricWeight: volumetricWeight.toFixed(2),
      packagingType,
      specialHandling,
      senderNTN: senderNTN || null,
      deliveryNotes: deliveryNotes || null,
      paymentTerms,
      vehicleTypeChoice,
      rateType,
      baseFare: tariffQuote.baseFreight,
      fuelSurcharge: tariffQuote.fuelSurcharge,
      taxAmount: tariffQuote.salesTax,
      totalFare: tariffQuote.totalFreight,
      origin: pickupDetails.city || 'Depot',
      destination: recipients.map(r => r.city).join(', ') || 'Receivers',
      transporterId: selectedTransporter._id,
      status: status,
      products: products.map(p => ({
        name: p.name,
        category: p.type,
        qty: parseInt(p.qty) || 1,
        unitWeight: parseFloat(p.unitWeight) || 0,
        weightUnit: p.weightUnit || 'ton',
        dimensions: {
          lengthCm: p.lengthCm || 0,
          widthCm: p.widthCm || 0,
          heightCm: p.heightCm || 0,
          unit: p.dimensionUnit || 'cm'
        }
      })),
      pickupDetails: {
        address: `${pickupDetails.streetAddress}, ${pickupDetails.city}, ${pickupDetails.province}`,
        landmark: pickupDetails.landmark,
        contactName: pickupDetails.contactPerson,
        phone: pickupDetails.contactPhone
      },
      recipients: recipients.map(r => ({
        name: r.fullName,
        phone: r.phone,
        address: `${r.streetAddress}, ${r.city}, ${r.province}`,
        expectedDate: r.deadline,
        assignedProducts: r.assignedProducts
      }))
    };

    try {
      await logisticsAPI.postCargo(payload);
      toast.success(status === 'Draft' ? 'Shipment saved as draft!' : 'Request submitted successfully with verified tariff and unit specs!');

      // Reset forms while preserving shipper profile contact details
      setSelectedTransporter(null);
      setProducts([{ name: '', qty: '', unitWeight: '', weightUnit: 'ton', type: 'Textiles', lengthCm: '', widthCm: '', heightCm: '', dimensionUnit: 'cm' }]);
      setPackagingType('Cartons / Boxes');
      setSpecialHandling([]);
      setSenderNTN(userData?.businessRegNumber || '');
      setDeliveryNotes('');
      setFormErrors({});
      setFormSubmitted(false);
      setPickupDetails({
        streetAddress: userData?.businessName ? `${userData.businessName} Logistics Yard` : '',
        city: '',
        province: '',
        landmark: '',
        contactPerson: userData?.name || currentUser?.name || '',
        contactPhone: userData?.phone || currentUser?.phone || ''
      });
      setRecipients([{ fullName: '', phone: '', city: '', province: '', streetAddress: '', deadline: '', assignedProducts: '' }]);

      fetchData();
      setActiveTab('track');
    } catch (err) {
      console.error("Error posting cargo:", err);
      toast.error("Failed to submit freight request: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDraft = async (cargoId) => {
    const confirmed = await confirm({
      title: 'Delete Draft Shipment',
      message: 'Are you sure you want to delete this saved draft shipment? This action cannot be undone.',
      confirmLabel: 'Delete Draft',
      tone: 'danger'
    });
    if (!confirmed) return;
    try {
      await logisticsAPI.deleteCargo(cargoId);
      toast.info('Draft shipment deleted.');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete draft shipment.');
    }
  };

  const findAssociatedBooking = (cargoItem, preferCompleted = false) => {
    const cid = Number(cargoItem?.id || cargoItem?._id);
    if (!cid) return null;
    if (preferCompleted) {
      const done = bookings.find(
        (b) => Number(b.cargoId) === cid && (b.status === 'Completed' || b.status === 'Delivered')
      );
      if (done) return done;
    }
    return bookings.find((b) => Number(b.cargoId) === cid) || null;
  };

  const handleBiltyClick = (cargo) => {
    // Locate the booking associated with this cargo to retrieve verified pricing & signature
    const associatedBooking = findAssociatedBooking(cargo, true);
    const biltyData = {
      id: cargo.id || cargo._id,
      _id: cargo._id || cargo.id,
      cargoId: cargo.id || cargo._id,
      cargoTitle: cargo.title,
      transporterName: cargo.transporterName || associatedBooking?.transporterName || 'Unassigned',
      truckPlate: associatedBooking?.truckPlate || cargo.assignedTruck || 'Unassigned',
      price: associatedBooking ? associatedBooking.price : (cargo.totalFare ? cargo.totalFare.toLocaleString() : null),
      completedAt: associatedBooking?.completedAt || cargo.createdAt,
      origin: cargo.origin,
      destination: cargo.destination,
      weight: cargo.weight,
      chargeableWeight: cargo.chargeableWeight || cargo.weight,
      packagingType: cargo.packagingType || 'Cartons / Boxes',
      paymentTerms: cargo.paymentTerms || 'Prepaid',
      specialHandling: cargo.specialHandling || [],
      senderNTN: cargo.senderNTN,
      deliveryNotes: cargo.deliveryNotes,
      receiverSignature: associatedBooking?.receiverSignature,
      businessOwnerName: userData?.businessName || userData?.name
    };
    setBiltyModalBooking(biltyData);
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
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border border-slate-200 font-bold';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200 font-bold';
    }
  };

  const getTransporterRating = (count) => {
    if (count > 40) return '★ 4.8';
    if (count > 25) return '★ 4.6';
    if (count > 15) return '★ 4.5';
    return '★ 4.2';
  };

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
            {isUrdu && <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-400/35 font-urdu">شاہراہِ پاکستان</span>}
            <NazarBattuBadge />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{isUrdu ? 'تاجر و کسٹمر پورٹل' : 'Business Shipping Panel'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">{isUrdu ? 'ٹرانسپورٹرز بک کریں، کارگو ٹریک کریں اور بلٹی حاصل کریں' : 'Book transporters, request shipments, and track cargo bilties in real-time.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0F1930]/92 border border-white/15 px-3.5 py-2 rounded-xl text-xs text-slate-200 font-mono shadow-sm">
            <Clock size={14} className="text-orange-400" />
            <span>Operational Session: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Obsidian Segmented Dock) */}
      <div className="mb-6 sm:mb-8 relative z-10 overflow-x-auto touch-scroll no-scrollbar">
        <nav className="inline-flex min-w-full sm:min-w-0 items-center gap-1.5 p-1.5 rounded-2xl bg-[#0B1325]/96 border border-white/15 shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
          {[
            { id: 'new-request', name: 'New Request' },
            { id: 'track', name: 'Track Shipments' },
            { id: 'transporters', name: 'Transporters Directory' },
            { id: 'history', name: 'History' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedCargo(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white shadow-[0_6px_18px_-4px_rgba(249,115,22,0.55)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Panels */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 shadow-xs">
          <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">Loading shipper workspace...</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* NEW REQUEST TAB */}
          {activeTab === 'new-request' && (
            <form onSubmit={(e) => handleRequestSubmit(e, 'Pending')} className="space-y-8 text-left">

              {/* Step 1: SELECT TRANSPORTER */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">1</span>
                    {isUrdu ? 'ٹرانسپورٹر کا انتخاب' : 'Select Transporter'}
                  </h3>
                  {selectedTransporter && (
                    <span className="text-xs font-mono text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 font-bold shadow-2xs">
                      Selected: {selectedTransporter.name}
                    </span>
                  )}
                </div>

                {formErrors.transporter && (
                  <div className="bg-red-50 border-2 border-red-400 text-red-700 text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 animate-shake">
                    <AlertCircle size={16} className="text-red-600 shrink-0" />
                    <span>{formErrors.transporter}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {transporters.map(t => (
                    <div
                      key={t._id}
                      onClick={() => {
                        setSelectedTransporter(t);
                        if (formErrors.transporter) {
                          setFormErrors(prev => {
                            const copy = { ...prev };
                            delete copy.transporter;
                            return copy;
                          });
                        }
                      }}
                      className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-300 relative overflow-hidden ${selectedTransporter?._id === t._id
                          ? 'bg-orange-50/50 border-2 border-orange-600 shadow-sm -translate-y-0.5'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                    >
                      {selectedTransporter?._id === t._id && (
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#F89020]" />
                      )}
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{t.name}</h4>
                          <p className="text-xs text-slate-600 mt-1 font-mono">{t.phone || 'Contact via portal'} &middot; {t.shipmentsCount || 0} shipments</p>
                          <p className="text-[11px] text-slate-500 mt-3 font-medium">{t.businessName ? `${t.businessName} · Verified Network` : 'Verified National Carrier'}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 font-mono shadow-2xs">
                          {getTransporterRating(t.shipmentsCount || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {transporters.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-slate-500 italic bg-slate-50 rounded-2xl border border-slate-200">
                      No transporters available. Please verify registered transporters in Admin panel.
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: PRODUCTS, PACKAGING & VOLUMETRIC SPECS */}
              <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">2</span>
                    {isUrdu ? 'مال کی تفصیلات اور پیمائش' : 'Cargo Products, Packaging & Unit Dimensions'}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase font-mono">Packaging:</label>
                      <select
                        value={packagingType}
                        onChange={e => setPackagingType(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-900 text-xs font-semibold outline-none focus:border-orange-500"
                      >
                        {PACKAGING_TYPES.map(pkg => (
                          <option key={pkg} value={pkg}>{pkg}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={addProductRow}
                      className="btn-outline text-xs !py-1.5 !px-3"
                    >
                      <Plus size={14} /> Add Product
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {products.map((prod, idx) => {
                    let l = parseFloat(prod.lengthCm) || 0;
                    let w = parseFloat(prod.widthCm) || 0;
                    let h = parseFloat(prod.heightCm) || 0;
                    if (prod.dimensionUnit === 'meter') {
                      l *= 100; w *= 100; h *= 100;
                    } else if (prod.dimensionUnit === 'feet') {
                      l *= 30.48; w *= 30.48; h *= 30.48;
                    }
                    const vol = calculateVolumetricWeight(l, w, h, prod.qty);
                    const grossItemTons = (parseFloat(prod.qty) || 0) * convertToTons(prod.unitWeight, prod.weightUnit || 'ton');

                    return (
                      <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative space-y-3">
                        {products.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeProductRow(idx)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-red-600 cursor-pointer p-1"
                          >
                            <X size={16} />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={prod.name}
                              onChange={e => handleProductChange(idx, 'name', e.target.value)}
                              className={`w-full bg-white border rounded-xl px-3 py-2 text-slate-900 text-xs outline-none transition-colors ${formErrors[`prod_${idx}_name`] ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300 focus:border-orange-500'
                                }`}
                              placeholder="e.g. Cotton Textiles / Machinery"
                            />
                            {formErrors[`prod_${idx}_name`] && (
                              <p className="text-[10px] text-red-600 mt-1 font-medium">{formErrors[`prod_${idx}_name`]}</p>
                            )}
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={prod.qty}
                              onChange={e => handleProductChange(idx, 'qty', e.target.value)}
                              className={`w-full bg-white border rounded-xl px-3 py-2 text-slate-900 text-xs outline-none font-mono transition-colors ${formErrors[`prod_${idx}_qty`] ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300 focus:border-orange-500'
                                }`}
                              placeholder="e.g. 50"
                            />
                            {formErrors[`prod_${idx}_qty`] && (
                              <p className="text-[10px] text-red-600 mt-1 font-medium">{formErrors[`prod_${idx}_qty`]}</p>
                            )}
                          </div>

                          <div className="md:col-span-3">
                            <UnitInput
                              label="Unit Weight"
                              value={prod.unitWeight}
                              onChange={(val) => handleProductChange(idx, 'unitWeight', val)}
                              selectedUnit={prod.weightUnit || 'ton'}
                              onUnitChange={(unit) => handleProductChange(idx, 'weightUnit', unit)}
                              units={WEIGHT_UNITS}
                              placeholder="Weight"
                              required
                              error={formErrors[`prod_${idx}_wt`]}
                              isUrdu={isUrdu}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gross Item Wt</label>
                            <input
                              disabled
                              type="text"
                              value={`${grossItemTons.toFixed(2)} Tons`}
                              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs font-mono font-bold"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Category</label>
                            <select
                              value={prod.type}
                              onChange={e => handleProductChange(idx, 'type', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:border-orange-500"
                            >
                              {CARGO_CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name} {isUrdu ? `(${cat.urdu})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Volumetric Dimensions Row with Unit Selector */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3 pt-2 border-t border-slate-200 items-end">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Length ({prod.dimensionUnit || 'cm'})
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={prod.lengthCm || ''}
                              onChange={e => handleProductChange(idx, 'lengthCm', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs font-mono outline-none focus:border-orange-500"
                              placeholder="e.g. 120"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Width ({prod.dimensionUnit || 'cm'})
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={prod.widthCm || ''}
                              onChange={e => handleProductChange(idx, 'widthCm', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs font-mono outline-none focus:border-orange-500"
                              placeholder="e.g. 80"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Height ({prod.dimensionUnit || 'cm'})
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={prod.heightCm || ''}
                              onChange={e => handleProductChange(idx, 'heightCm', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs font-mono outline-none focus:border-orange-500"
                              placeholder="e.g. 160"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dimension Unit</label>
                            <select
                              value={prod.dimensionUnit || 'cm'}
                              onChange={e => handleProductChange(idx, 'dimensionUnit', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 text-xs font-semibold outline-none focus:border-orange-500"
                            >
                              {DIMENSION_UNITS.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.label})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Volumetric Wt</label>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5 text-orange-800 text-xs font-mono font-bold">
                              {vol.tons > 0 ? `${vol.tons.toFixed(2)} tons` : '0.00 tons'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chargeable</label>
                            <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-emerald-800 text-xs font-mono font-black">
                              {Math.max(grossItemTons, vol.tons).toFixed(2)} tons
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Weight Totals Bar */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[10px] block">Gross Weight (Converted)</span>
                    <span className="text-slate-900 font-bold text-sm">{grossWeight.toFixed(2)} Metric Tons</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[10px] block">Volumetric Weight (IATA Standard)</span>
                    <span className="text-orange-700 font-bold text-sm">{volumetricWeight.toFixed(2)} Metric Tons</span>
                  </div>
                  <div className="bg-white border border-emerald-500 rounded-xl px-4 py-2 shadow-2xs">
                    <span className="text-emerald-700 font-bold uppercase text-[10px] block">Chargeable Freight Weight</span>
                    <span className="text-emerald-800 font-bold text-base">{chargeableWeight.toFixed(2)} Tons (max of Gross & Volumetric)</span>
                  </div>
                </div>
              </div>

              {/* Step 3: PICKUP DETAILS */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">3</span>
                  {isUrdu ? 'روانگی کا مقام' : 'Pickup Details & Logistics Hub'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Street Address / Factory Yard <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pickupDetails.streetAddress}
                      onChange={e => setPickupDetails({ ...pickupDetails, streetAddress: e.target.value })}
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-900 text-xs outline-none transition-colors ${formErrors.pickupAddress ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
                        }`}
                      placeholder="Street / Industrial Estate / Warehouse No"
                    />
                    {formErrors.pickupAddress && (
                      <p className="text-[10px] text-red-600 mt-1 font-medium">{formErrors.pickupAddress}</p>
                    )}
                  </div>

                  <div>
                    <SearchSelect
                      label="Pickup City / Hub"
                      options={PAKISTAN_CITIES}
                      value={pickupDetails.city}
                      onChange={(val, opt) => {
                        setPickupDetails(prev => ({
                          ...prev,
                          city: val,
                          province: opt?.province || prev.province
                        }));
                        if (formErrors.pickupCity) {
                          setFormErrors(prev => {
                            const copy = { ...prev };
                            delete copy.pickupCity;
                            return copy;
                          });
                        }
                      }}
                      placeholder="Search pickup city..."
                      error={formErrors.pickupCity}
                      required
                      isUrdu={isUrdu}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Province</label>
                    <input
                      type="text"
                      value={pickupDetails.province}
                      onChange={e => setPickupDetails({ ...pickupDetails, province: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      placeholder="e.g. Punjab / Sindh"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Landmark</label>
                    <input
                      type="text"
                      value={pickupDetails.landmark}
                      onChange={e => setPickupDetails({ ...pickupDetails, landmark: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      placeholder="e.g. Near Dry Port Toll Plaza"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Contact Person <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pickupDetails.contactPerson}
                      onChange={e => setPickupDetails({ ...pickupDetails, contactPerson: e.target.value })}
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-900 text-xs outline-none transition-colors ${formErrors.pickupContact ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
                        }`}
                      placeholder="Full name of dispatch manager"
                    />
                    {formErrors.pickupContact && (
                      <p className="text-[10px] text-red-600 mt-1 font-medium">{formErrors.pickupContact}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Contact Mobile (03XX-XXXXXXX) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pickupDetails.contactPhone}
                      onChange={e => setPickupDetails({ ...pickupDetails, contactPhone: formatPhone(e.target.value) })}
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-900 text-xs outline-none font-mono transition-colors ${formErrors.pickupPhone ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
                        }`}
                      placeholder="0300-1234567"
                    />
                    {formErrors.pickupPhone && (
                      <p className="text-[10px] text-red-600 mt-1 font-medium">{formErrors.pickupPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 4: RECIPIENTS / CONSIGNEES */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">4</span>
                    {isUrdu ? 'وصول کنندگان اور منزل' : 'Recipients / Consignee Destinations'}
                  </h3>
                  <button
                    type="button"
                    onClick={addRecipientRow}
                    className="btn-outline text-xs !py-1.5 !px-3"
                  >
                    <Plus size={14} /> Add Recipient
                  </button>
                </div>

                <div className="space-y-6">
                  {recipients.map((recip, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 p-5 rounded-xl relative space-y-4">
                      {recipients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRecipientRow(idx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-600 cursor-pointer p-1"
                        >
                          <X size={16} />
                        </button>
                      )}
                      <h5 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2 select-none flex items-center gap-2">
                        <MapPin className="text-orange-600" size={14} /> Consignee Destination {idx + 1}
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Consignee Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={recip.fullName}
                            onChange={e => handleRecipientChange(idx, 'fullName', e.target.value)}
                            className={`w-full bg-white border rounded-xl px-3 py-2 text-slate-900 text-xs outline-none transition-colors ${formErrors[`recip_${idx}_name`] ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
                              }`}
                            placeholder="Recipient or Company name"
                          />
                          {formErrors[`recip_${idx}_name`] && (
                            <p className="text-[10px] text-red-600 mt-1 font-medium">{formErrors[`recip_${idx}_name`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Mobile Phone (03XX-XXXXXXX) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={recip.phone}
                            onChange={e => handleRecipientChange(idx, 'phone', formatPhone(e.target.value))}
                            className={`w-full bg-white border rounded-xl px-3 py-2 text-slate-900 text-xs outline-none font-mono transition-colors ${formErrors[`recip_${idx}_phone`] ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
                              }`}
                            placeholder="0300-0000000"
                          />
                          {formErrors[`recip_${idx}_phone`] && (
                            <p className="text-[10px] text-red-600 mt-1 font-medium">{formErrors[`recip_${idx}_phone`]}</p>
                          )}
                        </div>

                        <div>
                          <SearchSelect
                            label="Destination City"
                            options={PAKISTAN_CITIES}
                            value={recip.city}
                            onChange={(val, opt) => {
                              const updated = [...recipients];
                              updated[idx].city = val;
                              if (opt?.province) updated[idx].province = opt.province;
                              setRecipients(updated);
                              if (formErrors[`recip_${idx}_city`]) {
                                setFormErrors(prev => {
                                  const copy = { ...prev };
                                  delete copy[`recip_${idx}_city`];
                                  return copy;
                                });
                              }
                            }}
                            placeholder="Select destination..."
                            error={formErrors[`recip_${idx}_city`]}
                            required
                            isUrdu={isUrdu}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Deadline Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={recip.deadline}
                            onChange={e => handleRecipientChange(idx, 'deadline', e.target.value)}
                            className={`w-full bg-white border rounded-xl px-3 py-2 text-slate-900 text-xs outline-none font-mono transition-colors ${formErrors[`recip_${idx}_deadline`] ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
                              }`}
                          />
                          {formErrors[`recip_${idx}_deadline`] && (
                            <p className="text-[10px] text-red-600 mt-1 font-medium">{formErrors[`recip_${idx}_deadline`]}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Delivery Street Address / Warehouse <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={recip.streetAddress}
                            onChange={e => handleRecipientChange(idx, 'streetAddress', e.target.value)}
                            className={`w-full bg-white border rounded-xl px-3 py-2 text-slate-900 text-xs outline-none transition-colors ${formErrors[`recip_${idx}_address`] ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
                              }`}
                            placeholder="Shop / Plot / Warehouse Number and Area"
                          />
                          {formErrors[`recip_${idx}_address`] && (
                            <p className="text-[10px] text-red-600 mt-1 font-medium">{formErrors[`recip_${idx}_address`]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Assigned Products & Packages
                          </label>
                          <input
                            type="text"
                            value={recip.assignedProducts}
                            onChange={e => handleRecipientChange(idx, 'assignedProducts', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                            placeholder="e.g. All Items / 20 Cartons"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 5: SPECIAL HANDLING, TAX ID, RATE TYPE & LIVE TARIFF CALCULATOR */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-6">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">5</span>
                  {isUrdu ? 'خصوصی ہدایات، ٹیکس اور کرایہ کا تخمینہ' : 'Special Handling, NTN & Automated Fare Tariff'}
                </h3>

                {/* Special Handling Badges Checkboxes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Special Cargo Handling Flags
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {SPECIAL_HANDLING_FLAGS.map(flag => {
                      const isChecked = specialHandling.includes(flag.id);
                      return (
                        <div
                          key={flag.id}
                          onClick={() => toggleSpecialHandling(flag.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${isChecked
                              ? 'bg-orange-50/80 border-orange-600 text-orange-900 shadow-xs'
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isChecked ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-900 leading-tight">{flag.label.split('(')[0]}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{flag.label.includes('(') ? `(${flag.label.split('(')[1]}` : ''}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* NTN, Delivery Notes, Payment Terms, Vehicle Type Choice & Rate Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Sender NTN / Tax ID (7-8 digits)
                    </label>
                    <input
                      type="text"
                      value={senderNTN}
                      onChange={e => setSenderNTN(formatNTN(e.target.value))}
                      placeholder="1234567-8"
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-900 text-xs font-mono outline-none transition-colors ${formErrors.senderNTN ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
                        }`}
                    />
                    {formErrors.senderNTN && (
                      <p className="text-[10px] text-red-600 mt-1 font-medium">{formErrors.senderNTN}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={e => setPaymentTerms(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-semibold"
                    >
                      {PAYMENT_TERMS_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Vehicle Type Preference
                    </label>
                    <select
                      value={vehicleTypeChoice}
                      onChange={e => setVehicleTypeChoice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    >
                      {VEHICLE_TYPES.map(vt => (
                        <option key={vt.id} value={vt.id}>
                          {vt.label} ({vt.defaultCapacity}t max)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Rate / Tariff Pricing Model
                    </label>
                    <select
                      value={rateType}
                      onChange={e => setRateType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-semibold"
                    >
                      {RATE_TYPES.map(rt => (
                        <option key={rt.id} value={rt.id}>{rt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Gate / Bay Instructions
                    </label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={e => setDeliveryNotes(e.target.value)}
                      placeholder="e.g. Gate 4, Bay 2"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                </div>

                {/* Dynamic Tariff & Automated Fare Quotation Breakdown Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-sm relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Calculator size={18} className="text-[#F89020]" />
                      <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                        Automated Highway Freight Tariff & Quotation
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                      NHA Distance Matrix: {tariffQuote.distanceKm} km
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[9px] text-slate-400 uppercase block">Base Freight</span>
                      <span className="text-white font-bold text-sm">{tariffQuote.formatted.base}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Rs. 45/Ton-km × {tariffQuote.vehicleMultiplier}x</span>
                    </div>

                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[9px] text-slate-400 uppercase block">Fuel Surcharge (8%)</span>
                      <span className="text-slate-200 font-bold text-sm">{tariffQuote.formatted.fuel}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">National Fuel Index</span>
                    </div>

                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[9px] text-slate-400 uppercase block">Sales Tax (16% PRA/SRB)</span>
                      <span className="text-slate-200 font-bold text-sm">{tariffQuote.formatted.tax}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Provincial Services Tax</span>
                    </div>

                    <div className="bg-orange-950/40 p-3 rounded-xl border border-orange-500/40 flex flex-col justify-between">
                      <span className="text-[10px] text-orange-300 font-bold uppercase tracking-wider">Total Tariff Estimate</span>
                      <span className="text-[#F89020] font-black text-lg">{tariffQuote.formatted.total}</span>
                      <span className="text-[9px] text-emerald-400 font-bold">{paymentTerms.toUpperCase()} &middot; {rateType.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Error Summary if form submitted with errors */}
              {formSubmitted && Object.keys(formErrors).length > 0 && (
                <div ref={errorSummaryRef} className="bg-red-50 border-2 border-red-500 text-red-800 p-4 rounded-2xl flex items-start gap-3 shadow-lg">
                  <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={20} />
                  <div className="text-xs">
                    <h5 className="font-bold text-sm text-red-900 mb-1">
                      {isUrdu ? 'براہ کرم درج ذیل غلطیوں کو درست کریں:' : 'Please correct the highlighted errors before submitting:'}
                    </h5>
                    <ul className="list-disc list-inside space-y-0.5 font-medium text-red-700">
                      {Object.values(formErrors).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Form actions */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 btn-primary text-white font-extrabold py-3.5 rounded-xl text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>{isSubmitting ? 'Submitting...' : (isUrdu ? 'ٹرانسپورٹر کو بھیجیں' : 'Submit to Transporter')}</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleRequestSubmit(e, 'Draft')}
                  className="flex-1 btn-outline text-slate-700 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FileText size={16} /> Save as Draft
                </button>
              </div>

            </form>
          )}

          {/* TRACK SHIPMENTS TAB */}
          {activeTab === 'track' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-600 tracking-wider uppercase text-left font-sans">
                  {cargoList.filter(c => c.status !== 'Completed').length} active shipments in network
                </h3>
                <UrduMotto />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[450px]">
                {/* Left active cargo list */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 overflow-y-auto max-h-[500px] space-y-3 shadow-sm">
                  {cargoList
                    .filter(c => c.status !== 'Completed')
                    .map(c => {
                      const isDraft = c.status === 'Draft';
                      const isSelected = selectedCargo?._id === c._id;
                      return (
                        <div
                          key={c._id}
                          onClick={() => setSelectedCargo(c)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden ${isSelected
                              ? 'bg-orange-50/50 border-2 border-orange-600 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                        >
                          {isSelected && (
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#F89020]" />
                          )}
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1 pr-1">
                              <h4 className="font-mono text-xs text-orange-700 font-bold">
                                {c.assignedTruck && c.status !== 'Pending' ? `BLT-${c.id}` : `SHP-${c.id}`}
                              </h4>
                              <h4 className="font-bold text-slate-900 text-sm mt-0.5 truncate" title={c.title}>{c.title}</h4>
                              <p className="text-xs text-slate-600 mt-1 font-mono truncate">{c.transporterName} &middot; {formatWeightTons(c.weight)}</p>
                              {c.specialHandling && Array.isArray(c.specialHandling) && c.specialHandling.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {c.specialHandling.map((sh, idx) => (
                                    <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                                      {sh.replace('_', ' ')}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeStyle(c.status)}`}>
                              {c.status}
                            </span>
                          </div>
                          {isDraft && (
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                              <span className="text-[10px] text-slate-500 font-bold uppercase select-none font-mono">Draft Mode</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDraft(c._id);
                                }}
                                className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                              >
                                Delete Draft
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {cargoList.filter(c => c.status !== 'Completed').length === 0 && (
                    <div className="text-center py-16 text-slate-500 text-sm">
                      <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-60" />
                      No active shipments in transit.
                    </div>
                  )}
                </div>

                {/* Right shipment progress pane */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between text-left shadow-xs relative overflow-hidden">
                  <SindhiTruckTexture />
                  {selectedCargo ? (
                    <div className="space-y-6 flex-1 flex flex-col justify-between relative z-10">
                      <div>
                        <div className="flex justify-between items-start border-b border-slate-200 pb-4 gap-2">
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-2 mb-1">
                              <TruckTaj className="text-orange-600 w-5 h-4" />
                              <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">
                                {isUrdu ? 'لائیو ٹیلی میٹری ٹریکنگ' : 'Live Telemetry Track'}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 break-words">{selectedCargo.title}</h3>
                            <p className="text-xs text-slate-600 mt-1">
                              {isUrdu ? 'منزل:' : 'Destination Hub:'} <span className="text-slate-900 font-bold">{selectedCargo.destination}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono font-bold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 whitespace-nowrap">
                              {selectedCargo.assignedTruck && selectedCargo.status !== 'Pending' ? `BLT-${selectedCargo.id}` : `SHP-${selectedCargo.id}`}
                            </span>
                            {selectedCargo.assignedTruck && selectedCargo.status !== 'Pending' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const matched = findAssociatedBooking(selectedCargo, false) || {
                                    cargoId: selectedCargo.id,
                                    cargoTitle: selectedCargo.title,
                                    truckPlate: selectedCargo.assignedTruck,
                                    transporterName: selectedCargo.transporterName,
                                    price: selectedCargo.totalFare ? selectedCargo.totalFare.toLocaleString() : 'Agreed Rate',
                                    cargo: selectedCargo
                                  };
                                  setBiltyModalBooking(matched);
                                }}
                                className="btn-primary text-xs !py-1.5 !px-3 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all whitespace-nowrap"
                              >
                                <FileText size={13} />
                                <span>{isUrdu ? 'بلٹی دیکھیں' : 'View e-Bilty'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive MapViewer Displaying Assigned Truck Live Location, Route Polyline & Driver Telemetry */}
                        {(() => {
                          const assignedTruckObj = trucks.find(t =>
                            selectedCargo.assignedTruck && (t.plateNumber === selectedCargo.assignedTruck || String(t.id) === String(selectedCargo.assignedTruck))
                          );
                          const associatedBkg = bookings.find(b => Number(b.cargoId) === Number(selectedCargo.id || selectedCargo._id) && b.status !== 'Completed');

                          const routeData = {
                            origin: selectedCargo.origin,
                            destination: selectedCargo.destination.split(',')[0],
                            truckCoords: assignedTruckObj ? [assignedTruckObj.lat, assignedTruckObj.lng] : null,
                            truckPlate: selectedCargo.assignedTruck,
                            driverName: assignedTruckObj?.driverName,
                            driverMobile: assignedTruckObj?.driverMobile,
                            eta: associatedBkg?.eta
                          };

                          return (
                            <div className="mt-4 mb-2">
                              <MapViewer
                                route={routeData}
                                title={selectedCargo.assignedTruck ? `TRUCK ${selectedCargo.assignedTruck} LIVE GPS` : 'CARGO ROUTE TELEMETRY'}
                                color={selectedCargo.status === 'In Transit' ? 'neon-blue' : 'rose'}
                                height="280px"
                              />
                            </div>
                          );
                        })()}

                        {/* Details specifications */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-5 sm:mt-6 text-xs text-slate-700">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transporter</p>
                            <p className="font-semibold text-slate-900 mt-0.5">{selectedCargo.transporterName}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Weight</p>
                            <p className="font-semibold text-slate-900 mt-0.5 font-mono">{formatWeightTons(selectedCargo.weight)}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Route</p>
                            <p className="font-semibold text-slate-900 mt-0.5">
                              {selectedCargo.origin} &rarr; {selectedCargo.destination.split(',')[0]}
                            </p>
                          </div>
                          {selectedCargo.assignedTruck && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assigned Truck</p>
                              <p className="font-semibold text-orange-700 font-mono mt-0.5">{selectedCargo.assignedTruck}</p>
                            </div>
                          )}
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Packaging</p>
                            <p className="font-semibold text-slate-900 mt-0.5">{selectedCargo.packagingType || 'Cartons / Boxes'}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billing Terms</p>
                            <p className="font-semibold text-emerald-800 mt-0.5">{selectedCargo.paymentTerms || 'Prepaid'}</p>
                          </div>
                          {/* If booking counter price or ETA exists, show it */}
                          {(() => {
                            const associatedBkg = bookings.find(b => Number(b.cargoId) === Number(selectedCargo.id || selectedCargo._id) && b.status !== 'Completed');
                            return associatedBkg ? (
                              <>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agreed Price</p>
                                  <p className="font-semibold text-emerald-700 mt-0.5 font-mono">{formatFreightPrice(associatedBkg.price)}</p>
                                </div>
                                {associatedBkg.eta && (
                                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ETA</p>
                                    <p className="font-semibold text-slate-800 mt-0.5 font-mono">{associatedBkg.eta}</p>
                                  </div>
                                )}
                              </>
                            ) : null;
                          })()}
                          {selectedCargo.specialHandling && Array.isArray(selectedCargo.specialHandling) && selectedCargo.specialHandling.length > 0 && (
                            <div className="col-span-2 md:col-span-3 bg-amber-50 p-3 rounded-xl border border-amber-200">
                              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5">Special Handling Directives</p>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedCargo.specialHandling.map((h, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
                                    ⚠ {h.replace('_', ' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Transit Progression Line */}
                        {selectedCargo.status !== 'Draft' && (
                          <div className="mt-8 bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-2xs">
                            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-5">Transit Progression</h4>
                            <div className="flex justify-between items-center relative pl-4 pr-4">
                              {/* Connector line */}
                              <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-slate-200 -z-1"></div>

                              {[
                                { label: 'Pending', step: 'Pending' },
                                { label: 'Assigned', step: 'Truck Assigned' },
                                { label: 'Transit', step: 'In Transit' },
                                { label: 'Delivered', step: 'Delivered' }
                              ].map((s, index) => {
                                const steps = ['Pending', 'Accepted', 'Truck Assigned', 'Loaded', 'In Transit', 'Delivered', 'Completed'];
                                const currentIdx = steps.indexOf(selectedCargo.status);
                                const stepIdx = steps.indexOf(s.step);
                                const isCompleted = currentIdx >= stepIdx;

                                return (
                                  <div key={index} className="flex flex-col items-center gap-2 z-10">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${isCompleted
                                        ? 'bg-orange-600 text-white shadow-2xs'
                                        : 'bg-white border-2 border-slate-300 text-slate-400'
                                      }`}>
                                      {isCompleted ? <Check size={13} strokeWidth={3} /> : index + 1}
                                    </div>
                                    <span className={`text-[10px] font-bold ${isCompleted ? 'text-orange-700' : 'text-slate-500'}`}>{s.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Pickup & Consignees details */}
                        <div className="mt-6 border-t border-slate-200 pt-4 space-y-4">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pickup Address</h4>
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-700">
                            <p><span className="text-slate-500 font-medium">Point:</span> {selectedCargo.pickupDetails?.address || selectedCargo.pickupDetails?.streetAddress || 'Corporate depot'}</p>
                            <p className="mt-1"><span className="text-slate-500 font-medium">Contact:</span> {selectedCargo.pickupDetails?.contactName || selectedCargo.pickupDetails?.contact || '-'} ({selectedCargo.pickupDetails?.phone || selectedCargo.pickupDetails?.contactPhone || '-'})</p>
                          </div>
                        </div>
                      </div>

                      {/* Rejection Notification if rejected */}
                      {selectedCargo.status === 'Rejected' && selectedCargo.rejectionReason && (
                        <div className="mt-6 border-t border-slate-200 pt-4">
                          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex gap-3 text-xs leading-relaxed">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Shipment Request Rejected</p>
                              <p className="text-slate-700 mt-1">Reason: "{selectedCargo.rejectionReason}"</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-16 relative z-10">
                      <Package size={36} className="text-slate-400" />
                      <p className="text-sm font-medium font-sans">Select a shipment to track progress</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TRANSPORTERS DIRECTORY TAB */}
          {activeTab === 'transporters' && (
            <div className="space-y-6 text-left">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  {transporters.length} verified transporters available
                </h3>
                <UrduMotto />
              </div>

              <div className="space-y-4">
                {transporters.map(t => (
                  <div key={t._id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden">
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <Users size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-lg font-bold text-slate-900 tracking-wide">{t.name}</h4>
                          <span className="text-xs text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono shadow-2xs">
                            {getTransporterRating(t.shipmentsCount || 0)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5 font-mono">
                          {t.phone || '0300-1112223'} &middot; <span className="text-orange-700 font-sans font-semibold">{t.email}</span>
                        </p>

                        <div className="flex flex-wrap gap-1.5 mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Lahore</span>
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Karachi</span>
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Islamabad</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 self-end md:self-center relative z-10">
                      <span className="text-sm text-slate-600 font-bold mr-2 font-mono">
                        {t.shipmentsCount || 0} shipments
                      </span>
                      <button
                        onClick={() => {
                          setSelectedTransporter(t);
                          setActiveTab('new-request');
                        }}
                        className="btn-primary px-4 py-2 text-xs shadow-sm transition-all"
                      >
                        Send Request
                      </button>
                    </div>
                  </div>
                ))}
                {transporters.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 shadow-sm">
                    No verified transporters listed.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left shadow-xs relative overflow-hidden">
                <SindhiTruckTexture />
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase">Delivery History</h3>
                  <span className="text-xs font-mono font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                    Total Completed: {cargoList.filter(c => c.status === 'Completed').length}
                  </span>
                </div>

                <div className="overflow-x-auto touch-scroll relative z-10">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                        <th className="py-3 px-3">Shipment ID</th>
                        <th className="py-3 px-3">Bilty No.</th>
                        <th className="py-3 px-3">Transporter</th>
                        <th className="py-3 px-3">Route</th>
                        <th className="py-3 px-3">Weight</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargoList
                        .filter(c => c.status === 'Completed')
                        .map((c, idx) => (
                          <tr key={c._id || idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-3 font-mono text-slate-600">SHP-{c.id || 10400 + idx}</td>
                            <td className="py-4 px-3">
                              <button
                                onClick={() => handleBiltyClick(c)}
                                className="font-mono font-bold text-orange-700 hover:underline cursor-pointer"
                              >
                                BLT-{c.id || 88000 + idx}
                              </button>
                            </td>
                            <td className="py-4 px-3 font-bold text-slate-900">{c.transporterName || 'Unassigned'}</td>
                            <td className="py-4 px-3 text-slate-700">
                              {c.origin} &rarr; {c.destination.split(',')[0]}
                            </td>
                            <td className="py-4 px-3 text-slate-700 font-mono">{formatWeightTons(c.weight)}</td>
                            <td className="py-4 px-3 text-slate-600 font-mono text-xs">
                              {c.createdAt ? c.createdAt.split('T')[0] : '—'}
                            </td>
                            <td className="py-4 px-3">
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                                DELIVERED
                              </span>
                            </td>
                          </tr>
                        ))}
                      {cargoList.filter(c => c.status === 'Completed').length === 0 && (
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
      )}

      {/* Official Bilty Preview & Print Modal */}
      <BiltyModal
        booking={biltyModalBooking}
        onClose={() => setBiltyModalBooking(null)}
      />

    </div>
  );
}
