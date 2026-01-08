import { useState } from "react";
import { useMutation } from "convex/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { KanbanCard } from "./Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import {
  Archive,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

// Column type configuration
const COLUMN_TYPES = {
  backlog: { label: "Backlog", icon: Archive, color: "text-slate-500", bg: "bg-slate-500/10" },
  todo: { label: "To Do", icon: CircleDashed, color: "text-blue-500", bg: "bg-blue-500/10" },
  in_progress: {
    label: "In Progress",
    icon: Loader2,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  review: { label: "Review", icon: Search, color: "text-purple-500", bg: "bg-purple-500/10" },
  blocked: { label: "Blocked", icon: Ban, color: "text-red-500", bg: "bg-red-500/10" },
  done: { label: "Done", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  wont_do: { label: "Won't Do", icon: XCircle, color: "text-slate-400", bg: "bg-slate-400/10" },
} as const;

type ColumnType = keyof typeof COLUMN_TYPES;

interface ColumnProps {
  column: Doc<"columns">;
  cards: Doc<"cards">[];
  isDragging?: boolean;
}

// Sortable wrapper for column
export function SortableColumn({ column, cards }: ColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <Column
        column={column}
        cards={cards}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

interface ColumnInternalProps extends ColumnProps {
  dragHandleProps?: Record<string, unknown>;
}

export function Column({ column, cards, isDragging, dragHandleProps }: ColumnInternalProps) {
  const updateColumn = useMutation(api.columns.update);
  const deleteColumn = useMutation(api.columns.remove);
  const createCard = useMutation(api.cards.create);
  const setColumnType = useMutation(api.columns.setType);

  const columnType = column.type as ColumnType | undefined;
  const typeConfig = columnType ? COLUMN_TYPES[columnType] : null;

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

  const handleSetType = async (type: ColumnType | undefined) => {
    try {
      await setColumnType({ id: column._id, type });
      toast.success(
        type ? `Column type set to ${COLUMN_TYPES[type].label}` : "Column type cleared"
      );
    } catch {
      toast.error("Failed to update column type");
    }
  };

  return (
    <div
      className={cn(
        "bg-card flex h-full w-72 shrink-0 flex-col rounded-lg border",
        isOver && "ring-primary ring-2",
        isDragging && "shadow-xl"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b p-3">
        {/* Drag Handle */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="text-muted-foreground hover:text-foreground mr-1 -ml-1 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}
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
            {typeConfig && (
              <div className={cn("rounded p-1", typeConfig.bg)}>
                <typeConfig.icon className={cn("h-3.5 w-3.5", typeConfig.color)} />
              </div>
            )}
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
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Clock className="mr-2 h-4 w-4" />
                Set Type
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(
                  Object.entries(COLUMN_TYPES) as [ColumnType, (typeof COLUMN_TYPES)[ColumnType]][]
                ).map(([type, config]) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => handleSetType(type)}
                    className={cn(columnType === type && "bg-accent")}
                  >
                    <config.icon className={cn("mr-2 h-4 w-4", config.color)} />
                    {config.label}
                    {columnType === type && (
                      <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSetType(undefined)}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Type
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
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
