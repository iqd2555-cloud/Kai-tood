# Kai Tood Manager PWA

เว็บแอป PWA สำหรับบริหารร้านไก่ทอดและข้าวเหนียว รองรับหลายสาขา แยกสิทธิ์ Owner/Staff และใช้ Supabase เป็นฐานข้อมูล + Auth + Realtime

## ฟีเจอร์หลัก

- ใช้งานผ่าน URL และติดตั้งเป็น PWA ได้บน Android/iPhone
- UI ภาษาไทย โทนดำ/เหลือง/ขาว ปุ่มใหญ่ เหมาะกับมือถือ
- Login ด้วย Supabase Auth และ Row Level Security
- Staff เห็นและบันทึกเฉพาะสาขาของตนเอง
- Owner เห็น Dashboard รวมทุกสาขา ยอดขายย้อนหลัง รายการสั่งของ และแจ้งเตือนสต็อกใกล้หมด
- ข้อมูล Dashboard อัปเดตแบบ Real-time เมื่อมีการบันทึก daily report
- รองรับ Deploy บน Vercel

## โครงสร้างโปรเจกต์

```text
app/                    Next.js App Router pages, server actions, API health
components/             UI components และ PWA registrar
lib/                    Supabase clients, auth helper, formatter, types
public/                 manifest, service worker, icons
supabase/schema.sql     ตาราง, indexes, policies, realtime setup
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
3. เปิดตาราง `branches` เพื่อดู `id` ของสาขา
4. เพิ่มข้อมูลในตาราง `profiles` โดยใช้ `id` จาก Auth user:

```sql
insert into public.profiles (id, full_name, role, branch_id)
values
  ('OWNER_AUTH_USER_ID', 'เจ้าของร้าน', 'owner', null),
  ('STAFF_AUTH_USER_ID', 'พนักงานสาขาหลัก', 'staff', 'BRANCH_ID');
```

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
3. กรอกยอดขาย เงินสด/โอน ระบบคำนวณยอดรวมให้จากฐานข้อมูล
4. กรอกวัตถุดิบที่ใช้ไป สินค้าคงเหลือ รายการสั่งของ และหมายเหตุ
5. กด **บันทึกข้อมูลวันนี้**

### Owner

1. Login ด้วยบัญชีเจ้าของร้าน
2. ดู Dashboard รวมทุกสาขาและสถานะส่งข้อมูลวันนี้
3. เข้า **ย้อนหลัง** เพื่อดูยอดขายและสต็อกล่าสุด
4. เข้า **สั่งของ** เพื่อรวบรวมวัตถุดิบที่พนักงานต้องการสำหรับวันถัดไป

## หมายเหตุ Production

- ใช้ Supabase RLS เพื่อกัน Staff เข้าถึงสาขาอื่น
- เปิด Supabase Realtime สำหรับ `daily_reports` แล้วใน schema
- ควรตั้งรหัสผ่านผู้ใช้ให้แข็งแรง และเพิ่ม MFA ใน Supabase หากใช้จริงในร้านหลายสาขา
- Service worker cache เฉพาะ GET request เพื่อช่วยโหลดเร็วขึ้น แต่ข้อมูลการบันทึกยังต้องออนไลน์เพื่อส่งเข้า Supabase
