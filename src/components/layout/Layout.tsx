import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createBoard = useMutation(api.boards.create);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const boardId = await createBoard({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Board created successfully");
      setCreateOpen(false);
      setName("");
      setDescription("");
      navigate(`/board/${boardId}`);
    } catch {
      toast.error("Failed to create board");
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateDialog = () => {
    setSidebarOpen(false);
    setCreateOpen(true);
  };

  return (
    <div className="flex h-screen flex-col">
      <Header onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 border-r bg-card lg:block">
          <Sidebar onCreateBoard={openCreateDialog} />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar onCreateBoard={openCreateDialog} />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-muted/30">
          <Outlet />
        </main>
      </div>

      {/* Create Board Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new board</DialogTitle>
            <DialogDescription>
              Add a new board to organize your tasks and collaborate with your
              team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="board-name">Board name</Label>
              <Input
                id="board-name"
                placeholder="e.g., Product Roadmap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-description">Description (optional)</Label>
              <Input
                id="board-description"
                placeholder="What is this board for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
