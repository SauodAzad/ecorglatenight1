import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { User, Bell, X, Shield, ShieldCheck, Truck, Briefcase, Building2, ArrowRight, ArrowLeft, Globe, Menu, FileText, MapPin, Radio, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { logisticsAPI, socket } from './api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';

export function getRoleDashboardPath(role) {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'truck_owner':
    case 'fleet_owner':
    case 'driver':
      return '/fleet-owner/dashboard';
    case 'transporter':
      return '/transporter/dashboard';
    case 'business':
    case 'shipper':
      return '/business/dashboard';
    default:
      return null;
  }
}
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import TruckOwnerDashboard from './pages/dashboards/TruckOwnerDashboard';
import TransporterDashboard from './pages/dashboards/TransporterDashboard';
import BusinessDashboard from './pages/dashboards/BusinessDashboard';
import { ChamakRibbon, AjrakRibbon, TruckPhotoShowcase, TruckPatternBorder, TruckLotusArchBadge, TruckTaj, UrduMotto, WorkshopBadge, TruckMorBadge, NazarBattuBadge } from './components/TruckArt';
import Tilt3DCard, { useParallaxRef } from './components/Tilt3DCard';
import RevealOnScroll from './components/RevealOnScroll';
import HighwayBackdrop from './components/HighwayBackdrop';
import LandingExplorerModal from './components/LandingExplorerModal';

