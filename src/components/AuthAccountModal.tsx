import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  Award,
  CheckCircle2,
  Heart,
  LogOut,
  Package,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import {
  AFGHANISTAN_PROVINCES,
  LOYALTY_POINT_VALUE_AFN,
  formatAfn,
  TRANSLATIONS,
} from '../i18n/translations';
import type { Language, Order, UserProfile, WishlistItem } from '../types';
import { ProductImage } from './ProductImage';

interface AuthAccountModalProps {
  lang: Language;
  user: User | null;
  userProfile: UserProfile | null;
  userOrders: Order[];
  wishlistItems: WishlistItem[];
  noticeMsg?: string;
  onRemoveWishlist: (productId: string) => void;
  onViewWishlistProduct: (productId: string) => void;
  onClose: () => void;
  onTrackOrder: (orderCode: string) => void;
}

export function AuthAccountModal({
  lang,
  user,
  userProfile,
  userOrders,
  wishlistItems,
  noticeMsg,
  onRemoveWishlist,
  onViewWishlistProduct,
  onClose,
  onTrackOrder,
}: AuthAccountModalProps) {
  const t = TRANSLATIONS[lang];
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState(AFGHANISTAN_PROVINCES[0].nameFa);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName);
      setPhone(userProfile.phone);
      setProvince(userProfile.province || AFGHANISTAN_PROVINCES[0].nameFa);
      setAddress(userProfile.address);
    } else if (user) {
      setFullName(user.displayName || '');
    }
  }, [userProfile, user]);

  const ensureCustomerProfileDoc = async (
    uid: string,
    emailAddr: string,
    displayName: string,
    phoneVal = '',
    provinceVal = AFGHANISTAN_PROVINCES[0].nameFa,
    addressVal = ''
  ) => {
    const ref = doc(db, 'users', uid);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          fullName: (displayName || 'مشتری رادمنش فیشن').slice(0, 120),
          email: emailAddr.slice(0, 180),
          phone: phoneVal.slice(0, 30),
          province: provinceVal.slice(0, 80),
          address: addressVal.slice(0, 300),
          preferredLanguage: lang,
          role: 'customer',
          points: 0,
          lastOrderId: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (phoneVal || addressVal) {
        const existingData = snap.data() as Partial<UserProfile>;
        await updateDoc(ref, {
          fullName: (displayName || existingData.fullName || 'مشتری رادمنش فیشن').slice(0, 120),
          phone: phoneVal.slice(0, 30),
          province: provinceVal.slice(0, 80),
          address: addressVal.slice(0, 300),
          preferredLanguage: lang,
          ...(existingData.points === undefined ? { points: 0, lastOrderId: '' } : {}),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }
      throw err;
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureCustomerProfileDoc(
        cred.user.uid,
        cred.user.email || '',
        cred.user.displayName || 'مشتری رادمنش فیشن'
      );
      setSuccessMsg(
        lang === 'fa'
          ? 'حساب کاربری شما با موفقیت فعال شد.'
          : 'ستاسو کارن حساب په بریالیتوب سره فعال شو.'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'fa'
            ? 'ورود با گوگل ناموفق بود.'
            : 'د ګوګل له لارې ننوتل ناکام شول.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const cleanName = fullName.trim();
        if (cleanName.length < 2) {
          throw new Error(
            lang === 'fa' ? 'لطفاً نام و تخلص خود را وارد کنید.' : 'مهرباني وکړئ خپل نوم ولیکئ.'
          );
        }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: cleanName });
        await ensureCustomerProfileDoc(
          cred.user.uid,
          cred.user.email || email.trim(),
          cleanName,
          phone.trim(),
          province,
          address.trim()
        );
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // non-fatal if verification email throttled
        }
        setSuccessMsg(
          lang === 'fa'
            ? 'ثبت‌نام شما با موفقیت انجام شد و لینک تأیید به ایمیلتان ارسال گردید.'
            : 'ستاسو نوم‌لیکنه په بریالیتوب سره ترسره شوه.'
        );
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await ensureCustomerProfileDoc(
          cred.user.uid,
          cred.user.email || email.trim(),
          cred.user.displayName || 'مشتری رادمنش فیشن'
        );
      }
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setError(
          lang === 'fa'
            ? 'ثبت‌نام با ایمیل و رمز عبور هنوز در Firebase Console فعال نشده است. می‌توانید هم‌اکنون با دکمه «ورود و ثبت‌نام با گوگل» وارد شوید.'
            : 'په Firebase Console کې د برېښنالیک نوم‌لیکنه لا نه ده فعاله شوې. تاسو همدا اوس له ګوګل سره ننوتلی شئ.'
        );
      } else if (code === 'auth/email-already-in-use') {
        setError(
          lang === 'fa'
            ? 'این ایمیل قبلاً ثبت شده است. لطفاً وارد شوید.'
            : 'دا برېښنالیک مخکې ثبت شوی دی.'
        );
      } else if (code === 'auth/weak-password') {
        setError(
          lang === 'fa'
            ? 'رمز عبور باید حداقل ۶ کاراکتر باشد.'
            : 'پټنوم باید لږ تر لږه ۶ توري ولري.'
        );
      } else if (code === 'auth/invalid-credential') {
        setError(
          lang === 'fa'
            ? 'ایمیل یا رمز عبور نادرست است.'
            : 'برېښنالیک یا پټنوم ناسم دی.'
        );
      } else {
        setError(err instanceof Error ? err.message : 'خطا در احراز هویت.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);
    const cleanName = fullName.trim().slice(0, 120);
    if (cleanName.length < 2) {
      setError(lang === 'fa' ? 'نام حداقل ۲ کاراکتر باشد.' : 'نوم باید لږ تر لږه ۲ توري وي.');
      setLoading(false);
      return;
    }

    try {
      const ref = doc(db, 'users', user.uid);
      if (userProfile) {
        await updateDoc(ref, {
          fullName: cleanName,
          phone: phone.trim().slice(0, 30),
          province: province.slice(0, 80),
          address: address.trim().slice(0, 300),
          preferredLanguage: lang,
          ...(userProfile.points === undefined ? { points: 0, lastOrderId: '' } : {}),
          updatedAt: serverTimestamp(),
        });
      } else {
        await ensureCustomerProfileDoc(
          user.uid,
          user.email || '',
          cleanName,
          phone.trim(),
          province,
          address.trim()
        );
      }
      setSuccessMsg(
        lang === 'fa'
          ? 'مشخصات شما ذخیره شد و در خریدهای بعدی به‌صورت خودکار پر می‌شود.'
          : 'ستاسو معلومات خوندي شول او په راتلونکو پیرودونو کې به په اتومات ډول ډک شي.'
      );
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
      setError(err instanceof Error ? err.message : 'خطا در ذخیره مشخصات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t.navAccount}
    >
      <div className="bg-white text-[#0B0B0C] w-full max-w-2xl border border-neutral-200 my-auto">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B0B0C] text-white">
          <div className="flex items-center gap-2.5">
            <UserIcon className="w-5 h-5 text-[#C8A24A]" />
            <h2 className="text-base font-semibold">{t.navAccount}</h2>
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
          {!user ? (
            <>
              {noticeMsg && (
                <div className="p-3.5 bg-[#FAF9F6] border border-[#C8A24A] text-xs font-medium text-[#0B0B0C]">
                  {noticeMsg}
                </div>
              )}
              {/* Quick Google Registration */}
              <div className="border border-neutral-200 bg-[#FAF9F6] p-5 space-y-3 text-center">
                <ShieldCheck className="w-7 h-7 text-[#C8A24A] mx-auto" />
                <div className="text-sm font-semibold">
                  {lang === 'fa'
                    ? 'ثبت‌نام و ورود سریع با حساب گوگل'
                    : 'د ګوګل حساب سره چټکه نوم‌لیکنه او ننوتل'}
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleGoogleAuth()}
                  className="w-full py-3 px-5 bg-[#C8A24A] text-[#0B0B0C] text-sm font-semibold hover:bg-[#d8b45c] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {t.signInGoogle}
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-neutral-400">
                <div className="flex-1 h-px bg-neutral-200" />
                <span>{lang === 'fa' ? 'یا با ایمیل و رمز عبور' : 'یا د برېښنالیک سره'}</span>
                <div className="flex-1 h-px bg-neutral-200" />
              </div>

              {/* Register / Login Toggle */}
              <div className="grid grid-cols-2 border border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className={`py-2.5 text-xs font-semibold cursor-pointer ${
                    mode === 'register'
                      ? 'bg-[#0B0B0C] text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {t.registerTab}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`py-2.5 text-xs font-semibold cursor-pointer ${
                    mode === 'login'
                      ? 'bg-[#0B0B0C] text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {t.loginTab}
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {mode === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-700 mb-1">{t.fullName}</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 text-sm focus:outline-none focus:border-[#C8A24A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-700 mb-1">{t.phoneLabel}</label>
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder="+93 700 000 000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 text-sm text-right focus:outline-none focus:border-[#C8A24A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-700 mb-1">
                        {t.provinceLabel}
                      </label>
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                      >
                        {AFGHANISTAN_PROVINCES.map((p) => (
                          <option key={p.nameFa} value={p.nameFa}>
                            {lang === 'fa' ? p.nameFa : p.namePs}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-700 mb-1">
                        {t.addressLabel}
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 text-sm focus:outline-none focus:border-[#C8A24A]"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-700 mb-1">{t.emailLabel}</label>
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 text-sm text-right focus:outline-none focus:border-[#C8A24A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-700 mb-1">{t.passwordLabel}</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 text-sm text-right focus:outline-none focus:border-[#C8A24A]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 border border-[#C81E1E]/30 bg-red-50 text-[#C81E1E] text-xs leading-relaxed">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#0B0B0C] text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {loading
                    ? '...'
                    : mode === 'register'
                      ? t.createAccountBtn
                      : t.loginBtn}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Authenticated Customer Dashboard */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
                <div>
                  <div className="text-base font-semibold">
                    {userProfile?.fullName || user.displayName || user.email}
                  </div>
                  <div className="text-xs text-neutral-500">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut(auth)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-neutral-300 text-xs font-medium hover:border-black cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.signOut}</span>
                </button>
              </div>

              {/* Loyalty Points Balance Card */}
              <div className="border border-[#C8A24A]/60 bg-[#FAF9F6] p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Award className="w-6 h-6 text-[#C8A24A] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#0B0B0C]">{t.loyaltyTitle}</div>
                    <p className="text-[11px] text-neutral-600">{t.loyaltyHowItWorks}</p>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold text-[#0B0B0C] tabular-nums">
                    {new Intl.NumberFormat('en-US').format(userProfile?.points ?? 0)}{' '}
                    <span className="text-xs font-semibold text-[#8C6D23]">
                      {t.loyaltyPointsUnit}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 tabular-nums">
                    {lang === 'fa' ? 'ارزش تخفیف:' : 'د تخفیف ارزښت:'}{' '}
                    {formatAfn((userProfile?.points ?? 0) * LOYALTY_POINT_VALUE_AFN, lang)}
                  </div>
                </div>
              </div>

              {successMsg && (
                <div className="p-3 bg-[#FAF9F6] border border-[#C8A24A] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C8A24A] shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="p-3 border border-[#C81E1E]/30 bg-red-50 text-[#C81E1E] text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">{t.fullName}</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">{t.phoneLabel}</label>
                    <input
                      type="tel"
                      dir="ltr"
                      placeholder="+93 700 000 000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 text-sm text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">{t.provinceLabel}</label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 text-sm bg-white"
                    >
                      {AFGHANISTAN_PROVINCES.map((p) => (
                        <option key={p.nameFa} value={p.nameFa}>
                          {lang === 'fa' ? p.nameFa : p.namePs}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">{t.addressLabel}</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#C8A24A] text-[#0B0B0C] text-xs font-semibold hover:bg-[#d8b45c] transition-colors cursor-pointer"
                >
                  {loading ? '...' : t.saveProfileBtn}
                </button>
              </form>

              {/* Saved Wishlist Items */}
              <div className="space-y-3 pt-4 border-t border-neutral-200">
                <h3 className="text-xs font-semibold text-neutral-700 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#C81E1E]" />
                  <span>
                    {t.wishlistTitle} ({wishlistItems.length})
                  </span>
                </h3>
                {wishlistItems.length === 0 ? (
                  <p className="text-xs text-neutral-500">{t.wishlistEmpty}</p>
                ) : (
                  <div className="divide-y divide-neutral-200 border border-neutral-200">
                    {wishlistItems.map((item) => {
                      const itemName = lang === 'fa' ? item.nameDari : item.namePashto;
                      const activePrice =
                        item.discountPriceAfn > 0 && item.discountPriceAfn < item.priceAfn
                          ? item.discountPriceAfn
                          : item.priceAfn;
                      return (
                        <div
                          key={item.productId}
                          className="px-4 py-3 flex items-center justify-between gap-3"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onViewWishlistProduct(item.productId);
                            }}
                            className="flex items-center gap-3 text-right flex-1 min-w-0 cursor-pointer hover:opacity-80"
                          >
                            <div className="w-12 h-10 bg-[#F3EFE6] shrink-0 overflow-hidden">
                              <ProductImage src={item.imageUrl} alt={itemName} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{itemName}</div>
                              <div className="text-xs text-neutral-500 tabular-nums">
                                {formatAfn(activePrice, lang)}
                              </div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveWishlist(item.productId)}
                            aria-label={t.removeFromWishlist}
                            className="p-1.5 text-neutral-400 hover:text-[#C81E1E] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Personal Order History */}
              <div className="space-y-3 pt-4 border-t border-neutral-200">
                <h3 className="text-xs font-semibold text-neutral-700 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#C8A24A]" />
                  <span>{t.myOrdersTitle}</span>
                </h3>
                {userOrders.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    {lang === 'fa' ? 'هنوز سفارشی ثبت نکرده‌اید.' : 'تاسو لا کوم امر نه دی ثبت کړی.'}
                  </p>
                ) : (
                  <div className="divide-y divide-neutral-200 border border-neutral-200">
                    {userOrders.map((ord) => (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          onTrackOrder(ord.orderCode);
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between text-right hover:bg-neutral-50 cursor-pointer"
                      >
                        <div>
                          <div className="text-sm font-semibold tabular-nums">{ord.orderCode}</div>
                          <div className="text-xs text-neutral-500">
                            {ord.province} · {t.shippingStatuses[ord.shippingStatus]}
                            {typeof ord.pointsEarned === 'number' && ord.pointsEarned > 0
                              ? ` · +${ord.pointsEarned} ${t.loyaltyPointsUnit}`
                              : ''}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold tabular-nums">
                            {formatAfn(ord.totalAfn, lang)}
                          </div>
                          {typeof ord.pointsDiscountAfn === 'number' && ord.pointsDiscountAfn > 0 && (
                            <div className="text-[11px] text-[#16A34A] tabular-nums">
                              -{formatAfn(ord.pointsDiscountAfn, lang)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
