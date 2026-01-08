import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { CardModal } from "@/components/board/CardModal";
import {
  Send,
  HelpCircle,
  User,
  StickyNote,
  MessageCircle,
  Minus,
  X,
  GripHorizontal,
  Users,
  Pencil,
  Trash2,
  Search,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardChatProps {
  boardId: Id<"boards">;
  state: "hidden" | "minimized" | "expanded";
  onStateChange: (state: "hidden" | "minimized" | "expanded") => void;
}

type MentionType = "user" | "card" | null;

const MIN_HEIGHT = 200;
const MAX_HEIGHT_VH = 70;
const DEFAULT_HEIGHT = 350;
const STORAGE_KEY = "boardChatHeight";

export function BoardChat({ boardId, state, onStateChange }: BoardChatProps) {
  const messages = useQuery(api.messages.list, { boardId });
  const currentUser = useQuery(api.users.currentUser);
  const members = useQuery(api.boards.getMembers, { boardId });
  const cards = useQuery(api.cards.listByBoard, { boardId });
  const hasUnread = useQuery(api.messages.hasUnread, { boardId });
  const sendMessage = useMutation(api.messages.send);
  const markAsRead = useMutation(api.messages.markAsRead);
  const updateMessage = useMutation(api.messages.update);
  const deleteMessage = useMutation(api.messages.remove);
  const createChatMentionNotification = useMutation(
    api.notifications.createChatMentionNotification
  );

  // Typing indicator
  const typingUsers = useQuery(api.typing.getTyping, { boardId });
  const setTyping = useMutation(api.typing.setTyping);
  const clearTyping = useMutation(api.typing.clearTyping);

  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mentionType, setMentionType] = useState<MentionType>(null);
  const [mentionSearch, setMentionSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<Doc<"cards"> | null>(null);

  // Edit/delete state
  const [editingMessageId, setEditingMessageId] = useState<Id<"messages"> | null>(null);
  const [editContent, setEditContent] = useState("");

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = useQuery(
    api.messages.search,
    searchQuery.trim() ? { boardId, query: searchQuery } : "skip"
  );

  // Typing indicator debounce
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [height, setHeight] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_HEIGHT;
    return parseInt(localStorage.getItem(STORAGE_KEY) ?? String(DEFAULT_HEIGHT));
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Mark as read when chat is expanded
  useEffect(() => {
    if (state === "expanded") {
      markAsRead({ boardId });
    }
  }, [state, boardId, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current && state === "expanded") {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, state]);

  // Scroll to bottom when chat expands (after animation)
  useEffect(() => {
    if (state === "expanded") {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Reset selected index when mention search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionSearch, mentionType]);

  // Persist height to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(height));
  }, [height]);

  // Handle resize drag
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startY = e.clientY;
      const startHeight = height;
      const maxHeight = window.innerHeight * (MAX_HEIGHT_VH / 100);

      const handleMouseMove = (e: MouseEvent) => {
        const deltaY = startY - e.clientY;
        const newHeight = Math.min(Math.max(startHeight + deltaY, MIN_HEIGHT), maxHeight);
        setHeight(newHeight);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [height]
  );

  // Filter suggestions based on search (exclude current user from mentions)
  const userSuggestions = useMemo(() => {
    if (mentionType !== "user" || !members || !currentUser) return [];
    const search = mentionSearch.toLowerCase();
    return members.filter(
      (m) =>
        m._id !== currentUser._id &&
        (m.name?.toLowerCase().includes(search) || m.email?.toLowerCase().includes(search))
    );
  }, [members, mentionSearch, mentionType, currentUser]);

  const cardSuggestions = useMemo(() => {
    if (mentionType !== "card" || !cards) return [];
    const search = mentionSearch.toLowerCase();
    return cards.filter((c) => c.title.toLowerCase().includes(search));
  }, [cards, mentionSearch, mentionType]);

  const suggestions = mentionType === "user" ? userSuggestions : cardSuggestions;

  // Parse user mentions from message content
  const parseUserMentions = useCallback(
    (text: string): Id<"users">[] => {
      if (!members || members.length === 0) return [];

      const mentionedUserIds: Id<"users">[] = [];
      const bracketMentionRegex = /@\[([^\]]+)\]/g;
      const simpleMentionRegex = /@(\S+)/g;

      let match;
      while ((match = bracketMentionRegex.exec(text)) !== null) {
        const mentionName = match[1].trim();
        const user = members.find(
          (m) =>
            m.name?.toLowerCase() === mentionName.toLowerCase() ||
            m.email?.toLowerCase() === mentionName.toLowerCase()
        );
        if (user && !mentionedUserIds.includes(user._id)) {
          mentionedUserIds.push(user._id);
        }
      }

      const textWithoutBrackets = text.replace(/@\[[^\]]+\]/g, "");
      while ((match = simpleMentionRegex.exec(textWithoutBrackets)) !== null) {
        const mentionName = match[1].trim();
        const user = members.find(
          (m) =>
            m.name?.toLowerCase() === mentionName.toLowerCase() ||
            m.email?.toLowerCase() === mentionName.toLowerCase()
        );
        if (user && !mentionedUserIds.includes(user._id)) {
          mentionedUserIds.push(user._id);
        }
      }

      return mentionedUserIds;
    },
    [members]
  );

  const handleSend = async () => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    const messageContent = content.trim();

    try {
      const messageId = await sendMessage({ boardId, content: messageContent });

      const mentionedUserIds = parseUserMentions(messageContent);
      for (const mentionedUserId of mentionedUserIds) {
        try {
          await createChatMentionNotification({
            mentionedUserId,
            boardId,
            messageId,
          });
        } catch (notifError) {
          console.error("Failed to create notification:", notifError);
        }
      }

      setContent("");
      setMentionType(null);
      clearTyping({ boardId });
      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Edit message handlers
  const startEditing = (messageId: Id<"messages">, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditContent(currentContent);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;
    try {
      await updateMessage({ id: editingMessageId, content: editContent.trim() });
      setEditingMessageId(null);
      setEditContent("");
    } catch (error) {
      console.error("Failed to update message:", error);
    }
  };

  const handleDelete = async (messageId: Id<"messages">) => {
    try {
      await deleteMessage({ id: messageId });
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  // Trigger typing indicator
  const triggerTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping({ boardId });
    typingTimeoutRef.current = setTimeout(() => {
      clearTyping({ boardId });
    }, 3000);
  }, [boardId, setTyping, clearTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContent(value);

    // Trigger typing indicator
    if (value.trim()) {
      triggerTyping();
    }

    const cursorPos = e.target.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);

    const lastAtBracket = textBeforeCursor.lastIndexOf("@[");
    const lastExclamationBracket = textBeforeCursor.lastIndexOf("![");

    if (lastAtBracket !== -1 && !textBeforeCursor.slice(lastAtBracket).includes("]")) {
      setMentionType("user");
      setMentionSearch(textBeforeCursor.slice(lastAtBracket + 2));
      return;
    }
    if (
      lastExclamationBracket !== -1 &&
      !textBeforeCursor.slice(lastExclamationBracket).includes("]")
    ) {
      setMentionType("card");
      setMentionSearch(textBeforeCursor.slice(lastExclamationBracket + 2));
      return;
    }

    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const lastExclamationIndex = textBeforeCursor.lastIndexOf("!");

    if (
      lastAtIndex !== -1 &&
      lastAtIndex > lastAtBracket &&
      !textBeforeCursor.slice(lastAtIndex).includes(" ")
    ) {
      setMentionType("user");
      setMentionSearch(textBeforeCursor.slice(lastAtIndex + 1));
    } else if (
      lastExclamationIndex !== -1 &&
      lastExclamationIndex > lastExclamationBracket &&
      !textBeforeCursor.slice(lastExclamationIndex).includes(" ")
    ) {
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

    const triggerChar = mentionType === "user" ? "@" : "!";
    const bracketTrigger = `${triggerChar}[`;
    const bracketIndex = textBeforeCursor.lastIndexOf(bracketTrigger);
    const simpleIndex = textBeforeCursor.lastIndexOf(triggerChar);

    const inBracketMode =
      bracketIndex !== -1 && !textBeforeCursor.slice(bracketIndex).includes("]");

    const needsBrackets = text.includes(" ") || inBracketMode;

    if (inBracketMode) {
      const beforeTrigger = content.slice(0, bracketIndex);
      const afterCursor = content.slice(cursorPos);
      const newContent = `${beforeTrigger}${triggerChar}[${text}] ${afterCursor}`;
      setContent(newContent);
    } else if (simpleIndex !== -1) {
      const beforeTrigger = content.slice(0, simpleIndex);
      const afterCursor = content.slice(cursorPos);
      if (needsBrackets) {
        const newContent = `${beforeTrigger}${triggerChar}[${text}] ${afterCursor}`;
        setContent(newContent);
      } else {
        const newContent = `${beforeTrigger}${triggerChar}${text} ${afterCursor}`;
        setContent(newContent);
      }
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
    } else if (e.key === "Escape") {
      onStateChange("minimized");
    }
  };

  const handleCardMentionClick = (cardTitle: string) => {
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

  const renderMessageContent = (text: string, isOwn: boolean) => {
    const mentionRegex = /(@\[[^\]]+\]|!\[[^\]]+\]|@\S+|!\S+)/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, i) => {
      if (part.startsWith("![")) {
        const cardTitle = part.slice(2, -1);
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
      } else if (part.startsWith("!")) {
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
      } else if (part.startsWith("@[") || part.startsWith("@")) {
        return (
          <span
            key={i}
            className={`font-semibold ${isOwn ? "text-primary-foreground" : "text-foreground"}`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Don't render if hidden
  if (state === "hidden") return null;

  return (
    <>
      {/* Minimized Pill */}
      {state === "minimized" && (
        <button
          onClick={() => onStateChange("expanded")}
          className={cn(
            "fixed right-6 bottom-6 z-50",
            "bg-primary text-primary-foreground",
            "flex items-center gap-2 rounded-full px-4 py-2.5",
            "shadow-lg transition-all duration-200",
            "hover:scale-105 hover:shadow-xl",
            "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none"
          )}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Team Chat</span>
          {hasUnread && (
            <span className="bg-destructive flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white">
              {messages?.filter((m) => m.userId !== currentUser?._id).length ?? ""}
            </span>
          )}
        </button>
      )}

      {/* Expanded Drawer */}
      {state === "expanded" && (
        <div
          ref={drawerRef}
          style={{ height: `${height}px` }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50",
            "bg-background border-t shadow-2xl",
            "flex flex-col",
            "lg:left-64", // Account for sidebar on desktop
            isAnimating && "animate-in slide-in-from-bottom duration-300",
            !isResizing && "transition-[height] duration-100"
          )}
        >
          {/* Resize Handle / Header */}
          <div
            onMouseDown={handleResizeStart}
            className={cn(
              "flex shrink-0 cursor-ns-resize items-center justify-between border-b px-4 py-2",
              "bg-muted/50 hover:bg-muted transition-colors",
              "select-none"
            )}
          >
            {/* Drag indicator */}
            <div className="flex flex-1 items-center justify-center">
              <GripHorizontal className="text-muted-foreground h-5 w-5" />
            </div>

            {/* Title and member count */}
            <div className="flex flex-1 items-center justify-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="font-semibold">Team Chat</span>
              {members && (
                <span className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Users className="h-3 w-3" />
                  {members.length}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-1 items-center justify-end gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchOpen(!searchOpen);
                      }}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Search messages</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStateChange("minimized");
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Minimize</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStateChange("hidden");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Close</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Search Panel */}
          {searchOpen && (
            <div className="bg-muted/30 shrink-0 border-b p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {searchQuery.trim() && (
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {searchResults === undefined ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-muted-foreground py-2 text-center text-sm">
                      No messages found
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {searchResults.map((result) => (
                        <div
                          key={result._id}
                          className="bg-background hover:bg-accent cursor-pointer rounded-md p-2 text-sm"
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                            // Scroll to message would require refs - for now just close search
                          }}
                        >
                          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                            <span className="font-medium">
                              {result.user?.name ?? result.user?.email}
                            </span>
                            <span>·</span>
                            <span>{formatDate(result.createdAt)}</span>
                          </div>
                          <p className="truncate">{result.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Messages Area */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4">
            {messages === undefined ? (
              <div className="flex h-full items-center justify-center py-8">
                <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center py-8">
                <p className="text-muted-foreground text-center text-sm">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {groupedMessages.map((group) => (
                  <div key={group.date}>
                    <div className="mb-2 flex justify-center">
                      <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs">
                        {group.date}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {group.messages.map((message) => {
                        const isOwn = message.userId === currentUser?._id;
                        const isEditing = editingMessageId === message._id;
                        const isDeleted = message.isDeleted;

                        return (
                          <div
                            key={message._id}
                            className={`group flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
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
                              {isDeleted ? (
                                <div className="bg-muted/50 rounded-lg border border-dashed px-3 py-2">
                                  <p className="text-muted-foreground text-sm italic">
                                    This message was deleted
                                  </p>
                                </div>
                              ) : isEditing ? (
                                <div className="flex flex-col gap-2">
                                  <Input
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        saveEdit();
                                      } else if (e.key === "Escape") {
                                        cancelEditing();
                                      }
                                    }}
                                    className="h-8 text-sm"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2"
                                      onClick={cancelEditing}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-6 px-2"
                                      onClick={saveEdit}
                                      disabled={!editContent.trim()}
                                    >
                                      <Check className="mr-1 h-3 w-3" />
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <div
                                    className={`rounded-lg px-3 py-2 ${
                                      isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                                    }`}
                                  >
                                    <p className="text-sm break-words whitespace-pre-wrap">
                                      {renderMessageContent(message.content, isOwn)}
                                    </p>
                                  </div>
                                  {/* Edit/Delete buttons - show on hover for own messages */}
                                  {isOwn && (
                                    <div
                                      className={`absolute top-1/2 -left-16 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100`}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => startEditing(message._id, message.content)}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="hover:text-destructive h-6 w-6"
                                        onClick={() => handleDelete(message._id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                              {!isDeleted && !isEditing && (
                                <span className="text-muted-foreground mt-1 text-xs">
                                  {formatTime(message.createdAt)}
                                  {message.editedAt && (
                                    <span className="ml-1 italic">(edited)</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="shrink-0 border-t p-4">
            {/* Typing indicator */}
            {typingUsers && typingUsers.length > 0 && (
              <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
                <div className="flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
                    •
                  </span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>
                    •
                  </span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>
                    •
                  </span>
                </div>
                <span>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].name ?? typingUsers[0].email} is typing...`
                    : typingUsers.length === 2
                      ? `${typingUsers[0].name ?? typingUsers[0].email} and ${typingUsers[1].name ?? typingUsers[1].email} are typing...`
                      : `${typingUsers.length} people are typing...`}
                </span>
              </div>
            )}

            {/* Mention suggestions popup */}
            {mentionType && suggestions.length > 0 && (
              <div className="bg-popover mb-2 max-h-48 overflow-y-auto rounded-md border p-1 shadow-md">
                <div className="text-muted-foreground px-2 py-1.5 text-xs font-semibold">
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
                          <span className="text-muted-foreground text-xs">{user.email}</span>
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
                        <kbd className="border-input bg-secondary text-secondary-foreground rounded border px-1.5 py-0.5 font-mono text-xs">
                          @
                        </kbd>
                        <span>Mention a team member</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="border-input bg-secondary text-secondary-foreground rounded border px-1.5 py-0.5 font-mono text-xs">
                          !
                        </kbd>
                        <span>Reference a card (clickable)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="border-input bg-secondary text-secondary-foreground rounded border px-1.5 py-0.5 font-mono text-xs">
                          Esc
                        </kbd>
                        <span>Minimize chat</span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button size="icon" onClick={handleSend} disabled={!content.trim() || isSending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

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
