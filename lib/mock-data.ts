import type {
  BillingPlan,
  BusinessInfo,
  ChartDataPoint,
  ChatMessage,
  ForecastSummary,
  Insight,
  InventoryItem,
  KpiMetric,
  MonthlySummary,
  NavItem,
  NotificationSetting,
  PromptSuggestion,
  Recommendation,
  Report,
  SupportedUploadFormat,
  UploadHistoryItem,
  UserProfile,
} from "@/types";

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { title: "Uploads", href: "/uploads", icon: "Upload" },
  { title: "Insights", href: "/insights", icon: "Lightbulb" },
  { title: "Forecast", href: "/forecast", icon: "TrendingUp" },
  { title: "Assistant", href: "/assistant", icon: "Bot" },
  { title: "Reports", href: "/reports", icon: "FileText" },
  { title: "Settings", href: "/settings", icon: "Settings" },
];

export const kpiMetrics: KpiMetric[] = [
  {
    id: "revenue",
    label: "Total Revenue",
    value: "$284,520",
    change: 12.4,
    changeLabel: "vs last month",
    trend: "up",
  },
  {
    id: "profit",
    label: "Net Profit",
    value: "$48,230",
    change: 8.2,
    changeLabel: "vs last month",
    trend: "up",
  },
  {
    id: "customers",
    label: "Active Customers",
    value: "1,248",
    change: 5.6,
    changeLabel: "vs last month",
    trend: "up",
  },
  {
    id: "orders",
    label: "Orders",
    value: "3,842",
    change: -2.1,
    changeLabel: "vs last month",
    trend: "down",
  },
];

export const revenueChartData: ChartDataPoint[] = [
  { name: "Jan", value: 42000, revenue: 42000 },
  { name: "Feb", value: 38000, revenue: 38000 },
  { name: "Mar", value: 51000, revenue: 51000 },
  { name: "Apr", value: 47000, revenue: 47000 },
  { name: "May", value: 55000, revenue: 55000 },
  { name: "Jun", value: 62000, revenue: 62000 },
  { name: "Jul", value: 58000, revenue: 58000 },
  { name: "Aug", value: 67000, revenue: 67000 },
  { name: "Sep", value: 72000, revenue: 72000 },
  { name: "Oct", value: 69000, revenue: 69000 },
  { name: "Nov", value: 78000, revenue: 78000 },
  { name: "Dec", value: 84000, revenue: 84000 },
];

export const profitLossChartData: ChartDataPoint[] = [
  { name: "Jan", profit: 8200, loss: 1200 },
  { name: "Feb", profit: 7100, loss: 900 },
  { name: "Mar", profit: 9800, loss: 1100 },
  { name: "Apr", profit: 8900, loss: 1400 },
  { name: "May", profit: 11200, loss: 800 },
  { name: "Jun", profit: 12400, loss: 600 },
  { name: "Jul", profit: 10800, loss: 950 },
  { name: "Aug", profit: 13100, loss: 700 },
  { name: "Sep", profit: 14200, loss: 550 },
  { name: "Oct", profit: 12800, loss: 820 },
  { name: "Nov", profit: 15100, loss: 480 },
  { name: "Dec", profit: 16800, loss: 420 },
];

export const customerGrowthChartData: ChartDataPoint[] = [
  { name: "Jan", customers: 820, newCustomers: 64 },
  { name: "Feb", customers: 890, newCustomers: 70 },
  { name: "Mar", customers: 960, newCustomers: 78 },
  { name: "Apr", customers: 1020, newCustomers: 72 },
  { name: "May", customers: 1085, newCustomers: 85 },
  { name: "Jun", customers: 1148, newCustomers: 92 },
  { name: "Jul", customers: 1188, newCustomers: 68 },
  { name: "Aug", customers: 1210, newCustomers: 74 },
  { name: "Sep", customers: 1228, newCustomers: 58 },
  { name: "Oct", customers: 1238, newCustomers: 52 },
  { name: "Nov", customers: 1244, newCustomers: 48 },
  { name: "Dec", customers: 1248, newCustomers: 44 },
];

