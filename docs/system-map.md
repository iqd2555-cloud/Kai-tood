# SYSTEM MAP — Kai-tood

> อ้างอิงจากโค้ดจริงใน repo ณ วันที่ 2026-06-29 ไม่ใช่จากสมมติฐาน UI/DB ภายนอก

## 1) หน้าทั้งหมดในระบบ

### Public / Auth
| Route | ไฟล์ | บทบาท | อ่าน Supabase | เขียน Supabase |
|---|---|---|---|---|
| `/` | `app/page.tsx` | Landing page แฟรนไชส์/PWA | - | - |
| `/franchise/apply` | `app/franchise/apply/page.tsx`, `app/franchise/apply/actions.ts` | สมัครแฟรนไชส์ | - | `franchise_leads` insert |
| `/login` | `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`, `lib/auth.ts` | Login | `profiles` ผ่าน `getCurrentProfile()` หลัง login | RPC `ensure_login_profile()` อาจ insert/update `profiles` |

### App Shell / Protected
| Route | ไฟล์ | บทบาท | อ่าน Supabase | เขียน Supabase |
|---|---|---|---|---|
| Protected layout | `app/(app)/layout.tsx`, `components/app-nav.tsx` | โหลดผู้ใช้และเมนู | `profiles` + `branches` ผ่าน `getCurrentProfile()` | sign out ไม่เขียน table app |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | Dashboard พนักงาน/เจ้าของ | `daily_reports`, `branches` | - |
| `/owner-dashboard` | `app/(app)/owner-dashboard/page.tsx` | Dashboard เจ้าของ | `owner_profit_dashboard` view, `daily_reports`, `branches` | - |
| `/daily` | `app/(app)/daily/page.tsx`, `app/(app)/daily/daily-form.tsx`, `app/actions.ts` | กรอกรายงานประจำวัน | `branches`, `daily_reports`, `profiles` ผ่าน auth | `daily_reports` upsert; จากนั้น sync เขียน `cash_flow_entries` source=`sales` |
| `/history` | `app/(app)/history/page.tsx` | ประวัติรายงาน | `daily_reports` | - |
| `/my-reports` | `app/(app)/my-reports/page.tsx` | รายงานของพนักงาน | `daily_reports` | - |
| `/reports` | `app/(app)/reports/page.tsx` | รายงานเจ้าของ | `branches`, `daily_reports` | - |
| `/orders` | `app/(app)/orders/page.tsx` | รายการสั่งของ | `daily_reports` | - |
| `/counter-orders` | `app/(app)/counter-orders/page.tsx`, `app/(app)/counter-orders/actions.ts` | นับออเดอร์หน้าร้าน | `branches`, `counter_orders`, RPC `get_counter_price_items()` | RPC `create_counter_order()`, `cancel_latest_counter_order()`, `reprint_order()` เขียน/อ่านกลุ่ม `counter_*` |
| `/marination` | `app/(app)/marination/page.tsx`, `app/(app)/marination/marination-console.tsx` | โรงหมักไก่ | `chicken_parts`, `marination_stock_movements` | `marination_stock_movements` insert/update |
| `/cash-flow` | `app/(app)/cash-flow/page.tsx`, `components/cash-flow-manual-form.tsx`, `app/actions.ts` | Cash Flow Center เจ้าของ | `branches`, `cash_flow_categories`, `cash_flow_entries`, `daily_report_rollups` ตอน sync | `cash_flow_entries` insert/update/delete manual, upsert sales sync |
| `/leads` | `app/(app)/leads/page.tsx`, `app/(app)/leads/actions.ts` | จัดการผู้สนใจแฟรนไชส์ | `franchise_leads` | `franchise_leads` update |

### API
| Route | ไฟล์ | อ่าน Supabase | เขียน Supabase |
|---|---|---|---|
| `/api/health` | `app/api/health/route.ts` | - | - |
| `/api/cash-flow/export` | `app/api/cash-flow/export/route.ts` | `cash_flow_entries`, `branches`, `profiles` | - |

## 2) ตาราง/วิว Supabase และ Primary Key

