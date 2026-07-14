import Image from "next/image";
import Link from "next/link";

const governmentServiceGalleryItems = [
  {
    src: "/owner-meeting1.png",
    alt: "รูปเจ้าของเหนียวไก่เยอะโคตรในช่วงประชุมระหว่างรับราชการ",
    caption: "รูปเจ้าของร้านช่วงรับราชการ 1",
    placeholder: "พื้นที่รูปย่อย 1",
  },
  {
    src: "/owner-meeting2.png",
    alt: "รูปเจ้าของเหนียวไก่เยอะโคตรในช่วงปฏิบัติงานระหว่างรับราชการ",
    caption: "รูปเจ้าของร้านช่วงรับราชการ 2",
    placeholder: "พื้นที่รูปย่อย 2",
  },
  {
    src: "",
    alt: "",
    caption: "รอใส่รูปจริง 3",
    placeholder: "พื้นที่รูปย่อย 3",
  },
  {
    src: "",
    alt: "",
    caption: "รอใส่รูปจริง 4",
    placeholder: "พื้นที่รูปย่อย 4",
  },
];

export const founderPhotos = {
  firstShop: {
    src: "/first-shop.png",
    alt: "ร้านแรกที่เริ่มต้นธุรกิจเหนียวไก่เยอะโคตร",
    caption: "ร้านแรกที่เริ่มจากเงินทุน 4,000 บาท และการลงมือขายด้วยตัวเอง",
    placeholder: "พื้นที่รูป: ร้านแรกที่เริ่มต้นธุรกิจ",
  },
  governmentService: {
    src: "/owner1.png",
    alt: "รูปเจ้าของเหนียวไก่เยอะโคตรในช่วงรับราชการ",
    caption: "ประสบการณ์จากการรับราชการ 27 ปี ถูกนำมาปรับใช้กับการบริหารธุรกิจ",
    placeholder: "พื้นที่รูป: ผู้ก่อตั้งในช่วงรับราชการ",
  },
  afterResignation: {
    src: "",
    alt: "ผู้ก่อตั้งหลังลาออกจากราชการและมาทำธุรกิจเต็มตัว",
    caption: "หลังจากทำธุรกิจต่อเนื่อง 5 ปี ผู้ก่อตั้งตัดสินใจออกมาพัฒนาธุรกิจเต็มตัว",
    placeholder: "พื้นที่รูป: ผู้ก่อตั้งหลังลาออกจากราชการ",
  },
};

export type FounderPhoto = (typeof founderPhotos)[keyof typeof founderPhotos];

const storyParagraphs = [
  "ผมเริ่มต้นธุรกิจนี้ในวันที่เหลือเงินติดตัวเพียง 4,000 บาท",
  "วันนั้นผมไม่ได้มีร้านใหญ่ ไม่มีทีมงาน และไม่มีเงินลงทุนจำนวนมาก มีเพียงสูตรไก่ทอดที่นำมาทดลองขายจากร้านเล็ก ๆ แล้วค่อย ๆ เรียนรู้จากลูกค้าจริงในทุกวัน",
  "ตลอดระยะเวลา 5 ปี ผมไม่ได้พัฒนาเพียงแค่รสชาติของไก่ทอด แต่ยังเรียนรู้เรื่องต้นทุน การจัดร้าน การแบ่งหน้าที่พนักงาน การควบคุมคุณภาพ และการสร้างระบบให้ร้านสามารถทำงานได้จริง",
  "ธุรกิจนี้ทำให้ผมตัดสินใจลาออกจากงานราชการที่ทำมานาน 27 ปี เพื่อมาสร้างร้านไก่ทอดและพัฒนาระบบแฟรนไชส์อย่างเต็มตัว",
  "สิ่งที่ผมนำมาถ่ายทอดจึงไม่ใช่เพียงสูตรอาหาร แต่คือประสบการณ์จริงจากการเริ่มต้น การลงมือขาย การแก้ปัญหา และการสร้างระบบให้ธุรกิจสามารถเดินต่อได้",
];

