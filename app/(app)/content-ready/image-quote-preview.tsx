"use client";
import{useState}from"react";
type Props={queueId:string;imageUrl:string;quote:string;rendered?:boolean};
const D='"Kanit","Noto Sans Thai",sans-serif';
function seg(t:string){try{const s=new Intl.Segmenter("th",{granularity:"word"});return Array.from(s.segment(t),p=>p.segment).filter(v=>v.trim())}catch{return t.split(/\s+/).filter(Boolean)}}
function wrap(c:CanvasRenderingContext2D,t:string,w:number){const a=seg(t),o:string[]=[];let l="";for(const u of a){const n=l?`${l} ${u}`:u;if(c.measureText(n).width<=w||!l)l=n;else{o.push(l.trim());l=u}}if(l.trim())o.push(l.trim());return o}
function splitQuote(t:string){const words=seg(t);if(words.length<=6)return{lead:words.slice(0,Math.max(1,words.length-2)).join(" "),core:words.slice(Math.max(1,words.length-2)).join(" ")};const cut=Math.ceil(words.length*.55);return{lead:words.slice(0,cut).join(" "),core:words.slice(cut).join(" ")}}
async function img(u:string){const i=new Image();i.crossOrigin="anonymous";i.src=u;await i.decode();return i}
async function fonts(){if(typeof document!=="undefined"&&"fonts"in document)await Promise.allSettled([document.fonts.load('900 100px "Kanit"'),document.fonts.ready])}
/* OWNER POSTER STANDARD — QUOTE ONLY
- Use only the approved AI quote. Do not inject generic slogans, checklists, or extra business claims.
- Reference look: premium Thai motivational editorial poster, strong asymmetry and scale contrast.
- Typography: Kanit 900 display only for visible poster text. No Tahoma/Arial/UI-looking headline.
- Hierarchy: oversized quote mark -> white lead phrase -> oversized yellow core phrase -> red hand underline.
- No flat black caption bar, no white card, no generic checklist, no filler paragraph.
- Keep real photo documentary. Dark gradient only supports readability and must blend into photo.
- Locked palette: warm white, golden yellow, red, black.
*/
export function ImageQuotePreview({queueId,imageUrl,quote,rendered=false}:Props){const[working,setWorking]=useState(false),[error,setError]=useState("");async function renderAndSave(){if(!quote.trim()||working)return;setWorking(true);setError("");try{await fonts();const im=await img(imageUrl),sc=Math.min(1,2160/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.round(im.naturalWidth*sc),h=Math.round(im.naturalHeight*sc),cv=document.createElement("canvas");cv.width=w;cv.height=h;const c=cv.getContext("2d");if(!c)throw Error("ไม่สามารถสร้างไฟล์รูปได้");c.drawImage(im,0,0,w,h);
const grad=c.createLinearGradient(0,0,w*.72,0);grad.addColorStop(0,"rgba(4,4,4,.97)");grad.addColorStop(.42,"rgba(4,4,4,.78)");grad.addColorStop(.72,"rgba(4,4,4,.32)");grad.addColorStop(1,"rgba(4,4,4,0)");c.fillStyle=grad;c.fillRect(0,0,w*.76,h);
const l=w*.065,mw=w*.50;c.textAlign="left";c.textBaseline="top";c.shadowColor="rgba(0,0,0,.40)";c.shadowBlur=Math.max(3,w*.004);
c.font=`900 ${Math.round(w*.155)}px ${D}`;c.fillStyle="#ffc400";c.fillText("“",l,h*.055);
const parts=splitQuote(quote.trim());let y=h*.22;
let leadFs=Math.round(w*.064),leadLines:string[]=[];while(leadFs>=Math.round(w*.047)){c.font=`900 ${leadFs}px ${D}`;leadLines=wrap(c,parts.lead,mw);if(leadLines.length<=3)break;leadFs-=2}c.font=`900 ${leadFs}px ${D}`;c.fillStyle="#fffaf0";for(const line of leadLines){c.fillText(line,l,y,mw);y+=leadFs*1.08}
y+=leadFs*.08;
let coreFs=Math.round(w*.088),coreLines:string[]=[];while(coreFs>=Math.round(w*.062)){c.font=`900 ${coreFs}px ${D}`;coreLines=wrap(c,parts.core,mw);if(coreLines.length<=3)break;coreFs-=2}c.font=`900 ${coreFs}px ${D}`;c.fillStyle="#ffc400";for(const line of coreLines){c.fillText(line,l,y,mw);y+=coreFs*1.02}
// hand-drawn red underline: visual signature from reference, not a rectangular bar
c.shadowBlur=0;y+=coreFs*.14;c.strokeStyle="#e51b23";c.lineWidth=Math.max(7,w*.008);c.lineCap="round";for(let n=0;n<2;n++){c.beginPath();c.moveTo(l,y+n*w*.010);c.quadraticCurveTo(l+mw*.46,y-coreFs*.10+n*w*.008,l+mw*.91,y+n*w*.003);c.stroke()}
// minimal editorial corner rules for balance; no additional copy
const by=h*.90;c.strokeStyle="#ffc400";c.lineWidth=Math.max(5,w*.006);c.beginPath();c.moveTo(l,by);c.lineTo(l+w*.26,by);c.stroke();c.strokeStyle="#e51b23";c.beginPath();c.moveTo(l+w*.20,by+h*.012);c.lineTo(l+w*.36,by+h*.012);c.stroke();
const blob=await new Promise<Blob>((r,j)=>cv.toBlob(v=>v?r(v):j(Error("สร้างไฟล์ JPEG ไม่สำเร็จ")),"image/jpeg",.95)),body=new FormData();body.append("queue_id",queueId);body.append("file",new File([blob],"post-ready.jpg",{type:"image/jpeg"}));const res=await fetch("/api/content-ready/render",{method:"POST",body}),json=await res.json().catch(()=>({}));if(!res.ok)throw Error(typeof json.error==="string"?json.error:"บันทึกรูปไม่สำเร็จ");window.location.reload()}catch(e){setError(e instanceof Error?e.message:"สร้างรูปไม่สำเร็จ");setWorking(false)}}
const p=splitQuote(quote.trim());return <div className="space-y-2"><div className="relative overflow-hidden rounded-2xl bg-black"><img src={imageUrl} crossOrigin="anonymous" alt="ภาพสำหรับโพสต์" className="max-h-[70vh] w-full object-contain"/>{!rendered&&quote?<div className="pointer-events-none absolute inset-0"><div className="absolute inset-y-0 left-0 w-[76%] bg-gradient-to-r from-black via-black/75 to-transparent"/><div className="absolute left-[6.5%] top-[6%] w-[50%] text-left"><div className="font-poster text-7xl font-black leading-none text-amber-400">“</div><div className="font-poster mt-6 text-[clamp(24px,5.7vw,44px)] font-black leading-[1.06] text-[#fffaf0]">{p.lead}</div><div className="font-poster mt-2 text-[clamp(31px,7.5vw,58px)] font-black leading-[.98] text-amber-400">{p.core}</div><div className="mt-4 h-1.5 w-[90%] -rotate-1 rounded-full bg-red-600"/></div><div className="absolute bottom-[9%] left-[6.5%] h-1.5 w-[26%] bg-amber-400"/><div className="absolute bottom-[7.7%] left-[26%] h-1 w-[16%] bg-red-600"/></div>:null}</div>{!rendered?<button type="button" onClick={renderAndSave} disabled={working||!quote.trim()} className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-black text-black disabled:opacity-50">{working?"กำลังสร้างไฟล์รูป...":"สร้างไฟล์รูปพร้อมโพสต์"}</button>:<div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-sm font-black text-green-800">✓ ไฟล์รูปพร้อมโพสต์แล้ว</div>}{error?<div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>:null}</div>}
