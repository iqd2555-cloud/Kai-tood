import { thaiAddress, thaiProvinces } from "../lib/thai-address.ts";

const incompleteProvinces = thaiProvinces.filter((province) => {
  const districts = thaiAddress[province] ?? [];
  return districts.length <= 1;
});

const fallbackOnlyProvinces = thaiProvinces.filter((province) => {
  const districts = thaiAddress[province] ?? [];
  return districts.length === 1 && districts[0] === `เมือง${province}`;
});

if (incompleteProvinces.length > 0 || fallbackOnlyProvinces.length > 0) {
  console.error("Thai address dataset audit failed", {
    incompleteProvinces,
    fallbackOnlyProvinces,
  });
  process.exit(1);
}

console.log(`Thai address dataset audit passed for ${thaiProvinces.length} provinces.`);
