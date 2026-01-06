import { useState, useRef, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarIcon,
  Check,
  MessageSquare,
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

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (open && comments?.length) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments?.length, open]);

  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      await addComment({ cardId: card._id, content: newComment.trim() });
      setNewComment("");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
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
    try {
      await updateCard({
        id: card._id,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Card updated");
    } catch {
      toast.error("Failed to update card");
    }
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Edit Card</DialogTitle>
          </DialogHeader>

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
                  rows={6}
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

              {/* Comments Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <Label>Comments</Label>
                  {comments && comments.length > 0 && (
                    <span className="text-muted-foreground text-xs">({comments.length})</span>
                  )}
                </div>

                {/* Comments List */}
                {comments && comments.length > 0 && (
                  <ScrollArea className="max-h-48">
                    <div className="space-y-3 pr-4">
                      {comments.map((comment) => (
                        <div key={comment._id} className="group flex gap-3">
                          <UserAvatar
                            userId={comment.user._id}
                            name={comment.user.name}
                            email={comment.user.email}
                            image={comment.user.image}
                            className="h-7 w-7 shrink-0"
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
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={commentsEndRef} />
                    </div>
                  </ScrollArea>
                )}

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
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

              <Separator className="my-4" />

              <p className="text-muted-foreground text-xs font-semibold uppercase">Actions</p>

              <Button
                variant="secondary"
                size="sm"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground w-full justify-start"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete card
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
