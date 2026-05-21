import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

type GeminiInsightSeverity = "high" | "medium" | "low";

type GeneratedInsight = {
  title: string;
  insight: string;
  severity: GeminiInsightSeverity;
};

function parseJsonArray(text: string) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("Unable to parse JSON from Gemini response.");
  }
  const json = text.slice(start, end + 1);
  return JSON.parse(json) as GeneratedInsight[];
}

function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildFallbackInsights(metrics: {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  topProduct: string;
  topCategory: string;
  customerCount: number;
  topCustomer: string;
  topCustomerSpend: number;
  averageCustomerSpend: number;
  lowStockCount: number;
  lowStockProducts: string[];
}) {
  const insights: GeneratedInsight[] = [];
  const { totalRevenue, totalExpenses, profit, topProduct, topCategory, customerCount, topCustomer, topCustomerSpend, averageCustomerSpend, lowStockCount, lowStockProducts } = metrics;

  insights.push({
    title: profit >= 0 ? "Profit remains positive" : "Profit is negative",
    insight: profit >= 0
      ? `Your business generated ${sanitizeString(`$${totalRevenue.toFixed(0)}`)} in revenue and ${sanitizeString(`$${totalExpenses.toFixed(0)}`)} in expenses, yielding ${sanitizeString(`$${profit.toFixed(0)}`)} in profit.`
      : `Your business has ${sanitizeString(`$${totalRevenue.toFixed(0)}`)} in revenue against ${sanitizeString(`$${totalExpenses.toFixed(0)}`)} in expenses, resulting in a ${sanitizeString(`$${Math.abs(profit).toFixed(0)}`)} loss.`,
    severity: profit < 0 ? "high" : "medium",
  });

  insights.push({
    title: `Top product is ${topProduct}`,
    insight: topProduct !== "N/A"
      ? `The best selling product is ${topProduct}, which is driving the strongest share of revenue.`
      : "There is not enough product sales data to identify a top product yet.",
    severity: "medium",
  });

  insights.push({
    title: `Top revenue category is ${topCategory}`,
    insight: topCategory !== "N/A"
      ? `Sales are strongest in the ${topCategory} category, making it a key focus area for growth.`
      : "There is not enough category data to determine the strongest revenue segment.",
    severity: "medium",
  });

  if (customerCount > 0) {
    insights.push({
      title: `Customer base strength`,
      insight: `You have ${customerCount} customer records, with the top customer spending ${sanitizeString(`$${topCustomerSpend.toFixed(0)}`)} and an average spend of ${sanitizeString(`$${averageCustomerSpend.toFixed(0)}`)}.`,
      severity: "medium",
    });
  } else if (lowStockCount > 0) {
    insights.push({
      title: "Inventory risk detected",
      insight: `There are ${lowStockCount} items at or below reorder level${lowStockProducts.length ? `, including ${lowStockProducts.slice(0, 3).join(", ")}` : ""}.`,
      severity: "high",
    });
  } else {
    insights.push({
      title: "More data will improve insights",
      insight: "Upload customer and inventory records to generate more accurate business insights.",
      severity: "low",
    });
  }

  return insights.slice(0, 4);
}

