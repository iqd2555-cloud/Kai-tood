"use client";

import { useState } from "react";

type Props = { queueId: string; imageUrl: string; quote: string; rendered?: boolean };
function thaiSegments(text: string) { try { const s = new Intl.Segmenter("th", { granularity: "word" }); return Array.from(s.segment(text), p => p.segment).filter(p => p.trim()); } catch { return text.split(/\s+/).filter(Boolean); } }
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) { const units=thaiSegments(text), lines:string[]=[]; let line=""; for(const u of units){const n=line?`${line} ${u}`:u;if(ctx.measureText(n).width<=maxWidth||!line)line=n;else{lines.push(line);line=u;}} if(line)lines.push(line);return lines; }
async function loadImage(url:string){const image=new Image();image.crossOrigin="anonymous";image.decoding="async";image.src=url;await image.decode();return image;}

export function ImageQuotePreview({ queueId,imageUrl,quote,rendered=false }:Props){
 const [working,setWorking]=useState(false); const [error,setError]=useState("");
 async function renderAndSave(){if(!quote.trim()||working)return;setWorking(true);setError("");try{
  const image=await loadImage(imageUrl);const maxEdge=2160,scale=Math.min(1,maxEdge/Math.max(image.naturalWidth,image.naturalHeight));const width=Math.round(image.naturalWidth*scale),height=Math.round(image.naturalHeight*scale);const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("ไม่สามารถสร้างไฟล์รูปได้");ctx.drawImage(image,0,0,width,height);
  // โปสเตอร์สร้างแรงบันดาลใจ: ใช้ภาพจริงเต็มใบ + typography เด่น + พื้นที่มืดแบบไล่เฉดเฉพาะด้านข้อความ ไม่มี card/แถบทึบ
  const shade=ctx.createLinearGradient(0,0,width*.72,0);shade.addColorStop(0,"rgba(0,0,0,.78)");shade.addColorStop(.48,"rgba(0,0,0,.46)");shade.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
  const x=Math.round(width*.075), maxW=Math.round(width*.62);let size=Math.max(38,Math.round(width*.065)),lines:string[]=[];while(size>=30){ctx.font=`900 ${size}px Tahoma, Arial, sans-serif`;lines=wrapText(ctx,quote.trim(),maxW);if(lines.length<=4)break;size-=2;}
  const lh=size*1.16,total=lines.length*lh;let y=Math.max(height*.12,(height-total)/2);
  ctx.textAlign="left";ctx.textBaseline="top";ctx.shadowColor="rgba(0,0,0,.65)";ctx.shadowBlur=Math.max(4,size*.08);
  // kicker ขนาดเล็กเพื่อบอกหมวด ไม่แย่งคำคม
  ctx.font=`800 ${Math.max(18,Math.round(size*.38))}px Tahoma, Arial, sans-serif`;ctx.fillStyle="#ffffff";ctx.fillText("เรื่องจริงของพ่อค้าแม่ค้าข้างถนน",x,y,maxW);y+=size*.72;
  // คำคมเป็นพระเอก ใช้ขาว/เหลืองสลับเพื่อสร้าง hierarchy แบบโปสเตอร์ตัวอย่าง
  for(let i=0;i<lines.length;i++){ctx.font=`900 ${size}px Tahoma, Arial, sans-serif`;ctx.fillStyle=i===Math.max(0,lines.length-2)?"#f5b400":"#ffffff";ctx.fillText(lines[i],x,y,maxW);y+=lh;}
  ctx.shadowBlur=0;ctx.fillStyle="#f5b400";ctx.fillRect(x,y+size*.18,Math.min(maxW,width*.34),Math.max(5,Math.round(height*.004)));
  ctx.font=`700 ${Math.max(17,Math.round(size*.34))}px Tahoma, Arial, sans-serif`;ctx.fillStyle="rgba(255,255,255,.92)";ctx.fillText("เหนื่อยได้ แต่ต้องรู้ว่าเรากำลังสร้างอะไรให้ชีวิต",x,y+size*.55,maxW);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error("สร้างไฟล์ JPEG ไม่สำเร็จ")),"image/jpeg",.94));const body=new FormData();body.append("queue_id",queueId);body.append("file",new File([blob],"post-ready.jpg",{type:"image/jpeg"}));const response=await fetch("/api/content-ready/render",{method:"POST",body});const json=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof json.error==="string"?json.error:"บันทึกรูปไม่สำเร็จ");window.location.reload();
 }catch(cause){setError(cause instanceof Error?cause.message:"สร้างรูปไม่สำเร็จ");setWorking(false);}}
 return <div className="space-y-2"><div className="relative overflow-hidden rounded-2xl bg-black"><img src={imageUrl} crossOrigin="anonymous" alt="ภาพสำหรับโพสต์" className="max-h-[70vh] w-full object-contain" />{!rendered&&quote?<div className="pointer-events-none absolute inset-0 flex items-center bg-gradient-to-r from-black/80 via-black/40 to-transparent"><div className="ml-[7.5%] w-[62%] text-left text-white drop-shadow-2xl"><div className="mb-2 text-[10px] font-extrabold">เรื่องจริงของพ่อค้าแม่ค้าข้างถนน</div><div className="text-2xl font-black leading-tight">{quote}</div><div className="mt-3 h-1 w-24 bg-amber-400"/><div className="mt-2 text-[11px] font-bold text-white/90">เหนื่อยได้ แต่ต้องรู้ว่าเรากำลังสร้างอะไรให้ชีวิต</div></div></div>:null}</div>{!rendered?<button type="button" onClick={renderAndSave} disabled={working||!quote.trim()} className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-black text-black disabled:opacity-50">{working?"กำลังสร้างไฟล์รูป...":"สร้างไฟล์รูปพร้อมโพสต์"}</button>:<div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-sm font-black text-green-800">✓ ไฟล์รูปพร้อมโพสต์แล้ว</div>}{error?<div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>:null}</div>;
}
