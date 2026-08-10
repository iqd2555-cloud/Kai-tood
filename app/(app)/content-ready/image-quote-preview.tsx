"use client";

import { useState } from "react";

type Props={queueId:string;imageUrl:string;quote:string;rendered?:boolean};
const DISPLAY='"Kanit","Noto Sans Thai",sans-serif';
const ACCENT='"Sriracha","Kanit","Noto Sans Thai",sans-serif';
function seg(t:string){try{const s=new Intl.Segmenter("th",{granularity:"word"});return Array.from(s.segment(t),p=>p.segment).filter(Boolean)}catch{return t.split(/\s+/)}}
function wrap(ctx:CanvasRenderingContext2D,t:string,w:number){const a=seg(t),out:string[]=[];let l="";for(const u of a){const n=l?l+u:u;if(ctx.measureText(n).width<=w||!l)l=n;else{out.push(l.trim());l=u}}if(l.trim())out.push(l.trim());return out}
async function img(url:string){const i=new Image();i.crossOrigin="anonymous";i.decoding="async";i.src=url;await i.decode();return i}
async function fonts(){if(typeof document!=="undefined"&&"fonts" in document){await Promise.allSettled([document.fonts.load('900 72px "Kanit"'),document.fonts.load('400 72px "Sriracha"'),document.fonts.ready])}}

