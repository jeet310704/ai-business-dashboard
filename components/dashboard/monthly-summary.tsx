import type { MonthlySummary } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface MonthlySummarySectionProps {
  summaries: MonthlySummary[];
}

export function MonthlySummarySection({ summaries }: MonthlySummarySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Summary</CardTitle>
        <CardDescription>Revenue, expenses, and profit for recent months</CardDescription>
      </CardHeader>
      <CardContent>
        <section className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Month</th>
                <th className="pb-3 pr-4 font-medium">Revenue</th>
                <th className="pb-3 pr-4 font-medium">Expenses</th>
                <th className="pb-3 pr-4 font-medium">Profit</th>
                <th className="pb-3 font-medium">Customers</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((row) => (
                <tr key={row.month} className="border-b border-border/50 last:border-0">
                  <td className="py-3 pr-4 font-medium">{row.month}</td>
                  <td className="py-3 pr-4 text-emerald-400">{formatCurrency(row.revenue)}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatCurrency(row.expenses)}</td>
                  <td className="py-3 pr-4 font-medium">{formatCurrency(row.profit)}</td>
                  <td className="py-3">{formatNumber(row.customers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </CardContent>
    </Card>
  );
}
