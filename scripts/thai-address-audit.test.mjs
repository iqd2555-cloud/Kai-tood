import { thaiAddress, thaiDistrictDatasetSummary, thaiProvinces } from "../lib/thai-address.ts";

const expectedDistrictCounts = {
  กรุงเทพมหานคร: 50,
  กระบี่: 8,
  กาญจนบุรี: 13,
  กำแพงเพชร: 11,
  ขอนแก่น: 26,
};

const incompleteProvinces = thaiProvinces.filter((province) => {
  const districts = thaiAddress[province] ?? [];
  return districts.length <= 1;
});

const fallbackOnlyProvinces = thaiProvinces.filter((province) => {
  const districts = thaiAddress[province] ?? [];
  return districts.length === 1 && districts[0] === `เมือง${province}`;
});

const missingProvinceData = thaiProvinces.filter((province) => !Array.isArray(thaiAddress[province]));
const provinceCountMismatch = thaiDistrictDatasetSummary.provinceCount !== 77;
const districtCountMismatch = thaiDistrictDatasetSummary.districtCount !== 928;
const sampleCountMismatches = Object.entries(expectedDistrictCounts).filter(([province, expectedCount]) => {
  return thaiAddress[province]?.length !== expectedCount;
});

if (
  missingProvinceData.length > 0
  || incompleteProvinces.length > 0
  || fallbackOnlyProvinces.length > 0
  || provinceCountMismatch
  || districtCountMismatch
  || sampleCountMismatches.length > 0
) {
  console.error("Thai address dataset audit failed", {
    missingProvinceData,
    incompleteProvinces,
    fallbackOnlyProvinces,
    provinceCount: thaiDistrictDatasetSummary.provinceCount,
    expectedProvinceCount: 77,
    districtCount: thaiDistrictDatasetSummary.districtCount,
    expectedDistrictCount: 928,
    sampleCountMismatches,
  });
  process.exit(1);
}

console.log(
  `Thai address dataset audit passed for ${thaiDistrictDatasetSummary.provinceCount} provinces and ${thaiDistrictDatasetSummary.districtCount} districts.`,
);
