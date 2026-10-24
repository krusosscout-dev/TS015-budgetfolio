import { checkPassword, tokenFor, readBody, send, dbReady } from '../lib/core.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'ใช้ POST' });
  if (!process.env.APP_PASSWORD) return send(res, 500, { error: 'ยังไม่ได้ตั้งรหัสผ่าน APP_PASSWORD ใน Vercel' });
  const { password } = await readBody(req);
  if (!checkPassword(password || '')) {
    await new Promise(r => setTimeout(r, 900)); // ชะลอการเดารหัส
    return send(res, 401, { error: 'รหัสผ่านไม่ถูกต้อง' });
  }
  return send(res, 200, { token: tokenFor(process.env.APP_PASSWORD), db: dbReady() });
}