const founderSections = [
  {
    eyebrow: "Section 1: จุดเริ่มต้นจากเงิน 4,000 บาท",
    title: "วันที่เหลือเงินติดตัวเพียง 4,000 บาท",
    paragraphs: [
      "ผมเริ่มต้นร้านไก่ทอดในวันที่เหลือเงินติดตัวเพียง 4,000 บาท",
      "ผมไม่ได้เริ่มจากร้านใหญ่ ไม่ได้มีอุปกรณ์ครบทุกอย่าง และไม่ได้มีเงินทุนสำหรับลองผิดลองถูกได้มากนัก สิ่งที่ผมมีคือสูตรไก่ทอด ความตั้งใจ และความจำเป็นที่จะต้องทำให้ร้านขายได้จริง",
      "ผมเริ่มจากร้านเล็ก ๆ ลงมือทดลองขายด้วยตัวเอง ฟังความคิดเห็นจากลูกค้า และค่อย ๆ ปรับทั้งสูตร ปริมาณ ราคา และขั้นตอนการทำงาน",
      "ร้านนี้จึงไม่ได้เริ่มจากแผนธุรกิจที่สวยงาม แต่เริ่มจากการลงมือทำภายใต้ข้อจำกัดจริง",
    ],
    photo: founderPhotos.firstShop,
  },
  {
    eyebrow: "Section 2: จากสูตรอาหารสู่ระบบร้าน",
    title: "ความจริงคือร้านไม่ได้อยู่รอดเพราะสูตรเพียงอย่างเดียว",
    paragraphs: [
      "สูตรไก่ทอดเป็นจุดเริ่มต้น แต่สิ่งที่ทำให้ร้านสามารถเดินต่อได้ คือการเรียนรู้และพัฒนาระบบหลังร้านอย่างต่อเนื่อง",
      "ตลอดระยะเวลา 5 ปี ผมเรียนรู้จากการขายจริง ทั้งเรื่องต้นทุนวัตถุดิบ การควบคุมปริมาณ การจัดเตรียมสินค้า การทอด การห่อ การขาย การบริการลูกค้า และการจัดพนักงาน",
      "ผมค่อย ๆ แยกหน้าที่ของพนักงานให้ชัดเจน วางขั้นตอนการทำงาน ลดความซ้ำซ้อน และพัฒนาร้านจากงานที่ต้องพึ่งเจ้าของทุกขั้นตอน ไปสู่ร้านที่สามารถทำงานเป็นระบบได้มากขึ้น",
      "ประสบการณ์เหล่านี้เกิดจากการลองจริง เจอปัญหาจริง และแก้ปัญหาจากหน้างานจริง",
    ],
  },
  {
    eyebrow: "Section 3: ชีวิตรับราชการ 27 ปี",
    title: "27 ปีในระบบราชการ สอนให้ผมเข้าใจเรื่องการวางแผนและความรับผิดชอบ",
    paragraphs: [
      "ก่อนมาทำธุรกิจเต็มตัว ผมรับราชการมาเป็นเวลา 27 ปี",
      "ตลอดช่วงเวลานั้น ผมได้เรียนรู้เรื่องการวางแผน การจัดการงาน การแบ่งหน้าที่ การติดตามผล การรับผิดชอบต่อหน้าที่ และการทำงานภายใต้ระบบที่ชัดเจน",
      "เมื่อมาทำธุรกิจ ผมไม่ได้ทิ้งประสบการณ์เหล่านั้น แต่ได้นำมาปรับใช้กับร้านไก่ทอด ตั้งแต่การจัดคน การกำหนดหน้าที่ การควบคุมต้นทุน การสื่อสารกับพนักงาน และการสร้างมาตรฐานในการทำงาน",
      "สิ่งที่เคยเรียนรู้จากงานราชการ จึงกลายเป็นพื้นฐานสำคัญในการสร้างระบบร้านและระบบแฟรนไชส์",
    ],
    photo: founderPhotos.governmentService,
  },
  {
    eyebrow: "Section 4: การตัดสินใจลาออก",
    title: "การลาออกไม่ใช่การตัดสินใจจากอารมณ์ แต่เกิดจากสิ่งที่ทำต่อเนื่องมา 5 ปี",
    paragraphs: [
      "หลังจากทำร้านไก่ทอดและพัฒนาธุรกิจต่อเนื่องมาเป็นเวลา 5 ปี ผมตัดสินใจลาออกจากงานราชการที่ทำมานาน 27 ปี",
      "การตัดสินใจครั้งนี้ไม่ได้เกิดขึ้นเพราะความฝันเพียงอย่างเดียว แต่เกิดจากการที่ผมได้เห็นธุรกิจทำงานจริง เห็นปัญหาจริง และเห็นว่าร้านสามารถพัฒนาต่อไปได้",
      "ผมเลือกออกมาทำธุรกิจเต็มตัว เพราะต้องการใช้เวลาและประสบการณ์ทั้งหมดมาสร้างร้าน ระบบการทำงาน และระบบแฟรนไชส์ให้มีมาตรฐานมากขึ้น",
      "การลาออกจึงไม่ใช่จุดเริ่มต้นของธุรกิจ แต่เป็นผลจากการลงมือทำและเรียนรู้ต่อเนื่องมาแล้วหลายปี",
    ],
    photo: founderPhotos.afterResignation,
  },
  {
    eyebrow: "Section 5: สิ่งที่ต้องการถ่ายทอด",
    title: "สิ่งที่ผมถ่ายทอด ไม่ได้มีแค่สูตรไก่ทอด",
    paragraphs: [
      "สิ่งที่ผมต้องการถ่ายทอดให้กับผู้ที่สนใจเปิดร้าน ไม่ได้มีเพียงสูตรอาหาร",
      "แต่รวมถึงการคิดต้นทุน การเลือกทำเล การจัดอุปกรณ์ การเตรียมสินค้า การจัดพนักงาน การควบคุมคุณภาพ การบริการลูกค้า และการทำให้ร้านสามารถทำงานตามระบบ",
      "ผมเชื่อว่าการเปิดร้านไม่ใช่เพียงการซื้ออุปกรณ์หรือเรียนสูตรแล้วจะสำเร็จ ทุกคนต้องพิจารณาความพร้อมของตัวเอง ทั้งเรื่องทุน ทำเล เวลา ความตั้งใจ และความสามารถในการทำตามระบบ",
      "แฟรนไชส์จึงไม่ใช่สิ่งที่ยืนยันผลลัพธ์แทนผู้ลงมือทำ แต่เป็นการลดการลองผิดลองถูกด้วยสูตร ประสบการณ์ และระบบที่ผ่านการใช้งานจริง",
    ],
  },
  {
    eyebrow: "Section 6: ปิดท้ายเรื่องราว",
    title: "จากร้านเล็ก ๆ สู่การสร้างระบบที่คนอื่นสามารถนำไปใช้ได้",
    paragraphs: [
      "จากวันที่เหลือเงินติดตัวเพียง 4,000 บาท ผมไม่เคยคิดว่าร้านไก่ทอดเล็ก ๆ จะกลายเป็นธุรกิจที่ทำให้ผมตัดสินใจเปลี่ยนเส้นทางชีวิตหลังรับราชการมานาน 27 ปี",
      "แต่สิ่งที่เกิดขึ้นไม่ได้มาจากโชคหรือสูตรลับเพียงอย่างเดียว",
      "มันเกิดจากการลงมือขายจริง การยอมรับข้อผิดพลาด การพัฒนาระบบ การควบคุมต้นทุน และการทำงานต่อเนื่องทุกวัน",
      "วันนี้สิ่งที่ผมต้องการสร้าง ไม่ใช่เพียงร้านไก่ทอดของตัวเอง แต่คือระบบที่ช่วยให้คนที่เหมาะสม มีความพร้อม และตั้งใจจริง สามารถนำไปเริ่มต้นธุรกิจของตัวเองได้อย่างมีทิศทางมากขึ้น",
    ],
  },
];

