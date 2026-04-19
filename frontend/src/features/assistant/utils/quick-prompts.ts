import {
  Clock,
  Lightbulb,
  Mail,
  Sparkles,
  Twitter,
  Users,
} from "lucide-react";

export interface QuickPrompt {
  id: string;
  icon: React.ElementType;
}

export const QUICK_PROMPT_KEYS: QuickPrompt[] = [
  { id: "summarizeLast24h", icon: Clock },
  { id: "draftPrReply", icon: Mail },
  { id: "tweetThread", icon: Twitter },
  { id: "topInfluencers", icon: Users },
  { id: "keyInsights", icon: Sparkles },
  { id: "recommendations", icon: Lightbulb },
];
