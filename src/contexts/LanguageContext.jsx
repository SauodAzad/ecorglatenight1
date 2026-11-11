import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  en: {
    // Navbar & Common
    brandTitle: 'E-CARGO-BILTY',
    brandSubtitle: 'DIGITAL LORRY RECEIPT • VERIFIED FREIGHT',
    login: 'Login',
    register: 'Register',
    dashboard: 'Dashboard',
    logout: 'Logout',
    profile: 'Profile',
    transitAlerts: 'Transit Alerts',
    noNotifications: 'No new notifications',
    langToggle: 'Urdu',
    langName: 'English',

    // Roles
    role_admin: 'Administrator',
    role_truck_owner: 'Truck Owner',
    role_transporter: 'Cargo Transporter',
    role_business: 'Business Shipper',

    // Badges & Slogans (English only when in EN mode)
    badgePeacock: 'E-CARGO-BILTY',
    badgeNazar: 'Verified Freight Safety',
    badgeRoad: 'National Highway Network',
    badgeWorkshop: 'Nationwide Logistics Network',
    poetryBanner: 'Reliable Logistics • Secure & On-Time Delivery Across Pakistan',
    poetrySubtext: 'Official Digital Lorry Receipt • Verified Cargo Network',
    mottoLookLove: 'Quality, Integrity & Security',
    mottoSafeJourney: 'Safe & Timely Transit',
    mottoGraceGod: 'Nationwide Excellence',
    heritageBadge: 'National Logistics Network',

    // Home Page
    homeTag: 'PAKISTANI CARGO FREIGHT NETWORK',
    homeTitle1: 'The Future of',
    homeTitle2: 'Digital Bilty & Freight',
    homeDesc: 'Pakistan\'s premier digital lorry receipt platform. Connecting Shippers, Logistics Brokers, and Fleet Owners with verified PDF Bilties, real-time map telemetry, and counter-offer dispatch.',
    adminCardTitle: 'Admin Control Center',
    adminCardRole: 'Administration',
    adminCardDesc: 'Verify CNIC and registration documents, manage system disputes, inspect audit logs, and monitor fleet utilization.',
    truckOwnerCardTitle: 'Truck Owner Portal',
    truckOwnerCardRole: 'Fleet Owner',
    truckOwnerCardDesc: 'Manage your fleet and drivers, negotiate rates with counter-offers, update transit states, and submit Proof of Delivery.',
    transporterCardTitle: 'Cargo Transporter Hub',
    transporterCardRole: 'Transporter',
    transporterCardDesc: 'Claim shipper freight requests, search available trucks by route and capacity, chat live, and finalize bookings.',
    businessCardTitle: 'Business Shipper Center',
    businessCardRole: 'Shipper',
    businessCardDesc: 'Post cargo requests with multi-recipient details, track transit coordinates on interactive maps, and download official Bilties.',
    footerText: 'E-CARGO-BILTY PLATFORM',

    // Login Page
    loginWelcome: 'Welcome Back',
    loginSub: 'Sign in to your E-CARGO-BILTY account',
    emailLabel: 'Email Address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    signInBtn: 'Sign In to Portal',
    signingIn: 'Signing in...',
    dontHaveAccount: 'Don\'t have an account?',
    registerHere: 'Register here',

    // Register Page
    regTitle: 'Create Portal Account',
    regSub: 'Join Pakistan\'s premier verified logistics network',
    nameLabel: 'Full Name',
    namePlaceholder: 'Muhammad Ali',
    roleSelectLabel: 'Account Role',
    cnicLabel: 'CNIC Number',
    cnicPlaceholder: '37405-1234567-1',
    phoneLabel: 'Mobile Phone',
    phonePlaceholder: '0300-1234567',
    businessNameLabel: 'Business / Company Name',
    businessNamePlaceholder: 'Ali Traders & Logistics',
    businessRegLabel: 'NTN / Registration Number',
    businessRegPlaceholder: 'REG-PK-12345',
    confirmPasswordLabel: 'Confirm Password',
    signUpBtn: 'Create Account',
    creatingAccount: 'Creating account...',
    alreadyHaveAccount: 'Already have an account?',
    loginHere: 'Login here'
  },
  ur: {
    // Navbar & Common
    brandTitle: 'ای کارگو بلٹی',
    brandSubtitle: 'ڈیجیٹل لاری بلٹی • تصدیق شدہ باربرداری',
    login: 'لاگ ان',
    register: 'رجسٹریشن',
    dashboard: 'ڈیش بورڈ',
    logout: 'لاگ آؤٹ',
    profile: 'پروفائل',
    transitAlerts: 'اطلاعات و الرٹس',
    noNotifications: 'کوئی نئی اطلاع نہیں ہے',
    langToggle: 'English',
    langName: 'اردو',

    // Roles
    role_admin: 'نگرانِ اعلیٰ',
    role_truck_owner: 'ٹرک مالک',
    role_transporter: 'ٹرانسپورٹر',
    role_business: 'تاجر / کاروباری',

    // Badges & Slogans (Urdu only when in UR mode)
    badgePeacock: 'ای کارگو بلٹی',
    badgeNazar: 'محفوظ و مصدقہ ترسیل',
    badgeRoad: 'شاہراہِ پاکستان',
    badgeWorkshop: 'ملک گیر لاجسٹکس نیٹ ورک',
    poetryBanner: 'محفوظ باربرداری • ملک گیر بااعتماد اور بروقت ترسیل',
    poetrySubtext: 'سرکاری ڈیجیٹل لاری بلٹی • تصدیق شدہ کارگو نیٹ ورک',
    mottoLookLove: 'معیار، دیانت اور تحفظ',
    mottoSafeJourney: 'محفوظ سفر و بروقت ترسیل',
    mottoGraceGod: 'معیاری باربرداری',
    heritageBadge: 'قومی لاجسٹکس نیٹ ورک',

    // Home Page
    homeTag: 'شاہراہِ پاکستان کارگو نیٹ ورک',
    homeTitle1: 'جدید ترین نظام برائے',
    homeTitle2: 'ڈیجیٹل بلٹی اور فریٹ',
    homeDesc: 'پاکستان کا پہلا اور معتبر ترین ڈیجیٹل لاری بلٹی پلیٹ فارم۔ تاجروں، بروکرز اور ٹرک مالکان کو تصدیق شدہ پی ڈی ایف بلٹی، لائیو لوکیشن اور منصفانہ کرائے سے جوڑتا ہے۔',
    adminCardTitle: 'نگرانِ اعلیٰ کنٹرول سینٹر',
    adminCardRole: 'نگرانِ اعلیٰ',
    adminCardDesc: 'شناختی کارڈ اور رجسٹریشن دستاویزات کی تصدیق کریں، تنازعات حل کریں اور کارگو کی نگرانی کریں۔',
    truckOwnerCardTitle: 'ٹرک مالک پورٹل',
    truckOwnerCardRole: 'ٹرک مالک',
    truckOwnerCardDesc: 'اپنی گاڑیوں اور ڈرائیوروں کا انتظام کریں، کرائے پر بات چیت کریں اور سامان کی بحفاظت ترسیل مکمل کریں۔',
    transporterCardTitle: 'کارگو ٹرانسپورٹر مرکز',
    transporterCardRole: 'ٹرانسپورٹر',
    transporterCardDesc: 'کارگو آرڈرز حاصل کریں، روٹ اور گنجائش کے مطابق ٹرک تلاش کریں اور براہ راست بکنگ کریں۔',
    businessCardTitle: 'تاجر و کاروباری مرکز',
    businessCardRole: 'تاجر / کسٹمر',
    businessCardDesc: 'اپنا کارگو پوسٹ کریں، نقشے پر لائیو ٹریک کریں اور باضابطہ قانونی بلٹی ڈاؤن لوڈ کریں۔',
    footerText: 'ای کارگو بلٹی پلیٹ فارم',

    // Login Page
    loginWelcome: 'خوش آمدید',
    loginSub: 'اپنے ای کارگو بلٹی اکاؤنٹ میں داخل ہوں',
    emailLabel: 'ای میل ایڈریس',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'پاس ورڈ',
    passwordPlaceholder: '••••••••',
    signInBtn: 'پورٹل میں داخل ہوں',
    signingIn: 'داخل ہو رہے ہیں...',
    dontHaveAccount: 'کیا اکاؤنٹ موجود نہیں ہے؟',
    registerHere: 'نیا اکاؤنٹ بنائیں',

    // Register Page
    regTitle: 'نیا پورٹل اکاؤنٹ بنائیں',
    regSub: 'پاکستان کے سب سے بڑے تصدیق شدہ فریٹ نیٹ ورک میں شامل ہوں',
    nameLabel: 'مکمل نام',
    namePlaceholder: 'محمد علی',
    roleSelectLabel: 'اکاؤنٹ کا کردار',
    cnicLabel: 'قومی شناختی کارڈ نمبر',
    cnicPlaceholder: '37405-1234567-1',
    phoneLabel: 'موبائل فون نمبر',
    phonePlaceholder: '0300-1234567',
    businessNameLabel: 'کاروبار یا کمپنی کا نام',
    businessNamePlaceholder: 'علی ٹریڈرز اینڈ ٹرانسپورٹ',
    businessRegLabel: 'این ٹی این یا رجسٹریشن نمبر',
    businessRegPlaceholder: 'REG-PK-12345',
    confirmPasswordLabel: 'پاس ورڈ کی تصدیق کریں',
    signUpBtn: 'اکاؤنٹ رجسٹر کریں',
    creatingAccount: 'اکاؤنٹ بن رہا ہے...',
    alreadyHaveAccount: 'پہلے سے اکاؤنٹ ہے؟',
    loginHere: 'یہاں لاگ ان کریں'
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ur' ? 'rtl' : 'ltr');
    if (language === 'ur') {
      document.body.classList.add('lang-ur');
      document.body.classList.remove('lang-en');
    } else {
      document.body.classList.add('lang-en');
      document.body.classList.remove('lang-ur');
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'ur' : 'en'));
  };

  const t = (key, fallback = '') => {
    return translations[language]?.[key] || translations.en[key] || fallback || key;
  };

  const isUrdu = language === 'ur';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, isUrdu }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      language: 'en',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key, fallback = '') => translations.en[key] || fallback || key,
      isUrdu: false
    };
  }
  return context;
}
