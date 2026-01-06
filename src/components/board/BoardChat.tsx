import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { CardModal } from "@/components/board/CardModal";
import { Send, HelpCircle, User, StickyNote } from "lucide-react";

interface BoardChatProps {
  boardId: Id<"boards">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MentionType = "user" | "card" | null;

export function BoardChat({ boardId, open, onOpenChange }: BoardChatProps) {
  const messages = useQuery(api.messages.list, { boardId });
  const currentUser = useQuery(api.users.currentUser);
  const members = useQuery(api.boards.getMembers, { boardId });
  const cards = useQuery(api.cards.listByBoard, { boardId });
  const sendMessage = useMutation(api.messages.send);
  const markAsRead = useMutation(api.messages.markAsRead);

  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mentionType, setMentionType] = useState<MentionType>(null);
  const [mentionSearch, setMentionSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<Doc<"cards"> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Reset selected index when mention search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionSearch, mentionType]);

  // Filter suggestions based on search
  const userSuggestions = useMemo(() => {
    if (mentionType !== "user" || !members) return [];
    const search = mentionSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.name?.toLowerCase().includes(search) ||
        m.email?.toLowerCase().includes(search)
    );
  }, [members, mentionSearch, mentionType]);

  const cardSuggestions = useMemo(() => {
    if (mentionType !== "card" || !cards) return [];
    const search = mentionSearch.toLowerCase();
    return cards.filter((c) => c.title.toLowerCase().includes(search));
  }, [cards, mentionSearch, mentionType]);

  const suggestions = mentionType === "user" ? userSuggestions : cardSuggestions;

  const handleSend = async () => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({ boardId, content: content.trim() });
      setContent("");
      setMentionType(null);
      // Keep focus on input after sending
      inputRef.current?.focus();
    } catch {
      // Error handling
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContent(value);

    // Detect mention triggers
    const cursorPos = e.target.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);

    // Find the last @ or ! before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const lastExclamationIndex = textBeforeCursor.lastIndexOf("!");

    // Check if we're in a mention context (no space between trigger and cursor)
    if (lastAtIndex !== -1 && !textBeforeCursor.slice(lastAtIndex).includes(" ")) {
      setMentionType("user");
      setMentionSearch(textBeforeCursor.slice(lastAtIndex + 1));
    } else if (lastExclamationIndex !== -1 && !textBeforeCursor.slice(lastExclamationIndex).includes(" ")) {
      setMentionType("card");
      setMentionSearch(textBeforeCursor.slice(lastExclamationIndex + 1));
    } else {
      setMentionType(null);
      setMentionSearch("");
    }
  };

  const insertMention = (text: string) => {
    const cursorPos = inputRef.current?.selectionStart ?? content.length;
    const textBeforeCursor = content.slice(0, cursorPos);

    // Find where the mention started
    const triggerChar = mentionType === "user" ? "@" : "!";
    const triggerIndex = textBeforeCursor.lastIndexOf(triggerChar);

    if (triggerIndex !== -1) {
      const beforeTrigger = content.slice(0, triggerIndex);
      const afterCursor = content.slice(cursorPos);
      const newContent = `${beforeTrigger}${triggerChar}${text} ${afterCursor}`;
      setContent(newContent);
    }

    setMentionType(null);
    setMentionSearch("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionType && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        if (selected) {
          if (mentionType === "user") {
            const user = selected as (typeof userSuggestions)[0];
            insertMention(user.name ?? user.email ?? "");
          } else {
            const card = selected as (typeof cardSuggestions)[0];
            insertMention(card.title);
          }
        }
      } else if (e.key === "Escape") {
        setMentionType(null);
        setMentionSearch("");
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCardMentionClick = (cardTitle: string) => {
    // Find the card by title
    const card = cards?.find((c) => c.title === cardTitle);
    if (card) {
      setSelectedCard(card);
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

  // Render message content with highlighted mentions
  const renderMessageContent = (text: string, isOwn: boolean) => {
    // Simple regex to find @mentions and !cards
    const parts = text.split(/(@\S+|!\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("!")) {
        // Card mention - clickable
        const cardTitle = part.slice(1);
        return (
          <button
            key={i}
            className={`font-semibold underline decoration-2 underline-offset-2 hover:opacity-80 ${
              isOwn ? "text-primary-foreground" : "text-foreground"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleCardMentionClick(cardTitle);
            }}
          >
            {part}
          </button>
        );
      } else if (part.startsWith("@")) {
        // User mention - just styled
        return (
          <span
            key={i}
            className={`font-semibold ${
              isOwn ? "text-primary-foreground" : "text-foreground"
            }`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col p-0 sm:max-w-md">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>Team Chat</SheetTitle>
            <SheetDescription className="sr-only">
              Chat with your team members
            </SheetDescription>
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
                                  {renderMessageContent(message.content, isOwn)}
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
            {/* Mention suggestions popup */}
            {mentionType && suggestions.length > 0 && (
              <div className="mb-2 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {mentionType === "user" ? "Team Members" : "Cards"}
                </div>
                {mentionType === "user"
                  ? userSuggestions.map((user, index) => (
                      <button
                        key={user._id}
                        className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none ${
                          index === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        }`}
                        onClick={() => insertMention(user.name ?? user.email ?? "")}
                      >
                        <User className="h-4 w-4" />
                        <span>{user.name ?? user.email}</span>
                        {user.name && (
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        )}
                      </button>
                    ))
                  : cardSuggestions.map((card, index) => (
                      <button
                        key={card._id}
                        className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none ${
                          index === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        }`}
                        onClick={() => insertMention(card.title)}
                      >
                        <StickyNote className="h-4 w-4" />
                        <span className="truncate">{card.title}</span>
                      </button>
                    ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Type @ for users, ! for cards..."
                value={content}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isSending}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold">Shortcuts</p>
                      <div className="flex items-center gap-2">
                        <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">@</kbd>
                        <span>Mention a team member</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">!</kbd>
                        <span>Reference a card (clickable)</span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

      {/* Card Modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          boardId={boardId}
          open={!!selectedCard}
          onOpenChange={(open) => {
            if (!open) setSelectedCard(null);
          }}
        />
      )}
    </>
  );
}
