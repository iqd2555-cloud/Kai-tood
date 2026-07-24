export type FranchisePackage = {
  id: string;
  slug: string;
  packageType: "mini-starter" | "standard-counter" | "standalone";
  title: string;
  price: string;
  image: string;
  imageAlt: string;
  badge: string;
  area: string;
  location: string;
  tone: string;
  suitableFor: string;
  highlights: string[];
  applyHref: string;
  applyLabel: string;
};

export const franchisePackages: FranchisePackage[] = [
  {
    id: "mini-starter-9900",
    slug: "mini-starter",
    packageType: "mini-starter",
    badge: "Mini Starter",
    title: "MINI STARTER",
    price: "9,900 บาท",
    image: "/mini-starter-counter.png",
    imageAlt: "เคาน์เตอร์แฟรนไชส์เหนียวไก่เยอะโคตร MINI STARTER",
    area: "เริ่มเล็กสำหรับทดลองทำเล ต้องตรวจสอบพื้นที่ก่อนอนุมัติ",
    location: "เหมาะกับผู้ที่มีทำเลขนาดเล็ก ต้องการเริ่มขายด้วยเคาน์เตอร์ Mini พร้อมป้ายแบรนด์ และยอมรับว่าไม่มีสิทธิ์ผูกขาดพื้นที่",
    tone: "เริ่มต้นเล็ก ทดลองทำเล",
    suitableFor: "ผู้เริ่มต้นที่ต้องการคอร์สออนไลน์ สิทธิ์ซื้อไก่หมักพร้อมทอด 75 บาท/กก. และเข้าใจว่า 9,900 บาทไม่รวมอุปกรณ์ทั้งหมด",
    highlights: ["เคาน์เตอร์ Mini พร้อมป้ายแบรนด์", "ถาดไก่ 10 ใบ + ทัพพี + ถ้วยตวง + เครื่องชั่งดิจิทัล", "สั่งครบ 45 กก. จัดส่งฟรี"],
    applyHref: "/apply-mini",
    applyLabel: "ดูรายละเอียดและสมัคร MINI STARTER",
  },
  {
    id: "standard-counter-55000",
    slug: "standard-counter",
    packageType: "standard-counter",
    badge: "Starter Pack",
    title: "รูปแบบเคาน์เตอร์",
    price: "55,000 บาท",
    image: "/new-kiosk.png",
    imageAlt: "แฟรนไชส์รูปแบบเคาน์เตอร์ 55,000 บาท",
    area: "พื้นที่อย่างต่ำ 2 × 3 เมตร",
    location: "เหมาะกับพื้นที่ในอาคาร พื้นที่ที่มีหลังคา หน้าร้าน ห้องเช่า ตลาดในร่ม หรือพื้นที่หน้าบ้านที่มีหลังคาคลุม",
    tone: "เริ่มขายจริงพร้อมระบบ",
    suitableFor: "ผู้เริ่มต้นที่มีพื้นที่จำกัด แต่อยากเริ่มขายจริงแบบเป็นระบบ",
    highlights: ["ใช้พื้นที่ไม่มาก", "คุมงบเริ่มต้นง่าย", "เหมาะกับจุดขายในอาคาร"],
    applyHref: "/franchise/apply",
    applyLabel: "สมัคร / สอบถามแฟรนไชส์ชุดมาตรฐาน",
  },
  {
    id: "standalone-99000",
    slug: "standalone",
    packageType: "standalone",
    badge: "Signature Pack",
    title: "รูปแบบซุ้ม",
    price: "99,000 บาท",
    image: "/stand-alone.png",
    imageAlt: "แฟรนไชส์รูปแบบซุ้ม 99,000 บาท",
    area: "พื้นที่ประมาณ 3 × 3 เมตร",
    location: "เหมาะกับคนที่ต้องการหน้าร้านชัดเจน ใช้พื้นที่ประมาณ 3 × 3 เมตร ทำงานคล่องตัวขึ้น",
    tone: "เหมาะกับจุดขายจริงจัง",
    suitableFor: "ผู้ที่ต้องการหน้าร้านชัดเจนและพื้นที่ทำงานคล่องตัวขึ้น",
    highlights: ["ทำงานคล่องตัวขึ้น", "จัดวางอุปกรณ์เป็นระบบ", "สร้างภาพจำหน้าร้านชัด"],
    applyHref: "/franchise/apply",
    applyLabel: "สมัคร / สอบถามแฟรนไชส์ชุดมาตรฐาน",
  },
];

export const miniStarterPackage = franchisePackages.find((item) => item.id === "mini-starter-9900")!;
export const standardCounterPackage = franchisePackages.find((item) => item.id === "standard-counter-55000")!;
