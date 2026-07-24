"use client";

import { useState } from "react";
import { getThaiDistricts, getThaiSubdistricts, thaiProvinces } from "@/lib/thai-address";
import type { MiniApplicationStatus } from "@/lib/types";

const inputClass = "rounded-2xl border border-black/10 px-4 py-3 font-bold disabled:bg-black/5 disabled:text-black/40";
const statusLabels: Record<MiniApplicationStatus, string> = { new: "สมัครใหม่", area_conflict: "พื้นที่ซ้ำ", awaiting_location_info: "รอข้อมูลทำเล", prequalified: "ผ่านการคัดกรองเบื้องต้น", appointment_scheduled: "นัดพูดคุย", approved: "อนุมัติ", rejected: "ไม่ผ่าน", paid: "ชำระเงินแล้ว", delivered: "ส่งมอบแล้ว", opened: "เปิดขายแล้ว" };
const statuses = Object.keys(statusLabels) as MiniApplicationStatus[];

type Props = { q: string; province: string; district: string; subdistrict: string; status: string; from: string; to: string };

export function MiniApplicationFilters(props: Props) {
  const [province, setProvince] = useState(props.province);
  const [district, setDistrict] = useState(props.district);
  const districts = getThaiDistricts(province);
  const subdistricts = getThaiSubdistricts(province, district);

  return <form className="grid gap-3 rounded-[1.5rem] bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-4">
    <input name="q" defaultValue={props.q} placeholder="ค้นหาชื่อ เบอร์โทร เลขอ้างอิง" className={inputClass} />
    <select name="province" value={province} onChange={(event) => { setProvince(event.currentTarget.value); setDistrict(""); }} className={inputClass}>
      <option value="">ทุกจังหวัด</option>{thaiProvinces.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
    <select name="district" value={district} onChange={(event) => setDistrict(event.currentTarget.value)} disabled={!province} className={inputClass}>
      <option value="">ทุกอำเภอ/เขต</option>{districts.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
    <select key={`${province}-${district}`} name="subdistrict" defaultValue={province === props.province && district === props.district ? props.subdistrict : ""} disabled={!district} className={inputClass}>
      <option value="">ทุกตำบล/แขวง</option>{subdistricts.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
    <select name="status" defaultValue={props.status} className={inputClass}><option value="">ทุกสถานะ</option>{statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select>
    <input name="from" type="date" defaultValue={props.from} className={inputClass} />
    <input name="to" type="date" defaultValue={props.to} className={inputClass} />
    <button className="rounded-2xl bg-black px-5 py-3 font-black text-white sm:col-span-3 lg:col-span-4">ค้นหา</button>
  </form>;
}
