import thaiAddressData from "../data/thai-address.json" with { type: "json" };

const thaiProvinces = Object.keys(thaiAddressData);
const getThaiDistricts = (province) => Object.keys(thaiAddressData[province] ?? {});
const getThaiSubdistricts = (province, district) => thaiAddressData[province]?.[district] ?? [];
const thaiAddressDatasetMeta = {
  source: "@riz007/thai-address-data 0.1.4, derived from thailand-geography-json",
  version: "0.1.4",
  sourceDate: "2026-01-25",
};

const failures = [];
const seenDistrictIds = new Set();
const seenSubdistrictIds = new Set();
let districtCount = 0;
let subdistrictCount = 0;

for (const province of thaiProvinces) {
  if (!province.trim()) failures.push({ type: "blank-province", province });
  const districts = getThaiDistricts(province);
  if (districts.length === 0) failures.push({ type: "province-without-district", province });
  for (const district of districts) {
    districtCount += 1;
    const districtId = `${province}|${district}`;
    if (!district.trim()) failures.push({ type: "blank-district", province, district });
    if (seenDistrictIds.has(districtId)) failures.push({ type: "duplicate-district-id", districtId });
    seenDistrictIds.add(districtId);
    const subdistricts = getThaiSubdistricts(province, district);
    if (subdistricts.length === 0) failures.push({ type: "district-without-subdistrict", province, district });
    if (province === "กรุงเทพมหานคร" && !district.startsWith("เขต")) failures.push({ type: "bangkok-district-label", district });
    if (province !== "กรุงเทพมหานคร" && district.startsWith("เขต")) failures.push({ type: "non-bangkok-district-label", province, district });
    for (const subdistrict of subdistricts) {
      subdistrictCount += 1;
      const subdistrictId = `${province}|${district}|${subdistrict}`;
      if (!subdistrict.trim()) failures.push({ type: "blank-subdistrict", province, district, subdistrict });
      if (seenSubdistrictIds.has(subdistrictId)) failures.push({ type: "duplicate-subdistrict-id", subdistrictId });
      seenSubdistrictIds.add(subdistrictId);
      if (!seenDistrictIds.has(districtId)) failures.push({ type: "orphan-subdistrict", subdistrictId });
    }
  }
}

const bangkokChatuchak = getThaiSubdistricts("กรุงเทพมหานคร", "เขตจตุจักร");
if (!bangkokChatuchak.includes("ลาดยาว")) failures.push({ type: "missing-bangkok-chatuchak-latyao" });
const nakhonSawanMueang = getThaiSubdistricts("นครสวรรค์", "เมืองนครสวรรค์");
if (nakhonSawanMueang.length === 0) failures.push({ type: "missing-nakhon-sawan-mueang-subdistricts" });

const report = {
  source: thaiAddressDatasetMeta.source,
  version: thaiAddressDatasetMeta.version,
  sourceDate: thaiAddressDatasetMeta.sourceDate,
  provinces: thaiProvinces.length,
  districtsIncludingBangkokKhets: districtCount,
  subdistrictsIncludingBangkokKhwaengs: subdistrictCount,
  incomplete: failures.filter((failure) => String(failure.type).includes("without")),
  duplicatesOrOrphans: failures.filter((failure) => String(failure.type).includes("duplicate") || String(failure.type).includes("orphan")),
  failures,
};

if (thaiProvinces.length !== 77) failures.push({ type: "unexpected-province-count", actual: thaiProvinces.length, expected: 77 });
if (districtCount !== 928) failures.push({ type: "unexpected-district-count", actual: districtCount, expected: 928 });
if (subdistrictCount !== 7436) failures.push({ type: "unexpected-subdistrict-count", actual: subdistrictCount, expected: 7436 });

if (failures.length > 0) {
  console.error("Thai address dataset audit failed", JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log("Thai address dataset audit passed", JSON.stringify(report, null, 2));
