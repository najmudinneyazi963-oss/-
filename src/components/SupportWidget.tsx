import { useEffect, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { auth, SUPPORT_WHATSAPP_NUMBER } from '../firebase';
import { TRANSLATIONS } from '../i18n/translations';
import type { Language, SupportMessage } from '../types';

interface SupportWidgetProps {
  lang: Language;
  cartCount: number;
  onOpenCart: () => void;
}

function getOrCreateThreadId(): string {
  const key = 'rf_support_thread_id';
  const existing = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  if (existing && /^[a-zA-Z0-9_\-]{8,64}$/.test(existing)) {
    return existing;
  }
  const created = `th_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, created);
  }
  return created;
}

export function SupportWidget({ lang, cartCount, onOpenCart }: SupportWidgetProps) {
  const t = TRANSLATIONS[lang];
  const [open, setOpen] = useState(false);
  const [threadId] = useState(getOrCreateThreadId);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/support/messages?threadId=${encodeURIComponent(threadId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: SupportMessage[] };
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch {
      // ignore transient network glitches
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadMessages();
    const timer = window.setInterval(() => {
      void loadMessages();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [open, threadId]);

  const handleSend = async (e: React.FormEvent, overrideText?: string) => {
    e.preventDefault();
    const text = (overrideText ?? inputText).trim();
    if (!text) return;

    setSending(true);
    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          customerName: customerName.trim() || auth.currentUser?.displayName || 'مشتری رادمنش فیشن',
          customerPhone: customerPhone.trim(),
          senderRole: 'customer',
          text,
          channel: 'web',
          forwardToWhatsApp: Boolean(customerPhone.trim()),
        }),
      });
      if (res.ok) {
        if (!overrideText) setInputText('');
        await loadMessages();
      }
    } finally {
      setSending(false);
    }
  };

  const quickPrompts =
    lang === 'fa'
      ? [
          'سفارش من به ولایت چه زمانی می‌رسد؟',
          'راهنمای انتخاب سایز لباس چیست؟',
          'امکان پرداخت نقدی هنگام تحویل هست؟',
        ]
      : [
          'زما امر به کله ولایت ته راورسېږي؟',
          'د جامو د اندازې لارښود څنګه دی؟',
          'آیا د تحویل پر مهال نغدي تادیه شته؟',
        ];

  const waUrl = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(
    `سلام پشتیبانی رادمنش فیشن، درباره محصولات و سفارش سوال داشتم.`
  )}`;

  return (
    <>
      {!open && (
        <div className="fixed bottom-5 left-5 z-40 flex flex-col items-center gap-3">
          {/* Circular Clothing Shopping Basket Button */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`${t.cartBtn} (${cartCount})`}
            title={t.cartBtn}
            className="relative w-14 h-14 rounded-full btn-3d-circle-cart border-2 border-[#0B0B0C] text-[#0B0B0C] flex items-center justify-center transition-transform duration-200 hover:scale-105 active:translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A24A]"
          >
            {/* Clothing Shopping Bag + Shirt Hanger Emblem */}
            <svg
              viewBox="0 0 28 28"
              fill="none"
              className="w-7 h-7"
              aria-hidden="true"
            >
              <path
                d="M9.5 9V7.5C9.5 5.29 11.51 3.5 14 3.5C16.49 3.5 18.5 5.29 18.5 7.5V9"
                stroke="#0B0B0C"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M5.5 9.5H22.5L24 23.5C24.08 24.3 23.45 25 22.65 25H5.35C4.55 25 3.92 24.3 4 23.5L5.5 9.5Z"
                fill="#0B0B0C"
              />
              {/* Apparel / Shirt Collar Silhouette inside the bag */}
              <path
                d="M11.2 13.5L14 15.6L16.8 13.5L19 15.2L17.6 17.2H16.6V21.5H11.4V17.2H10.4L9 15.2L11.2 13.5Z"
                fill="#F7E3A1"
              />
            </svg>
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-[#C81E1E] text-white text-[11px] font-bold flex items-center justify-center border-2 border-white tabular-nums shadow">
              {cartCount}
            </span>
          </button>

          {/* Circular WhatsApp Support Button */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t.supportTitle}
            title={t.supportTitle}
            className="w-14 h-14 rounded-full btn-3d-circle-wa border-2 border-white text-white flex items-center justify-center transition-transform duration-200 hover:scale-105 active:translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
          >
            <svg
              viewBox="0 0 32 32"
              fill="currentColor"
              className="w-7 h-7"
              aria-hidden="true"
            >
              <path d="M16.01 3.2C8.94 3.2 3.2 8.94 3.2 16.01c0 2.26.59 4.47 1.71 6.41L3.1 29.02l6.77-1.78a12.76 12.76 0 0 0 6.14 1.57h.01c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.33-6.64-3.75-9.06A12.73 12.73 0 0 0 16.01 3.2Zm7.46 18.21c-.31.88-1.82 1.68-2.51 1.78-.65.1-1.47.14-2.37-.15-.55-.18-1.26-.41-2.16-.8-3.8-1.64-6.28-5.46-6.47-5.72-.19-.25-1.55-2.06-1.55-3.93 0-1.87.98-2.79 1.33-3.17.35-.38.76-.48 1.01-.48.25 0 .51 0 .73.01.24.01.55-.09.86.66.31.76 1.07 2.62 1.16 2.81.09.19.16.41.03.66-.13.25-.19.41-.38.63-.19.22-.4.49-.57.66-.19.19-.39.4-.17.78.22.38.98 1.62 2.11 2.62 1.45 1.29 2.67 1.69 3.05 1.88.38.19.6.16.82-.09.22-.25.95-1.11 1.2-1.49.25-.38.5-.31.85-.19.35.13 2.21 1.04 2.59 1.23.38.19.63.28.73.44.09.16.09.92-.22 1.8Z" />
            </svg>
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed bottom-4 left-4 z-50 w-[calc(100vw-2rem)] max-w-sm bg-white border border-neutral-300 shadow-2xl flex flex-col max-h-[540px]"
          role="dialog"
          aria-label={t.supportTitle}
        >
          <div className="bg-[#0B0B0C] text-white px-4 py-3.5 flex items-center justify-between border-b border-white/10">
            <div>
              <div className="text-sm font-semibold">{t.supportTitle}</div>
              <div className="text-xs text-neutral-300">{t.supportSubtitle}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="بستن"
              className="p-1 text-neutral-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3 bg-[#FAF9F6] border-b border-neutral-200 grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder={t.fullName}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="px-2.5 py-1.5 border border-neutral-300 text-xs bg-white focus:outline-none focus:border-[#C8A24A]"
            />
            <input
              type="tel"
              dir="ltr"
              placeholder="WhatsApp (+93...)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="px-2.5 py-1.5 border border-neutral-300 text-xs bg-white text-right focus:outline-none focus:border-[#C8A24A]"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white min-h-[200px]">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {lang === 'fa'
                    ? 'سلام! تیم پشتیبانی ۲۴ ساعته رادمنش فیشن آماده پاسخگویی به شما است. همچنین می‌توانید مستقیم از طریق واتساپ با اپراتور گفتگو کنید.'
                    : 'سلام! د رادمنش فیشن ۲۴ ساعته ملاتړ ټیم ستاسو پوښتنو ته چمتو دی.'}
                </p>
                <div className="space-y-1.5">
                  {quickPrompts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={(e) => void handleSend(e, q)}
                      className="w-full text-right text-xs px-3 py-2 border border-neutral-200 hover:border-[#C8A24A] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.senderRole === 'customer' ? 'items-start' : 'items-end'
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2 text-xs leading-relaxed ${
                      msg.senderRole === 'customer'
                        ? 'bg-[#0B0B0C] text-white'
                        : 'bg-[#F3EFE6] text-[#0B0B0C] border border-neutral-200'
                    }`}
                  >
                    <div className="text-[11px] opacity-70 mb-0.5">{msg.senderName}</div>
                    <div>{msg.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-neutral-200 bg-[#FAF9F6] space-y-2">
            <form onSubmit={(e) => void handleSend(e)} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t.supportPlaceholder}
                className="flex-1 px-3 py-2 border border-neutral-300 text-xs bg-white focus:outline-none focus:border-[#C8A24A]"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="px-3.5 py-2 bg-[#C8A24A] text-[#0B0B0C] text-xs font-semibold hover:bg-[#d8b45c] disabled:opacity-50 cursor-pointer shrink-0"
                aria-label={t.supportSend}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 border border-neutral-300 bg-white text-[#0B0B0C] text-xs font-medium hover:border-[#0B0B0C] flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#C8A24A]" />
              <span>{t.supportWhatsAppBtn}</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}
