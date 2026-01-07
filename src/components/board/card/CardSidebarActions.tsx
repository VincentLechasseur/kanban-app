import { useState } from "react";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, Palette, Tag, User, X } from "lucide-react";
import { toast } from "sonner";

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

interface CardSidebarActionsProps {
  card: Doc<"cards">;
  labels: Doc<"labels">[] | undefined;
  members:
    | {
        _id: Id<"users">;
        name?: string;
        email?: string;
        image?: string | null;
      }[]
    | undefined;
}

export function CardSidebarActions({ card, labels, members }: CardSidebarActionsProps) {
  const updateCard = useMutation(api.cards.update);
  const setLabels = useMutation(api.cards.setLabels);
  const setAssignees = useMutation(api.cards.setAssignees);

  const [labelsOpen, setLabelsOpen] = useState(false);
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

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

  return (
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
                <div className="h-6 flex-1 rounded" style={{ backgroundColor: label.color }} />
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
                  {card.color === undefined && c.value === null && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
