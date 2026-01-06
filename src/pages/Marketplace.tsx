import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Kanban, Users, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function MarketplacePage() {
  const boards = useQuery(api.boards.listPublic);
  const userRequests = useQuery(api.joinRequests.listForUser);
  const requestToJoin = useMutation(api.joinRequests.request);
  const cancelRequest = useMutation(api.joinRequests.cancel);

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<Id<"boards"> | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingRequestBoardIds = new Set(
    userRequests?.map((r) => r.boardId) ?? []
  );

  const handleRequestToJoin = (boardId: Id<"boards">) => {
    setSelectedBoardId(boardId);
    setMessage("");
    setRequestDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedBoardId) return;
    setIsSubmitting(true);
    try {
      await requestToJoin({
        boardId: selectedBoardId,
        message: message.trim() || undefined,
      });
      toast.success("Join request sent!");
      setRequestDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send request"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (boardId: Id<"boards">) => {
    const request = userRequests?.find((r) => r.boardId === boardId);
    if (!request) return;
    try {
      await cancelRequest({ requestId: request._id });
      toast.success("Request cancelled");
    } catch {
      toast.error("Failed to cancel request");
    }
  };

  if (boards === undefined) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Globe className="h-6 w-6 text-primary" />
          Board Marketplace
        </h1>
        <p className="mt-1 text-muted-foreground">
          Discover public boards and request to join teams
        </p>
      </div>

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-medium">No public boards yet</h2>
          <p className="text-center text-muted-foreground">
            When board owners make their boards public,
            <br />
            they will appear here for you to discover.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {boards.map((board) => {
            const hasPendingRequest = pendingRequestBoardIds.has(board._id);

            return (
              <Card key={board._id} className="flex flex-col">
                <CardHeader className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Kanban className="h-5 w-5 text-primary" />
                    {board.name}
                  </CardTitle>
                  {board.description && (
                    <CardDescription className="line-clamp-2">
                      {board.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{board.memberCount} members</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <UserAvatar
                      userId={board.owner._id}
                      name={board.owner.name}
                      email={board.owner.email}
                      image={board.owner.image}
                      className="h-6 w-6"
                      fallbackClassName="text-xs"
                    />
                    <span className="text-sm text-muted-foreground">
                      by {board.owner.name ?? board.owner.email}
                    </span>
                  </div>
                </CardHeader>
                <CardFooter className="border-t pt-4">
                  {hasPendingRequest ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleCancelRequest(board._id)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Pending - Cancel
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleRequestToJoin(board._id)}
                    >
                      Request to Join
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Join</DialogTitle>
            <DialogDescription>
              Send a request to the board owner. They will review and decide
              whether to accept you as a member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Tell the owner why you'd like to join..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRequestDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
