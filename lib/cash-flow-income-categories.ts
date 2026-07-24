export type RequiredCashFlowIncomeCategory = {
  id: string;
  name: string;
  type: "income";
  code: string;
  is_active: true;
};

export const REQUIRED_CASH_FLOW_INCOME_CATEGORIES: RequiredCashFlowIncomeCategory[] = [
  { id: "builtin-sales-revenue", name: "ยอดขายหน้าร้าน", type: "income", code: "sales_revenue", is_active: true },
  { id: "builtin-marinated-chicken-sales", name: "ขายไก่หมัก", type: "income", code: "marinated_chicken_sales", is_active: true },
  { id: "builtin-recipe-book-sales", name: "ขายหนังสือ", type: "income", code: "recipe_book_sales", is_active: true },
  { id: "builtin-course-sales", name: "ขายคอร์ส", type: "income", code: "course_sales", is_active: true },
  { id: "builtin-franchise-income", name: "ขายแฟรนไชส์", type: "income", code: "franchise_income", is_active: true },
  { id: "builtin-other-income", name: "รับเงินอื่น ๆ", type: "income", code: "other_income", is_active: true },
];

export const REQUIRED_CASH_FLOW_INCOME_CODES = new Set(
  REQUIRED_CASH_FLOW_INCOME_CATEGORIES.map((category) => category.code),
);

const REPLACED_INCOME_CODES = new Set(["online_course_sales", "live_course_sales"]);

export function mergeRequiredCashFlowIncomeCategories<T extends {
  id: string;
  name: string;
  type?: string;
  code?: string | null;
  is_active?: boolean;
}>(categories: T[]) {
  const requiredCodes = REQUIRED_CASH_FLOW_INCOME_CODES;
  const retained = categories.filter((category) =>
    !REPLACED_INCOME_CODES.has(category.code ?? "")
    && !(category.type === "income" && requiredCodes.has(category.code ?? "")),
  );
  return [...retained, ...REQUIRED_CASH_FLOW_INCOME_CATEGORIES] as Array<T | RequiredCashFlowIncomeCategory>;
}
