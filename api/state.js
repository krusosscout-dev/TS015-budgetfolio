// อ่าน/บันทึกข้อมูลทั้งระบบ (ไม่รวมรูปใบเสร็จ)
import { authed, redis, readBody, send, PREFIX } from '../lib/core.js';

export default async function handler(req, res) {
  if (!authed(req)) return send(res, 401, { error: 'กรุณาเข้าสู่ระบบใหม่' });
  try {
    if (req.method === 'GET') {
      const raw = await redis(['GET', PREFIX + 'state']);
      if (!raw) return send(res, 200, { exists: false });
      const d = JSON.parse(raw);
      return send(res, 200, { exists: true, ...d });
    }
    if (req.method === 'PUT') {
      const { json, updatedAt } = await readBody(req);
      if (typeof json !== 'string' || json.length < 2) return send(res, 400, { error: 'ข้อมูลไม่ถูกต้อง' });
      JSON.parse(json); // ตรวจว่าเป็น JSON จริง
      await redis(['SET', PREFIX + 'state', JSON.stringify({ json, updatedAt: Number(updatedAt) || Date.now() })]);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'ไม่รองรับ' });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
}
