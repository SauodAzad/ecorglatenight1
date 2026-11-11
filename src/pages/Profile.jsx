import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { User, Mail, Shield, Calendar, LogOut, AlertTriangle, Send, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { logisticsAPI } from '../api';
import { ChamakRibbon, TruckTaj, UrduMotto, TruckPoetryBanner, NazarBattuBadge } from '../components/TruckArt';

export default function Profile() {
  const { currentUser, userData, logout } = useAuth();
  const { t, isUrdu } = useLanguage();
  const { toast } = useToast();
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState({ subject: '', description: '' });
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleSendReport = async (e) => {
    e.preventDefault();
    if (submittingReport) return;
    setSubmittingReport(true);
    try {
      await logisticsAPI.postComplaint(report);
      toast.success(isUrdu ? "رپورٹ کامیابی سے بھیج دی گئی۔ ایڈمن جلد جائزہ لے گا۔" : "Report sent successfully. Admin will review it.");
      setShowReport(false);
      setReport({ subject: '', description: '' });
    } catch (error) {
      console.error("Error sending report: ", error);
      toast.error(error.response?.data?.message || (isUrdu ? "رپورٹ بھیجنے میں ناکامی ہوئی" : "Failed to submit report. Please try again."));
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-10 relative page-enter">
      <div className="mb-5 sm:mb-6 relative z-10">
        <TruckPoetryBanner />
      </div>

      {/* Main Profile Card */}
      <div
        className="bg-[#0B1325]/95 border border-white/15 rounded-2xl sm:rounded-3xl p-0 overflow-hidden relative shadow-[0_24px_64px_-15px_rgba(0,0,0,0.85)] z-10"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#EA580C] via-[#F89020] to-cyan-400" />
        <div className="p-4 sm:p-9">
          {/* User Hero Row with Avatar */}
          <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-white/12">
            <div className="relative group">
              <div className="w-20 h-16 sm:w-24 sm:h-20 rounded-2xl bg-white flex items-center justify-center border border-white/25 shadow-[0_10px_28px_rgba(249,115,22,0.2)] p-1.5 overflow-hidden preserve-light">
                <img src="/logo.jpg?v=2" alt="E-CARGO-BILTY" className="w-full h-full object-contain" />
              </div>
              <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 border-2 border-[#0B1325] flex items-center justify-center text-white shadow-sm">
                <CheckCircle2 size={14} strokeWidth={3} />
              </span>
            </div>

            <div className="text-center md:text-left flex-1 min-w-0 w-full">
              <div className="flex flex-col md:flex-row md:items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight break-words">{userData?.name || 'Verified User'}</h1>
                <UrduMotto className="self-center md:self-auto" />
                <NazarBattuBadge className="self-center md:self-auto" />
              </div>
              <p className="text-xs sm:text-sm font-mono text-slate-300 capitalize flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"></span>
                <span className="font-bold text-orange-400">{userData?.role?.replace('_', ' ')}</span>
                {userData?.businessName && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-200 font-sans font-semibold">{userData.businessName}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/12 shadow-2xs hover:border-orange-400/35 transition-all">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Mail size={16} className="text-orange-400" />
                <span className="text-xs uppercase tracking-wider font-extrabold">Email Address</span>
              </div>
              <p className="text-white text-sm font-bold truncate">{currentUser?.email}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/12 shadow-2xs hover:border-orange-400/35 transition-all">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Shield size={16} className="text-cyan-400" />
                <span className="text-xs uppercase tracking-wider font-extrabold">Account Status</span>
              </div>
              <p className={`text-sm font-bold capitalize flex items-center gap-1.5 ${userData?.status === 'active' ? 'text-emerald-300' :
                  userData?.status === 'pending_verification' ? 'text-orange-300' :
                    'text-amber-300'
                }`}>
                <span className={`w-2 h-2 rounded-full ${userData?.status === 'active' ? 'bg-emerald-400' :
                    userData?.status === 'pending_verification' ? 'bg-orange-400' :
                      'bg-amber-400'
                  }`}></span>
                {userData?.status?.replace('_', ' ') || 'Pending'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/12 shadow-2xs hover:border-orange-400/35 transition-all">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Calendar size={16} className="text-orange-400" />
                <span className="text-xs uppercase tracking-wider font-extrabold">System User ID</span>
              </div>
              <p className="text-white font-mono text-xs font-bold tracking-wider">
                BLT-USR-{String(currentUser?.id || currentUser?._id || '001').padStart(4, '0')}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={logout}
              className="btn-crimson text-xs !py-2.5 !px-5 cursor-pointer shadow-sm"
            >
              <LogOut size={16} /> {isUrdu ? 'لاگ آؤٹ' : 'Sign Out Account'}
            </button>
          </div>

          {/* Support & Complaints Section */}
          <div className="mt-8 sm:mt-10 border-t border-white/12 pt-6 sm:pt-7">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-white/[0.06] border border-white/12 text-orange-400 shadow-2xs shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-white">Support &amp; Platform Complaints</h3>
                  <p className="text-xs text-slate-400">Submit grievances for official administrative review</p>
                </div>
              </div>
              <button
                onClick={() => setShowReport(!showReport)}
                className="btn-outline text-xs !py-2 !px-3.5 cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
              >
                {showReport ? 'Cancel' : 'Report an Issue'}
              </button>
            </div>

            {showReport ? (
              <form onSubmit={handleSendReport} className="p-5 rounded-2xl bg-white/[0.04] border border-white/12 space-y-4 shadow-sm animate-modal-enter">
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                    Subject / Category
                  </label>
                  <input
                    required
                    value={report.subject}
                    onChange={e => setReport({ ...report, subject: e.target.value })}
                    placeholder="e.g. Booking payment dispute, Driver document issue"
                    className="w-full bg-[#0F1930]/85 border border-white/15 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                    Detailed Description
                  </label>
                  <textarea
                    required
                    value={report.description}
                    onChange={e => setReport({ ...report, description: e.target.value })}
                    placeholder="Provide full trip or booking context..."
                    className="w-full bg-[#0F1930]/85 border border-white/15 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 h-28"
                  />
                </div>
                <button type="submit" disabled={submittingReport} className="btn-primary text-xs !py-2.5 !px-5 w-full cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                  {submittingReport ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  <span>{submittingReport ? 'Submitting...' : 'Submit Official Dispute'}</span>
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/12 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <span className="font-medium">Direct dispute escalation channel to System Administrator.</span>
                <span className={isUrdu ? "font-urdu text-emerald-300 font-bold text-sm" : "font-mono text-cyan-300 font-bold text-xs"}>
                  {isUrdu ? 'محفوظ باربرداری اور بروقت ترسیل' : 'Safe Transit Across Pakistan'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