| Object | ชนิด | Primary key | หมายเหตุ source code/schema |
|---|---|---|---|
| `branches` | table | `id uuid` | สาขา, thresholds, active flag |
| `profiles` | table | `id uuid` อ้าง `auth.users(id)` | role owner/staff, branch binding |
| `daily_reports` | table | `id uuid`; unique เพิ่มเติม `(branch_id, report_date)` | รายงานยอดขาย/วัตถุดิบ/คงเหลือ/สั่งของรายวัน |
| `daily_report_rollups` | view | ไม่มี PK จริง | view สรุปจาก `daily_reports`; ใช้เป็น source ยอดขายสำหรับ Cash Flow |
| `owner_profit_dashboard` | view | ไม่มี PK จริง | view dashboard เจ้าของ |
| `counter_price_items` | table | `id uuid` | รายการราคาออเดอร์หน้าร้าน |
| `counter_orders` | table | `id uuid` | หัวบิลออเดอร์ |
| `counter_order_items` | table | `id uuid` | รายการย่อยออเดอร์ |
| `counter_cancellations` | table | `id uuid` | log ยกเลิกออเดอร์ |
| `counter_print_logs` | table | `id uuid` | log พิมพ์/พิมพ์ซ้ำ |
| `chicken_parts` | table | `id uuid` | master ชิ้นส่วนไก่โรงหมัก |
| `marination_stock_movements` | table | `id uuid` | movement รับเข้า/ใช้/ปรับยอด โรงหมัก |
| `franchise_leads` | table | `id uuid` | lead สมัครแฟรนไชส์ |
| `cash_flow_categories` | table | `id uuid` | master category Cash Flow; app ใช้ `code` เป็นค่าหมวด |
| `cash_flow_money_channels` | table | `id uuid` | legacy/ช่องทางเงินใน schema cash flow รุ่นแรก; app ปัจจุบันใช้ `payment_method` text ใน `cash_flow_entries` |
| `cash_flow_entries` | table | `id uuid` | รายการ Cash Flow จริง; unique `(source, source_ref_id)` สำหรับรายการ generated ที่มี ref |
| `cash_flow_entry_audit_logs` | table | `id uuid` | audit ของ `cash_flow_entries` |
| `branch_fix_audit` | table | `id uuid` | audit เฉพาะ migration แก้ branch |

## 3) Cash Flow: source ของข้อมูล

Cash Flow ที่แสดงใน `/cash-flow` โหลดจาก `cash_flow_entries` เท่านั้น แล้ว map เป็น `CashFlowEntry` พร้อม `source_table = "cash_flow_entries"` และ `db_id = id`.

### Sources ที่พบใน type/DB contract
| `cash_flow_entries.source` | สถานะในโค้ดจริง | แหล่งข้อมูลต้นทาง | สร้างโดย |
|---|---|---|---|
| `manual` | ใช้งานจริง | ฟอร์ม “บันทึกรายการเอง” หน้า `/cash-flow` | `saveCashFlowEntry()` insert |
| `sales` | ใช้งานจริง | `daily_report_rollups` ซึ่งมาจาก `daily_reports` | `saveDailyReport()` เรียก `syncSalesReportToCashFlow()` และปุ่ม sync เรียก `syncSalesToCashFlow()` |
| `purchase` | type มีใน frontend | ยังไม่พบ flow สร้างในโค้ดปัจจุบัน | ยังไม่มีใน app code |
| `franchise` | type/migration มี | ยังไม่พบ flow สร้าง Cash Flow จาก `franchise_leads` | ยังไม่มีใน app code |
| `course` | type frontend มี | ยังไม่พบ table/flow เฉพาะ | ยังไม่มีใน app code |
| `stock` | type/migration มี | ยังไม่พบ flow sync จาก stock/วัตถุดิบเข้า Cash Flow | ยังไม่มีใน app code |
| `marinade` | type frontend มี | ยังไม่พบ flow sync จาก `marination_stock_movements` เข้า Cash Flow | ยังไม่มีใน app code |
| `other` | type/migration มี | fallback/legacy | ยังไม่พบ UI สร้างตรง ยกเว้นข้อมูล legacy อาจมีอยู่ |

## 4) รายการ manual

Manual คือ row ใน `cash_flow_entries` ที่ `source = 'manual'` และสร้างจากฟอร์มในหน้า `/cash-flow` ผ่าน `saveCashFlowEntry()`.

- อ่าน/แก้ไข: `cash_flow_entries.id`
- ลบได้จากหน้า Cash Flow โดยตรง
- ปุ่มลบควรแสดงเฉพาะเมื่อ `source_table = 'cash_flow_entries'` และ `source = 'manual'`
- โค้ด server ปัจจุบัน enforce ซ้ำว่าลบได้เฉพาะ `source = 'manual'`

## 5) รายการ generated/sync จากยอดขายหรือรายงาน

Generated ที่ใช้งานจริงตอนนี้คือยอดขาย:

- ต้นทางธุรกิจ: `daily_reports`
- source สรุปที่ Cash Flow อ่านตอน sync: `daily_report_rollups`
- destination: `cash_flow_entries`
- ค่า destination สำคัญ:
  - `source = 'sales'`
  - `source_ref_id = <report_date>_<branch_id>`
  - `category = 'sales_revenue'`
  - `type = 'income'`
  - `status = 'received'`
  - `payment_method = 'mixed'`
  - `note = 'สร้างอัตโนมัติจาก daily_report_rollups'`

Trigger/migration เก่ามีแนวคิด sync จาก `daily_reports` เช่นกัน แต่ flow app ปัจจุบันใช้ server action เป็นหลักและอ่าน `daily_report_rollups` ก่อน upsert เข้า `cash_flow_entries`.

## 6) การลบแต่ละ source ต้องลบที่ table ใด

