"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Plus,
  Sparkles,
  FileText,
  Lightbulb,
  Copy,
  Trash2,
  MoreHorizontal,
  Clock,
  Loader2,
  Twitter,
  Mail,
  Users,
  Pencil,
  ExternalLink,
  Check,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useAiChat,
  useChats,
  useChatMessages,
  useDeleteChat,
  useRenameChat,
  useGenerateAiReport,
  useTranslation,
} from "@/hooks";
import type { ChatMessageDto, AIReportResponse } from "@/lib/api/services/ai";

interface AssistantPageProps {
  params: Promise<{ projectId: string }>;
}

const QUICK_PROMPT_KEYS: { id: string; icon: React.ElementType }[] = [
  { id: "summarizeLast24h", icon: Clock },
  { id: "draftPrReply", icon: Mail },
  { id: "tweetThread", icon: Twitter },
  { id: "topInfluencers", icon: Users },
  { id: "keyInsights", icon: Sparkles },
  { id: "recommendations", icon: Lightbulb },
];

function formatTime(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function relativeDate(
  d: string | Date | null,
  t: ReturnType<typeof useTranslation>["t"]
): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("assistant.relative.justNow");
  if (min < 60) return t("assistant.relative.minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("assistant.relative.hoursAgo", { count: hr });
  if (hr < 48) return t("assistant.relative.yesterday");
  return date.toLocaleDateString();
}

/** Render assistant text turning [m:abc12345] into clickable mention badges. */
function MessageBody({
  text,
  projectId,
}: {
  text: string;
  projectId: string;
}) {
  const parts = useMemo(() => {
    const re = /\[m:([a-zA-Z0-9-]{6,40})\]/g;
    const out: Array<{ type: "text" | "cite"; value: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        out.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      out.push({ type: "cite", value: match[1] });
      lastIndex = re.lastIndex;
    }
    if (lastIndex < text.length) {
      out.push({ type: "text", value: text.slice(lastIndex) });
    }
    return out;
  }, [text]);

  return (
    <p className="text-sm whitespace-pre-wrap leading-relaxed">
      {parts.map((p, i) =>
        p.type === "text" ? (
          <span key={i}>{p.value}</span>
        ) : (
          <Link
            key={i}
            href={`/projects/${projectId}/mentions?highlight=${p.value}`}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-[10px] font-medium rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors no-underline"
            title={`Open mention ${p.value}`}
          >
            [m:{p.value.slice(0, 6)}]
          </Link>
        )
      )}
    </p>
  );
}

export default function AssistantPage({ params }: AssistantPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  // ─── data ─────────────────────────────────────────────────────────────
  const { data: chats = [], isLoading: chatsLoading } = useChats(projectId);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const { data: messages = [], isLoading: messagesLoading } = useChatMessages(
    projectId,
    activeChatId
  );

  const aiChat = useAiChat(projectId);
  const renameMutation = useRenameChat(projectId);
  const deleteMutation = useDeleteChat(projectId);
  const reportMutation = useGenerateAiReport(projectId);

  // ─── local UI state ──────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Optimistic messages for instant UX while waiting for backend response.
  const [optimistic, setOptimistic] = useState<ChatMessageDto[]>([]);

  // Rename dialog
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Report dialog
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState<AIReportResponse | null>(null);

  // ─── side-effects ────────────────────────────────────────────────────

  // Pick first chat once loaded
  useEffect(() => {
    if (!activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  // ?prefill=
  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) {
      setInput(prefill);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [searchParams]);

  // Reset optimistic queue when chat changes
  useEffect(() => {
    setOptimistic([]);
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, optimistic]);

  // ─── derived ─────────────────────────────────────────────────────────

  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const visibleMessages: ChatMessageDto[] = useMemo(
    () => [...messages, ...optimistic],
    [messages, optimistic]
  );

  // ─── actions ─────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = input.trim();
    if (!text || aiChat.isPending) return;

    setInput("");

    const tempUserId = `tmp-u-${Date.now()}`;
    setOptimistic((prev) => [
      ...prev,
      {
        id: tempUserId,
        chat_id: activeChatId || "",
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
        metadata: null,
      },
    ]);

    try {
      const response = await aiChat.mutateAsync({
        message: text,
        chat_id: activeChatId || undefined,
      });
      // Adopt newly created chat id (when chat_id was undefined).
      if (!activeChatId && response?.chat_id) {
        setActiveChatId(response.chat_id);
      }
      // Clear optimistic queue — the refetched messages query will replace it.
      setOptimistic([]);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("assistant.errors.failed");
      toast.error(message);
      setOptimistic([]);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setOptimistic([]);
    setInput("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleRename = async () => {
    if (!activeChatId || !renameValue.trim()) return;
    try {
      await renameMutation.mutateAsync({
        chatId: activeChatId,
        title: renameValue.trim(),
      });
      toast.success(t("assistant.toasts.renamed"));
      setRenameOpen(false);
    } catch {
      toast.error(t("assistant.errors.failed"));
    }
  };

  const handleDelete = async (chatId: string) => {
    if (!confirm(t("assistant.confirm.delete"))) return;
    try {
      await deleteMutation.mutateAsync(chatId);
      toast.success(t("assistant.toasts.deleted"));
      if (chatId === activeChatId) setActiveChatId(null);
    } catch {
      toast.error(t("assistant.errors.failed"));
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("assistant.toasts.copied"));
    } catch {
      // ignore
    }
  };

  const handleGenerateReport = async () => {
    setReportOpen(true);
    setReport(null);
    try {
      const r = await reportMutation.mutateAsync(25);
      setReport(r);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("assistant.errors.reportFailed");
      toast.error(message);
      setReportOpen(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const md = renderReportToMarkdown(report);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${projectId.slice(0, 8)}_${new Date()
      .toISOString()
      .slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ─── prompts ─────────────────────────────────────────────────────────

  const handleQuickPrompt = (key: string) => {
    const prompt = t(`assistant.prompts.${key}.prompt`);
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const suggestedPrompts: string[] = useMemo(() => {
    return [
      t("assistant.prompts.suggested.0"),
      t("assistant.prompts.suggested.1"),
      t("assistant.prompts.suggested.2"),
      t("assistant.prompts.suggested.3"),
      t("assistant.prompts.suggested.4"),
      t("assistant.prompts.suggested.5"),
    ];
  }, [t]);

  // ─── render ──────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-6">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{t("assistant.chatHistory")}</h2>
          <Button size="sm" onClick={handleNewChat}>
            <Plus className="h-4 w-4 mr-1" />
            {t("assistant.newChat")}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {chatsLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground inline" />
              </div>
            ) : chats.length === 0 && !activeChatId ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("assistant.empty.noChats")}
              </p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg transition-colors",
                    activeChatId === chat.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  )}
                >
                  <button
                    onClick={() => setActiveChatId(chat.id)}
                    className="flex-1 text-left p-3 min-w-0"
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="font-medium text-sm truncate">
                        {chat.title || t("assistant.newChat")}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {relativeDate(chat.updated_at || chat.created_at, t)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {chat.last_message_preview || t("assistant.empty.noMessages")}
                    </p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setActiveChatId(chat.id);
                          setRenameValue(chat.title || "");
                          setRenameOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        {t("assistant.actions.rename")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(chat.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("assistant.actions.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Quick prompts */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">
            {t("assistant.quickPrompts")}
          </p>
          <div className="space-y-2">
            {QUICK_PROMPT_KEYS.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => handleQuickPrompt(p.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-muted/50 transition-colors"
              >
                <p.icon className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate">
                  {t(`assistant.prompts.${p.id}.label`)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <Card className="flex-1 glass flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border/50 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">
                  {activeChat?.title || t("assistant.newChat")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t("assistant.title")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateReport}
                disabled={reportMutation.isPending}
              >
                {reportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {t("assistant.actions.generateReport")}
              </Button>
              {activeChatId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameValue(activeChat?.title || "");
                        setRenameOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("assistant.actions.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => activeChatId && handleDelete(activeChatId)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("assistant.actions.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {visibleMessages.length === 0 && !messagesLoading ? (
              <div className="h-full flex flex-col items-center justify-center py-12">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {t("assistant.empty.title")}
                </h3>
                <p className="text-muted-foreground text-center max-w-sm mb-6">
                  {t("assistant.empty.description")}
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(prompt);
                        textareaRef.current?.focus();
                      }}
                      className="px-3 py-1.5 rounded-full bg-muted/50 text-sm hover:bg-muted transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : messagesLoading && optimistic.length === 0 ? (
              <div className="text-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground inline" />
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {visibleMessages.map((m) => {
                  const cited = (m.metadata?.cited_mention_ids ?? []) as string[];
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "flex gap-3",
                        m.role === "user" ? "flex-row-reverse" : ""
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback
                          className={cn(
                            "text-xs",
                            m.role === "assistant"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted"
                          )}
                        >
                          {m.role === "assistant" ? <Bot className="h-4 w-4" /> : "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div
                        className={cn(
                          "max-w-[78%] space-y-1.5",
                          m.role === "user" ? "items-end" : ""
                        )}
                      >
                        <div
                          className={cn(
                            "p-3 rounded-2xl",
                            m.role === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted/50 rounded-tl-sm"
                          )}
                        >
                          {m.role === "assistant" ? (
                            <MessageBody text={m.content} projectId={projectId} />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {m.content}
                            </p>
                          )}

                          {m.role === "assistant" && cited.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/30 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
                                {t("assistant.citations.label")} ({cited.length})
                              </span>
                              {cited.slice(0, 8).map((id) => (
                                <Link
                                  key={id}
                                  href={`/projects/${projectId}/mentions?highlight=${id}`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20"
                                >
                                  m:{id.slice(0, 6)}
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 px-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(m.timestamp)}
                          </span>
                          {m.role === "assistant" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopy(m.content)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {aiChat.isPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="p-3 rounded-2xl rounded-tl-sm bg-muted/50">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50 flex-shrink-0">
          {visibleMessages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {QUICK_PROMPT_KEYS.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleQuickPrompt(p.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs whitespace-nowrap hover:bg-muted transition-colors"
                >
                  <p.icon className="h-3 w-3" />
                  {t(`assistant.prompts.${p.id}.label`)}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t("assistant.inputPlaceholder")}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || aiChat.isPending}
              size="icon"
              className="h-11 w-11 glow-sm flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            {t("assistant.footerHint")}
          </p>
        </div>
      </Card>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("assistant.dialogs.rename.title")}</DialogTitle>
            <DialogDescription>
              {t("assistant.dialogs.rename.description")}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRename} disabled={renameMutation.isPending}>
              {renameMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {t("assistant.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("assistant.report.title")}
            </DialogTitle>
            <DialogDescription>
              {t("assistant.report.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {!report ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ReportView report={report} t={t} projectId={projectId} />
            )}
          </div>
          {report && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setReportOpen(false)}>
                {t("common.close")}
              </Button>
              <Button onClick={downloadReport}>
                <Download className="h-4 w-4 mr-2" />
                {t("assistant.report.download")}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Report view + markdown renderer ─────────────────────────────────────

function ReportView({
  report,
  t,
  projectId,
}: {
  report: AIReportResponse;
  t: ReturnType<typeof useTranslation>["t"];
  projectId: string;
}) {
  return (
    <div className="space-y-5 text-sm">
      {report.executive_summary && (
        <section>
          <h3 className="font-display font-semibold text-base mb-2">
            {t("assistant.report.sections.executive")}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {report.executive_summary}
          </p>
        </section>
      )}

      {report.sentiment_overview && (
        <section>
          <h3 className="font-display font-semibold text-base mb-2">
            {t("assistant.report.sections.sentiment")}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {report.sentiment_overview}
          </p>
        </section>
      )}

      {Array.isArray(report.key_findings) && report.key_findings.length > 0 && (
        <section>
          <h3 className="font-display font-semibold text-base mb-2">
            {t("assistant.report.sections.findings")}
          </h3>
          <div className="space-y-2">
            {report.key_findings.map((f, i) => (
              <div key={i} className="rounded-lg border border-border/50 p-3 bg-muted/30">
                <p className="font-medium">{f.title}</p>
                <p className="text-muted-foreground mt-1">{f.detail}</p>
                {Array.isArray(f.mention_ids) && f.mention_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {f.mention_ids.slice(0, 5).map((id) => (
                      <Link
                        key={id}
                        href={`/projects/${projectId}/mentions?highlight=${id}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        m:{id.slice(0, 6)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(report.top_sources) && report.top_sources.length > 0 && (
        <section>
          <h3 className="font-display font-semibold text-base mb-2">
            {t("assistant.report.sections.sources")}
          </h3>
          <ul className="space-y-1">
            {report.top_sources.map((s, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="font-medium">{s.name}</span>
                <Badge variant="secondary">{s.mentions}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {Array.isArray(report.risks) && report.risks.length > 0 && (
        <section>
          <h3 className="font-display font-semibold text-base mb-2 text-red-500">
            {t("assistant.report.sections.risks")}
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {report.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {Array.isArray(report.opportunities) && report.opportunities.length > 0 && (
        <section>
          <h3 className="font-display font-semibold text-base mb-2 text-green-500">
            {t("assistant.report.sections.opportunities")}
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {report.opportunities.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {Array.isArray(report.recommendations) && report.recommendations.length > 0 && (
        <section>
          <h3 className="font-display font-semibold text-base mb-2">
            {t("assistant.report.sections.recommendations")}
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {report.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {report.raw && (
        <p className="text-xs text-muted-foreground">
          (Raw JSON could not be parsed; showing executive summary only.)
        </p>
      )}
    </div>
  );
}

function renderReportToMarkdown(r: AIReportResponse): string {
  const lines: string[] = [];
  lines.push(`# AI Report`);
  if (r.generated_at) {
    lines.push(`_Generated: ${r.generated_at}_`);
  }
  lines.push("");
  if (r.executive_summary) {
    lines.push(`## Executive Summary`);
    lines.push(r.executive_summary);
    lines.push("");
  }
  if (r.sentiment_overview) {
    lines.push(`## Sentiment Overview`);
    lines.push(r.sentiment_overview);
    lines.push("");
  }
  if (Array.isArray(r.key_findings) && r.key_findings.length) {
    lines.push(`## Key Findings`);
    r.key_findings.forEach((f) => {
      lines.push(`- **${f.title}** — ${f.detail}`);
      if (Array.isArray(f.mention_ids) && f.mention_ids.length) {
        lines.push(`  - sources: ${f.mention_ids.map((id) => `[m:${id}]`).join(" ")}`);
      }
    });
    lines.push("");
  }
  if (Array.isArray(r.top_sources) && r.top_sources.length) {
    lines.push(`## Top Sources`);
    r.top_sources.forEach((s) => {
      lines.push(`- ${s.name} — ${s.mentions} mentions`);
    });
    lines.push("");
  }
  if (Array.isArray(r.risks) && r.risks.length) {
    lines.push(`## Risks`);
    r.risks.forEach((x) => lines.push(`- ${x}`));
    lines.push("");
  }
  if (Array.isArray(r.opportunities) && r.opportunities.length) {
    lines.push(`## Opportunities`);
    r.opportunities.forEach((x) => lines.push(`- ${x}`));
    lines.push("");
  }
  if (Array.isArray(r.recommendations) && r.recommendations.length) {
    lines.push(`## Recommendations`);
    r.recommendations.forEach((x) => lines.push(`- ${x}`));
    lines.push("");
  }
  if (r.meta?.model) {
    lines.push(`---`);
    lines.push(
      `_Model: ${r.meta.model} · tokens: ${r.meta.tokens_used ?? "n/a"}_`
    );
  }
  return lines.join("\n");
}
