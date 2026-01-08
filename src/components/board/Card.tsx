import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "convex/react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { CardModal } from "./CardModal";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Zap } from "lucide-react";

// Format minutes to hours/minutes string
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

interface KanbanCardProps {
  card: Doc<"cards">;
  boardId: Id<"boards">;
  isDragging?: boolean;
}

export function KanbanCard({ card, boardId, isDragging }: KanbanCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const labels = useQuery(api.labels.list, { boardId });
  const assignees = useQuery(api.users.getMany, { ids: card.assigneeIds });

  // Auto-open if URL param matches this card
  useEffect(() => {
    const cardParam = searchParams.get("card");
    if (cardParam === card._id) {
      setModalOpen(true);
      // Clear the param after opening
      searchParams.delete("card");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, card._id]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: card._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardLabels = labels?.filter((l) => card.labelIds.includes(l._id)) || [];

  const getDueDateStatus = () => {
    if (!card.dueDate) return null;
    const date = new Date(card.dueDate);
    if (isPast(date) && !isToday(date)) return "overdue";
    if (isToday(date)) return "today";
    if (isTomorrow(date)) return "tomorrow";
    return "upcoming";
  };

  const dueDateStatus = getDueDateStatus();

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "bg-background cursor-grab overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
          (isDragging || isSortableDragging) && "opacity-50 shadow-lg",
          isDragging && "rotate-3"
        )}
        onClick={() => setModalOpen(true)}
      >
        {/* Color Bar */}
        {card.color && <div className="h-1.5 w-full" style={{ backgroundColor: card.color }} />}
        <div className="p-3">
          {/* Labels */}
          {cardLabels.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {cardLabels.map((label) => (
                <div
                  key={label._id}
                  className="h-2 w-10 rounded-full"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                />
              ))}
            </div>
          )}

          {/* Title */}
          <p className="text-sm font-medium">{card.title}</p>

          {/* Description preview */}
          {card.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{card.description}</p>
          )}

          {/* Story Points & Time */}
          {(card.storyPoints || card.timeEstimate || card.timeSpent) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {card.storyPoints && (
                <Badge
                  variant="secondary"
                  className="bg-indigo-100 text-xs text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                >
                  <Zap className="mr-1 h-3 w-3" />
                  {card.storyPoints} SP
                </Badge>
              )}
              {(card.timeEstimate || card.timeSpent) && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    card.timeSpent && card.timeEstimate && card.timeSpent > card.timeEstimate
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  <Clock className="mr-1 h-3 w-3" />
                  {card.timeSpent ? formatTime(card.timeSpent) : "0m"}
                  {card.timeEstimate && ` / ${formatTime(card.timeEstimate)}`}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          {(card.dueDate || (assignees && assignees.length > 0)) && (
            <div className="mt-2 flex items-center justify-between">
              {/* Due date */}
              {card.dueDate && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    dueDateStatus === "overdue" &&
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    dueDateStatus === "today" &&
                      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                    dueDateStatus === "tomorrow" &&
                      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  )}
                >
                  <Calendar className="mr-1 h-3 w-3" />
                  {format(new Date(card.dueDate), "MMM d")}
                </Badge>
              )}

              {/* Assignees */}
              {assignees && assignees.length > 0 && (
                <div className="flex -space-x-2">
                  {assignees.slice(0, 3).map((user) => (
                    <UserAvatar
                      key={user._id}
                      userId={user._id}
                      name={user.name}
                      email={user.email}
                      image={user.image}
                      className="border-background h-6 w-6 border-2"
                      fallbackClassName="text-xs"
                    />
                  ))}
                  {assignees.length > 3 && (
                    <div className="border-background bg-muted flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CardModal card={card} boardId={boardId} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
