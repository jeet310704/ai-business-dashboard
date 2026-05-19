import type { InventoryItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface InventorySummaryProps {
  items: InventoryItem[];
}

const statusConfig = {
  in_stock: { label: "In Stock", variant: "success" as const },
  low_stock: { label: "Low Stock", variant: "warning" as const },
  out_of_stock: { label: "Out of Stock", variant: "destructive" as const },
};

export function InventorySummary({ items }: InventorySummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Summary</CardTitle>
        <CardDescription>Current stock levels across key products</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const status = statusConfig[item.status];
          return (
            <section
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3"
            >
              <section className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.sku}</p>
              </section>
              <section className="flex items-center gap-4">
                <section className="text-right">
                  <p className="text-sm font-medium">{item.quantity} units</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.value)}</p>
                </section>
                <Badge variant={status.variant}>{status.label}</Badge>
              </section>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
