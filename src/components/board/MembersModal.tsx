import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Crown, Loader2, UserMinus, UserPlus, X, Clock } from "lucide-react";
import { toast } from "sonner";

interface MembersModalProps {
  boardId: Id<"boards">;
  ownerId: Id<"users">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MembersModal({ boardId, ownerId, open, onOpenChange }: MembersModalProps) {
  const currentUser = useQuery(api.users.currentUser);
  const members = useQuery(api.boards.getMembers, { boardId });
  const joinRequests = useQuery(api.joinRequests.listForBoard, { boardId });
  const addMember = useMutation(api.boards.addMember);
  const removeMember = useMutation(api.boards.removeMember);
  const acceptRequest = useMutation(api.joinRequests.accept);
  const rejectRequest = useMutation(api.joinRequests.reject);

  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [removingId, setRemovingId] = useState<Id<"users"> | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<Id<"joinRequests"> | null>(null);

  const isOwner = currentUser?._id === ownerId;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsInviting(true);
    try {
      await addMember({ boardId, email: email.trim() });
      toast.success("Member invited successfully");
      setEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite member");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (memberId: Id<"users">) => {
    setRemovingId(memberId);
    try {
      await removeMember({ boardId, memberId });
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const handleAcceptRequest = async (requestId: Id<"joinRequests">) => {
    setProcessingRequestId(requestId);
    try {
      await acceptRequest({ requestId });
      toast.success("Request accepted");
    } catch {
      toast.error("Failed to accept request");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: Id<"joinRequests">) => {
    setProcessingRequestId(requestId);
    try {
      await rejectRequest({ requestId });
      toast.success("Request rejected");
    } catch {
      toast.error("Failed to reject request");
    } finally {
      setProcessingRequestId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Board Members</DialogTitle>
          <DialogDescription>Manage who has access to this board</DialogDescription>
        </DialogHeader>

        {/* Pending Requests Section - Only for owner */}
        {isOwner && joinRequests && joinRequests.length > 0 && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground h-4 w-4" />
                <p className="text-muted-foreground text-sm font-medium">
                  {joinRequests.length} pending request{joinRequests.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {joinRequests.map((request) => (
                  <div
                    key={request._id}
                    className="border-primary/50 bg-primary/5 flex items-center justify-between rounded-lg border border-dashed p-3"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        userId={request.user._id}
                        name={request.user.name}
                        email={request.user.email}
                        image={request.user.image}
                        className="h-9 w-9"
                      />
                      <div>
                        <span className="text-sm font-medium">
                          {request.user.name ?? request.user.email}
                        </span>
                        <p className="text-muted-foreground text-xs">
                          {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                        </p>
                        {request.message && (
                          <p className="text-muted-foreground mt-1 text-xs italic">
                            "{request.message}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:bg-green-100 hover:text-green-700"
                        onClick={() => handleAcceptRequest(request._id)}
                        disabled={processingRequestId === request._id}
                      >
                        {processingRequestId === request._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-100 hover:text-red-700"
                        onClick={() => handleRejectRequest(request._id)}
                        disabled={processingRequestId === request._id}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Invite Form */}
        {isOwner && (
          <>
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email to invite..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isInviting || !email.trim()}>
                {isInviting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </form>
            <Separator />
          </>
        )}

        {/* Members List */}
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium">
            {members?.length ?? 0} member{members?.length !== 1 ? "s" : ""}
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {members?.map((member) => {
              const isMemberOwner = member._id === ownerId;
              const isCurrentUser = member._id === currentUser?._id;

              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      userId={member._id}
                      name={member.name}
                      email={member.email}
                      image={member.image}
                      className="h-9 w-9"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {member.name ?? member.email}
                          {isCurrentUser && <span className="text-muted-foreground"> (you)</span>}
                        </span>
                        {isMemberOwner && (
                          <Badge variant="secondary" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Owner
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">{member.email}</p>
                    </div>
                  </div>

                  {/* Remove button - only for owner, can't remove self or owner */}
                  {isOwner && !isMemberOwner && !isCurrentUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                      onClick={() => handleRemove(member._id)}
                      disabled={removingId === member._id}
                    >
                      {removingId === member._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {!isOwner && (
          <p className="text-muted-foreground text-center text-xs">
            Only the board owner can invite or remove members
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
