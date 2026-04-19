"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SummaryCard {
  label: string;
  value: string;
  positive: boolean;
  change: number | null | undefined;
}

export function SummaryCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="glass">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {card.label}
              </p>
              <div className="flex items-end justify-between mt-2">
                <p className="text-2xl font-bold">{card.value}</p>
                {card.change !== null && card.change !== undefined && (
                  <span
                    className={cn(
                      "text-sm font-medium flex items-center gap-1",
                      card.positive ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {card.positive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {`${card.change > 0 ? "+" : ""}${card.change}%`}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
