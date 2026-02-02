"use client";

import { use, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Plus,
  MessageSquare,
  Sparkles,
  FileText,
  Filter,
  Lightbulb,
  Copy,
  RotateCcw,
  Trash2,
  MoreHorizontal,
  Clock,
  Loader2,
  Twitter,
  Mail,
  Users,
  Pencil,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks";

interface AssistantPageProps {
  params: Promise<{ projectId: string }>;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

const quickPrompts = [
  { id: "1", icon: Clock, label: "Summarize last 24h", prompt: "Summarize all mentions from the last 24 hours" },
  { id: "2", icon: Mail, label: "Draft PR reply", prompt: "Draft a professional PR response to address recent negative mentions" },
  { id: "3", icon: Twitter, label: "Create tweet thread", prompt: "Create a Twitter thread highlighting our recent positive coverage" },
  { id: "4", icon: Users, label: "Top influencers", prompt: "Identify the top influencers who mentioned our brand this week" },
  { id: "5", icon: Sparkles, label: "Key insights", prompt: "What are the key insights from this week's media coverage?" },
  { id: "6", icon: Lightbulb, label: "Recommendations", prompt: "What actions should we take based on current sentiment trends?" },
];

const suggestedPrompts = [
  "What's driving the negative sentiment spike?",
  "Compare our coverage to last month",
  "Which topics are trending in our mentions?",
  "Summarize competitor mentions",
];

// Mock initial data
const initialChats: Chat[] = [
  {
    id: "1",
    title: "Weekly Summary Analysis",
    lastMessage: "Based on the data, here are the key takeaways...",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    messages: [
      { id: "1", role: "user", content: "Give me a summary of this week's media coverage", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      { id: "2", role: "assistant", content: "Based on the data from this week, here are the key takeaways:\n\n📊 **Overview**\n- Total mentions: 2,847 (+12% vs last week)\n- Social reach: 1.2M impressions\n- Sentiment: 72% positive, 18% neutral, 10% negative\n\n🔥 **Top Stories**\n1. Product launch coverage on TechCrunch drove 40% of mentions\n2. CEO interview on Bloomberg reached 500K viewers\n3. Community discussion on Reddit about new features\n\n⚠️ **Areas of Concern**\n- Minor complaints about pricing on Twitter\n- Some users reporting bugs in v2.0 release\n\nWould you like me to dive deeper into any of these areas?", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    ],
  },
  {
    id: "2",
    title: "Competitor Analysis",
    lastMessage: "Competitor A has seen a 15% increase...",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    messages: [],
  },
  {
    id: "3",
    title: "Sentiment Breakdown",
    lastMessage: "The negative sentiment is mainly coming from...",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    messages: [],
  },
];

export default function AssistantPage({ params }: AssistantPageProps) {
  const { projectId } = use(params);
  const { t } = useTranslation();
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [activeChat, setActiveChat] = useState<Chat>(initialChats[0]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [activeChat.messages]);
  
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    const updatedChat = {
      ...activeChat,
      messages: [...activeChat.messages, userMessage],
      lastMessage: input,
      timestamp: new Date(),
    };
    
    setActiveChat(updatedChat);
    setChats(chats.map(c => c.id === activeChat.id ? updatedChat : c));
    setInput("");
    setIsLoading(true);
    
    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: generateMockResponse(input),
      timestamp: new Date(),
    };
    
    const finalChat = {
      ...updatedChat,
      messages: [...updatedChat.messages, aiResponse],
      lastMessage: aiResponse.content.slice(0, 50) + "...",
    };
    
    setActiveChat(finalChat);
    setChats(chats.map(c => c.id === activeChat.id ? finalChat : c));
    setIsLoading(false);
  };
  
  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };
  
  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      lastMessage: "",
      timestamp: new Date(),
      messages: [],
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat);
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };
  
  return (
    <div className="h-[calc(100vh-7rem)] flex gap-6">
      {/* Chat History Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Chats</h2>
          <Button size="sm" onClick={createNewChat}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  activeChat.id === chat.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{chat.title}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(chat.timestamp)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{chat.lastMessage || "No messages yet"}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
        
        {/* Quick Prompts */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Quick Prompts</p>
          <div className="space-y-2">
            {quickPrompts.slice(0, 4).map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => handleQuickPrompt(prompt.prompt)}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-muted/50 transition-colors"
              >
                <prompt.icon className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate">{prompt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <Card className="flex-1 glass flex flex-col overflow-hidden">
        {/* Chat Header */}
        <CardHeader className="border-b border-border/50 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">{activeChat.title}</CardTitle>
                <p className="text-xs text-muted-foreground">AI Brand Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <FileText className="h-4 w-4 mr-2" />
                    Create Report
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Filter className="h-4 w-4 mr-2" />
                    Apply as Filter
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Save as Insight
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {activeChat.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Start a conversation</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-6">
                  Ask me anything about your media mentions, sentiment, trends, or get recommendations.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="px-3 py-1.5 rounded-full bg-muted/50 text-sm hover:bg-muted transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {activeChat.messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "flex-row-reverse" : ""
                    )}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={cn(
                        "text-xs",
                        message.role === "assistant" ? "bg-primary/10 text-primary" : "bg-muted"
                      )}>
                        {message.role === "assistant" ? <Bot className="h-4 w-4" /> : "U"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={cn(
                      "max-w-[70%] space-y-1",
                      message.role === "user" ? "items-end" : ""
                    )}>
                      <div className={cn(
                        "p-3 rounded-2xl",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted/50 rounded-tl-sm"
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
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
        
        {/* Input Area */}
        <div className="p-4 border-t border-border/50 flex-shrink-0">
          {/* Suggested prompts */}
          {activeChat.messages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {quickPrompts.slice(0, 3).map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => handleQuickPrompt(prompt.prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs whitespace-nowrap hover:bg-muted transition-colors"
                >
                  <prompt.icon className="h-3 w-3" />
                  {prompt.label}
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
              placeholder="Ask anything about your media data..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 glow-sm flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-2">
            AI responses are generated based on your project data. Press Enter to send.
          </p>
        </div>
      </Card>
    </div>
  );
}

function generateMockResponse(input: string): string {
  const responses = [
    "Based on your media data analysis, I found several key insights:\n\n📊 **Key Findings**\n- Sentiment has improved 5% over the past week\n- Most discussions are happening on Twitter and tech blogs\n- Your brand was mentioned 234 times in the last 24 hours\n\n💡 **Recommendations**\n1. Engage with the positive mentions on social media\n2. Address the pricing concerns mentioned in forums\n3. Consider a press release for the upcoming feature\n\nWould you like me to elaborate on any of these points?",
    "I've analyzed the data and here's what I found:\n\n🔍 **Analysis Summary**\n- Total reach: 1.2M impressions\n- Peak engagement: Tuesday 2-4 PM\n- Top influencer mentions: 12\n\n📈 **Trends**\n- AI-related discussions are up 40%\n- Competitor mentions decreased by 15%\n- User sentiment is predominantly positive (78%)\n\nIs there a specific area you'd like me to focus on?",
    "Here's my assessment:\n\n⚡ **Quick Stats**\n- 847 new mentions today\n- Sentiment score: 7.2/10\n- Share of voice: 34%\n\n🎯 **Action Items**\n1. The viral tweet about your product reached 50K impressions - consider amplifying\n2. A tech blogger wrote a detailed review - engage in comments\n3. Competitor launched a new feature - monitor reactions\n\nLet me know if you need more details!",
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}










