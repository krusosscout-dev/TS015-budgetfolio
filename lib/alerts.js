// คำนวณเรื่องที่ต้องเตือน (ตรรกะเดียวกับหน้าภาพรวมในเว็บ) — ใช้กับการส่ง LINE ตอนเช้า
const TH_M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const num = v => { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return isFinite(n) ? n : 0; };
const money = n => Math.round(n).toLocaleString('en-US');
const parse = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const fd = s => { const [y, m, d] = s.split('-').map(Number); return `${d} ${TH_M[m - 1]} ${String(y + 543).slice(-2)}`; };

export function todayBangkok(now = new Date()) {
  const t = new Date(now.getTime() + 7 * 3600e3);
  return t.toISOString().slice(0, 10);
}
export function fyOf(iso) { const [y, m] = iso.split('-').map(Number); return m >= 10 ? y + 544 : y + 543; }

const itemEst = i => num(i.qty) * num(i.est);
const itemAct = i => num(i.qty) * (i.act === '' || i.act == null ? num(i.est) : num(i.act));
const listEst = l => l.items.reduce((s, i) => s + itemEst(i), 0);
const listAct = l => l.items.filter(i => i.bought).reduce((s, i) => s + itemAct(i), 0);
const listPending = l => l.status === 'done' ? 0 : l.items.filter(i => !i.bought).reduce((s, i) => s + itemEst(i), 0);

// คืนรายการ { level: 'bad'|'warn'|'info', urgent: bool, text }
export function computeAlerts(S, today) {
  const out = [];
  if (!S || !Array.isArray(S.budgets)) return out;
  const fy = fyOf(today);
  const budgets = S.budgets.filter(b => b.fy === fy);
  const lists = S.lists || [];
  for (const b of budgets) {
    const ls = lists.filter(l => l.budgetId === b.id);
    const used = ls.reduce((s, l) => s + listAct(l), 0);
    const com = ls.reduce((s, l) => s + listPending(l), 0);
    const amt = num(b.amount);
    if (b.type === 'adv') {
      const pend = ls.filter(l => l.status === 'done' && !l.reimbursed).reduce((s, l) => s + listAct(l), 0);
      if (pend > 0) out.push({ level: 'info', urgent: false, text: `รอเบิกคืน ${b.name} ${money(pend)} บาท` });
      continue;
    }
    const acts = Array.isArray(b.acts) ? b.acts : [];
    const left = amt - used;
    if (b.due && left > 0.5 && !acts.length) {
      const dl = diffDays(today, b.due);
      if (dl < 0) out.push({ level: 'bad', urgent: true, text: `เลยกำหนดใช้งบ ${b.name} ${-dl} วัน ยังเหลือ ${money(left)} บาท` });
      else if (dl <= 30) out.push({ level: 'warn', urgent: dl <= 7, text: `อีก ${dl} วันต้องใช้งบ ${b.name} (ภายใน ${fd(b.due)}) ยังไม่ได้ใช้ ${money(left)} บาท` });
    }
    for (const a of acts) {
      const als = ls.filter(l => l.actId === a.id);
      const au = als.reduce((s, l) => s + listAct(l), 0), ac = als.reduce((s, l) => s + listPending(l), 0);
      const free = num(a.amount) - au - ac;
      if (a.due && free > 0.5) {
        const dl = diffDays(today, a.due);
        if (dl < 0) out.push({ level: 'bad', urgent: true, text: `กิจกรรม ${a.name} (${b.name}) เลยกำหนด ${-dl} วัน ยังเหลือ ${money(free)} บาท` });
        else if (dl <= 30) out.push({ level: 'warn', urgent: dl <= 7, text: `อีก ${dl} วันถึงกิจกรรม ${a.name} (${b.name}) ยังเหลือ ${money(free)} บาท` });
      }
    }
    if (amt > 0 && used + com > amt + 0.5) out.push({ level: 'bad', urgent: true, text: `${b.name} เกินงบ ${money(used + com - amt)} บาท` });
  }
  for (const l of lists) {
    if (l.status !== 'plan' || !l.date) continue;
    const b = budgets.find(x => x.id === l.budgetId); if (!b) continue;
    const n = l.items.filter(i => !i.bought && String(i.name || '').trim()).length; if (!n) continue;
    if (l.date === today) out.push({ level: 'warn', urgent: true, text: `วันนี้ต้องไปซื้อ: ${l.title || 'ใบรายการ'} ${n} รายการ ประมาณ ${money(listPending(l))} บาท` });
    else if (l.date < today) out.push({ level: 'warn', urgent: true, text: `เลยวันที่ตั้งใจไปซื้อ: ${l.title || 'ใบรายการ'} (${fd(l.date)})` });
  }
  const rank = { bad: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

export function lineText(alerts, today, appUrl) {
  const [y, m, d] = today.split('-').map(Number);
  const head = `💰 BudgetFolio · ${d} ${TH_M[m - 1]} ${y + 543}`;
  if (!alerts.length) return `${head}\nไม่มีงบที่ต้องรีบใช้วันนี้ 🌷`;
  const icon = { bad: '🔴', warn: '🟠', info: '🔵' };
  const lines = alerts.slice(0, 12).map(a => `${icon[a.level]} ${a.text}`);
  if (alerts.length > 12) lines.push(`…และอีก ${alerts.length - 12} เรื่อง`);
  return `${head}\nเรื่องที่ต้องจัดการ ${alerts.length} เรื่อง\n\n${lines.join('\n')}${appUrl ? `\n\nเปิดระบบ: ${appUrl}` : ''}`;
}
