"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import type { ChatMessage, PromptSuggestion } from "@/types";
import { MessageBubble } from "@/components/assistant/message-bubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  initialMessages: ChatMessage[];
  suggestions: PromptSuggestion[];
}

export function ChatPanel({ initialMessages, suggestions }: ChatPanelProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "Based on your uploaded sales data, I can help analyze that. This is a mock response — AI integration will be available in a future release. Try asking about revenue trends, product performance, or category growth.",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <Card className="flex h-[calc(100vh-12rem)] min-h-[500px] flex-col">
      <CardHeader className="shrink-0 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
          <div>
            <CardTitle className="text-base">AI Business Assistant</CardTitle>
            <p className="text-xs text-muted-foreground">
              Ask questions about your business data
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isTyping && (
            <article className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              </span>
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                </span>
              </div>
            </article>
          )}
        </div>

        <div className="shrink-0 border-t border-border/60 p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Suggested prompts</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSend(s.text)}
                disabled={isTyping}
                className={cn(
                  "rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                )}
              >
                {s.text}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
          >
            <Input
              placeholder="Ask about your business..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isTyping || !input.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
