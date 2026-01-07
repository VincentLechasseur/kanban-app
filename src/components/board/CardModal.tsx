import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { format, formatDistanceToNow } from "date-fns";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { UserAvatar } from "@/components/UserAvatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  CalendarIcon,
  Check,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Send,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";

const CARD_COLORS = [
  { name: "None", value: null, color: "transparent" },
  { name: "Red", value: "#ef4444", color: "#ef4444" },
  { name: "Orange", value: "#f97316", color: "#f97316" },
  { name: "Yellow", value: "#eab308", color: "#eab308" },
  { name: "Green", value: "#22c55e", color: "#22c55e" },
  { name: "Blue", value: "#3b82f6", color: "#3b82f6" },
  { name: "Purple", value: "#a855f7", color: "#a855f7" },
  { name: "Pink", value: "#ec4899", color: "#ec4899" },
];
import { toast } from "sonner";

interface CardModalProps {
  card: Doc<"cards">;
  boardId: Id<"boards">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardModal({ card, boardId, open, onOpenChange }: CardModalProps) {
  const labels = useQuery(api.labels.list, { boardId });
  const members = useQuery(api.boards.getMembers, { boardId });
  const comments = useQuery(api.comments.list, { cardId: card._id });
  const currentUser = useQuery(api.users.currentUser);
  const updateCard = useMutation(api.cards.update);
  const deleteCard = useMutation(api.cards.remove);
  const setLabels = useMutation(api.cards.setLabels);
  const setAssignees = useMutation(api.cards.setAssignees);
  const addComment = useMutation(api.comments.add);
  const removeComment = useMutation(api.comments.remove);
  const createMentionNotification = useMutation(api.notifications.createMentionNotification);

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Track original values for change detection
  const originalTitle = useRef(card.title);
  const originalDescription = useRef(card.description ?? "");

  // Update original values when card changes
  useEffect(() => {
    originalTitle.current = card.title;
    originalDescription.current = card.description ?? "";
    setTitle(card.title);
    setDescription(card.description ?? "");
  }, [card._id, card.title, card.description]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (open && comments?.length) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments?.length, open]);

  // Filter members for mention suggestions (exclude current user)
  const mentionSuggestions = useMemo(() => {
    if (!showMentions || !members || !currentUser) return [];
    const search = mentionSearch.toLowerCase();
    return members.filter(
      (m) =>
        m._id !== currentUser._id &&
        (m.name?.toLowerCase().includes(search) || m.email?.toLowerCase().includes(search))
    );
  }, [members, mentionSearch, showMentions, currentUser]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [mentionSearch]);

