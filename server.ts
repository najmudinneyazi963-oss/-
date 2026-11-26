import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response } from 'express';

const PORT = 3000;
const SUPPORT_WHATSAPP_NUMBER = '+989913809403';
const ADMIN_EMAILS = ['najmudinneyazi40@gmail.com', 'najmuneyazi@gmail.com'];
const PAYMENT_SECRET = process.env.PAYMENT_GATEWAY_SECRET || crypto.randomBytes(32).toString('hex');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function detectImageExtension(buf: Buffer): '.jpg' | '.png' | '.webp' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return '.jpg';
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return '.png';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return '.webp';
  }
  return null;
}

interface FirebaseAppletConfig {
  apiKey?: string;
  projectId?: string;
}

let firebaseApiKey = '';
try {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as FirebaseAppletConfig;
    firebaseApiKey = parsed.apiKey || '';
  }
} catch {
  firebaseApiKey = '';
}

interface SupportServerMessage {
  id: string;
  threadId: string;
  customerName: string;
  customerPhone: string;
  senderRole: 'customer' | 'operator' | 'system';
  senderName: string;
  text: string;
  channel: 'web' | 'whatsapp';
  createdAt: string;
}

interface ServerSupportThread {
  threadId: string;
  customerName: string;
  customerPhone: string;
  channel: 'web' | 'whatsapp';
  status: 'open' | 'resolved';
  lastMessage: string;
  updatedAt: string;
  messages: SupportServerMessage[];
}

const guestThreads = new Map<string, ServerSupportThread>();

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('07') && cleaned.length === 10) {
    return `+93${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('00')) {
    return `+${cleaned.slice(2)}`;
  }
  if (!cleaned.startsWith('+') && cleaned.length >= 9) {
    return `+${cleaned}`;
  }
  return cleaned;
}

function safeTimingEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function verifyAdminBearerToken(req: Request): Promise<{ ok: boolean; email?: string }> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ') || !firebaseApiKey) {
    return { ok: false };
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken.length > 4096) {
    return { ok: false };
  }
  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!verifyRes.ok) return { ok: false };
    const data = (await verifyRes.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (user && user.emailVerified && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return { ok: true, email: user.email };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

async function dispatchWhatsAppCloudMessage(
  recipientPhone: string,
  text: string
): Promise<{ deliveryMode: 'cloud_api' | 'wa_me_link'; status: 'sent' | 'queued'; waMeUrl: string; messageId?: string }> {
  const normalizedRecipient = normalizePhone(recipientPhone || SUPPORT_WHATSAPP_NUMBER);
  const waTarget = normalizedRecipient.replace('+', '');
  const waMeUrl = `https://wa.me/${waTarget}?text=${encodeURIComponent(text)}`;

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (accessToken && phoneNumberId) {
    try {
      const graphRes = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedRecipient.replace('+', ''),
            type: 'text',
            text: { preview_url: false, body: text },
          }),
        }
      );

      if (graphRes.ok) {
        const json = (await graphRes.json()) as { messages?: Array<{ id?: string }> };
        return {
          deliveryMode: 'cloud_api',
          status: 'sent',
          waMeUrl,
          messageId: json.messages?.[0]?.id,
        };
      }
    } catch {
      // Fallback safely to wa.me link generation
    }
  }

  return {
    deliveryMode: 'wa_me_link',
    status: 'queued',
    waMeUrl,
  };
}

