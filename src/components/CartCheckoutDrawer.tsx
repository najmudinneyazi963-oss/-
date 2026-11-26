import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
  Award,
  CheckCircle2,
  CreditCard,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { auth, db, OperationType, SUPPORT_WHATSAPP_NUMBER, handleFirestoreError } from '../firebase';
import {
  AFGHANISTAN_PROVINCES,
  LOYALTY_EARN_AFN_PER_POINT,
  LOYALTY_POINT_VALUE_AFN,
  formatAfn,
  TRANSLATIONS,
} from '../i18n/translations';
import type { CartItem, Language, PaymentMethod, UserProfile } from '../types';
import { ProductImage } from './ProductImage';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  lang: Language;
  items: CartItem[];
  user: User | null;
  userProfile?: UserProfile | null;
  onClose: () => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onTrackOrder: (orderCode: string) => void;
  onOpenAccount: () => void;
}

export function CartCheckoutDrawer({
  isOpen,
  lang,
  items,
  user,
  userProfile,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onTrackOrder,
  onOpenAccount,
}: CartCheckoutDrawerProps) {
  const t = TRANSLATIONS[lang];
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [provinceIdx, setProvinceIdx] = useState(0);
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!userProfile) return;
    if (!customerName && userProfile.fullName) setCustomerName(userProfile.fullName);
    if (!phone && userProfile.phone) setPhone(userProfile.phone);
    if (!address && userProfile.address) setAddress(userProfile.address);
    if (userProfile.province) {
      const idx = AFGHANISTAN_PROVINCES.findIndex(
        (p) => p.nameFa === userProfile.province || p.namePs === userProfile.province
      );
      if (idx >= 0) setProvinceIdx(idx);
    }
  }, [userProfile]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completedOrder, setCompletedOrder] = useState<{
    orderCode: string;
    totalAfn: number;
    pointsDiscountAfn: number;
    pointsEarned: number;
    paymentMethod: PaymentMethod;
    txRef?: string;
    waUrl?: string;
  } | null>(null);

  if (!isOpen) return null;

  const selectedProvince = AFGHANISTAN_PROVINCES[provinceIdx] || AFGHANISTAN_PROVINCES[0];
  const provinceName = lang === 'fa' ? selectedProvince.nameFa : selectedProvince.namePs;

  const subtotalAfn = items.reduce((sum, item) => {
    const unit =
      item.product.discountPriceAfn > 0 && item.product.discountPriceAfn < item.product.priceAfn
        ? item.product.discountPriceAfn
        : item.product.priceAfn;
    return sum + unit * item.quantity;
  }, 0);

  const deliveryFeeAfn = items.length > 0 ? selectedProvince.feeAfn : 0;
  const availablePoints =
    user && userProfile ? Math.max(0, Math.floor(userProfile.points ?? 0)) : 0;
  const maxRedeemablePoints = Math.min(
    availablePoints,
    Math.floor(subtotalAfn / LOYALTY_POINT_VALUE_AFN)
  );
  const appliedPoints =
    user && userProfile
      ? Math.min(Math.max(0, Math.floor(pointsToRedeem)), maxRedeemablePoints)
      : 0;
  const pointsDiscountAfn = appliedPoints * LOYALTY_POINT_VALUE_AFN;
  const totalAfn = Math.max(1, subtotalAfn + deliveryFeeAfn - pointsDiscountAfn);
  const pointsEarned =
    user && userProfile ? Math.floor(totalAfn / LOYALTY_EARN_AFN_PER_POINT) : 0;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const cleanName = customerName.trim().slice(0, 120);
    const cleanPhone = phone.trim().slice(0, 30);
    const cleanAddress = address.trim().slice(0, 300);
    const cleanNotes = notes.trim().slice(0, 400);

    if (cleanName.length < 2 || cleanPhone.length < 7 || cleanAddress.length < 4) {
      setError(
        lang === 'fa'
          ? 'لطفاً نام، شماره تماس معتبر و آدرس دقیق را وارد نمایید.'
          : 'مهرباني وکړئ نوم، معتبره د اړیکې شمېره او دقیق پته دننه کړئ.'
      );
      return;
    }

    if (paymentMethod === 'online' && cardNumber.replace(/\D/g, '').length < 8) {
      setError(
        lang === 'fa'
          ? 'لطفاً شماره کارت بانکی یا حساب‌پی معتبر وارد نمایید.'
          : 'مهرباني وکړئ د بانکي کارت یا حساب‌پې معتبره شمېره دننه کړئ.'
      );
      return;
    }

    setSubmitting(true);
    setError('');

    const suffix = Math.floor(100000 + Math.random() * 899999);
    const orderCode = `RF-${suffix}`;
    const orderId = `ord_${Date.now()}_${suffix}`;
    const uid = auth.currentUser?.uid || 'guest';

    try {
      let paymentStatus: 'pending' | 'paid' = 'pending';
      let txRef = '';

      if (paymentMethod === 'online') {
        const payRes = await fetch('/api/payments/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderCode,
            amountAfn: totalAfn,
            gateway: 'afghan_secure_gateway',
            cardHolder: cardHolder.trim() || cleanName,
            last4: cardNumber.replace(/\D/g, '').slice(-4),
          }),
        });
        const payJson = (await payRes.json()) as {
          ok?: boolean;
          transactionRef?: string;
          error?: string;
        };
        if (!payRes.ok || !payJson.ok) {
          throw new Error(payJson.error || 'پرداخت آنلاین ناموفق بود.');
        }
        paymentStatus = 'paid';
        txRef = payJson.transactionRef || '';
      }

      const orderItems = items.slice(0, 30).map((it) => ({
        productId: it.product.id,
        nameDari: it.product.nameDari.slice(0, 120),
        namePashto: it.product.namePashto.slice(0, 120),
        size: it.selectedSize,
        color: it.selectedColor,
        quantity: it.quantity,
        unitPriceAfn:
          it.product.discountPriceAfn > 0 && it.product.discountPriceAfn < it.product.priceAfn
            ? it.product.discountPriceAfn
            : it.product.priceAfn,
      }));

      const batch = writeBatch(db);
      const orderRef = doc(db, 'orders', orderId);
      const trackingRef = doc(db, 'order_tracking', orderCode);

      batch.set(orderRef, {
        orderCode,
        userId: uid,
        customerName: cleanName,
        phone: cleanPhone,
        province: provinceName,
        address: cleanAddress,
        notes: txRef ? `${cleanNotes} [TXN: ${txRef}]`.trim() : cleanNotes,
        items: orderItems,
        subtotalAfn,
        deliveryFeeAfn,
        pointsRedeemed: appliedPoints,
        pointsDiscountAfn,
        pointsEarned,
        totalAfn,
        paymentMethod,
        paymentStatus,
        shippingStatus: 'pending',
        trackingNumber: '',
        courierName: '',
        whatsappNotified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(trackingRef, {
        orderId,
        orderCode,
        province: provinceName,
        totalAfn,
        paymentMethod,
        shippingStatus: 'pending',
        courierName: '',
        trackingNumber: '',
        updatedAt: serverTimestamp(),
      });

      if (uid !== 'guest' && userProfile && (appliedPoints > 0 || pointsEarned > 0)) {
        const nextPoints = Math.max(0, availablePoints - appliedPoints + pointsEarned);
        batch.update(doc(db, 'users', uid), {
          points: nextPoints,
          lastOrderId: orderId,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      const itemSummary = orderItems
        .map((i) => `• ${i.nameDari} (${i.size} / ${i.color}) × ${i.quantity}`)
        .join('\n');
      const waMessage = [
        `سفارش جدید در فروشگاه *رادمنش فیشن (Radmanesh Fashion)*:`,
        `کد سفارش: ${orderCode}`,
        `مشتری: ${cleanName}`,
        `شماره تماس: ${cleanPhone}`,
        `ولایت: ${provinceName}`,
        `آدرس: ${cleanAddress}`,
        `روش پرداخت: ${t.paymentMethods[paymentMethod]}`,
        `محصولات:\n${itemSummary}`,
        pointsDiscountAfn > 0
          ? `تخفیف امتیاز وفاداری: -${new Intl.NumberFormat('en-US').format(pointsDiscountAfn)} افغانی`
          : '',
        `مبلغ کل: ${new Intl.NumberFormat('en-US').format(totalAfn)} افغانی`,
      ]
        .filter(Boolean)
        .join('\n');

      const waUrl = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(waMessage)}`;

      // Trigger official WhatsApp API dispatch notification log on server
      void fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: SUPPORT_WHATSAPP_NUMBER,
          message: waMessage,
          orderCode,
        }),
      }).catch(() => {});

      setPointsToRedeem(0);
      onClearCart();
      setCompletedOrder({
        orderCode,
        totalAfn,
        pointsDiscountAfn,
        pointsEarned,
        paymentMethod,
        txRef,
        waUrl,
      });
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
      }
      setError(
        err instanceof Error
          ? err.message
          : lang === 'fa'
            ? 'ثبت سفارش با خطا مواجه شد.'
            : 'د امر ثبتول له ستونزې سره مخ شول.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t.cartTitle}
    >
      <div className="bg-white text-[#0B0B0C] w-full max-w-xl h-full flex flex-col border-r border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B0B0C] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#C8A24A]" />
            <h2 className="text-base font-semibold">{t.cartTitle}</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setCompletedOrder(null);
              onClose();
            }}
            aria-label="بستن"
            className="p-1.5 text-neutral-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {completedOrder ? (
            <div className="border border-neutral-200 bg-[#FAF9F6] p-6 space-y-5 text-center">
              <CheckCircle2 className="w-12 h-12 text-[#C8A24A] mx-auto" />
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-[#0B0B0C]">{t.orderSuccessTitle}</h3>
                <p className="text-sm text-neutral-600">
                  {t.orderCodeLabel}:{' '}
                  <strong className="font-mono text-[#0B0B0C]">{completedOrder.orderCode}</strong>
                </p>
                {completedOrder.txRef && (
                  <p className="text-xs text-neutral-500 tabular-nums">
                    شماره مرجع پرداخت امن: {completedOrder.txRef}
                  </p>
                )}
              </div>

              <div className="py-3 border-y border-neutral-200 text-sm space-y-2">
                {completedOrder.pointsDiscountAfn > 0 && (
                  <div className="flex items-center justify-between text-xs text-[#16A34A]">
                    <span>{t.pointsDiscountLabel}</span>
                    <span className="tabular-nums">
                      -{formatAfn(completedOrder.pointsDiscountAfn, lang)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">{t.total}</span>
                  <span className="font-bold tabular-nums">
                    {formatAfn(completedOrder.totalAfn, lang)}
                  </span>
                </div>
                {completedOrder.pointsEarned > 0 && (
                  <div className="flex items-center justify-between text-xs text-[#8C6D23] font-medium pt-1">
                    <span>{t.pointsEarnedLabel}</span>
                    <span className="tabular-nums">
                      +{completedOrder.pointsEarned} {t.loyaltyPointsUnit}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                {completedOrder.waUrl && (
                  <a
                    href={completedOrder.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-5 bg-[#0B0B0C] text-white text-sm font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-[#C8A24A]" />
                    <span>{t.orderWhatsAppDirect}</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const code = completedOrder.orderCode;
                    setCompletedOrder(null);
                    onClose();
                    onTrackOrder(code);
                  }}
                  className="w-full py-3 px-5 bg-[#C8A24A] text-[#0B0B0C] text-sm font-semibold hover:bg-[#d8b45c] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>{t.navTrack}</span>
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <ShoppingBag className="w-10 h-10 text-neutral-300 mx-auto" />
              <p className="text-sm text-neutral-500">{t.emptyCart}</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="divide-y divide-neutral-200 border border-neutral-200">
                {items.map((item, idx) => {
                  const name = lang === 'fa' ? item.product.nameDari : item.product.namePashto;
                  const unit =
                    item.product.discountPriceAfn > 0 &&
                    item.product.discountPriceAfn < item.product.priceAfn
                      ? item.product.discountPriceAfn
                      : item.product.priceAfn;
                  return (
                    <div
                      key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                      className="p-4 flex gap-4 items-center"
                    >
                      <div className="w-20 h-20 bg-[#F3EFE6] shrink-0 overflow-hidden">
                        <ProductImage src={item.product.imageUrl} alt={name} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="text-sm font-semibold truncate">{name}</div>
                        <div className="text-xs text-neutral-500">
                          {item.selectedSize} · {item.selectedColor}
                        </div>
                        <div className="text-sm font-bold tabular-nums">
                          {formatAfn(unit * item.quantity, lang)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onRemoveItem(idx)}
                          aria-label="حذف"
                          className="text-neutral-400 hover:text-[#C81E1E] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="inline-flex items-center border border-neutral-300">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(idx, -1)}
                            className="p-1.5 hover:bg-neutral-100 cursor-pointer"
                            aria-label="کاهش"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(idx, 1)}
                            className="p-1.5 hover:bg-neutral-100 cursor-pointer"
                            aria-label="افزایش"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Loyalty Points Redemption */}
              {user && userProfile ? (
                <div className="border border-[#C8A24A]/60 bg-[#FAF9F6] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#0B0B0C]">
                      <Award className="w-4 h-4 text-[#C8A24A]" />
                      <span>{t.loyaltyBalanceLabel}</span>
                    </div>
                    <div className="text-xs font-bold tabular-nums text-[#8C6D23]">
                      {new Intl.NumberFormat('en-US').format(availablePoints)} {t.loyaltyPointsUnit} (
                      {formatAfn(availablePoints * LOYALTY_POINT_VALUE_AFN, lang)})
                    </div>
                  </div>

                  {maxRedeemablePoints > 0 && (
                    <div className="space-y-2 pt-2 border-t border-neutral-200">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label htmlFor="loyalty-points-range" className="text-neutral-700">
                          {t.redeemPointsLabel}
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setPointsToRedeem(
                              appliedPoints === maxRedeemablePoints ? 0 : maxRedeemablePoints
                            )
                          }
                          className="text-xs font-semibold text-[#8C6D23] hover:underline cursor-pointer"
                        >
                          {appliedPoints === maxRedeemablePoints
                            ? t.clearPointsBtn
                            : t.useMaxPointsBtn}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          id="loyalty-points-range"
                          type="range"
                          min={0}
                          max={maxRedeemablePoints}
                          value={appliedPoints}
                          onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                          className="flex-1 accent-[#C8A24A] cursor-pointer"
                        />
                        <input
                          type="number"
                          min={0}
                          max={maxRedeemablePoints}
                          value={appliedPoints}
                          onChange={(e) =>
                            setPointsToRedeem(
                              Math.min(
                                maxRedeemablePoints,
                                Math.max(0, Math.floor(Number(e.target.value) || 0))
                              )
                            )
                          }
                          className="w-20 px-2 py-1 border border-neutral-300 bg-white text-xs text-center tabular-nums"
                        />
                      </div>
                      {pointsDiscountAfn > 0 && (
                        <div className="text-xs font-medium text-[#16A34A] tabular-nums">
                          {t.pointsDiscountLabel}: -{formatAfn(pointsDiscountAfn, lang)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-neutral-600 flex items-center justify-between pt-1">
                    <span>{t.pointsEarnedLabel}</span>
                    <span className="font-semibold text-[#8C6D23] tabular-nums">
                      +{pointsEarned} {t.loyaltyPointsUnit}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border border-neutral-200 bg-[#FAF9F6] p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs text-neutral-700">
                    <Award className="w-4 h-4 text-[#C8A24A] shrink-0 mt-0.5" />
                    <span>{t.signInForPointsHint}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAccount();
                    }}
                    className="px-3 py-1.5 bg-[#0B0B0C] text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:bg-neutral-800"
                  >
                    {t.navAccount}
                  </button>
                </div>
              )}

              {/* Totals Summary */}
              <div className="border border-neutral-200 bg-[#FAF9F6] p-4 space-y-2 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>{t.subtotal}</span>
                  <span className="tabular-nums">{formatAfn(subtotalAfn, lang)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>
                    {t.deliveryFee} ({provinceName} · {selectedProvince.etaDays})
                  </span>
                  <span className="tabular-nums">{formatAfn(deliveryFeeAfn, lang)}</span>
                </div>
                {pointsDiscountAfn > 0 && (
                  <div className="flex justify-between text-[#16A34A] font-medium">
                    <span>
                      {t.pointsDiscountLabel} ({appliedPoints} {t.loyaltyPointsUnit})
                    </span>
                    <span className="tabular-nums">-{formatAfn(pointsDiscountAfn, lang)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-neutral-200">
                  <span>{t.total}</span>
                  <span className="tabular-nums">{formatAfn(totalAfn, lang)}</span>
                </div>
              </div>

              {/* Afghanistan Checkout Form */}
              <form onSubmit={handleCheckout} className="space-y-4">
                <h3 className="text-sm font-semibold border-b border-neutral-200 pb-2">
                  {t.checkoutTitle}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      {t.fullName}
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 text-sm focus:outline-none focus:border-[#C8A24A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      {t.phoneLabel}
                    </label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="+93 700 000 000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 text-sm focus:outline-none focus:border-[#C8A24A] text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t.provinceLabel}
                  </label>
                  <select
                    value={provinceIdx}
                    onChange={(e) => setProvinceIdx(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white focus:outline-none focus:border-[#C8A24A]"
                  >
                    {AFGHANISTAN_PROVINCES.map((prov, idx) => (
                      <option key={prov.nameFa} value={idx}>
                        {lang === 'fa' ? prov.nameFa : prov.namePs} ({formatAfn(prov.feeAfn, lang)} ·{' '}
                        {prov.etaDays})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t.addressLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm focus:outline-none focus:border-[#C8A24A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t.notesLabel}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 text-sm focus:outline-none focus:border-[#C8A24A]"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-semibold text-neutral-800">
                    {t.paymentMethodLabel}
                  </label>
                  <div className="space-y-2">
                    {(['cod', 'online', 'whatsapp'] as PaymentMethod[]).map((method) => (
                      <label
                        key={method}
                        className={`block p-3 border cursor-pointer transition-colors ${
                          paymentMethod === method
                            ? 'border-[#0B0B0C] bg-[#FAF9F6]'
                            : 'border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === method}
                            onChange={() => setPaymentMethod(method)}
                            className="accent-[#C8A24A]"
                          />
                          <span className="text-sm font-semibold">{t.paymentMethods[method]}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1 pr-6">{t.paymentDesc[method]}</p>
                      </label>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'online' && (
                  <div className="p-4 border border-neutral-300 bg-[#FAF9F6] space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#0B0B0C]">
                      <Lock className="w-3.5 h-3.5 text-[#C8A24A]" />
                      <span>درگاه پرداخت امن رادمنش فیشن (حساب‌پی / کارت بانکی)</span>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1">
                        {t.cardNumberLabel}
                      </label>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          dir="ltr"
                          placeholder="6037 9975 0000 0000"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full pr-9 pl-3 py-2 border border-neutral-300 text-sm bg-white text-right"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">
                          {t.cardHolderLabel}
                        </label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">
                          {t.expiryLabel}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          placeholder="08/28"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white text-right"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 border border-[#C81E1E]/30 bg-red-50 text-[#C81E1E] text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 bg-[#C8A24A] text-[#0B0B0C] text-sm font-semibold hover:bg-[#d8b45c] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting
                    ? '...'
                    : `${t.confirmOrderBtn} — ${formatAfn(totalAfn, lang)}`}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