/* OWNER VISUAL STANDARD — LOCKED
  1) Reference language: premium Thai street-business motivational editorial poster.
  2) Headline font MUST be heavy Thai display (Kanit 900). Accent handwriting MUST be Sriracha only.
  3) NEVER use Tahoma/Arial/UI font as visible poster typography; Noto is fallback only.
  4) Typography hierarchy is mandatory: oversized quote mark -> large emotional headline -> highlighted key phrase -> small support line.
  5) Palette locked: warm white + golden yellow + red accent + black editorial contrast.
  6) NEVER draw a flat opaque caption bar/card behind the headline.
  7) Use gradient/vignette integrated into the photo; preserve the real subject and avoid covering the focal object.
  8) Graphic vocabulary: quotation marks, hand-drawn underline/brush strokes, restrained editorial rules. No generic template decoration.
  9) Quote is motivational for street vendors and must connect to the real scene; it is NOT a literal inventory of objects in the photo.
 10) AI may change words for each photo but MUST NOT invent a new visual style. This component is the renderer of record.
*/
export function ImageQuotePreview({queueId,imageUrl,quote,rendered=false}:Props){
 const[working,setWorking]=useState(false),[error,setError]=useState("");
 async function renderAndSave(){if(!quote.trim()||working)return;setWorking(true);setError("");try{await fonts();const image=await img(imageUrl);const scale=Math.min(1,2160/Math.max(image.naturalWidth,image.naturalHeight));const w=Math.round(image.naturalWidth*scale),h=Math.round(image.naturalHeight*scale);const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");if(!x)throw new Error("ไม่สามารถสร้างไฟล์รูปได้");x.drawImage(image,0,0,w,h);
 // Editorial photo treatment: left reading field fades naturally into the real image.
 const g=x.createLinearGradient(0,0,w*.68,0);g.addColorStop(0,"rgba(5,5,5,.96)");g.addColorStop(.50,"rgba(5,5,5,.74)");g.addColorStop(.82,"rgba(5,5,5,.30)");g.addColorStop(1,"rgba(5,5,5,0)");x.fillStyle=g;x.fillRect(0,0,w*.72,h);
 const vg=x.createLinearGradient(0,0,0,h);vg.addColorStop(0,"rgba(0,0,0,.18)");vg.addColorStop(.55,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.18)");x.fillStyle=vg;x.fillRect(0,0,w,h);
 const left=w*.065,maxW=w*.47;x.textAlign="left";x.textBaseline="top";
 // Big quotation mark: signature element.
 x.shadowColor="rgba(0,0,0,.35)";x.shadowBlur=w*.004;x.font=`900 ${Math.round(w*.145)}px ${DISPLAY}`;x.fillStyle="#ffc400";x.fillText("“",left,h*.055);
 // Quote: intentionally larger than previous version. Maximum four lines.
 let fs=Math.round(w*.078),lines:string[]=[];while(fs>=Math.round(w*.052)){x.font=`900 ${fs}px ${DISPLAY}`;lines=wrap(x,quote.trim(),maxW);if(lines.length<=4)break;fs-=2}let y=h*.205;const lh=fs*1.12;const hi=Math.max(1,lines.length-2);
 lines.forEach((line,i)=>{const emphasis=i>=hi;x.font=`900 ${Math.round(fs*(emphasis?1.10:1))}px ${DISPLAY}`;x.fillStyle=emphasis?"#ffc400":"#fffaf0";x.fillText(line,left,y,maxW);y+=lh*(emphasis?1.10:1)});
 // Red hand-drawn double underline, never a rectangular banner.
 y+=fs*.12;x.shadowBlur=0;x.strokeStyle="#e51b23";x.lineCap="round";x.lineWidth=Math.max(5,w*.006);for(let k=0;k<2;k++){x.beginPath();x.moveTo(left,y+k*w*.009);x.quadraticCurveTo(left+maxW*.48,y-fs*.08+k*w*.008,left+maxW*.90,y+k*w*.004);x.stroke()}
 // Human supporting thought in handwritten accent, clearly secondary.
 y+=fs*.62;x.font=`400 ${Math.max(22,Math.round(w*.034))}px ${ACCENT}`;x.fillStyle="#fffaf0";const support=wrap(x,"พ่อค้าแม่ค้าไม่มีคำว่าง่าย แต่ทุกวันที่ไม่ยอมแพ้ กำลังพาเราไปข้างหน้า",maxW);support.slice(0,2).forEach(l=>{x.fillText(l,left,y,maxW);y+=w*.047});
 // Bottom brush signature balances the composition.
 const by=h*.915;x.save();x.translate(left,by);x.rotate(-.012);x.fillStyle="#ffc400";x.fillRect(0,0,w*.32,Math.max(10,h*.009));x.fillStyle="#e51b23";x.fillRect(w*.20,h*.012,w*.17,Math.max(5,h*.004));x.restore();
 const blob=await new Promise<Blob>((res,rej)=>c.toBlob(v=>v?res(v):rej(new Error("สร้างไฟล์ JPEG ไม่สำเร็จ")),"image/jpeg",.95));const body=new FormData();body.append("queue_id",queueId);body.append("file",new File([blob],"post-ready.jpg",{type:"image/jpeg"}));const r=await fetch("/api/content-ready/render",{method:"POST",body});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(typeof j.error==="string"?j.error:"บันทึกรูปไม่สำเร็จ");window.location.reload()}catch(e){setError(e instanceof Error?e.message:"สร้างรูปไม่สำเร็จ");setWorking(false)}}
 return <div className="space-y-2"><div className="relative overflow-hidden rounded-2xl bg-black"><img src={imageUrl} crossOrigin="anonymous" alt="ภาพสำหรับโพสต์" className="max-h-[70vh] w-full object-contain"/>{!rendered&&quote?<div className="pointer-events-none absolute inset-0"><div className="absolute inset-y-0 left-0 w-[72%] bg-gradient-to-r from-black via-black/75 to-transparent"/><div className="absolute left-[6.5%] top-[7%] w-[47%] text-left"><div className="font-poster text-7xl font-black leading-none text-amber-400">“</div><div className="font-poster mt-5 text-[clamp(26px,6vw,48px)] font-black leading-[1.08] text-[#fffaf0]">{quote}</div><div className="mt-4 h-1.5 w-[88%] -rotate-1 rounded-full bg-red-600"/><div className="font-poster-accent mt-5 text-base leading-snug text-[#fffaf0]">พ่อค้าแม่ค้าไม่มีคำว่าง่าย<br/>แต่ทุกวันที่ไม่ยอมแพ้ กำลังพาเราไปข้างหน้า</div></div></div>:null}</div>{!rendered?<button type="button" onClick={renderAndSave} disabled={working||!quote.trim()} className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-black text-black disabled:opacity-50">{working?"กำลังสร้างไฟล์รูป...":"สร้างไฟล์รูปพร้อมโพสต์"}</button>:<div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-sm font-black text-green-800">✓ ไฟล์รูปพร้อมโพสต์แล้ว</div>}{error?<div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>:null}</div>}
