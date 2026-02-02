"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Send,
  Clock,
  Users,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

// Social media icons as simple SVG components
const LinkedInIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const GitHubIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

export default function ContactsPage() {
  const { t } = useTranslation();
  const [formState, setFormState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("sending");
    
    // Simulate form submission
    setTimeout(() => {
      setFormState("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setFormState("idle"), 3000);
    }, 1500);
  };

  const socialLinks = [
    { name: "LinkedIn", icon: LinkedInIcon, href: "https://linkedin.com" },
    { name: "Twitter", icon: TwitterIcon, href: "https://twitter.com" },
    { name: "Telegram", icon: TelegramIcon, href: "https://t.me" },
    { name: "GitHub", icon: GitHubIcon, href: "https://github.com" },
  ];

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
                {t("contacts.backToHome")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-accent/10 mb-6">
            <MessageSquare className="h-12 w-12 text-accent" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            {t("contacts.title")}
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            {t("contacts.subtitle")}
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("contacts.description")}
          </p>
        </motion.div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-accent" />
                  {t("contacts.form.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("contacts.form.name")}</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t("contacts.form.namePlaceholder")}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("contacts.form.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder={t("contacts.form.emailPlaceholder")}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">{t("contacts.form.subject")}</Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(value) => setFormData({ ...formData, subject: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("contacts.form.subjectPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{t("contacts.form.subjects.general")}</SelectItem>
                        <SelectItem value="support">{t("contacts.form.subjects.support")}</SelectItem>
                        <SelectItem value="billing">{t("contacts.form.subjects.billing")}</SelectItem>
                        <SelectItem value="partnership">{t("contacts.form.subjects.partnership")}</SelectItem>
                        <SelectItem value="bug">{t("contacts.form.subjects.bug")}</SelectItem>
                        <SelectItem value="feedback">{t("contacts.form.subjects.feedback")}</SelectItem>
                        <SelectItem value="other">{t("contacts.form.subjects.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">{t("contacts.form.message")}</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder={t("contacts.form.messagePlaceholder")}
                      rows={5}
                      required
                    />
                  </div>

                  {formState === "success" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{t("contacts.form.success")}</p>
                        <p className="text-sm opacity-80">{t("contacts.form.successDescription")}</p>
                      </div>
                    </motion.div>
                  )}

                  {formState === "error" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-600"
                    >
                      <AlertCircle className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{t("contacts.form.error")}</p>
                        <p className="text-sm opacity-80">{t("contacts.form.errorDescription")}</p>
                      </div>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full glow-sm"
                    disabled={formState === "sending"}
                  >
                    {formState === "sending" ? (
                      <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        {t("contacts.form.sending")}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t("contacts.form.send")}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Info Cards */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-accent" />
                  {t("contacts.info.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Mail className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium">{t("contacts.info.email.title")}</h4>
                    <p className="text-sm text-muted-foreground">{t("contacts.info.email.general")}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Phone className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium">{t("contacts.info.phone.title")}</h4>
                    <p className="text-sm text-muted-foreground">{t("contacts.info.phone.number")}</p>
                    <p className="text-xs text-muted-foreground">{t("contacts.info.phone.hours")}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <MapPin className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium">{t("contacts.info.address.title")}</h4>
                    <p className="text-sm text-muted-foreground">{t("contacts.info.address.city")}</p>
                    <p className="text-sm text-muted-foreground">{t("contacts.info.address.street")}</p>
                    <p className="text-xs text-muted-foreground">{t("contacts.info.address.postal")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card className="glass">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-accent" />
                  {t("contacts.response.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {t("contacts.response.email")}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {t("contacts.response.chat")}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    {t("contacts.response.phone")}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {t("contacts.response.critical")}
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card className="glass">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-accent" />
                  {t("contacts.social.title")}
                </CardTitle>
                <CardDescription>{t("contacts.social.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {socialLinks.map((social) => (
                    <Button
                      key={social.name}
                      variant="outline"
                      size="icon"
                      asChild
                      className="hover:bg-accent/10 hover:text-accent hover:border-accent transition-colors"
                    >
                      <a href={social.href} target="_blank" rel="noopener noreferrer">
                        <social.icon />
                      </a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 max-w-2xl mx-auto"
        >
          <Card className="glass bg-gradient-to-r from-accent/5 to-primary/5 border-accent/20">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-accent/10 mb-4">
                <HelpCircle className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                {t("contacts.faq.title")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("contacts.faq.description")}
              </p>
              <Button variant="outline" className="group">
                {t("contacts.faq.button")}
                <ExternalLink className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Developers Section */}
        <Separator className="my-12 max-w-6xl mx-auto" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="font-display text-2xl font-bold text-center mb-8">
            {t("contacts.developers.title")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="glass hover:shadow-lg transition-all">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-accent/20 to-primary/20">
                  <Code2 className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t("contacts.developers.lead")}</h3>
                  <p className="text-sm text-accent">{t("contacts.developers.leadRole")}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover:shadow-lg transition-all">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
                  <Code2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t("contacts.developers.fullstack")}</h3>
                  <p className="text-sm text-primary">{t("contacts.developers.fullstackRole")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            <Mail className="h-4 w-4 inline mr-1" />
            {t("contacts.developers.email")}
          </p>
        </motion.div>

        {/* Back Button */}
        <div className="text-center mt-12">
          <Button size="lg" asChild className="glow-sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("contacts.backToHome")}
            </Link>
          </Button>
        </div>
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

