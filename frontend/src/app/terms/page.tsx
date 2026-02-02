"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  FileText, 
  ArrowLeft, 
  Users, 
  UserCheck, 
  Server, 
  ShieldCheck, 
  CreditCard, 
  Copyright, 
  Database, 
  Link2, 
  Clock, 
  AlertTriangle, 
  LogOut, 
  Scale, 
  RefreshCw, 
  Mail 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/ui/logo";
import { useTranslation } from "@/hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import i18n from "@/lib/i18n/config";

const sectionIcons = {
  acceptance: FileText,
  account: UserCheck,
  service: Server,
  responsibilities: ShieldCheck,
  payment: CreditCard,
  intellectual: Copyright,
  data: Database,
  thirdParty: Link2,
  availability: Clock,
  liability: AlertTriangle,
  termination: LogOut,
  disputes: Scale,
  changes: RefreshCw,
  contact: Mail,
};

export default function TermsPage() {
  const { t } = useTranslation();
  
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };
  
  const sections = [
    "acceptance",
    "account",
    "service",
    "responsibilities",
    "payment",
    "intellectual",
    "data",
    "thirdParty",
    "availability",
    "liability",
    "termination",
    "disputes",
    "changes",
    "contact",
  ] as const;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" showText animated={false} />
          </Link>
          
          <div className="flex items-center gap-4">
            <Select value={i18n.language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                <SelectItem value="kz">🇰🇿 Қазақша</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("terms.backToHome")}
              </Link>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-accent/10 mb-6">
              <FileText className="h-12 w-12 text-accent" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              {t("terms.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("terms.lastUpdated")}: {new Date().toLocaleDateString(i18n.language === "ru" ? "ru-RU" : i18n.language === "kz" ? "kk-KZ" : "en-US", { 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </p>
          </div>
          
          {/* Introduction */}
          <Card className="glass mb-8">
            <CardContent className="p-6 sm:p-8">
              <p className="text-lg leading-relaxed text-muted-foreground">
                {t("terms.intro")}
              </p>
            </CardContent>
          </Card>
          
          {/* Sections */}
          <div className="space-y-6">
            {sections.map((sectionKey, index) => {
              const Icon = sectionIcons[sectionKey];
              return (
                <motion.div
                  key={sectionKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="glass hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-accent/10 flex-shrink-0">
                          <Icon className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                          <h2 className="font-display text-xl font-semibold mb-3">
                            {t(`terms.sections.${sectionKey}.title`)}
                          </h2>
                          <p className="text-muted-foreground leading-relaxed">
                            {t(`terms.sections.${sectionKey}.content`)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          
          {/* Developers Section */}
          <Separator className="my-12" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="glass bg-gradient-to-r from-accent/5 to-primary/5 border-accent/20">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-accent/10 mb-4">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-4">
                  {t("terms.developers.title")}
                </h3>
                <p className="text-lg text-muted-foreground">
                  {t("terms.developers.names")}
                </p>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Back Button */}
          <div className="text-center mt-12">
            <Button size="lg" asChild className="glow-sm">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("terms.backToHome")}
              </Link>
            </Button>
          </div>
        </motion.div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Senti News. {t("landing.footer.copyright")}</p>
        </div>
      </footer>
    </div>
  );
}


