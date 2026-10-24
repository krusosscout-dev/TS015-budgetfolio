// รูปใบเสร็จ แยกเก็บทีละใบรายการ: /api/receipt?id=<listId>  (?all=1 = ดึงทั้งหมด)
import { authed, redis, readBody, send, PREFIX } from '../lib/core.js';

const okId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(id);

export default async function handler(req, res) {
  if (!authed(req)) return send(res, 401, { error: 'กรุณาเข้าสู่ระบบใหม่' });
  const url = new URL(req.url, 'http://x');
  const id = url.searchParams.get('id');
  try {
    if (req.method === 'GET' && url.searchParams.get('all')) {
      const ids = (await redis(['SMEMBERS', PREFIX + 'rcpt-ids'])) || [];
      if (!ids.length) return send(res, 200, { receipts: {} });
      const vals = await redis(['MGET', ...ids.map(i => PREFIX + 'rcpt:' + i)]);
      const out = {};
      ids.forEach((i, k) => { if (vals[k]) out[i] = vals[k]; });
      return send(res, 200, { receipts: out });
    }
    if (!okId(id)) return send(res, 400, { error: 'id ไม่ถูกต้อง' });
    if (req.method === 'PUT') {
      const { img } = await readBody(req);
      if (typeof img !== 'string' || !img.startsWith('data:image/')) return send(res, 400, { error: 'รูปไม่ถูกต้อง' });
      if (img.length > 900000) return send(res, 413, { error: 'รูปใหญ่เกินไป' });
      await redis(['SET', PREFIX + 'rcpt:' + id, img]);
      await redis(['SADD', PREFIX + 'rcpt-ids', id]);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      await redis(['DEL', PREFIX + 'rcpt:' + id]);
      await redis(['SREM', PREFIX + 'rcpt-ids', id]);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'ไม่รองรับ' });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
}
