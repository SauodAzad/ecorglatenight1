import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import {
  Users, FileText, Activity, AlertTriangle, Check, X, Shield,
  Package, Trash2, CheckCircle, Loader2, ArrowRight, Truck,
  Mail, Phone, Clock, Eye, AlertCircle, FileCheck, Ban, Unlock,
  MessageSquare, QrCode, Send, Search, Radio
} from 'lucide-react';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { adminAPI, logisticsAPI, socket, resolveAssetUrl } from '../../api';

import { generateBiltyPDF } from '../../utils/generateBiltyPDF';
import BiltyModal from '../../components/BiltyModal';
import { ChamakRibbon, TruckTaj, UrduMotto, WorkshopBadge, TruckPoetryBanner, SindhiTruckTexture, TruckPatternBorder, TruckLotusArchBadge, TruckMorBadge, NazarBattuBadge } from '../../components/TruckArt';
import MapViewer from '../../components/MapViewer';
import { formatPhone } from '../../utils/validation';
import { formatWeightTons } from '../../utils/fareCalculator';

export default function AdminDashboard() {
  const { userData } = useAuth();
  const { isUrdu } = useLanguage();
  const { toast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [biltyModalBooking, setBiltyModalBooking] = useState(null);
  const [allShipments, setAllShipments] = useState([]);
  const [allTrucks, setAllTrucks] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({
    users: 0,
    pendingUsers: 0,
    trucks: 0,
    activeTrucks: 0,
    utilizationRate: 0,
    activeShipments: 0,
    totalBilties: 0,
    complaints: 0,
    roleBreakdown: { business: 0, transporter: 0, truck_owner: 0 },
    monthlyStats: []
  });
  const [loading, setLoading] = useState(true);

  // Selection state for Pending Approvals dual-view
  const [selectedPendingUser, setSelectedPendingUser] = useState(null);

  // User & Shipment search/filter states
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [shipmentSearchQuery, setShipmentSearchQuery] = useState('');

  // Rejection reason state
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // User detail modal (Users tab)
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingUserTrucks, setViewingUserTrucks] = useState([]);
  const [loadingUserTrucks, setLoadingUserTrucks] = useState(false);

  // WhatsApp Gateway State
  const [whatsappStatus, setWhatsappStatus] = useState({ status: 'disconnected', isReady: false, hasQr: false, qr: null });
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappQrDataUrl, setWhatsappQrDataUrl] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const onUiBack = (e) => {
      if (biltyModalBooking) {
        setBiltyModalBooking(null);
        e.preventDefault();
        return;
      }
      if (whatsappModalOpen) {
        setWhatsappModalOpen(false);
        setTestResult(null);
        e.preventDefault();
        return;
      }
      if (viewingUser) {
        setViewingUser(null);
        e.preventDefault();
        return;
      }
      if (activeTab !== 'overview') {
        setActiveTab('overview');
        e.preventDefault();
      }
    };
    window.addEventListener('ecargo:ui-back', onUiBack);
    return () => window.removeEventListener('ecargo:ui-back', onUiBack);
  }, [biltyModalBooking, whatsappModalOpen, viewingUser, activeTab]);


  const fetchData = async () => {
    try {
      const [statsRes, usersRes, shipmentsRes, complaintsRes, activityRes, trucksRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getShipments(),
        logisticsAPI.getComplaints(),
        adminAPI.getActivity(),
        logisticsAPI.getTrucks({})
      ]);

      setStats(statsRes.data);
      setAllUsers(usersRes.data);

      const realPending = usersRes.data.filter(u => u.status === 'pending' || u.status === 'pending_verification');
      setPendingUsers(realPending);

      setAllShipments(shipmentsRes.data);
      setComplaints(complaintsRes.data);
      setActivityLogs(activityRes.data);
      setAllTrucks(trucksRes?.data || []);
      setLoading(false);
    } catch (e) {
      console.error("Error fetching admin data:", e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Fetch initial WhatsApp gateway status
    adminAPI.getWhatsAppStatus().then(res => {
      setWhatsappStatus(res.data);
      if (res.data.qr) {
        QRCode.toDataURL(res.data.qr, { margin: 1, width: 260 }).then(setWhatsappQrDataUrl).catch(() => { });
      }
    }).catch(() => { });

    socket.on('booking_updated', fetchData);
    socket.on('notification', fetchData);

    socket.on('whatsapp_qr', (data) => {
      setWhatsappStatus(prev => ({ ...prev, status: 'qr_ready', qr: data.qr, hasQr: true }));
      if (data.qr) {
        QRCode.toDataURL(data.qr, { margin: 1, width: 260 }).then(setWhatsappQrDataUrl).catch(() => { });
      }
    });

    socket.on('whatsapp_status', (data) => {
      setWhatsappStatus(prev => ({ ...prev, status: data.status, isReady: data.status === 'ready' }));
      if (data.status === 'ready') {
        setWhatsappQrDataUrl('');
      }
    });

    return () => {
      socket.off('booking_updated');
      socket.off('notification');
      socket.off('whatsapp_qr');
      socket.off('whatsapp_status');
    };
  }, []);


  useEffect(() => {
    if (!viewingUser && !whatsappModalOpen && !showRejectForm) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setViewingUser(null);
        setWhatsappModalOpen(false);
        setShowRejectForm(false);
        setTestResult(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewingUser, whatsappModalOpen, showRejectForm]);

  const handleVerification = async (userId, newStatus) => {
    try {
      await adminAPI.updateUserStatus(userId, newStatus, newStatus === 'rejected' ? rejectionReason : undefined);
      setShowRejectForm(false);
      setRejectionReason('');
      setSelectedPendingUser(null);
      toast.success(newStatus === 'active' ? 'Account verified and activated!' : 'Application rejected.');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update verification status.');
    }
  };

  const handleUserStatusUpdate = async (userId, newStatus, userName = '') => {
    if (newStatus === 'blocked') {
      const ok = await confirm({
        title: 'Suspend User Account',
        message: `Are you sure you want to block ${userName || 'this account'}? They will no longer be able to dispatch or book cargo until unblocked.`,
        confirmLabel: 'Suspend Account',
        tone: 'danger'
      });
      if (!ok) return false;
    }
    try {
      await adminAPI.updateUserStatus(userId, newStatus);
      toast.success(newStatus === 'blocked' ? 'User account suspended.' : 'User account activated.');
      fetchData();
      return true;
    } catch (e) {
      console.error(e);
      toast.error('Failed to update account status.');
      return false;
    }
  };

  const handleResolveComplaint = async (id) => {
    try {
      await logisticsAPI.updateComplaint(id, { status: 'Resolved' });
      toast.success('Dispute marked as Resolved.');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to resolve dispute.');
    }
  };

  const openUserDetail = async (user) => {
    setViewingUser(user);
    setViewingUserTrucks([]);
    if (user.role === 'truck_owner') {
      setLoadingUserTrucks(true);
      try {
        const res = await logisticsAPI.getTrucks({ ownerId: user.id || user._id });
        setViewingUserTrucks(res.data);
      } catch (e) {
        console.error('Error fetching trucks:', e);
      } finally {
        setLoadingUserTrucks(false);
      }
    }
  };

  const handleBiltyClick = (shipment) => {
    const biltyData = {
      id: shipment.id || shipment._id,
      _id: shipment._id || shipment.id,
      cargoId: shipment.id || shipment._id,
      cargoTitle: shipment.title || 'General Cargo',
      transporterName: shipment.transporterName || 'Unassigned',
      businessOwnerName: shipment.businessOwnerName || 'Authorized Shipper',
      truckPlate: shipment.truckPlate || shipment.assignedTruck || 'Unassigned',
      price: shipment.price || (shipment.totalFare ? String(Math.round(shipment.totalFare)) : null),
      completedAt: shipment.completedAt || shipment.createdAt,
      origin: shipment.origin,
      destination: shipment.destination,
      weight: shipment.weight,
      chargeableWeight: shipment.chargeableWeight || shipment.weight,
      packagingType: shipment.packagingType || 'Cartons / Boxes',
      paymentTerms: shipment.paymentTerms || 'Prepaid',
      specialHandling: shipment.specialHandling || [],
      senderNTN: shipment.senderNTN,
      deliveryNotes: shipment.deliveryNotes,
      receiverSignature: shipment.receiverSignature || null
    };
    setBiltyModalBooking(biltyData);
  };

  const getRoleStyle = (role) => {
    switch (role) {
      case 'business':
        return 'text-emerald-700 font-semibold';
      case 'transporter':
        return 'text-orange-700 font-semibold';
      case 'truck_owner':
        return 'text-amber-800 font-semibold';
      default:
        return 'text-slate-600';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status?.toUpperCase()) {
      case 'IN TRANSIT':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'ACCEPTED':
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'LOADED':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'TRUCK ASSIGNED':
      case 'AT DEPOT':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'PENDING':
      case 'PENDING_VERIFICATION':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'VERIFIED':
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'SUSPENDED':
      case 'BLOCKED':
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'approvals', name: 'Pending Approvals', badge: pendingUsers.length },
    { id: 'users', name: 'Users' },
    { id: 'shipments', name: 'Shipments' },
    { id: 'disputes', name: 'Disputes' },
    { id: 'activity', name: 'Activity Log' },
    { id: 'notifications', name: 'Notifications' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        <p className="text-sm text-slate-500 font-semibold tracking-wider font-mono">LOADING ADMIN CONTROL CENTER...</p>
      </div>
    );
  }

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
            {isUrdu && (
              <span className="text-[11px] font-bold uppercase tracking-widest text-orange-300 bg-orange-500/15 px-2.5 py-0.5 rounded-full border border-orange-400/35 font-urdu">شاہراہِ پاکستان</span>
            )}
            <NazarBattuBadge />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
            <span>{isUrdu ? 'نگرانِ اعلیٰ کنٹرول سینٹر' : 'Admin Control Center'}</span>
            {isUrdu && <span className="font-urdu text-xl text-orange-400 font-bold">نگرانِ اعلیٰ</span>}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
            {isUrdu ? 'پلیٹ فارم کی تصدیق، صارفین، لاجسٹکس ریکارڈز اور شکایات کا جائزہ لیں۔' : 'Manage platform verifications, user directories, logistics records, and disputes.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* WhatsApp Gateway Quick Badge */}
          <button
            onClick={() => setWhatsappModalOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all border cursor-pointer ${whatsappStatus.isReady
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35 hover:bg-emerald-500/25'
                : whatsappStatus.hasQr
                  ? 'bg-amber-500/15 text-amber-300 border-amber-400/35 hover:bg-amber-500/25 animate-pulse'
                  : 'bg-white/[0.06] text-slate-200 border-white/15 hover:bg-white/12'
              }`}
            title="Click to view WhatsApp Gateway status or scan QR code"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${whatsappStatus.isReady ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : whatsappStatus.hasQr ? 'bg-amber-400' : 'bg-slate-400'
              }`} />
            <MessageSquare size={14} className={whatsappStatus.isReady ? 'text-emerald-300' : 'text-amber-300'} />
            <span>{whatsappStatus.isReady ? 'WhatsApp: Connected' : whatsappStatus.hasQr ? 'WhatsApp: Scan QR' : 'WhatsApp: Offline'}</span>
          </button>

          <div className="flex items-center gap-2 bg-[#0F1930]/92 border border-white/15 px-3.5 py-2 rounded-xl text-xs text-slate-200 font-mono shadow-sm">
            <Clock size={14} className="text-orange-400" />
            <span>Session: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Obsidian Segmented Dock) */}
      <div className="mb-6 sm:mb-8 relative z-10 overflow-x-auto touch-scroll no-scrollbar">
        <nav className="inline-flex min-w-full sm:min-w-0 items-center gap-1.5 p-1.5 rounded-2xl bg-[#0B1325]/96 border border-white/15 shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedPendingUser(null);
                setShowRejectForm(false);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white shadow-[0_6px_18px_-4px_rgba(249,115,22,0.55)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
            >
              {tab.name}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  activeTab === tab.id ? 'bg-white/25 text-white border border-white/30' : 'bg-orange-600 text-white shadow-sm'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">

        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Metric KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Active Shipments */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-left relative z-10">
                  <p className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Active Shipments</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">{stats.activeShipments ?? 0}</p>
                  <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" /> {allShipments.filter(s => s.status === 'In Transit').length} in transit
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center relative z-10 shadow-2xs">
                  <Package size={22} />
                </div>
              </div>

              {/* Total Bilties */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-left relative z-10">
                  <p className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Total Bilties Generated</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">{(stats.totalBilties || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">All time platform bilties</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center relative z-10 shadow-2xs">
                  <FileText size={22} />
                </div>
              </div>

              {/* Registered Users */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-left relative z-10">
                  <p className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Registered Users</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">{stats.users ?? 0}</p>
                  <p className="text-xs text-amber-700 font-semibold mt-1">
                    {pendingUsers.length} pending approval
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center relative z-10 shadow-2xs">
                  <Users size={22} />
                </div>
              </div>

              {/* Truck Utilization */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-left relative z-10">
                  <p className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">Truck Utilization</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">{stats.utilizationRate ?? 0}%</p>
                  <p className="text-xs text-slate-600 font-semibold mt-1 font-mono">
                    {stats.activeTrucks ?? 0} of {stats.trucks ?? 0} active
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center relative z-10 shadow-2xs">
                  <Truck size={22} />
                </div>
              </div>
            </div>

            {/* National Fleet Overview Map */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden text-left">
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Radio className="text-orange-600" size={16} />
                    <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase font-mono">
                      {isUrdu ? 'ملک گیر لائیو فلیٹ راڈار اور ٹریفک ٹیلی میٹری' : 'Nationwide Fleet Radar & Logistics Telemetry'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs" />
                      {allTrucks.filter(t => t.status === 'Available').length} Available
                    </span>
                    <span className="flex items-center gap-1.5 text-orange-700 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F89020] inline-block shadow-2xs" />
                      {allTrucks.filter(t => t.status === 'In Transit').length} In Transit
                    </span>
                    <span className="text-slate-500 font-bold">
                      Total: {allTrucks.length} Units
                    </span>
                  </div>
                </div>
                <MapViewer trucks={allTrucks} height="400px" title="NATIONWIDE FLEET RADAR & ACTIVE SHIPMENTS" />
              </div>
            </div>

            {/* Graphics Grid (Breakdown & Chart) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left breakdown bar */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase text-left">User Breakdown by Role</h3>
                    <span className="text-[10px] font-mono text-slate-500">Live Registry</span>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-700 font-medium">Business Owners</span>
                        <span className="font-mono font-bold text-emerald-700">{stats.roleBreakdown?.business ?? 0}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((stats.roleBreakdown?.business ?? 0) / Math.max(1, stats.users || 0)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-700 font-medium">Cargo Transporters</span>
                        <span className="font-mono font-bold text-orange-700">{stats.roleBreakdown?.transporter ?? 0}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="bg-[#F89020] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((stats.roleBreakdown?.transporter ?? 0) / Math.max(1, stats.users || 0)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-700 font-medium">Truck Owners</span>
                        <span className="font-mono font-bold text-slate-700">{stats.roleBreakdown?.truck_owner ?? 0}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="bg-slate-700 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((stats.roleBreakdown?.truck_owner ?? 0) / Math.max(1, stats.users || 0)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600 relative z-10">
                  <span>Total Users: <strong className="text-slate-900 font-mono">{stats.users ?? 0}</strong></span>
                  <span className="text-emerald-700 font-semibold font-mono">100% Synced</span>
                </div>
              </div>

              {/* Right shipments bar chart */}
              {(() => {
                const chartMax = Math.max(10, ...(stats.monthlyStats || []).flatMap(m => [m.shipments || 0, m.bilties || 0]));
                return (
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase text-left">Shipments &amp; Bilties</h3>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-orange-600" />
                            <span className="text-slate-600">Shipments</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" />
                            <span className="text-slate-600">Bilties</span>
                          </div>
                        </div>
                      </div>

                      <div className="relative h-48 flex items-end justify-between pt-6 px-4">
                        {/* Y Axis Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 pb-8 pt-6 font-mono">
                          <div className="border-b border-slate-200/80 w-full flex justify-between"><span>{chartMax}</span></div>
                          <div className="border-b border-slate-200/80 w-full flex justify-between"><span>{Math.round(chartMax * 0.5)}</span></div>
                          <div className="border-b border-slate-200/80 w-full flex justify-between"><span>{Math.round(chartMax * 0.25)}</span></div>
                          <div className="border-b border-slate-200/80 w-full flex justify-between"><span>0</span></div>
                        </div>

                        {/* Column bars */}
                        <div className="w-full h-full flex justify-between items-end z-10 pl-6 text-left">
                          {stats.monthlyStats?.map((m, idx) => {
                            const shipHeight = `${Math.min(100, ((m.shipments || 0) / chartMax) * 100)}%`;
                            const biltyHeight = `${Math.min(100, ((m.bilties || 0) / chartMax) * 100)}%`;
                            return (
                              <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                                <div className="flex items-end justify-center gap-1.5 h-36 w-full">
                                  {/* Shipments Bar */}
                                  <div
                                    className="w-3.5 bg-orange-600 rounded-t-xs group relative cursor-pointer hover:bg-orange-700 transition-all shadow-2xs"
                                    style={{ height: shipHeight }}
                                  >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-xl pointer-events-none">
                                      {m.shipments} Shipments
                                    </div>
                                  </div>

                                  {/* Bilties Bar */}
                                  <div
                                    className="w-3.5 bg-slate-400 rounded-t-xs group relative cursor-pointer hover:bg-slate-500 transition-all shadow-2xs"
                                    style={{ height: biltyHeight }}
                                  >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-xl pointer-events-none">
                                      {m.bilties} Bilties
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[11px] text-slate-600 font-semibold font-mono">{m.month}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Bottom Recent Shipments table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase">Recent Shipments</h3>
                    <span className="text-[10px] font-mono text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">Live Stream</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('shipments')}
                    className="text-xs text-orange-700 hover:text-orange-900 font-bold tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    View All <ArrowRight size={14} />
                  </button>
                </div>

                <div className="overflow-x-auto touch-scroll">
                  <table className="w-full min-w-[580px] text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                        <th className="py-3 px-3">Bilty ID</th>
                        <th className="py-3 px-3">Route</th>
                        <th className="py-3 px-3">Transporter</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allShipments.slice(0, 4).map((s, idx) => (
                        <tr key={s.id || idx} className="border-b border-slate-100 text-sm hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-3">
                            <button
                              onClick={() => handleBiltyClick(s)}
                              className="font-mono font-bold text-orange-700 hover:text-orange-800 hover:underline cursor-pointer"
                            >
                              {s.biltyNo && s.biltyNo !== '-' ? s.biltyNo : `SHP-${s.id}`}
                            </button>
                          </td>
                          <td className="py-4 px-3 font-medium text-slate-900">{s.origin} &rarr; {s.destination}</td>
                          <td className="py-4 px-3 text-slate-700">{s.transporterName || 'Unassigned'}</td>
                          <td className="py-4 px-3">
                            <span className={`shrink-0 whitespace-nowrap inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeStyle(s.status)}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-slate-600 font-mono text-xs">{s.createdAt ? s.createdAt.split('T')[0] : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PENDING APPROVALS PANEL */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase text-left font-sans">
                {pendingUsers.length} pending verification
              </h3>
              <UrduMotto text="سفرِ خیر" translation="Safe Journey" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[450px]">
              {/* Left side list of users */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 overflow-y-auto max-h-[500px] space-y-3 shadow-sm">
                {pendingUsers.map(u => (
                  <div
                    key={u._id || u.id}
                    onClick={() => {
                      setSelectedPendingUser(u);
                      setShowRejectForm(false);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden ${(selectedPendingUser?._id === u._id || selectedPendingUser?.id === u.id)
                        ? 'bg-orange-50/60 border-2 border-orange-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                  >
                    {(selectedPendingUser?._id === u._id || selectedPendingUser?.id === u.id) && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#F89020]" />
                    )}
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1 pr-1">
                        <h4 className="font-bold text-slate-900 text-base truncate" title={u.name}>{u.name}</h4>
                        <p className={`text-xs font-semibold mt-0.5 capitalize ${getRoleStyle(u.role)}`}>
                          {u.role.replace('_', ' ')}
                        </p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-[10px] font-bold tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase font-mono">
                        PENDING
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-4 text-[11px] text-slate-500 font-mono">
                      <span>ID: USR-{u.id || (u._id ? String(u._id).slice(0, 4) : '')}</span>
                      <span>{u.joinedDate || u.createdAt?.split?.('T')[0] || '—'}</span>
                    </div>
                  </div>
                ))}
                {pendingUsers.length === 0 && (
                  <div className="text-center py-16 text-slate-500 text-sm">
                    <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-60" />
                    No pending registrations found. All users verified!
                  </div>
                )}
              </div>

              {/* Right side detail review pane */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                {selectedPendingUser ? (
                  <div className="space-y-6 flex-1 flex flex-col justify-between relative z-10">
                    <div>
                      <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                        <div className="text-left">
                          <h3 className="text-xl font-bold text-slate-900">{selectedPendingUser.name}</h3>
                          <p className={`text-sm font-semibold capitalize ${getRoleStyle(selectedPendingUser.role)}`}>
                            {selectedPendingUser.role.replace('_', ' ')}
                          </p>
                        </div>
                        <span className="text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono font-bold">
                          USR-{selectedPendingUser.id || (selectedPendingUser._id ? String(selectedPendingUser._id).slice(0, 4) : '')}
                        </span>
                      </div>

                      {/* Profile details grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <Mail size={16} className="text-orange-600 shrink-0" />
                          <div className="text-left overflow-hidden">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Email Address</p>
                            <p className="text-sm font-medium text-slate-900 truncate">{selectedPendingUser.email}</p>
                          </div>
                        </div>

                        <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <Phone size={16} className="text-orange-600 shrink-0" />
                          <div className="text-left overflow-hidden">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Phone Number</p>
                            <p className="text-sm font-medium text-slate-900 font-mono truncate">{selectedPendingUser.phone || 'Not Specified'}</p>
                          </div>
                        </div>

                        <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <Shield size={16} className="text-orange-600 shrink-0" />
                          <div className="text-left overflow-hidden">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">CNIC / Registration ID</p>
                            <p className="text-sm font-medium text-slate-900 font-mono truncate">{selectedPendingUser.cnic || 'Not Specified'}</p>
                          </div>
                        </div>

                        {selectedPendingUser.businessName && (
                          <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <Package size={16} className="text-orange-600 shrink-0" />
                            <div className="text-left overflow-hidden">
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Business Name</p>
                              <p className="text-sm font-medium text-slate-900 truncate">{selectedPendingUser.businessName}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Documents previews */}
                      <div className="mt-8 space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase text-left">Uploaded Documents</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          {selectedPendingUser.documents && selectedPendingUser.documents.length > 0 ? (
                            selectedPendingUser.documents.map((doc, idx) => (
                              <a
                                key={idx}
                                href={resolveAssetUrl(doc)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block relative border border-slate-200 hover:border-orange-400 rounded-xl overflow-hidden bg-slate-50 p-4 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-200 group-hover:scale-105 transition-transform">
                                    <FileText size={18} />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-xs font-bold text-slate-900">Attachment {idx + 1}</p>
                                    <p className="text-[9px] text-orange-600 font-semibold group-hover:underline">Click to view doc ↗</p>
                                  </div>
                                </div>
                              </a>
                            ))
                          ) : (
                            <div className="col-span-full text-left text-xs text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-200">
                              No attachments found for this user.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Form for Rejection Reason */}
                    {showRejectForm ? (
                      <div className="mt-6 border-t border-slate-200 pt-6 text-left space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-rose-700 tracking-wider uppercase mb-1">
                            Rejection Reason (Required)
                          </label>
                          <textarea
                            required
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 h-20 text-sm focus:border-rose-500 focus:bg-white outline-none"
                            placeholder="Please specify why this application was rejected..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerification(selectedPendingUser._id || selectedPendingUser.id, 'rejected')}
                            disabled={!rejectionReason.trim()}
                            className="flex-1 btn-crimson py-2 text-sm shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Submit Rejection
                          </button>
                          <button
                            onClick={() => setShowRejectForm(false)}
                            className="px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 mt-8 border-t border-slate-200 pt-6">
                        <button
                          onClick={() => handleVerification(selectedPendingUser._id || selectedPendingUser.id, 'active')}
                          className="flex-1 btn-primary py-2.5 text-sm cursor-pointer"
                        >
                          Approve Application
                        </button>
                        <button
                          onClick={() => setShowRejectForm(true)}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold py-2.5 rounded-xl text-sm transition-colors border border-red-300 cursor-pointer"
                        >
                          Reject with Reason
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-16 relative z-10">
                    <Eye size={36} className="text-slate-400" />
                    <p className="text-sm font-medium font-sans">Select a pending user to review verification details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* USERS DIRECTORY PANEL */}
        {activeTab === 'users' && (() => {
          const q = userSearchQuery.trim().toLowerCase();
          const filteredUsers = allUsers.filter(u => {
            if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
            if (!q) return true;
            return (
              u.name?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q) ||
              u.phone?.toLowerCase().includes(q) ||
              `usr-${u.id}`.toLowerCase().includes(q)
            );
          });
          return (
            <div className="space-y-6">
              {/* Filter pills + Search bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All Users' },
                    { id: 'business', label: 'Business Owner' },
                    { id: 'transporter', label: 'Cargo Transporter' },
                    { id: 'truck_owner', label: 'Truck Owner' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setUserRoleFilter(p.id)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${userRoleFilter === p.id
                          ? 'btn-primary shadow-xs'
                          : 'text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:text-slate-900 shadow-2xs'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="relative flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-72 shadow-2xs focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20">
                  <Search size={15} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    placeholder="Search name, email, phone, ID..."
                    aria-label="Search users"
                    className="w-full border-0 bg-transparent p-0 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery('')}
                      aria-label="Clear user search"
                      className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Users table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="overflow-x-auto touch-scroll relative z-10">
                  <table className="w-full min-w-[720px] text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                        <th className="py-3 px-3">User ID</th>
                        <th className="py-3 px-3">Name</th>
                        <th className="py-3 px-3">Role</th>
                        <th className="py-3 px-3">Email</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Joined</th>
                        <th className="py-3 px-3 text-center">Shipments</th>
                        <th className="py-3 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length > 0 ? filteredUsers.map((u, idx) => (
                        <tr key={u.id || idx} className="border-b border-slate-100 text-sm hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-3 font-mono text-slate-600">USR-{u.id || 2100 + idx}</td>
                          <td className="py-4 px-3 font-bold text-slate-900">{u.name}</td>
                          <td className={`py-4 px-3 font-bold capitalize ${getRoleStyle(u.role)}`}>
                            {u.role.replace('_', ' ')}
                          </td>
                          <td className="py-4 px-3 text-slate-700">{u.email}</td>
                          <td className="py-4 px-3">
                            <span className={`shrink-0 whitespace-nowrap inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeStyle(u.status)}`}>
                              {u.status === 'active' ? 'VERIFIED' : u.status === 'blocked' ? 'SUSPENDED' : u.status}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-slate-600 font-mono text-xs">{u.joinedDate || u.createdAt?.split?.('T')[0] || '—'}</td>
                          <td className="py-4 px-3 text-center text-slate-900 font-mono font-bold">{u.shipmentsCount || 0}</td>
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openUserDetail(u)}
                                className="text-orange-700 hover:text-orange-900 font-bold transition-colors cursor-pointer flex items-center gap-1 text-xs"
                              >
                                <Eye size={14} /> View
                              </button>
                              {u.status === 'blocked' ? (
                                <button
                                  onClick={() => handleUserStatusUpdate(u._id || u.id, 'active', u.name)}
                                  className="text-emerald-700 hover:text-emerald-900 font-bold transition-colors cursor-pointer flex items-center gap-1 text-xs"
                                >
                                  <Unlock size={14} /> Unblock
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUserStatusUpdate(u._id || u.id, 'blocked', u.name)}
                                  className="text-red-700 hover:text-red-900 font-bold transition-colors cursor-pointer flex items-center gap-1 text-xs"
                                >
                                  <Ban size={14} /> Block
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-sm text-slate-500">
                            No users match the selected role or search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* SHIPMENTS PANEL */}
        {activeTab === 'shipments' && (() => {
          const sq = shipmentSearchQuery.trim().toLowerCase();
          const filteredShipments = allShipments.filter(s => {
            if (!sq) return true;
            return (
              `shp-${s.id}`.toLowerCase().includes(sq) ||
              s.biltyNo?.toLowerCase().includes(sq) ||
              s.title?.toLowerCase().includes(sq) ||
              s.transporterName?.toLowerCase().includes(sq) ||
              s.businessOwnerName?.toLowerCase().includes(sq) ||
              s.origin?.toLowerCase().includes(sq) ||
              s.destination?.toLowerCase().includes(sq) ||
              s.truckPlate?.toLowerCase().includes(sq) ||
              s.status?.toLowerCase().includes(sq)
            );
          });
          return (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase text-left">All Platform Shipment Records</h3>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {sq ? `${filteredShipments.length} / ${allShipments.length}` : `Total: ${allShipments.length}`}
                    </span>
                  </div>
                  <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-80 focus-within:bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20">
                    <Search size={15} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={shipmentSearchQuery}
                      onChange={e => setShipmentSearchQuery(e.target.value)}
                      placeholder="Search Bilty, route, truck, shipper..."
                      aria-label="Search shipments"
                      className="w-full border-0 bg-transparent p-0 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                    />
                    {shipmentSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setShipmentSearchQuery('')}
                        aria-label="Clear shipment search"
                        className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto touch-scroll relative z-10">
                  <table className="w-full min-w-[760px] text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                        <th className="py-3 px-3">Shipment ID</th>
                        <th className="py-3 px-3">Bilty No.</th>
                        <th className="py-3 px-3">Transporter</th>
                        <th className="py-3 px-3">Business Owner</th>
                        <th className="py-3 px-3">Route</th>
                        <th className="py-3 px-3">Truck</th>
                        <th className="py-3 px-3">Weight</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShipments.length > 0 ? filteredShipments.map((s, idx) => (
                        <tr key={s.id || idx} className="border-b border-slate-100 text-sm hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-3 font-mono text-slate-600">SHP-{s.id || 10400 + idx}</td>
                          <td className="py-4 px-3">
                            {s.biltyNo && s.biltyNo !== '-' ? (
                              <button
                                onClick={() => handleBiltyClick(s)}
                                className="font-mono font-bold text-orange-700 hover:text-orange-900 hover:underline cursor-pointer"
                              >
                                {s.biltyNo}
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-4 px-3 text-slate-900 font-medium">{s.transporterName || 'Unassigned'}</td>
                          <td className="py-4 px-3 text-slate-700">{s.businessOwnerName || 'Unknown'}</td>
                          <td className="py-4 px-3 font-medium text-slate-900">{s.origin} &rarr; {s.destination}</td>
                          <td className="py-4 px-3 font-mono text-slate-600">{s.truckPlate || '-'}</td>
                          <td className="py-4 px-3 text-slate-700 font-mono">{formatWeightTons(s.weight)}</td>
                          <td className="py-4 px-3">
                            <span className={`shrink-0 whitespace-nowrap inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeStyle(s.status)}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-slate-600 font-mono text-xs">{s.createdAt ? s.createdAt.split('T')[0] : '—'}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-sm text-slate-500">
                            No shipment records match your search query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* DISPUTES / COMPLAINTS PANEL */}
        {activeTab === 'disputes' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase text-left">
              Disputes & complaints log
            </h3>

            <div className="space-y-4">
              {complaints.map(c => (
                <div
                  key={c._id || c.id}
                  className={`p-6 rounded-2xl border transition-all shadow-sm relative overflow-hidden ${c.status === 'Open'
                      ? 'bg-red-50/90 border-red-200'
                      : 'bg-white border-slate-200'
                    }`}
                >
                  <SindhiTruckTexture />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start gap-3">
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-slate-900">{c.subject}</h4>
                        <p className="text-xs text-slate-600 mt-1">
                          By <span className="text-slate-900 font-semibold">{c.userName}</span> ({c.userRole.replace('_', ' ')})
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${c.status === 'Open' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          }`}>
                          {c.status}
                        </span>
                        {c.status === 'Open' && (
                          <button
                            onClick={() => handleResolveComplaint(c._id || c.id)}
                            className="btn-primary px-3 py-1 text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Check size={12} /> Resolve Dispute
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mt-4 leading-relaxed text-left">{c.description}</p>
                  </div>
                </div>
              ))}
              {complaints.length === 0 && (
                <div className="bg-white rounded-2xl p-16 text-center text-slate-500 gap-2 flex flex-col items-center border border-slate-200 shadow-sm">
                  <AlertCircle size={28} className="text-slate-400" />
                  <p className="text-sm font-medium">No disputes or complaints filed.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVITY LOG PANEL */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase text-left font-sans">System Activity Logs</h3>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <SindhiTruckTexture />
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 text-left z-10">
                {activityLogs.map((log, idx) => (
                  <div key={idx} className="relative pl-8 group">
                    {/* Circle marker */}
                    <div className="absolute -left-4 top-1.5 w-8 h-8 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-700 shadow-xs">
                      {log.type === 'user' ? <Users size={13} /> : log.type === 'cargo' ? <Package size={13} /> : <FileText size={13} />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-500 tracking-wider font-mono">
                        {new Date(log.date).toLocaleTimeString()}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{log.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{log.description}</p>
                    </div>
                  </div>
                ))}
                {activityLogs.length === 0 && (
                  <p className="text-sm text-slate-500 italic ml-4">No recent activity logs recorded.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS PANEL */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase text-left">System alerts & notifications</h3>
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 text-left shadow-sm relative overflow-hidden">
                <SindhiTruckTexture />
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 relative z-10 shadow-xs">
                  <Activity size={18} />
                </div>
                <div className="relative z-10">
                  <h4 className="text-sm font-bold text-slate-900">Database Connection Healthy</h4>
                  <p className="text-xs text-slate-600 mt-1">Local SQLite/Sequelize transactional database engine online and synchronized.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 text-left shadow-sm relative overflow-hidden">
                <SindhiTruckTexture />
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center shrink-0 relative z-10 shadow-xs">
                  <Shield size={18} />
                </div>
                <div className="relative z-10">
                  <h4 className="text-sm font-bold text-slate-900">Authentication Engine Active</h4>
                  <p className="text-xs text-slate-600 mt-1">Platform tokens and backend routing configured with secure JWT encoding.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ─── User Detail Modal (opens from Users tab) ─────────────────────────── */}
      {viewingUser && (
        <div
          onClick={() => setViewingUser(null)}
          role="dialog"
          aria-modal="true"
          aria-label="User dossier"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-2.5 sm:px-4 py-4 sm:py-8 overflow-y-auto"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white/95 border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl relative overflow-hidden modal-enter"
          >
            {/* Top Chamak Patti decoration */}
            <ChamakRibbon height="h-1.5" />

            {/* Modal header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 p-4 sm:p-6 border-b border-slate-200">
              <div className="text-left min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <TruckTaj className="text-orange-600 w-5 h-4" />
                  <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">User Dossier</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 break-words">{viewingUser.name}</h2>
                <p className={`text-xs sm:text-sm font-semibold capitalize mt-1 ${getRoleStyle(viewingUser.role)}`}>
                  {viewingUser.role.replace('_', ' ')} &bull; <span className="font-mono">USR-{viewingUser.id || viewingUser._id}</span>
                </p>
              </div>
              <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                <span className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${getStatusBadgeStyle(viewingUser.status)}`}>
                  {viewingUser.status === 'active' ? 'VERIFIED' : viewingUser.status === 'blocked' ? 'SUSPENDED' : viewingUser.status}
                </span>
                <button
                  onClick={() => setViewingUser(null)}
                  aria-label="Close user dossier"
                  className="text-slate-500 hover:text-slate-800 cursor-pointer p-1"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 text-left overflow-y-auto max-h-[calc(100dvh-10rem)]">

              {/* Profile info grid */}
              <div>
                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-4">Profile Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 items-start">
                    <Mail size={16} className="text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black">Email</p>
                      <p className="text-sm font-medium text-slate-900 mt-0.5 break-all">{viewingUser.email}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 items-start">
                    <Phone size={16} className="text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black">Phone</p>
                      <p className="text-sm font-medium text-slate-900 mt-0.5 font-mono">{viewingUser.phone || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 items-start">
                    <Shield size={16} className="text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black">CNIC / Reg. ID</p>
                      <p className="text-sm font-medium text-slate-900 mt-0.5 font-mono">{viewingUser.cnic || 'Not specified'}</p>
                    </div>
                  </div>
                  {viewingUser.businessName && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 items-start">
                      <Package size={16} className="text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black">Business Name</p>
                        <p className="text-sm font-medium text-slate-900 mt-0.5">{viewingUser.businessName}</p>
                      </div>
                    </div>
                  )}
                  {viewingUser.businessRegNumber && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 items-start">
                      <FileCheck size={16} className="text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black">Reg. Number</p>
                        <p className="text-sm font-medium text-slate-900 mt-0.5 font-mono">{viewingUser.businessRegNumber}</p>
                      </div>
                    </div>
                  )}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 items-start">
                    <Clock size={16} className="text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black">Joined</p>
                      <p className="text-sm font-medium text-slate-900 mt-0.5 font-mono">{viewingUser.joinedDate || viewingUser.createdAt?.split?.('T')[0] || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity / Verification documents */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-4">
                  Identity & Verification Documents ({viewingUser.documents?.length || 0} uploaded)
                </h3>
                {viewingUser.documents && viewingUser.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {viewingUser.documents.map((doc, idx) => {
                      const docUrl = resolveAssetUrl(doc);
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc);
                      const labels = ['CNIC / Identity Document', 'Vehicle Operations License'];
                      return (
                        <a
                          key={idx}
                          href={docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block border border-slate-200 hover:border-orange-400 rounded-xl overflow-hidden bg-slate-50 transition-all"
                        >
                          {isImage ? (
                            <img src={docUrl} alt={`Document ${idx + 1}`} className="w-full h-36 object-cover" onError={e => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div className="h-24 flex items-center justify-center bg-orange-50">
                              <FileText size={32} className="text-orange-600" />
                            </div>
                          )}
                          <div className="p-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-900">{labels[idx] || `Document ${idx + 1}`}</p>
                              <p className="text-[10px] text-orange-600 mt-0.5 group-hover:underline">Click to open ↗</p>
                            </div>
                            <Eye size={14} className="text-slate-500 group-hover:text-orange-600 transition-colors" />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm">
                    No identity documents uploaded yet.
                  </div>
                )}
              </div>

              {/* Fleet & Truck Certificates — only for truck owners */}
              {viewingUser.role === 'truck_owner' && (
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-4">
                    Registered Fleet & Truck Certificates
                  </h3>
                  {loadingUserTrucks ? (
                    <div className="flex items-center gap-3 text-slate-500">
                      <Loader2 size={16} className="animate-spin text-orange-600" />
                      <span className="text-sm">Loading fleet data...</span>
                    </div>
                  ) : viewingUserTrucks.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm">
                      No trucks registered under this account.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {viewingUserTrucks.map((truck) => (
                        <div key={truck.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center">
                                <Truck size={18} />
                              </div>
                              <div>
                                <h4 className="font-mono text-base font-extrabold text-slate-900">{truck.plateNumber}</h4>
                                <p className="text-xs text-slate-600">{truck.truckType} &middot; {truck.capacity}</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${truck.status === 'Available' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                truck.status === 'In Transit' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                  'bg-slate-100 text-slate-800 border-slate-300'
                              }`}>
                              {truck.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 mb-4">
                            <div>
                              <p className="text-[9px] text-slate-500 font-black uppercase">Driver</p>
                              <p className="font-semibold text-slate-900 mt-0.5">{truck.driverName || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-500 font-black uppercase">Driver Mobile</p>
                              <p className="font-semibold text-slate-900 mt-0.5 font-mono">{truck.driverMobile || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-500 font-black uppercase">Location</p>
                              <p className="font-semibold text-slate-900 mt-0.5">{truck.loc || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-500 font-black uppercase">Truck ID</p>
                              <p className="font-mono text-slate-600 mt-0.5">TRK-{truck.id}</p>
                            </div>
                          </div>

                          {/* Truck certificates */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 pt-4">
                            <div>
                              <p className="text-[9px] text-slate-600 font-black uppercase mb-2">Fitness Certificate</p>
                              {truck.fitnessDoc ? (
                                <a
                                  href={resolveAssetUrl(truck.fitnessDoc)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 bg-orange-50 border border-orange-200 hover:border-orange-400 text-orange-800 rounded-lg px-3 py-2 text-xs font-bold transition-all group"
                                >
                                  <FileCheck size={14} />
                                  <span className="group-hover:underline truncate">View Fitness Certificate ↗</span>
                                </a>
                              ) : (
                                <span className="text-xs text-red-600 italic flex items-center gap-1.5">
                                  <AlertCircle size={12} /> Not uploaded
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-600 font-black uppercase mb-2">Insurance Papers</p>
                              {truck.insuranceDoc ? (
                                <a
                                  href={resolveAssetUrl(truck.insuranceDoc)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 bg-slate-100 border border-slate-300 hover:border-slate-400 text-slate-800 rounded-lg px-3 py-2 text-xs font-bold transition-all group"
                                >
                                  <FileText size={14} />
                                  <span className="group-hover:underline truncate">View Insurance Papers ↗</span>
                                </a>
                              ) : (
                                <span className="text-xs text-red-600 italic flex items-center gap-1.5">
                                  <AlertCircle size={12} /> Not uploaded
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="border-t border-slate-200 pt-6 flex gap-3">
                {viewingUser.status === 'pending' || viewingUser.status === 'pending_verification' ? (
                  <>
                    <button
                      onClick={async () => { await handleVerification(viewingUser._id || viewingUser.id, 'active'); setViewingUser(null); }}
                      className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle size={16} /> Approve Account
                    </button>
                    <button
                      onClick={async () => { const ok = await handleUserStatusUpdate(viewingUser._id || viewingUser.id, 'blocked', viewingUser.name); if (ok) setViewingUser(null); }}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold py-2.5 rounded-xl text-sm transition-colors border border-red-300 cursor-pointer"
                    >
                      Reject & Block
                    </button>
                  </>
                ) : viewingUser.status === 'blocked' ? (
                  <button
                    onClick={async () => { const ok = await handleUserStatusUpdate(viewingUser._id || viewingUser.id, 'active', viewingUser.name); if (ok) setViewingUser(null); }}
                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold py-2.5 rounded-xl text-sm transition-colors border border-emerald-300 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Unlock size={16} /> Unblock User
                  </button>
                ) : (
                  <button
                    onClick={async () => { const ok = await handleUserStatusUpdate(viewingUser._id || viewingUser.id, 'blocked', viewingUser.name); if (ok) setViewingUser(null); }}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold py-2.5 rounded-xl text-sm transition-colors border border-red-300 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Ban size={16} /> Block User
                  </button>
                )}
                <button
                  onClick={() => setViewingUser(null)}
                  className="px-6 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-all"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP GATEWAY MODAL */}
      {whatsappModalOpen && (
        <div
          onClick={() => { setWhatsappModalOpen(false); setTestResult(null); }}
          role="dialog"
          aria-modal="true"
          aria-label="WhatsApp notification gateway"
          className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/80"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white/95 border border-emerald-300 rounded-2xl w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-4 sm:p-6 relative shadow-2xl modal-enter"
          >
            <button
              onClick={() => { setWhatsappModalOpen(false); setTestResult(null); }}
              aria-label="Close WhatsApp gateway modal"
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4 pr-7">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                <MessageSquare size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-slate-900">WhatsApp Notification Gateway</h3>
                <p className="text-xs text-slate-600 font-medium">Self-hosted automated alerts for shipments & deliveries</p>
              </div>
            </div>

            {/* Connection Status Banner */}
            <div className={`p-3.5 sm:p-4 rounded-xl border mb-5 flex flex-wrap items-center justify-between gap-2 ${whatsappStatus.isReady
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : whatsappStatus.hasQr
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${whatsappStatus.isReady ? 'bg-emerald-500' : whatsappStatus.hasQr ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="font-extrabold text-sm">
                  {whatsappStatus.isReady
                    ? 'Gateway Online & Authenticated'
                    : whatsappStatus.hasQr
                      ? 'Action Required: Scan QR Code'
                      : 'Gateway Initializing...'}
                </span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/80 border text-slate-700 uppercase">
                {whatsappStatus.status}
              </span>
            </div>

            {/* QR Code Section (if waiting for link) */}
            {!whatsappStatus.isReady && (
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl mb-5 text-center">
                <p className="text-xs font-bold text-slate-700 mb-3">
                  Open WhatsApp on your phone ➔ Linked Devices ➔ Link a Device ➔ Scan:
                </p>
                {whatsappQrDataUrl ? (
                  <div className="p-3 bg-white border-2 border-emerald-500 rounded-xl shadow-md preserve-light">
                    <img src={whatsappQrDataUrl} alt="WhatsApp QR Code" className="w-56 h-56 mx-auto" />
                  </div>
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center bg-white border border-dashed border-slate-300 rounded-xl">
                    <QrCode size={40} className="text-slate-400 animate-pulse mb-2" />
                    <span className="text-xs text-slate-500">Generating live QR code...</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-3">Session is saved locally in <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">.wwebjs_auth</code>. You only scan once.</p>
              </div>
            )}

            {/* Automated Alerts Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-xs text-slate-700 space-y-1.5">
              <p className="font-extrabold text-slate-900 mb-1">⚡ Automatic WhatsApp Triggers Configured:</p>
              <div className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                <span><strong>New Shipment:</strong> Instant WhatsApp to Shipper & Consignees</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                <span><strong>Booking Offer:</strong> WhatsApp offer alert to Driver / Truck Owner</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                <span><strong>In Transit:</strong> Receiver gets truck details & <strong>Secret Delivery Code (OTP)</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                <span><strong>Delivered:</strong> Shipper notified with Bilty number & verified POD</span>
              </div>
            </div>

            {/* Quick Test Message Form */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-2">Send Test WhatsApp Message</h4>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="0300-1234567 or +923..."
                  value={testPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTestPhone(val.startsWith('03') ? formatPhone(val) : val);
                  }}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <button
                  disabled={testSending || !whatsappStatus.isReady || !testPhone}
                  onClick={async () => {
                    setTestSending(true);
                    setTestResult(null);
                    try {
                      const res = await adminAPI.sendWhatsAppTest({
                        phone: testPhone,
                        message: testMessage || '🚚 Greetings from E-Cargo-Bilty! WhatsApp notification gateway is active.'
                      });
                      setTestResult(res.data.success ? 'Message sent successfully!' : `Failed: ${res.data.reason || 'check number'}`);
                    } catch (err) {
                      setTestResult('Error sending test message');
                    } finally {
                      setTestSending(false);
                    }
                  }}
                  className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {testSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Send</span>
                </button>
              </div>
              {testResult && (
                <p className={`text-xs font-bold mt-1 ${testResult.startsWith('Message sent') ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {testResult}
                </p>
              )}
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => { setWhatsappModalOpen(false); setTestResult(null); }}
                className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital e-Bilty Preview & Print Modal */}
      <BiltyModal
        booking={biltyModalBooking}
        onClose={() => setBiltyModalBooking(null)}
      />

    </div>
  );
}

