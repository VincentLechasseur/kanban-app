import { useState } from "react";
import { useMutation } from "convex/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { KanbanCard } from "./Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface ColumnProps {
  column: Doc<"columns">;
  cards: Doc<"cards">[];
}

export function Column({ column, cards }: ColumnProps) {
  const updateColumn = useMutation(api.columns.update);
  const deleteColumn = useMutation(api.columns.remove);
  const createCard = useMutation(api.cards.create);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");

  const { setNodeRef, isOver } = useDroppable({
    id: column._id,
  });

  const handleUpdateName = async () => {
    if (!name.trim() || name === column.name) {
      setName(column.name);
      setIsEditing(false);
      return;
    }
    try {
      await updateColumn({ id: column._id, name: name.trim() });
      setIsEditing(false);
    } catch {
      toast.error("Failed to update column");
      setName(column.name);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteColumn({ id: column._id });
      toast.success("Column deleted");
    } catch {
      toast.error("Failed to delete column");
    }
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    try {
      await createCard({
        columnId: column._id,
        title: newCardTitle.trim(),
      });
      setNewCardTitle("");
      setIsAddingCard(false);
    } catch {
      toast.error("Failed to create card");
    }
  };

  return (
    <div
      className={cn(
        "bg-card flex h-full w-72 shrink-0 flex-col rounded-lg border",
        isOver && "ring-primary ring-2"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b p-3">
        {isEditing ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleUpdateName}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUpdateName();
              if (e.key === "Escape") {
                setName(column.name);
                setIsEditing(false);
              }
            }}
            className="h-7"
          />
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{column.name}</h3>
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
              {cards.length}
            </span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2" ref={setNodeRef}>
        <SortableContext items={cards.map((c) => c._id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {cards.map((card) => (
              <KanbanCard key={card._id} card={card} boardId={column.boardId} />
            ))}
          </div>
        </SortableContext>

        {cards.length === 0 && !isAddingCard && (
          <p className="text-muted-foreground py-4 text-center text-sm">No cards yet</p>
        )}
      </ScrollArea>

      {/* Add Card */}
      <div className="border-t p-2">
        {isAddingCard ? (
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="Card title..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCard();
                if (e.key === "Escape") {
                  setIsAddingCard(false);
                  setNewCardTitle("");
                }
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddCard}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground w-full justify-start"
            onClick={() => setIsAddingCard(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add card
          </Button>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete column?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{column.name}" and all its cards. This action cannot be
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
    </div>
  );
}