export async function generateInsightsForBusiness(businessId: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const supabase = await createClient();
  const [salesResponse, expenseResponse, inventoryResponse, customerResponse] = await Promise.all([
    supabase
      .from("sales_records")
      .select("product_name, category, revenue, sale_date")
      .eq("business_id", businessId),
    supabase
      .from("expense_records")
      .select("amount, expense_date, category")
      .eq("business_id", businessId),
    supabase
      .from("inventory_records")
      .select("id, item_name, stock, reorder_level, unit_cost")
      .eq("business_id", businessId),
    supabase
      .from("customer_records")
      .select("customer_name, total_spent")
      .eq("business_id", businessId),
  ]);

  if (salesResponse.error || expenseResponse.error || inventoryResponse.error || customerResponse.error) {
    const errorMessage =
      salesResponse.error?.message || expenseResponse.error?.message || inventoryResponse.error?.message || customerResponse.error?.message;
    throw new Error(errorMessage ?? "Failed to load business records.");
  }

  const sales = Array.isArray(salesResponse.data) ? salesResponse.data : [];
  const expenses = Array.isArray(expenseResponse.data) ? expenseResponse.data : [];
  const inventory = Array.isArray(inventoryResponse.data) ? inventoryResponse.data : [];
  const customers = Array.isArray(customerResponse.data) ? customerResponse.data : [];

  if (sales.length === 0 && expenses.length === 0 && inventory.length === 0 && customers.length === 0) {
    return [];
  }

  const revenueByProduct = new Map<string, number>();
  const revenueByCategory = new Map<string, number>();
  const monthlyRevenue = new Map<string, number>();
  let totalRevenue = 0;

  for (const record of sales) {
    const revenue = Number(record.revenue ?? 0);
    totalRevenue += revenue;

    const product = sanitizeString(String(record.product_name ?? "Unknown product"));
    const category = sanitizeString(String(record.category ?? "Other"));

    revenueByProduct.set(product, (revenueByProduct.get(product) ?? 0) + revenue);
    revenueByCategory.set(category, (revenueByCategory.get(category) ?? 0) + revenue);

    const date = record.sale_date ? new Date(record.sale_date) : null;
    if (!date || Number.isNaN(date.getTime())) {
      continue;
    }

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) ?? 0) + revenue);
  }

  const totalExpenses = expenses.reduce((sum, record) => sum + Number(record.amount ?? 0), 0);
  const profit = totalRevenue - totalExpenses;

  for (const record of expenses) {
    if (!record.expense_date) {
      continue;
    }
    const date = new Date(record.expense_date);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) ?? 0) - Number(record.amount ?? 0));
  }

  const lowStockItems = inventory
    .filter((record) => {
      const stock = Number(record.stock ?? 0);
      const reorderLevel = Number(record.reorder_level ?? 0);
      return stock <= reorderLevel;
    })
    .map((record) => sanitizeString(String(record.item_name ?? "Unknown product")));

  const customerCount = customers.length;
  const topCustomerEntry = customers
    .map((record) => ({
      name: sanitizeString(String(record.customer_name ?? "Unknown customer")),
      value: Number(record.total_spent ?? 0),
    }))
    .sort((a, b) => b.value - a.value)[0];
  const topCustomer = topCustomerEntry?.name ?? "N/A";
  const topCustomerSpend = topCustomerEntry?.value ?? 0;
  const averageCustomerSpend = customerCount > 0
    ? customers.reduce((sum, record) => sum + Number(record.total_spent ?? 0), 0) / customerCount
    : 0;

  const topProduct = Array.from(revenueByProduct.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  const topCategory = Array.from(revenueByCategory.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  const sortedMonths = Array.from(monthlyRevenue.keys()).sort();
  const monthlyTrend = sortedMonths
    .map((monthKey) => `${monthKey}: ${monthlyRevenue.get(monthKey)?.toFixed(0) ?? 0}`)
    .join(", ");

  const prompt = `You are a business analytics assistant. Review the business metrics below and generate 4 concise business insights. Each insight must contain title, insight, and severity (high, medium, low). Return only a valid JSON array with no additional text.\n\nBusiness metrics:\n- Total revenue: $${totalRevenue.toFixed(0)}\n- Total expenses: $${totalExpenses.toFixed(0)}\n- Profit: $${profit.toFixed(0)}\n- Top product: ${topProduct}\n- Top category: ${topCategory}\n- Monthly revenue trend: ${monthlyTrend || "no monthly trend data"}\n- Customer records: ${customerCount}\n- Top customer: ${topCustomer} (${topCustomerSpend.toFixed(0)})\n- Average customer spend: $${averageCustomerSpend.toFixed(0)}\n- Low stock count: ${lowStockItems.length}\n- Low stock products: ${lowStockItems.slice(0, 3).join(", ") || "none"}\n\nIf a metric is unavailable, still generate helpful insights from the data that does exist.`;

  const client = new GoogleGenAI({ apiKey });

  try {
    const response = await client.models.generateContent({
      model: "gemini-1.5-small",
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 350,
        responseMimeType: "application/json",
      },
    });

    const output = response.text?.trim() ?? "";
    if (output) {
      const json = parseJsonArray(output);
      if (json.length > 0) {
        return json.map((item) => ({
          title: sanitizeString(item.title),
          insight: sanitizeString(item.insight),
          severity: item.severity,
        }));
      }
    }
  } catch (error) {
    console.error("Gemini insight generation failed:", error);
  }

  return buildFallbackInsights({
    totalRevenue,
    totalExpenses,
    profit,
    topProduct,
    topCategory,
    customerCount,
    topCustomer,
    topCustomerSpend,
    averageCustomerSpend,
    lowStockCount: lowStockItems.length,
    lowStockProducts: lowStockItems,
  });
}
