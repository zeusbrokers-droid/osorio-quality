'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const COOKIE_NAME = 'osorio_panel_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

if (!PANEL_PASSWORD || !SESSION_SECRET) {
  console.warn('PANEL_PASSWORD and SESSION_SECRET must be configured before production use.');
}

const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } })
  : null;

const memoryLeads = [];
const loginAttempts = new Map();
const leadAttempts = new Map();

app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function signSession(expiresAt) {
  const payload = String(expiresAt);
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function validSession(req) {
  if (!SESSION_SECRET) return false;
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return false;
  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(expiresAt).digest('base64url');
  return safeEqual(signature, expected);
}

function rateLimited(store, key, max, windowMs) {
  const now = Date.now();
  const current = store.get(key);
  if (!current || now - current.startedAt > windowMs) {
    store.set(key, { count: 1, startedAt: now });
    return false;
  }
  current.count += 1;
  return current.count > max;
}

function clean(value, max = 120) {
  return String(value || '').trim().replace(/[<>]/g, '').slice(0, max);
}

function requireAuth(req, res, next) {
  if (!validSession(req)) return res.status(401).json({ error: 'No autorizado' });
  res.setHeader('Cache-Control', 'no-store');
  next();
}

async function initializeDatabase() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS osorio_leads (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      language VARCHAR(5) NOT NULL DEFAULT 'es',
      age_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      intent VARCHAR(40) NOT NULL,
      intent_label VARCHAR(100) NOT NULL,
      quantity VARCHAR(100),
      event_date VARCHAR(40),
      location VARCHAR(120),
      contact_time VARCHAR(100),
      classification VARCHAR(20) NOT NULL,
      source VARCHAR(40) NOT NULL DEFAULT 'web',
      business_id VARCHAR(80) NOT NULL DEFAULT 'OSORIO-CIGARS-MIA-001',
      status VARCHAR(20) NOT NULL DEFAULT 'new'
    )
  `);
}

app.post('/api/login', (req, res) => {
  const key = req.ip || 'unknown';
  if (rateLimited(loginAttempts, key, 8, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Demasiados intentos. Intenta más tarde.' });
  }
  if (!PANEL_PASSWORD || !SESSION_SECRET || !safeEqual(req.body?.password, PANEL_PASSWORD)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(signSession(expiresAt))}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure}`);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  res.json({ ok: true });
});

app.get('/api/session', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ authenticated: validSession(req) });
});

app.post('/api/leads', async (req, res) => {
  try {
    const key = req.ip || 'unknown';
    if (rateLimited(leadAttempts, key, 12, 10 * 60 * 1000)) {
      return res.status(429).json({ error: 'Demasiadas solicitudes' });
    }
    if (req.body?.website) return res.status(202).json({ ok: true });
    if (req.body?.ageConfirmed !== true) return res.status(400).json({ error: 'Se requiere confirmación 21+' });

    const lead = {
      name: clean(req.body.name, 100),
      phone: clean(req.body.phone, 40),
      language: req.body.language === 'en' ? 'en' : 'es',
      intent: clean(req.body.intent, 40),
      intentLabel: clean(req.body.intentLabel, 100),
      quantity: clean(req.body.quantity, 100),
      eventDate: clean(req.body.date, 40),
      location: clean(req.body.location, 120),
      contactTime: clean(req.body.timeLabel, 100),
      classification: clean(req.body.classification, 20),
      source: clean(req.body.source || 'web', 40),
      businessId: clean(req.body.businessId || 'OSORIO-CIGARS-MIA-001', 80)
    };
    if (!lead.name || !lead.phone || !lead.intent) return res.status(400).json({ error: 'Faltan datos del prospecto' });

    if (pool) {
      const result = await pool.query(
        `INSERT INTO osorio_leads
          (name, phone, language, age_confirmed, intent, intent_label, quantity, event_date, location, contact_time, classification, source, business_id)
         VALUES ($1,$2,$3,TRUE,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id, created_at`,
        [lead.name, lead.phone, lead.language, lead.intent, lead.intentLabel, lead.quantity, lead.eventDate, lead.location, lead.contactTime, lead.classification, lead.source, lead.businessId]
      );
      return res.status(201).json({ ok: true, lead: result.rows[0] });
    }

    const fallback = {
      id: memoryLeads.length + 1,
      created_at: new Date().toISOString(),
      status: 'new',
      name: lead.name,
      phone: lead.phone,
      language: lead.language,
      age_confirmed: true,
      intent: lead.intent,
      intent_label: lead.intentLabel,
      quantity: lead.quantity,
      event_date: lead.eventDate,
      location: lead.location,
      contact_time: lead.contactTime,
      classification: lead.classification,
      source: lead.source,
      business_id: lead.businessId
    };
    memoryLeads.unshift(fallback);
    res.status(201).json({ ok: true, lead: fallback });
  } catch (error) {
    console.error('lead_create_failed', error.message);
    res.status(500).json({ error: 'No se pudo registrar el prospecto' });
  }
});

app.get('/api/leads', requireAuth, async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query('SELECT * FROM osorio_leads ORDER BY created_at DESC LIMIT 250');
      return res.json({ leads: result.rows });
    }
    res.json({ leads: memoryLeads });
  } catch (error) {
    console.error('lead_list_failed', error.message);
    res.status(500).json({ error: 'No se pudieron cargar los prospectos' });
  }
});

app.patch('/api/leads/:id/status', requireAuth, async (req, res) => {
  const allowed = new Set(['new', 'contacted', 'closed']);
  const status = clean(req.body?.status, 20);
  if (!allowed.has(status)) return res.status(400).json({ error: 'Estado inválido' });
  if (pool) {
    const result = await pool.query('UPDATE osorio_leads SET status=$1 WHERE id=$2 RETURNING id,status', [status, req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Prospecto no encontrado' });
    return res.json({ lead: result.rows[0] });
  }
  const lead = memoryLeads.find((item) => String(item.id) === String(req.params.id));
  if (!lead) return res.status(404).json({ error: 'Prospecto no encontrado' });
  lead.status = status;
  res.json({ lead: { id: lead.id, status } });
});

app.get('/health', async (req, res) => {
  try {
    if (pool) await pool.query('SELECT 1');
    res.json({ ok: true, database: pool ? 'postgres' : 'memory' });
  } catch (error) {
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (filePath.endsWith('panel.html')) res.setHeader('Cache-Control', 'no-store');
  }
}));

app.get('/panel', (req, res) => res.sendFile(path.join(__dirname, 'panel.html')));
app.get('/qr', (req, res) => res.sendFile(path.join(__dirname, 'qr.html')));

initializeDatabase()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`OSORIO app listening on ${PORT}`)))
  .catch((error) => {
    console.error('database_init_failed', error);
    process.exit(1);
  });
