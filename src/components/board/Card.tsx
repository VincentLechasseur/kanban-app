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
  compactView?: boolean;
}

export function KanbanCard({ card, boardId, isDragging, compactView = false }: KanbanCardProps) {
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
        {card.color && (
          <div
            className={cn("w-full", compactView ? "h-1" : "h-1.5")}
            style={{ backgroundColor: card.color }}
          />
        )}
        <div className={cn(compactView ? "p-2" : "p-3")}>
          {/* Labels */}
          {cardLabels.length > 0 && (
            <div className={cn("flex flex-wrap gap-1", compactView ? "mb-1" : "mb-2")}>
              {cardLabels.map((label) => (
                <div
                  key={label._id}
                  className={cn("rounded-full", compactView ? "h-1.5 w-6" : "h-2 w-10")}
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                />
              ))}
            </div>
          )}

          {/* Title */}
          <p className={cn("font-medium", compactView ? "line-clamp-2 text-xs" : "text-sm")}>
            {card.title}
          </p>

          {/* Description preview - hidden in compact mode */}
          {card.description && !compactView && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{card.description}</p>
          )}

          {/* Story Points & Time */}
          {(card.storyPoints || card.timeEstimate || card.timeSpent) && (
            <div className={cn("flex flex-wrap gap-1.5", compactView ? "mt-1.5" : "mt-2")}>
              {card.storyPoints && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
                    compactView ? "px-1.5 py-0 text-[10px]" : "text-xs"
                  )}
                >
                  <Zap className={cn(compactView ? "mr-0.5 h-2.5 w-2.5" : "mr-1 h-3 w-3")} />
                  {card.storyPoints}
                </Badge>
              )}
              {(card.timeEstimate || card.timeSpent) && (
                <Badge
                  variant="secondary"
                  className={cn(
                    card.timeSpent && card.timeEstimate && card.timeSpent > card.timeEstimate
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                    compactView ? "px-1.5 py-0 text-[10px]" : "text-xs"
                  )}
                  title={`${card.timeSpent ? formatTime(card.timeSpent) : "0m"} spent${card.timeEstimate ? ` of ${formatTime(card.timeEstimate)} estimated` : ""}`}
                >
                  <Clock className={cn(compactView ? "mr-0.5 h-2.5 w-2.5" : "mr-1 h-3 w-3")} />
                  {compactView ? (
                    // Compact: just show values
                    <>
                      {card.timeSpent ? formatTime(card.timeSpent) : "0m"}
                      {card.timeEstimate && `/${formatTime(card.timeEstimate)}`}
                    </>
                  ) : (
                    // Normal: show with labels
                    <>
                      <span className="opacity-70">spent</span>
                      <span className="mx-1 font-semibold">
                        {card.timeSpent ? formatTime(card.timeSpent) : "0m"}
                      </span>
                      {card.timeEstimate && (
                        <>
                          <span className="opacity-50">·</span>
                          <span className="ml-1 opacity-70">est</span>
                          <span className="ml-1 font-semibold">
                            {formatTime(card.timeEstimate)}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          {(card.dueDate || (assignees && assignees.length > 0)) && (
            <div
              className={cn("flex items-center justify-between", compactView ? "mt-1.5" : "mt-2")}
            >
              {/* Due date */}
              {card.dueDate && (
                <Badge
                  variant="secondary"
                  className={cn(
                    dueDateStatus === "overdue" &&
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    dueDateStatus === "today" &&
                      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                    dueDateStatus === "tomorrow" &&
                      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                    compactView ? "px-1.5 py-0 text-[10px]" : "text-xs"
                  )}
                >
                  <Calendar className={cn(compactView ? "mr-0.5 h-2.5 w-2.5" : "mr-1 h-3 w-3")} />
                  {format(new Date(card.dueDate), compactView ? "M/d" : "MMM d")}
                </Badge>
              )}

              {/* Assignees */}
              {assignees && assignees.length > 0 && (
                <div className={cn("flex", compactView ? "-space-x-1.5" : "-space-x-2")}>
                  {assignees.slice(0, compactView ? 2 : 3).map((user) => (
                    <UserAvatar
                      key={user._id}
                      userId={user._id}
                      name={user.name}
                      email={user.email}
                      image={user.image}
                      className={cn(
                        "border-background border-2",
                        compactView ? "h-5 w-5" : "h-6 w-6"
                      )}
                      fallbackClassName={cn(compactView ? "text-[9px]" : "text-xs")}
                    />
                  ))}
                  {assignees.length > (compactView ? 2 : 3) && (
                    <div
                      className={cn(
                        "border-background bg-muted flex items-center justify-center rounded-full border-2",
                        compactView ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-xs"
                      )}
                    >
                      +{assignees.length - (compactView ? 2 : 3)}
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
