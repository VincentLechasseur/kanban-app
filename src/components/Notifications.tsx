import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { api } from "../../convex/_generated/api";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCheck } from "lucide-react";

export function Notifications() {
  const navigate = useNavigate();
  const notifications = useQuery(api.notifications.list);
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const handleNotificationClick = async (notification: NonNullable<typeof notifications>[0]) => {
    if (!notification.read) {
      await markAsRead({ id: notification._id });
    }
    // Navigate to the board/card
    navigate(`/board/${notification.boardId}`);
  };

  return (
    <Popover>
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

        <ScrollArea className="max-h-80">
          {notifications === undefined ? (
            <div className="flex items-center justify-center py-8">
              <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
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
                  <UserAvatar
                    userId={notification.fromUser._id}
                    name={notification.fromUser.name}
                    email={notification.fromUser.email}
                    image={notification.fromUser.image}
                    className="h-8 w-8 shrink-0"
                    fallbackClassName="text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">
                        {notification.fromUser.name ?? notification.fromUser.email}
                      </span>{" "}
                      mentioned you in{" "}
                      <span className="font-medium">{notification.card.title}</span>
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {notification.board.name} •{" "}
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
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
