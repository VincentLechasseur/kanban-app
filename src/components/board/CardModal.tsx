import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { format } from "date-fns";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  CalendarIcon,
  Check,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
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
  const updateCard = useMutation(api.cards.update);
  const deleteCard = useMutation(api.cards.remove);
  const setLabels = useMutation(api.cards.setLabels);
  const setAssignees = useMutation(api.cards.setAssignees);

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

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
                        className="flex items-center gap-2 rounded-full bg-muted px-2 py-1"
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
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Add to card
              </p>

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
                        className="flex w-full items-center gap-2 rounded p-2 hover:bg-muted"
                        onClick={() => handleToggleLabel(label._id)}
                      >
                        <div
                          className="h-6 flex-1 rounded"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-sm">{label.name}</span>
                        {card.labelIds.includes(label._id) && (
                          <Check className="h-4 w-4" />
                        )}
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
                        className="flex w-full items-center gap-2 rounded p-2 hover:bg-muted"
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
                        {card.assigneeIds.includes(user._id) && (
                          <Check className="h-4 w-4" />
                        )}
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
                    {card.dueDate
                      ? format(new Date(card.dueDate), "MMM d, yyyy")
                      : "Due date"}
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
                        className="w-full text-destructive"
                        onClick={() => handleSetDueDate(undefined)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove due date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <Separator className="my-4" />

              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Actions
              </p>

              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start text-destructive hover:bg-destructive hover:text-destructive-foreground"
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
              This will permanently delete this card. This action cannot be
              undone.
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
