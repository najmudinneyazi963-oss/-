import { useEffect, useState } from 'react';
import { type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  Bell,
  Check,
  CheckCircle2,
  Copy,
  Heart,
  HelpCircle,
  MessageCircle,
  Minus,
  Plus,
  Ruler,
  Send,
  Share2,
  ShoppingBag,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  db,
  isAdminEmail,
  OperationType,
  SUPPORT_WHATSAPP_NUMBER,
  handleFirestoreError,
} from '../firebase';
import { formatAfn, TRANSLATIONS } from '../i18n/translations';
import type { Language, Product, ProductReview, UserProfile } from '../types';
import { ProductImage } from './ProductImage';
import { SizeGuideModal } from './SizeGuideModal';

interface ProductDetailModalProps {
  product: Product;
  lang: Language;
  user: User | null;
  userProfile: UserProfile | null;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onRequireAuth: (message: string) => void;
  onClose: () => void;
  onAddToCart: (product: Product, size: string, color: string, quantity: number) => void;
}

export function ProductDetailModal({
  product,
  lang,
  user,
  userProfile,
  isWishlisted,
  onToggleWishlist,
  onRequireAuth,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const t = TRANSLATIONS[lang];
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'M');
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || 'مشکی');
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [notifyEmail, setNotifyEmail] = useState(user?.email || userProfile?.email || '');
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifyError, setNotifyError] = useState('');

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    const defaultEmail = user?.email || userProfile?.email || '';
    if (defaultEmail && !notifyEmail) {
      setNotifyEmail(defaultEmail);
    }
  }, [user?.email, userProfile?.email]);

  const name = lang === 'fa' ? product.nameDari : product.namePashto;
  const description = lang === 'fa' ? product.descriptionDari : product.descriptionPashto;
  const hasDiscount = product.discountPriceAfn > 0 && product.discountPriceAfn < product.priceAfn;
  const activePrice = hasDiscount ? product.discountPriceAfn : product.priceAfn;

  // Subscribe to Firestore reviews linked to product.id
  useEffect(() => {
    const q = query(collection(db, 'reviews'), where('productId', '==', product.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ProductReview[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<ProductReview, 'id'>),
          id: d.id,
        }));
        list.sort((a, b) => {
          const timeA = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
          const timeB = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
          return timeB - timeA;
        });
        setReviews(list);
      },
      (err) => {
        if (err.message.toLowerCase().includes('permission')) {
          handleFirestoreError(err, OperationType.LIST, 'reviews');
        }
      }
    );
    return () => unsub();
  }, [product.id]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth(t.reviewLoginPrompt);
      return;
    }
    const cleanComment = comment.trim().slice(0, 600);
    if (cleanComment.length < 2) {
      setReviewError(
        lang === 'fa' ? 'لطفاً متن نظر خود را بنویسید.' : 'مهرباني وکړئ خپل نظر ولیکئ.'
      );
      return;
    }

    setSubmittingReview(true);
    setReviewError('');
    const reviewId = `rev_${Date.now()}_${user.uid.slice(0, 8)}`;
    const authorName = (
      userProfile?.fullName ||
      user.displayName ||
      user.email?.split('@')[0] ||
      'مشتری رادمنش فیشن'
    )
      .trim()
      .slice(0, 100);

    try {
      await setDoc(doc(db, 'reviews', reviewId), {
        productId: product.id,
        userId: user.uid,
        authorName: authorName.length >= 2 ? authorName : 'مشتری',
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        comment: cleanComment,
        createdAt: serverTimestamp(),
      });
      setComment('');
      setRating(5);
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.CREATE, `reviews/${reviewId}`);
      }
      setReviewError(
        lang === 'fa' ? 'ثبت نظر با خطا مواجه شد.' : 'د نظر ثبتول له ستونزې سره مخ شول.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reviews/${reviewId}`);
    }
  };

  const handleRequestBackInStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = notifyEmail.trim().slice(0, 180);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length < 5) {
      setNotifyError(t.notifyInvalidEmail);
      return;
    }

    setNotifySubmitting(true);
    setNotifyError('');
    const safeProdId = product.id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 48) || 'item';
    const requestId = `bis_${safeProdId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      await setDoc(doc(db, 'backInStockRequests', requestId), {
        productId: product.id,
        productNameDari: (product.nameDari || name).slice(0, 140),
        email: cleanEmail,
        userId: user ? user.uid : 'guest',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setNotifySubmitted(true);
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.CREATE, `backInStockRequests/${requestId}`);
      }
      setNotifyError(
        lang === 'fa'
          ? 'ثبت درخواست با خطا مواجه شد. لطفاً دوباره تلاش کنید.'
          : 'د غوښتنې ثبتول له ستونزې سره مخ شول.'
      );
    } finally {
      setNotifySubmitting(false);
    }
  };

  const waOrderText = [
    `سلام رادمنش فیشن، می‌خواهم این محصول را سفارش دهم:`,
    `محصول: ${product.nameDari}`,
    `سایز: ${selectedSize}`,
    `رنگ: ${selectedColor}`,
    `تعداد: ${quantity}`,
    `قیمت کل: ${new Intl.NumberFormat('en-US').format(activePrice * quantity)} افغانی`,
  ].join('\n');

  const waUrl = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(waOrderText)}`;

  const productShareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?product=${encodeURIComponent(product.id)}`
      : '';

  const waInquiryText =
    lang === 'fa'
      ? `سلام رادمنش فیشن، درباره این محصول سوال داشتم:\nمحصول: ${name}\nلینک محصول: ${productShareUrl}`
      : `سلام رادمنش فیشن، د دې محصول په اړه مې پوښتنه لرله:\nمحصول: ${name}\nد محصول لینک: ${productShareUrl}`;

  const waInquiryUrl = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(waInquiryText)}`;

  const shareText =
    lang === 'fa'
      ? `${name} — ${formatAfn(activePrice, lang)} در رادمنش فیشن`
      : `${name} — ${formatAfn(activePrice, lang)} په رادمنش فیشن کې`;

  const shareWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${productShareUrl}`)}`;
  const shareTelegramUrl = `https://t.me/share/url?url=${encodeURIComponent(productShareUrl)}&text=${encodeURIComponent(shareText)}`;

  const handleCopyShareLink = async () => {
    if (!productShareUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(productShareUrl);
      } else {
        const input = document.createElement('textarea');
        input.value = productShareUrl;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // ignore clipboard errors if blocked by browser policy
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <div className="bg-white text-[#0B0B0C] w-full max-w-4xl max-h-[92vh] overflow-y-auto border border-neutral-200 my-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-[#F9F8F5]">
          <span className="text-xs font-medium text-neutral-600">
            {t.categories[product.category]} ·{' '}
            {product.stock > 0 ? `${product.stock} ${t.inStock}` : t.outOfStock}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="p-2 text-neutral-600 hover:text-[#0B0B0C] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contiguous Purchase Module */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-6 bg-[#F3EFE6] aspect-[4/3] md:aspect-auto md:min-h-[420px]">
            <ProductImage src={product.imageUrl} alt={name} />
          </div>

          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-semibold text-[#0B0B0C] leading-snug">{name}</h2>
                {avgRating && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-[#C8A24A] text-[#C8A24A]" />
                    <span className="font-semibold text-[#0B0B0C]">{avgRating}</span>
                    <span>/ 5</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      ({reviews.length} {lang === 'fa' ? 'نظر' : 'نظریات'})
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-baseline gap-3">
                <span
                  className={`text-xl font-bold tabular-nums ${
                    hasDiscount ? 'text-[#C81E1E]' : 'text-[#0B0B0C]'
                  }`}
                >
                  {formatAfn(activePrice, lang)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-neutral-400 line-through tabular-nums">
                    {formatAfn(product.priceAfn, lang)}
                  </span>
                )}
              </div>

              <p className="text-sm text-neutral-600 leading-relaxed">{description}</p>

              {/* Size Selector */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-neutral-800">
                    {t.selectSize}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C6D23] hover:text-[#0B0B0C] underline underline-offset-4 cursor-pointer"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>{t.sizeGuideLink}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[44px] px-3 py-2 text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                        selectedSize === size
                          ? 'bg-[#0B0B0C] text-white border-[#0B0B0C]'
                          : 'bg-white text-neutral-800 border-neutral-300 hover:border-[#0B0B0C]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-800">
                  {t.selectColor}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`px-3.5 py-2 text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                        selectedColor === color
                          ? 'bg-[#0B0B0C] text-white border-[#0B0B0C]'
                          : 'bg-white text-neutral-800 border-neutral-300 hover:border-[#0B0B0C]'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-800">
                  {t.quantity}
                </label>
                <div className="inline-flex items-center border border-neutral-300">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2.5 text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                    aria-label="کاهش تعداد"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-5 text-sm font-semibold tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
                    className="p-2.5 text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                    aria-label="افزایش تعداد"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-neutral-200">
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={() => {
                    onAddToCart(product, selectedSize, selectedColor, quantity);
                    onClose();
                  }}
                  className="flex-1 py-3.5 px-6 bg-[#C8A24A] text-[#0B0B0C] text-sm font-semibold hover:bg-[#d8b45c] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{product.stock > 0 ? t.addToCart : t.outOfStock}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(product)}
                  aria-pressed={isWishlisted}
                  aria-label={isWishlisted ? t.removeFromWishlist : t.addToWishlist}
                  title={isWishlisted ? t.removeFromWishlist : t.addToWishlist}
                  className={`px-4 py-3.5 border transition-colors flex items-center justify-center cursor-pointer ${
                    isWishlisted
                      ? 'border-[#C81E1E] bg-red-50 text-[#C81E1E]'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-[#0B0B0C]'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-[#C81E1E]' : ''}`} />
                </button>
              </div>

              {product.stock <= 0 && (
                <div className="border border-[#C8A24A]/50 bg-[#FAF9F6] p-4 space-y-3">
                  {notifySubmitted ? (
                    <div className="flex items-start gap-2.5 text-xs text-[#0F766E] font-medium leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{t.notifySuccessMsg}</span>
                    </div>
                  ) : (
                    <form onSubmit={(e) => void handleRequestBackInStock(e)} className="space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0B0B0C]">
                        <Bell className="w-3.5 h-3.5 text-[#C8A24A]" />
                        <span>{t.notifyMeBtn}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          required
                          dir="ltr"
                          maxLength={180}
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          placeholder={t.notifyEmailPlaceholder}
                          className="flex-1 px-3 py-2 border border-neutral-300 bg-white text-xs text-right focus:outline-none focus:border-[#C8A24A]"
                        />
                        <button
                          type="submit"
                          disabled={notifySubmitting}
                          className="px-4 py-2 bg-[#0B0B0C] text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5 text-[#C8A24A]" />
                          <span>{notifySubmitting ? '...' : t.notifyMeBtn}</span>
                        </button>
                      </div>
                      {notifyError && (
                        <div className="text-xs text-[#C81E1E]">{notifyError}</div>
                      )}
                    </form>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 border border-[#0B0B0C] text-[#0B0B0C] text-xs sm:text-sm font-medium hover:bg-[#0B0B0C] hover:text-white transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>{t.orderWhatsAppDirect}</span>
                </a>
                <a
                  href={waInquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 border border-[#128C7E] bg-[#25D366]/10 text-[#0F766E] text-xs sm:text-sm font-semibold hover:bg-[#25D366] hover:text-white transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>{t.quickInquiryBtn}</span>
                </a>
              </div>

              {/* Social Media Sharing Bar (WhatsApp, Telegram, Copy Link) */}
              <div className="pt-3 border-t border-neutral-100 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                  <Share2 className="w-3.5 h-3.5 text-[#C8A24A]" />
                  <span>{t.shareLabel}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={shareWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-2.5 border border-[#25D366]/40 bg-[#25D366]/10 text-[#128C7E] text-xs font-semibold hover:bg-[#25D366] hover:text-white transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.shareWhatsApp}</span>
                  </a>
                  <a
                    href={shareTelegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-2.5 border border-[#0088CC]/40 bg-[#0088CC]/10 text-[#006699] text-xs font-semibold hover:bg-[#0088CC] hover:text-white transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.shareTelegram}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopyShareLink()}
                    className={`py-2 px-2.5 border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      copiedLink
                        ? 'border-[#0F766E] bg-[#0F766E] text-white'
                        : 'border-neutral-300 bg-white text-[#0B0B0C] hover:border-[#0B0B0C]'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.linkCopied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.copyLink}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews & Star Ratings Section */}
        <div className="border-t border-neutral-200 p-6 sm:p-8 bg-[#FAF9F6] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[#0B0B0C]">{t.reviewsTitle}</h3>
            {avgRating && (
              <div className="flex items-center gap-1.5 text-sm tabular-nums">
                <Star className="w-4 h-4 fill-[#C8A24A] text-[#C8A24A]" />
                <span className="font-bold">{avgRating}</span>
                <span className="text-neutral-500">
                  / 5 ({reviews.length})
                </span>
              </div>
            )}
          </div>

          {user ? (
            <form
              onSubmit={handleSubmitReview}
              className="border border-neutral-200 bg-white p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-neutral-700">{t.ratingLabel}</span>
                <div className="flex items-center gap-1" role="group" aria-label={t.ratingLabel}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} ستاره`}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          star <= rating
                            ? 'fill-[#C8A24A] text-[#C8A24A]'
                            : 'text-neutral-300 hover:text-[#C8A24A]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={3}
                required
                minLength={2}
                maxLength={600}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.reviewCommentPlaceholder}
                className="w-full px-3.5 py-2.5 border border-neutral-300 text-sm bg-white focus:outline-none focus:border-[#C8A24A]"
              />

              {reviewError && (
                <div className="text-xs text-[#C81E1E]">{reviewError}</div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2.5 bg-[#0B0B0C] text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submittingReview ? '...' : t.submitReviewBtn}
                </button>
              </div>
            </form>
          ) : (
            <div className="border border-neutral-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-neutral-600">{t.reviewLoginPrompt}</p>
              <button
                type="button"
                onClick={() => onRequireAuth(t.reviewLoginPrompt)}
                className="px-4 py-2 bg-[#C8A24A] text-[#0B0B0C] text-xs font-semibold hover:bg-[#d8b45c] whitespace-nowrap cursor-pointer"
              >
                {t.navAccount}
              </button>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <p className="text-xs text-neutral-500">{t.noReviewsYet}</p>
          ) : (
            <div className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
              {reviews.map((rev) => {
                const canDelete =
                  Boolean(user) &&
                  (user?.uid === rev.userId ||
                    (Boolean(user?.emailVerified) && isAdminEmail(user?.email)));
                return (
                  <div key={rev.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#0B0B0C]">
                          {rev.authorName}
                        </span>
                        <div className="flex items-center gap-0.5" aria-label={`${rev.rating} از ۵`}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating
                                  ? 'fill-[#C8A24A] text-[#C8A24A]'
                                  : 'text-neutral-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteReview(rev.id)}
                          aria-label="حذف نظر"
                          className="text-neutral-400 hover:text-[#C81E1E] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-neutral-700 leading-relaxed">{rev.comment}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showSizeGuide && (
        <SizeGuideModal
          lang={lang}
          initialGender={product.category === 'women' ? 'women' : 'men'}
          onClose={() => setShowSizeGuide(false)}
        />
      )}
    </div>
  );
}
