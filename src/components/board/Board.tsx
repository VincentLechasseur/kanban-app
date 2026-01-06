import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import { Column } from "./Column";
import { KanbanCard } from "./Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface BoardProps {
  boardId: Id<"boards">;
}

export function Board({ boardId }: BoardProps) {
  const columns = useQuery(api.columns.list, { boardId });
  const cards = useQuery(api.cards.listByBoard, { boardId });
  const createColumn = useMutation(api.columns.create);
  const moveCard = useMutation(api.cards.move);

  const [activeCard, setActiveCard] = useState<Doc<"cards"> | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const cardsByColumn = useMemo(() => {
    if (!cards) return {};
    return cards.reduce(
      (acc, card) => {
        const colId = card.columnId;
        if (!acc[colId]) acc[colId] = [];
        acc[colId].push(card);
        return acc;
      },
      {} as Record<string, Doc<"cards">[]>
    );
  }, [cards]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards?.find((c) => c._id === active.id);
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !cards || !columns) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCard = cards.find((c) => c._id === activeId);
    if (!activeCard) return;

    // Check if dropping on a column
    const targetColumn = columns.find((c) => c._id === overId);
    if (targetColumn) {
      // Dropped on a column (not on a card)
      const columnCards = cardsByColumn[targetColumn._id] || [];
      try {
        await moveCard({
          cardId: activeCard._id,
          targetColumnId: targetColumn._id,
          newOrder: columnCards.length,
        });
      } catch {
        toast.error("Failed to move card");
      }
      return;
    }

    // Dropping on another card
    const overCard = cards.find((c) => c._id === overId);
    if (overCard) {
      const targetColumnId = overCard.columnId;
      const targetColumnCards = (cardsByColumn[targetColumnId] || []).filter(
        (c) => c._id !== activeCard._id
      );
      const overIndex = targetColumnCards.findIndex((c) => c._id === overId);
      const newOrder = overIndex >= 0 ? overIndex : targetColumnCards.length;

      try {
        await moveCard({
          cardId: activeCard._id,
          targetColumnId: targetColumnId,
          newOrder,
        });
      } catch {
        toast.error("Failed to move card");
      }
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    try {
      await createColumn({
        boardId,
        name: newColumnName.trim(),
      });
      setNewColumnName("");
      setIsAddingColumn(false);
    } catch {
      toast.error("Failed to create column");
    }
  };

  if (!columns || !cards) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="h-full">
        <div className="flex h-full gap-4 p-6">
          <SortableContext
            items={columns.map((c) => c._id)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => (
              <Column
                key={column._id}
                column={column}
                cards={cardsByColumn[column._id] || []}
              />
            ))}
          </SortableContext>

          {/* Add Column */}
          <div className="w-72 shrink-0">
            {isAddingColumn ? (
              <div className="rounded-lg border bg-card p-3">
                <Input
                  autoFocus
                  placeholder="Column name..."
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColumn();
                    if (e.key === "Escape") {
                      setIsAddingColumn(false);
                      setNewColumnName("");
                    }
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={handleAddColumn}>
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColumnName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setIsAddingColumn(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add column
              </Button>
            )}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeCard && (
          <KanbanCard card={activeCard} boardId={boardId} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}
