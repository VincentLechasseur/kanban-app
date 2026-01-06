import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { Send } from "lucide-react";

interface BoardChatProps {
  boardId: Id<"boards">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardChat({ boardId, open, onOpenChange }: BoardChatProps) {
  const messages = useQuery(api.messages.list, { boardId });
  const currentUser = useQuery(api.users.currentUser);
  const sendMessage = useMutation(api.messages.send);
  const markAsRead = useMutation(api.messages.markAsRead);

  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mark as read when chat is opened
  useEffect(() => {
    if (open) {
      markAsRead({ boardId });
    }
  }, [open, boardId, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({ boardId, content: content.trim() });
      setContent("");
    } catch {
      // Error handling - toast could be added here
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: NonNullable<typeof messages> }[] = [];
  let currentDate = "";

  messages?.forEach((message) => {
    const date = formatDate(message.createdAt);
    if (date !== currentDate) {
      currentDate = date;
      groupedMessages.push({ date, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(message);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Team Chat</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          {messages === undefined ? (
            <div className="flex h-full items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-8">
              <p className="text-center text-sm text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="mb-2 flex justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {group.date}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {group.messages.map((message) => {
                      const isOwn = message.userId === currentUser?._id;
                      return (
                        <div
                          key={message._id}
                          className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                        >
                          <UserAvatar
                            userId={message.user._id}
                            name={message.user.name}
                            email={message.user.email}
                            image={message.user.image}
                            className="h-8 w-8 shrink-0"
                            fallbackClassName="text-xs"
                          />
                          <div
                            className={`flex max-w-[70%] flex-col ${isOwn ? "items-end" : ""}`}
                          >
                            <div
                              className={`rounded-lg px-3 py-2 ${
                                isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            </div>
                            <span className="mt-1 text-xs text-muted-foreground">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!content.trim() || isSending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
