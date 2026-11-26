import { useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowUpDown,
  Bell,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthAccountModal } from './components/AuthAccountModal';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { HeroSection } from './components/HeroSection';
import { Navbar } from './components/Navbar';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ProductImage } from './components/ProductImage';
import { SupportWidget } from './components/SupportWidget';
import { SEED_PRODUCTS } from './data/seedCatalog';
import {
  auth,
  db,
  OperationType,
  SUPPORT_WHATSAPP_NUMBER,
  handleFirestoreError,
} from './firebase';
import { formatAfn, TRANSLATIONS } from './i18n/translations';
import type {
  CartItem,
  FilterCategory,
  Language,
  Order,
  Product,
  ProductCategory,
  UserProfile,
  WishlistItem,
} from './types';

const CATEGORY_ACCENT_LINE: Record<ProductCategory, string> = {
  men: 'bg-gradient-to-r from-[#1E3A8A] via-[#3B82F6] to-[#1E3A8A]',
  women: 'bg-gradient-to-r from-[#9F1239] via-[#E11D48] to-[#C8A24A]',
  winter: 'bg-gradient-to-r from-[#0F766E] via-[#14B8A6] to-[#0B0B0C]',
  summer: 'bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#C8A24A]',
  shoes: 'bg-gradient-to-r from-[#78350F] via-[#B45309] to-[#C8A24A]',
  accessories: 'bg-gradient-to-r from-[#6D28D9] via-[#A855F7] to-[#C8A24A]',
};

const FILTER_TABS: FilterCategory[] = [
  'all',
  'men',
  'women',
  'winter',
  'summer',
  'shoes',
  'accessories',
  'new',
  'sale',
  'wishlist',
];

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest';

function getEffectivePrice(product: Product): number {
  return product.discountPriceAfn > 0 && product.discountPriceAfn < product.priceAfn
    ? product.discountPriceAfn
    : product.priceAfn;
}

function getCreatedAtMs(product: Product): number {
  const ts = product.createdAt;
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof ts === 'object') {
    const obj = ts as { toMillis?: () => number; seconds?: number };
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
  }
  return 0;
}

