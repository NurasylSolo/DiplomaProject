"use client";

import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks";
import { cn } from "@/lib/utils";
import type { InfluencerDto } from "@/lib/api/services/influencers";

interface AnalysisRankingProps {
  influencers: InfluencerDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const RANK_BADGE_CLASSES: Record<number, string> = {
  1: "bg-amber-500/20 text-amber-500",
  2: "bg-slate-400/20 text-slate-400",
  3: "bg-orange-500/20 text-orange-500",
};

export function AnalysisRanking({
  influencers,
  selectedId,
  onSelect,
}: AnalysisRankingProps) {
  const { t } = useTranslation();

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          {t("influencerAnalysis.ranking", { defaultValue: "Top voices" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {influencers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("influencerAnalysis.empty.ranking", {
              defaultValue: "No voices yet",
            })}
          </p>
        ) : (
          <div className="divide-y divide-border/30 max-h-[520px] overflow-y-auto">
            {influencers.map((inf, idx) => {
              const rank = idx + 1;
              const isSelected = inf.id === selectedId;
              return (
                <button
                  key={inf.id}
                  type="button"
                  onClick={() => onSelect(inf.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left",
                    isSelected && "bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      RANK_BADGE_CLASSES[rank] || "bg-muted text-muted-foreground"
                    )}
                  >
                    {rank}
                  </div>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={inf.avatar} alt={inf.display_name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {inf.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">
                      {inf.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {inf.handle}
                    </p>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">
                    {inf.influence_score.toFixed(0)}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
