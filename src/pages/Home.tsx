import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Kanban, Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export function HomePage() {
  const boards = useQuery(api.boards.list);
  const unreadBoardIds = useQuery(api.messages.getUnreadBoards);
  const createBoard = useMutation(api.boards.create);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const boardId = await createBoard({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Board created successfully");
      setIsOpen(false);
      setName("");
      setDescription("");
      navigate(`/board/${boardId}`);
    } catch {
      toast.error("Failed to create board");
    } finally {
      setIsCreating(false);
    }
  };

  if (boards === undefined) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Boards</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Board
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new board</DialogTitle>
              <DialogDescription>
                Add a new board to organize your tasks and collaborate with your team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Board name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Product Roadmap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="What is this board for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
                {isCreating ? "Creating..." : "Create Board"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <Kanban className="text-muted-foreground mb-4 h-12 w-12" />
          <h2 className="mb-2 text-xl font-medium">No boards yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first board to start organizing tasks
          </p>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Board
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {boards.map((board) => {
            const hasUnread = unreadBoardIds?.includes(board._id);
            return (
              <Card
                key={board._id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/board/${board._id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Kanban className="text-primary h-5 w-5" />
                    {board.name}
                    {hasUnread && (
                      <span className="relative ml-auto">
                        <MessageCircle className="text-muted-foreground h-4 w-4" />
                        <span className="bg-destructive absolute -top-1 -right-1 h-2 w-2 rounded-full" />
                      </span>
                    )}
                  </CardTitle>
                  {board.description && (
                    <CardDescription className="line-clamp-2">{board.description}</CardDescription>
                  )}
                  {board.memberIds.length > 0 && (
                    <div className="text-muted-foreground flex items-center gap-1 pt-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span>{board.memberIds.length + 1} members</span>
                    </div>
                  )}
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
