import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { UserAvatar } from "@/components/UserAvatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
  Plus,
  ArrowRight,
  Trash2,
  UserPlus,
  UserMinus,
  Tag,
  MessageSquare,
  Columns,
  Settings,
} from "lucide-react";

interface ActivityFeedProps {
  boardId: Id<"boards">;
  limit?: number;
}

const activityIcons: Record<string, React.ReactNode> = {
  card_created: <Plus className="h-3.5 w-3.5" />,
  card_moved: <ArrowRight className="h-3.5 w-3.5" />,
  card_updated: <Settings className="h-3.5 w-3.5" />,
  card_deleted: <Trash2 className="h-3.5 w-3.5" />,
  card_assigned: <UserPlus className="h-3.5 w-3.5" />,
  card_unassigned: <UserMinus className="h-3.5 w-3.5" />,
  label_added: <Tag className="h-3.5 w-3.5" />,
  label_removed: <Tag className="h-3.5 w-3.5" />,
  column_created: <Columns className="h-3.5 w-3.5" />,
  column_deleted: <Columns className="h-3.5 w-3.5" />,
  member_added: <UserPlus className="h-3.5 w-3.5" />,
  member_removed: <UserMinus className="h-3.5 w-3.5" />,
  comment_added: <MessageSquare className="h-3.5 w-3.5" />,
  board_updated: <Settings className="h-3.5 w-3.5" />,
};

const activityColors: Record<string, string> = {
  card_created: "bg-green-500",
  card_moved: "bg-blue-500",
  card_updated: "bg-yellow-500",
  card_deleted: "bg-red-500",
  card_assigned: "bg-purple-500",
  card_unassigned: "bg-purple-400",
  label_added: "bg-orange-500",
  label_removed: "bg-orange-400",
  column_created: "bg-teal-500",
  column_deleted: "bg-red-400",
  member_added: "bg-indigo-500",
  member_removed: "bg-indigo-400",
  comment_added: "bg-cyan-500",
  board_updated: "bg-gray-500",
};

function getActivityDescription(activity: {
  type: string;
  metadata?: {
    cardTitle?: string;
    fromColumnName?: string;
    toColumnName?: string;
    columnName?: string;
    labelName?: string;
    targetUserName?: string;
  } | null;
  targetUser?: { name?: string; email?: string } | null;
}): string {
  const meta = activity.metadata;
  const target = activity.targetUser?.name ?? activity.targetUser?.email ?? meta?.targetUserName;
  const card = meta?.cardTitle ? `"${meta.cardTitle}"` : "a card";

  switch (activity.type) {
    case "card_created":
      return `created card ${card}${meta?.columnName ? ` in ${meta.columnName}` : ""}`;
    case "card_moved":
      return `moved ${card}${meta?.fromColumnName && meta?.toColumnName ? ` from ${meta.fromColumnName} to ${meta.toColumnName}` : ""}`;
    case "card_updated":
      return `updated ${card}`;
    case "card_deleted":
      return `deleted ${card}`;
    case "card_assigned":
      return `assigned ${target ?? "someone"} to ${card}`;
    case "card_unassigned":
      return `unassigned ${target ?? "someone"} from ${card}`;
    case "label_added":
      return `added label "${meta?.labelName ?? "unknown"}" to ${card}`;
    case "label_removed":
      return `removed label "${meta?.labelName ?? "unknown"}" from ${card}`;
    case "column_created":
      return `created column "${meta?.columnName ?? "unknown"}"`;
    case "column_deleted":
      return `deleted column "${meta?.columnName ?? "unknown"}"`;
    case "member_added":
      return `added ${target ?? "someone"} to the board`;
    case "member_removed":
      return `removed ${target ?? "someone"} from the board`;
    case "comment_added":
      return `commented on ${card}`;
    case "board_updated":
      return "updated board settings";
    default:
      return "performed an action";
  }
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function ActivityFeed({ boardId, limit = 50 }: ActivityFeedProps) {
  const activities = useQuery(api.activities.listByBoard, { boardId, limit });

  if (activities === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="bg-muted mb-3 rounded-full p-3">
          <Settings className="text-muted-foreground h-6 w-6" />
        </div>
        <p className="text-muted-foreground text-sm">No activity yet</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Activities will appear here as changes are made
        </p>
      </div>
    );
  }

  // Group activities by date
  const groupedActivities: { date: string; activities: typeof activities }[] = [];
  let currentDate = "";

  activities.forEach((activity) => {
    const date = formatDate(activity.createdAt);
    if (date !== currentDate) {
      currentDate = date;
      groupedActivities.push({ date, activities: [] });
    }
    groupedActivities[groupedActivities.length - 1].activities.push(activity);
  });

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {groupedActivities.map((group) => (
          <div key={group.date}>
            <div className="bg-background/95 sticky top-0 z-10 mb-3 py-2 backdrop-blur-sm">
              <h3 className="text-muted-foreground text-sm font-semibold">{group.date}</h3>
            </div>
            <div className="space-y-3">
              {group.activities.map((activity) => (
                <div key={activity._id} className="group flex items-start gap-3">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
                        activityColors[activity.type] ?? "bg-gray-500"
                      }`}
                    >
                      {activityIcons[activity.type] ?? <Settings className="h-3.5 w-3.5" />}
                    </div>
                    <div className="bg-border mt-1 w-px flex-1 group-last:hidden" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pb-3">
                    <div className="mb-1 flex items-center gap-2">
                      {activity.user && (
                        <UserAvatar
                          userId={activity.user._id}
                          name={activity.user.name}
                          email={activity.user.email}
                          image={activity.user.image}
                          className="h-5 w-5"
                          fallbackClassName="text-[10px]"
                        />
                      )}
                      <span className="truncate text-sm font-medium">
                        {activity.user?.name ?? activity.user?.email ?? "Unknown"}
                      </span>
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatRelativeTime(activity.createdAt)}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {getActivityDescription(activity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
