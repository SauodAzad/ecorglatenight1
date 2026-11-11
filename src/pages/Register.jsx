import { useRef, useState } from 'react';
import Tilt3DCard, { useParallaxRef } from '../components/Tilt3DCard';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Phone,
  CreditCard,
  Building2,
  Hash,
  AlertCircle,
  Loader2,
  Shield,
  ShieldCheck,
  Radio,
  ArrowRight,
  Truck,
  Briefcase,
  Globe,
  Check,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  TruckBackground,
  UrduMotto,
  NazarBattuBadge
} from '../components/TruckArt';
import {
  DEFAULT_SERVER_IP,
  getStoredServerIP,
  getServerBaseUrl,
  setStoredServerIP,
  testServerHealth
} from '../api';
import {
  formatCNIC,
  formatPhone,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateCNIC,
  validatePhone,
  validateNTN,
  validateRequired
} from '../utils/validation';

const getPasswordStrength = (pw, isUrdu) => {
  if (!pw) return { score: 0, label: '', color: 'bg-white/10', textColor: 'text-slate-400' };
  let points = 0;
  if (pw.length >= 6) points += 1;
  if (pw.length >= 8) points += 1;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) points += 1;
  if (/[^a-zA-Z0-9]/.test(pw) && pw.length >= 8) points += 1;

  if (pw.length < 6) {
    return {
      score: 1,
      label: isUrdu ? 'کمزور (کم از کم 6 حروف)' : 'Too short (min 6 chars)',
      color: 'bg-rose-500',
      textColor: 'text-rose-400'
    };
  }
  if (points <= 2) {
    return {
      score: 2,
      label: isUrdu ? 'مناسب پاس ورڈ' : 'Fair',
      color: 'bg-amber-400',
      textColor: 'text-amber-300'
    };
  }
  return {
    score: 3,
    label: isUrdu ? 'مضبوط پاس ورڈ' : 'Strong',
    color: 'bg-emerald-400',
    textColor: 'text-emerald-300'
  };
};

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('business');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessRegNumber, setBusinessRegNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Server IP configuration state
  const [serverIpInput, setServerIpInput] = useState(() => getStoredServerIP());
  const [currentServerUrl, setCurrentServerUrl] = useState(() => getServerBaseUrl());
  const [showIpEditor, setShowIpEditor] = useState(false);
  const [savingIp, setSavingIp] = useState(false);
  const [ipStatus, setIpStatus] = useState({ message: '', ok: true });

  // Real-time validation errors and touched state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const fieldRefs = useRef({});
  const formAlertRef = useRef(null);
  const parallaxRef = useParallaxRef();
  const { register } = useAuth();
  const { t, isUrdu } = useLanguage();
  const navigate = useNavigate();

  const registerFieldRef = (key) => (el) => {
    if (el) fieldRefs.current[key] = el;
  };

  const requiresBusinessInfo = role === 'business' || role === 'transporter';

  const roleOptions = [
    {
      id: 'business',
      label: t('role_business'),
      hint: isUrdu ? 'کارگو بکنگ اور لائیو ٹریکنگ' : 'Post cargo, book fleets & get e-Bilty',
      Icon: Building2
    },
    {
      id: 'transporter',
      label: t('role_transporter'),
      hint: isUrdu ? 'لوڈز قبول کریں اور گاڑیاں بھیجیں' : 'Manage dispatches, tariffs & bookings',
      Icon: Briefcase
    },
    {
      id: 'truck_owner',
      label: t('role_truck_owner'),
      hint: isUrdu ? 'اپنے ٹرک اور ڈرائیور رجسٹر کریں' : 'Register trucks, drivers & track trips',
      Icon: Truck
    },
    {
      id: 'admin',
      label: t('role_admin'),
      hint: isUrdu ? 'دستاویزات کی تصدیق اور نگرانی' : 'Verify KYC docs & oversee network',
      Icon: Shield
    }
  ];

  // Field validation helper
  const validateField = (field, val, allValues = {}) => {
    const activeRole = allValues.role ?? role;
    const needsBiz = activeRole === 'business' || activeRole === 'transporter';
    switch (field) {
      case 'name':
        return validateRequired(val, isUrdu ? 'پورا نام' : 'Full Name', isUrdu);
      case 'email':
        return validateEmail(val, isUrdu);
      case 'password':
        return validatePassword(val, isUrdu);
      case 'confirmPassword':
        return validateConfirmPassword(allValues.password ?? password, val, isUrdu);
      case 'cnic':
        return validateCNIC(val, isUrdu);
      case 'phone':
        return validatePhone(val, isUrdu);
      case 'businessName':
        return needsBiz
          ? validateRequired(val, isUrdu ? 'کاروبار کا نام' : 'Business Name', isUrdu)
          : null;
      case 'businessRegNumber':
        return needsBiz ? validateNTN(val, isUrdu, true) : null;
      default:
        return null;
    }
  };

  const getFieldValue = (field) => {
    switch (field) {
      case 'name': return name;
      case 'email': return email;
      case 'password': return password;
      case 'confirmPassword': return confirmPassword;
      case 'cnic': return cnic;
      case 'phone': return phone;
      case 'businessName': return businessName;
      case 'businessRegNumber': return businessRegNumber;
      default: return '';
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = getFieldValue(field);
    const err = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleFieldChange = (field, value) => {
    let cleanVal = value;
    if (field === 'cnic') cleanVal = formatCNIC(value);
    if (field === 'phone') cleanVal = formatPhone(value);

    if (field === 'name') setName(cleanVal);
    if (field === 'email') setEmail(cleanVal);
    if (field === 'password') setPassword(cleanVal);
    if (field === 'confirmPassword') setConfirmPassword(cleanVal);
    if (field === 'cnic') setCnic(cleanVal);
    if (field === 'phone') setPhone(cleanVal);
    if (field === 'businessName') setBusinessName(cleanVal);
    if (field === 'businessRegNumber') setBusinessRegNumber(cleanVal);

    if (error) setError('');

    // Re-validate immediately if field was already touched OR validate once complete/matching
    if (touched[field]) {
      const err = validateField(field, cleanVal, field === 'confirmPassword' ? { password } : {});
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
    if (field === 'password' && (touched.confirmPassword || confirmPassword.length > 0)) {
      const confirmErr = validateField('confirmPassword', confirmPassword, { password: cleanVal });
      setErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
    if (field === 'confirmPassword' && cleanVal.length > 0 && !touched.confirmPassword) {
      const confirmErr = validateField('confirmPassword', cleanVal, { password });
      setErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    if (nextRole !== 'business' && nextRole !== 'transporter') {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.businessName;
        delete copy.businessRegNumber;
        return copy;
      });
    }
  };

  const validateAll = () => {
    const orderedFields = [
      'name',
      'email',
      'cnic',
      'phone',
      ...(requiresBusinessInfo ? ['businessName', 'businessRegNumber'] : []),
      'password',
      'confirmPassword'
    ];

    const filtered = {};
    let firstInvalidField = null;

    for (const key of orderedFields) {
      const err = validateField(key, getFieldValue(key), { password, role });
      if (err) {
        filtered[key] = err;
        if (!firstInvalidField) firstInvalidField = key;
      }
    }

    setErrors(filtered);
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      cnic: true,
      phone: true,
      businessName: requiresBusinessInfo,
      businessRegNumber: requiresBusinessInfo
    });

    if (firstInvalidField && fieldRefs.current[firstInvalidField]) {
      const targetEl = fieldRefs.current[firstInvalidField];
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.focus({ preventScroll: true });
    }

    return !firstInvalidField;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateAll()) {
      setError(
        isUrdu
          ? 'براہ مہربانی سرخ نشان زدہ خانوں کو درست کریں'
          : 'Please review the highlighted fields before continuing'
      );
      return;
    }

    try {
      setError('');
      setLoading(true);
      const res = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        cnic: formatCNIC(cnic),
        phone: formatPhone(phone),
        businessName: requiresBusinessInfo ? businessName.trim() : '',
        businessRegNumber: requiresBusinessInfo ? businessRegNumber.trim() : ''
      });

      const userRole = res?.user?.role || role;
      if (userRole === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (userRole === 'truck_owner' || userRole === 'fleet_owner' || userRole === 'driver') {
        navigate('/fleet/dashboard', { replace: true });
      } else if (userRole === 'transporter') {
        navigate('/transporter/dashboard', { replace: true });
      } else {
        navigate('/shipper/dashboard', { replace: true });
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || err.message?.includes('Network')) {
        const activeUrl = getServerBaseUrl();
        setShowIpEditor(true);
        setError(
          isUrdu
            ? `سرور (${activeUrl}) سے رابطہ نہیں ہو سکا۔ نیچے آئی پی ایڈریس چیک کریں۔`
            : `Cannot reach backend at ${activeUrl}. Update the Server IP below if your Wi-Fi changed.`
        );
      } else {
        setError(
          err.response?.data?.message ||
            (isUrdu
              ? 'اکاؤنٹ بنانے میں مسئلہ پیش آیا: ' + err.message
              : 'Failed to create an account. ' + err.message)
        );
      }
      formAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
          ? `آئی پی محفوظ ہو گیا، مگر ${newBaseUrl} سے جواب نہیں ملا۔`
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
        ? (isUrdu ? `ڈیفالٹ آئی پی پر بحال (${newBaseUrl})` : `Reset to default & connected (${newBaseUrl})`)
        : (isUrdu ? `ڈیفالٹ آئی پی پر بحال: ${newBaseUrl}` : `Reset to default: ${newBaseUrl}`),
      ok: healthy
    });
  };

  const passwordStrength = getPasswordStrength(password, isUrdu);
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;

  const isFieldValid = (field) => {
    const val = getFieldValue(field);
    if (!val || !val.trim()) return false;
    return !validateField(field, val, { password, role });
  };

  const getContainerTone = (field) => {
    if (errors[field] && touched[field]) {
      return 'border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-500/10';
    }
    if (isFieldValid(field)) {
      return 'border-emerald-500/45 bg-[#0F1930]/85 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/25';
    }
    return 'border-white/15 bg-[#0F1930]/85 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/25';
  };

  const getIconTone = (field) => {
    if (errors[field] && touched[field]) return 'text-rose-400';
    if (isFieldValid(field)) return 'text-emerald-400';
    return 'text-slate-400 group-focus-within:text-orange-400';
  };

  return (
    <div ref={parallaxRef} className="flex-1 flex flex-col relative">
      {/* Crisp Viewport-Fixed Truck Art Backdrop (outside perspective/transform layers) */}
      <TruckBackground image="/images/auth_bg.jpg?v=2" opacity="opacity-100" glossyBlur />

      {/* 3D Floating Telemetry Badges pinned symmetrically in Viewport Gutters on XL Screens */}
      <div className="hidden xl:block fixed inset-0 pointer-events-none select-none z-20 perspective-1200">
        <div
          className="absolute left-6 2xl:left-16 top-[28%] transition-transform duration-150 ease-out"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * -18px), calc(var(--my, 0) * -14px), 36px)'
          }}
        >
          <div className="px-3.5 py-2 rounded-xl bg-[#0B1325]/95 border border-white/15 shadow-[0_14px_34px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center gap-2 text-xs font-semibold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <Radio size={14} className="text-orange-400" />
            <span className={isUrdu ? 'font-urdu text-xs text-slate-100' : 'font-mono text-[11px] text-slate-100'}>
              {isUrdu ? 'فوری تصدیقی نیٹ ورک' : 'Verified Fleet Registry'}
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
              {isUrdu ? 'محفوظ ڈیجیٹل ای-بلٹی' : 'Digital e-Bilty Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Centered 3D Registration Stage */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100dvh-4.5rem)] py-6 sm:py-9 px-3.5 sm:px-4 relative z-10 perspective-1200">
        <div className="w-full max-w-2xl z-10 my-auto page-enter preserve-3d">
          <Tilt3DCard
            maxTilt={2.2}
            scale={1.006}
            glareOpacity={0.18}
            glareRoundedClass="rounded-2xl sm:rounded-3xl"
            className="w-full preserve-3d"
          >
          <div className="relative rounded-2xl sm:rounded-3xl preserve-3d">
            {/* Clipped Surface Backdrop & Top 3D Gradient Accent (kept separate from preserve-3d content) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-[0_28px_72px_-15px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/5 bg-[#0B1325]/96"
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-[#EA580C] via-[#F89020] to-cyan-400" />
            </div>

            <div className="p-4 sm:p-7 pt-5 sm:pt-8 relative z-10 preserve-3d">
              {/* Branded 3D Header */}
              <div className="text-center mb-5 preserve-3d">
                <div className="flex justify-center mb-3 depth-z-md">
                  <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-2xl bg-white flex items-center justify-center border border-white/25 shadow-[0_12px_28px_rgba(249,115,22,0.28)] overflow-hidden p-1.5 preserve-light shrink-0">
                    <img src="/logo.jpg?v=2" alt="E-CARGO-BILTY" className="w-full h-full object-contain" />
                  </div>
                </div>

                <h1 className={`text-xl sm:text-2xl font-black text-white mb-1 tracking-tight depth-z-sm ${isUrdu ? 'font-urdu text-2xl' : ''}`}>
                  {t('regTitle')}
                </h1>
                <p className={`text-xs sm:text-[13px] text-slate-300 font-normal mb-2.5 ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                  {t('regSub')}
                </p>

                <div className="flex items-center justify-center gap-2 flex-wrap depth-z-sm">
                  <UrduMotto />
                  <NazarBattuBadge />
                </div>
              </div>

              {error && (
                <div
                  ref={formAlertRef}
                  role="alert"
                  className="mb-4 p-3 bg-rose-500/15 border border-rose-500/45 rounded-xl flex items-start gap-2.5 text-rose-200 text-xs font-semibold shadow-xs"
                >
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span className={isUrdu ? 'font-urdu text-sm leading-snug' : 'leading-snug'}>{error}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                noValidate
                dir={isUrdu ? 'rtl' : 'ltr'}
                className={`space-y-4 ${isUrdu ? 'text-right' : 'text-left'}`}
              >
                {/* Section 1: Role Selection (2x2 Tactile 3D Cards) */}
                <div>
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <label className={`block text-[11px] font-bold text-slate-200 uppercase tracking-wider ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                      {t('roleSelectLabel')} *
                    </label>
                    <span className={`text-[11px] text-slate-400 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                      {isUrdu ? 'اپنا پورٹل منتخب کریں' : 'Choose your portal'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {roleOptions.map(({ id, label, hint, Icon }) => {
                      const selected = role === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleRoleChange(id)}
                          aria-pressed={selected}
                          className={`relative p-3 rounded-xl border transition-all duration-150 flex items-center gap-3 cursor-pointer h-full min-h-[60px] hover:-translate-y-0.5 ${
                            isUrdu ? 'text-right' : 'text-left'
                          } ${
                            selected
                              ? 'bg-gradient-to-br from-orange-500/24 to-orange-600/12 border-orange-400/85 text-white shadow-[0_10px_24px_-8px_rgba(249,115,22,0.58),inset_0_1px_0_rgba(255,255,255,0.2)]'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/12 text-slate-300 hover:border-white/25 hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                          }`}
                        >
                          <span
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                              selected
                                ? 'bg-orange-500/25 border-orange-400/55 text-orange-300'
                                : 'bg-white/[0.05] border-white/10 text-slate-400'
                            }`}
                          >
                            <Icon size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-xs sm:text-[13px] font-bold leading-snug ${isUrdu ? 'font-urdu text-sm leading-normal' : ''}`}>
                              {label}
                            </span>
                            <span className={`block text-[11px] text-slate-400 leading-snug mt-0.5 ${isUrdu ? 'font-urdu text-xs leading-normal' : ''}`}>
                              {hint}
                            </span>
                          </span>
                          {selected && (
                            <CheckCircle2 size={16} className="text-orange-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Personal & Contact Details */}
                <div className="pt-3.5 border-t border-white/10 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                    {/* Full Name */}
                    <div className="group">
                      <label
                        htmlFor="reg-name"
                        className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                          errors.name && touched.name ? 'text-rose-400' : 'text-slate-200 group-focus-within:text-orange-400'
                        } ${isUrdu ? 'font-urdu text-xs' : ''}`}
                      >
                        {t('nameLabel')} *
                      </label>
                      <div className={`relative rounded-xl border transition-colors duration-150 ${getContainerTone('name')}`}>
                        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none ${getIconTone('name')}`}>
                          <User size={15} />
                        </div>
                        <input
                          id="reg-name"
                          ref={registerFieldRef('name')}
                          type="text"
                          autoComplete="name"
                          className={`block w-full rounded-xl ${isUrdu ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8 text-left'} py-2.5 bg-transparent border-0 focus:outline-none text-white placeholder-slate-400 text-[15px] sm:text-sm font-medium`}
                          placeholder={t('namePlaceholder')}
                          value={name}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          onBlur={() => handleBlur('name')}
                        />
                        {isFieldValid('name') && (
                          <Check size={14} className={`absolute top-1/2 -translate-y-1/2 ${isUrdu ? 'left-3' : 'right-3'} text-emerald-400 pointer-events-none`} />
                        )}
                      </div>
                      {errors.name && touched.name && (
                        <p className={`flex items-center gap-1 text-rose-400 text-[11px] font-semibold mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{errors.name}</span>
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="group">
                      <label
                        htmlFor="reg-email"
                        className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                          errors.email && touched.email ? 'text-rose-400' : 'text-slate-200 group-focus-within:text-orange-400'
                        } ${isUrdu ? 'font-urdu text-xs' : ''}`}
                      >
                        {t('emailLabel')} *
                      </label>
                      <div className={`relative rounded-xl border transition-colors duration-150 ${getContainerTone('email')}`}>
                        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none ${getIconTone('email')}`}>
                          <Mail size={15} />
                        </div>
                        <input
                          id="reg-email"
                          ref={registerFieldRef('email')}
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          dir="ltr"
                          className={`block w-full rounded-xl ${isUrdu ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8 text-left'} py-2.5 bg-transparent border-0 focus:outline-none text-white placeholder-slate-400 text-[15px] sm:text-sm font-medium`}
                          placeholder={t('emailPlaceholder')}
                          value={email}
                          onChange={(e) => handleFieldChange('email', e.target.value)}
                          onBlur={() => handleBlur('email')}
                        />
                        {isFieldValid('email') && (
                          <Check size={14} className={`absolute top-1/2 -translate-y-1/2 ${isUrdu ? 'left-3' : 'right-3'} text-emerald-400 pointer-events-none`} />
                        )}
                      </div>
                      {errors.email && touched.email && (
                        <p className={`flex items-center gap-1 text-rose-400 text-[11px] font-semibold mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{errors.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CNIC & Mobile Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                    {/* CNIC */}
                    <div className="group">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <label
                          htmlFor="reg-cnic"
                          className={`block text-[11px] font-bold uppercase tracking-wider ${
                            errors.cnic && touched.cnic ? 'text-rose-400' : 'text-slate-200 group-focus-within:text-orange-400'
                          } ${isUrdu ? 'font-urdu text-xs' : ''}`}
                        >
                          {t('cnicLabel')} *
                        </label>
                        <span className={`text-[10px] text-slate-400 shrink-0 ${isUrdu ? 'font-urdu text-xs' : 'font-mono'}`}>
                          {isUrdu ? '13 ہندسے' : '13 digits'}
                        </span>
                      </div>
                      <div className={`relative rounded-xl border transition-colors duration-150 ${getContainerTone('cnic')}`}>
                        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none ${getIconTone('cnic')}`}>
                          <CreditCard size={15} />
                        </div>
                        <input
                          id="reg-cnic"
                          ref={registerFieldRef('cnic')}
                          type="text"
                          inputMode="numeric"
                          dir="ltr"
                          maxLength={22}
                          className={`block w-full rounded-xl ${isUrdu ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8 text-left'} py-2.5 bg-transparent border-0 focus:outline-none text-white placeholder-slate-400 text-[15px] sm:text-sm font-mono`}
                          placeholder="35202-1234567-1"
                          value={cnic}
                          onChange={(e) => handleFieldChange('cnic', e.target.value)}
                          onBlur={() => handleBlur('cnic')}
                        />
                        {isFieldValid('cnic') && (
                          <Check size={14} className={`absolute top-1/2 -translate-y-1/2 ${isUrdu ? 'left-3' : 'right-3'} text-emerald-400 pointer-events-none`} />
                        )}
                      </div>
                      {errors.cnic && touched.cnic ? (
                        <p className={`flex items-center gap-1 text-rose-400 text-[11px] font-semibold mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{errors.cnic}</span>
                        </p>
                      ) : (
                        <p className={`text-[10px] text-slate-400 mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                          {isUrdu ? 'صرف ہندسے لکھیں، ڈیش خودکار لگیں گے' : 'Dashes format automatically'}
                        </p>
                      )}
                    </div>

                    {/* Mobile Phone */}
                    <div className="group">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <label
                          htmlFor="reg-phone"
                          className={`block text-[11px] font-bold uppercase tracking-wider ${
                            errors.phone && touched.phone ? 'text-rose-400' : 'text-slate-200 group-focus-within:text-orange-400'
                          } ${isUrdu ? 'font-urdu text-xs' : ''}`}
                        >
                          {t('phoneLabel')} *
                        </label>
                        <span className={`text-[10px] text-slate-400 shrink-0 ${isUrdu ? 'font-urdu text-xs' : 'font-mono'}`}>
                          {isUrdu ? 'موبائل / واٹس ایپ' : '03XX Mobile'}
                        </span>
                      </div>
                      <div className={`relative rounded-xl border transition-colors duration-150 ${getContainerTone('phone')}`}>
                        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none ${getIconTone('phone')}`}>
                          <Phone size={15} />
                        </div>
                        <input
                          id="reg-phone"
                          ref={registerFieldRef('phone')}
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          dir="ltr"
                          maxLength={22}
                          className={`block w-full rounded-xl ${isUrdu ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8 text-left'} py-2.5 bg-transparent border-0 focus:outline-none text-white placeholder-slate-400 text-[15px] sm:text-sm font-mono`}
                          placeholder="0300-1234567"
                          value={phone}
                          onChange={(e) => handleFieldChange('phone', e.target.value)}
                          onBlur={() => handleBlur('phone')}
                        />
                        {isFieldValid('phone') && (
                          <Check size={14} className={`absolute top-1/2 -translate-y-1/2 ${isUrdu ? 'left-3' : 'right-3'} text-emerald-400 pointer-events-none`} />
                        )}
                      </div>
                      {errors.phone && touched.phone ? (
                        <p className={`flex items-center gap-1 text-rose-400 text-[11px] font-semibold mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{errors.phone}</span>
                        </p>
                      ) : (
                        <p className={`text-[10px] text-slate-400 mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                          {isUrdu ? '03XX یا +92 نمبر درج کریں' : 'Accepts 03XX or +923XX format'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Organization Verification (Business & Transporter) */}
                {requiresBusinessInfo && (
                  <div className="pt-3.5 border-t border-white/10">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`text-[11px] font-bold uppercase tracking-wider text-orange-300 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                        {isUrdu ? 'کاروبار اور رجسٹریشن کی تفصیلات' : 'Organization Details'}
                      </span>
                      <span className={`text-[10px] text-slate-400 ${isUrdu ? 'font-urdu text-xs' : 'font-mono'}`}>
                        {isUrdu ? 'لازمی تصدیق' : 'KYB Verification'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                      {/* Business / Company Name */}
                      <div className="group">
                        <label
                          htmlFor="reg-biz-name"
                          className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                            errors.businessName && touched.businessName
                              ? 'text-rose-400'
                              : 'text-slate-200 group-focus-within:text-orange-400'
                          } ${isUrdu ? 'font-urdu text-xs' : ''}`}
                        >
                          {t('businessNameLabel')} *
                        </label>
                        <div className={`relative rounded-xl border transition-colors duration-150 ${getContainerTone('businessName')}`}>
                          <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none ${getIconTone('businessName')}`}>
                            <Building2 size={15} />
                          </div>
                          <input
                            id="reg-biz-name"
                            ref={registerFieldRef('businessName')}
                            type="text"
                            autoComplete="organization"
                            className={`block w-full rounded-xl ${isUrdu ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8 text-left'} py-2.5 bg-transparent border-0 focus:outline-none text-white placeholder-slate-400 text-[15px] sm:text-sm font-medium`}
                            placeholder={t('businessNamePlaceholder')}
                            value={businessName}
                            onChange={(e) => handleFieldChange('businessName', e.target.value)}
                            onBlur={() => handleBlur('businessName')}
                          />
                          {isFieldValid('businessName') && (
                            <Check size={14} className={`absolute top-1/2 -translate-y-1/2 ${isUrdu ? 'left-3' : 'right-3'} text-emerald-400 pointer-events-none`} />
                          )}
                        </div>
                        {errors.businessName && touched.businessName ? (
                          <p className={`flex items-center gap-1 text-rose-400 text-[11px] font-semibold mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                            <AlertCircle size={12} className="shrink-0" />
                            <span>{errors.businessName}</span>
                          </p>
                        ) : (
                          <p className={`text-[10px] text-slate-400 mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                            {isUrdu ? 'رجسٹرڈ کمپنی یا کاروبار کا نام' : 'Registered trade or firm name'}
                          </p>
                        )}
                      </div>

                      {/* NTN / Registration Number */}
                      <div className="group">
                        <label
                          htmlFor="reg-biz-ntn"
                          className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                            errors.businessRegNumber && touched.businessRegNumber
                              ? 'text-rose-400'
                              : 'text-slate-200 group-focus-within:text-orange-400'
                          } ${isUrdu ? 'font-urdu text-xs' : ''}`}
                        >
                          {t('businessRegLabel')} *
                        </label>
                        <div className={`relative rounded-xl border transition-colors duration-150 ${getContainerTone('businessRegNumber')}`}>
                          <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none ${getIconTone('businessRegNumber')}`}>
                            <Hash size={15} />
                          </div>
                          <input
                            id="reg-biz-ntn"
                            ref={registerFieldRef('businessRegNumber')}
                            type="text"
                            dir="ltr"
                            className={`block w-full rounded-xl ${isUrdu ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8 text-left'} py-2.5 bg-transparent border-0 focus:outline-none text-white placeholder-slate-400 text-[15px] sm:text-sm font-mono`}
                            placeholder="1234567-8"
                            value={businessRegNumber}
                            onChange={(e) => handleFieldChange('businessRegNumber', e.target.value)}
                            onBlur={() => handleBlur('businessRegNumber')}
                          />
                          {isFieldValid('businessRegNumber') && (
                            <Check size={14} className={`absolute top-1/2 -translate-y-1/2 ${isUrdu ? 'left-3' : 'right-3'} text-emerald-400 pointer-events-none`} />
                          )}
                        </div>
                        {errors.businessRegNumber && touched.businessRegNumber ? (
                          <p className={`flex items-center gap-1 text-rose-400 text-[11px] font-semibold mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                            <AlertCircle size={12} className="shrink-0" />
                            <span>{errors.businessRegNumber}</span>
                          </p>
                        ) : (
                          <p className={`text-[10px] text-slate-400 mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                            {isUrdu ? '8 ہندسوں کا این ٹی این یا رجسٹریشن کوڈ' : '8-digit NTN or 6–16 char reg ID'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 4: Account Security Passwords */}
                <div className="pt-3.5 border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                    {/* Password */}
                    <div className="group">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <label
                          htmlFor="reg-password"
                          className={`block text-[11px] font-bold uppercase tracking-wider ${
                            errors.password && touched.password ? 'text-rose-400' : 'text-slate-200 group-focus-within:text-orange-400'
                          } ${isUrdu ? 'font-urdu text-xs' : ''}`}
                        >
                          {t('passwordLabel')} *
                        </label>
                        {password && (
                          <span className={`text-[10px] font-bold shrink-0 ${passwordStrength.textColor} ${isUrdu ? 'font-urdu' : ''}`}>
                            {passwordStrength.label}
                          </span>
                        )}
                      </div>
                      <div className={`relative rounded-xl border transition-colors duration-150 ${getContainerTone('password')}`}>
                        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none ${getIconTone('password')}`}>
                          <Lock size={15} />
                        </div>
                        <input
                          id="reg-password"
                          ref={registerFieldRef('password')}
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          dir="ltr"
                          className={`block w-full rounded-xl ${isUrdu ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'} py-2.5 bg-transparent border-0 focus:outline-none text-white placeholder-slate-400 text-[15px] sm:text-sm`}
                          placeholder={t('passwordPlaceholder')}
                          value={password}
                          onChange={(e) => handleFieldChange('password', e.target.value)}
                          onBlur={() => handleBlur('password')}
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((prev) => !prev)}
                          className={`absolute inset-y-0 ${isUrdu ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer`}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {password ? (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {[1, 2, 3].map((step) => (
                            <div
                              key={step}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                passwordStrength.score >= step ? passwordStrength.color : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                      ) : (
                        !errors.password && (
                          <p className={`text-[10px] text-slate-400 mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                            {isUrdu ? 'کم از کم 6 حروف درکار ہیں' : 'Minimum 6 characters required'}
                          </p>
                        )
                      )}
                      {errors.password && touched.password && (
                        <p className={`flex items-center gap-1 text-rose-400 text-[11px] font-semibold mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{errors.password}</span>
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="group">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <label
                          htmlFor="reg-confirm-password"
                          className={`block text-[11px] font-bold uppercase tracking-wider ${
                            errors.confirmPassword && touched.confirmPassword ? 'text-rose-400' : 'text-slate-200 group-focus-within:text-orange-400'
                          } ${isUrdu ? 'font-urdu text-xs' : ''}`}
                        >
                          {t('confirmPasswordLabel')} *
                        </label>
                        {confirmPassword && (
                          <span
                            className={`text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                              passwordsMatch ? 'text-emerald-300' : 'text-amber-300'
                            } ${isUrdu ? 'font-urdu' : ''}`}
                          >
                            {passwordsMatch ? (
                              <>
                                <Check size={11} />
                                <span>{isUrdu ? 'مطابقت رکھتا ہے' : 'Match'}</span>
                              </>
                            ) : (
                              <span>{isUrdu ? 'مطابقت نہیں' : 'No match'}</span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className={`relative rounded-xl border transition-colors duration-150 ${getContainerTone('confirmPassword')}`}>
                        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none ${getIconTone('confirmPassword')}`}>
                          <Lock size={15} />
                        </div>
                        <input
                          id="reg-confirm-password"
                          ref={registerFieldRef('confirmPassword')}
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          dir="ltr"
                          className={`block w-full rounded-xl ${isUrdu ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'} py-2.5 bg-transparent border-0 focus:outline-none text-white placeholder-slate-400 text-[15px] sm:text-sm`}
                          placeholder={t('passwordPlaceholder')}
                          value={confirmPassword}
                          onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                          onBlur={() => handleBlur('confirmPassword')}
                        />
                        <button
                          type="button"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className={`absolute inset-y-0 ${isUrdu ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer`}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors.confirmPassword && touched.confirmPassword ? (
                        <p className={`flex items-center gap-1 text-rose-400 text-[11px] font-semibold mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{errors.confirmPassword}</span>
                        </p>
                      ) : (
                        <p className={`text-[10px] text-slate-400 mt-1 ${isUrdu ? 'font-urdu text-xs' : ''}`}>
                          {isUrdu ? 'تصدیق کے لیے وہی پاس ورڈ دوبارہ لکھیں' : 'Re-enter the same password'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button (Tactile 3D Primary Action) */}
                <div className="pt-1.5">
                  <button
                    disabled={loading}
                    type="submit"
                    className={`cta-shine w-full min-h-[46px] relative group overflow-hidden rounded-xl py-3 px-4 text-white font-bold text-sm tracking-wide bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#F97316] hover:to-[#FB923C] shadow-[0_12px_28px_-6px_rgba(249,115,22,0.6),inset_0_1px_0_rgba(255,255,255,0.28)] hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${isUrdu ? 'font-urdu text-base' : ''}`}
                  >
                    <div className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={17} />
                          <span>{t('creatingAccount')}</span>
                        </>
                      ) : (
                        <>
                          <span>{t('signUpBtn')}</span>
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

              {/* Bottom Login Link */}
              <div className={`mt-4 pt-3.5 border-t border-white/12 text-center text-xs text-slate-300 font-medium ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                {t('alreadyHaveAccount')}{' '}
                <Link
                  to="/login"
                  className="text-orange-400 hover:text-orange-300 transition-colors font-bold underline underline-offset-4"
                >
                  {t('loginHere')}
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
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 max-w-xs mx-auto modal-enter">
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
