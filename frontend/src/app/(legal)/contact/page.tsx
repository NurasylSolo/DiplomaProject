"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  MapPin,
  Clock,
  Github,
  GraduationCap,
  MessageSquareText,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks";

const CONTACT_EMAIL = "nurasylkairkhanov@gmail.com";

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function ContactPage() {
  const { t } = useTranslation();

  const cards = [
    {
      icon: <Mail className="h-5 w-5" />,
      label: t("legal.contact.cards.email.label"),
      value: CONTACT_EMAIL,
      hint: t("legal.contact.cards.email.hint"),
      href: `mailto:${CONTACT_EMAIL}`,
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      label: t("legal.contact.cards.location.label"),
      value: t("legal.contact.cards.location.value"),
      hint: t("legal.contact.cards.location.hint"),
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: t("legal.contact.cards.response.label"),
      value: t("legal.contact.cards.response.value"),
      hint: t("legal.contact.cards.response.hint"),
    },
  ];

  const team = [
    {
      name: t("legal.contact.team.member1.name"),
      role: t("legal.contact.team.member1.role"),
    },
    {
      name: t("legal.contact.team.member2.name"),
      role: t("legal.contact.team.member2.role"),
    },
  ];

  return (
    <article className="space-y-12">
      {/* Header */}
      <motion.header
        className="space-y-3 border-b border-border pb-8"
        initial="initial"
        animate="animate"
        variants={fadeInUp}
        transition={{ duration: 0.4 }}
      >
        <p className="text-xs uppercase tracking-wider text-primary font-medium">
          {t("legal.contact.eyebrow")}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          {t("legal.contact.title")}
        </h1>
        <p className="text-base text-muted-foreground max-w-3xl pt-2">
          {t("legal.contact.intro")}
        </p>
      </motion.header>

      {/* Contact method cards */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => {
          const inner = (
            <>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {card.icon}
              </div>
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="font-display text-lg font-semibold break-words">
                {card.value}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{card.hint}</p>
            </>
          );

          return (
            <motion.div
              key={i}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeInUp}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              {card.href ? (
                <a
                  href={card.href}
                  className="group block h-full rounded-2xl border border-border bg-muted/30 p-6 transition-colors hover:border-primary/30 hover:bg-muted/50"
                >
                  {inner}
                </a>
              ) : (
                <div className="group h-full rounded-2xl border border-border bg-muted/30 p-6 transition-colors hover:border-primary/30 hover:bg-muted/50">
                  {inner}
                </div>
              )}
            </motion.div>
          );
        })}
      </section>

      {/* Team */}
      <section className="space-y-5">
        <h2 className="font-display text-xl sm:text-2xl font-semibold">
          {t("legal.contact.teamTitle")}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {team.map((member, i) => (
            <motion.div
              key={i}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeInUp}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-center gap-4 rounded-2xl border border-border bg-muted/30 p-5"
            >
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="font-display text-base font-semibold">
                  {member.name}
                </div>
                <div className="text-sm text-muted-foreground">{member.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("legal.contact.team.affiliation")}
        </p>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-muted/30 p-8 sm:p-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">
            {t("legal.contact.ctaTitle")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("legal.contact.ctaBody")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="glow-sm">
              <a href={`mailto:${CONTACT_EMAIL}`}>
                {t("legal.contact.ctaButton")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://github.com/NurasylSolo/DiplomaProject"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                {t("legal.contact.ctaGithub")}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Back link */}
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="text-primary hover:text-primary/80">
          {t("legal.contact.backHome")}
        </Link>
      </p>
    </article>
  );
}
