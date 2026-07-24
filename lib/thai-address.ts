import thaiAddressData from "../data/thai-address.json" with { type: "json" };

type ThaiAddressTree = Record<string, Record<string, string[]>>;

const thaiAddress = thaiAddressData as ThaiAddressTree;

export const thaiProvinces = Object.keys(thaiAddress).sort((a, b) => a.localeCompare(b, "th"));

export const thaiAddressDatasetMeta = {
  source: "@riz007/thai-address-data 0.1.4, derived from thailand-geography-json",
  version: "0.1.4",
  sourceDate: "2026-01-25",
} as const;

export const provincesWithIncompleteDistricts = thaiProvinces.filter(
  (province) => Object.keys(thaiAddress[province] ?? {}).length === 0,
);

export function getThaiDistricts(province: string) {
  return Object.keys(thaiAddress[province] ?? {}).sort((a, b) => a.localeCompare(b, "th"));
}

export function getThaiSubdistricts(province: string, district: string) {
  return thaiAddress[province]?.[district] ?? [];
}
