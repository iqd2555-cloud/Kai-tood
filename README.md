# เหนียวไก่เยอะโคตร PWA

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
4. ไปที่ **Project Settings > API** แล้วคัดลอก `Project URL`, `anon public key` และ `service_role key` (ใช้เฉพาะฝั่ง Server/Vercel เท่านั้น ห้ามใส่ในโค้ดฝั่ง Browser)

### 3) ตั้งค่า Environment

สร้างไฟล์ `.env.local` จากตัวอย่าง:

```bash
cp .env.example .env.local
```

แก้ค่าใน `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://kai-tood.vercel.app
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ACCESS_TOKEN=your-supabase-management-api-token
SUPABASE_PROJECT_REF=your-project-ref
```

### 4) สมัครผู้ใช้ Owner และ Staff แบบไม่ต้องยืนยันอีเมล

1. ตั้งค่า `SUPABASE_SERVICE_ROLE_KEY` ใน `.env.local` และใน Vercel เพื่อให้ Server Action สร้างผู้ใช้ผ่าน Supabase Admin API พร้อม `email_confirm: true`
2. สำหรับการใช้งานภายในร้าน ให้ไปที่ Supabase Dashboard → **Authentication > Providers > Email** แล้วปิด **Confirm email** เพื่อไม่บังคับให้พนักงานหรือเจ้าของร้านกดลิงก์อีเมลก่อนเข้าใช้
3. เปิดหน้า Login แล้วเลือกแท็บ **สมัครสมาชิก** ผู้ใช้จะถูกสร้างแบบยืนยันอีเมลแล้ว และระบบจะ Login เข้าใช้งานทันทีโดยไม่ต้องกดลิงก์ในอีเมล
4. หากเคยสมัครไว้ก่อนหน้าและติดสถานะ `Email not confirmed` ระบบ Login จะพยายามยืนยันอีเมลให้ด้วย Admin API แล้ว Login ซ้ำให้อัตโนมัติ
5. Login ครั้งแรก ระบบจะเรียก `public.ensure_login_profile` เพื่อสร้าง `profiles` ให้อัตโนมัติ
6. บัญชี `koykoykoy9783@gmail.com` จะถูกกำหนดเป็น `owner` โดย migration `supabase/migrations/202606110002_auth_immediate_login_repair.sql`; หลังรัน migration ให้สมัคร/เข้าสู่ระบบด้วยอีเมลนี้เพื่อตรวจว่าเข้า `/owner-dashboard` ได้
7. หากต้องการเปลี่ยนสิทธิ์หรือสาขา ให้แก้ในตาราง `profiles` หลังจาก Login ครั้งแรกแล้ว

> หากไม่ได้ตั้งค่า `SUPABASE_SERVICE_ROLE_KEY` และยังเปิด **Confirm email** อยู่ Supabase จะยังตอบ `Email not confirmed` และผู้ใช้ใหม่จะไม่สามารถ Login ได้ทันที

> ถ้าฐานข้อมูลเดิมแจ้ง error ว่าไม่พบ `public.ensure_login_profile(user_email, user_full_name, user_id)` ให้เปิด Supabase SQL Editor แล้วรันไฟล์ `supabase/migrations/202605110001_ensure_login_profile.sql` ทั้งไฟล์ จากนั้นลอง Login อีกครั้ง ไฟล์นี้จะลบ signature เก่า `ensure_login_profile(uuid, text, text)` และสร้าง signature ที่ Supabase RPC หาอยู่คือ `ensure_login_profile(text, text, uuid)` พร้อม `notify pgrst, 'reload schema'`
>
> ถ้าอัปเดตจากฐานข้อมูลที่สร้างไว้ก่อนหน้า ให้รัน `supabase/migrations/202605150001_reporting_hardening.sql` เพิ่มด้วย เพื่อเพิ่ม index สำหรับ dashboard, view `daily_report_rollups`, และ RPC `owner_dashboard_totals` สำหรับรายงาน production

### 5) รันในเครื่อง

```bash
npm run dev
```

เปิด http://localhost:3000 แล้วสมัครสมาชิกหรือเข้าสู่ระบบ ผู้ใช้ใหม่ควรเข้าใช้งานได้ทันทีโดยไม่ต้องยืนยันอีเมล

### 6) Deploy บน Vercel

1. Push โค้ดขึ้น GitHub
2. เข้า https://vercel.com แล้ว Import repository
3. เพิ่ม Environment Variables เหมือน `.env.local` รวมถึง `SUPABASE_SERVICE_ROLE_KEY` เพื่อให้สมัครแล้ว Login ได้ทันทีโดยไม่ต้องยืนยันอีเมล
4. Deploy
5. เมื่อได้โดเมนจริง ให้ตั้ง `NEXT_PUBLIC_APP_URL` เป็น URL ของ Vercel เช่น `https://kai-tood.vercel.app`

## วิธีใช้งาน

### Staff

