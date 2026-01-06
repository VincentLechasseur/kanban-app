import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarColor, getInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  userId: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({
  userId,
  name,
  email,
  image,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const { bg, fg } = getAvatarColor(userId);
  const initials = getInitials(name, email);

  return (
    <Avatar className={cn("ring-1 ring-border", className)}>
      {image && <AvatarImage src={image} alt={name ?? "User"} />}
      <AvatarFallback
        className={cn("font-medium", fallbackClassName)}
        style={{ backgroundColor: bg, color: fg }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
