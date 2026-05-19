export type NavItem = {
  title: string;
  href: string;
  icon: string;
};

export type KpiMetric = {
  id: string;
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  trend: "up" | "down" | "neutral";
};

export type ChartDataPoint = {
  name: string;
  value?: number;
  [key: string]: string | number | undefined;
};

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  value: number;
};

export type MonthlySummary = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  customers: number;
};

// Uploads
export type UploadFileStatus = "completed" | "processing" | "failed" | "queued";
export type UploadFileType = "csv" | "xlsx";

export type UploadHistoryItem = {
  id: string;
  fileName: string;
  fileType: UploadFileType;
  size: string;
  uploadedAt: string;
  status: UploadFileStatus;
  progress?: number;
  records?: number;
};

export type SupportedUploadFormat = {
  type: UploadFileType;
  label: string;
  description: string;
  extensions: string;
};

// Insights
export type InsightCategory =
  | "revenue"
  | "expense"
  | "inventory"
  | "customer"
  | "anomaly";

export type InsightPriority = "high" | "medium" | "low";

export type Insight = {
  id: string;
  title: string;
  description: string;
  category: InsightCategory;
  priority: InsightPriority;
  metric?: string;
  change?: number;
  createdAt: string;
};

export type Recommendation = {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: InsightCategory;
};

// Forecast
export type ForecastSummary = {
  id: string;
  label: string;
  value: string;
  change: number;
  period: string;
};

// Assistant
export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
};

export type PromptSuggestion = {
  id: string;
  text: string;
};

// Reports
export type ReportStatus = "ready" | "generating" | "scheduled";
export type ReportType = "sales" | "expense" | "inventory" | "customer";

export type Report = {
  id: string;
  title: string;
  description: string;
  type: ReportType;
  status: ReportStatus;
  generatedAt?: string;
  period: string;
  fileSize?: string;
};

// Settings
export type UserProfile = {
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
};

export type BusinessInfo = {
  companyName: string;
  industry: string;
  employees: string;
  currency: string;
  timezone: string;
};

export type NotificationSetting = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

export type BillingPlan = {
  name: string;
  price: string;
  period: string;
  features: string[];
  isCurrent: boolean;
};
