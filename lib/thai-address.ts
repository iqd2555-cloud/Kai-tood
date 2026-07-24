import thaiAddressData from "../data/thai-address.json";

type ThaiAddressTree = Record<string, Record<string, string[]>>;

const thaiAddressTree = thaiAddressData as ThaiAddressTree;

export const thaiProvinces = Object.keys(thaiAddressTree).sort((a, b) => a.localeCompare(b, "th"));
export const thaiAddress = Object.fromEntries(
  thaiProvinces.map((province) => [province, Object.keys(thaiAddressTree[province])]),
) as Record<string, string[]>;

export const thaiAddressDatasetMeta = {
  source: "@riz007/thai-address-data 0.1.4, derived from thailand-geography-json",
  version: "0.1.4",
  sourceDate: "2026-01-25",
} as const;

export const provincesWithIncompleteDistricts = thaiProvinces.filter(
  (province) => (thaiAddress[province] ?? []).length === 0,
);

export function getThaiDistricts(province: string) {
  return (thaiAddress[province] ?? []).slice().sort((a, b) => a.localeCompare(b, "th"));
}

export function getThaiSubdistricts(province: string, district: string) {
  return thaiAddressTree[province]?.[district] ?? [];
}
