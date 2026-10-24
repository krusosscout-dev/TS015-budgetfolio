# BudgetFolio · สมุดงบประมาณของครู

ระบบติดตามงบประมาณส่วนตัวของครู ใช้คนเดียว เตือนงบที่ต้องใช้ เขียนใบรายการไปซื้อ พิมพ์ A4 และแจ้งเตือนเข้า LINE Official Account ทุกเช้า

© 2569 BudgetFolio · นรากรณ์ จูงาม

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `public/index.html` | ตัวระบบทั้งหมด (หน้าเว็บ) |
| `public/manifest.webmanifest`, `public/sw.js`, ไอคอน | ติดตั้งเป็นแอป (PWA) |
| `api/login.js` | ตรวจรหัสผ่าน |
| `api/state.js` | อ่าน/บันทึกข้อมูลงบและใบรายการ |
| `api/receipt.js` | รูปใบเสร็จ |
| `api/line-notify.js` | ส่งสรุปการเตือนเข้า LINE (Vercel Cron ทุกวัน 06:41 น.) |
| `lib/` | ฟังก์ชันกลาง: ฐานข้อมูล Upstash, ตรวจสิทธิ์, คำนวณการเตือน |

## ค่าที่ต้องตั้งใน Vercel (Settings → Environment Variables)

| ชื่อ | ค่า |
|---|---|
| `APP_PASSWORD` | รหัสผ่านเข้าระบบที่ครูตั้งเอง |
| `UPSTASH_REDIS_REST_URL` | จาก Upstash (ถ้าเชื่อมผ่าน Vercel Marketplace จะได้ชื่อ `KV_REST_API_URL` ก็ใช้ได้) |
| `UPSTASH_REDIS_REST_TOKEN` | จาก Upstash (หรือ `KV_REST_API_TOKEN`) |
| `CRON_SECRET` | ข้อความสุ่มยาว ๆ (Vercel ใช้ยืนยันตอนเรียกงานตอนเช้า) |
| `LINE_CHANNEL_ACCESS_TOKEN` | จาก LINE Developers → Messaging API → Channel access token |
| `LINE_USER_ID` | จาก LINE Developers → Basic settings → Your user ID (ต้องเพิ่ม OA เป็นเพื่อนก่อน) |
| `APP_URL` | (ไม่บังคับ) ลิงก์เว็บ ใส่ท้ายข้อความ LINE |

เปลี่ยน `APP_PASSWORD` เมื่อไร ทุกเครื่องต้องเข้าสู่ระบบใหม่
