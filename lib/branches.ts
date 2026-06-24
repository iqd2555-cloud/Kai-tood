export const EXCLUDED_BRANCH_NAMES = ["สาขาหลัก"];
export const EXCLUDED_BRANCH_CODES = ["MAIN", "DEFAULT", "MAIN_BRANCH"];

type ReportableBranch = {
  name?: string | null;
  code?: string | null;
  is_active?: boolean | null;
};

function normalizeBranchText(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? "";
}

export function isReportableBranch(branch: ReportableBranch | null | undefined) {
  if (!branch) return false;
  if (branch.is_active === false) return false;

  const normalizedName = normalizeBranchText(branch.name);
  const normalizedCode = normalizeBranchText(branch.code);

  return !EXCLUDED_BRANCH_NAMES.some((name) => normalizeBranchText(name) === normalizedName) && !EXCLUDED_BRANCH_CODES.includes(normalizedCode);
}
