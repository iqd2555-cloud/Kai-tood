"use client";

import { useState } from "react";
import { qualifyFranchiseLead } from "@/lib/franchise-lead-qualification";
import type { FranchiseLead } from "@/lib/types";

const LINE_URL = "https://line.me/R/ti/p/@kaikoy";

function messageFor(lead: FranchiseLead, group: "A" | "B" | "C") {
  if (group === "A") return `สวัสดีค่ะ คุณ${lead.full_name}\nทีมงานเหนียวไก่เยอะโคตรได้รับใบสมัครแฟรนไชส์ชุดมาตรฐานแล้วค่ะ ข้อมูลผ่านการคัดกรองเบื้องต้น ทีมงานต้องการนัดพูดคุยเพื่อตรวจสอบทำเล งบลงทุน และความพร้อมเพิ่มเติม กรุณาแจ้งช่วงเวลาที่สะดวกรับสายค่ะ\n\nยังไม่ต้องชำระเงินจนกว่าจะได้รับแจ้งผลอนุมัติจากบริษัท`;
  if (group === "B") return `สวัสดีค่ะ คุณ${lead.full_name}\nทีมงานได้รับใบสมัครแฟรนไชส์ชุดมาตรฐานแล้วค่ะ ขณะนี้ยังต้องการข้อมูลเพิ่มเติมเกี่ยวกับทำเล งบลงทุน ทุนสำรอง และผู้ลงมือดูแลร้าน กรุณาส่งรายละเอียดเพิ่มเติมทาง LINE เพื่อให้ทีมงานตรวจสอบก่อนนัดพูดคุยค่ะ\n\nยังไม่ต้องชำระเงินจนกว่าจะได้รับแจ้งผลอนุมัติจากบริษัท`;
  return `สวัสดีค่ะ คุณ${lead.full_name}\nทีมงานได้รับใบสมัครแฟรนไชส์ชุดมาตรฐานแล้วค่ะ ขณะนี้ข้อมูลความพร้อมยังไม่ผ่านการพิจารณาเบื้องต้น ทีมงานจะแจ้งให้ทราบอีกครั้งเมื่อมีเงื่อนไขที่เหมาะสมค่ะ\n\nกรุณาอย่าชำระเงินจนกว่าจะได้รับแจ้งผลอนุมัติจากบริษัท`;
}

export function LeadContactActions({ lead }: { lead: FranchiseLead }) {
  const [copied, setCopied] = useState(false);
  const qualification = qualifyFranchiseLead(lead);
  const phone = lead.phone.replace(/[^\d+]/g, "");
  const copyMessage = async () => {
    await navigator.clipboard.writeText(messageFor(lead, qualification.group));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return <>
    <div className={`mt-4 rounded-2xl border p-3 ${qualification.tone}`}>
      <p className="font-black">{qualification.label} · {qualification.score}/10</p>
      <p className="mt-1 text-sm font-bold">{qualification.reason}</p>
      <p className="mt-1 text-xs font-bold opacity-70">คะแนนนี้ใช้จัดลำดับติดต่อเบื้องต้น ไม่ใช่ผลอนุมัติแฟรนไชส์</p>
    </div>
    <div className="mt-3 grid gap-2 rounded-2xl border border-black/10 bg-black/[0.025] p-3 sm:grid-cols-3">
      <a href={`tel:${phone}`} className="rounded-xl bg-black px-4 py-3 text-center font-black text-white">โทรหาผู้สมัคร</a>
      <button type="button" onClick={copyMessage} className="rounded-xl bg-[#ffc400] px-4 py-3 font-black text-black">{copied ? "คัดลอกแล้ว" : "คัดลอกข้อความตอบกลับ"}</button>
      <a href={LINE_URL} target="_blank" rel="noreferrer" className="rounded-xl bg-[#06C755] px-4 py-3 text-center font-black text-white">เปิด LINE OA เพื่อตรวจข้อความ</a>
      <div className="rounded-xl bg-white p-3 text-sm font-bold leading-6 text-black/60 sm:col-span-3">
        <p>ค้นหาข้อความด้วยชื่อ <span className="font-black text-black">{lead.full_name}</span> หรือเบอร์ <span className="font-black text-black">{lead.phone}</span> ปุ่มนี้ไม่ได้เปิดห้องแชตของผู้สมัครโดยตรง</p>
        {lead.line_id && <p className="mt-1">LINE ID ที่ผู้สมัครแจ้ง: <span className="font-black text-black">{lead.line_id}</span></p>}
      </div>
    </div>
  </>;
}