  // Parse mentions from comment text
  const parseMentions = useCallback(
    (text: string): Id<"users">[] => {
      if (!members) return [];
      const mentionRegex = /@\[([^\]]+)\]|@(\S+)/g;
      const mentionedUserIds: Id<"users">[] = [];
      let match;

      while ((match = mentionRegex.exec(text)) !== null) {
        const mentionName = match[1] || match[2];
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

  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const commentContent = newComment.trim();
      const commentId = await addComment({ cardId: card._id, content: commentContent });

      // Create notifications for mentioned users
      const mentionedUserIds = parseMentions(commentContent);
      for (const mentionedUserId of mentionedUserIds) {
        await createMentionNotification({
          mentionedUserId,
          cardId: card._id,
          boardId,
          commentId,
        });
      }

      setNewComment("");
      setShowMentions(false);
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewComment(value);

    // Detect @ mention trigger
    const cursorPos = e.target.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);

    // Check for bracket syntax: @[
    const lastAtBracket = textBeforeCursor.lastIndexOf("@[");
    if (lastAtBracket !== -1 && !textBeforeCursor.slice(lastAtBracket).includes("]")) {
      setShowMentions(true);
      setMentionSearch(textBeforeCursor.slice(lastAtBracket + 2));
      return;
    }

    // Check for simple @ mention
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1 && !textBeforeCursor.slice(lastAtIndex).includes(" ")) {
      setShowMentions(true);
      setMentionSearch(textBeforeCursor.slice(lastAtIndex + 1));
    } else {
      setShowMentions(false);
      setMentionSearch("");
    }
  };

  const insertMention = (user: { name?: string; email?: string }) => {
    const displayName = user.name ?? user.email ?? "";
    const cursorPos = commentInputRef.current?.selectionStart ?? newComment.length;
    const textBeforeCursor = newComment.slice(0, cursorPos);

    // Find where the mention started
    const bracketIndex = textBeforeCursor.lastIndexOf("@[");
    const simpleIndex = textBeforeCursor.lastIndexOf("@");
    const inBracketMode =
      bracketIndex !== -1 && !textBeforeCursor.slice(bracketIndex).includes("]");

    const needsBrackets = displayName.includes(" ") || inBracketMode;

    if (inBracketMode) {
      const beforeTrigger = newComment.slice(0, bracketIndex);
      const afterCursor = newComment.slice(cursorPos);
      setNewComment(`${beforeTrigger}@[${displayName}] ${afterCursor}`);
    } else if (simpleIndex !== -1) {
      const beforeTrigger = newComment.slice(0, simpleIndex);
      const afterCursor = newComment.slice(cursorPos);
      if (needsBrackets) {
        setNewComment(`${beforeTrigger}@[${displayName}] ${afterCursor}`);
      } else {
        setNewComment(`${beforeTrigger}@${displayName} ${afterCursor}`);
      }
    }

    setShowMentions(false);
    setMentionSearch("");
    commentInputRef.current?.focus();
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex(
          (prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = mentionSuggestions[selectedMentionIndex];
        if (selected) {
          insertMention(selected);
        }
      } else if (e.key === "Escape") {
        setShowMentions(false);
        setMentionSearch("");
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleDeleteComment = async (commentId: Id<"comments">) => {
    try {
      await removeComment({ id: commentId });
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim() || undefined;

    // Only save if there are actual changes
    const titleChanged = trimmedTitle !== originalTitle.current;
    const descriptionChanged = (trimmedDescription ?? "") !== originalDescription.current;

    if (!titleChanged && !descriptionChanged) {
      return; // No changes, skip save
    }

    try {
      await updateCard({
        id: card._id,
        title: trimmedTitle,
        description: trimmedDescription,
      });

      // Update original values after successful save
      originalTitle.current = trimmedTitle;
      originalDescription.current = trimmedDescription ?? "";

      toast.success("Card updated");
    } catch {
      toast.error("Failed to update card");
    }
  };

  // Render comment content with highlighted mentions
  const renderCommentContent = (text: string) => {
    const mentionRegex = /(@\[[^\]]+\]|@\S+)/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, i) => {
      if (part.startsWith("@[") || part.startsWith("@")) {
        return (
          <span key={i} className="text-primary font-semibold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleDelete = async () => {
    try {
      await deleteCard({ id: card._id });
      toast.success("Card deleted");
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete card");
    }
  };

  const handleToggleLabel = async (labelId: Id<"labels">) => {
    const newLabelIds = card.labelIds.includes(labelId)
      ? card.labelIds.filter((id) => id !== labelId)
      : [...card.labelIds, labelId];
    try {
      await setLabels({ cardId: card._id, labelIds: newLabelIds });
    } catch {
      toast.error("Failed to update labels");
    }
  };

  const handleToggleAssignee = async (userId: Id<"users">) => {
    const newAssigneeIds = card.assigneeIds.includes(userId)
      ? card.assigneeIds.filter((id) => id !== userId)
      : [...card.assigneeIds, userId];
    try {
      await setAssignees({ cardId: card._id, assigneeIds: newAssigneeIds });
    } catch {
      toast.error("Failed to update assignees");
    }
  };

  const handleSetDueDate = async (date: Date | undefined) => {
    try {
      await updateCard({
        id: card._id,
        dueDate: date ? date.getTime() : null,
      });
      setDateOpen(false);
    } catch {
      toast.error("Failed to update due date");
    }
  };

  const handleSetColor = async (color: string | null) => {
    try {
      await updateCard({
        id: card._id,
        color,
      });
      setColorOpen(false);
    } catch {
      toast.error("Failed to update color");
    }
  };

  const cardLabels = labels?.filter((l) => card.labelIds.includes(l._id)) || [];
  const cardAssignees = members?.filter((m) => card.assigneeIds.includes(m._id)) || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Edit Card</DialogTitle>
          </DialogHeader>

          {/* Options Menu - Top Left */}
          <div className="absolute top-4 left-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete card
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr,200px]">
            {/* Main Content */}
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="card-title">Title</Label>
                <Input
                  id="card-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSave}
                  className="text-lg font-medium"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="card-description">Description</Label>
                <Textarea
                  id="card-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleSave}
                  placeholder="Add a more detailed description..."
                  rows={4}
                />
              </div>

              {/* Labels Display */}
              {cardLabels.length > 0 && (
                <div className="space-y-2">
                  <Label>Labels</Label>
                  <div className="flex flex-wrap gap-2">
                    {cardLabels.map((label) => (
                      <Badge
                        key={label._id}
                        style={{ backgroundColor: label.color }}
                        className="text-white"
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignees Display */}
              {cardAssignees.length > 0 && (
                <div className="space-y-2">
                  <Label>Assignees</Label>
                  <div className="flex flex-wrap gap-2">
                    {cardAssignees.map((user) => (
                      <div
                        key={user._id}
                        className="bg-muted flex items-center gap-2 rounded-full px-2 py-1"
                      >
                        <UserAvatar
                          userId={user._id}
                          name={user.name}
                          email={user.email}
                          image={user.image}
                          className="h-5 w-5"
                          fallbackClassName="text-xs"
                        />
                        <span className="text-sm">{user.name ?? user.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Actions */}
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-semibold uppercase">Add to card</p>

              {/* Labels */}
              <Popover open={labelsOpen} onOpenChange={setLabelsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    <Tag className="mr-2 h-4 w-4" />
                    Labels
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Labels</p>
                    {labels?.map((label) => (
                      <button
                        key={label._id}
                        className="hover:bg-muted flex w-full items-center gap-2 rounded p-2"
                        onClick={() => handleToggleLabel(label._id)}
                      >
                        <div
                          className="h-6 flex-1 rounded"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-sm">{label.name}</span>
                        {card.labelIds.includes(label._id) && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Assignees */}
              <Popover open={assigneesOpen} onOpenChange={setAssigneesOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    <User className="mr-2 h-4 w-4" />
                    Assignees
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Members</p>
                    {members?.map((user) => (
                      <button
                        key={user._id}
                        className="hover:bg-muted flex w-full items-center gap-2 rounded p-2"
                        onClick={() => handleToggleAssignee(user._id)}
                      >
                        <UserAvatar
                          userId={user._id}
                          name={user.name}
                          email={user.email}
                          image={user.image}
                          className="h-6 w-6"
                          fallbackClassName="text-xs"
                        />
                        <span className="flex-1 text-left text-sm">{user.name ?? user.email}</span>
                        {card.assigneeIds.includes(user._id) && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Due Date */}
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {card.dueDate ? format(new Date(card.dueDate), "MMM d, yyyy") : "Due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={card.dueDate ? new Date(card.dueDate) : undefined}
                    onSelect={handleSetDueDate}
                    initialFocus
                  />
                  {card.dueDate && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive w-full"
                        onClick={() => handleSetDueDate(undefined)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove due date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Color */}
              <Popover open={colorOpen} onOpenChange={setColorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    <Palette className="mr-2 h-4 w-4" />
                    {card.color ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded" style={{ backgroundColor: card.color }} />
                        <span>Color</span>
                      </div>
                    ) : (
                      "Color"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Card Color</p>
                    <div className="grid grid-cols-4 gap-2">
                      {CARD_COLORS.map((c) => (
                        <button
                          key={c.name}
                          className="hover:ring-primary flex h-8 w-8 items-center justify-center rounded transition-all hover:ring-2"
                          style={{
                            backgroundColor: c.color,
                            border: c.value === null ? "2px dashed currentColor" : "none",
                          }}
                          onClick={() => handleSetColor(c.value)}
                        >
                          {card.color === c.value && c.value !== null && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                          {card.color === undefined && c.value === null && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Comments Section - Full Width at Bottom */}
          <Separator className="my-2" />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <Label>Comments</Label>
              {comments && comments.length > 0 && (
                <span className="text-muted-foreground text-xs">({comments.length})</span>
              )}
            </div>

            {/* Comments List - No separate scroll */}
            {comments && comments.length > 0 && (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment._id} className="group flex gap-3">
                    <UserAvatar
                      userId={comment.user._id}
                      name={comment.user.name}
                      email={comment.user.email}
                      image={comment.user.image}
                      className="h-8 w-8 shrink-0"
                      fallbackClassName="text-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.user.name ?? comment.user.email}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {comment.userId === currentUser?._id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive ml-auto h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => handleDeleteComment(comment._id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm">{renderCommentContent(comment.content)}</p>
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}

            {/* Add Comment */}
            {/* Mention suggestions */}
            {showMentions && mentionSuggestions.length > 0 && (
              <div className="bg-popover mb-2 max-h-40 overflow-y-auto rounded-md border p-1 shadow-md">
                <div className="text-muted-foreground px-2 py-1 text-xs font-semibold">
                  Team Members
                </div>
                {mentionSuggestions.map((user, index) => (
                  <button
                    key={user._id}
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none ${
                      index === selectedMentionIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                    onClick={() => insertMention(user)}
                  >
                    <UserAvatar
                      userId={user._id}
                      name={user.name}
                      email={user.email}
                      image={user.image}
                      className="h-5 w-5"
                      fallbackClassName="text-xs"
                    />
                    <span>{user.name ?? user.email}</span>
                    {user.name && (
                      <span className="text-muted-foreground text-xs">{user.email}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                ref={commentInputRef}
                placeholder="Write a comment... (use @ to mention)"
                value={newComment}
                onChange={handleCommentInputChange}
                onKeyDown={handleCommentKeyDown}
                disabled={isSubmittingComment}
              />
              <Button
                size="icon"
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmittingComment}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this card. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