| Source | ลบจาก Cash Flow โดยตรง? | Table ที่ต้องลบ/แก้ | เหตุผล |
|---|---:|---|---|
| `manual` | ได้ | `cash_flow_entries` โดย `id` และ `source='manual'` | เป็นต้นทางจริงของรายการ manual |
| `sales` | ไม่ควร | เมนูต้นทางคือรายงานประจำวัน: แก้/ลบ/ทำยอดเป็น 0 ที่ `daily_reports` แล้ว sync ใหม่; ถ้าจำเป็นต้องลบ row sync ให้ลบ `cash_flow_entries` source=`sales` ด้วย admin/maintenance เท่านั้น | row ถูกสร้างจาก `daily_report_rollups`; direct delete จะทำให้ข้อมูล Cash Flow ไม่ตรงกับรายงาน |
| `purchase` | ไม่ควรจนกว่าจะมี flow ชัดเจน | ยังไม่มี flow ในโค้ด; ถ้ามีอนาคตควรลบจาก purchase source table | ป้องกัน orphan/mismatch |
| `franchise` | ไม่ควร | `franchise_leads` หรือ source รายได้แฟรนไชส์ในอนาคต | ตอนนี้ยังไม่มี sync เข้า Cash Flow |
| `course` | ไม่ควร | source table ในอนาคต | ตอนนี้ยังไม่มี sync เข้า Cash Flow |
| `stock` | ไม่ควร | source stock/inventory ในอนาคต หรือ `daily_reports` ถ้ามาจากวัตถุดิบรายวัน | ตอนนี้ยังไม่มี sync เข้า Cash Flow |
| `marinade` | ไม่ควร | `marination_stock_movements` ในเมนู `/marination` ถ้ามี sync ในอนาคต | ตอนนี้ยังไม่มี sync เข้า Cash Flow |
| `other` | แล้วแต่ที่มา | ตรวจ `source_ref_id`, `note`, migration/legacy ก่อน | เป็น fallback/legacy ไม่ชัดเจน |

## 7) รายการที่ลบจาก Cash Flow โดยตรงไม่ได้

รายการที่ `source != 'manual'` ต้องไม่ให้ลบจาก Cash Flow โดยตรง เพราะ `deleteCashFlowEntry()` จะ reject ด้วย code `generated-source` อยู่แล้วเมื่อเจอ source ไม่ใช่ manual.

ข้อกำหนด UI ที่ควรใช้:

1. ถ้า `source === 'manual'` และ `source_table === 'cash_flow_entries'` ให้แสดงปุ่ม `ลบ`.
2. ถ้า `source === 'sales'` ให้ซ่อนปุ่มลบ และแสดงข้อความ: “รายการนี้สร้างจากยอดขาย กรุณาแก้/ลบจากเมนูกรอกข้อมูลรายวันหรือรายงานต้นทาง แล้วกดซิงก์ยอดขายใหม่”
3. ถ้า source generated อื่น (`purchase`, `franchise`, `course`, `stock`, `marinade`, `other`) ให้ซ่อนปุ่มลบ และแสดงข้อความ: “รายการนี้มาจากระบบต้นทาง กรุณาลบจากเมนูต้นทาง” พร้อมแสดง source/source_ref_id เพื่อ diagnostic.

## 8) Mapping เชิงธุรกิจ: daily report → report/order/dashboard

`daily_reports` เป็น table หลักของงานรายวัน และถูกใช้หลายหน้า:

- ยอดขาย: `cash_sales`, `transfer_sales`, generated `total_sales`
- วัตถุดิบที่ใช้: `used_bl`, `used_bb`, `used_chicken_skin`, `used_oil`, `used_sticky_rice`, `used_chopped_chicken`, `used_drumstick`, `used_offal`
- คงเหลือ: `remaining_*`
- สั่งของวันถัดไป: `order_*`, `order_other_items`, `requested_items`
- หมายเหตุ: `note`
- สิทธิ์/สาขา: `branch_id`, `submitted_by`

## 9) จุดเสี่ยง/ข้อค้นพบจากโค้ดจริง

1. Type `CashFlowSourceTable` ยังประกาศ `sales_records` และ `daily_reports` แต่หน้า `/cash-flow` ปัจจุบัน map ทุก row ที่โหลดเป็น `source_table = 'cash_flow_entries'`.
2. Client component คำนวณ `canDelete = hasDbId && e.source_table === 'cash_flow_entries' && e.source === 'manual'` แล้ว จึงซ่อนปุ่มลบของ row ที่ sync จากยอดขาย (`source='sales'`) ก่อนถึง server action.
3. `saveCashFlowEntry()` อนุญาต update row ใดก็ได้ตาม `entry_id` โดยไม่ได้กัน source generated บน server; UI แค่แจ้งว่าเป็นรายการจากยอดขายซิงก์. ถ้าต้องการความถูกต้องสูง ควร block edit ของ `source != 'manual'` หรือให้แก้ได้เฉพาะ metadata ที่ปลอดภัย.
4. การลบ generated source ควรทำที่ต้นทางและ sync ใหม่ ไม่ควรลบ `cash_flow_entries` โดยตรงจาก UI ปกติ.
