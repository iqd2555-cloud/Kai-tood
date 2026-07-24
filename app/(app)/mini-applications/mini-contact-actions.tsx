"use client";

import { useState } from "react";

const LINE_URL = "https://line.me/R/ti/p/@kaikov";

type Props = {
  fullName: string;
  phone: string;
  lineId: string | null;
  referenceCode: string;
  group: "A" | "B" | "C";
};

function messageFor({ fullName, referenceCode, group }: Pick<Props, "fullName" | "referenceCode" | "group">) {
  if (group === "A") return `สวัสดีค่ะ คุณ${fullName}\nทีมงานเหนียวไก่เยอะโคตรได้รับใบสมัคร MINI STARTER เลขอ้างอิง ${referenceCode} แล้วค่ะ ข้อมูลผ่านการคัดกรองเบื้องต้น ทีมงานต้องการนัดพูดคุยเพื่อตรวจสอบทำเลและความพร้อมเพิ่มเติม กรุณาแจ้งช่วงเวลาที่สะดวกรับสายค่ะ\n\nยังไม่ต้องชำระเงินจนกว่าจะได้รับแจ้งผลอนุมัติจากบริษัท`;
  if (group === "B") return `สวัสดีค่ะ คุณ${fullName}\nทีมงานได้รับใบสมัคร MINI STARTER เลขอ้างอิง ${referenceCode} แล้วค่ะ ขณะนี้ยังต้องการข้อมูลเพิ่มเติมเกี่ยวกับทำเล ผู้ลงมือขายจริง และงบอุปกรณ์กับทุนหมุนเวียน กรุณาส่งรายละเอียดเพิ่มเติมทาง LINE เพื่อให้ทีมงานตรวจสอบก่อนนัดพูดคุยค่ะ\n\nยังไม่ต้องชำระเงินจนกว่าจะได้รับแจ้งผลอนุมัติจากบริษัท`;
  return `สวัสดีค่ะ คุณ${fullName}\nทีมงานได้รับใบสมัคร MINI STARTER เลขอ้างอิง ${referenceCode} แล้วค่ะ ขณะนี้ข้อมูลหรือพื้นที่ยังไม่ผ่านการพิจารณาเบื้องต้น ทีมงานจะแจ้งให้ทราบอีกครั้งหากมีพื้นที่หรือเงื่อนไขที่เหมาะสมค่ะ\n\nกรุณาอย่าชำระเงินจนกว่าจะได้รับแจ้งผลอนุมัติจากบริษัท`;
}

export function MiniContactActions(props: Props) {
  const [copied, setCopied] = useState(false);
  const phone = props.phone.replace(/[^\d+]/g, "");
  const copyMessage = async () => {
    await navigator.clipboard.writeText(messageFor(props));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return <div className="mt-4 grid gap-2 rounded-2xl border border-black/10 bg-black/[0.025] p-3 sm:grid-cols-3">
    <a href={`tel:${phone}`} className="rounded-xl bg-black px-4 py-3 text-center font-black text-white">โทรหาผู้สมัคร</a>
    <button type="button" onClick={copyMessage} className="rounded-xl bg-[#ffc400] px-4 py-3 font-black text-black">{copied ? "คัดลอกแล้ว" : "คัดลอกข้อความตอบกลับ"}</button>
    <a href={LINE_URL} target="_blank" rel="noreferrer" className="rounded-xl bg-[#06C755] px-4 py-3 text-center font-black text-white">เปิด LINE Official</a>
    {props.lineId && <p className="text-sm font-bold text-black/60 sm:col-span-3">LINE ID ที่ผู้สมัครแจ้ง: <span className="font-black text-black">{props.lineId}</span></p>}
  </div>;
}
