import { useState } from "react";
import { useMutation } from "convex/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { KanbanCard } from "./Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenuLabel,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Sparkles,
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

// Custom type colors
const CUSTOM_TYPE_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];

interface CustomColumnType {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ColumnProps {
  column: Doc<"columns">;
  cards: Doc<"cards">[];
  isDragging?: boolean;
  customColumnTypes?: CustomColumnType[];
  boardId?: Id<"boards">;
  compactView?: boolean;
}

// Sortable wrapper for column
export function SortableColumn({
  column,
  cards,
  customColumnTypes,
  boardId,
  compactView,
}: ColumnProps) {
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
        customColumnTypes={customColumnTypes}
        boardId={boardId}
        compactView={compactView}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

interface ColumnInternalProps extends ColumnProps {
  dragHandleProps?: Record<string, unknown>;
}

export function Column({
  column,
  cards,
  isDragging,
  dragHandleProps,
  customColumnTypes = [],
  boardId,
  compactView = false,
}: ColumnInternalProps) {
  const updateColumn = useMutation(api.columns.update);
  const deleteColumn = useMutation(api.columns.remove);
  const createCard = useMutation(api.cards.create);
  const setColumnType = useMutation(api.columns.setType);
  const addCustomType = useMutation(api.boards.addCustomColumnType);

  // Check if type is built-in or custom
  const isBuiltInType = column.type && column.type in COLUMN_TYPES;
  const builtInTypeConfig = isBuiltInType ? COLUMN_TYPES[column.type as ColumnType] : null;
  const customTypeConfig = !isBuiltInType
    ? customColumnTypes.find((t) => t.id === column.type)
    : null;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [customTypeDialogOpen, setCustomTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState(CUSTOM_TYPE_COLORS[0]);

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

  const handleSetType = async (type: string | undefined) => {
    try {
      await setColumnType({ id: column._id, type });
      const isBuiltIn = type && type in COLUMN_TYPES;
      const typeName = isBuiltIn
        ? COLUMN_TYPES[type as ColumnType].label
        : customColumnTypes.find((t) => t.id === type)?.name;
      toast.success(type ? `Column type set to ${typeName}` : "Column type cleared");
    } catch {
      toast.error("Failed to update column type");
    }
  };

  const handleCreateCustomType = async () => {
    if (!newTypeName.trim() || !boardId) return;
    try {
      const typeId = await addCustomType({
        boardId,
        name: newTypeName.trim(),
        icon: "Sparkles",
        color: newTypeColor,
      });
      await setColumnType({ id: column._id, type: typeId });
      setCustomTypeDialogOpen(false);
      setNewTypeName("");
      toast.success(`Created custom type "${newTypeName.trim()}"`);
    } catch {
      toast.error("Failed to create custom type");
    }
  };

  return (
    <div
      className={cn(
        "bg-card flex h-full shrink-0 flex-col rounded-lg border transition-all",
        compactView ? "w-52" : "w-72",
        isOver && "ring-primary ring-2",
        isDragging && "shadow-xl"
      )}
    >
      {/* Column Header */}
      <div
        className={cn("flex items-center justify-between border-b", compactView ? "p-2" : "p-3")}
      >
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
            {builtInTypeConfig && (
              <div className={cn("rounded", compactView ? "p-0.5" : "p-1", builtInTypeConfig.bg)}>
                <builtInTypeConfig.icon
                  className={cn(compactView ? "h-3 w-3" : "h-3.5 w-3.5", builtInTypeConfig.color)}
                />
              </div>
            )}
            {customTypeConfig && (
              <div
                className={cn("rounded", compactView ? "p-0.5" : "p-1")}
                style={{ backgroundColor: `${customTypeConfig.color}20` }}
              >
                <Sparkles
                  className={cn(compactView ? "h-3 w-3" : "h-3.5 w-3.5")}
                  style={{ color: customTypeConfig.color }}
                />
              </div>
            )}
            <h3 className={cn("font-medium", compactView && "max-w-[100px] truncate text-sm")}>
              {column.name}
            </h3>
            <span
              className={cn(
                "bg-muted text-muted-foreground rounded",
                compactView ? "px-1 py-0 text-[10px]" : "px-1.5 py-0.5 text-xs"
              )}
            >
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
              <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  Built-in Types
                </DropdownMenuLabel>
                {(
                  Object.entries(COLUMN_TYPES) as [ColumnType, (typeof COLUMN_TYPES)[ColumnType]][]
                ).map(([type, config]) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => handleSetType(type)}
                    className={cn(column.type === type && "bg-accent")}
                  >
                    <config.icon className={cn("mr-2 h-4 w-4", config.color)} />
                    {config.label}
                    {column.type === type && (
                      <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
                    )}
                  </DropdownMenuItem>
                ))}
                {customColumnTypes.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-muted-foreground text-xs">
                      Custom Types
                    </DropdownMenuLabel>
                    {customColumnTypes.map((customType) => (
                      <DropdownMenuItem
                        key={customType.id}
                        onClick={() => handleSetType(customType.id)}
                        className={cn(column.type === customType.id && "bg-accent")}
                      >
                        <Sparkles className="mr-2 h-4 w-4" style={{ color: customType.color }} />
                        {customType.name}
                        {column.type === customType.id && (
                          <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                {boardId && (
                  <DropdownMenuItem onClick={() => setCustomTypeDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom Type
                  </DropdownMenuItem>
                )}
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
          <div className={cn("space-y-2", compactView && "space-y-1.5")}>
            {cards.map((card) => (
              <KanbanCard
                key={card._id}
                card={card}
                boardId={column.boardId}
                compactView={compactView}
              />
            ))}
          </div>
        </SortableContext>

        {cards.length === 0 && !isAddingCard && (
          <p className="text-muted-foreground py-4 text-center text-sm">No cards yet</p>
        )}
      </ScrollArea>

      {/* Add Card */}
      <div className={cn("border-t", compactView ? "p-1.5" : "p-2")}>
        {isAddingCard ? (
          <div className={cn(compactView ? "space-y-1.5" : "space-y-2")}>
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
              className={cn(compactView && "h-7 text-xs")}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddCard}
                className={cn(compactView && "h-6 px-2 text-xs")}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle("");
                }}
                className={cn(compactView && "h-6 w-6 p-0")}
              >
                <X className={cn(compactView ? "h-3 w-3" : "h-4 w-4")} />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-muted-foreground w-full justify-start",
              compactView && "h-6 text-xs"
            )}
            onClick={() => setIsAddingCard(true)}
          >
            <Plus className={cn(compactView ? "mr-1 h-3 w-3" : "mr-2 h-4 w-4")} />
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

      {/* Create Custom Type Dialog */}
      <Dialog open={customTypeDialogOpen} onOpenChange={setCustomTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Column Type</DialogTitle>
            <DialogDescription>
              Create a custom type to categorize your columns. This type will be available for all
              columns on this board.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type-name">Name</Label>
              <Input
                id="type-name"
                placeholder="e.g., Testing, Staging, Archive..."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_TYPE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-full transition-all",
                      newTypeColor === color && "ring-2 ring-offset-2"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTypeColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="bg-muted flex items-center gap-2 rounded-lg p-3">
                <div className="rounded p-1" style={{ backgroundColor: `${newTypeColor}20` }}>
                  <Sparkles className="h-4 w-4" style={{ color: newTypeColor }} />
                </div>
                <span className="font-medium">{newTypeName || "Type Name"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomType} disabled={!newTypeName.trim()}>
              Create Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
