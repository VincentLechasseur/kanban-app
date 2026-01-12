import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/UserAvatar";
import { CardModal } from "@/components/board/CardModal";
import { Spinner } from "@/components/ui/spinner";
import {
  Send,
  User,
  StickyNote,
  MessageCircle,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["👍", "❤️", "🎉", "🚀", "✅", "🔥", "💡", "😊", "🤔", "👀", "💪", "👏"];

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

  const typingUsers = useQuery(api.typing.getTyping, { boardId });
  const setTyping = useMutation(api.typing.setTyping);
  const clearTyping = useMutation(api.typing.clearTyping);

  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mentionType, setMentionType] = useState<MentionType>(null);
  const [mentionSearch, setMentionSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<Doc<"cards"> | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<Id<"messages"> | null>(null);
  const [editContent, setEditContent] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState<Id<"messages"> | null>(null);
  const searchResults = useQuery(
    api.messages.search,
    searchQuery.trim() ? { boardId, query: searchQuery } : "skip"
  );

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      markAsRead({ boardId });
    }
  }, [open, boardId, markAsRead]);

  useEffect(() => {
    if (messagesEndRef.current && open) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionSearch, mentionType]);

  // Handle Ctrl+F to open search when chat is open
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

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
          await createChatMentionNotification({ mentionedUserId, boardId, messageId });
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

  const scrollToMessage = (messageId: Id<"messages">) => {
    setSearchOpen(false);
    setSearchQuery("");
    setHighlightedMessageId(messageId);
    setTimeout(() => {
      document.querySelector(`[data-message-id="${messageId}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
    setTimeout(() => setHighlightedMessageId(null), 2000);
  };

  const triggerTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping({ boardId });
    typingTimeoutRef.current = setTimeout(() => clearTyping({ boardId }), 3000);
  }, [boardId, setTyping, clearTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContent(value);
    if (value.trim()) triggerTyping();

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
      setContent(`${beforeTrigger}${triggerChar}[${text}] ${afterCursor}`);
    } else if (simpleIndex !== -1) {
      const beforeTrigger = content.slice(0, simpleIndex);
      const afterCursor = content.slice(cursorPos);
      if (needsBrackets) {
        setContent(`${beforeTrigger}${triggerChar}[${text}] ${afterCursor}`);
      } else {
        setContent(`${beforeTrigger}${triggerChar}${text} ${afterCursor}`);
      }
    }

    setMentionType(null);
    setMentionSearch("");
    inputRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setEmojiPickerOpen(false);
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
    if (card) setSelectedCard(card);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessageContent = (text: string, isOwn: boolean) => {
    const mentionRegex = /(@\[[^\]]+\]|!\[[^\]]+\]|@\S+|!\S+)/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, i) => {
      if (part.startsWith("![") || part.startsWith("!")) {
        const cardTitle = part.startsWith("![") ? part.slice(2, -1) : part.slice(1);
        return (
          <button
            key={i}
            className={cn(
              "font-medium underline underline-offset-2 hover:opacity-70",
              isOwn ? "text-primary-foreground" : "text-primary"
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
            className={cn("font-medium", isOwn ? "text-primary-foreground" : "text-primary")}
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
                <span className="bg-destructive absolute -top-1 -right-1 h-3 w-3 rounded-full" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Team Chat</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[85vh] max-h-[900px] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:!max-w-4xl"
        >
          <DialogHeader className="flex-shrink-0 border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">Team Chat</DialogTitle>
              <div className="flex items-center gap-1">
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Search className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="end">
                    <Input
                      ref={searchInputRef}
                      placeholder="Search messages... (Ctrl+F)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                    {searchQuery.trim() && (
                      <div className="mt-2 max-h-64 overflow-y-auto">
                        {searchResults === undefined ? (
                          <div className="flex justify-center py-4">
                            <Spinner size="sm" />
                          </div>
                        ) : searchResults.length === 0 ? (
                          <p className="text-muted-foreground py-4 text-center text-sm">
                            No results
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {searchResults.map((result) => (
                              <button
                                key={result._id}
                                className="hover:bg-muted w-full rounded p-2 text-left"
                                onClick={() => scrollToMessage(result._id)}
                              >
                                <p className="text-muted-foreground text-xs">
                                  {result.user?.name ?? result.user?.email}
                                </p>
                                <p className="truncate text-sm">{result.content}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {messages === undefined ? (
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageCircle className="text-muted-foreground mb-3 h-12 w-12" />
                <p className="text-muted-foreground text-sm">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isOwn = message.userId === currentUser?._id;
                  const isEditing = editingMessageId === message._id;
                  const isDeleted = message.isDeleted;
                  const isHighlighted = highlightedMessageId === message._id;

                  return (
                    <div
                      key={message._id}
                      data-message-id={message._id}
                      className={cn(
                        "group flex gap-2",
                        isOwn && "flex-row-reverse",
                        isHighlighted && "bg-accent/50 -mx-2 rounded-lg px-2 py-1"
                      )}
                    >
                      <UserAvatar
                        userId={message.user._id}
                        name={message.user.name}
                        email={message.user.email}
                        image={message.user.image}
                        className="h-8 w-8 flex-shrink-0"
                        fallbackClassName="text-xs"
                      />
                      <div className={cn("flex max-w-[75%] flex-col", isOwn && "items-end")}>
                        <span className="text-muted-foreground mb-0.5 text-xs">
                          {message.user.name ?? message.user.email}
                        </span>

                        {isDeleted ? (
                          <div className="bg-muted rounded-lg px-3 py-2">
                            <p className="text-muted-foreground text-sm italic">Message deleted</p>
                          </div>
                        ) : isEditing ? (
                          <div className="flex flex-col gap-1.5">
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
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={cancelEditing}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs"
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
                            {isOwn && (
                              <div className="absolute top-1/2 -left-14 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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
                          <span className="text-muted-foreground mt-0.5 text-xs">
                            {formatTime(message.createdAt)}
                            {message.editedAt && <span className="ml-1 italic">(edited)</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t p-3">
            {typingUsers && typingUsers.length > 0 && (
              <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs">
                <span className="flex gap-0.5">
                  <span
                    className="bg-muted-foreground h-1 w-1 animate-bounce rounded-full"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="bg-muted-foreground h-1 w-1 animate-bounce rounded-full"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="bg-muted-foreground h-1 w-1 animate-bounce rounded-full"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
                <span>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].name ?? typingUsers[0].email} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </span>
              </div>
            )}

            {mentionType && suggestions.length > 0 && (
              <div className="bg-popover mb-2 max-h-40 overflow-y-auto rounded-lg border p-1 shadow-md">
                <p className="text-muted-foreground px-2 py-1 text-xs">
                  {mentionType === "user" ? "Members" : "Cards"}
                </p>
                {mentionType === "user"
                  ? userSuggestions.map((user, index) => (
                      <button
                        key={user._id}
                        className={cn(
                          "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm",
                          index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                        )}
                        onClick={() => insertMention(user.name ?? user.email ?? "")}
                      >
                        <User className="h-4 w-4" />
                        <span>{user.name ?? user.email}</span>
                      </button>
                    ))
                  : cardSuggestions.map((card, index) => (
                      <button
                        key={card._id}
                        className={cn(
                          "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm",
                          index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                        )}
                        onClick={() => insertMention(card.title)}
                      >
                        <StickyNote className="h-4 w-4" />
                        <span className="truncate">{card.title}</span>
                      </button>
                    ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                    <Smile className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="flex gap-1">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        className="hover:bg-muted h-8 w-8 rounded text-lg"
                        onClick={() => insertEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Input
                ref={inputRef}
                placeholder="Message... (@ to mention, ! for cards)"
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
