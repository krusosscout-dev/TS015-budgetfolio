// BudgetFolio · ฟังก์ชันกลางฝั่งเซิร์ฟเวอร์: ฐานข้อมูล Upstash + ตรวจรหัสผ่าน
import crypto from 'node:crypto';

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN_ = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const PREFIX = 'bf:';

export function dbReady() { return Boolean(URL_ && TOKEN_); }

// เรียกคำสั่ง Redis ผ่าน REST เช่น redis(['GET','bf:state'])
export async function redis(cmd) {
  if (!dbReady()) throw new Error('ยังไม่ได้ตั้งค่า Upstash (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)');
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `Upstash ${r.status}`);
  return j.result;
}

// โทเคนเข้าระบบ = HMAC ของรหัสผ่าน (เปลี่ยนรหัสผ่านใน Vercel แล้วทุกเครื่องต้องเข้าใหม่)
export function tokenFor(password) {
  return crypto.createHmac('sha256', String(password)).update('budgetfolio-v1').digest('hex');
}
function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export function checkPassword(pw) {
  const real = process.env.APP_PASSWORD;
  return Boolean(real) && safeEq(pw, real);
}
export function authed(req) {
  const real = process.env.APP_PASSWORD;
  if (!real) return false;
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  return Boolean(t) && safeEq(t, tokenFor(real));
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

export function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
