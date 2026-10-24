// ส่งสรุปการเตือนเข้า LINE Official Account
// - Vercel Cron เรียกทุกวัน 06:41 น. (ดู vercel.json) พร้อม Authorization: Bearer <CRON_SECRET>
// - หน้าเว็บเรียกปุ่ม "ส่งทดสอบ" ด้วยโทเคนเข้าระบบ (?test=1 ส่งเสมอแม้ไม่มีเรื่องเร่งด่วน)
import { authed, redis, send, PREFIX, dbReady } from '../lib/core.js';
import { computeAlerts, lineText, todayBangkok } from '../lib/alerts.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const isCron = Boolean(process.env.CRON_SECRET) && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  const isUser = authed(req);
  if (!isCron && !isUser) return send(res, 401, { error: 'ไม่มีสิทธิ์' });

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN, to = process.env.LINE_USER_ID;
  if (url.searchParams.get('status')) return send(res, 200, { line: Boolean(token && to), db: dbReady(), cron: Boolean(process.env.CRON_SECRET) });
  if (!token || !to) return send(res, 400, { error: 'ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN และ LINE_USER_ID ใน Vercel' });

  try {
    const raw = await redis(['GET', PREFIX + 'state']);
    const S = raw ? JSON.parse(JSON.parse(raw).json) : null;
    const today = todayBangkok();
    if (!S || S.isSample || !S.budgets?.length) return send(res, 200, { sent: false, reason: 'ยังไม่มีข้อมูลงบจริง' });
    const alerts = computeAlerts(S, today);
    const test = isUser && url.searchParams.get('test');
    // ตอนเช้าส่งเฉพาะเมื่อมีเรื่องเร่งด่วน (ภายใน 7 วัน เลยกำหนด เกินงบ วันนี้ต้องซื้อ) ป้องกันข้อความรบกวนทุกวัน
    if (!test && !alerts.some(a => a.urgent)) return send(res, 200, { sent: false, reason: 'ไม่มีเรื่องเร่งด่วน', count: alerts.length });
    const appUrl = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
    const r = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, messages: [{ type: 'text', text: lineText(alerts, today, appUrl).slice(0, 4900) }] }),
    });
    if (!r.ok) { const t = await r.text(); return send(res, 502, { error: `LINE ตอบกลับ ${r.status}: ${t.slice(0, 200)}` }); }
    return send(res, 200, { sent: true, count: alerts.length });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
}
