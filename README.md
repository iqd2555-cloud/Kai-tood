# Kai Tood Manager PWA

เว็บแอป PWA สำหรับบริหารร้านไก่ทอดและข้าวเหนียว รองรับหลายสาขา แยกสิทธิ์ Owner/Staff และใช้ Supabase เป็นฐานข้อมูล + Auth + Realtime

## ฟีเจอร์หลัก

- ใช้งานผ่าน URL และติดตั้งเป็น PWA ได้บน Android/iPhone
- UI ภาษาไทย โทนดำ/เหลือง/ขาว ปุ่มใหญ่ เหมาะกับมือถือ
- Login ด้วย Supabase Auth และ Row Level Security
- Staff เห็นและบันทึกเฉพาะสาขาของตนเอง
- Owner เห็น Dashboard รวมทุกสาขา ยอดขายวันนี้ ยอดขายย้อนหลัง 7 วัน สรุปวัตถุดิบ รายการสั่งของ และแจ้งเตือนสต็อกใกล้หมด
- ข้อมูล Dashboard อัปเดตแบบ Real-time เมื่อมีการบันทึก daily report
- รองรับ Deploy บน Vercel

## โครงสร้างโปรเจกต์

```text
app/                    Next.js App Router pages, server actions, API health
components/             UI components และ PWA registrar
lib/                    Supabase clients, auth helper, formatter, types
public/                 manifest, service worker, icons
supabase/schema.sql     ตาราง, indexes, policies, realtime setup
supabase/migrations/     SQL migration เพิ่มเติมสำหรับอัปเดตฐานข้อมูลที่ใช้งานอยู่
```

## วิธีติดตั้งสำหรับมือใหม่

### 1) เตรียมเครื่อง

ติดตั้ง Node.js 20+ แล้วรันคำสั่ง:

```bash
npm install
```

### 2) สร้าง Supabase Project

1. เข้า https://supabase.com แล้วสร้าง Project ใหม่
2. ไปที่ **SQL Editor**
3. คัดลอกไฟล์ `supabase/schema.sql` ไปวางและกด Run
4. ไปที่ **Project Settings > API** แล้วคัดลอก `Project URL` และ `anon public key`

### 3) ตั้งค่า Environment

สร้างไฟล์ `.env.local` จากตัวอย่าง:

```bash
cp .env.example .env.local
```

แก้ค่าใน `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4) สร้างผู้ใช้ Owner และ Staff

1. ใน Supabase ไปที่ **Authentication > Users** แล้วกด Add user
2. สร้างอีเมล/รหัสผ่านของเจ้าของร้านและพนักงาน
3. Login ครั้งแรก ระบบจะเรียก `public.ensure_login_profile` เพื่อสร้าง `profiles` ให้อัตโนมัติ
4. ผู้ใช้คนแรกที่ Login จะเป็น `owner`; ผู้ใช้ถัดไปจะเป็น `staff` และจะถูกผูกกับสาขาเริ่มต้น `MAIN` อัตโนมัติ
5. หากต้องการเปลี่ยนสิทธิ์หรือสาขา ให้แก้ในตาราง `profiles` หลังจาก Login ครั้งแรกแล้ว

> ถ้าฐานข้อมูลเดิมแจ้ง error ว่าไม่พบ `public.ensure_login_profile(user_email, user_full_name, user_id)` ให้เปิด Supabase SQL Editor แล้วรันไฟล์ `supabase/migrations/202605110001_ensure_login_profile.sql` ทั้งไฟล์ จากนั้นลอง Login อีกครั้ง ไฟล์นี้จะลบ signature เก่า `ensure_login_profile(uuid, text, text)` และสร้าง signature ที่ Supabase RPC หาอยู่คือ `ensure_login_profile(text, text, uuid)` พร้อม `notify pgrst, 'reload schema'`
>
> ถ้าอัปเดตจากฐานข้อมูลที่สร้างไว้ก่อนหน้า ให้รัน `supabase/migrations/202605150001_reporting_hardening.sql` เพิ่มด้วย เพื่อเพิ่ม index สำหรับ dashboard, view `daily_report_rollups`, และ RPC `owner_dashboard_totals` สำหรับรายงาน production

### 5) รันในเครื่อง

```bash
npm run dev
```

เปิด http://localhost:3000 แล้วเข้าสู่ระบบด้วยบัญชีที่สร้างไว้

### 6) Deploy บน Vercel

1. Push โค้ดขึ้น GitHub
2. เข้า https://vercel.com แล้ว Import repository
3. เพิ่ม Environment Variables เหมือน `.env.local`
4. Deploy
5. เมื่อได้โดเมนจริง ให้ตั้ง `NEXT_PUBLIC_APP_URL` เป็น URL ของ Vercel เช่น `https://kai-tood.vercel.app`

## วิธีใช้งาน

### Staff

1. Login ด้วยบัญชีพนักงาน
2. เข้าเมนู **กรอกข้อมูล**
3. เลือกวันที่บันทึก แล้วกรอกยอดขาย เงินสด/โอน ระบบจะแสดงยอดรวมอัตโนมัติก่อนกดบันทึก และฐานข้อมูลจะคำนวณ `total_sales` อีกชั้น
4. กรอกวัตถุดิบที่ใช้ไป สินค้าคงเหลือ รายการสั่งของ และหมายเหตุ
5. กด **บันทึกข้อมูลวันนี้**

### Owner

1. Login ด้วยบัญชีเจ้าของร้าน
2. ดู Dashboard รวมทุกสาขา สถานะส่งข้อมูลวันนี้ ยอดขาย 7 วัน สรุปวัตถุดิบ และแจ้งเตือนวัตถุดิบใกล้หมด
3. เข้า **ย้อนหลัง** เพื่อดูยอดขายและสต็อกล่าสุด
4. เข้า **สั่งของ** เพื่อรวบรวมวัตถุดิบที่พนักงานต้องการสำหรับวันถัดไป

## หมายเหตุ Production

- ใช้ Supabase RLS เพื่อกัน Staff เข้าถึงสาขาอื่น
- เปิด Supabase Realtime สำหรับ `daily_reports` แล้วใน schema
- ใช้ `daily_report_rollups` view แบบ `security_invoker = true` และ `owner_dashboard_totals()` RPC สำหรับต่อยอดรายงานโดยยังอยู่ภายใต้ RLS
- ควรตั้งรหัสผ่านผู้ใช้ให้แข็งแรง และเพิ่ม MFA ใน Supabase หากใช้จริงในร้านหลายสาขา
- Service worker cache เฉพาะ GET request เพื่อช่วยโหลดเร็วขึ้น แต่ข้อมูลการบันทึกยังต้องออนไลน์เพื่อส่งเข้า Supabase
