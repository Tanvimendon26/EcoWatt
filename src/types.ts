export interface User {
  id: string;
  name: string;
  email: string;
  role?: "user" | "admin";
  consumer_id?: string;
  connection_type?: "Residential" | "Commercial" | "Industrial";
}

export interface Appliance {
  id: string;
  user_id: string;
  appliance_name: string;
  category: string;
  wattage: number;
  average_daily_hours: number;
  created_at: string;
}

export interface Usage {
  id: string;
  user_id: string;
  appliance_id: string;
  hours_used: number;
  usage_date: string;
  units: number;
  created_at: string;
  appliance_name?: string;
  category?: string;
  wattage?: number;
}

export interface Bill {
  id: string;
  user_id: string;
  month: string;
  bill_number: string;
  total_units: number;
  tariff_rate: number;
  energy_charges: number;
  fixed_charges: number;
  electricity_duty: number;
  due_date: string;
  payment_date?: string;
  payment_status: "Pending" | "Paid" | "Overdue" | "Unpaid"; // support backward compatibility
  late_fee: number;
  final_amount: number;
  generated_at: string;
  // added for admin display
  consumer_name?: string;
  consumer_email?: string;
  consumer_id?: string;
}

export interface DashboardMetrics {
  totalAppliances: number;
  todayConsumption: number;
  monthlyConsumption: number;
  estimatedMonthlyBill: number;
  efficiencyScore: number;
  usingEstimates?: boolean;
  totalDailyEstimatedConsumption?: number;
  totalMonthlyEstimatedConsumption?: number;
  estimatedMonthlyBillFromAppliances?: number;
  
  // advanced metrics
  consumer_id?: string;
  currentBillingCycle?: string;
  pendingAmount?: number;
  dueDate?: string;
  carbonFootprint?: number;
}

export interface SmartInsights {
  highestConsumingAppliance: string;
  usageChangePercent: number;
  recommendations: string[];
}

export interface CarbonMetrics {
  totalUnits: number;
  carbonEmission: number;
  treesRequired: number;
  carMilesOffset: number;
}

export interface ProfileMetrics {
  name: string;
  email: string;
  totalAppliances: number;
  averageDailyUsage: number;
  estimatedMonthlyConsumption?: number;
  estimatedMonthlyBill?: number;
  estimatedSavings: number;
  efficiencyScore: number;
}

export interface AdminMetrics {
  totalConsumers: number;
  totalAppliances: number;
  totalRevenue: number;
  totalBillsGenerated: number;
  pendingBills: number;
  pendingBillsCount?: number;
  overdueBills: number;
  overdueBillsCount?: number;
  totalUnitsConsumed: number;
  pendingCollections: number;
  pendingCollectionsAmount?: number;
  overdueCollections: number;
  overdueCollectionsAmount?: number;
  revenueByMonth?: { month: string; revenue: number; units: number }[];
  revenueChart: { month: string; Revenue: number }[];
  unitsChart: { month: string; Units: number }[];
  topConsumers: { name: string; email: string; consumer_id: string; units: number; paid: number; total_units?: number; amount_spent?: number }[];
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  bill_id: string;
  amount: number;
  payment_date: string;
  consumer_name: string;
  consumer_id: string;
  bill_number: string;
  authorized_by?: string;
  transaction_status?: string;
}

