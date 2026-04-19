"use client";

import { forwardRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Clock,
  Globe,
  Languages,
  MessageSquare,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslation } from "@/hooks";
import { fmtCompact, num, str } from "@/features/_shared";
import type { ReportPreview } from "@/lib/api/services/reports";
import type { InfluencerDto } from "@/lib/api/services/influencers";

interface InfographicCanvasProps {
  preview: ReportPreview | undefined;
  influencers: InfluencerDto[] | undefined;
  geoCountries: { country: string; mentions: number }[] | undefined;
}

/** 8 Plutchik emotion palette — same hex values used in the PDF radar
 *  so the infographic and the report look like one product. */
const EMOTION_PALETTE: Record<string, string> = {
  joy: "#fbbf24",
  trust: "#10b981",
  fear: "#7c3aed",
  surprise: "#06b6d4",
  sadness: "#3b82f6",
  disgust: "#84cc16",
  anger: "#ef4444",
  anticipation: "#f97316",
};

const EMOTION_ORDER = [
  "joy",
  "trust",
  "fear",
  "surprise",
  "sadness",
  "disgust",
  "anger",
  "anticipation",
] as const;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Premium presentational infographic. Wrapped in `forwardRef` so the parent
 * can grab the underlying DOM node and rasterise it via `html-to-image`.
 *
 * IMPORTANT: This component must be deterministic and not animate while
 * being captured — `html-to-image` snapshots the current frame only. The
 * `motion.div`s use `initial=animate` so they settle to their final state
 * before the user can click Export.
 *
 * Sections (top → bottom):
 *   1. Hero with project name + brand strip
 *   2. KPI strip (4 tiles)
 *   3. Sentiment ribbon
 *   4. Emotions (8 Plutchik bars)
 *   5. Hot hours peak callout
 *   6. Geo top countries with progress bars
 *   7. Topics, Influencers, Sources columns
 *   8. Languages strip
 *   9. Footer with branding & generated date
 */
