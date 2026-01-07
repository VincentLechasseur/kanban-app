import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
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
import { MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CardSidebarActions } from "./card/CardSidebarActions";
import { CardComments } from "./card/CardComments";

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

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Track original values for change detection
  const originalTitle = useRef(card.title);
  const originalDescription = useRef(card.description ?? "");

  // Update values when card changes
  useEffect(() => {
    originalTitle.current = card.title;
    originalDescription.current = card.description ?? "";
    setTitle(card.title);
    setDescription(card.description ?? "");
  }, [card._id, card.title, card.description]);

  const handleSave = async () => {
    if (!title.trim()) return;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim() || undefined;

    // Only save if there are actual changes
    const titleChanged = trimmedTitle !== originalTitle.current;
    const descriptionChanged = (trimmedDescription ?? "") !== originalDescription.current;

    if (!titleChanged && !descriptionChanged) {
      return;
    }

    try {
      await updateCard({
        id: card._id,
        title: trimmedTitle,
        description: trimmedDescription,
      });

      originalTitle.current = trimmedTitle;
      originalDescription.current = trimmedDescription ?? "";

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

  const cardLabels = labels?.filter((l) => card.labelIds.includes(l._id)) || [];
  const cardAssignees = members?.filter((m) => card.assigneeIds.includes(m._id)) || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {/* Options menu - positioned next to close button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ring-offset-background absolute top-4 right-12 h-6 w-6 rounded-xs opacity-70 transition-opacity hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DialogHeader className="sr-only">
            <DialogTitle>Edit Card</DialogTitle>
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
            <CardSidebarActions card={card} labels={labels} members={members} />
          </div>

          {/* Comments Section */}
          <CardComments
            cardId={card._id}
            boardId={boardId}
            comments={comments}
            members={members}
            currentUser={currentUser}
          />
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