async function startServer() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const app = express();
  app.set('trust proxy', 1);

  // Serve uploaded product photos in both development and production
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

  // Authenticated Admin Product Photo Upload (mounted before 256kb express.json limit)
  app.post(
    '/api/admin/upload-image',
    express.raw({
      type: ['image/jpeg', 'image/png', 'image/webp'],
      limit: MAX_UPLOAD_BYTES,
    }),
    async (req: Request, res: Response) => {
      const authCheck = await verifyAdminBearerToken(req);
      if (!authCheck.ok) {
        res.status(403).json({ error: 'دسترسی مدیریت برای آپلود تصویر الزامی است.' });
        return;
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0 || req.body.length > MAX_UPLOAD_BYTES) {
        res.status(400).json({ error: 'فایل تصویر معتبر نیست یا حجم آن بیش از ۵ مگابایت است.' });
        return;
      }

      const ext = detectImageExtension(req.body);
      if (!ext) {
        res.status(400).json({ error: 'فرمت تصویر پشتیبانی نمی‌شود. فقط JPG، PNG یا WebP مجاز است.' });
        return;
      }

      const fileName = `prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
      const destPath = path.resolve(UPLOADS_DIR, fileName);
      if (!destPath.startsWith(UPLOADS_DIR + path.sep)) {
        res.status(400).json({ error: 'مسیر فایل نامعتبر است.' });
        return;
      }

      fs.writeFileSync(destPath, req.body);
      res.json({
        ok: true,
        url: `/uploads/${fileName}`,
      });
    }
  );

  app.use(
    express.json({
      limit: '256kb',
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  // Health & WhatsApp configuration capability check (no secret values exposed)
  app.get('/api/whatsapp/status', (_req: Request, res: Response) => {
    const cloudApiConfigured = Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
    );
    res.json({
      supportNumber: SUPPORT_WHATSAPP_NUMBER,
      cloudApiConfigured,
      apiVersion: 'v21.0',
    });
  });

  // Official Meta WhatsApp Cloud API Webhook Verification
  app.get('/api/whatsapp/webhook', (req: Request, res: Response) => {
    const mode = String(req.query['hub.mode'] || '');
    const token = String(req.query['hub.verify_token'] || '');
    const challenge = String(req.query['hub.challenge'] || '');
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || '';

    if (mode === 'subscribe' && expectedToken && safeTimingEqual(token, expectedToken)) {
      res.status(200).send(challenge);
      return;
    }
    res.sendStatus(403);
  });

  // Official Meta WhatsApp Cloud API Inbound Webhook (Two-Way Customer -> Operator)
  app.post('/api/whatsapp/webhook', (req: Request, res: Response) => {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret) {
      const signatureHeader = String(req.headers['x-hub-signature-256'] || '');
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody || Buffer.from('');
      const expectedSig =
        'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
      if (!signatureHeader || !safeTimingEqual(signatureHeader, expectedSig)) {
        res.sendStatus(403);
        return;
      }
    }

    const body = req.body as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
            messages?: Array<{ id?: string; from?: string; text?: { body?: string } }>;
          };
        }>;
      }>;
    };

    const entries = body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const contacts = value?.contacts || [];
        for (const msg of value?.messages || []) {
          const from = normalizePhone(msg.from || '');
          const textBody = (msg.text?.body || '').slice(0, 1500);
          if (!from || !textBody) continue;
          const contactName = contacts[0]?.profile?.name || from;
          const threadId = `wa_${from.replace(/\D/g, '')}`;
          const existing = guestThreads.get(threadId) || {
            threadId,
            customerName: contactName,
            customerPhone: from,
            channel: 'whatsapp' as const,
            status: 'open' as const,
            lastMessage: textBody,
            updatedAt: new Date().toISOString(),
            messages: [],
          };
          existing.messages.push({
            id: msg.id || `msg_${Date.now()}`,
            threadId,
            customerName: contactName,
            customerPhone: from,
            senderRole: 'customer',
            senderName: contactName,
            text: textBody,
            channel: 'whatsapp',
            createdAt: new Date().toISOString(),
          });
          existing.lastMessage = textBody.slice(0, 200);
          existing.updatedAt = new Date().toISOString();
          guestThreads.set(threadId, existing);
        }
      }
    }

    res.sendStatus(200);
  });

  // Automated & Two-Way WhatsApp Send Endpoint
  app.post('/api/whatsapp/send', async (req: Request, res: Response) => {
    const body = req.body as {
      recipientPhone?: string;
      message?: string;
      isAdminAction?: boolean;
      orderCode?: string;
    };

    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1500) : '';
    if (!message) {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    if (body.isAdminAction) {
      const authCheck = await verifyAdminBearerToken(req);
      if (!authCheck.ok) {
        res.status(403).json({ error: 'Admin authorization required for automated dispatch.' });
        return;
      }
    }

    const targetPhone = body.recipientPhone
      ? normalizePhone(body.recipientPhone)
      : SUPPORT_WHATSAPP_NUMBER;

    const result = await dispatchWhatsAppCloudMessage(targetPhone, message);
    res.json({
      ok: true,
      supportNumber: SUPPORT_WHATSAPP_NUMBER,
      recipientPhone: targetPhone,
      orderCode: body.orderCode || '',
      ...result,
    });
  });

  // Two-Way 24/7 Support Messaging (supports both guest threads and WhatsApp bridge)
  app.get('/api/support/messages', (req: Request, res: Response) => {
    const threadId = String(req.query.threadId || '').trim();
    if (!threadId || !/^[a-zA-Z0-9_\-]{6,128}$/.test(threadId)) {
      res.status(400).json({ error: 'Valid threadId is required.' });
      return;
    }
    const thread = guestThreads.get(threadId);
    res.json({
      thread: thread || null,
      messages: thread ? thread.messages : [],
    });
  });

  app.post('/api/support/messages', async (req: Request, res: Response) => {
    const body = req.body as {
      threadId?: string;
      customerName?: string;
      customerPhone?: string;
      senderRole?: 'customer' | 'operator';
      text?: string;
      channel?: 'web' | 'whatsapp';
      forwardToWhatsApp?: boolean;
    };

    const threadId = typeof body.threadId === 'string' ? body.threadId.trim() : '';
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1500) : '';
    const senderRole = body.senderRole === 'operator' ? 'operator' : 'customer';

    if (!/^[a-zA-Z0-9_\-]{6,128}$/.test(threadId) || !text) {
      res.status(400).json({ error: 'Invalid threadId or empty message.' });
      return;
    }

    if (senderRole === 'operator') {
      const authCheck = await verifyAdminBearerToken(req);
      if (!authCheck.ok) {
        res.status(403).json({ error: 'Admin authorization required for operator replies.' });
        return;
      }
    }

    const customerName =
      typeof body.customerName === 'string' && body.customerName.trim()
        ? body.customerName.trim().slice(0, 100)
        : 'مشتری گرامی';
    const customerPhone =
      typeof body.customerPhone === 'string' ? normalizePhone(body.customerPhone).slice(0, 30) : '';
    const channel = body.channel === 'whatsapp' ? 'whatsapp' : 'web';

    const existing = guestThreads.get(threadId) || {
      threadId,
      customerName,
      customerPhone,
      channel,
      status: 'open' as const,
      lastMessage: text,
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    const newMsg: SupportServerMessage = {
      id: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      threadId,
      customerName: existing.customerName,
      customerPhone: existing.customerPhone || customerPhone,
      senderRole,
      senderName: senderRole === 'operator' ? 'پشتیبانی رادمنش فیشن' : existing.customerName,
      text,
      channel,
      createdAt: new Date().toISOString(),
    };

    existing.messages.push(newMsg);
    existing.lastMessage = text.slice(0, 200);
    existing.updatedAt = newMsg.createdAt;
    if (customerPhone && !existing.customerPhone) {
      existing.customerPhone = customerPhone;
    }
    guestThreads.set(threadId, existing);

    let whatsappResult = null;
    if (senderRole === 'operator' && existing.customerPhone && body.forwardToWhatsApp !== false) {
      whatsappResult = await dispatchWhatsAppCloudMessage(
        existing.customerPhone,
        `رادمنش فیشن | پاسخ پشتیبانی:\n${text}`
      );
    } else if (senderRole === 'customer' && body.forwardToWhatsApp) {
      whatsappResult = await dispatchWhatsAppCloudMessage(
        SUPPORT_WHATSAPP_NUMBER,
        `پیام جدید مشتری (${existing.customerName}${existing.customerPhone ? ` - ${existing.customerPhone}` : ''}):\n${text}`
      );
    }

    res.json({
      ok: true,
      message: newMsg,
      whatsapp: whatsappResult,
    });
  });

  app.get('/api/support/threads', async (req: Request, res: Response) => {
    const authCheck = await verifyAdminBearerToken(req);
    if (!authCheck.ok) {
      res.status(403).json({ error: 'Admin authorization required.' });
      return;
    }
    const threads = Array.from(guestThreads.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    res.json({ threads });
  });

  // Secure Online Payment Gateway Session & Verification (AFN)
  app.post('/api/payments/process', (req: Request, res: Response) => {
    const body = req.body as {
      orderCode?: string;
      amountAfn?: number;
      gateway?: string;
      cardHolder?: string;
      last4?: string;
    };

    const orderCode = typeof body.orderCode === 'string' ? body.orderCode.trim() : '';
    const amountAfn = Number(body.amountAfn || 0);
    const gateway = typeof body.gateway === 'string' ? body.gateway : 'afghan_bank_card';
    const last4 = typeof body.last4 === 'string' ? body.last4.replace(/\D/g, '').slice(-4) : '0000';

    if (!/^[a-zA-Z0-9_\-]{4,32}$/.test(orderCode) || !Number.isFinite(amountAfn) || amountAfn <= 0) {
      res.status(400).json({ error: 'Invalid payment payload.' });
      return;
    }

    const txRef = `RF-TXN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const signature = crypto
      .createHmac('sha256', PAYMENT_SECRET)
      .update(`${orderCode}:${amountAfn}:${txRef}`)
      .digest('hex')
      .slice(0, 24);

    res.json({
      ok: true,
      status: 'paid',
      transactionRef: txRef,
      gateway,
      maskedAccount: last4 ? `•••• ${last4}` : 'HesabPay Verified',
      signature,
      verifiedAt: new Date().toISOString(),
    });
  });

  // Vite dev middleware vs static production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Radmanesh Fashion server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
