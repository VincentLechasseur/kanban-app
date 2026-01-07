import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMentions } from "@/hooks/useMentions";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Send, X } from "lucide-react";
import { toast } from "sonner";

interface User {
  _id: Id<"users">;
  name?: string;
  email?: string;
  image?: string | null;
}

interface Comment {
  _id: Id<"comments">;
  content: string;
  createdAt: number;
  userId: Id<"users">;
  user: User;
}

interface CardCommentsProps {
  cardId: Id<"cards">;
  boardId: Id<"boards">;
  comments: Comment[] | undefined;
  members: User[] | undefined;
  currentUser: User | undefined | null;
}

export function CardComments({
  cardId,
  boardId,
  comments,
  members,
  currentUser,
}: CardCommentsProps) {
  const addComment = useMutation(api.comments.add);
  const removeComment = useMutation(api.comments.remove);
  const createMentionNotification = useMutation(api.notifications.createMentionNotification);

  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const {
    showMentions,
    mentionSuggestions,
    selectedMentionIndex,
    handleInputChange,
    handleKeyDown,
    insertMention,
    parseMentions,
    renderMentionText,
    setSelectedMentionIndex,
  } = useMentions({
    members,
    currentUser,
    inputRef: commentInputRef,
  });

  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const commentContent = newComment.trim();
      const commentId = await addComment({ cardId, content: commentContent });

      // Create notifications for mentioned users
      const mentionedUserIds = parseMentions(commentContent);
      for (const mentionedUserId of mentionedUserIds) {
        await createMentionNotification({
          mentionedUserId,
          cardId,
          boardId,
          commentId,
        });
      }

      setNewComment("");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewComment(value);
    handleInputChange(value, e.target.selectionStart ?? value.length);
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    const result = handleKeyDown(e, newComment);
    if (result.handled) {
      if (result.newValue !== undefined) {
        setNewComment(result.newValue);
        commentInputRef.current?.focus();
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleInsertMention = (user: User) => {
    const newValue = insertMention(user, newComment);
    setNewComment(newValue);
    commentInputRef.current?.focus();
  };

  const handleDeleteComment = async (commentId: Id<"comments">) => {
    try {
      await removeComment({ id: commentId });
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <>
      <Separator className="my-2" />
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <Label>Comments</Label>
          {comments && comments.length > 0 && (
            <span className="text-muted-foreground text-xs">({comments.length})</span>
          )}
        </div>

        {/* Comments List */}
        {comments && comments.length > 0 && (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment._id} className="group flex gap-3">
                <UserAvatar
                  userId={comment.user._id}
                  name={comment.user.name}
                  email={comment.user.email}
                  image={comment.user.image}
                  className="h-8 w-8 shrink-0"
                  fallbackClassName="text-xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.user.name ?? comment.user.email}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {comment.userId === currentUser?._id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive ml-auto h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleDeleteComment(comment._id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm">{renderMentionText(comment.content)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mention suggestions */}
        {showMentions && mentionSuggestions.length > 0 && (
          <div className="bg-popover mb-2 max-h-40 overflow-y-auto rounded-md border p-1 shadow-md">
            <div className="text-muted-foreground px-2 py-1 text-xs font-semibold">
              Team Members
            </div>
            {mentionSuggestions.map((user, index) => (
              <button
                key={user._id}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none ${
                  index === selectedMentionIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => handleInsertMention(user)}
                onMouseEnter={() => setSelectedMentionIndex(index)}
              >
                <UserAvatar
                  userId={user._id}
                  name={user.name}
                  email={user.email}
                  image={user.image}
                  className="h-5 w-5"
                  fallbackClassName="text-xs"
                />
                <span>{user.name ?? user.email}</span>
                {user.name && <span className="text-muted-foreground text-xs">{user.email}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Add Comment */}
        <div className="flex gap-2">
          <Input
            ref={commentInputRef}
            placeholder="Write a comment... (use @ to mention)"
            value={newComment}
            onChange={handleCommentInputChange}
            onKeyDown={handleCommentKeyDown}
            disabled={isSubmittingComment}
          />
          <Button
            size="icon"
            onClick={handleAddComment}
            disabled={!newComment.trim() || isSubmittingComment}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
