import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { api } from "../../convex/_generated/api";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  MessageCircle,
  Trash2,
  UserPlus,
  UserCheck,
  UserX,
} from "lucide-react";

type NotificationType =
  | "mention"
  | "chat_mention"
  | "assignment"
  | "join_request"
  | "join_request_accepted"
  | "join_request_rejected";

// Notification icon based on type
function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case "chat_mention":
      return <MessageCircle className="h-3 w-3 text-blue-500" />;
    case "mention":
      return <MessageSquare className="h-3 w-3 text-green-500" />;
    case "join_request":
      return <UserPlus className="h-3 w-3 text-orange-500" />;
    case "join_request_accepted":
      return <UserCheck className="h-3 w-3 text-emerald-500" />;
    case "join_request_rejected":
      return <UserX className="h-3 w-3 text-red-500" />;
    default:
      return <Bell className="h-3 w-3 text-gray-500" />;
  }
}

// Notification message based on type
function NotificationMessage({
  notification,
}: {
  notification: {
    type: NotificationType;
    fromUser: { name?: string; email?: string };
    card?: { title: string } | null;
    board: { name: string };
  };
}) {
  const userName = notification.fromUser.name ?? notification.fromUser.email;

  switch (notification.type) {
    case "chat_mention":
      return (
        <>
          <span className="font-medium">{userName}</span> mentioned you in chat
        </>
      );
    case "mention":
      return (
        <>
          <span className="font-medium">{userName}</span> mentioned you in{" "}
          <span className="font-medium">{notification.card?.title}</span>
        </>
      );
    case "join_request":
      return (
        <>
          <span className="font-medium">{userName}</span> requested to join{" "}
          <span className="font-medium">{notification.board.name}</span>
        </>
      );
    case "join_request_accepted":
      return (
        <>
          <span className="font-medium">{userName}</span> accepted your request to join{" "}
          <span className="font-medium">{notification.board.name}</span>
        </>
      );
    case "join_request_rejected":
      return (
        <>
          <span className="font-medium">{userName}</span> declined your request to join{" "}
          <span className="font-medium">{notification.board.name}</span>
        </>
      );
    default:
      return (
        <>
          <span className="font-medium">{userName}</span> sent you a notification
        </>
      );
  }
}

export function Notifications() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const notifications = useQuery(api.notifications.list);
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const clearAll = useMutation(api.notifications.clearAll);

  const handleNotificationClick = async (notification: NonNullable<typeof notifications>[0]) => {
    if (!notification.read) {
      await markAsRead({ id: notification._id });
    }

    setOpen(false);

    // Navigate based on notification type
    if (notification.type === "chat_mention") {
      navigate(`/board/${notification.boardId}?chat=true`);
    } else if (notification.type === "mention" && notification.card) {
      navigate(`/board/${notification.boardId}?card=${notification.card._id}`);
    } else if (notification.type === "join_request") {
      // Navigate to board with members modal open
      navigate(`/board/${notification.boardId}?members=true`);
    } else {
      navigate(`/board/${notification.boardId}`);
    }
  };

  const handleClearAll = async () => {
    await clearAll();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount !== undefined && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto">
          {notifications === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification._id}
                  className={`hover:bg-muted flex w-full items-start gap-3 p-4 text-left transition-colors ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="relative">
                    <UserAvatar
                      userId={notification.fromUser._id}
                      name={notification.fromUser.name}
                      email={notification.fromUser.email}
                      image={notification.fromUser.image}
                      className="h-8 w-8 shrink-0"
                      fallbackClassName="text-xs"
                    />
                    {/* Icon badge to indicate notification type */}
                    <div className="bg-background absolute -right-1 -bottom-1 rounded-full p-0.5">
                      <NotificationIcon type={notification.type as NotificationType} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <NotificationMessage
                        notification={{
                          type: notification.type as NotificationType,
                          fromUser: notification.fromUser,
                          card: notification.card,
                          board: notification.board,
                        }}
                      />
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="bg-primary mt-2 h-2 w-2 shrink-0 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear All Button - Always visible at bottom */}
        {notifications && notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive w-full text-xs"
              onClick={handleClearAll}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Clear all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
