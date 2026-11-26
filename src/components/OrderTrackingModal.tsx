import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle2, MessageCircle, Package, Search, Truck, X } from 'lucide-react';
import { db, OperationType, SUPPORT_WHATSAPP_NUMBER, handleFirestoreError } from '../firebase';
import { formatAfn, TRANSLATIONS } from '../i18n/translations';
import type { Language, Order, OrderTracking, ShippingStatus } from '../types';

interface OrderTrackingModalProps {
  lang: Language;
  initialCode?: string;
  userOrders: Order[];
  onClose: () => void;
}

const STEPS: ShippingStatus[] = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];

export function OrderTrackingModal({
  lang,
  initialCode = '',
  userOrders,
  onClose,
}: OrderTrackingModalProps) {
  const t = TRANSLATIONS[lang];
  const [searchCode, setSearchCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState<OrderTracking | null>(null);

  const handleSearch = async (codeOverride?: string) => {
    const clean = (codeOverride ?? searchCode).trim().toUpperCase();
    if (!clean || !/^[A-Z0-9_\-]{4,32}$/.test(clean)) {
      setError(
        lang === 'fa'
          ? 'لطفاً کد سفارش معتبر (مانند RF-1042) وارد کنید.'
          : 'مهرباني وکړئ معتبر د امر کوډ (لکه RF-1042) دننه کړئ.'
      );
      return;
    }

    setLoading(true);
    setError('');
    setTracking(null);
    const path = `order_tracking/${clean}`;
    try {
      const snap = await getDoc(doc(db, 'order_tracking', clean));
      if (!snap.exists()) {
        setError(
          lang === 'fa'
            ? 'سفارشی با این کد یافت نشد. لطفاً کد را بررسی کنید.'
            : 'په دې کوډ کوم امر ونه موندل شو.'
        );
      } else {
        setTracking(snap.data() as OrderTracking);
      }
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.GET, path);
      }
      setError(lang === 'fa' ? 'خطا در دریافت وضعیت سفارش.' : 'د امر حالت ترلاسه کولو کې تېروتنه.');
    } finally {
      setLoading(false);
    }
  };

  const activeStepIdx = tracking ? STEPS.indexOf(tracking.shippingStatus) : -1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t.trackTitle}
    >
      <div className="bg-white text-[#0B0B0C] w-full max-w-2xl border border-neutral-200 my-auto">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B0B0C] text-white">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-[#C8A24A]" />
            <h2 className="text-base font-semibold">{t.trackTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="p-1.5 text-neutral-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSearch();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder={t.trackPlaceholder}
                dir="ltr"
                className="w-full pr-10 pl-4 py-2.5 border border-neutral-300 text-sm focus:outline-none focus:border-[#C8A24A] text-right"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#C8A24A] text-[#0B0B0C] text-sm font-semibold hover:bg-[#d8b45c] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loading ? '...' : t.trackBtn}
            </button>
          </form>

          {error && (
            <div className="p-3.5 border border-[#C81E1E]/30 bg-red-50 text-[#C81E1E] text-sm">
              {error}
            </div>
          )}

          {tracking && (
            <div className="border border-neutral-200 p-5 space-y-5 bg-[#FAF9F6]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                <div>
                  <div className="text-xs text-neutral-500">{t.orderCodeLabel}</div>
                  <div className="text-lg font-bold tabular-nums">{tracking.orderCode}</div>
                </div>
                <div className="text-left">
                  <div className="text-xs text-neutral-500">{t.provinceLabel}</div>
                  <div className="text-sm font-semibold">{tracking.province}</div>
                </div>
                <div className="text-left">
                  <div className="text-xs text-neutral-500">{t.total}</div>
                  <div className="text-sm font-bold tabular-nums">
                    {formatAfn(tracking.totalAfn, lang)}
                  </div>
                </div>
              </div>

              {tracking.shippingStatus === 'cancelled' ? (
                <div className="p-3 bg-red-50 text-[#C81E1E] text-sm font-medium">
                  {t.shippingStatuses.cancelled}
                </div>
              ) : (
                <div className="space-y-3">
                  {STEPS.map((step, idx) => {
                    const done = idx <= activeStepIdx;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-[#C8A24A] shrink-0" />
                        ) : (
                          <Package className="w-5 h-5 text-neutral-300 shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            done ? 'font-semibold text-[#0B0B0C]' : 'text-neutral-400'
                          }`}
                        >
                          {t.shippingStatuses[step]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {(tracking.courierName || tracking.trackingNumber) && (
                <div className="pt-3 border-t border-neutral-200 text-xs text-neutral-700 flex flex-wrap gap-4">
                  {tracking.courierName && <span>پیک / شرکت انتقالات: {tracking.courierName}</span>}
                  {tracking.trackingNumber && (
                    <span className="tabular-nums">کد رهگیری مرسوله: {tracking.trackingNumber}</span>
                  )}
                </div>
              )}

              <div className="pt-2">
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(
                    `سلام، درباره سفارش ${tracking.orderCode} سوال داشتم.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#0B0B0C] hover:text-[#8C6D23] underline"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{t.supportWhatsAppBtn}</span>
                </a>
              </div>
            </div>
          )}

          {userOrders.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-neutral-200">
              <h3 className="text-xs font-semibold text-neutral-600">
                {lang === 'fa' ? 'سفارش‌های اخیر حساب شما' : 'ستاسو وروستي امرونه'}
              </h3>
              <div className="divide-y divide-neutral-200 border border-neutral-200">
                {userOrders.slice(0, 5).map((ord) => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => {
                      setSearchCode(ord.orderCode);
                      void handleSearch(ord.orderCode);
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between text-right hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold tabular-nums">{ord.orderCode}</div>
                      <div className="text-xs text-neutral-500">
                        {ord.province} · {t.shippingStatuses[ord.shippingStatus]}
                      </div>
                    </div>
                    <div className="text-sm font-bold tabular-nums">
                      {formatAfn(ord.totalAfn, lang)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
