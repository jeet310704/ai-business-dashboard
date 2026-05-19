import { Bot, User } from "lucide-react";
import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <article
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-muted" : "bg-primary/15"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </span>
      <div className={cn("max-w-[85%] space-y-1", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "border border-border/60 bg-card"
          )}
        >
          {message.content}
        </div>
        <p className={cn("text-xs text-muted-foreground", isUser && "text-right")}>
          {message.timestamp}
        </p>
      </div>
    </article>
  );
}
