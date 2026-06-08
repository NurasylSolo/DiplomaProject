"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  ArrowRight, 
  BarChart3, 
  Brain, 
  Globe2, 
  LineChart, 
  MessageSquareText,
  Newspaper,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  Shield,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { GradientText } from "@/components/ui/gradient-text";
import { CompactCounter } from "@/components/ui/animated-counter";
import { FloatingShapes, GridPattern } from "@/components/ui/floating-shapes";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { useTranslation } from "@/hooks";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function LandingPage() {
  const { t } = useTranslation();
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background elements */}
      <FloatingShapes variant="default" />
      <GridPattern className="opacity-50" />
      
      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="md" />
            
            <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 -translate-x-1/2">
              <NavLink href="#features">{t("landing.nav.features", { defaultValue: "Features" })}</NavLink>
              <NavLink href="#stats">{t("landing.nav.analytics", { defaultValue: "Analytics" })}</NavLink>
              <NavLink href="/contact">{t("landing.nav.contact", { defaultValue: "Contact" })}</NavLink>
            </div>

            <div className="flex items-center gap-2">
              <LanguageDropdown />
              <ThemeToggle />
              <Button variant="ghost" asChild>
                <Link href="/login">{t("auth.login.submit")}</Link>
              </Button>
              <Button asChild className="glow-sm">
                <Link href="/register">
                  {t("landing.hero.ctaPrimary")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Badge */}
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>{t("landing.hero.badge")}</span>
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              {t("landing.hero.title")}
              <br />
              <GradientText variant="primary" animated>
                {t("landing.hero.titleHighlight")}
              </GradientText>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              {t("landing.hero.subtitle")}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button size="lg" asChild className="glow-md text-lg px-8 py-6">
                <Link href="/register">
                  {t("landing.hero.ctaPrimary")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                <Link href="#demo">{t("landing.hero.ctaSecondary")}</Link>
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              variants={fadeInUp}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>{t("landing.hero.trust.security")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-primary" />
                <span>{t("landing.hero.trust.multilang")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{t("landing.hero.trust.realtime")}</span>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Hero Image/Dashboard Preview */}
          <motion.div 
            className="mt-20 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="relative mx-auto max-w-5xl">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-2xl opacity-50" />
              
              {/* Dashboard preview */}
              <div className="relative glass-strong rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
                <DashboardPreview />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section id="stats" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <StatCard
              value={50000000}
              label={t("landing.stats.mentionsTracked")}
              suffix="+"
              icon={<Newspaper className="h-5 w-5" />}
            />
            <StatCard
              value={150}
              label={t("landing.stats.countriesCovered")}
              suffix="+"
              icon={<Globe2 className="h-5 w-5" />}
            />
            <StatCard
              value={99.9}
              label={t("landing.stats.uptimeSLA")}
              suffix="%"
              decimals={1}
              icon={<Zap className="h-5 w-5" />}
            />
            <StatCard
              value={500}
              label={t("landing.stats.enterpriseClients")}
              suffix="+"
              icon={<Users className="h-5 w-5" />}
            />
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-primary font-medium mb-4 block">
              {t("landing.features.kicker", { defaultValue: "FEATURES" })}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              {t("landing.features.title")}
              <br />
              <GradientText>{t("landing.features.titleHighlight")}</GradientText>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("landing.features.subtitle")}
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
          >
            <FeatureCard
              icon={<MessageSquareText className="h-6 w-6" />}
              title={t("landing.features.items.tracking.title")}
              description={t("landing.features.items.tracking.description")}
            />
            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              title={t("landing.features.items.sentiment.title")}
              description={t("landing.features.items.sentiment.description")}
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title={t("landing.features.items.trends.title")}
              description={t("landing.features.items.trends.description")}
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title={t("landing.features.items.analytics.title")}
              description={t("landing.features.items.analytics.description")}
            />
            <FeatureCard
              icon={<LineChart className="h-6 w-6" />}
              title={t("landing.features.items.competitive.title")}
              description={t("landing.features.items.competitive.description")}
            />
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title={t("landing.features.items.reports.title")}
              description={t("landing.features.items.reports.description")}
            />
          </motion.div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="relative glass-strong rounded-3xl p-8 sm:p-12 text-center overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
            
            <div className="relative z-10">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                {t("landing.cta.title")}
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                {t("landing.cta.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild className="glow-md">
                  <Link href="/register">
                    {t("landing.cta.primary")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#features">{t("landing.cta.secondary")}</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                {t("landing.cta.note")}
              </p>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6">
            <Logo size="sm" />
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                {t("landing.footer.privacy")}
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                {t("landing.footer.terms")}
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                {t("landing.footer.contact")}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Senti News. {t("landing.footer.copyright")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Nav Link Component
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </Link>
  );
}

// Stat Card Component
function StatCard({ 
  value, 
  label, 
  suffix = "", 
  decimals = 0,
  icon 
}: { 
  value: number; 
  label: string; 
  suffix?: string;
  decimals?: number;
  icon: React.ReactNode;
}) {
  return (
    <motion.div 
      variants={fadeInUp}
      className="text-center p-6 glass rounded-2xl"
    >
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <div className="font-display text-3xl sm:text-4xl font-bold mb-1">
        <CompactCounter value={value} suffix={suffix} duration={2} compact={value >= 1000} />
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </motion.div>
  );
}

// Feature Card Component
function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <motion.div 
      variants={fadeInUp}
      className="group p-6 glass rounded-2xl hover:bg-card/80 transition-all duration-300 border border-transparent hover:border-primary/20"
      whileHover={{ y: -4 }}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </motion.div>
  );
}

// Dashboard Preview Component
function DashboardPreview() {
  return (
    <div className="p-4 sm:p-6 bg-background/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 bg-muted rounded-lg" />
          <div className="h-8 w-8 bg-muted rounded-lg" />
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Mentions", value: "12,847", change: "+12%" },
          { label: "Social Reach", value: "2.4M", change: "+8%" },
          { label: "Sentiment", value: "72%", change: "+5%" },
          { label: "Engagement", value: "156K", change: "+18%" },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-xl bg-card border border-border">
            <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
            <div className="text-xl font-bold">{stat.value}</div>
            <div className="text-xs text-green-500">{stat.change}</div>
          </div>
        ))}
      </div>
      
      {/* Chart Area */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 p-4 rounded-xl bg-card border border-border h-48">
          {/* Fake chart lines */}
          <div className="h-full flex items-end gap-1">
            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 65, 95].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-gradient-to-t from-primary/20 to-primary rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border h-48">
          {/* Sentiment donut placeholder */}
          <div className="h-full flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-8 border-primary/30 relative">
              <div 
                className="absolute inset-0 rounded-full border-8 border-transparent border-t-green-500 border-r-green-500"
                style={{ transform: "rotate(45deg)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