export const inventoryItems: InventoryItem[] = [
  {
    id: "1",
    name: "Premium Widget A",
    sku: "WDG-001",
    quantity: 342,
    status: "in_stock",
    value: 24500,
  },
  {
    id: "2",
    name: "Standard Component B",
    sku: "CMP-042",
    quantity: 28,
    status: "low_stock",
    value: 4200,
  },
  {
    id: "3",
    name: "Enterprise Kit C",
    sku: "KIT-108",
    quantity: 156,
    status: "in_stock",
    value: 31200,
  },
  {
    id: "4",
    name: "Accessory Pack D",
    sku: "ACC-215",
    quantity: 0,
    status: "out_of_stock",
    value: 0,
  },
];

export const monthlySummaries: MonthlySummary[] = [
  { month: "October", revenue: 69000, expenses: 51200, profit: 17800, customers: 1238 },
  { month: "November", revenue: 78000, expenses: 54800, profit: 23200, customers: 1244 },
  { month: "December", revenue: 84000, expenses: 57100, profit: 26900, customers: 1248 },
];

// Uploads
export const supportedUploadFormats: SupportedUploadFormat[] = [
  {
    type: "csv",
    label: "CSV Files",
    description: "Comma-separated values from spreadsheets or exports",
    extensions: ".csv",
  },
  {
    type: "xlsx",
    label: "Excel Files",
    description: "Microsoft Excel workbooks with multiple sheets",
    extensions: ".xlsx, .xls",
  },
];

export const uploadHistory: UploadHistoryItem[] = [
  {
    id: "1",
    fileName: "sales_q4_2025.csv",
    fileType: "csv",
    size: "2.4 MB",
    uploadedAt: "2026-05-18T14:32:00",
    status: "completed",
    records: 12480,
  },
  {
    id: "2",
    fileName: "inventory_may.xlsx",
    fileType: "xlsx",
    size: "1.8 MB",
    uploadedAt: "2026-05-17T09:15:00",
    status: "completed",
    records: 3420,
  },
  {
    id: "3",
    fileName: "expenses_april.csv",
    fileType: "csv",
    size: "890 KB",
    uploadedAt: "2026-05-16T16:45:00",
    status: "processing",
    progress: 67,
  },
  {
    id: "4",
    fileName: "customers_2025.xlsx",
    fileType: "xlsx",
    size: "3.1 MB",
    uploadedAt: "2026-05-15T11:20:00",
    status: "failed",
  },
  {
    id: "5",
    fileName: "orders_weekly.csv",
    fileType: "csv",
    size: "1.2 MB",
    uploadedAt: "2026-05-19T08:00:00",
    status: "queued",
    progress: 0,
  },
];

// Insights
export const insights: Insight[] = [
  {
    id: "1",
    title: "Revenue dropped 14% in electronics category",
    description:
      "Electronics revenue declined from $42K to $36K month-over-month. Top underperformers: Wireless Headphones (-22%), Smart Displays (-18%).",
    category: "revenue",
    priority: "high",
    metric: "-14%",
    change: -14,
    createdAt: "2 hours ago",
  },
  {
    id: "2",
    title: "Customer retention improved 8%",
    description:
      "Repeat purchase rate increased to 34.2%. Loyalty program members show 2.3x higher lifetime value than one-time buyers.",
    category: "customer",
    priority: "medium",
    metric: "+8%",
    change: 8,
    createdAt: "5 hours ago",
  },
  {
    id: "3",
    title: "Inventory shortage predicted next month",
    description:
      "Standard Component B (SKU: CMP-042) projected to stock out by June 15 based on current sell-through rate of 12 units/day.",
    category: "inventory",
    priority: "high",
    createdAt: "1 day ago",
  },
  {
    id: "4",
    title: "Unusual spike in shipping expenses",
    description:
      "Shipping costs increased 23% vs. 3-month average. Carrier rate changes detected on 40% of recent orders.",
    category: "anomaly",
    priority: "high",
    metric: "+23%",
    change: 23,
    createdAt: "1 day ago",
  },
  {
    id: "5",
    title: "Marketing spend efficiency up 12%",
    description:
      "Cost per acquisition dropped to $28.40. Email campaigns driving 45% of new customer acquisitions this quarter.",
    category: "expense",
    priority: "low",
    metric: "+12%",
    change: 12,
    createdAt: "2 days ago",
  },
  {
    id: "6",
    title: "Q2 revenue trend above forecast",
    description:
      "Actual revenue tracking 6.2% above forecast model. Strongest growth in Enterprise segment (+18% YoY).",
    category: "revenue",
    priority: "medium",
    metric: "+6.2%",
    change: 6.2,
    createdAt: "3 days ago",
  },
];

