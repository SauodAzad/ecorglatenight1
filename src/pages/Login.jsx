import { useState, useEffect, useRef } from 'react';
import Tilt3DCard, { useParallaxRef } from '../components/Tilt3DCard';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Radio,
  Globe,
  Check
} from 'lucide-react';
import {
  UrduMotto,
  TruckBackground,
  NazarBattuBadge
} from '../components/TruckArt';
import { DEFAULT_SERVER_IP, getStoredServerIP, getServerBaseUrl, setStoredServerIP, testServerHealth } from '../api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getRoleDashboardPath = (role) => {
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
      return '/';
  }
};

const validateEmail = (value, isUrdu) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return isUrdu ? 'ای میل ایڈریس درج کرنا لازمی ہے' : 'Email address is required';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return isUrdu ? 'درست ای میل درج کریں (مثلاً name@domain.com)' : 'Please enter a valid email address';
  }
  return '';
};

const validatePassword = (value, isUrdu) => {
  if (!value) {
    return isUrdu ? 'پاس ورڈ درج کرنا لازمی ہے' : 'Password is required';
  }
  if (value.length < 6) {
    return isUrdu ? 'پاس ورڈ کم از کم 6 حروف پر مشتمل ہونا چاہیے' : 'Password must be at least 6 characters';
  }
  return '';
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dynamic Server IP Switcher State (collapsed by default; opens on demand or network error)
  const [serverIpInput, setServerIpInput] = useState(() => getStoredServerIP());
  const [currentServerUrl, setCurrentServerUrl] = useState(() => getServerBaseUrl());
  const [showIpEditor, setShowIpEditor] = useState(false);
  const [savingIp, setSavingIp] = useState(false);
  const [ipStatus, setIpStatus] = useState({ message: '', ok: true });

  const parallaxRef = useParallaxRef();
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const { login, currentUser, userData } = useAuth();
  const { t, isUrdu } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (currentUser && userData?.role) {
      navigate(getRoleDashboardPath(userData.role), { replace: true });
    }
  }, [currentUser, userData, navigate]);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const handleEmailChange = (val) => {
    setEmail(val);
    if (touched.email) {
      setEmailError(validateEmail(val, isUrdu));
    }
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (touched.password) {
      setPasswordError(validatePassword(val, isUrdu));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setEmailError(validateEmail(email, isUrdu));
    } else if (field === 'password') {
      setPasswordError(validatePassword(password, isUrdu));
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true });

    const eErr = validateEmail(email, isUrdu);
    const pErr = validatePassword(password, isUrdu);
    setEmailError(eErr);
    setPasswordError(pErr);

    if (eErr) {
      emailInputRef.current?.focus();
      return;
    }
    if (pErr) {
      passwordInputRef.current?.focus();
      return;
    }

    try {
      setError('');
      setLoading(true);
      const res = await login(email.trim(), password);
      const userRole = res?.user?.role;
      const rolePath = getRoleDashboardPath(userRole);
      const fromPath = location.state?.from?.pathname;
      const targetPath = (fromPath && fromPath !== '/' && fromPath !== '/login') ? fromPath : rolePath;
      navigate(targetPath, { replace: true });
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg);
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || err.message?.includes('Network')) {
        const activeUrl = getServerBaseUrl();
        setShowIpEditor(true);
        setError(
          isUrdu
            ? `سرور (${activeUrl}) سے رابطہ نہیں ہو سکا۔ برائے مہربانی نیچے نیا آئی پی ایڈریس درج کر کے محفوظ کریں یا Wi-Fi چیک کریں۔`
            : `Cannot reach backend at ${activeUrl}. Please ensure your device is on the same Wi-Fi or update the Server IP below.`
        );
      } else {
        setError(
          err.message ||
            (isUrdu
              ? 'لاگ ان ناکام رہا۔ برائے مہربانی اپنی معلومات چیک کریں۔'
              : 'Failed to sign in. Please check your credentials.')
        );
      }
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveIp = async () => {
    const trimmed = serverIpInput.trim();
    if (!trimmed) return;
    setSavingIp(true);
    setIpStatus({ message: '', ok: true });
    const newBaseUrl = setStoredServerIP(trimmed);
    setCurrentServerUrl(newBaseUrl);
    const healthy = await testServerHealth(newBaseUrl);
    setSavingIp(false);
    if (healthy) {
      setError('');
      setIpStatus({
        message: isUrdu ? `رابطہ کامیاب! (${newBaseUrl})` : `Connected to ${newBaseUrl}`,
        ok: true
      });
    } else {
      setIpStatus({
        message: isUrdu
          ? `آئی پی محفوظ ہو گیا، مگر ${newBaseUrl} سے جواب نہیں ملا۔ Wi-Fi چیک کریں۔`
          : `Saved IP, but cannot reach ${newBaseUrl}. Check Wi-Fi & server.`,
        ok: false
      });
    }
  };

  const handleResetIp = async () => {
    setServerIpInput(DEFAULT_SERVER_IP);
    setSavingIp(true);
    setIpStatus({ message: '', ok: true });
    const newBaseUrl = setStoredServerIP('');
    setCurrentServerUrl(newBaseUrl);
    const healthy = await testServerHealth(newBaseUrl);
    setSavingIp(false);
    setIpStatus({
      message: healthy
        ? (isUrdu ? `ڈیفالٹ آئی پی پر بحال اور منسلک (${newBaseUrl})` : `Reset to default & connected (${newBaseUrl})`)
        : (isUrdu ? `ڈیفالٹ آئی پی پر بحال: ${newBaseUrl}` : `Reset to default: ${newBaseUrl}`),
      ok: healthy
    });
  };

  const isEmailValid = touched.email && !validateEmail(email, isUrdu);
  const isPasswordValid = touched.password && !validatePassword(password, isUrdu);

  const getFieldBoxClass = (hasErr, isValid) => {
    if (hasErr) return 'border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-500/10';
    if (isValid) return 'border-emerald-500/45 bg-[#0F1930]/85 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/25';
    return 'border-white/15 bg-[#0F1930]/85 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/25';
  };

  const getIconTone = (hasErr, isValid) => {
    if (hasErr) return 'text-rose-400';
    if (isValid) return 'text-emerald-400';
    return 'text-slate-400 group-focus-within:text-orange-400';
  };

  return (
    <div ref={parallaxRef} className="flex-1 flex flex-col relative">
      {/* Viewport-Fixed Pakistani Truck Art Backdrop with Glossy Frosted Blur & Parallax */}
      <TruckBackground image="/images/auth_bg.jpg?v=2" opacity="opacity-100" glossyBlur />

      {/* 3D Floating Telemetry Badges pinned in Viewport Gutters on XL Screens */}
      <div className="hidden xl:block fixed inset-0 pointer-events-none select-none z-20 perspective-1200">
        <div
          className="absolute left-6 2xl:left-16 top-[28%] transition-transform duration-150 ease-out"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * -18px), calc(var(--my, 0) * -14px), 36px)'
          }}
        >
          <div className="px-3.5 py-2 rounded-xl bg-[#0B1325]/95 border border-white/15 shadow-[0_14px_34px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center gap-2 text-xs font-semibold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <Radio size={14} className="text-orange-400" />
            <span className={isUrdu ? 'font-urdu text-xs text-slate-100' : 'font-mono text-[11px] text-slate-100'}>
              {isUrdu ? 'ملک گیر نیٹ ورک • فعال' : 'Nationwide Network • Active'}
            </span>
          </div>
        </div>

        <div
          className="absolute right-6 2xl:right-16 top-[36%] transition-transform duration-150 ease-out"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 18px), calc(var(--my, 0) * 14px), 44px)'
          }}
        >
          <div className="px-3.5 py-2 rounded-xl bg-[#0B1325]/95 border border-white/15 shadow-[0_14px_34px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center gap-2 text-xs font-semibold text-slate-200">
            <ShieldCheck size={16} className="text-cyan-400" />
            <span className={isUrdu ? 'font-urdu text-xs text-slate-100' : 'font-mono text-[11px] text-slate-100'}>
              {isUrdu ? '۱۰۰٪ مصدقہ ڈیجیٹل بلٹی' : '100% Verified e-Bilty'}
            </span>
          </div>
        </div>
      </div>

      {/* Centered 3D Login Stage */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100dvh-4.5rem)] py-6 sm:py-9 px-3.5 sm:px-4 relative z-10 perspective-1200">
        <div className="w-full max-w-[440px] sm:max-w-[460px] z-10 my-auto page-enter preserve-3d">
          <Tilt3DCard
            maxTilt={3.2}
            scale={1.01}
            glareOpacity={0.2}
            glareRoundedClass="rounded-2xl sm:rounded-3xl"
            className="w-full preserve-3d"
          >
            <div className="relative rounded-2xl sm:rounded-3xl preserve-3d">
              {/* Clipped Surface Backdrop & Top Accent Ribbon (separate so preserve-3d depth stays intact) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-[0_28px_72px_-15px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/5 bg-[#0B1325]/96"
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-[#EA580C] via-[#F89020] to-cyan-400" />
              </div>

              <div className="p-5 sm:p-7 pt-6 sm:pt-8 relative z-10 preserve-3d">
                {/* Branded 3D Header */}
                <div className="text-center mb-5 preserve-3d">
                  <div className="flex justify-center mb-3 depth-z-md">
                    <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-2xl bg-white flex items-center justify-center border border-white/25 shadow-[0_12px_28px_rgba(249,115,22,0.28)] overflow-hidden p-1.5 preserve-light shrink-0">
                      <img src="/logo.jpg?v=2" alt="E-CARGO-BILTY" className="w-full h-full object-contain" />
                    </div>
                  </div>

                  <h1 className={`text-xl sm:text-2xl font-black text-white mb-1 tracking-tight depth-z-sm ${isUrdu ? 'font-urdu text-2xl' : ''}`}>
                    {t('loginWelcome')}
                  </h1>
                  <p className={`text-xs sm:text-[13px] text-slate-300 mb-2.5 font-normal ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                    {t('loginSub')}
                  </p>

                  <div className="flex items-center justify-center gap-2 flex-wrap depth-z-sm">
                    <UrduMotto />
                    <NazarBattuBadge />
                  </div>
                </div>

                {/* Error Alert Banner */}
                {error && (
                  <div
                    role="alert"
                    className={`mb-4 p-3 bg-rose-500/15 border border-rose-500/45 rounded-xl flex items-start gap-2.5 text-rose-200 text-xs font-semibold shadow-xs ${
                      isUrdu ? 'flex-row-reverse text-right' : 'text-left'
                    }`}
                  >
                    <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    <span className={isUrdu ? 'font-urdu text-sm leading-snug' : 'leading-snug'}>{error}</span>
                  </div>
                )}

                {/* Login Form */}
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  dir={isUrdu ? 'rtl' : 'ltr'}
                  className={`space-y-4 ${isUrdu ? 'text-right' : 'text-left'}`}
                >
                  {/* Email Input Field */}
                  <div className="group">
                    <label
                      htmlFor="login-email"
                      className={`block text-[11px] font-bold uppercase tracking-wider mb-1 transition-colors ${
                        emailError && touched.email
                          ? 'text-rose-400'
                          : 'text-slate-200 group-focus-within:text-orange-400'
                      } ${isUrdu ? 'font-urdu text-xs' : ''}`}
                    >
                      {t('emailLabel')}
                    </label>
                    <div className={`relative rounded-xl border transition-colors duration-150 ${getFieldBoxClass(Boolean(emailError && touched.email), isEmailValid)}`}>
                      <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none transition-colors ${getIconTone(Boolean(emailError && touched.email), isEmailValid)}`}>
                        <Mail size={15} />
                      </div>
                      <input
                        id="login-email"
                        ref={emailInputRef}
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        dir="ltr"
                        aria-invalid={Boolean(emailError && touched.email)}
                        className={`block w-full rounded-xl ${isUrdu ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8 text-left'} py-2.5 bg-transparent border-0 focus:outline-none text-white placeholder-slate-400 text-[15px] sm:text-sm font-medium`}
                        placeholder={t('emailPlaceholder')}
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={() => handleBlur('email')}
                      />
                      {isEmailValid && (
                        <Check size={14} className={`absolute top-1/2 -translate-y-1/2 ${isUrdu ? 'left-3' : 'right-3'} text-emerald-400 pointer-events-none`} />
                      )}
                    </div>
                    {emailError && touched.email && (
                      <p className={`flex items-center gap-1 text-rose-400 text-[11px] font-semibold mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{emailError}</span>
                      </p>
                    )}
                  </div>

                  {/* Password Input Field */}
                  <div className="group">
                    <label
                      htmlFor="login-password"
                      className={`block text-[11px] font-bold uppercase tracking-wider mb-1 transition-colors ${
                        passwordError && touched.password
                          ? 'text-rose-400'
                          : 'text-slate-200 group-focus-within:text-orange-400'
                      } ${isUrdu ? 'font-urdu text-xs' : ''}`}
                    >
                      {t('passwordLabel')}
                    </label>
                    <div className={`relative rounded-xl border transition-colors duration-150 ${getFieldBoxClass(Boolean(passwordError && touched.password), isPasswordValid)}`}>
                      <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none transition-colors ${getIconTone(Boolean(passwordError && touched.password), isPasswordValid)}`}>
                        <Lock size={15} />
                      </div>
                      <input
                        id="login-password"
                        ref={passwordInputRef}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        dir="ltr"
                        aria-invalid={Boolean(passwordError && touched.password)}
                        className={`block w-full rounded-xl ${isUrdu ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'} py-2.5 bg-transparent border-0 focus:outline-none text-white placeholder-slate-400 text-[15px] sm:text-sm font-medium`}
                        placeholder={t('passwordPlaceholder')}
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        onBlur={() => handleBlur('password')}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute inset-y-0 ${isUrdu ? 'left-0 pl-2.5 pr-1.5' : 'right-0 pr-2.5 pl-1.5'} flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer`}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordError && touched.password && (
                      <p className={`flex items-center gap-1 text-rose-400 text-[11px] font-semibold mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{passwordError}</span>
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-1.5 depth-z-sm">
                    <button
                      disabled={loading}
                      type="submit"
                      className={`cta-shine w-full relative group overflow-hidden rounded-xl py-2.5 sm:py-3 px-4 text-white font-bold text-sm tracking-wide bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#F97316] hover:to-[#FB923C] shadow-[0_12px_28px_-6px_rgba(249,115,22,0.58)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${isUrdu ? 'font-urdu text-base' : ''}`}
                    >
                      <div className="relative flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            <span>{t('signingIn')}</span>
                          </>
                        ) : (
                          <>
                            <span>{t('signInBtn')}</span>
                            <ArrowRight
                              size={16}
                              className={`transition-transform duration-200 ${
                                isUrdu
                                  ? 'rotate-180 group-hover:-translate-x-1'
                                  : 'group-hover:translate-x-1'
                              }`}
                            />
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                </form>

                {/* Bottom Register Link */}
                <div className={`mt-4 pt-3.5 border-t border-white/12 text-center text-xs text-slate-300 font-medium ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                  {t('dontHaveAccount')}{' '}
                  <Link
                    to="/register"
                    className="text-orange-400 hover:text-orange-300 transition-colors font-bold underline underline-offset-4"
                  >
                    {t('registerHere')}
                  </Link>
                </div>

                {/* Compact Server Connection Utility */}
                <div className="mt-3 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-400 flex-wrap">
                    <Globe size={12} className="text-orange-400 shrink-0" />
                    <span dir="ltr" className="inline-flex items-center gap-1">
                      <span>Server:</span>
                      <span className="text-slate-100 font-semibold">{currentServerUrl}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowIpEditor(!showIpEditor)}
                      className={`text-orange-400 hover:text-orange-300 font-bold hover:underline cursor-pointer ms-1 ${isUrdu ? 'font-urdu text-xs' : 'font-sans'}`}
                    >
                      ({showIpEditor ? (isUrdu ? 'چھپائیں' : 'Hide') : (isUrdu ? 'آئی پی تبدیل کریں' : 'Change IP')})
                    </button>
                  </div>

                  {showIpEditor && (
                    <div className="flex items-center gap-1.5 max-w-xs mx-auto modal-enter">
                      <input
                        type="text"
                        dir="ltr"
                        value={serverIpInput}
                        onChange={(e) => setServerIpInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveIp();
                          }
                        }}
                        placeholder="192.168.18.93"
                        aria-label="Server IP Address"
                        className="flex-1 min-w-0 bg-[#0F1930]/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleSaveIp}
                        disabled={savingIp || !serverIpInput.trim()}
                        className="btn-primary text-xs !py-1.5 !px-3 font-bold shrink-0 shadow-2xs cursor-pointer disabled:opacity-60 flex items-center gap-1"
                      >
                        {savingIp ? <Loader2 size={12} className="animate-spin" /> : (isUrdu ? 'محفوظ' : 'Save')}
                      </button>
                      {serverIpInput !== DEFAULT_SERVER_IP && (
                        <button
                          type="button"
                          onClick={handleResetIp}
                          title="Reset to default IP"
                          className="text-slate-400 hover:text-white text-xs px-1.5 py-1 rounded hover:bg-white/10 font-medium cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  )}

                  {ipStatus.message && (
                    <p
                      className={`text-[11px] font-medium flex items-center justify-center gap-1 ${
                        ipStatus.ok ? 'text-emerald-300' : 'text-amber-300'
                      } ${isUrdu ? 'font-urdu text-xs' : ''}`}
                    >
                      {ipStatus.ok && <Check size={12} className="shrink-0" />}
                      <span>{ipStatus.message}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Tilt3DCard>
        </div>
      </div>
    </div>
  );
}
