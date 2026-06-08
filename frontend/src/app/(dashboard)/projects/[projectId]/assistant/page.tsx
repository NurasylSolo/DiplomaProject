"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  useAiChat,
  useChats,
  useChatMessages,
  useDeleteChat,
  useGenerateAiReport,
  useRenameChat,
  useTranslation,
  useMediaQuery,
} from "@/hooks";
import {
  ChatHeader,
  ChatSidebar,
  MessageInput,
  MessageList,
  RenameDialog,
  ReportDialog,
  downloadMarkdown,
  renderReportToMarkdown,
  useCitedMentions,
} from "@/features/assistant";
import type { AIReportResponse, ChatMessageDto } from "@/lib/api/services/ai";

interface AssistantPageProps {
  params: Promise<{ projectId: string }>;
}

export default function AssistantPage({ params }: AssistantPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [chatListOpen, setChatListOpen] = useState(false);

  // ── data
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

  // ── local UI state
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Optimistic messages for instant UX while waiting for backend response.
  const [optimistic, setOptimistic] = useState<ChatMessageDto[]>([]);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState<AIReportResponse | null>(null);

  // ── side-effects
  useEffect(() => {
    if (!activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) {
      setInput(prefill);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [searchParams]);

  useEffect(() => {
    setOptimistic([]);
  }, [activeChatId]);

  // Auto-scroll to bottom on new messages — but only if the user is
  // already near the bottom (so we don't yank them away while reading).
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 200 || optimistic.length > 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages, optimistic, aiChat.isPending]);

  // ── derived
  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const visibleMessages: ChatMessageDto[] = useMemo(
    () => [...messages, ...optimistic],
    [messages, optimistic]
  );
  const mentionsById = useCitedMentions(projectId, visibleMessages);

  const suggestedPrompts: string[] = useMemo(
    () => [
      t("assistant.prompts.suggested.0"),
      t("assistant.prompts.suggested.1"),
      t("assistant.prompts.suggested.2"),
      t("assistant.prompts.suggested.3"),
      t("assistant.prompts.suggested.4"),
      t("assistant.prompts.suggested.5"),
    ],
    [t]
  );

  // ── actions
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
      if (!activeChatId && response?.chat_id) {
        setActiveChatId(response.chat_id);
      }
      setOptimistic([]);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("assistant.errors.failed");
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
      // ignore clipboard failures (older browsers / permissions)
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

  const handleDownloadReport = () => {
    if (!report) return;
    const filename = `report_${projectId.slice(0, 8)}_${new Date()
      .toISOString()
      .slice(0, 10)}.md`;
    downloadMarkdown(filename, renderReportToMarkdown(report));
  };

  const handleQuickPrompt = (key: string) => {
    setInput(t(`assistant.prompts.${key}.prompt`));
    textareaRef.current?.focus();
  };

  const chatSidebar = (
    <ChatSidebar
      chats={chats}
      chatsLoading={chatsLoading}
      activeChatId={activeChatId}
      onSelectChat={(id) => {
        setActiveChatId(id);
        setChatListOpen(false);
      }}
      onNewChat={() => {
        handleNewChat();
        setChatListOpen(false);
      }}
      onRenameRequest={(chat) => {
        setActiveChatId(chat.id);
        setRenameValue(chat.title || "");
        setRenameOpen(true);
      }}
      onDelete={handleDelete}
      onQuickPrompt={handleQuickPrompt}
    />
  );

  const chatPanel = (
    <Card className="glass flex flex-col overflow-hidden h-full">
      <ChatHeader
        activeChat={activeChat}
        activeChatId={activeChatId}
        isReportPending={reportMutation.isPending}
        onGenerateReport={handleGenerateReport}
        onRequestRename={() => {
          setRenameValue(activeChat?.title || "");
          setRenameOpen(true);
        }}
        onDelete={() => activeChatId && handleDelete(activeChatId)}
        onToggleSidebar={!isDesktop ? () => setChatListOpen(true) : undefined}
      />

      <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
        <MessageList
          ref={messagesScrollRef}
          endRef={messagesEndRef}
          visibleMessages={visibleMessages}
          messagesLoading={messagesLoading}
          optimisticPending={optimistic.length > 0}
          isAiPending={aiChat.isPending}
          mentionsById={mentionsById}
          suggestedPrompts={suggestedPrompts}
          onSuggestedClick={(prompt) => {
            setInput(prompt);
            textareaRef.current?.focus();
          }}
          onCopy={handleCopy}
        />

        <MessageInput
          ref={textareaRef}
          value={input}
          onChange={setInput}
          onSend={handleSend}
          isPending={aiChat.isPending}
          showQuickPrompts={visibleMessages.length > 0}
          onQuickPrompt={handleQuickPrompt}
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="h-[calc(100vh-7rem)] min-h-[500px]">
      {isDesktop ? (
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="assistant-layout"
          className="h-full rounded-lg"
        >
          <ResizablePanel
            defaultSize={22}
            minSize={15}
            maxSize={40}
            collapsible={false}
          >
            {chatSidebar}
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={78} minSize={40} className="pl-3">
            {chatPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <>
          <div className="h-full">{chatPanel}</div>
          <Sheet open={chatListOpen} onOpenChange={setChatListOpen}>
            <SheetContent side="left" className="w-[300px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>{t("assistant.chats", { defaultValue: "Chats" })}</SheetTitle>
              </SheetHeader>
              <div className="h-full">{chatSidebar}</div>
            </SheetContent>
          </Sheet>
        </>
      )}

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        value={renameValue}
        onChange={setRenameValue}
        onSubmit={handleRename}
        isPending={renameMutation.isPending}
      />

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        report={report}
        projectId={projectId}
        mentionsById={mentionsById}
        onDownload={handleDownloadReport}
      />
    </div>
  );
}
