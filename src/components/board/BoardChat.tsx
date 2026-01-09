import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/UserAvatar";
import { CardModal } from "@/components/board/CardModal";
import { Spinner } from "@/components/ui/spinner";
import {
  Send,
  HelpCircle,
  User,
  StickyNote,
  MessageCircle,
  Users,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [highlightedMessageId, setHighlightedMessageId] = useState<Id<"messages"> | null>(null);
  const searchResults = useQuery(
    api.messages.search,
    searchQuery.trim() ? { boardId, query: searchQuery } : "skip"
  );

  // Typing indicator debounce
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mark as read when chat is opened
  useEffect(() => {
    if (open) {
      markAsRead({ boardId });
    }
  }, [open, boardId, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current && open) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset selected index when mention search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionSearch, mentionType]);

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

  // Scroll to and highlight a message
  const scrollToMessage = (messageId: Id<"messages">) => {
    setSearchOpen(false);
    setSearchQuery("");
    setHighlightedMessageId(messageId);

    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2000);
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
            className={cn(
              "font-semibold underline underline-offset-2 transition-opacity hover:opacity-70",
              isOwn ? "text-primary-foreground" : "text-foreground"
            )}
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
            className={cn(
              "font-semibold underline underline-offset-2 transition-opacity hover:opacity-70",
              isOwn ? "text-primary-foreground" : "text-foreground"
            )}
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
            className={cn("font-semibold", isOwn ? "text-primary-foreground" : "text-foreground")}
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
      {/* Floating Chat Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={() => onOpenChange(true)}
              className="fixed right-6 bottom-6 z-40 h-14 w-14 rounded-full shadow-lg"
            >
              <MessageCircle className="h-6 w-6" />
              {hasUnread && (
                <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold">
                  {messages?.filter((m) => m.userId !== currentUser?._id).length ?? ""}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Team Chat</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Chat Modal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">
          {/* Header */}
          <DialogHeader className="flex-shrink-0 border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">Team Chat</DialogTitle>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <Users className="h-3.5 w-3.5" />
                    {members?.length ?? 0} members
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={searchOpen ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setSearchOpen(!searchOpen)}
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
                      <Button variant="ghost" size="icon">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Shortcuts</p>
                        <div className="flex items-center gap-2">
                          <kbd className="bg-muted rounded border px-1.5 py-0.5 font-mono text-xs">
                            @
                          </kbd>
                          <span>Mention a team member</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <kbd className="bg-muted rounded border px-1.5 py-0.5 font-mono text-xs">
                            !
                          </kbd>
                          <span>Reference a card (clickable)</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </DialogHeader>

          {/* Search Panel */}
          {searchOpen && (
            <div className="bg-muted/50 flex-shrink-0 border-b p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {searchQuery.trim() && (
                <div className="mt-3 max-h-48 overflow-y-auto">
                  {searchResults === undefined ? (
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center text-sm">
                      No messages found
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {searchResults.map((result) => (
                        <button
                          key={result._id}
                          className="hover:bg-accent w-full cursor-pointer rounded-lg p-3 text-left transition-colors"
                          onClick={() => scrollToMessage(result._id)}
                        >
                          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                            <span className="font-medium">
                              {result.user?.name ?? result.user?.email}
                            </span>
                            <span>·</span>
                            <span>{formatDate(result.createdAt)}</span>
                          </div>
                          <p className="truncate text-sm">{result.content}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Messages Area */}
          <ScrollArea className="flex-1">
            <div ref={scrollContainerRef} className="p-6">
              {messages === undefined ? (
                <div className="flex h-64 items-center justify-center">
                  <Spinner />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                    <MessageCircle className="text-muted-foreground h-8 w-8" />
                  </div>
                  <h3 className="mb-1 font-medium">No messages yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Start a conversation with your team
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedMessages.map((group) => (
                    <div key={group.date}>
                      {/* Date divider */}
                      <div className="relative mb-4 flex items-center justify-center">
                        <div className="bg-border absolute inset-x-0 h-px" />
                        <span className="bg-background text-muted-foreground relative px-3 text-xs font-medium">
                          {group.date}
                        </span>
                      </div>

                      {/* Messages for this date */}
                      <div className="space-y-4">
                        {group.messages.map((message) => {
                          const isOwn = message.userId === currentUser?._id;
                          const isEditing = editingMessageId === message._id;
                          const isDeleted = message.isDeleted;
                          const isHighlighted = highlightedMessageId === message._id;

                          return (
                            <div
                              key={message._id}
                              data-message-id={message._id}
                              className={cn(
                                "group flex gap-3",
                                isOwn && "flex-row-reverse",
                                isHighlighted &&
                                  "animate-pulse rounded-lg bg-yellow-100/50 p-2 dark:bg-yellow-900/20"
                              )}
                            >
                              <UserAvatar
                                userId={message.user._id}
                                name={message.user.name}
                                email={message.user.email}
                                image={message.user.image}
                                className="ring-background h-9 w-9 flex-shrink-0 ring-2"
                                fallbackClassName="text-xs"
                              />
                              <div
                                className={cn("flex max-w-[75%] flex-col", isOwn && "items-end")}
                              >
                                {/* Sender name */}
                                <span
                                  className={cn(
                                    "text-muted-foreground mb-1 text-xs font-medium",
                                    isOwn && "text-right"
                                  )}
                                >
                                  {message.user.name ?? message.user.email}
                                </span>

                                {isDeleted ? (
                                  <div className="bg-muted/50 rounded-lg border border-dashed px-3 py-2">
                                    <p className="text-muted-foreground text-sm italic">
                                      Message deleted
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
                                      className="text-sm"
                                      autoFocus
                                    />
                                    <div className="flex gap-1.5">
                                      <Button size="sm" variant="ghost" onClick={cancelEditing}>
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
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
                                      className={cn(
                                        "rounded-lg px-3 py-2",
                                        isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                                      )}
                                    >
                                      <p className="text-sm break-words whitespace-pre-wrap">
                                        {renderMessageContent(message.content, isOwn)}
                                      </p>
                                    </div>

                                    {/* Edit/Delete buttons */}
                                    {isOwn && (
                                      <div
                                        className={cn(
                                          "absolute top-1/2 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100",
                                          isOwn ? "-left-16" : "-right-16"
                                        )}
                                      >
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => startEditing(message._id, message.content)}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="hover:text-destructive h-7 w-7"
                                          onClick={() => handleDelete(message._id)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Timestamp */}
                                {!isDeleted && !isEditing && (
                                  <span
                                    className={cn(
                                      "text-muted-foreground mt-1 text-xs",
                                      isOwn && "text-right"
                                    )}
                                  >
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
          </ScrollArea>

          {/* Input Area */}
          <div className="bg-muted/30 flex-shrink-0 border-t p-4">
            {/* Typing indicator */}
            {typingUsers && typingUsers.length > 0 && (
              <div className="text-muted-foreground mb-3 flex items-center gap-2 text-sm">
                <div className="flex gap-0.5">
                  <span
                    className="bg-primary inline-block h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="bg-primary inline-block h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="bg-primary inline-block h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{ animationDelay: "300ms" }}
                  />
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

            {/* Mention suggestions */}
            {mentionType && suggestions.length > 0 && (
              <div className="bg-popover mb-3 max-h-48 overflow-y-auto rounded-lg border p-1 shadow-lg">
                <div className="text-muted-foreground px-2 py-1 text-xs font-medium">
                  {mentionType === "user" ? "Team Members" : "Cards"}
                </div>
                {mentionType === "user"
                  ? userSuggestions.map((user, index) => (
                      <button
                        key={user._id}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          index === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        )}
                        onClick={() => insertMention(user.name ?? user.email ?? "")}
                      >
                        <User className="h-4 w-4" />
                        <span className="font-medium">{user.name ?? user.email}</span>
                        {user.name && (
                          <span className="text-muted-foreground text-xs">{user.email}</span>
                        )}
                      </button>
                    ))
                  : cardSuggestions.map((card, index) => (
                      <button
                        key={card._id}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          index === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        )}
                        onClick={() => insertMention(card.title)}
                      >
                        <StickyNote className="h-4 w-4" />
                        <span className="truncate font-medium">{card.title}</span>
                      </button>
                    ))}
              </div>
            )}

            {/* Message input */}
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                placeholder="Type a message... (@ to mention, ! for cards)"
                value={content}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                className="flex-1"
              />
              <Button size="icon" onClick={handleSend} disabled={!content.trim() || isSending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