export const recommendations: Recommendation[] = [
  {
    id: "1",
    title: "Renegotiate carrier contracts",
    description: "Switch 60% of volume to regional carrier to reduce shipping costs by an estimated $4,200/month.",
    impact: "high",
    category: "expense",
  },
  {
    id: "2",
    title: "Reorder Component B immediately",
    description: "Place emergency order for 500 units to avoid stockout. Lead time: 10 business days.",
    impact: "high",
    category: "inventory",
  },
  {
    id: "3",
    title: "Launch electronics bundle promotion",
    description: "Bundle underperforming SKUs with bestsellers to increase average order value by 15-20%.",
    impact: "medium",
    category: "revenue",
  },
  {
    id: "4",
    title: "Expand loyalty program outreach",
    description: "Target one-time buyers from last 90 days with personalized retention offers.",
    impact: "medium",
    category: "customer",
  },
];

// Forecast
export const forecastSummaries: ForecastSummary[] = [
  {
    id: "revenue",
    label: "Projected Revenue",
    value: "$312,400",
    change: 9.8,
    period: "Next quarter",
  },
  {
    id: "expenses",
    label: "Projected Expenses",
    value: "$218,600",
    change: 4.2,
    period: "Next quarter",
  },
  {
    id: "profit",
    label: "Projected Profit",
    value: "$93,800",
    change: 14.5,
    period: "Next quarter",
  },
  {
    id: "customers",
    label: "Predicted Customers",
    value: "1,420",
    change: 13.8,
    period: "Next quarter",
  },
];

export const projectedRevenueData: ChartDataPoint[] = [
  { name: "Jan", actual: 42000, projected: 42000 },
  { name: "Feb", actual: 38000, projected: 38000 },
  { name: "Mar", actual: 51000, projected: 51000 },
  { name: "Apr", actual: 47000, projected: 47000 },
  { name: "May", actual: 55000, projected: 55000 },
  { name: "Jun", actual: 62000, projected: 62000 },
  { name: "Jul", projected: 68000 },
  { name: "Aug", projected: 72000 },
  { name: "Sep", projected: 76000 },
];

export const projectedExpenseData: ChartDataPoint[] = [
  { name: "Jan", actual: 31000, projected: 31000 },
  { name: "Feb", actual: 29500, projected: 29500 },
  { name: "Mar", actual: 34000, projected: 34000 },
  { name: "Apr", actual: 32500, projected: 32500 },
  { name: "May", actual: 36000, projected: 36000 },
  { name: "Jun", actual: 38500, projected: 38500 },
  { name: "Jul", projected: 41000 },
  { name: "Aug", projected: 42500 },
  { name: "Sep", projected: 44000 },
];

export const predictedCustomerData: ChartDataPoint[] = [
  { name: "Jan", actual: 820, projected: 820 },
  { name: "Feb", actual: 890, projected: 890 },
  { name: "Mar", actual: 960, projected: 960 },
  { name: "Apr", actual: 1020, projected: 1020 },
  { name: "May", actual: 1085, projected: 1085 },
  { name: "Jun", actual: 1148, projected: 1148 },
  { name: "Jul", projected: 1200 },
  { name: "Aug", projected: 1280 },
  { name: "Sep", projected: 1350 },
];