export function FounderPhotoCard({ photo, priority = false, altOverride, fullBleed = false }: { photo: FounderPhoto; priority?: boolean; altOverride?: string; fullBleed?: boolean }) {
  return (
    <figure className={`overflow-hidden rounded-[2rem] border border-[#eadfca] bg-white shadow-xl shadow-black/8 ${fullBleed ? "p-2 sm:p-3" : "p-3"}`}>
      <div className={fullBleed ? "w-full overflow-hidden rounded-[1.5rem] bg-white" : "relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-[#fff1df] sm:aspect-[3/2]"}>
        {photo.src ? (
          fullBleed ? (
            <Image src={photo.src} alt={altOverride ?? photo.alt} width={1122} height={1402} sizes="(min-width: 1024px) 42vw, 100vw" priority={priority} className="block h-auto w-full object-contain" />
          ) : (
            <Image src={photo.src} alt={altOverride ?? photo.alt} fill sizes="(min-width: 1024px) 42vw, 100vw" priority={priority} className="object-contain" />
          )
        ) : (
          <div className="flex h-full min-h-[20rem] w-full items-center justify-center p-6 text-center">
            <div>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1f1f1f] text-2xl font-black text-[#f6c400]">รูป</div>
              <p className="mt-4 text-xl font-black text-[#151515]">{photo.placeholder}</p>
              <p className="mt-2 text-sm font-bold leading-6 text-[#666666]">รอใส่รูปจริง โดยไม่ใช้รูปตัวอย่างจากภายนอก</p>
            </div>
          </div>
        )}
      </div>
      <figcaption className="px-2 pb-1 pt-4 text-sm font-bold leading-6 text-[#666666]">{photo.caption}</figcaption>
    </figure>
  );
}

