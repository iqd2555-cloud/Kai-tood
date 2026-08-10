"use client";

import { useState } from "react";

type Props = { queueId: string; imageUrl: string; quote: string; rendered?: boolean };
function thaiSegments(text:string){try{const s=new Intl.Segmenter("th",{granularity:"word"});return Array.from(s.segment(text),p=>p.segment).filter(p=>p.trim());}catch{return text.split(/\s+/).filter(Boolean);}}
function wrapText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){const units=thaiSegments(text),lines:string[]=[];let line="";for(const u of units){const n=line?`${line} ${u}`:u;if(ctx.measureText(n).width<=maxWidth||!line)line=n;else{lines.push(line);line=u;}}if(line)lines.push(line);return lines;}
async function loadImage(url:string){const image=new Image();image.crossOrigin="anonymous";image.decoding="async";image.src=url;await image.decode();return image;}
async function loadPosterFonts(){if(typeof document==="undefined"||!("fonts" in document))return;await Promise.allSettled([document.fonts.load('900 64px "Kanit"'),document.fonts.load('400 64px "Sriracha"'),document.fonts.ready]);}

export function ImageQuotePreview({queueId,imageUrl,quote,rendered=false}:Props){
 const[working,setWorking]=useState(false);const[error,setError]=useState("");
 async function renderAndSave(){if(!quote.trim()||working)return;setWorking(true);setError("");try{
  await loadPosterFonts();
  const image=await loadImage(imageUrl);const maxEdge=2160,scale=Math.min(1,maxEdge/Math.max(image.naturalWidth,image.naturalHeight));const width=Math.round(image.naturalWidth*scale),height=Math.round(image.naturalHeight*scale);const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("ไม่สามารถสร้างไฟล์รูปได้");ctx.drawImage(image,0,0,width,height);

  // Professional motivational poster inspired by the supplied reference:
  // preserve the real photo, build a dedicated dark editorial zone on the left,
  // strong Thai display typography, oversized quote mark, yellow/red accents, no flat banner.
  const panelW=Math.round(width*.48);const grad=ctx.createLinearGradient(0,0,panelW,0);grad.addColorStop(0,"rgba(0,0,0,.94)");grad.addColorStop(.72,"rgba(0,0,0,.72)");grad.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=grad;ctx.fillRect(0,0,Math.round(width*.68),height);
  const topShade=ctx.createLinearGradient(0,0,0,height*.42);topShade.addColorStop(0,"rgba(0,0,0,.30)");topShade.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=topShade;ctx.fillRect(0,0,width,height*.45);

  const x=Math.round(width*.065),maxW=Math.round(width*.43);ctx.textAlign="left";ctx.textBaseline="top";ctx.shadowColor="rgba(0,0,0,.55)";ctx.shadowBlur=Math.max(3,width*.004);
  // oversized editorial quote mark
  const quoteMarkSize=Math.round(width*.13);ctx.font=`900 ${quoteMarkSize}px "Kanit", "Noto Sans Thai", sans-serif`;ctx.fillStyle="#ffc400";ctx.fillText("“",x,Math.round(height*.07));

  let size=Math.max(46,Math.round(width*.064)),lines:string[]=[];while(size>=34){ctx.font=`900 ${size}px "Kanit", "Noto Sans Thai", sans-serif`;lines=wrapText(ctx,quote.trim(),maxW);if(lines.length<=5)break;size-=2;}
  const lineH=size*1.13;let y=Math.round(height*.22);
  // first part white, final emphasis yellow like the reference
  const emphasisStart=Math.max(1,lines.length-2);
  for(let i=0;i<lines.length;i++){
    ctx.font=`${i>=emphasisStart?900:800} ${i>=emphasisStart?Math.round(size*1.08):size}px "Kanit", "Noto Sans Thai", sans-serif`;
    ctx.fillStyle=i>=emphasisStart?"#ffc400":"#ffffff";
    ctx.fillText(lines[i],x,y,maxW);y+=i>=emphasisStart?lineH*1.08:lineH;
  }
  // hand-drawn red underline under the highlighted message
  const underlineY=y+Math.round(size*.05);ctx.strokeStyle="#e21b23";ctx.lineWidth=Math.max(6,Math.round(width*.007));ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x,underlineY);ctx.quadraticCurveTo(x+maxW*.50,underlineY-size*.09,x+maxW*.92,underlineY-size*.01);ctx.stroke();

  // supporting label; smaller and intentionally secondary
  y=underlineY+Math.round(size*.65);ctx.shadowBlur=0;ctx.font=`700 ${Math.max(18,Math.round(width*.025))}px "Kanit", "Noto Sans Thai", sans-serif`;ctx.fillStyle="#ffffff";ctx.fillText("พ่อค้าแม่ค้าข้างถนน",x,y,maxW);
  y+=Math.round(width*.045);ctx.font=`400 ${Math.max(22,Math.round(width*.031))}px "Sriracha", "Kanit", "Noto Sans Thai", sans-serif`;ctx.fillStyle="rgba(255,255,255,.94)";ctx.fillText("งานอาจหนัก แต่ทุกวันที่ลงมือ คือทุนของวันข้างหน้า",x,y,maxW);

  // small yellow brush stroke footer for visual balance
  const footerY=Math.round(height*.92);ctx.fillStyle="#ffc400";ctx.save();ctx.translate(x,footerY);ctx.rotate(-.012);ctx.fillRect(0,0,Math.round(width*.36),Math.max(9,Math.round(height*.008)));ctx.restore();

  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error("สร้างไฟล์ JPEG ไม่สำเร็จ")),"image/jpeg",.95));const body=new FormData();body.append("queue_id",queueId);body.append("file",new File([blob],"post-ready.jpg",{type:"image/jpeg"}));const response=await fetch("/api/content-ready/render",{method:"POST",body});const json=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof json.error==="string"?json.error:"บันทึกรูปไม่สำเร็จ");window.location.reload();
 }catch(cause){setError(cause instanceof Error?cause.message:"สร้างรูปไม่สำเร็จ");setWorking(false);}}

 return <div className="space-y-2"><div className="relative overflow-hidden rounded-2xl bg-black"><img src={imageUrl} crossOrigin="anonymous" alt="ภาพสำหรับโพสต์" className="max-h-[70vh] w-full object-contain" />{!rendered&&quote?<div className="pointer-events-none absolute inset-0"><div className="absolute inset-y-0 left-0 w-[68%] bg-gradient-to-r from-black via-black/75 to-transparent"/><div className="absolute left-[6.5%] top-[9%] w-[43%] text-left text-white"><div className="font-poster text-7xl font-black leading-none text-amber-400">“</div><div className="font-poster mt-1 text-2xl font-black leading-[1.18]">{quote}</div><div className="mt-3 h-1.5 w-28 -rotate-1 rounded-full bg-red-600"/><div className="font-poster mt-4 text-xs font-bold">พ่อค้าแม่ค้าข้างถนน</div><div className="font-poster-accent mt-1 text-sm leading-snug text-white/95">งานอาจหนัก แต่ทุกวันที่ลงมือ คือทุนของวันข้างหน้า</div></div></div>:null}</div>{!rendered?<button type="button" onClick={renderAndSave} disabled={working||!quote.trim()} className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-black text-black disabled:opacity-50">{working?"กำลังสร้างไฟล์รูป...":"สร้างไฟล์รูปพร้อมโพสต์"}</button>:<div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-sm font-black text-green-800">✓ ไฟล์รูปพร้อมโพสต์แล้ว</div>}{error?<div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>:null}</div>;
}