export default function App() {
  const [lang, setLang] = useState<Language>('fa');
  const [showPromo, setShowPromo] = useState(true);
  const [activeView, setActiveView] = useState<'store' | 'admin'>('store');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);

  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [accountNotice, setAccountNotice] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [trackingInitialCode, setTrackingInitialCode] = useState('');

  const t = TRANSLATIONS[lang];

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      setUser(current);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Public products catalog listener
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const list: Product[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<Product, 'id'>),
          id: d.id,
        }));
        setFirestoreProducts(list);
        setProductsLoaded(true);
      },
      () => {
        setProductsLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  // Signed-in customer order history listener
  useEffect(() => {
    if (!authReady || !user) {
      setUserOrders([]);
      return;
    }
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Order[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<Order, 'id'>),
          id: d.id,
        }));
        setUserOrders(list);
      },
      (err) => {
        if (err.message.toLowerCase().includes('permission')) {
          handleFirestoreError(err, OperationType.LIST, 'orders');
        }
      }
    );
    return () => unsub();
  }, [authReady, user]);

  // Signed-in customer profile listener & loyalty field initialization
  useEffect(() => {
    if (!authReady || !user) {
      setUserProfile(null);
      return;
    }
    const userRef = doc(db, 'users', user.uid);
    let createTimer: number | undefined;

    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Omit<UserProfile, 'uid'>;
          setUserProfile({
            ...data,
            points: typeof data.points === 'number' ? data.points : 0,
            uid: snap.id,
          });
          if (data.points === undefined || data.lastOrderId === undefined) {
            void updateDoc(userRef, {
              points: typeof data.points === 'number' ? data.points : 0,
              lastOrderId: typeof data.lastOrderId === 'string' ? data.lastOrderId : '',
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
        } else {
          setUserProfile(null);
          if (!createTimer) {
            createTimer = window.setTimeout(() => {
              void getDoc(userRef)
                .then((latest) => {
                  if (!latest.exists()) {
                    return setDoc(userRef, {
                      fullName: (user.displayName || 'مشتری رادمنش فیشن').slice(0, 120),
                      email: (user.email || '').slice(0, 180),
                      phone: '',
                      province: 'کابل',
                      address: '',
                      preferredLanguage: lang,
                      role: 'customer',
                      points: 0,
                      lastOrderId: '',
                      createdAt: serverTimestamp(),
                      updatedAt: serverTimestamp(),
                    });
                  }
                  return undefined;
                })
                .catch(() => {});
            }, 900);
          }
        }
      },
      (err) => {
        if (err.message.toLowerCase().includes('permission')) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      }
    );
    return () => {
      if (createTimer) window.clearTimeout(createTimer);
      unsub();
    };
  }, [authReady, user]);

  // Signed-in customer wishlist listener
  useEffect(() => {
    if (!authReady || !user) {
      setWishlistItems([]);
      return;
    }
    const q = query(
      collection(db, 'users', user.uid, 'wishlist'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: WishlistItem[] = snap.docs.map((d) => d.data() as WishlistItem);
        setWishlistItems(list);
      },
      (err) => {
        if (err.message.toLowerCase().includes('permission')) {
          handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/wishlist`);
        }
      }
    );
    return () => unsub();
  }, [authReady, user]);

  const wishlistIdSet = useMemo(
    () => new Set(wishlistItems.map((w) => w.productId)),
    [wishlistItems]
  );

  // Display Firestore products if populated, otherwise curated starter collection
  const catalog = useMemo(() => {
    if (productsLoaded && firestoreProducts.length > 0) {
      return firestoreProducts;
    }
    return SEED_PRODUCTS;
  }, [firestoreProducts, productsLoaded]);

  // Open shared ?product=<id> deep link automatically
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (deepLinkedRef.current || !productsLoaded || catalog.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('product');
    if (!sharedId) {
      deepLinkedRef.current = true;
      return;
    }
    const found = catalog.find((item) => item.id === sharedId);
    if (found) {
      setSelectedProduct(found);
      deepLinkedRef.current = true;
    }
  }, [catalog, productsLoaded]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = catalog.filter((p) => {
      if (activeCategory === 'wishlist' && !wishlistIdSet.has(p.id)) return false;
      if (activeCategory === 'new' && !p.isNew) return false;
      if (
        activeCategory === 'sale' &&
        !(p.discountPriceAfn > 0 && p.discountPriceAfn < p.priceAfn)
      ) {
        return false;
      }
      if (
        activeCategory !== 'all' &&
        activeCategory !== 'new' &&
        activeCategory !== 'sale' &&
        activeCategory !== 'wishlist' &&
        p.category !== activeCategory
      ) {
        return false;
      }

      if (q) {
        const haystack = [
          p.nameDari,
          p.namePashto,
          p.descriptionDari,
          p.descriptionPashto,
          t.categories[p.category],
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      return [...filtered].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    }
    if (sortBy === 'price-desc') {
      return [...filtered].sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    }
    if (sortBy === 'newest') {
      return [...filtered].sort((a, b) => {
        const timeDiff = getCreatedAtMs(b) - getCreatedAtMs(a);
        if (timeDiff !== 0) return timeDiff;
        return Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
      });
    }
    return filtered;
  }, [catalog, activeCategory, searchQuery, sortBy, wishlistIdSet, t.categories]);

  const handleAddToCart = (
    product: Product,
    size: string,
    color: string,
    quantity: number
  ) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedSize === size &&
          item.selectedColor === color
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: Math.min(Math.max(1, product.stock), next[idx].quantity + quantity),
        };
        return next;
      }
      return [...prev, { product, selectedSize: size, selectedColor: color, quantity }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const item = next[index];
      if (!item) return prev;
      const updatedQty = item.quantity + delta;
      if (updatedQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = {
          ...item,
          quantity: Math.min(Math.max(1, item.product.stock), updatedQty),
        };
      }
      return next;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleToggleWishlist = async (product: Product) => {
    if (!user) {
      setAccountNotice(t.wishlistLoginPrompt);
      setIsAccountOpen(true);
      return;
    }
    const path = `users/${user.uid}/wishlist/${product.id}`;
    const docRef = doc(db, 'users', user.uid, 'wishlist', product.id);
    try {
      if (wishlistIdSet.has(product.id)) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, {
          userId: user.uid,
          productId: product.id,
          nameDari: product.nameDari.slice(0, 140),
          namePashto: product.namePashto.slice(0, 140),
          category: product.category,
          priceAfn: product.priceAfn,
          discountPriceAfn: product.discountPriceAfn,
          imageUrl: product.imageUrl.slice(0, 500),
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const handleRemoveWishlistById = async (productId: string) => {
    if (!user) return;
    const path = `users/${user.uid}/wishlist/${productId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'wishlist', productId));
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  };

  const handleNavigateView = (view: 'store' | 'admin', sectionId?: string) => {
    setActiveView(view);
    if (view === 'store' && sectionId) {
      window.setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div id="top" className="min-h-screen flex flex-col bg-white text-[#0B0B0C]" dir="rtl">
      {/* Slim Dismissible Promotional Banner (<= 36px) */}
      {showPromo && (
        <div className="bg-[#C81E1E] text-white text-xs py-2 px-4 flex items-center justify-center relative">
          <p className="truncate max-w-[90%] font-medium">{t.promoBanner}</p>
          <button
            type="button"
            onClick={() => setShowPromo(false)}
            aria-label="بستن اعلان"
            className="absolute left-3 p-1 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Obsidian Black Top Bar */}
      <Navbar
        lang={lang}
        activeView={activeView}
        userDisplayName={userProfile?.fullName || user?.displayName || undefined}
        onNavigateView={handleNavigateView}
        onOpenTracking={() => {
          setTrackingInitialCode('');
          setIsTrackingOpen(true);
        }}
        onOpenAccount={() => setIsAccountOpen(true)}
      />

      {/* Main Viewport */}
      <main className="flex-1">
        {activeView === 'admin' ? (
          <AdminDashboard
            lang={lang}
            user={user}
            products={catalog}
            onBackToStore={() => setActiveView('store')}
          />
        ) : (
          <>
            {/* Editorial Luxury Hero */}
            <HeroSection lang={lang} />

            {/* 3D Multi-Color Architectural Line */}
            <div className="divider-3d-multi w-full" aria-hidden="true" />

            {/* Storefront Utility Toolbar: Language Switcher + Search + Category Filter */}
            <section id="catalog" className="bg-[#FAF9F6]">
              <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="w-full pr-10 pl-4 py-2.5 bg-white border border-neutral-300 text-sm focus:outline-none focus:border-[#C8A24A]"
                    />
                  </div>

                  {/* Dari / Pashto Switcher & Quick Mobile Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      className="inline-flex border border-neutral-300 bg-white p-0.5"
                      role="group"
                      aria-label="انتخاب زبان"
                    >
                      <button
                        type="button"
                        onClick={() => setLang('fa')}
                        className={`px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          lang === 'fa'
                            ? 'bg-[#0B0B0C] text-white'
                            : 'text-neutral-700 hover:text-black'
                        }`}
                      >
                        دری
                      </button>
                      <button
                        type="button"
                        onClick={() => setLang('ps')}
                        className={`px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          lang === 'ps'
                            ? 'bg-[#0B0B0C] text-white'
                            : 'text-neutral-700 hover:text-black'
                        }`}
                      >
                        پشتو
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTrackingOpen(true)}
                      className="md:hidden px-3.5 py-2 border border-neutral-300 bg-white text-xs font-medium whitespace-nowrap cursor-pointer"
                    >
                      {t.navTrack}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAccountOpen(true)}
                      className="md:hidden px-3.5 py-2 border border-neutral-300 bg-white text-xs font-medium whitespace-nowrap cursor-pointer"
                    >
                      {userProfile?.fullName || user?.displayName || t.navAccount}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('admin')}
                      className="md:hidden px-3.5 py-2 border border-neutral-300 bg-white text-xs font-medium whitespace-nowrap cursor-pointer"
                    >
                      {t.navAdmin}
                    </button>
                  </div>
                </div>

                {/* Interactive Category Filter Buttons */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {FILTER_TABS.map((cat) => {
                    const active = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (cat === 'wishlist' && !user) {
                            setAccountNotice(t.wishlistLoginPrompt);
                            setIsAccountOpen(true);
                            return;
                          }
                          setActiveCategory(cat);
                        }}
                        className={`px-4 py-2 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#0B0B0C] text-white border-[#0B0B0C]'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#0B0B0C]'
                        }`}
                      >
                        {cat === 'wishlist' && user
                          ? `${t.categories[cat]} (${wishlistItems.length})`
                          : t.categories[cat]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="divider-3d-emboss w-full" aria-hidden="true" />
            </section>

            {/* Featured Collection Product Grid */}
            <section className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12">
              <div className="mb-8 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-xl sm:text-2xl font-semibold text-[#0B0B0C]">
                      {t.categories[activeCategory]}
                    </h2>
                    <span className="text-xs text-neutral-500 tabular-nums">
                      ({filteredProducts.length} {lang === 'fa' ? 'مدل' : 'ماډلونه'})
                    </span>
                  </div>

                  {/* Catalog Sort Dropdown */}
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="catalog-sort"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 whitespace-nowrap"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#C8A24A]" />
                      <span>{t.sortByLabel}</span>
                    </label>
                    <select
                      id="catalog-sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="px-3 py-2 bg-white border border-neutral-300 text-xs font-medium text-[#0B0B0C] focus:outline-none focus:border-[#C8A24A] cursor-pointer"
                    >
                      <option value="featured">{t.sortOptions.featured}</option>
                      <option value="price-asc">{t.sortOptions.priceAsc}</option>
                      <option value="price-desc">{t.sortOptions.priceDesc}</option>
                      <option value="newest">{t.sortOptions.newest}</option>
                    </select>
                  </div>
                </div>
                <div className="divider-3d-emboss w-full" aria-hidden="true" />
              </div>

              {filteredProducts.length === 0 ? (
                <div className="border border-neutral-200 p-12 text-center space-y-3">
                  <p className="text-sm text-neutral-600">
                    {lang === 'fa'
                      ? 'محصولی با این مشخصات یافت نشد.'
                      : 'د دې ځانګړتیاوو سره کوم محصول ونه موندل شو.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('all');
                      setSearchQuery('');
                    }}
                    className="px-5 py-2 bg-[#C8A24A] text-[#0B0B0C] text-xs font-semibold cursor-pointer"
                  >
                    {t.categories.all}
                  </button>
                </div>
              ) : (
                <MotionConfig reducedMotion="user">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                    {filteredProducts.map((product, index) => {
                      const name = lang === 'fa' ? product.nameDari : product.namePashto;
                      const hasDiscount =
                        product.discountPriceAfn > 0 &&
                        product.discountPriceAfn < product.priceAfn;
                      const activePrice = hasDiscount
                        ? product.discountPriceAfn
                        : product.priceAfn;
                      const discountPct = hasDiscount
                        ? Math.round(
                            ((product.priceAfn - product.discountPriceAfn) / product.priceAfn) *
                              100
                          )
                        : 0;

                      return (
                        <motion.div
                          key={`${activeCategory}-${product.id}`}
                          initial={{ opacity: 0, y: 18 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.05 }}
                          transition={{
                            duration: 0.42,
                            delay: Math.min(index % 3, 2) * 0.07,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="h-full"
                        >
                          <article className="group h-full border border-neutral-200/90 bg-white flex flex-col overflow-hidden card-3d-luxury will-change-transform transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.018] hover:-translate-y-0.5 hover:border-[#C8A24A]/70">
                            <div
                              className={`h-[3px] w-full shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ${CATEGORY_ACCENT_LINE[product.category]}`}
                              aria-hidden="true"
                            />
                            {/* 4:3 Studio Product Photography + Wishlist Toggle */}
                            <div className="relative aspect-[4/3] w-full bg-[#F3EFE6] overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setSelectedProduct(product)}
                                className="w-full h-full block text-right cursor-pointer transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                              >
                                <ProductImage src={product.imageUrl} alt={name} />
                              </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleWishlist(product)}
                            aria-pressed={wishlistIdSet.has(product.id)}
                            aria-label={
                              wishlistIdSet.has(product.id)
                                ? t.removeFromWishlist
                                : t.addToWishlist
                            }
                            className="absolute top-3 left-3 w-9 h-9 bg-white/95 border border-neutral-200 flex items-center justify-center hover:border-[#0B0B0C] transition-colors cursor-pointer"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                wishlistIdSet.has(product.id)
                                  ? 'fill-[#C81E1E] text-[#C81E1E]'
                                  : 'text-neutral-700'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Clean Unboxed Metadata + Pricing + Primary Action */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                              <span>{t.categories[product.category]}</span>
                              <span aria-hidden="true">·</span>
                              {product.stock <= 0 ? (
                                <span className="text-[#C81E1E] font-medium">{t.outOfStock}</span>
                              ) : hasDiscount ? (
                                <span className="text-[#C81E1E] font-semibold">
                                  {discountPct}% {t.discountTag}
                                </span>
                              ) : product.isNew ? (
                                <span className="text-[#8C6D23] font-medium">{t.newTag}</span>
                              ) : (
                                <span className="tabular-nums">{t.inStock}</span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedProduct(product)}
                              className="block text-right text-base font-semibold text-[#0B0B0C] group-hover:text-[#8C6D23] transition-colors cursor-pointer"
                            >
                              {name}
                            </button>

                            <div className="text-xs text-neutral-500">
                              {product.sizes.join(' / ')}
                            </div>
                          </div>

                          <div className="pt-3">
                            <div className="divider-3d-emboss mb-3 w-full" aria-hidden="true" />
                            <div className="flex items-center justify-between gap-3">
                            <div>
                              <div
                                className={`text-sm font-bold tabular-nums ${
                                  hasDiscount ? 'text-[#C81E1E]' : 'text-[#0B0B0C]'
                                }`}
                              >
                                {formatAfn(activePrice, lang)}
                              </div>
                              {hasDiscount && (
                                <div className="text-xs text-neutral-400 line-through tabular-nums">
                                  {formatAfn(product.priceAfn, lang)}
                                </div>
                              )}
                            </div>

                            {product.stock <= 0 ? (
                              <button
                                type="button"
                                onClick={() => setSelectedProduct(product)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B0B0C] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <Bell className="w-3.5 h-3.5 text-[#C8A24A]" />
                                <span>{t.notifyMeShort}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddToCart(
                                    product,
                                    product.sizes[0] || 'M',
                                    product.colors[0] || 'مشکی',
                                    1
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C8A24A] text-[#0B0B0C] text-xs font-semibold hover:bg-[#d8b45c] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>{t.buyNow}</span>
                              </button>
                            )}
                            </div>
                          </div>
                        </div>
                          </article>
                        </motion.div>
                      );
                    })}
                  </div>
                </MotionConfig>
              )}
            </section>

            {/* Afghanistan Nationwide Trust & Delivery Bar */}
            <section className="bg-[#FAF9F6]">
              <div className="divider-3d-multi w-full" aria-hidden="true" />
              <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-neutral-200 card-3d-luxury overflow-hidden">
                  <div
                    className="h-[3px] w-full bg-gradient-to-r from-[#C8A24A] via-[#F3D78B] to-[#8C6D23] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                    aria-hidden="true"
                  />
                  <div className="p-5 flex items-start gap-3.5">
                    <MapPin className="w-5 h-5 text-[#C8A24A] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold">{t.afghanDeliveryTitle}</h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {lang === 'fa'
                          ? 'تحویل اکسپرس ۲۴ ساعته در کابل و ارسال مطمئن ۲ تا ۴ روزه به هرات، مزارشریف، قندهار، جلال‌آباد و تمام ولایات.'
                          : 'په کابل کې ۲۴ ساعته چټک لېږد او هرات، مزارشریف، کندهار، جلال‌آباد او ټولو ولایتونو ته مطمئن لېږد.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 card-3d-luxury overflow-hidden">
                  <div
                    className="h-[3px] w-full bg-gradient-to-r from-[#0F766E] via-[#14B8A6] to-[#0B0B0C] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                    aria-hidden="true"
                  />
                  <div className="p-5 flex items-start gap-3.5">
                    <ShieldCheck className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold">{t.codBannerTitle}</h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {lang === 'fa'
                          ? 'امکان پرداخت نقدی درب منزل پس از بررسی کالا، یا پرداخت فوری از طریق درگاه امن آنلاین.'
                          : 'د توکو له کتلو وروسته په کور کې نغدي تادیه، یا د خوندي انلاین درګاه له لارې تادیه.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 card-3d-luxury overflow-hidden">
                  <div
                    className="h-[3px] w-full bg-gradient-to-r from-[#9F1239] via-[#E11D48] to-[#C8A24A] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                    aria-hidden="true"
                  />
                  <div className="p-5 flex items-start gap-3.5">
                    <Phone className="w-5 h-5 text-[#9F1239] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold">{t.afghanPhoneTitle}</h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        <span dir="ltr" className="font-semibold text-[#0B0B0C] tabular-nums">
                          {SUPPORT_WHATSAPP_NUMBER}
                        </span>{' '}
                        ·{' '}
                        {lang === 'fa'
                          ? 'پشتیبانی ۲۴ ساعته و ارسال خودکار پیام پیگیری مرسولات در واتساپ.'
                          : '۲۴ ساعته ملاتړ او په واټساپ کې د مرسولو د تعقیب اتومات پیغامونه.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Luxury Black Footer */}
      <footer className="bg-[#0B0B0C] text-neutral-300">
        <div className="divider-3d-multi w-full" aria-hidden="true" />
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/aistudio/file_00000000b4ac81f49523277d654128bd_163e818d.png"
              alt="لوگوی رادمنش فیشن"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full object-cover border border-[#C8A24A]/50 bg-black shrink-0"
            />
            <div className="space-y-1">
              <div className="font-display text-lg font-semibold text-white tracking-wider">
                RADMANESH FASHION
              </div>
              <p className="text-xs text-[#C8A24A]">{t.slogan}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <button
              type="button"
              onClick={() => handleNavigateView('store', 'catalog')}
              className="hover:text-white cursor-pointer"
            >
              {t.navProducts}
            </button>
            <button
              type="button"
              onClick={() => setIsTrackingOpen(true)}
              className="hover:text-white cursor-pointer"
            >
              {t.navTrack}
            </button>
            <button
              type="button"
              onClick={() => setIsAccountOpen(true)}
              className="hover:text-white cursor-pointer"
            >
              {t.navAccount}
            </button>
            <button
              type="button"
              onClick={() => handleNavigateView('admin')}
              className="hover:text-white cursor-pointer"
            >
              {t.navAdmin}
            </button>
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER.replace('+', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#C8A24A] hover:underline"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span dir="ltr">{SUPPORT_WHATSAPP_NUMBER}</span>
            </a>
          </div>

          <div className="text-xs text-neutral-500">{t.footerCopyright}</div>
        </div>
      </footer>

      {/* Modals & Slide-overs */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          lang={lang}
          user={user}
          userProfile={userProfile}
          isWishlisted={wishlistIdSet.has(selectedProduct.id)}
          onToggleWishlist={(p) => void handleToggleWishlist(p)}
          onRequireAuth={(msg) => {
            setSelectedProduct(null);
            setAccountNotice(msg);
            setIsAccountOpen(true);
          }}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      <CartCheckoutDrawer
        isOpen={isCartOpen}
        lang={lang}
        items={cart}
        user={user}
        userProfile={userProfile}
        onClose={() => setIsCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        onTrackOrder={(code) => {
          setTrackingInitialCode(code);
          setIsTrackingOpen(true);
        }}
        onOpenAccount={() => setIsAccountOpen(true)}
      />

      {isTrackingOpen && (
        <OrderTrackingModal
          lang={lang}
          initialCode={trackingInitialCode}
          userOrders={userOrders}
          onClose={() => setIsTrackingOpen(false)}
        />
      )}

      {isAccountOpen && (
        <AuthAccountModal
          lang={lang}
          user={user}
          userProfile={userProfile}
          userOrders={userOrders}
          wishlistItems={wishlistItems}
          noticeMsg={accountNotice}
          onRemoveWishlist={(pid) => void handleRemoveWishlistById(pid)}
          onViewWishlistProduct={(pid) => {
            const found = catalog.find((item) => item.id === pid);
            if (found) setSelectedProduct(found);
          }}
          onClose={() => {
            setAccountNotice('');
            setIsAccountOpen(false);
          }}
          onTrackOrder={(code) => {
            setTrackingInitialCode(code);
            setIsTrackingOpen(true);
          }}
        />
      )}

      {/* 24/7 Online Support & Two-Way WhatsApp Widget + Corner Clothing Basket */}
      <SupportWidget
        lang={lang}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
      />
    </div>
  );
}