export const InfographicCanvas = forwardRef<HTMLDivElement, InfographicCanvasProps>(
  function InfographicCanvas({ preview, influencers, geoCountries }, ref) {
    const { t } = useTranslation();

    const totalMentions = num(preview?.kpi.total_mentions);
    const totalReach = num(preview?.kpi.total_reach);
    const positivePct = num(preview?.kpi.positive_pct);
    const negativePct = num(preview?.kpi.negative_pct);
    const neutralPct = Math.max(0, 100 - positivePct - negativePct);

    const topTopics = useMemo(() => {
      const items = preview?.top_topics ?? [];
      const max = Math.max(1, ...items.map((tt) => num(tt.mentions)));
      return items.slice(0, 4).map((tt) => ({
        name: str(tt.name),
        percentage: Math.round((num(tt.mentions) / max) * 100),
        mentions: num(tt.mentions),
      }));
    }, [preview?.top_topics]);

    const topInfluencers = useMemo(
      () =>
        (influencers ?? []).slice(0, 4).map((inf) => ({
          name: inf.handle || inf.display_name || "—",
          followers: fmtCompact(inf.followers ?? 0),
        })),
      [influencers]
    );

    const topSources = useMemo(
      () => (preview?.top_sources ?? []).slice(0, 4),
      [preview?.top_sources]
    );

    // Prefer the rich preview.geo data; fall back to the simpler legacy prop
    // so existing callers don't break while we transition.
    const geoEntries = useMemo(() => {
      if (preview?.geo && preview.geo.length > 0) {
        const max = Math.max(1, ...preview.geo.map((g) => num(g.mentions)));
        return preview.geo.slice(0, 5).map((g) => ({
          country: str(g.country) || str(g.country_code) || "—",
          mentions: num(g.mentions),
          reach: num(g.reach),
          pct: Math.round((num(g.mentions) / max) * 100),
        }));
      }
      const fallback = geoCountries ?? [];
      const max = Math.max(1, ...fallback.map((g) => num(g.mentions)));
      return fallback.slice(0, 5).map((g) => ({
        country: g.country,
        mentions: num(g.mentions),
        reach: 0,
        pct: Math.round((num(g.mentions) / max) * 100),
      }));
    }, [preview?.geo, geoCountries]);

    const emotions = useMemo(() => {
      const averages = preview?.emotions?.averages ?? {};
      return EMOTION_ORDER.map((key) => ({
        key,
        label: t(`emotionsPage.names.${key}`, {
          defaultValue: key.charAt(0).toUpperCase() + key.slice(1),
        }),
        value: num(averages[key]),
        color: EMOTION_PALETTE[key],
      }));
    }, [preview?.emotions, t]);

    const hasEmotions = emotions.some((e) => e.value > 0);
    const topEmotion = preview?.emotions?.top_emotion;

    const peak = preview?.hot_hours?.peak;
    const tz = preview?.hot_hours?.timezone || "UTC";

    const languages = useMemo(
      () => (preview?.languages ?? []).slice(0, 4),
      [preview?.languages]
    );

    const generatedDate = useMemo(
      () =>
        new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      []
    );

    return (
      <div
        ref={ref}
        // Solid premium gradient so the PNG export reads cleanly on
        // light & dark social platforms. Fixed-width keeps the export
        // reproducible across viewports.
        style={{
          width: 1080,
          minHeight: 1620,
          background:
            "linear-gradient(180deg, #0f172a 0%, #1e293b 30%, #0b1220 100%)",
          color: "#e2e8f0",
          padding: "64px 72px 56px",
          fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* HERO ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 36 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 13,
              letterSpacing: "2.5px",
              textTransform: "uppercase",
              color: "#7dd3fc",
              fontWeight: 600,
              opacity: 0.9,
            }}
          >
            <span
              style={{
                width: 32,
                height: 4,
                borderRadius: 999,
                background: "linear-gradient(90deg, #06b6d4, #22d3ee)",
              }}
            />
            SentiNews · Media Intelligence
          </div>
          <h1
            style={{
              margin: "12px 0 6px",
              fontSize: 52,
              lineHeight: 1.05,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            {preview?.project_name ||
              t("reportsPage.infographic.title", {
                defaultValue: "Media Monitoring Report",
              })}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              color: "#94a3b8",
            }}
          >
            {generatedDate} · {totalMentions.toLocaleString()}{" "}
            {t("reportsPage.infographic.kpi.mentions", {
              defaultValue: "mentions",
            }).toLowerCase()}{" "}
            · {fmtCompact(totalReach)}{" "}
            {t("reportsPage.infographic.kpi.reach", { defaultValue: "reach" }).toLowerCase()}
          </p>
        </motion.div>

        {/* KPI STRIP ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[
            {
              icon: MessageSquare,
              label: t("reportsPage.infographic.kpi.mentions", { defaultValue: "Mentions" }),
              value: totalMentions.toLocaleString(),
              accent: "#22d3ee",
            },
            {
              icon: Users,
              label: t("reportsPage.infographic.kpi.reach", { defaultValue: "Reach" }),
              value: fmtCompact(totalReach),
              accent: "#a78bfa",
            },
            {
              icon: ThumbsUp,
              label: t("reportsPage.infographic.kpi.positive", { defaultValue: "Positive" }),
              value: `${Math.round(positivePct)}%`,
              accent: "#34d399",
            },
            {
              icon: TrendingUp,
              label: t("reportsPage.infographic.kpi.score", { defaultValue: "Score" }),
              value: `${Math.round(positivePct)}`,
              accent: "#fbbf24",
            },
          ].map(({ icon: Icon, label, value, accent }) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(148,163,184,0.16)",
                borderTop: `3px solid ${accent}`,
                borderRadius: 18,
                padding: "20px 18px",
                position: "relative",
              }}
            >
              <Icon style={{ width: 22, height: 22, color: accent, marginBottom: 10 }} />
              <p
                style={{
                  margin: 0,
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#ffffff",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                }}
              >
                {value}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: "#94a3b8",
                  letterSpacing: "0.4px",
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* SENTIMENT RIBBON ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(148,163,184,0.16)",
            borderRadius: 18,
            padding: 22,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "#94a3b8",
                fontWeight: 600,
              }}
            >
              {t("reportsPage.infographic.sentiment.title", {
                defaultValue: "Sentiment mix",
              })}
            </h3>
            <span style={{ fontSize: 12, color: "#cbd5e1" }}>
              {totalMentions.toLocaleString()}{" "}
              {t("reportsPage.infographic.kpi.mentions", { defaultValue: "mentions" }).toLowerCase()}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              height: 14,
              borderRadius: 999,
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <div style={{ width: `${positivePct}%`, background: "#10b981" }} />
            <div style={{ width: `${neutralPct}%`, background: "#94a3b8" }} />
            <div style={{ width: `${negativePct}%`, background: "#ef4444" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 28, fontSize: 13 }}>
            {[
              {
                color: "#10b981",
                label: t("mentions.sentiment.positive"),
                pct: positivePct,
              },
              {
                color: "#94a3b8",
                label: t("mentions.sentiment.neutral"),
                pct: neutralPct,
              },
              {
                color: "#ef4444",
                label: t("mentions.sentiment.negative"),
                pct: negativePct,
              },
            ].map((row) => (
              <span
                key={row.label}
                style={{ display: "flex", alignItems: "center", gap: 8, color: "#e2e8f0" }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: row.color,
                  }}
                />
                {row.label}{" "}
                <span style={{ color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
                  {row.pct}%
                </span>
              </span>
            ))}
          </div>
        </motion.div>

        {/* EMOTIONS + HOT HOURS row ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Emotions */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(148,163,184,0.16)",
              borderRadius: 18,
              padding: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Sparkles style={{ width: 18, height: 18, color: "#fbbf24" }} />
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  fontWeight: 600,
                }}
              >
                {t("reportsPage.infographic.emotions.title", {
                  defaultValue: "Emotion analysis",
                })}
              </h3>
            </div>
            {hasEmotions ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {emotions.map((e) => {
                  const pct = Math.round(e.value * 100);
                  const isTop = e.key === topEmotion;
                  return (
                    <div key={e.key}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          marginBottom: 4,
                          color: isTop ? "#ffffff" : "#cbd5e1",
                          fontWeight: isTop ? 600 : 400,
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: e.color,
                            }}
                          />
                          {e.label}
                        </span>
                        <span style={{ color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
                          {pct}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: "rgba(148,163,184,0.14)",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.max(2, pct)}%`,
                            height: "100%",
                            background: `linear-gradient(90deg, ${e.color}80, ${e.color})`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                {t("reportsPage.infographic.empty.emotions", {
                  defaultValue: "No emotion data yet",
                })}
              </p>
            )}
          </div>

          {/* Hot hours peak */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(34,211,238,0.10), rgba(167,139,250,0.06))",
              border: "1px solid rgba(148,163,184,0.16)",
              borderRadius: 18,
              padding: 22,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Clock style={{ width: 18, height: 18, color: "#22d3ee" }} />
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  fontWeight: 600,
                }}
              >
                {t("reportsPage.infographic.hotHours.title", {
                  defaultValue: "Hot hours",
                })}
              </h3>
            </div>
            {peak ? (
              <>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: 44,
                    fontWeight: 700,
                    color: "#ffffff",
                    lineHeight: 1.05,
                  }}
                >
                  {String(peak.hour).padStart(2, "0")}:00
                </p>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: 18,
                    color: "#cbd5e1",
                    fontWeight: 500,
                  }}
                >
                  {DAY_LABELS[peak.day] ?? "—"}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: "auto",
                    fontSize: 12,
                    color: "#94a3b8",
                  }}
                >
                  <span
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      padding: "6px 10px",
                      borderRadius: 8,
                    }}
                  >
                    {peak.mentions.toLocaleString()}{" "}
                    {t("reportsPage.infographic.kpi.mentions", { defaultValue: "mentions" }).toLowerCase()}
                  </span>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      padding: "6px 10px",
                      borderRadius: 8,
                    }}
                  >
                    {tz}
                  </span>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                {t("reportsPage.infographic.empty.hotHours", {
                  defaultValue: "No peak yet",
                })}
              </p>
            )}
          </div>
        </motion.div>

        {/* GEO ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(148,163,184,0.16)",
            borderRadius: 18,
            padding: 22,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Globe style={{ width: 18, height: 18, color: "#34d399" }} />
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "#94a3b8",
                fontWeight: 600,
              }}
            >
              {t("reportsPage.infographic.geo.title", {
                defaultValue: "Top countries",
              })}
            </h3>
          </div>
          {geoEntries.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {geoEntries.map((g) => (
                <div key={g.country}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      color: "#e2e8f0",
                      marginBottom: 5,
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{g.country}</span>
                    <span style={{ color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
                      {g.mentions.toLocaleString()}
                      {g.reach > 0 && ` · ${fmtCompact(g.reach)} reach`}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "rgba(148,163,184,0.14)",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(3, g.pct)}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #06b6d4, #22d3ee)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
              {t("reportsPage.infographic.empty.geo", {
                defaultValue: "No geo data yet",
              })}
            </p>
          )}
        </motion.div>

        {/* TOPICS / INFLUENCERS / SOURCES ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <ColumnCard
            icon={TrendingUp}
            iconColor="#a78bfa"
            title={t("reportsPage.infographic.topics.title")}
            empty={t("reportsPage.infographic.empty.topics", {
              defaultValue: "No topics yet",
            })}
            items={topTopics.map((tp) => ({
              key: tp.name,
              label: tp.name,
              value: `${tp.mentions.toLocaleString()}`,
              progress: tp.percentage,
              progressColor: "#a78bfa",
            }))}
          />
          <ColumnCard
            icon={Users}
            iconColor="#22d3ee"
            title={t("reportsPage.infographic.influencers.title")}
            empty={t("reportsPage.infographic.empty.influencers", {
              defaultValue: "No top voices yet",
            })}
            items={topInfluencers.map((inf) => ({
              key: inf.name,
              label: inf.name,
              value: inf.followers,
            }))}
          />
          <ColumnCard
            icon={BarChart3}
            iconColor="#fbbf24"
            title={t("reportsPage.infographic.topSources.title", {
              defaultValue: "Top sources",
            })}
            empty={t("reportsPage.infographic.empty.sources", {
              defaultValue: "No sources yet",
            })}
            items={topSources.map((s) => ({
              key: s.name,
              label: s.name,
              value: `${num(s.mentions_count).toLocaleString()}`,
            }))}
          />
        </motion.div>

        {/* LANGUAGES STRIP ─────────────────────────────────────────── */}
        {languages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(148,163,184,0.16)",
              borderRadius: 18,
              padding: 22,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Languages style={{ width: 18, height: 18, color: "#f97316" }} />
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  fontWeight: 600,
                }}
              >
                {t("reportsPage.infographic.languages.title", {
                  defaultValue: "Languages",
                })}
              </h3>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(4, languages.length)}, 1fr)`,
                gap: 12,
              }}
            >
              {languages.map((l) => (
                <div
                  key={l.language}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#ffffff",
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {l.share_pct.toFixed(1)}%
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: "#94a3b8",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {l.language} · {l.count.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* FOOTER ──────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 20,
            borderTop: "1px solid rgba(148,163,184,0.16)",
            color: "#64748b",
            fontSize: 12,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity style={{ width: 14, height: 14 }} />
            SentiNews · sentinews.io
          </span>
          <span>
            {t("reportsPage.infographic.footer.generated", {
              defaultValue: "Generated",
            })}{" "}
            · {new Date().toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
);

interface ColumnCardItem {
  key: string;
  label: string;
  value: string;
  progress?: number;
  progressColor?: string;
}

interface ColumnCardProps {
  icon: typeof Globe;
  iconColor: string;
  title: string;
  items: ColumnCardItem[];
  empty: string;
}

function ColumnCard({ icon: Icon, iconColor, title, items, empty }: ColumnCardProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(148,163,184,0.16)",
        borderRadius: 18,
        padding: 22,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <Icon style={{ width: 18, height: 18, color: iconColor }} />
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "#94a3b8",
            fontWeight: 600,
          }}
        >
          {title}
        </h3>
      </div>
      {items.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item) => (
            <div key={item.key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  color: "#e2e8f0",
                  marginBottom: item.progress !== undefined ? 5 : 0,
                }}
              >
                <span
                  style={{
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    color: "#94a3b8",
                    marginLeft: 8,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {item.value}
                </span>
              </div>
              {item.progress !== undefined && (
                <div
                  style={{
                    height: 4,
                    background: "rgba(148,163,184,0.14)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(3, item.progress)}%`,
                      height: "100%",
                      background: item.progressColor ?? "#22d3ee",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>{empty}</p>
      )}
    </div>
  );
}
