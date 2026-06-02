export type UserRole = "owner" | "staff";

export type Branch = {
  id: string;
  name: string;
  code: string;
  low_chicken_threshold: number;
  low_sticky_rice_threshold: number;
  low_oil_threshold: number;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  branch_name: string | null;
  branch?: Branch | null;
};

export type DailyReport = {
  id: string;
  report_date: string;
  branch_id: string;
  branch_name: string;
  cash_sales: number;
  transfer_sales: number;
  total_sales: number;
  received_chicken: number;
  received_rice: number;
  received_oil: number;
  received_sugar: number;
  received_sticky_rice: number;
  received_other_items: { name: string; amount: number }[] | null;
  used_bl: number;
  used_bb: number;
  used_chicken_skin: number;
  used_oil: number;
  used_sticky_rice: number;
  used_chopped_chicken: number;
  used_drumstick: number;
  remaining_chicken: number;
  remaining_sticky_rice: number;
  remaining_oil: number;
  order_original_chicken: number;
  order_spicy_chicken: number;
  order_offal: number;
  order_chopped_chicken: number;
  order_drumstick: number;
  order_chicken_skin: number;
  order_sticky_rice: number;
  order_oil: number;
  order_palm_sugar: number;
  order_other_items: { name: string; amount: number }[] | null;
  requested_items: string;
  note: string;
  submitted_by: string | null;
  updated_at: string;
  branches?: Pick<Branch, "name" | "code" | "low_chicken_threshold" | "low_sticky_rice_threshold" | "low_oil_threshold"> | null;
};

export type DashboardSummary = {
  branchCount: number;
  todaySales: number;
  cashSales: number;
  transferSales: number;
  lowStockCount: number;
};

export type ReportTotals = {
  cash_sales: number;
  transfer_sales: number;
  total_sales: number;
  received_chicken: number;
  received_rice: number;
  received_oil: number;
  received_sugar: number;
  received_sticky_rice: number;
  used_bl: number;
  used_bb: number;
  used_chicken_skin: number;
  used_oil: number;
  used_sticky_rice: number;
  used_chopped_chicken: number;
  used_drumstick: number;
  order_original_chicken: number;
  order_spicy_chicken: number;
  order_offal: number;
  order_chopped_chicken: number;
  order_drumstick: number;
  order_chicken_skin: number;
  order_sticky_rice: number;
  order_oil: number;
  order_palm_sugar: number;
  branch_count: number;
  report_count: number;
};
