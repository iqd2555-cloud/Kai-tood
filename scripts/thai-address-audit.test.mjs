import { thaiAddress, thaiProvinces } from "../lib/thai-address.ts";

const expectedDistrictCounts = {
  กรุงเทพมหานคร: 50,
  กระบี่: 8,
  กาญจนบุรี: 13,
  กาฬสินธุ์: 18,
  กำแพงเพชร: 11,
  ขอนแก่น: 26,
  จันทบุรี: 10,
  ฉะเชิงเทรา: 11,
  ชลบุรี: 11,
  ชัยนาท: 8,
  ชัยภูมิ: 16,
  ชุมพร: 8,
  เชียงราย: 18,
  เชียงใหม่: 25,
  ตรัง: 10,
  ตราด: 7,
  ตาก: 9,
  นครนายก: 4,
  นครปฐม: 7,
  นครพนม: 12,
  นครราชสีมา: 32,
  นครศรีธรรมราช: 23,
  นครสวรรค์: 15,
  นนทบุรี: 6,
  นราธิวาส: 13,
  น่าน: 15,
  บึงกาฬ: 8,
  บุรีรัมย์: 23,
  ปทุมธานี: 7,
  ประจวบคีรีขันธ์: 8,
  ปราจีนบุรี: 7,
  ปัตตานี: 12,
  พระนครศรีอยุธยา: 16,
  พะเยา: 9,
  พังงา: 8,
  พัทลุง: 11,
  พิจิตร: 12,
  พิษณุโลก: 9,
  เพชรบุรี: 8,
  เพชรบูรณ์: 11,
  แพร่: 8,
  ภูเก็ต: 3,
  มหาสารคาม: 13,
  มุกดาหาร: 7,
  แม่ฮ่องสอน: 7,
  ยโสธร: 9,
  ยะลา: 8,
  ร้อยเอ็ด: 20,
  ระนอง: 5,
  ระยอง: 8,
  ราชบุรี: 10,
  ลพบุรี: 11,
  ลำปาง: 13,
  ลำพูน: 8,
  เลย: 14,
  ศรีสะเกษ: 22,
  สกลนคร: 18,
  สงขลา: 16,
  สตูล: 7,
  สมุทรปราการ: 6,
  สมุทรสงคราม: 3,
  สมุทรสาคร: 3,
  สระแก้ว: 9,
  สระบุรี: 13,
  สิงห์บุรี: 6,
  สุโขทัย: 9,
  สุพรรณบุรี: 10,
  สุราษฎร์ธานี: 19,
  สุรินทร์: 17,
  หนองคาย: 9,
  หนองบัวลำภู: 6,
  อ่างทอง: 7,
  อำนาจเจริญ: 7,
  อุดรธานี: 20,
  อุตรดิตถ์: 9,
  อุทัยธานี: 8,
  อุบลราชธานี: 25,
};

const incompleteProvinces = thaiProvinces.filter((province) => {
  const districts = thaiAddress[province] ?? [];
  return districts.length <= 1;
});

const fallbackOnlyProvinces = thaiProvinces.filter((province) => {
  const districts = thaiAddress[province] ?? [];
  return districts.length === 1 && districts[0] === `เมือง${province}`;
});

const provincesWithUnexpectedDistrictCounts = thaiProvinces.filter((province) => {
  const expectedCount = expectedDistrictCounts[province];
  return typeof expectedCount !== "number" || thaiAddress[province]?.length !== expectedCount;
});

if (incompleteProvinces.length > 0 || fallbackOnlyProvinces.length > 0 || provincesWithUnexpectedDistrictCounts.length > 0) {
  console.error("Thai address dataset audit failed", {
    incompleteProvinces,
    fallbackOnlyProvinces,
    provincesWithUnexpectedDistrictCounts: provincesWithUnexpectedDistrictCounts.map((province) => ({
      province,
      expected: expectedDistrictCounts[province],
      actual: thaiAddress[province]?.length ?? 0,
    })),
  });
  process.exit(1);
}

console.log(`Thai address dataset audit passed for ${thaiProvinces.length} provinces.`);
