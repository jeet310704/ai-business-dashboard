"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataScopeFilter } from "@/components/dashboard/data-scope-filter";
import type { DataScopeFilter as DataScopeFilterType } from "@/lib/data-scope";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types";

interface ServerChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface DatasetSummary {
  sales: number;
  expenses: number;
  inventory: number;
  customers: number;
  insights: number;
}

interface ChatHistoryResponse {
  messages: ServerChatMessage[];
  datasetSummary: DatasetSummary;
}

export default function AiChatClient() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [datasetSummary, setDatasetSummary] = useState<DatasetSummary | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<DataScopeFilterType>({ timeScope: "all_time" });

  async function loadHistory() {
    setInitialLoading(true);
    console.log("[DEBUG] AiChatClient: Loading history with scope:", scope);
    
    try {
      const response = await fetch("/api/ai-chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load chat history");
      }
      const json = await response.json();
      console.log("[DEBUG] AiChatClient: History API Response:", json);

      const messagesData: ServerChatMessage[] = Array.isArray(json)
        ? json
        : Array.isArray((json as any).messages)
        ? (json as any).messages
        : [];

      const datasetData: DatasetSummary = !Array.isArray(json) && (json as any).datasetSummary
        ? (json as any).datasetSummary
        : { sales: 0, expenses: 0, inventory: 0, customers: 0, insights: 0 };

      const formattedMessages: ChatMessage[] = messagesData.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
      setMessages(formattedMessages);
      setDatasetSummary(datasetData);
    } catch (err) {
      setError("Failed to load chat history");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
    // reload when scope changes after Apply is clicked
  }, [router, scope]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    const filters = scope;
    console.log("Sending scope filters to API:", filters);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, scope }),
      });
      const data = await response.json();
      console.log("[DEBUG] AiChatClient: Chat API Response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const assistantMessage: ChatMessage = {
        id: `temp-${Date.now()}-assistant`,
        role: "assistant",
        content: data.message,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <DataScopeFilter onChange={setScope} />
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm text-muted-foreground">
          <p>
            💡 <strong>AI Business Analyst</strong>
          </p>
          <p className="mt-2">
            Ask questions about your sales, expenses, inventory, customers, and insights. I'll analyze your real business data and provide actionable
            recommendations.
          </p>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">No chat history yet</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {datasetSummary && Object.values(datasetSummary).some((count) => count > 0)
              ? "Your data is detected. Ask your first question below."
              : "Upload business data to get started, then ask questions about your analytics."}
          </p>
          <div className="mt-4 grid gap-2 text-left text-sm">
            {datasetSummary ? (
              Object.entries(datasetSummary).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 bg-background">
                  <span className="capitalize">{key.replace("insights", "AI insights")}</span>
                  <span className={count > 0 ? "text-emerald-400" : "text-muted-foreground"}>
                    {count} detected
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-border px-3 py-2 bg-background text-muted-foreground">
                Dataset status unavailable.
              </div>
            )}
          </div>
          <Link
            href="/uploads"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Upload Data
          </Link>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted text-foreground"
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <p className={`mt-1 text-xs ${msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start gap-3">
                <div className="max-w-xs rounded-lg border border-border bg-muted px-4 py-2 text-sm text-foreground">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about your business analytics..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={loading}
            className="bg-background"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon" className="shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Press Enter to send or Shift+Enter for new line</p>
      </div>
    </div>
  );
}