const Navbar = () => {
  const { currentUser, logout, userData } = useAuth();
  const { language, toggleLanguage, t, isUrdu } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    let rafId = 0;
    let cachedMaxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const isScrolledRef = { current: (window.scrollY || 0) > 12 };

    const updateMaxScroll = () => {
      cachedMaxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
    };

    const syncScroll = () => {
      rafId = 0;
      const y = window.scrollY || 0;
      const nextScrolled = y > 12;
      if (nextScrolled !== isScrolledRef.current) {
        isScrolledRef.current = nextScrolled;
        setIsScrolled(nextScrolled);
      }
      if (progressRef.current) {
        const progress =
          cachedMaxScroll > 0 ? Math.min(1, Math.max(0, y / cachedMaxScroll)) : 0;
        progressRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      }
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(syncScroll);
      }
    };

    const handleResize = () => {
      updateMaxScroll();
      handleScroll();
    };

    syncScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await logisticsAPI.getNotifications();
      setNotifications(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchNotifications();
    const handleIncomingNotification = (n) => {
      if (!n) return;
      const incomingId = n._id || n.id;
      setNotifications((prev) => {
        if (incomingId && prev.some((item) => (item._id || item.id) === incomingId)) {
          return prev;
        }
        return [n, ...prev];
      });
    };
    socket.on('notification', handleIncomingNotification);
    return () => socket.off('notification', handleIncomingNotification);
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const clearNotification = async (id) => {
    try {
      await logisticsAPI.deleteNotification(id);
      setNotifications(prev => prev.filter(n => (n._id || n.id) !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const clearAllNotifications = async () => {
    const items = [...notifications];
    setNotifications([]);
    await Promise.allSettled(
      items.map((n) => logisticsAPI.deleteNotification(n._id || n.id))
    );
  };

  useEffect(() => {
    if (!showNotifications && !mobileMenuOpen) return undefined;
    const handleOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setShowNotifications(false);
        setMobileMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [showNotifications, mobileMenuOpen]);

  useEffect(() => {
    const onUiBack = (e) => {
      if (showNotifications) {
        setShowNotifications(false);
        e.preventDefault();
        return;
      }
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        e.preventDefault();
      }
    };
    window.addEventListener('ecargo:ui-back', onUiBack);
    return () => window.removeEventListener('ecargo:ui-back', onUiBack);
  }, [showNotifications, mobileMenuOpen]);

  const handleTopBack = () => {
    if (showNotifications) {
      setShowNotifications(false);
      return;
    }
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
      return;
    }

    const backEvent = new CustomEvent('ecargo:ui-back', { cancelable: true });
    if (!window.dispatchEvent(backEvent)) {
      return;
    }

    if (isLanding) {
      if (window.scrollY > 40) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const dashboardPath = currentUser && userData?.role ? getRoleDashboardPath(userData.role) : null;
    if (dashboardPath && location.pathname !== '/profile' && location.pathname !== '/login' && location.pathname !== '/register') {
      if (window.scrollY > 40) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(dashboardPath || '/');
    }
  };

  const landingLinks = [
    { href: '#hero', label: isUrdu ? 'ہوم' : 'Home', mobileLabel: isUrdu ? 'ہوم' : 'Home' },
    { href: '#fleet', label: isUrdu ? 'فلیٹ' : 'Fleet', mobileLabel: isUrdu ? 'فلیٹ' : 'Fleet' },
    { href: '#workflow', label: isUrdu ? 'طریقہ کار' : 'Dispatch', mobileLabel: isUrdu ? 'طریقہ' : 'Dispatch' },
    { href: '#portals', label: isUrdu ? 'پورٹلز' : 'Portals', mobileLabel: isUrdu ? 'پورٹلز' : 'Portals' }
  ];

  return (
    <nav
      ref={navRef}
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        isScrolled
          ? 'bg-[#060B16]/98 border-white/15 shadow-[0_10px_28px_-8px_rgba(0,0,0,0.82)]'
          : 'bg-[#060B16]/94 border-white/10 shadow-[0_4px_18px_-6px_rgba(0,0,0,0.58)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-3 h-14 sm:h-16">
          {/* Top-Left Back Button + Brand Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 lg:flex-initial lg:justify-self-start">
            <button
              type="button"
              onClick={handleTopBack}
              aria-label={isUrdu ? 'واپس جائیں' : 'Go Back'}
              title={isUrdu ? 'واپس جائیں' : 'Go Back'}
              className={`${isLanding ? 'inline-flex md:hidden' : 'inline-flex'} items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-white/15 bg-white/[0.08] hover:bg-white/15 hover:border-orange-400/50 text-slate-100 hover:text-orange-300 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs`}
            >
              <ArrowLeft size={16} className={isUrdu ? 'rotate-180' : ''} />
            </button>

            <div
              className="group flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none min-w-0 flex-1"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowNotifications(false);
                const target = currentUser && userData?.role ? getRoleDashboardPath(userData.role) : null;
                navigate(target || '/');
              }}
            >
              <div className="relative flex items-center justify-center w-10 h-8 sm:w-14 sm:h-10 rounded-xl bg-white/95 border border-white/25 shadow-sm group-hover:border-orange-400 transition-colors shrink-0 overflow-hidden px-0.5 preserve-light">
                <img src="/logo.jpg?v=2" alt="E-CARGO-BILTY" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[13px] sm:text-base md:text-lg font-black tracking-wide sm:tracking-wider truncate text-white leading-tight">
                  {t('brandTitle')}
                </span>
                <span
                  className={`block truncate text-[7.5px] sm:text-[10px] tracking-wider ${
                    isUrdu ? 'font-urdu font-bold text-orange-400' : 'font-mono text-slate-400'
                  }`}
                >
                  {t('brandSubtitle')}
                </span>
              </div>
            </div>
          </div>

          {/* Center Brand Badge or Landing Section Links */}
          {isLanding ? (
            <div className="hidden lg:flex items-center justify-self-center shrink-0 gap-1 rounded-full bg-white/[0.06] border border-white/12 px-2 py-1">
              {landingLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-bold text-slate-200 hover:text-orange-300 hover:bg-white/[0.1] transition-colors ${isUrdu ? 'font-urdu text-sm' : ''}`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ) : (
            <div className="hidden lg:flex items-center justify-self-center shrink-0 gap-2">
              <TruckMorBadge />
            </div>
          )}

          {/* Desktop Navigation & User Controls */}
          <div className="hidden md:flex gap-1.5 xl:gap-2 items-center justify-end lg:justify-self-end min-w-0">
            {/* Language Change Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.07] hover:bg-white/15 hover:border-white/25 text-slate-100 text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
              title={language === 'en' ? 'Switch website to Urdu' : 'Switch website to English'}
            >
              <Globe size={15} className="shrink-0 text-orange-400" />
              <span className="font-sans font-bold text-xs text-slate-100">
                {t('langToggle')}
              </span>
            </button>

            {currentUser ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowNotifications((prev) => !prev);
                    }}
                    aria-label={t('transitAlerts')}
                    aria-expanded={showNotifications}
                    className="p-2 relative transition-colors rounded-lg cursor-pointer text-slate-300 hover:text-orange-400 hover:bg-white/10"
                    title={t('transitAlerts')}
                  >
                    <Bell size={19} />
                    {notifications.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-[#060B16] shadow-xs animate-pulse"></span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute end-0 mt-2 w-84 bg-[#0B1325]/97 border border-white/15 shadow-[0_24px_56px_rgba(0,0,0,0.85)] rounded-2xl z-[60] max-h-[420px] overflow-y-auto p-4 modal-enter text-slate-100">
                      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <TruckTaj size={18} />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-white">{t('transitAlerts')}</h4>
                        </div>
                        {notifications.length > 0 && (
                          <button
                            type="button"
                            onClick={clearAllNotifications}
                            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 font-mono">{t('noNotifications')}</p>
                      ) : (
                        <div className="space-y-2">
                          {notifications.map(n => (
                            <div key={n._id || n.id} className="p-3 rounded-xl bg-white/[0.05] border border-white/10 hover:border-white/25 flex justify-between items-start gap-2 transition-all">
                              <div>
                                <p className="text-xs text-slate-100 font-medium leading-relaxed">{n.message}</p>
                                <p className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                  {new Date(n.createdAt).toLocaleTimeString()}
                                </p>
                              </div>
                              <button
                                type="button"
                                aria-label="Dismiss notification"
                                onClick={() => clearNotification(n._id || n.id)}
                                className="text-slate-400 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  to="/profile"
                  title={userData?.name || currentUser.email}
                  className="transition-colors flex items-center gap-1.5 px-1.5 py-1 rounded-xl text-slate-200 hover:text-orange-400 hover:bg-white/10 min-w-0"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-2xs bg-orange-500/20 text-orange-300 border-orange-400/35 shrink-0">
                    <User size={15} />
                  </div>
                  <div className="hidden xl:flex flex-col text-left min-w-0">
                    <span className="text-xs font-bold truncate max-w-[90px] text-white">
                      {userData?.name || currentUser.email}
                    </span>
                    <span className="text-[10px] font-mono font-bold capitalize leading-tight text-orange-400 truncate">
                      {t(`role_${userData?.role}`) || userData?.role?.replace('_', ' ') || 'User'}
                    </span>
                  </div>
                </Link>

                <Link
                  to={getRoleDashboardPath(userData?.role) || '/business/dashboard'}
                  className="btn-primary text-xs !py-1.5 !px-2.5 xl:!px-3.5 shadow-sm whitespace-nowrap shrink-0"
                >
                  {t('dashboard')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-2.5 xl:px-3 py-1.5 rounded-xl border border-white/20 bg-white/[0.07] hover:bg-white/15 hover:border-white/30 text-slate-100 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/login"
                  className="cta-shine px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#F97316] hover:to-[#FB923C] shadow-[0_4px_16px_-2px_rgba(249,115,22,0.55)] transition-all whitespace-nowrap shrink-0"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-white/20 bg-white/[0.08] hover:bg-white/15 text-white hover:border-orange-400/50 transition-all whitespace-nowrap shrink-0"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Controls: Language toggle + Bell + Hamburger */}
          <div className="flex md:hidden items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={toggleLanguage}
              className="p-1.5 rounded-lg border border-white/15 bg-white/[0.08] text-slate-100 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
              title={language === 'en' ? 'Switch website to Urdu' : 'Switch website to English'}
            >
              <Globe size={14} className="text-orange-400" />
              <span className="text-[10px] font-mono">{language === 'en' ? 'اردو' : 'EN'}</span>
            </button>

            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowNotifications((prev) => !prev);
                }}
                aria-label={t('transitAlerts')}
                className="p-2 relative transition-colors rounded-lg cursor-pointer text-slate-300 hover:text-orange-400 hover:bg-white/10"
                title={t('transitAlerts')}
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-[#060B16] shadow-xs animate-pulse"></span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowNotifications(false);
                setMobileMenuOpen((prev) => !prev);
              }}
              className="p-2 rounded-xl border border-white/15 bg-white/[0.08] hover:bg-white/15 text-white transition-all cursor-pointer shadow-2xs"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {/* Mobile Notifications Dropdown */}
        {showNotifications && (
          <div className="md:hidden pb-3">
            <div className="bg-[#0B1325]/97 border border-white/15 rounded-2xl shadow-[0_20px_48px_rgba(0,0,0,0.85)] p-3 max-h-[300px] overflow-y-auto modal-enter text-left text-slate-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <TruckTaj size={16} />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-white">{t('transitAlerts')}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      className="text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                  <button type="button" onClick={() => setShowNotifications(false)} aria-label="Close alerts" className="text-slate-400 hover:text-white p-1">
                    <X size={14} />
                  </button>
                </div>
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 font-mono">{t('noNotifications')}</p>
              ) : (
                <div className="space-y-2">
                  {notifications.map(n => (
                    <div key={n._id || n.id} className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 flex justify-between items-start gap-2">
                      <div>
                        <p className="text-xs text-slate-100 font-medium">{n.message}</p>
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleTimeString()}</p>
                      </div>
                      <button type="button" aria-label="Dismiss notification" onClick={() => clearNotification(n._id || n.id)} className="text-slate-400 hover:text-rose-400 p-0.5">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Collapsible Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 py-3.5 px-1 animate-dropdown-fade text-left space-y-2.5">
            {isLanding && (
              <div className="grid grid-cols-4 gap-1.5 pb-1">
                {landingLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-1.5 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-center text-[11px] font-bold text-slate-200 hover:text-orange-300 transition-all ${isUrdu ? 'font-urdu text-xs' : ''}`}
                  >
                    {item.mobileLabel}
                  </a>
                ))}
              </div>
            )}

            {currentUser ? (
              <>
                {/* User Info Card */}
                <div className="p-3 rounded-2xl border bg-white/[0.06] border-white/12 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                      <User size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate text-white">
                        {userData?.name || currentUser.email}
                      </p>
                      <p className="text-[10px] font-mono font-bold capitalize truncate text-orange-400">
                        {t(`role_${userData?.role}`) || userData?.role?.replace('_', ' ') || 'User'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-400/35 shrink-0 font-mono">
                    Online
                  </span>
                </div>

                {/* Dashboard Action Button */}
                <Link
                  to={getRoleDashboardPath(userData?.role) || '/business/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full btn-primary text-xs font-black !py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm"
                >
                  <Truck size={15} /> {t('dashboard')} ({userData?.role?.replace('_', ' ').toUpperCase() || 'PORTAL'})
                </Link>

                {/* Profile Link */}
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full border font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-between transition-colors shadow-2xs bg-white/[0.07] hover:bg-white/12 border-white/15 text-slate-100"
                >
                  <span className="flex items-center gap-2"><User size={14} className="text-orange-400" /> Account Profile &amp; KYC</span>
                  <ArrowRight size={13} className="text-slate-400" />
                </Link>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/35 text-rose-200 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <X size={14} /> {t('logout')}
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary text-xs font-bold !py-2.5 rounded-xl text-center shadow-xs"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl border border-white/20 bg-white/[0.08] hover:bg-white/15 text-white text-xs font-bold text-center transition-colors"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Scroll Progress Hairline & Signature Ribbon */}
      <div
        ref={progressRef}
        aria-hidden="true"
        className={`h-[2px] w-full bg-gradient-to-r from-[#EA580C] via-[#F89020] to-cyan-400 ${isUrdu ? 'origin-right' : 'origin-left'}`}
        style={{ transform: 'scaleX(0)' }}
      />
      <ChamakRibbon height="h-[3px]" />
    </nav>
  );
};

const Home = () => {
  const { currentUser, userData } = useAuth();
  const { t, isUrdu } = useLanguage();
  const navigate = useNavigate();
  const heroParallaxRef = useParallaxRef();
  const [explorerState, setExplorerState] = useState({
    open: false,
    tab: 'fleet',
    origin: 'Lahore',
    destination: 'Karachi',
  });
  const [publicOverview, setPublicOverview] = useState(null);

  useEffect(() => {
    let active = true;
    logisticsAPI.getPublicOverview()
      .then((res) => {
        if (active && res?.data) setPublicOverview(res.data);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const openExplorer = (tab = 'fleet', origin = 'Lahore', destination = 'Karachi') => {
    setExplorerState({ open: true, tab, origin, destination });
  };

  useEffect(() => {
    if (!explorerState.open) return;
    const onUiBack = (e) => {
      e.preventDefault();
      setExplorerState((prev) => ({ ...prev, open: false }));
    };
    window.addEventListener('ecargo:ui-back', onUiBack);
    return () => window.removeEventListener('ecargo:ui-back', onUiBack);
  }, [explorerState.open]);

  useEffect(() => {
    if (currentUser && userData?.role) {
      const target = getRoleDashboardPath(userData.role);
      if (target) {
        navigate(target, { replace: true });
      }
    }
  }, [currentUser, userData, navigate]);

  const portalCards = [
    {
      to: '/admin',
      Icon: Shield,
      roleLabel: t('role_admin'),
      title: t('adminCardTitle'),
      desc: t('adminCardDesc'),
      surfaceStyle: {
        backgroundImage:
          'radial-gradient(ellipse 95% 80% at 14% 12%, rgba(16, 185, 129, 0.28), transparent 64%), linear-gradient(155deg, #0D2626 0%, #0C182A 56%, #08101E 100%)',
      },
      cardTheme: 'border border-emerald-400/35 hover:border-emerald-400/80 shadow-[0_14px_32px_-10px_rgba(16,185,129,0.28)] hover:shadow-[0_22px_42px_-10px_rgba(16,185,129,0.45)]',
      iconTheme: 'bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/35',
      badgeTheme: 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300',
      accentText: 'text-emerald-300',
      barTheme: 'bg-gradient-to-r from-emerald-400 to-teal-400',
    },
    {
      to: '/truck-owner',
      Icon: Truck,
      roleLabel: t('role_truck_owner'),
      title: t('truckOwnerCardTitle'),
      desc: t('truckOwnerCardDesc'),
      surfaceStyle: {
        backgroundImage:
          'radial-gradient(ellipse 95% 80% at 14% 12%, rgba(249, 115, 22, 0.30), transparent 64%), linear-gradient(155deg, #271710 0%, #12182A 56%, #08101E 100%)',
      },
      cardTheme: 'border border-orange-400/35 hover:border-orange-400/80 shadow-[0_14px_32px_-10px_rgba(249,115,22,0.28)] hover:shadow-[0_22px_42px_-10px_rgba(249,115,22,0.48)]',
      iconTheme: 'bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-white shadow-lg shadow-orange-500/35',
      badgeTheme: 'bg-orange-500/15 border-orange-400/35 text-orange-300',
      accentText: 'text-orange-300',
      barTheme: 'bg-gradient-to-r from-amber-400 to-[#F97316]',
    },
    {
      to: '/transporter',
      Icon: Briefcase,
      roleLabel: t('role_transporter'),
      title: t('transporterCardTitle'),
      desc: t('transporterCardDesc'),
      surfaceStyle: {
        backgroundImage:
          'radial-gradient(ellipse 95% 80% at 14% 12%, rgba(6, 182, 212, 0.28), transparent 64%), linear-gradient(155deg, #0B2333 0%, #0D182B 56%, #08101E 100%)',
      },
      cardTheme: 'border border-cyan-400/35 hover:border-cyan-400/80 shadow-[0_14px_32px_-10px_rgba(6,182,212,0.28)] hover:shadow-[0_22px_42px_-10px_rgba(6,182,212,0.45)]',
      iconTheme: 'bg-gradient-to-br from-cyan-400 to-sky-500 text-slate-950 shadow-lg shadow-cyan-500/35',
      badgeTheme: 'bg-cyan-500/15 border-cyan-400/35 text-cyan-300',
      accentText: 'text-cyan-300',
      barTheme: 'bg-gradient-to-r from-cyan-400 to-sky-400',
    },
    {
      to: '/business',
      Icon: Building2,
      roleLabel: t('role_business'),
      title: t('businessCardTitle'),
      desc: t('businessCardDesc'),
      surfaceStyle: {
        backgroundImage:
          'radial-gradient(ellipse 95% 80% at 14% 12%, rgba(99, 102, 241, 0.30), transparent 64%), linear-gradient(155deg, #19183A 0%, #0E162B 56%, #08101E 100%)',
      },
      cardTheme: 'border border-indigo-400/35 hover:border-indigo-400/80 shadow-[0_14px_32px_-10px_rgba(99,102,241,0.28)] hover:shadow-[0_22px_42px_-10px_rgba(99,102,241,0.46)]',
      iconTheme: 'bg-gradient-to-br from-indigo-400 to-violet-600 text-white shadow-lg shadow-indigo-500/35',
      badgeTheme: 'bg-indigo-500/15 border-indigo-400/35 text-indigo-300',
      accentText: 'text-indigo-300',
      barTheme: 'bg-gradient-to-r from-indigo-400 to-violet-400',
    }
  ];

  const heroFeatures = [
    {
      Icon: FileText,
      label: isUrdu ? 'مصدقہ کیو آر و پی ڈی ایف بلٹی' : 'Official QR & PDF Bilty',
      chipBg: 'bg-emerald-500/20 border-emerald-400/35 text-emerald-300',
      tab: 'bilty'
    },
    {
      Icon: MapPin,
      label: isUrdu ? 'لائیو جی پی ایس فلیٹ ٹریکنگ' : 'Live GPS Telemetry',
      chipBg: 'bg-cyan-500/20 border-cyan-400/35 text-cyan-300',
      tab: 'tracking'
    },
    {
      Icon: ShieldCheck,
      label: isUrdu ? 'تصدیق شدہ فلیٹ نیٹ ورک' : 'Verified Fleet Network',
      chipBg: 'bg-orange-500/20 border-orange-400/35 text-orange-300',
      tab: 'fleet'
    }
  ];

  const corridors = isUrdu
    ? [
        { label: 'لاہور ↔ اسلام آباد • ایم ٹو موٹروے', origin: 'Lahore', destination: 'Islamabad' },
        { label: 'کراچی ↔ فیصل آباد • پورٹ قاسم کوریڈور', origin: 'Karachi', destination: 'Faisalabad' },
        { label: 'راولپنڈی ↔ پشاور • جی ٹی روڈ', origin: 'Rawalpindi', destination: 'Peshawar' },
        { label: 'ملتان ↔ سکھر • ایم فائیو ایکسپریس', origin: 'Multan', destination: 'Sukkur' },
        { label: 'کوئٹہ ↔ گوادر • سی پیک ہب', origin: 'Quetta', destination: 'Gwadar' }
      ]
    : [
        { label: 'Lahore ↔ Islamabad • M-2 Motorway', origin: 'Lahore', destination: 'Islamabad' },
        { label: 'Karachi ↔ Faisalabad • Port Corridor', origin: 'Karachi', destination: 'Faisalabad' },
        { label: 'Rawalpindi ↔ Peshawar • G.T. Road', origin: 'Rawalpindi', destination: 'Peshawar' },
        { label: 'Multan ↔ Sukkur • M-5 Express', origin: 'Multan', destination: 'Sukkur' },
        { label: 'Quetta ↔ Gwadar • CPEC Logistics Hub', origin: 'Quetta', destination: 'Gwadar' }
      ];

  const dispatchSteps = [
    {
      num: '01',
      tab: 'post',
      Icon: FileText,
      title: isUrdu ? 'کارگو پوسٹ کریں' : 'Post Cargo',
      sub: isUrdu
        ? 'وزن، روٹ اور منزل درج کریں اور تصدیق شدہ کیریئرز سے آفرز حاصل کریں۔'
        : 'Announce shipment availability and receive verified rates from trusted carriers.',
      cta: isUrdu ? 'کرایہ معلوم کریں اور تفصیل دیکھیں' : 'Calculate Fare & Explore Step',
      iconTheme: 'bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shadow-lg shadow-orange-500/35',
      numTheme: 'text-orange-400 border-orange-500/30 bg-orange-500/10'
    },
    {
      num: '02',
      tab: 'bilty',
      Icon: Truck,
      title: isUrdu ? 'ٹرک اور بلٹی تفویض' : 'Assign & Issue Bilty',
      sub: isUrdu
        ? 'کرایہ فائنل کریں اور کیو آر کوڈ والی ڈیجیٹل پی ڈی ایف بلٹی جاری کریں۔'
        : 'Lock freight rates and issue official digitally signed QR e-Bilty receipts.',
      cta: isUrdu ? 'ڈیجیٹل بلٹی نمونہ دیکھیں' : 'Preview QR e-Bilty & Details',
      iconTheme: 'bg-white text-slate-900 shadow-lg shadow-white/20',
      numTheme: 'text-slate-200 border-white/20 bg-white/10'
    },
    {
      num: '03',
      tab: 'tracking',
      Icon: CheckCircle2,
      title: isUrdu ? 'لائیو ٹریکنگ و ترسیل' : 'Live GPS & POD',
      sub: isUrdu
        ? 'نقشے پر لائیو سفر دیکھیں اور ڈیجیٹل پروف آف ڈیلیوری حاصل کریں۔'
        : 'Monitor transit corridors live on interactive maps with instant digital e-POD.',
      cta: isUrdu ? 'لائیو ٹریکنگ و تفصیلات دیکھیں' : 'View Live Dispatches & POD',
      iconTheme: 'bg-gradient-to-br from-cyan-400 to-teal-500 text-slate-950 shadow-lg shadow-cyan-500/35',
      numTheme: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10'
    }
  ];

  return (
    <div ref={heroParallaxRef} className="w-full overflow-x-clip flex flex-col text-white relative">
      {/* Single unified 60/120fps GPU highway backdrop shared cleanly across landing page */}
      <HighwayBackdrop variant="hero" fixed />

      {/* =====================================================================
          BAND 1: FUTURISTIC DARK HIGHWAY SPEED-STREAK HERO
         ===================================================================== */}
      <section
        id="hero"
        className="relative z-10 w-full overflow-hidden pt-5 pb-12 sm:pt-10 sm:pb-16 px-3 sm:px-4 scroll-mt-16"
      >

        <div className="max-w-5xl mx-auto relative z-10 text-center flex flex-col items-center">
          {/* Brand Emblem + Floating Desktop Telemetry Badges */}
          <div
            className="relative w-full flex flex-col items-center mb-3.5 sm:mb-5 perspective-1200 hero-reveal"
            style={{ animationDelay: '0ms' }}
          >
            <div
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B1325]/92 border border-cyan-400/25 shadow-lg text-[11px] font-semibold text-slate-100 absolute left-6 xl:left-14 top-1 float-slow pointer-events-none select-none"
              style={{ transform: 'translate3d(calc(var(--mx, 0) * -14px), calc(var(--my, 0) * -10px), 20px)' }}
            >
              <Radio size={13} className="text-orange-400 animate-pulse" />
              <span className={isUrdu ? 'font-urdu text-xs' : 'font-mono'}>
                {isUrdu ? 'لائیو نیٹ ورک' : 'LIVE FLEET RADAR'}
              </span>
            </div>

            <Tilt3DCard
              maxTilt={6}
              scale={1.03}
              glareOpacity={0.26}
              glareRoundedClass="rounded-2xl"
            >
              <div className="w-16 h-12 sm:w-28 sm:h-20 rounded-2xl bg-white/95 border border-white/30 shadow-[0_12px_32px_-8px_rgba(249,115,22,0.42)] ring-2 ring-orange-400/35 p-1.5 flex items-center justify-center preserve-3d">
                <img src="/logo.jpg?v=2" alt="E-CARGO-BILTY Main Logo" className="w-full h-full object-contain depth-z-md" />
              </div>
            </Tilt3DCard>
            <div className="h-1 w-12 rounded-full bg-gradient-to-r from-[#F97316] to-cyan-400 mt-2.5 sm:mt-3 shadow-xs" />

            <div
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B1325]/92 border border-emerald-400/25 shadow-lg text-[11px] font-semibold text-slate-100 absolute right-6 xl:right-14 top-2 float-slow-delayed pointer-events-none select-none"
              style={{ transform: 'translate3d(calc(var(--mx, 0) * 14px), calc(var(--my, 0) * 10px), 20px)' }}
            >
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className={isUrdu ? 'font-urdu text-xs' : 'font-mono'}>
                {isUrdu ? 'مصدقہ پی ڈی ایف بلٹی' : 'QR E-BILTY READY'}
              </span>
            </div>
          </div>

          {/* Top Dark Glass Network Tag */}
          <div
            className="inline-flex items-center gap-2 max-w-[92vw] sm:max-w-none px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-white/15 bg-[#0F1930]/92 shadow-sm mb-3.5 sm:mb-5 select-none hero-reveal"
            style={{ animationDelay: '90ms' }}
          >
            <span className="w-2 h-2 rounded-full bg-[#F89020] animate-pulse shrink-0" />
            <span className={`text-[9.5px] sm:text-xs tracking-[0.11em] sm:tracking-widest uppercase font-bold leading-snug ${isUrdu ? 'font-urdu text-xs sm:text-sm text-orange-200' : 'font-sans text-orange-200'}`}>
              {t('homeTag')}
            </span>
          </div>

          {/* High-Impact Display Headline */}
          <h1
            className={`font-black mb-3.5 sm:mb-5 tracking-tight text-white ${
              isUrdu
                ? 'text-[clamp(1.7rem,6.8vw,3.5rem)] font-urdu leading-normal hero-reveal'
                : 'text-[clamp(1.6rem,6.6vw,3.75rem)] leading-[1.12]'
            }`}
            style={isUrdu ? { animationDelay: '170ms' } : undefined}
          >
            <span className={isUrdu ? 'block' : 'block overflow-hidden'}>
              <span className={isUrdu ? '' : 'clip-reveal'} style={isUrdu ? undefined : { animationDelay: '170ms' }}>
                {t('homeTitle1')}
              </span>
            </span>
            <span className={isUrdu ? 'block mt-1' : 'block overflow-hidden mt-0.5'}>
              <span className={isUrdu ? '' : 'clip-reveal'} style={isUrdu ? undefined : { animationDelay: '280ms' }}>
                {t('homeTitle2')}
              </span>
            </span>
            <span className={isUrdu ? 'block mt-1' : 'block overflow-hidden mt-1'}>
              <span
                className={`${isUrdu ? 'text-orange-400' : 'clip-reveal text-shimmer-amber'}`}
                style={isUrdu ? undefined : { animationDelay: '400ms' }}
              >
                {isUrdu ? 'پاکستان بھر میں محفوظ ترسیل' : 'Across Pakistan'}
              </span>
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className={`text-[13px] sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-6 sm:mb-7 leading-relaxed font-normal px-1 sm:px-0 hero-reveal ${isUrdu ? 'font-urdu' : ''}`}
            style={{ animationDelay: '520ms' }}
          >
            {t('homeDesc')}
          </p>

          {/* Hero CTAs */}
          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 mb-7 sm:mb-8 w-full max-w-xs sm:max-w-none mx-auto hero-reveal"
            style={{ animationDelay: '630ms' }}
          >
            {!currentUser ? (
              <>
                <Link
                  to="/login"
                  className="cta-shine group px-6 sm:px-7 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#F97316] hover:to-[#FB923C] shadow-[0_10px_24px_-5px_rgba(249,115,22,0.62)] hover:-translate-y-0.5 transition-transform duration-200 flex items-center justify-center gap-2"
                >
                  <span>{t('login')}</span>
                  <ArrowRight size={16} className={`transition-transform duration-200 group-hover:translate-x-1 ${isUrdu ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </Link>
                <Link
                  to="/register"
                  className="px-6 sm:px-7 py-3 rounded-xl text-sm font-bold bg-white text-slate-950 hover:bg-slate-100 shadow-[0_10px_20px_-6px_rgba(255,255,255,0.28)] hover:-translate-y-0.5 transition-transform duration-200 text-center"
                >
                  {t('register')}
                </Link>
              </>
            ) : (
              <Link
                to={getRoleDashboardPath(userData?.role) || '/business/dashboard'}
                className="cta-shine group px-7 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#EA580C] to-[#F97316] shadow-[0_10px_24px_-5px_rgba(249,115,22,0.62)] flex items-center justify-center gap-2"
              >
                <span>{t('dashboard')}</span>
                <ArrowRight size={16} className={isUrdu ? 'rotate-180' : ''} />
              </Link>
            )}
          </div>

          {/* 3 Interactive Dark Glass Capability Pills inside Hero */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 max-w-3xl mx-auto w-full">
            {heroFeatures.map(({ Icon, label, chipBg, tab }, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => openExplorer(tab)}
                className="hero-reveal flex items-center justify-center sm:justify-start gap-2.5 px-3.5 sm:px-4 py-2.5 rounded-xl bg-[#0B1325]/92 border border-white/15 hover:border-orange-400/60 shadow-md text-xs font-semibold text-slate-100 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                style={{ animationDelay: `${740 + idx * 90}ms` }}
              >
                <span className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${chipBg}`}>
                  <Icon size={14} />
                </span>
                <span className={isUrdu ? 'font-urdu text-sm' : 'truncate'}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          BAND 2: DARK FROSTED CORRIDORS MARQUEE STRIP (CLICKABLE TO CALCULATOR)
         ===================================================================== */}
      <div className="-mt-6 sm:-mt-8 relative z-20 px-3 sm:px-4 w-full max-w-5xl mx-auto hero-reveal" style={{ animationDelay: '960ms' }}>
        <div className="rounded-2xl bg-[#0B1325]/96 border border-white/15 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.82)] px-3 py-2 sm:px-3.5 sm:py-2.5 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#EA580C]/25 to-[#F97316]/15 border border-orange-500/35 text-orange-200 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#F89020] animate-pulse" />
            <span>{isUrdu ? 'قومی فریٹ کوریڈورز' : 'E-CARGO BILTY NETWORK'}</span>
          </div>
          <div dir="ltr" className="w-full sm:flex-1 min-w-0 overflow-hidden marquee-mask select-none">
            <div className="marquee-track gap-2.5 sm:gap-3 py-0.5">
              {[...corridors, ...corridors].map((corridor, i) => (
                <button
                  key={`${corridor.label}-${i}`}
                  type="button"
                  onClick={() => openExplorer('post', corridor.origin, corridor.destination)}
                  className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1 rounded-full bg-white/[0.06] hover:bg-orange-500/20 border border-white/10 hover:border-orange-400/50 text-[11px] font-semibold text-slate-200 hover:text-white whitespace-nowrap cursor-pointer transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F89020] shrink-0" />
                  <span className={isUrdu ? 'font-urdu text-xs' : 'font-mono'}>{corridor.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          BAND 3 (CENTER): UNIFIED DARK GLASS FLEET SHOWCASE & DISPATCH WORKFLOW
         ===================================================================== */}
      <section
        id="fleet"
        className="relative z-10 w-full py-8 sm:py-16 px-3 sm:px-4 overflow-hidden scroll-mt-16"
      >
        <div className="max-w-5xl mx-auto rounded-2xl sm:rounded-[28px] bg-[#0B1325]/88 border border-white/15 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.85)] p-3.5 sm:p-8 relative z-10">
          {/* Sleek Dark Editorial Section Header */}
          <RevealOnScroll variant="cinematic" className="text-center max-w-2xl mx-auto mb-5 sm:mb-7">
            <div className="inline-flex items-center gap-2 max-w-full px-3 sm:px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/12 text-[9.5px] sm:text-[11px] font-bold tracking-[0.12em] sm:tracking-widest uppercase text-orange-300 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F89020] animate-pulse shrink-0" />
              <span className={isUrdu ? 'font-urdu text-xs' : 'font-mono'}>{t('poetrySubtext')}</span>
            </div>
            <h2 className={`text-base sm:text-2xl font-black text-white leading-snug ${isUrdu ? 'font-urdu text-xl sm:text-2xl' : ''}`}>
              {t('poetryBanner')}
            </h2>
            <div className="h-1 w-14 rounded-full bg-gradient-to-r from-[#F97316] to-cyan-400 mx-auto mt-3" />
          </RevealOnScroll>

          {/* Two Interactive Pakistani Fleet Photo Cards (Dark Framed + 3D Converge) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-6 sm:mb-8 text-left perspective-1200">
            <RevealOnScroll variant="left" delay={0}>
              <TruckPhotoShowcase
                dark
                image="/images/auth_bg.jpg?v=2"
                caption="قومی شاہراہ نیٹ ورک • ہیوی کیریئر فلیٹ"
                subcaption="National Commercial Carrier • Verified Logistics Fleet"
                tag="معیاری خدمات"
                tagEn="Quality Logistics"
                onClick={() => openExplorer('fleet')}
                ctaLabel={
                  isUrdu
                    ? `لائیو فلیٹ (${publicOverview?.stats?.totalTrucks ?? '...'})`
                    : `Inspect Live Fleet (${publicOverview?.stats?.totalTrucks ?? 'Fleet'})`
                }
              />
            </RevealOnScroll>
            <RevealOnScroll variant="right" delay={140}>
              <TruckPhotoShowcase
                dark
                image="/images/pakistan_truck_1.jpg"
                caption="ای کارگو باربرداری • محفوظ اور بروقت ترسیل"
                subcaption="E-Cargo Bilty Network • Verified Nationwide Dispatch"
                tag="محفوظ ترسیل"
                tagEn="Safe Transit"
                onClick={() => openExplorer('tracking')}
                ctaLabel={
                  isUrdu
                    ? `لائیو ٹریکنگ و روٹس`
                    : `Live Routes & Dispatches`
                }
              />
            </RevealOnScroll>
          </div>

          {/* 3 Interactive Dark Dispatch Flow Cards */}
          <div id="workflow" className="relative pt-2 scroll-mt-20">
            <div
              className="hidden md:block absolute left-16 right-16 top-12 route-connector opacity-75 pointer-events-none"
              aria-hidden="true"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 relative z-10 items-stretch perspective-1200">
              {dispatchSteps.map(({ num, tab, Icon, title, sub, cta, iconTheme, numTheme }, idx) => (
                <RevealOnScroll key={num} variant="flip" delay={idx * 120} className="h-full">
                  <Tilt3DCard
                    maxTilt={4}
                    scale={1.015}
                    glareOpacity={0.18}
                    glareRoundedClass="rounded-2xl"
                    className="h-full"
                  >
                    <button
                      type="button"
                      onClick={() => openExplorer(tab)}
                      className={`w-full h-full rounded-2xl bg-gradient-to-br from-[#0F1B33]/96 via-[#12203B]/96 to-[#0B1325]/96 border border-white/15 hover:border-orange-400/70 p-4 sm:p-5 shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer preserve-3d ${isUrdu ? 'text-right' : 'text-left'}`}
                    >
                      <div className="depth-z-sm">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 ${iconTheme}`}>
                            <Icon size={20} />
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${numTheme}`}>
                            {num}
                          </span>
                        </div>
                        <h4 className={`text-base font-extrabold text-white mb-1.5 ${isUrdu ? 'font-urdu text-lg' : ''}`}>
                          {title}
                        </h4>
                        <p className={`text-xs text-slate-300 leading-relaxed ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                          {sub}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/10 w-full flex items-center justify-between text-[11px] font-bold text-orange-300 group-hover:text-orange-200 depth-z-sm">
                        <span className={isUrdu ? 'font-urdu text-xs' : ''}>{cta}</span>
                        <ArrowRight size={14} className={`transition-transform duration-200 group-hover:translate-x-1 ${isUrdu ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                      </div>
                    </button>
                  </Tilt3DCard>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          BAND 4 (LAST): DARK HIGHWAY ARENA WITH 4 ROLE PORTAL CARDS & FOOTER
         ===================================================================== */}
      <section
        id="portals"
        className="relative z-10 w-full overflow-hidden py-8 sm:py-16 px-3 sm:px-4 scroll-mt-16"
      >
        <div className="max-w-5xl mx-auto relative z-10">
          {/* Dark Obsidian Portal Container */}
          <RevealOnScroll variant="up" threshold={0.05}>
            <div className="rounded-2xl sm:rounded-[28px] bg-[#0B1325]/88 border border-white/15 shadow-[0_24px_64px_-15px_rgba(0,0,0,0.85)] p-3.5 sm:p-8">
              <div className="text-center mb-5 sm:mb-6">
                <span className={`inline-block text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-orange-400 mb-1 ${isUrdu ? 'font-urdu text-sm' : 'font-mono'}`}>
                  {isUrdu ? 'پورٹل منتخب کریں' : 'DEDICATED ROLE WORKSPACES'}
                </span>
                <h2 className={`text-xl sm:text-2xl font-black text-white ${isUrdu ? 'font-urdu' : ''}`}>
                  {isUrdu ? 'اپنے لاجسٹکس پورٹل میں داخل ہوں' : 'Choose Your Logistics Portal'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 perspective-1200">
                {portalCards.map(({ to, Icon, roleLabel, title, desc, surfaceStyle, cardTheme, iconTheme, badgeTheme, accentText, barTheme }, idx) => (
                  <RevealOnScroll key={to} variant="deck3d" delay={idx * 105} className="h-full">
                    <Tilt3DCard
                      maxTilt={5}
                      scale={1.02}
                      glareOpacity={0.22}
                      glareRoundedClass="rounded-2xl"
                      className="h-full"
                    >
                      <Link
                        to={to}
                        style={surfaceStyle}
                        className={`flex flex-col justify-between h-full ${cardTheme} rounded-2xl p-4 sm:p-5 text-white group relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] preserve-3d ${isUrdu ? 'text-right' : 'text-left'}`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3.5 sm:mb-4 depth-z-sm">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0 ${iconTheme}`}>
                              <Icon size={21} />
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeTheme} ${isUrdu ? 'font-urdu text-xs' : 'font-sans'}`}>
                              {roleLabel}
                            </span>
                          </div>

                          <div className="depth-z-sm">
                            <h3 className={`text-base font-extrabold text-white mb-2 flex items-start justify-between gap-2 leading-snug ${isUrdu ? 'font-urdu text-lg' : ''}`}>
                              <span>{title}</span>
                              <ArrowRight size={16} className={`${accentText} mt-1 group-hover:translate-x-1 transition-transform duration-300 shrink-0 ${isUrdu ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                            </h3>
                            <p className={`text-xs text-slate-300 leading-relaxed font-normal ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                              {desc}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`absolute bottom-0 ${isUrdu ? 'right-0' : 'left-0'} h-1 w-0 ${barTheme} group-hover:w-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`}
                        />
                      </Link>
                    </Tilt3DCard>
                  </RevealOnScroll>
                ))}
              </div>
            </div>
          </RevealOnScroll>

          {/* Dark Artisan Footer */}
          <RevealOnScroll variant="up" className="mt-10 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-300 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-9 rounded-lg bg-white border border-white/20 px-1 py-0.5 flex items-center justify-center shadow-sm shrink-0">
                <img src="/logo.jpg?v=2" alt="E-CARGO-BILTY" className="w-full h-full object-contain" />
              </div>
              <WorkshopBadge dark />
            </div>
            <span className={`text-[11px] text-slate-400 font-bold ${isUrdu ? 'font-urdu' : 'font-mono'}`}>
              {t('footerText')}
            </span>
          </RevealOnScroll>
        </div>
      </section>

      <LandingExplorerModal
        key={`${explorerState.open}-${explorerState.origin}-${explorerState.destination}`}
        isOpen={explorerState.open}
        activeTab={explorerState.tab}
        onTabChange={(nextTab) => setExplorerState((prev) => ({ ...prev, tab: nextTab }))}
        onClose={() => setExplorerState((prev) => ({ ...prev, open: false }))}
        initialOrigin={explorerState.origin}
        initialDestination={explorerState.destination}
        overview={publicOverview}
        isUrdu={isUrdu}
      />
    </div>
  );
};

/**
 * AndroidBackButtonHandler
 * Listens to Android hardware/gesture back button.
 * If user is on a root/home/login screen ('/', '/login', '/register'), it exits the app.
 * Otherwise, it navigates back in history.
 */
function AndroidBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let handle;

    const setupListener = async () => {
      try {
        handle = await CapApp.addListener('backButton', () => {
          const backEvent = new CustomEvent('ecargo:ui-back', { cancelable: true });
          if (!window.dispatchEvent(backEvent)) {
            return;
          }
          if (location.pathname === '/' || location.pathname === '/login') {
            CapApp.exitApp();
          } else {
            window.history.back();
          }
        });
      } catch (err) {
        // Native Capacitor plugin unavailable in standard desktop browser
      }
    };

    setupListener();

    return () => {
      if (handle && typeof handle.remove === 'function') {
        handle.remove();
      }
    };
  }, [location.pathname, navigate]);

  return null;
}

function App() {
  return (
    <Router>
      <AndroidBackButtonHandler />
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <div className="min-h-[100dvh] flex flex-col bg-[#060B16] text-slate-100 relative">
              {/* Subtle persistent ambient obsidian command aura (pre-feathered radial gradients, zero blur FBOs) */}
              <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 overflow-hidden z-0"
                style={{
                  background: [
                    'radial-gradient(640px circle at 8% 4%, rgba(249, 115, 22, 0.085) 0%, rgba(249, 115, 22, 0.025) 40%, transparent 72%)',
                    'radial-gradient(560px circle at 92% 16%, rgba(34, 211, 238, 0.075) 0%, rgba(34, 211, 238, 0.02) 42%, transparent 72%)',
                  ].join(', '),
                }}
              />
              <Navbar />
              <main className="flex-1 flex flex-col relative z-10">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  {/* Admin Portals */}
                  <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

                  {/* Fleet Owner / Truck Owner Portals */}
                  <Route path="/truck-owner" element={<ProtectedRoute allowedRoles={['truck_owner', 'fleet_owner', 'driver']}><TruckOwnerDashboard /></ProtectedRoute>} />
                  <Route path="/truck-owner/dashboard" element={<ProtectedRoute allowedRoles={['truck_owner', 'fleet_owner', 'driver']}><TruckOwnerDashboard /></ProtectedRoute>} />
                  <Route path="/fleet-owner" element={<ProtectedRoute allowedRoles={['truck_owner', 'fleet_owner', 'driver']}><TruckOwnerDashboard /></ProtectedRoute>} />
                  <Route path="/fleet-owner/dashboard" element={<ProtectedRoute allowedRoles={['truck_owner', 'fleet_owner', 'driver']}><TruckOwnerDashboard /></ProtectedRoute>} />
                  <Route path="/fleet" element={<ProtectedRoute allowedRoles={['truck_owner', 'fleet_owner', 'driver']}><TruckOwnerDashboard /></ProtectedRoute>} />
                  <Route path="/fleet/dashboard" element={<ProtectedRoute allowedRoles={['truck_owner', 'fleet_owner', 'driver']}><TruckOwnerDashboard /></ProtectedRoute>} />

                  {/* Transporter Portals */}
                  <Route path="/transporter" element={<ProtectedRoute allowedRoles={['transporter']}><TransporterDashboard /></ProtectedRoute>} />
                  <Route path="/transporter/dashboard" element={<ProtectedRoute allowedRoles={['transporter']}><TransporterDashboard /></ProtectedRoute>} />

                  {/* Business / Shipper Portals */}
                  <Route path="/business" element={<ProtectedRoute allowedRoles={['business', 'shipper']}><BusinessDashboard /></ProtectedRoute>} />
                  <Route path="/business/dashboard" element={<ProtectedRoute allowedRoles={['business', 'shipper']}><BusinessDashboard /></ProtectedRoute>} />
                  <Route path="/shipper" element={<ProtectedRoute allowedRoles={['business', 'shipper']}><BusinessDashboard /></ProtectedRoute>} />
                  <Route path="/shipper/dashboard" element={<ProtectedRoute allowedRoles={['business', 'shipper']}><BusinessDashboard /></ProtectedRoute>} />
                  <Route path="*" element={
                    <div className="min-h-[65vh] flex flex-col items-center justify-center px-4 text-center">
                      <div className="max-w-md w-full rounded-3xl bg-[#0B1325]/96 border border-white/15 p-8 shadow-[0_24px_56px_rgba(0,0,0,0.75)]">
                        <p className="text-xs font-mono uppercase tracking-widest text-orange-400 font-bold mb-2">404 — Route Not Found</p>
                        <h1 className="text-2xl sm:text-3xl font-black text-white mb-3">Page Not Available</h1>
                        <p className="text-sm text-slate-300 max-w-md mb-6">The requested logistics portal page does not exist or has been moved.</p>
                        <Link to="/" className="btn-primary px-5 py-2.5 text-sm font-bold">Return to Home</Link>
                      </div>
                    </div>
                  } />
                </Routes>
              </main>
            </div>
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