1. Login ด้วยบัญชีพนักงาน
2. เข้าเมนู **กรอกข้อมูล**
3. เลือกวันที่บันทึก แล้วกรอกยอดขาย เงินสด/โอน ระบบจะแสดงยอดรวมอัตโนมัติก่อนกดบันทึก และฐานข้อมูลจะคำนวณ `total_sales` อีกชั้น
4. กรอกวัตถุดิบที่ใช้ไป สินค้าคงเหลือปลายวันแบบแยกรายการ (ไก่ทอดดั้งเดิม ไก่ทอดพริก หนังไก่ เครื่องในไก่ ไก่สับ น่องไก่ ข้าวเหนียว และน้ำมัน) รายการสั่งของ และหมายเหตุ
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
- เก็บ `SUPABASE_SERVICE_ROLE_KEY` เป็น Environment Variable ฝั่ง Server เท่านั้น เพราะคีย์นี้ใช้สร้างและยืนยันผู้ใช้โดยข้ามการยืนยันอีเมลได้
- Service worker cache เฉพาะ GET request เพื่อช่วยโหลดเร็วขึ้น แต่ข้อมูลการบันทึกยังต้องออนไลน์เพื่อส่งเข้า Supabase


## การติดตั้ง PWA บนมือถือ

### Android (Chrome)

1. เปิด URL ของระบบผ่าน Chrome
2. Login ให้เรียบร้อย
3. กดปุ่ม **ติดตั้งแอปเหนียวไก่เยอะโคตร** ที่ด้านล่างหน้าจอ (Add to Home Screen)
4. กดยืนยัน Install
5. เปิดจากไอคอนบนหน้า Home จะใช้งานแบบเต็มจอ ไม่มี URL bar และมี splash screen จากค่า manifest

### iPhone (Safari)

1. เปิด URL ของระบบผ่าน Safari
2. Login ให้เรียบร้อย
3. กดปุ่ม **วิธีเพิ่มลงหน้าจอหลัก (iPhone)** หรือกดปุ่ม Share ของ Safari
4. เลือก **Add to Home Screen** แล้วกด Add
5. เปิดจากไอคอนบนหน้า Home จะเป็นโหมด app เต็มจอ

## Deploy Production (Vercel)

### Exact deployment steps for auth fix

1. Push โค้ดขึ้น GitHub แล้ว Import/Deploy repo ใน Vercel
2. ตั้ง Environment Variables ใน Vercel → Project → Settings → Environment Variables ให้ครบใน environment ที่ใช้งานจริง (`Production` และ `Preview` ถ้าใช้ preview deployments):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Server-only; ห้าม expose เป็น `NEXT_PUBLIC_*`)
   - `NEXT_PUBLIC_APP_URL` (URL production จริง เช่น `https://your-app.vercel.app`)
3. Verify Vercel env ด้วย Vercel CLI:

   ```bash
   vercel env ls
   vercel env pull .env.local
   npm run verify:env
   ```

   ผลลัพธ์ต้องขึ้น `OK` สำหรับ `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, และ `SUPABASE_SERVICE_ROLE_KEY`
4. ไปที่ Supabase Dashboard → **Authentication > URL Configuration** แล้วตั้งค่า URL ให้เป็น production เท่านั้น:
   - **Site URL** = `https://kai-tood.vercel.app` หรือ production domain จริง
   - **Redirect URLs** ต้องมี `https://kai-tood.vercel.app` และ `https://kai-tood.vercel.app/**`
   - ลบ `http://localhost:3000`, `http://127.0.0.1:*`, และ URL local อื่น ๆ ออกจาก production project
5. ถ้าต้องการ verify/update ผ่าน Supabase Management API และส่งอีเมลยืนยันใหม่ให้ `koykoykoy9783@gmail.com` ให้ pull production env แล้วรัน:

   ```bash
   NEXT_PUBLIC_APP_URL="https://kai-tood.vercel.app" \
   CONFIRMATION_EMAIL="koykoykoy9783@gmail.com" \
   npm run fix:auth-redirect
   ```

   คำสั่งนี้ตรวจ **Site URL**, ตรวจ/แก้ **Redirect URLs**, ลบ localhost ออกจาก allow-list, ส่ง confirmation email ใหม่พร้อม `emailRedirectTo` เป็น production URL, และรายงานสถานะยืนยันอีเมลของ user
6. หากต้องการยืนยัน user ผ่าน Admin API หลังส่งอีเมลและทดสอบ login ให้เพิ่มตัวแปรต่อไปนี้ (ใช้เฉพาะตอนซ่อม production):

   ```bash
   CONFIRM_EMAIL_WITH_ADMIN_API=true \
   VERIFY_USER_PASSWORD="<password ของ koykoykoy9783@gmail.com>" \
   npm run fix:auth-redirect
   ```
