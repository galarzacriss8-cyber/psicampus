import crypto from 'node:crypto';
import { get } from './db.mjs';

const SECRET = process.env.AUTH_SECRET || 'psicampus-dev-secret-change-in-production-2026';
const TTL_DAYS = 30;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [algo, salt, hash] = String(stored).split('$');
    if (algo !== 'scrypt') return false;
    const calc = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

export function signToken(user) {
  const payload = { uid: user.id, role: user.role, exp: Date.now() + TTL_DAYS * 864e5 };
  const body = b64(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function readToken(token) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function authFrom(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token;
  const payload = readToken(token);
  if (!payload) return null;
  const user = get('SELECT id, email, role, name, phone, avatar, active FROM users WHERE id = ?', payload.uid);
  if (!user || !user.active) return null;
  if (user.role === 'admin') user.name = 'Psyconova';
  return user;
}

export function requireAuth(...roles) {
  return (req, res, next) => {
    const user = authFrom(req);
    if (!user) return res.status(401).json({ error: 'Sesión no válida o expirada. Inicia sesión nuevamente.' });
    if (roles.length && !roles.includes(user.role)) return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
    req.user = user;
    next();
  };
}
