export type UserRole = "owner" | "staff";

export type Branch = {
  id: string;
  name: string;
  code: string;
  low_chicken_threshold: number;
  low_sticky_rice_threshold: number;
  low_oil_threshold: number;
  is_active?: boolean | null;
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
  opening_original_chicken: number;
  opening_spicy_chicken: number;
  opening_ground_chicken: number;
  opening_drumstick: number;
  opening_offal: number;
  opening_chicken_skin: number;
  opening_sticky_rice: number;
  opening_oil: number;
  received_original_chicken: number;
  received_spicy_chicken: number;
  received_ground_chicken: number;
  received_drumstick: number;
  received_offal: number;
  received_chicken_skin: number;
  received_chicken: number;
  received_sticky_rice: number;
  received_oil: number;
  used_bl: number;
  used_bb: number;
  used_chicken_skin: number;
  used_oil: number;
  used_sticky_rice: number;
  used_chopped_chicken: number;
  used_drumstick: number;
  used_offal: number;
  remaining_chicken: number;
  remaining_original_chicken: number;
  remaining_spicy_chicken: number;
  remaining_ground_chicken: number;
  remaining_drumstick: number;
  remaining_offal: number;
  remaining_chicken_skin: number;
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
  opening_original_chicken: number;
  opening_spicy_chicken: number;
  opening_ground_chicken: number;
  opening_drumstick: number;
  opening_offal: number;
  opening_chicken_skin: number;
  opening_sticky_rice: number;
  opening_oil: number;
  received_original_chicken: number;
  received_spicy_chicken: number;
  received_ground_chicken: number;
  received_drumstick: number;
  received_offal: number;
  received_chicken_skin: number;
  received_chicken: number;
  received_sticky_rice: number;
  received_oil: number;
  used_bl: number;
  used_bb: number;
  used_chicken_skin: number;
  used_oil: number;
  used_sticky_rice: number;
  used_chopped_chicken: number;
  used_drumstick: number;
  used_offal: number;
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

export type CounterPriceItem = {
  id: string;
  item_name: string;
  price: number;
  status: "active" | "inactive";
  created_at: string;
};

export type CounterOrderStatus = "success" | "cancelled";
export type CounterPrintStatus = "pending" | "printed" | "reprinted";

export type CounterOrderItem = {
  id: string;
  order_id: string;
  item_name: string;
  price: number;
  quantity: number;
  line_total: number;
};

export type CounterCancellation = {
  id: string;
  order_id: string;
  cancelled_by: string;
  cancelled_at: string;
  reason: string;
  original_total: number;
  profiles?: Pick<Profile, "full_name" | "role"> | null;
};

export type CounterOrder = {
  id: string;
  order_number: string;
  branch_id: string;
  user_id: string;
  order_date: string;
  order_time: string;
  status: CounterOrderStatus;
  total_amount: number;
  print_status: CounterPrintStatus;
  created_at: string;
  updated_at: string;
  branches?: Pick<Branch, "name" | "code"> | null;
  profiles?: Pick<Profile, "full_name" | "role"> | null;
  counter_order_items?: CounterOrderItem[] | null;
  counter_cancellations?: CounterCancellation[] | null;
};


export type LeadStatus = "new" | "contacted" | "awaiting_info" | "interested" | "appointment_scheduled" | "not_ready" | "not_qualified" | "converted";

export type FranchiseLead = {
  id: string;
  full_name: string;
  phone: string;
  line_id: string | null;
  province: string;
  district: string | null;
  has_capital: string | null;
  preferred_model: string | null;
  available_area: string | null;
  experience: string | null;
  has_location: string;
  location_type: string;
  budget_range: string;
  working_capital: string;
  available_time_per_day: string;
  business_experience: string;
  expected_daily_income: string;
  understanding_confirmed: boolean;
  note: string | null;
  internal_note: string | null;
  status: LeadStatus;
  source: string;
  created_at: string;
  updated_at: string;
};