// Assistant
export const chatMessages: ChatMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Why did profits decrease last month?",
    timestamp: "10:32 AM",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Profits decreased 4.2% in April primarily due to a 23% spike in shipping expenses and a 14% revenue drop in the electronics category. Operating costs remained stable. I recommend reviewing carrier contracts and launching a bundle promotion for underperforming electronics SKUs.",
    timestamp: "10:32 AM",
  },
  {
    id: "3",
    role: "user",
    content: "Which products underperformed?",
    timestamp: "10:34 AM",
  },
  {
    id: "4",
    role: "assistant",
    content:
      "Top underperformers: Wireless Headphones (-22%), Smart Displays (-18%), and Accessory Pack D (out of stock). Premium Widget A and Enterprise Kit C exceeded targets by 12% and 8% respectively.",
    timestamp: "10:34 AM",
  },
];

export const promptSuggestions: PromptSuggestion[] = [
  { id: "1", text: "Why did profits decrease?" },
  { id: "2", text: "Which products underperformed?" },
  { id: "3", text: "Forecast next quarter revenue" },
  { id: "4", text: "Show inventory risks" },
  { id: "5", text: "Summarize this month's performance" },
];

// Reports
export const reports: Report[] = [
  {
    id: "1",
    title: "Sales Summary",
    description: "Revenue breakdown by product, category, and region with YoY comparisons.",
    type: "sales",
    status: "ready",
    generatedAt: "2026-05-18",
    period: "April 2026",
    fileSize: "2.1 MB",
  },
  {
    id: "2",
    title: "Expense Analysis",
    description: "Operating expenses, cost centers, and budget variance analysis.",
    type: "expense",
    status: "ready",
    generatedAt: "2026-05-17",
    period: "April 2026",
    fileSize: "1.4 MB",
  },
  {
    id: "3",
    title: "Inventory Report",
    description: "Stock levels, turnover rates, and reorder recommendations.",
    type: "inventory",
    status: "generating",
    period: "May 2026",
  },
  {
    id: "4",
    title: "Customer Analytics",
    description: "Acquisition, retention, churn, and lifetime value metrics.",
    type: "customer",
    status: "scheduled",
    period: "Q2 2026",
  },
  {
    id: "5",
    title: "Sales Summary",
    description: "Monthly sales performance with top products and channels.",
    type: "sales",
    status: "ready",
    generatedAt: "2026-05-15",
    period: "March 2026",
    fileSize: "1.9 MB",
  },
  {
    id: "6",
    title: "Expense Analysis",
    description: "Quarterly expense trends and optimization opportunities.",
    type: "expense",
    status: "ready",
    generatedAt: "2026-05-10",
    period: "Q1 2026",
    fileSize: "2.8 MB",
  },
];

// Settings
export const userProfile: UserProfile = {
  name: "Jane Doe",
  email: "jane.doe@acmecorp.com",
  role: "Business Owner",
  avatarInitials: "JD",
};

export const businessInfo: BusinessInfo = {
  companyName: "Acme Corp",
  industry: "Retail & E-commerce",
  employees: "11-50",
  currency: "USD",
  timezone: "America/New_York",
};

export const notificationSettings: NotificationSetting[] = [
  {
    id: "insights",
    label: "AI Insights",
    description: "Get notified when new AI insights are generated",
    enabled: true,
  },
  {
    id: "anomalies",
    label: "Anomaly Alerts",
    description: "Immediate alerts for unusual business metrics",
    enabled: true,
  },
  {
    id: "reports",
    label: "Report Ready",
    description: "Email when scheduled reports are ready to download",
    enabled: true,
  },
  {
    id: "inventory",
    label: "Inventory Warnings",
    description: "Low stock and predicted shortage notifications",
    enabled: false,
  },
  {
    id: "weekly",
    label: "Weekly Digest",
    description: "Summary of key metrics every Monday morning",
    enabled: true,
  },
];

export const billingPlans: BillingPlan[] = [
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    features: ["Unlimited uploads", "AI insights", "Forecasting", "Priority support"],
    isCurrent: true,
  },
  {
    name: "Enterprise",
    price: "$149",
    period: "/month",
    features: ["Everything in Pro", "Custom reports", "API access", "Dedicated account manager"],
    isCurrent: false,
  },
];
