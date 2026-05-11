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
  branch?: Branch | null;
};

export type DailyReport = {
  id: string;
  report_date: string;
  branch_id: string;
  cash_sales: number;
  transfer_sales: number;
  total_sales: number;
  used_bl: number;
  used_bb: number;
  used_chicken_skin: number;
  used_oil: number;
  used_sticky_rice: number;
  remaining_chicken: number;
  remaining_sticky_rice: number;
  remaining_oil: number;
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