7. ไปที่ Supabase Dashboard → **Authentication > Providers > Email** แล้วปิด **Confirm email** สำหรับระบบภายในร้าน เพื่อให้ผู้ใช้ใหม่ Login ได้ทันที
8. ถ้าใช้ Supabase CLI/local development ไฟล์ `supabase/config.toml` ตั้งค่า `[auth.email].enable_confirmations = false` ไว้แล้ว แต่ production Supabase Dashboard ยังต้องปิดตามข้อ 7 ด้วยตัวเอง
9. เปิด Supabase SQL Editor แล้วรัน SQL ทั้งหมดจากไฟล์ `supabase/migrations/202606110002_auth_immediate_login_repair.sql` เพื่อซ่อม `ensure_login_profile`, ให้ Staff ใหม่มี default branch, และให้ `koykoykoy9783@gmail.com` เป็น `owner`
10. กด Redeploy ใน Vercel หลังเพิ่ม/แก้ Environment Variables เพราะ Vercel จะ inject env เข้า deployment ใหม่เท่านั้น
11. ทดสอบ `/api/health` หลัง deploy: ค่า `supabase.nextPublicSupabaseUrl`, `supabase.nextPublicSupabaseAnonKey`, `supabase.supabaseServiceRoleKey`, และ `supabase.serverConfigValid` ต้องเป็น `true` โดย endpoint นี้ไม่แสดงค่า secret
12. Verify Auth deployment จากเครื่องที่ pull env แล้ว โดยใช้ test email ใหม่ที่ยังไม่เคยมีใน Supabase และรหัสผ่านจริงของ owner:

   ```bash
   VERIFY_NEW_USER_EMAIL="auth-test+$(date +%s)@example.com" \
   VERIFY_NEW_USER_PASSWORD="ChangeMe12345!" \
   VERIFY_OWNER_PASSWORD="<password ของ koykoykoy9783@gmail.com>" \
   npm run verify:auth
   ```

   คำสั่งนี้ตรวจว่า service role key เรียก Auth Admin API ได้, ผู้ใช้ใหม่ได้ session ทันทีหลัง signup, ผู้ใช้ใหม่ login ได้ทันที, profile Staff มี `branch_id`, และ `koykoykoy9783@gmail.com` login ได้พร้อม role `owner`
13. Login ผ่านหน้าเว็บจริงด้วย `koykoykoy9783@gmail.com`; หากบัญชีเคยค้าง `Email not confirmed` ระบบจะใช้ `SUPABASE_SERVICE_ROLE_KEY` ยืนยันอีเมลเดิมแล้ว Login ซ้ำให้อัตโนมัติ
14. เปิด `/owner-dashboard` เพื่อยืนยันว่า owner role assignment ยังทำงาน และทดสอบติดตั้ง PWA บน Android + iPhone หลัง deploy

## Counter Order production migration checklist

เมื่อหน้า Counter Order แสดงข้อความ `กรุณารัน migration ล่าสุดของระบบนับออเดอร์ แล้วสั่ง reload schema` หรือ query `information_schema.tables` แล้วไม่พบตารางที่มีคำว่า `counter` ให้ใช้ขั้นตอนนี้กับ Supabase production project:

1. วิธีแนะนำแบบตรงที่สุด: เปิด Supabase Dashboard → SQL Editor → New query แล้ว copy/run SQL ทั้งหมดจาก `supabase/migrations/202606100003_counter_order_sql_editor_full.sql`
2. SQL direct-apply ตัวนี้จะสร้าง enum, sequence, table, index, RLS policy, seed ราคา, RPC, grant, ตรวจสอบ object ที่จำเป็น และสั่ง `notify pgrst, 'reload schema';` ให้ครบในไฟล์เดียว
3. ถ้าใช้ Supabase CLI ให้รัน `supabase db push` จากเครื่องที่ตั้งค่า Supabase CLI และเชื่อม project production แล้ว โดย migration ล่าสุดคือ `202606100003_counter_order_sql_editor_full.sql`
4. หลังรันสำเร็จ ให้ query ตรวจสอบซ้ำ:

   ```sql
   select table_name
   from information_schema.tables
   where table_schema='public'
     and table_name like '%counter%'
   order by table_name;
   ```

   ต้องเห็นอย่างน้อย `counter_price_items`, `counter_orders`, `counter_order_items`, `counter_cancellations`, `counter_print_logs`
5. ตารางที่ต้องมีสำหรับ Counter Order:
   - `public.counter_price_items`
   - `public.counter_orders`
   - `public.counter_order_items`
   - `public.counter_cancellations`
   - `public.counter_print_logs`
6. RPC functions ที่ต้องมีสำหรับ Counter Order:
   - `public.get_counter_price_items()`
   - `public.can_use_counter_branch(uuid)`
   - `public.create_counter_order(uuid,numeric,integer)`
   - `public.cancel_latest_counter_order(uuid,text)`
   - `public.mark_order_printed(uuid)`
   - `public.reprint_order(uuid)`
7. ทดสอบ Staff โดย login ด้วยบัญชี Staff ที่อยู่สาขาของตัวเอง เข้า `/counter-orders` แล้วกดบันทึกออเดอร์หนึ่งรายการ ต้องเห็นข้อความ `✅ บันทึกแล้ว`
8. ทดสอบ Owner โดย login ด้วยบัญชี Owner เข้า `/counter-orders` เพื่อดูยอดรวมหน้าร้าน และเข้า `/reports` หรือ `/owner-dashboard` เพื่อดูสรุปรายงานทุกสาขา
