import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  BarChart3,
  Download,
  ImagePlus,
  Link2,
  Loader2,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  isAdminEmail,
  OperationType,
  SUPPORT_WHATSAPP_NUMBER,
  handleFirestoreError,
} from '../firebase';
import { SEED_PRODUCTS, STUDIO_IMAGE_PRESETS } from '../data/seedCatalog';
import {
  buildOrderTrackingWhatsAppMessage,
  formatAfn,
  TRANSLATIONS,
} from '../i18n/translations';
import type {
  Language,
  Order,
  Product,
  ProductCategory,
  ShippingStatus,
  SupportMessage,
  SupportThreadSummary,
  WhatsAppLog,
} from '../types';
import { ProductImage } from './ProductImage';

interface AdminDashboardProps {
  lang: Language;
  user: User | null;
  products: Product[];
  onBackToStore: () => void;
}

type AdminTab = 'inventory' | 'shipments' | 'reports' | 'support';
type ImageInputMode = 'upload' | 'url' | 'preset';

function isValidProductImageUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.length < 4 || trimmed.length > 500) return false;
  return (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/src/assets/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://')
  );
}

async function compressProductImage(file: File): Promise<Blob> {
  if (typeof document === 'undefined') return file;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image decode error'));
      el.src = objectUrl;
    });

    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || maxDim) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || maxDim) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), outputType, 0.86)
    );
    if (!blob) return file;
    return blob.size <= file.size || file.size > 4.5 * 1024 * 1024 ? blob : file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function AdminDashboard({ lang, user, products, onBackToStore }: AdminDashboardProps) {
  const t = TRANSLATIONS[lang];
  const [activeTab, setActiveTab] = useState<AdminTab>('inventory');
  const [orders, setOrders] = useState<Order[]>([]);
  const [waLogs, setWaLogs] = useState<WhatsAppLog[]>([]);
  const [serverThreads, setServerThreads] = useState<SupportThreadSummary[]>([]);
  const [selectedThread, setSelectedThread] = useState<SupportThreadSummary | null>(null);
  const [threadMessages, setThreadMessages] = useState<SupportMessage[]>([]);
  const [operatorReply, setOperatorReply] = useState('');
  const [cloudApiConfigured, setCloudApiConfigured] = useState(false);
  const [authError, setAuthError] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ShippingStatus>('all');
  const [courierDrafts, setCourierDrafts] = useState<
    Record<string, { courierName: string; trackingNumber: string }>
  >({});

  // New Product Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNameDari, setNewNameDari] = useState('');
  const [newNamePashto, setNewNamePashto] = useState('');
  const [newDescDari, setNewDescDari] = useState('');
  const [newDescPashto, setNewDescPashto] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('men');
  const [newPriceAfn, setNewPriceAfn] = useState('4500');
  const [newDiscountAfn, setNewDiscountAfn] = useState('0');
  const [newStock, setNewStock] = useState('15');
  const [newSizes, setNewSizes] = useState('M, L, XL');
  const [newColors, setNewColors] = useState('مشکی, سرمه‌ای');
  const [newImageUrl, setNewImageUrl] = useState(STUDIO_IMAGE_PRESETS[0].url);
  const [imageInputMode, setImageInputMode] = useState<ImageInputMode>('upload');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState('');
  const [newIsNew, setNewIsNew] = useState(true);

  const isAuthorizedAdmin = Boolean(
    user && user.emailVerified && isAdminEmail(user.email)
  );

  // Check WhatsApp Cloud API config status
  useEffect(() => {
    fetch('/api/whatsapp/status')
      .then((r) => r.json())
      .then((d: { cloudApiConfigured?: boolean }) => {
        setCloudApiConfigured(Boolean(d.cloudApiConfigured));
      })
      .catch(() => {});
  }, []);

  // Subscribe to Admin Orders & WhatsApp Logs
  useEffect(() => {
    if (!isAuthorizedAdmin) return;

    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const list: Order[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<Order, 'id'>),
          id: d.id,
        }));
        setOrders(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const logsQuery = query(collection(db, 'whatsapp_logs'), orderBy('createdAt', 'desc'));
    const unsubLogs = onSnapshot(
      logsQuery,
      (snap) => {
        const list: WhatsAppLog[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<WhatsAppLog, 'id'>),
          id: d.id,
        }));
        setWaLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'whatsapp_logs')
    );

    return () => {
      unsubOrders();
      unsubLogs();
    };
  }, [isAuthorizedAdmin]);

  // Load Two-Way Support Threads from Server (including inbound WhatsApp webhook messages)
  const fetchSupportThreads = async () => {
    if (!user || !isAuthorizedAdmin) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/support/threads', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        threads?: Array<{
          threadId: string;
          customerName: string;
          customerPhone: string;
          channel: 'web' | 'whatsapp';
          status: 'open' | 'resolved';
          lastMessage: string;
          updatedAt: string;
        }>;
      };
      if (Array.isArray(data.threads)) {
        setServerThreads(
          data.threads.map((th) => ({
            ...th,
            customerUid: 'guest',
            source: 'server',
          }))
        );
      }
    } catch {
      // ignore transient error
    }
  };

  useEffect(() => {
    if (!isAuthorizedAdmin || activeTab !== 'support') return;
    void fetchSupportThreads();
    const timer = window.setInterval(() => {
      void fetchSupportThreads();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [isAuthorizedAdmin, activeTab]);

  useEffect(() => {
    if (!selectedThread) return;
    fetch(`/api/support/messages?threadId=${encodeURIComponent(selectedThread.threadId)}`)
      .then((r) => r.json())
      .then((d: { messages?: SupportMessage[] }) => {
        if (Array.isArray(d.messages)) setThreadMessages(d.messages);
      })
      .catch(() => {});
  }, [selectedThread, serverThreads]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'ورود با خطا مواجه شد.');
    }
  };

  const handleSeedCatalog = async () => {
    try {
      const batch = writeBatch(db);
      for (const item of SEED_PRODUCTS) {
        const ref = doc(db, 'products', item.id);
        batch.set(ref, {
          nameDari: item.nameDari,
          namePashto: item.namePashto,
          descriptionDari: item.descriptionDari,
          descriptionPashto: item.descriptionPashto,
          category: item.category,
          priceAfn: item.priceAfn,
          discountPriceAfn: item.discountPriceAfn,
          stock: item.stock,
          sizes: item.sizes,
          colors: item.colors,
          imageUrl: item.imageUrl,
          isNew: item.isNew,
          isFeatured: item.isFeatured,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setActionFeedback('کلکسیون اولیه محصولات با موفقیت در پایگاه داده ذخیره شد.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  };

  const handleUploadProductPhoto = async (file: File, targetProduct?: Product) => {
    if (!user) return;
    setImageUploadError('');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImageUploadError('فقط فایل‌های تصویری JPG، PNG یا WebP پشتیبانی می‌شوند.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setImageUploadError('حجم فایل انتخاب‌شده بسیار زیاد است (حداکثر ۱۵ مگابایت).');
      return;
    }

    if (targetProduct) {
      setUpdatingProductId(targetProduct.id);
    } else {
      setUploadingImage(true);
    }

    try {
      const optimizedBlob = await compressProductImage(file);
      if (optimizedBlob.size > 5 * 1024 * 1024) {
        setImageUploadError('حجم تصویر پس از بهینه‌سازی هنوز بیش از ۵ مگابایت است.');
        return;
      }

      const idToken = await user.getIdToken();
      const uploadRes = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': optimizedBlob.type || 'image/jpeg',
        },
        body: optimizedBlob,
      });

      const uploadData = (await uploadRes.json()) as { ok?: boolean; url?: string; error?: string };
      if (!uploadRes.ok || !uploadData.url) {
        setImageUploadError(uploadData.error || 'آپلود تصویر با خطا مواجه شد.');
        return;
      }

      if (targetProduct) {
        await updateDoc(doc(db, 'products', targetProduct.id), {
          imageUrl: uploadData.url,
          updatedAt: serverTimestamp(),
        });
        setActionFeedback(`تصویر محصول «${targetProduct.nameDari}» با موفقیت به‌روزرسانی شد.`);
      } else {
        setNewImageUrl(uploadData.url);
        setActionFeedback('عکس محصول با موفقیت آپلود و آماده ذخیره شد.');
      }
    } catch (err) {
      if (targetProduct) {
        handleFirestoreError(err, OperationType.UPDATE, `products/${targetProduct.id}`);
      } else {
        setImageUploadError('خطا در ارتباط با سرور هنگام آپلود تصویر.');
      }
    } finally {
      setUploadingImage(false);
      setUpdatingProductId(null);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageUploadError('');

    const sanitizedImageUrl = newImageUrl.trim();
    if (!isValidProductImageUrl(sanitizedImageUrl)) {
      setImageUploadError(
        'لطفاً یک عکس از دستگاه آپلود کنید، تصویر استودیویی انتخاب نمایید یا لینک معتبر (https://...) وارد کنید.'
      );
      return;
    }

    const id = `rf_prod_${Date.now()}`;
    const price = Math.max(100, Number(newPriceAfn) || 0);
    const discount = Math.max(0, Number(newDiscountAfn) || 0);
    const stock = Math.max(0, Math.floor(Number(newStock) || 0));
    const sizes = newSizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    const colors = newColors
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 10);

    try {
      await setDoc(doc(db, 'products', id), {
        nameDari: newNameDari.trim().slice(0, 140),
        namePashto: (newNamePashto.trim() || newNameDari.trim()).slice(0, 140),
        descriptionDari: (newDescDari.trim() || 'کیفیت عالی از کلکسیون رادمنش فیشن').slice(0, 1000),
        descriptionPashto: (newDescPashto.trim() || newDescDari.trim() || 'د رادمنش فیشن غوره کیفیت').slice(0, 1000),
        category: newCategory,
        priceAfn: price,
        discountPriceAfn: discount > 0 && discount < price ? discount : 0,
        stock,
        sizes: sizes.length > 0 ? sizes : ['M', 'L'],
        colors: colors.length > 0 ? colors : ['مشکی'],
        imageUrl: sanitizedImageUrl.slice(0, 500),
        isNew: newIsNew,
        isFeatured: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowAddForm(false);
      setNewNameDari('');
      setNewNamePashto('');
      setNewDescDari('');
      setNewDescPashto('');
      setNewImageUrl(STUDIO_IMAGE_PRESETS[0].url);
      setImageInputMode('upload');
      setImageUploadError('');
      setActionFeedback('محصول جدید با موفقیت اضافه شد.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `products/${id}`);
    }
  };

  const handleAdjustStock = async (prod: Product, delta: number) => {
    const nextStock = Math.max(0, prod.stock + delta);
    try {
      await updateDoc(doc(db, 'products', prod.id), {
        stock: nextStock,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${prod.id}`);
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    try {
      await deleteDoc(doc(db, 'products', prodId));
      setActionFeedback('محصول حذف شد.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${prodId}`);
    }
  };

  const handleAdvanceOrder = async (order: Order, nextStatus: ShippingStatus) => {
    if (!user) return;
    const draft = courierDrafts[order.id] || {
      courierName: order.courierName || 'پیک سریع رادمنش',
      trackingNumber: order.trackingNumber || `KBL-${order.orderCode.slice(-4)}`,
    };

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'orders', order.id), {
        shippingStatus: nextStatus,
        courierName: draft.courierName.slice(0, 80),
        trackingNumber: draft.trackingNumber.slice(0, 64),
        whatsappNotified: true,
        paymentStatus: nextStatus === 'delivered' ? 'paid' : order.paymentStatus,
        updatedAt: serverTimestamp(),
      });

      batch.update(doc(db, 'order_tracking', order.orderCode), {
        shippingStatus: nextStatus,
        courierName: draft.courierName.slice(0, 80),
        trackingNumber: draft.trackingNumber.slice(0, 64),
        updatedAt: serverTimestamp(),
      });

      // Automatically decrement product inventory when confirming from pending
      if (order.shippingStatus === 'pending' && nextStatus === 'confirmed') {
        for (const item of order.items) {
          const match = products.find((p) => p.id === item.productId);
          if (match) {
            batch.update(doc(db, 'products', match.id), {
              stock: Math.max(0, match.stock - item.quantity),
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      await batch.commit();

      // Automated WhatsApp Ready Message Dispatch via Official API
      const message = buildOrderTrackingWhatsAppMessage({
        orderCode: order.orderCode,
        customerName: order.customerName,
        province: order.province,
        status: nextStatus,
        trackingNumber: draft.trackingNumber,
        courierName: draft.courierName,
        totalAfn: order.totalAfn,
      });

      const idToken = await user.getIdToken();
      const waRes = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          recipientPhone: order.phone,
          message,
          isAdminAction: true,
          orderCode: order.orderCode,
        }),
      });

      const waData = (await waRes.json()) as {
        deliveryMode?: 'cloud_api' | 'wa_me_link';
        status?: 'sent' | 'queued';
      };

      const logId = `wa_${Date.now()}`;
      await setDoc(doc(db, 'whatsapp_logs', logId), {
        orderCode: order.orderCode,
        recipientPhone: order.phone,
        templateName: `order_${nextStatus}`,
        messagePreview: message.slice(0, 1400),
        deliveryMode: waData.deliveryMode || 'wa_me_link',
        status: waData.status || 'queued',
        createdAt: serverTimestamp(),
      });

      setActionFeedback(
        `وضعیت سفارش ${order.orderCode} به «${t.shippingStatuses[nextStatus]}» تغییر یافت و پیام پیگیری واتساپ آماده/ارسال شد.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleOperatorReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !operatorReply.trim() || !user) return;

    const idToken = await user.getIdToken();
    const res = await fetch('/api/support/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        threadId: selectedThread.threadId,
        senderRole: 'operator',
        text: operatorReply.trim(),
        channel: selectedThread.channel,
        forwardToWhatsApp: Boolean(selectedThread.customerPhone),
      }),
    });

    if (res.ok) {
      setOperatorReply('');
      await fetchSupportThreads();
    }
  };

  const handleExportCsv = () => {
    const header = ['OrderCode', 'Customer', 'Province', 'PaymentMethod', 'PaymentStatus', 'ShippingStatus', 'TotalAFN'];
    const rows = orders.map((o) => [
      o.orderCode,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.province.replace(/"/g, '""')}"`,
      o.paymentMethod,
      o.paymentStatus,
      o.shippingStatus,
      String(o.totalAfn),
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radmanesh-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sign-In Gate if not authorized admin
  if (!user || !isAuthorizedAdmin) {
    return (
      <section className="max-w-[1280px] mx-auto px-4 sm:px-8 py-16">
        <div className="max-w-lg mx-auto border border-neutral-200 bg-white p-8 space-y-6 text-center">
          <ShieldCheck className="w-10 h-10 text-[#C8A24A] mx-auto" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{t.adminTitle}</h1>
            <p className="text-sm text-neutral-600 leading-relaxed">{t.adminSignInPrompt}</p>
          </div>
          {user && !isAuthorizedAdmin && (
            <div className="p-3 bg-red-50 border border-[#C81E1E]/30 text-xs text-[#C81E1E]">
              حساب فعلی ({user.email}) دسترسی مدیریت ندارد.
            </div>
          )}
          {authError && (
            <div className="p-3 bg-red-50 border border-[#C81E1E]/30 text-xs text-[#C81E1E]">
              {authError}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!user ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="px-6 py-3 bg-[#C8A24A] text-[#0B0B0C] text-sm font-semibold hover:bg-[#d8b45c] transition-colors cursor-pointer"
              >
                {t.signInGoogle}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void signOut(auth)}
                className="px-6 py-3 border border-neutral-300 text-sm font-medium hover:border-[#0B0B0C] cursor-pointer"
              >
                {t.signOut}
              </button>
            )}
            <button
              type="button"
              onClick={onBackToStore}
              className="px-6 py-3 border border-neutral-300 text-sm font-medium hover:border-[#0B0B0C] cursor-pointer"
            >
              بازگشت به فروشگاه
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Sales Metrics
  const activeOrders = orders.filter((o) => o.shippingStatus !== 'cancelled');
  const totalRevenueAfn = activeOrders.reduce((s, o) => s + o.totalAfn, 0);
  const deliveredCount = orders.filter((o) => o.shippingStatus === 'delivered').length;
  const lowStockCount = products.filter((p) => p.stock <= 5).length;

  const provinceStats = activeOrders.reduce<Record<string, { count: number; total: number }>>(
    (acc, o) => {
      if (!acc[o.province]) acc[o.province] = { count: 0, total: 0 };
      acc[o.province].count += 1;
      acc[o.province].total += o.totalAfn;
      return acc;
    },
    {}
  );

  const filteredOrders =
    statusFilter === 'all' ? orders : orders.filter((o) => o.shippingStatus === statusFilter);

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-8 py-8 space-y-6">
      {/* Admin Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0B0B0C]">{t.adminTitle}</h1>
          <p className="text-xs text-neutral-500 mt-1">
            مدیر ارشد: {user.email} · WhatsApp Cloud API:{' '}
            {cloudApiConfigured ? 'متصل به Meta Graph API' : 'حالت آماده ارسال (wa.me + Webhook)'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToStore}
            className="px-4 py-2 border border-neutral-300 text-xs font-medium hover:border-[#0B0B0C] whitespace-nowrap cursor-pointer"
          >
            نمایش فروشگاه
          </button>
          <button
            type="button"
            onClick={() => void signOut(auth)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B0B0C] text-white text-xs font-medium hover:bg-neutral-800 whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.signOut}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {(
          [
            { id: 'inventory', label: 'محصولات و موجودی انبار', icon: Package },
            { id: 'shipments', label: 'مدیریت مرسولات و ارسال سریع', icon: Truck },
            { id: 'reports', label: 'گزارش‌های فروش', icon: BarChart3 },
            { id: 'support', label: 'پشتیبانی ۲۴ ساعته و واتساپ', icon: MessageCircle },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#0B0B0C] text-white border-[#0B0B0C]'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#0B0B0C]'
              }`}
            >
              <Icon className="w-4 h-4 text-[#C8A24A]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {actionFeedback && (
        <div className="p-3.5 bg-[#FAF9F6] border border-[#C8A24A] text-xs font-medium text-[#0B0B0C] flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button
            type="button"
            onClick={() => setActionFeedback('')}
            className="text-neutral-500 hover:text-black cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {/* TAB 1: INVENTORY & PRODUCTS */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium text-neutral-600 tabular-nums">
              مجموع محصولات: {products.length} · هشدار کمبود موجودی: {lowStockCount}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSeedCatalog}
                className="px-4 py-2 border border-neutral-300 text-xs font-medium hover:border-[#0B0B0C] cursor-pointer whitespace-nowrap"
              >
                همگام‌سازی کلکسیون نمونه در Firestore
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C8A24A] text-[#0B0B0C] text-xs font-semibold hover:bg-[#d8b45c] cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن محصول جدید</span>
              </button>
            </div>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleAddProduct}
              className="border border-neutral-300 bg-[#FAF9F6] p-6 space-y-4"
            >
              <h3 className="text-sm font-semibold">مشخصات محصول جدید</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">نام محصول (دری)</label>
                  <input
                    type="text"
                    required
                    value={newNameDari}
                    onChange={(e) => setNewNameDari(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">نام محصول (پشتو)</label>
                  <input
                    type="text"
                    value={newNamePashto}
                    onChange={(e) => setNewNamePashto(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">دسته‌بندی</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm"
                  >
                    <option value="men">{t.categories.men}</option>
                    <option value="women">{t.categories.women}</option>
                    <option value="winter">{t.categories.winter}</option>
                    <option value="summer">{t.categories.summer}</option>
                    <option value="shoes">{t.categories.shoes}</option>
                    <option value="accessories">{t.categories.accessories}</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">قیمت (افغانی)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newPriceAfn}
                      onChange={(e) => setNewPriceAfn(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">قیمت تخفیف (۰=ندارد)</label>
                    <input
                      type="number"
                      min="0"
                      value={newDiscountAfn}
                      onChange={(e) => setNewDiscountAfn(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">موجودی انبار</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">سایزها (با کامه جدا کنید)</label>
                  <input
                    type="text"
                    value={newSizes}
                    onChange={(e) => setNewSizes(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">رنگ‌ها (با کامه جدا کنید)</label>
                  <input
                    type="text"
                    value={newColors}
                    onChange={(e) => setNewColors(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm"
                  />
                </div>
                <div className="md:col-span-2 border border-neutral-200 bg-white p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-[#0B0B0C]">
                      عکس محصول (آپلود مستقیم، لینک تصویر یا گالری استودیو)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setImageInputMode('upload');
                          setImageUploadError('');
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border cursor-pointer ${
                          imageInputMode === 'upload'
                            ? 'bg-[#0B0B0C] text-white border-[#0B0B0C]'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-[#0B0B0C]'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 text-[#C8A24A]" />
                        <span>آپلود از دستگاه</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageInputMode('url');
                          setImageUploadError('');
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border cursor-pointer ${
                          imageInputMode === 'url'
                            ? 'bg-[#0B0B0C] text-white border-[#0B0B0C]'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-[#0B0B0C]'
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5 text-[#C8A24A]" />
                        <span>لینک مستقیم عکس</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageInputMode('preset');
                          setImageUploadError('');
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border cursor-pointer ${
                          imageInputMode === 'preset'
                            ? 'bg-[#0B0B0C] text-white border-[#0B0B0C]'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-[#0B0B0C]'
                        }`}
                      >
                        <ImagePlus className="w-3.5 h-3.5 text-[#C8A24A]" />
                        <span>تصاویر استودیویی</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-4">
                      <div className="aspect-[4/3] w-full bg-[#F3EFE6] border border-neutral-200 overflow-hidden">
                        <ProductImage
                          src={isValidProductImageUrl(newImageUrl) ? newImageUrl : ''}
                          alt={newNameDari || 'پیش‌نمایش عکس محصول'}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-8 space-y-3">
                      {imageInputMode === 'upload' && (
                        <div className="space-y-2">
                          <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-neutral-400 bg-[#FAF9F6] hover:border-[#C8A24A] p-5 text-center cursor-pointer transition-colors">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              disabled={uploadingImage}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) {
                                  void handleUploadProductPhoto(file);
                                }
                              }}
                              className="sr-only"
                            />
                            {uploadingImage ? (
                              <>
                                <Loader2 className="w-6 h-6 text-[#C8A24A] animate-spin" />
                                <span className="text-xs font-medium text-[#0B0B0C]">
                                  در حال بهینه‌سازی و آپلود عکس...
                                </span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-[#C8A24A]" />
                                <span className="text-xs font-semibold text-[#0B0B0C]">
                                  برای انتخاب عکس محصول از گالری یا کمپیوتر کلیک کنید
                                </span>
                                <span className="text-[11px] text-neutral-500">
                                  فرمت‌های مجاز: JPG، PNG، WebP (بهینه‌سازی خودکار برای لود سریع)
                                </span>
                              </>
                            )}
                          </label>
                          {newImageUrl.startsWith('/uploads/') && (
                            <div className="text-xs text-[#16A34A] font-medium" dir="ltr">
                              Uploaded: {newImageUrl}
                            </div>
                          )}
                        </div>
                      )}

                      {imageInputMode === 'url' && (
                        <div className="space-y-1.5">
                          <label className="block text-xs text-neutral-600">
                            آدرس اینترنتی عکس (https://... یا /uploads/...)
                          </label>
                          <input
                            type="url"
                            dir="ltr"
                            placeholder="https://example.com/product-photo.jpg"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm text-left"
                          />
                        </div>
                      )}

                      {imageInputMode === 'preset' && (
                        <div className="space-y-1.5">
                          <label className="block text-xs text-neutral-600">انتخاب از تصاویر استودیو</label>
                          <select
                            value={
                              STUDIO_IMAGE_PRESETS.some((p) => p.url === newImageUrl)
                                ? newImageUrl
                                : STUDIO_IMAGE_PRESETS[0].url
                            }
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm"
                          >
                            {STUDIO_IMAGE_PRESETS.map((preset) => (
                              <option key={preset.url} value={preset.url}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {imageUploadError && (
                        <div className="p-2.5 bg-red-50 border border-[#C81E1E]/30 text-xs text-[#C81E1E]">
                          {imageUploadError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-neutral-600 mb-1">توضیحات (دری)</label>
                  <input
                    type="text"
                    value={newDescDari}
                    onChange={(e) => setNewDescDari(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 bg-white text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={newIsNew}
                    onChange={(e) => setNewIsNew(e.target.checked)}
                    className="accent-[#C8A24A]"
                  />
                  <span>نمایش در بخش جدیدترین مدل‌ها</span>
                </label>
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="px-6 py-2.5 bg-[#0B0B0C] text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  {uploadingImage ? 'لطفاً صبر کنید...' : 'ذخیره محصول در پایگاه داده'}
                </button>
              </div>
            </form>
          )}

          {/* Inventory Data Table */}
          <div className="overflow-x-auto border border-neutral-200">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-neutral-200 text-xs text-neutral-600">
                  <th className="py-3 px-4 font-semibold">محصول</th>
                  <th className="py-3 px-4 font-semibold">دسته‌بندی</th>
                  <th className="py-3 px-4 font-semibold">قیمت (AFN)</th>
                  <th className="py-3 px-4 font-semibold">موجودی</th>
                  <th className="py-3 px-4 font-semibold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 bg-[#F3EFE6] shrink-0 overflow-hidden">
                          <ProductImage src={p.imageUrl} alt={p.nameDari} />
                        </div>
                        <span className="font-medium text-[#0B0B0C]">{p.nameDari}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-neutral-600">{t.categories[p.category]}</td>
                    <td className="py-3 px-4 tabular-nums">
                      {p.discountPriceAfn > 0 ? (
                        <div>
                          <span className="text-[#C81E1E] font-semibold">
                            {formatAfn(p.discountPriceAfn, lang)}
                          </span>
                          <span className="text-xs text-neutral-400 line-through block">
                            {formatAfn(p.priceAfn, lang)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold">{formatAfn(p.priceAfn, lang)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleAdjustStock(p, -1)}
                          className="w-7 h-7 border border-neutral-300 text-xs hover:border-black cursor-pointer"
                        >
                          -
                        </button>
                        <span
                          className={`w-8 text-center font-semibold tabular-nums ${
                            p.stock <= 5 ? 'text-[#C81E1E]' : 'text-[#0B0B0C]'
                          }`}
                        >
                          {p.stock}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleAdjustStock(p, 1)}
                          className="w-7 h-7 border border-neutral-300 text-xs hover:border-black cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-3">
                        <label
                          className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-[#0B0B0C] cursor-pointer"
                          title="تغییر عکس محصول"
                        >
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={updatingProductId === p.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file) {
                                void handleUploadProductPhoto(file, p);
                              }
                            }}
                            className="sr-only"
                          />
                          {updatingProductId === p.id ? (
                            <Loader2 className="w-4 h-4 text-[#C8A24A] animate-spin" />
                          ) : (
                            <ImagePlus className="w-4 h-4 text-[#8C6D23]" />
                          )}
                          <span className="hidden sm:inline">تغییر عکس</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => void handleDeleteProduct(p.id)}
                          className="text-neutral-400 hover:text-[#C81E1E] cursor-pointer"
                          aria-label="حذف محصول"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SHIPMENTS & EXPRESS DISPATCH */}
      {activeTab === 'shipments' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(
              ['all', 'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'] as const
            ).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium border cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#0B0B0C] text-white border-[#0B0B0C]'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-black'
                }`}
              >
                {st === 'all' ? 'همه مرسولات' : t.shippingStatuses[st]}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="border border-neutral-200 p-10 text-center text-sm text-neutral-500">
              هنوز سفارشی در این وضعیت ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((ord) => {
                const draft = courierDrafts[ord.id] || {
                  courierName: ord.courierName || 'پیک سریع رادمنش',
                  trackingNumber: ord.trackingNumber || `KBL-${ord.orderCode.slice(-4)}`,
                };
                return (
                  <div
                    key={ord.id}
                    className="border border-neutral-200 p-5 bg-white space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-base tabular-nums">{ord.orderCode}</span>
                          <span className="text-xs text-neutral-500">
                            {ord.province} · {t.paymentMethods[ord.paymentMethod]}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-700">
                          مشتری: {ord.customerName} · تماس: <span dir="ltr">{ord.phone}</span> ·{' '}
                          آدرس: {ord.address}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-base font-bold tabular-nums">
                          {formatAfn(ord.totalAfn, lang)}
                        </div>
                        <div className="text-xs font-medium text-[#8C6D23]">
                          {t.shippingStatuses[ord.shippingStatus]}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">پیک / شرکت انتقالات</label>
                        <input
                          type="text"
                          value={draft.courierName}
                          onChange={(e) =>
                            setCourierDrafts((prev) => ({
                              ...prev,
                              [ord.id]: { ...draft, courierName: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-1.5 border border-neutral-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">کد رهگیری مرسوله</label>
                        <input
                          type="text"
                          dir="ltr"
                          value={draft.trackingNumber}
                          onChange={(e) =>
                            setCourierDrafts((prev) => ({
                              ...prev,
                              [ord.id]: { ...draft, trackingNumber: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-1.5 border border-neutral-300 text-xs text-right tabular-nums"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ord.shippingStatus === 'pending' && (
                          <button
                            type="button"
                            onClick={() => void handleAdvanceOrder(ord, 'confirmed')}
                            className="px-3 py-2 bg-[#0B0B0C] text-white text-xs font-semibold hover:bg-neutral-800 cursor-pointer"
                          >
                            تأیید و ارسال پیام واتساپ
                          </button>
                        )}
                        {ord.shippingStatus === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => void handleAdvanceOrder(ord, 'packed')}
                            className="px-3 py-2 bg-[#0B0B0C] text-white text-xs font-semibold hover:bg-neutral-800 cursor-pointer"
                          >
                            بسته‌بندی و اطلاع‌رسانی
                          </button>
                        )}
                        {(ord.shippingStatus === 'packed' || ord.shippingStatus === 'confirmed') && (
                          <button
                            type="button"
                            onClick={() => void handleAdvanceOrder(ord, 'shipped')}
                            className="px-3 py-2 bg-[#C8A24A] text-[#0B0B0C] text-xs font-semibold hover:bg-[#d8b45c] cursor-pointer"
                          >
                            ارسال سریع (پیک) + پیام واتساپ
                          </button>
                        )}
                        {ord.shippingStatus === 'shipped' && (
                          <button
                            type="button"
                            onClick={() => void handleAdvanceOrder(ord, 'delivered')}
                            className="px-3 py-2 bg-[#16A34A] text-white text-xs font-semibold hover:opacity-90 cursor-pointer"
                          >
                            ثبت تحویل نهایی + پیام واتساپ
                          </button>
                        )}
                        <a
                          href={`https://wa.me/${ord.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                            buildOrderTrackingWhatsAppMessage({
                              orderCode: ord.orderCode,
                              customerName: ord.customerName,
                              province: ord.province,
                              status: ord.shippingStatus,
                              trackingNumber: draft.trackingNumber,
                              courierName: draft.courierName,
                              totalAfn: ord.totalAfn,
                            })
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 border border-neutral-300 text-xs font-medium hover:border-black"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#C8A24A]" />
                          <span>واتساپ دستی</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SALES REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">خلاصه عملکرد فروش و مرسولات</h2>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 text-xs font-semibold hover:border-black cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>خروجی اکسل (CSV)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-neutral-200 p-5 bg-[#FAF9F6]">
              <div className="text-xs text-neutral-500">مجموع فروش (AFN)</div>
              <div className="text-2xl font-bold mt-2 tabular-nums">
                {formatAfn(totalRevenueAfn, lang)}
              </div>
            </div>
            <div className="border border-neutral-200 p-5 bg-[#FAF9F6]">
              <div className="text-xs text-neutral-500">کل سفارش‌های فعال</div>
              <div className="text-2xl font-bold mt-2 tabular-nums">{activeOrders.length}</div>
            </div>
            <div className="border border-neutral-200 p-5 bg-[#FAF9F6]">
              <div className="text-xs text-neutral-500">مرسولات تحویل‌شده</div>
              <div className="text-2xl font-bold mt-2 tabular-nums">{deliveredCount}</div>
            </div>
            <div className="border border-neutral-200 p-5 bg-[#FAF9F6]">
              <div className="text-xs text-neutral-500">اقلام با موجودی کم</div>
              <div className="text-2xl font-bold mt-2 tabular-nums text-[#C81E1E]">
                {lowStockCount}
              </div>
            </div>
          </div>

          <div className="border border-neutral-200">
            <div className="px-5 py-3 bg-[#FAF9F6] border-b border-neutral-200 text-xs font-semibold">
              فروش بر اساس ولایت‌های افغانستان
            </div>
            <table className="w-full text-right text-sm border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                  <th className="py-2.5 px-5 font-medium">ولایت</th>
                  <th className="py-2.5 px-5 font-medium">تعداد سفارش</th>
                  <th className="py-2.5 px-5 font-medium">مجموع فروش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {Object.entries(provinceStats).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-xs text-neutral-500">
                      هنوز داده‌ای ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  Object.entries(provinceStats).map(([prov, stat]) => (
                    <tr key={prov}>
                      <td className="py-3 px-5 font-medium">{prov}</td>
                      <td className="py-3 px-5 tabular-nums">{stat.count}</td>
                      <td className="py-3 px-5 font-semibold tabular-nums">
                        {formatAfn(stat.total, lang)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 24/7 TWO-WAY SUPPORT & WHATSAPP LOGS */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 border border-neutral-200 bg-white">
            <div className="px-4 py-3 bg-[#FAF9F6] border-b border-neutral-200 text-xs font-semibold">
              گفتگوهای دوطرفه مشتریان (وب و وب‌هوک واتساپ {SUPPORT_WHATSAPP_NUMBER})
            </div>
            <div className="divide-y divide-neutral-200 max-h-[420px] overflow-y-auto">
              {serverThreads.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  پیامی در صندوق پشتیبانی دریافت نشده است.
                </div>
              ) : (
                serverThreads.map((th) => (
                  <button
                    key={th.threadId}
                    type="button"
                    onClick={() => setSelectedThread(th)}
                    className={`w-full p-4 text-right hover:bg-neutral-50 transition-colors cursor-pointer ${
                      selectedThread?.threadId === th.threadId ? 'bg-[#FAF9F6]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>{th.customerName}</span>
                      <span className="text-neutral-400">{th.channel}</span>
                    </div>
                    <div className="text-xs text-neutral-500 truncate mt-1">{th.lastMessage}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-7 border border-neutral-200 bg-white flex flex-col min-h-[380px]">
            {selectedThread ? (
              <>
                <div className="px-4 py-3 bg-[#0B0B0C] text-white text-xs flex items-center justify-between">
                  <span>
                    {selectedThread.customerName}{' '}
                    {selectedThread.customerPhone ? `(${selectedThread.customerPhone})` : ''}
                  </span>
                  <span>ارتباط دوطرفه فعال</span>
                </div>
                <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[280px]">
                  {threadMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.senderRole === 'operator' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] px-3.5 py-2 text-xs ${
                          m.senderRole === 'operator'
                            ? 'bg-[#0B0B0C] text-white'
                            : 'bg-[#F3EFE6] text-[#0B0B0C]'
                        }`}
                      >
                        <div className="opacity-70 mb-0.5">{m.senderName}</div>
                        <div>{m.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={handleOperatorReply}
                  className="p-3 border-t border-neutral-200 flex gap-2 bg-[#FAF9F6]"
                >
                  <input
                    type="text"
                    value={operatorReply}
                    onChange={(e) => setOperatorReply(e.target.value)}
                    placeholder="پاسخ اپراتور (ارسال هم‌زمان به چت و واتساپ مشتری)..."
                    className="flex-1 px-3 py-2 border border-neutral-300 bg-white text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#C8A24A] text-[#0B0B0C] text-xs font-semibold hover:bg-[#d8b45c] cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ارسال پاسخ</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-xs text-neutral-500">
                یک گفتگو را از لیست انتخاب کنید تا پاسخ دهید.
              </div>
            )}
          </div>

          {/* Automated WhatsApp Audit Logs */}
          <div className="lg:col-span-12 border border-neutral-200 bg-white">
            <div className="px-4 py-3 bg-[#FAF9F6] border-b border-neutral-200 text-xs font-semibold">
              گزارش پیام‌های خودکار پیگیری مرسولات در واتساپ API
            </div>
            <div className="divide-y divide-neutral-200 max-h-[260px] overflow-y-auto">
              {waLogs.length === 0 ? (
                <div className="p-5 text-center text-xs text-neutral-500">
                  با تغییر وضعیت هر سفارش در بخش مرسولات، پیام خودکار واتساپ در اینجا ثبت می‌شود.
                </div>
              ) : (
                waLogs.map((log) => (
                  <div key={log.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="space-y-1 max-w-2xl">
                      <div className="font-semibold tabular-nums">
                        {log.orderCode} · {log.recipientPhone} · {log.templateName}
                      </div>
                      <div className="text-neutral-600 line-clamp-2">{log.messagePreview}</div>
                    </div>
                    <span className="text-neutral-500">
                      {log.deliveryMode === 'cloud_api' ? 'Meta Cloud API' : 'WhatsApp Direct'} ·{' '}
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
