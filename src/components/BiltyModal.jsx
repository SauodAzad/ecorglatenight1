import { useEffect, useRef, useState } from 'react';
import { X, Printer, Download, FileText, Loader2, Eye, CheckCircle2, Truck, MapPin } from 'lucide-react';
import { generateBiltyPDFBlob, generateBiltyPDF } from '../utils/generateBiltyPDF';
import { formatFreightPrice, stripWeightUnit } from '../utils/fareCalculator';
import { useToast } from '../contexts/ToastContext';

/**
 * BiltyModal – displays verified Digital e-Bilty in both a WebView/mobile-safe
 * structured HTML Receipt View and an embedded PDF Preview (desktop/iframe),
 * with Print, PDF Download, and Escape-to-close support.
 */
export default function BiltyModal({ booking, onClose }) {
  const { toast } = useToast();
  const isNativeOrSmallScreen = () =>
    typeof window !== 'undefined' && (Boolean(window.Capacitor) || window.innerWidth < 768);

  const [viewMode, setViewMode] = useState(() => (isNativeOrSmallScreen() ? 'receipt' : 'pdf'));
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);
  const urlRef = useRef(null);

  const getBiltyData = (b) => ({
    id: b.cargoId || b.id || b._id,
    _id: b.id || b._id,
    cargoTitle: b.cargoTitle || b.cargo?.title,
    transporterName: b.transporterName,
    truckPlate: b.truckPlate,
    price: b.price,
    completedAt: b.completedAt || b.createdAt,
    origin: b.origin || b.cargo?.origin,
    destination: b.destination || b.cargo?.destination,
    weight: b.weight || b.cargo?.weight,
    businessOwnerName: b.cargo?.businessOwnerName || b.businessOwnerName,
    packagingType: b.cargo?.packagingType || b.packagingType,
    paymentTerms: b.cargo?.paymentTerms || b.paymentTerms,
    specialHandling: b.cargo?.specialHandling || b.specialHandling,
    senderNTN: b.cargo?.senderNTN || b.senderNTN,
    deliveryNotes: b.cargo?.deliveryNotes || b.deliveryNotes,
    chargeableWeight: b.cargo?.chargeableWeight || b.chargeableWeight,
    receiverSignature: b.receiverSignature
  });

  useEffect(() => {
    if (!booking) return undefined;
    setViewMode(isNativeOrSmallScreen() ? 'receipt' : 'pdf');
    setLoading(true);
    setError(null);
    let active = true;

    generateBiltyPDFBlob(getBiltyData(booking))
      .then((url) => {
        if (active) {
          urlRef.current = url;
          setPdfUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('BiltyModal PDF error:', err);
          setError(err.message || 'Failed to generate PDF.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [booking]);

  useEffect(() => {
    if (!booking) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const onUiBack = (e) => {
      e.preventDefault();
      onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('ecargo:ui-back', onUiBack);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('ecargo:ui-back', onUiBack);
      document.body.style.overflow = prevOverflow;
    };
  }, [booking, onClose]);

  const handlePrint = () => {
    if (viewMode === 'pdf' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  const handleDownload = async () => {
    if (!booking) return;
    const res = await generateBiltyPDF(getBiltyData(booking));
    if (res?.ok) {
      toast.success(`Downloaded ${res.filename}`);
    } else {
      toast.error(res?.error ? `Could not save PDF: ${res.error}` : 'Could not save PDF file.');
    }
  };

  if (!booking) return null;

  const data = getBiltyData(booking);
  const idStr = String(booking.id || booking._id || '000000');
  const biltyNo = `BLT-${idStr.slice(0, 8).toUpperCase()}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/82 px-2.5 sm:px-4 py-3 sm:py-6"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bilty-modal-title"
    >
      <div
        className="bg-[#0B1325]/98 border border-white/15 rounded-2xl sm:rounded-3xl shadow-[0_28px_72px_rgba(0,0,0,0.88)] w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[92dvh] flex flex-col overflow-hidden relative modal-enter"
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-white/12 shrink-0 bg-[#060B16]/85">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
            <div className="w-11 h-8 sm:w-14 sm:h-11 rounded-xl bg-white border border-white/25 p-0.5 shadow-sm overflow-hidden shrink-0 flex items-center justify-center preserve-light">
              <img src="/logo.jpg?v=2" alt="E-CARGO-BILTY" className="w-full h-full object-contain" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="bilty-modal-title" className="text-sm sm:text-base font-black text-white leading-tight">
                  Official Digital Lorry Receipt
                </h2>
                <span className="font-urdu text-xs sm:text-sm text-orange-400 font-bold">رسید بلٹی</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-mono mt-0.5 truncate">
                {biltyNo} &nbsp;·&nbsp; {data.cargoTitle || 'Freight Consignment'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
            {/* Switch between Mobile-safe Receipt View and Embedded PDF */}
            <div className="flex items-center bg-white/[0.08] border border-white/15 p-0.5 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setViewMode('receipt')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${viewMode === 'receipt' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                  }`}
              >
                <Eye size={13} />
                <span>Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('pdf')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${viewMode === 'pdf' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                  }`}
              >
                <FileText size={13} />
                <span>PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              disabled={viewMode === 'pdf' && (loading || !!error)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/20 bg-white/[0.08] hover:bg-white/15 text-slate-100 text-xs font-bold cursor-pointer shadow-sm flex items-center gap-1 transition-all"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="btn-primary text-xs !py-1.5 !px-2.5 sm:!px-3 cursor-pointer shadow-sm flex items-center gap-1"
            >
              <Download size={14} />
              <span>Download<span className="hidden sm:inline"> PDF</span></span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 relative bg-[#060B16]/90 overflow-y-auto min-h-[340px] sm:min-h-[500px]">
          {viewMode === 'receipt' ? (
            <div className="p-4 sm:p-6">
              <div className="max-w-2xl mx-auto bg-white border-2 border-slate-800 rounded-xl overflow-hidden shadow-2xl preserve-light">
                <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-white rounded-xl p-1 border border-white/80 shadow-xs shrink-0 w-14 h-11 flex items-center justify-center">
                      <img src="/logo.jpg?v=2" alt="E-CARGO-BILTY" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <p className="text-lg font-black tracking-wide leading-tight">E-CARGO-BILTY</p>
                      <p className="text-[11px] text-slate-300">Official Digital Lorry Receipt (Consignment Note)</p>
                    </div>
                  </div>
                  <div className="sm:text-right font-mono">
                    <p className="text-xs text-orange-400">BILTY NO.</p>
                    <p className="text-sm font-black">{biltyNo}</p>
                  </div>
                </div>
                <div className="h-1.5 bg-[#F89020]" />

                <div className="p-5 space-y-4 text-xs sm:text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-0.5">Consignor / Shipper</p>
                      <p className="font-bold text-slate-900">{data.businessOwnerName || 'Authorized Shipper'}</p>
                      {data.senderNTN && <p className="text-[11px] font-mono text-slate-500">NTN/STRN: {data.senderNTN}</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-0.5">Carrier / Truck Assignment</p>
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Truck size={14} className="text-orange-600 shrink-0" />
                        <span>{data.transporterName || 'Verified Fleet'}</span>
                      </p>
                      <p className="text-[11px] font-mono text-slate-600">Plate: {data.truckPlate || 'Assigned'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-200 rounded-xl p-3.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Origin</p>
                      <p className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-emerald-600 shrink-0" />
                        <span>{data.origin || 'N/A'}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Destination</p>
                      <p className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-rose-600 shrink-0" />
                        <span>{data.destination || 'N/A'}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Chargeable Weight</p>
                      <p className="font-bold font-mono text-slate-900 mt-0.5">{stripWeightUnit(data.chargeableWeight || data.weight) || 'N/A'} Tons</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Payment Terms</p>
                      <p className="font-bold text-slate-900 mt-0.5">{data.paymentTerms || 'Prepaid'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Cargo Description</p>
                      <p className="font-bold text-sm">{data.cargoTitle || 'Commercial Freight'} {data.packagingType ? `(${data.packagingType})` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Agreed Freight</p>
                      <p className="text-lg font-black font-mono text-emerald-400">
                        {formatFreightPrice(data.price)}
                      </p>
                    </div>
                  </div>

                  {data.deliveryNotes && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-slate-800">
                      <span className="font-bold text-orange-800">Delivery Notes: </span>{data.deliveryNotes}
                    </div>
                  )}

                  {data.receiverSignature && (
                    <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span>Consignee e-POD Signature Verified</span>
                      </div>
                      <img src={data.receiverSignature} alt="Consignee signature" className="h-14 bg-white border border-slate-200 rounded-lg px-2 py-1 object-contain" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full min-h-[380px] sm:min-h-[540px] relative">
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
                  <Loader2 className="animate-spin text-orange-400" size={32} />
                  <p className="text-xs font-mono tracking-wider text-slate-200 font-bold uppercase">Compiling Verified Bilty PDF...</p>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-rose-400 px-8 text-center">
                  <FileText size={36} className="text-rose-400" />
                  <p className="font-bold text-sm text-white">Could not generate PDF</p>
                  <p className="text-xs text-slate-300">{error}</p>
                  <button
                    type="button"
                    onClick={() => setViewMode('receipt')}
                    className="btn-primary text-xs px-4 py-2 cursor-pointer"
                  >
                    Switch to Receipt View
                  </button>
                </div>
              )}

              {pdfUrl && !loading && !error && (
                <iframe
                  ref={iframeRef}
                  src={pdfUrl}
                  title="Digital Bilty PDF"
                  className="w-full h-full border-0 min-h-[380px] sm:min-h-[540px]"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-white/12 bg-[#060B16]/85 flex flex-col sm:flex-row items-center justify-between text-[10px] sm:text-[11px] text-slate-300 shrink-0 font-mono gap-1">
          <span>Official Verified Consignment Note • Use Receipt tab if PDF preview is unsupported on mobile</span>
          <span className="font-urdu text-emerald-400 font-bold text-xs sm:text-sm">تصدیق شدہ لاری بلٹی • قانونی دستاویز</span>
        </div>
      </div>
    </div>
  );
}