export function FounderStoryPreview() {
  return (
    <section id="founder-story-preview" className="mx-auto w-full max-w-7xl scroll-mt-28 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="grid gap-6 rounded-[2.5rem] border border-[#eadfca] bg-white p-5 shadow-2xl shadow-black/8 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
        <article>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f47b00]">Founder Story</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#151515] sm:text-5xl">จากเงินติดตัว 4,000 บาท สู่การลาออกจากราชการที่ทำมา 27 ปี</h2>
          <div className="mt-6 grid gap-4 text-base font-bold leading-8 text-[#666666] sm:text-lg">{storyParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          <Link href="/founder-story" className="mt-7 inline-flex min-h-14 items-center justify-center rounded-xl bg-[#d71920] px-7 py-4 text-base font-black text-white shadow-xl shadow-[#d71920]/25 transition hover:-translate-y-0.5 hover:bg-[#b9151b] focus-ring">อ่านเรื่องราวของผู้ก่อตั้ง</Link>
        </article>
        <FounderPhotoCard photo={founderPhotos.firstShop} priority />
      </div>
    </section>
  );
}

function FounderThumbnailGallery() {
  return (
    <div className="mt-5 rounded-[1.75rem] border border-[#eadfca] bg-white p-3 shadow-xl shadow-black/5 sm:p-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {governmentServiceGalleryItems.map((item) => (
          <figure key={item.placeholder} className="overflow-hidden rounded-[1.5rem] border border-[#eadfca] bg-white p-2 shadow-lg shadow-black/10">
            <div className="relative flex min-h-[16rem] items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#fff8ed] p-3 text-center sm:min-h-[22rem]">
              {item.src ? (
                <Image src={item.src} alt={item.alt} fill sizes="(min-width: 640px) 42vw, 46vw" className="object-contain" />
              ) : (
                <div>
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f1f1f] text-sm font-black text-[#f6c400]">รูป</div>
                  <p className="mt-3 text-sm font-black leading-5 text-[#151515] sm:text-base">{item.placeholder}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-[#666666]">รอใส่รูปจริง</p>
                </div>
              )}
            </div>
            <figcaption className="px-1 pt-2 text-center text-xs font-bold leading-5 text-[#666666]">{item.caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function FounderStorySection({ section, index }: { section: (typeof founderSections)[number]; index: number }) {
  return (
    <section className="scroll-mt-28 rounded-[2rem] border border-[#eadfca] bg-white p-5 shadow-xl shadow-black/5 sm:p-8">
      <div className={`grid gap-7 ${section.photo ? "lg:grid-cols-[1fr_0.82fr] lg:items-start" : ""}`}>
        <article>
          <p className="text-sm font-black text-[#f47b00]">{section.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#151515] sm:text-4xl">{section.title}</h2>
          <div className="mt-5 grid gap-4 text-base font-bold leading-8 text-[#666666] sm:text-lg">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        </article>
        {section.photo ? (
          <div>
            <FounderPhotoCard photo={section.photo} fullBleed={index === 2} />
            {index === 2 ? <FounderThumbnailGallery /> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function FounderStoryCTA() {
  return (
    <section className="rounded-[2.5rem] bg-[#1f1f1f] p-6 text-center text-white shadow-2xl shadow-black/20 sm:p-10">
      <h2 className="text-3xl font-black sm:text-5xl">สนใจเริ่มต้นด้วยระบบที่ผ่านการใช้งานจริง</h2>
      <p className="mx-auto mt-4 max-w-3xl font-bold leading-8 text-white/70">ศึกษารายละเอียดแพ็กเกจแฟรนไชส์ หรือสอบถามข้อมูลเพิ่มเติมกับช่องทางติดต่อเดิมของเว็บไซต์</p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/#franchise-packages" className="inline-flex min-h-14 items-center justify-center rounded-xl bg-[#d71920] px-7 py-4 text-base font-black text-white shadow-xl shadow-[#d71920]/25 transition hover:-translate-y-0.5 hover:bg-[#b9151b] focus-ring">ดูแพ็กเกจแฟรนไชส์</Link>
        <Link href="/#footer-contact" className="inline-flex min-h-14 items-center justify-center rounded-xl bg-white px-7 py-4 text-base font-black text-[#1f1f1f] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#fff1df] focus-ring">สอบถามข้อมูลเพิ่มเติม</Link>
      </div>
    </section>
  );
}

export function FounderTimeline() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {["เริ่มด้วยเงินติดตัว 4,000 บาท", "ขายและพัฒนาระบบต่อเนื่อง 5 ปี", "นำประสบการณ์ราชการ 27 ปีมาสร้างระบบ"].map((item, index) => (
        <div key={item} className="rounded-[1.5rem] border border-[#eadfca] bg-white p-5 shadow-lg shadow-black/5"><div className="text-3xl font-black text-[#d71920]">0{index + 1}</div><p className="mt-2 font-black leading-7 text-[#151515]">{item}</p></div>
      ))}
    </div>
  );
}

export { founderSections };
