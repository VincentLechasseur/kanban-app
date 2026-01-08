import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Board } from "@/components/board/Board";
import { MembersModal } from "@/components/board/MembersModal";
import { BoardChat } from "@/components/board/BoardChat";
import { ActivityFeed } from "@/components/board/ActivityFeed";
import { BoardAnalytics } from "@/components/board/BoardAnalytics";
import { useCommandPaletteContext } from "@/contexts/CommandPaletteContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { EmojiPicker } from "@/components/EmojiPicker";
import {
  Activity,
  BarChart3,
  Globe,
  Lock,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const board = useQuery(api.boards.get, boardId ? { id: boardId as Id<"boards"> } : "skip");
  const members = useQuery(
    api.boards.getMembers,
    boardId ? { boardId: boardId as Id<"boards"> } : "skip"
  );
  const currentUser = useQuery(api.users.currentUser);
  const pendingRequestCount = useQuery(
    api.joinRequests.getPendingCount,
    boardId ? { boardId: boardId as Id<"boards"> } : "skip"
  );
  const columns = useQuery(
    api.columns.list,
    boardId ? { boardId: boardId as Id<"boards"> } : "skip"
  );
  const updateBoard = useMutation(api.boards.update);
  const deleteBoard = useMutation(api.boards.remove);
  const updateVisibility = useMutation(api.boards.updateVisibility);
  const createCard = useMutation(api.cards.create);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [chatState, setChatState] = useState<"hidden" | "minimized" | "expanded">("minimized");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddColumnId, setQuickAddColumnId] = useState<Id<"columns"> | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // URL search params for opening chat/card from notifications
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<Set<Id<"users">>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Command palette integration
  const { registerBoardActions, clearBoardActions } = useCommandPaletteContext();

  // Handle URL params for opening chat from notifications
  useEffect(() => {
    const shouldOpenChat = searchParams.get("chat") === "true";
    if (shouldOpenChat && board) {
      setChatState("expanded");
      // Clear the param after opening
      searchParams.delete("chat");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, board]);

  const toggleAssigneeFilter = (userId: Id<"users">) => {
    setSelectedAssigneeIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedAssigneeIds(new Set());
  };

  const hasActiveFilters = searchQuery.trim() !== "" || selectedAssigneeIds.size > 0;

  const openQuickAddCard = () => {
    // Default to first column if available
    if (columns && columns.length > 0) {
      setQuickAddColumnId(columns[0]._id);
    }
    setQuickAddTitle("");
    setQuickAddOpen(true);
  };

  const handleQuickAddCard = async () => {
    if (!quickAddTitle.trim() || !quickAddColumnId) return;
    try {
      await createCard({
        columnId: quickAddColumnId,
        title: quickAddTitle.trim(),
      });
      toast.success("Card created");
      setQuickAddOpen(false);
      setQuickAddTitle("");
    } catch {
      toast.error("Failed to create card");
    }
  };

  // Register board actions for command palette
  useEffect(() => {
    if (!board) return;

    const isOwner = currentUser?._id === board.ownerId;

    registerBoardActions({
      boardName: board.name,
      isOwner,
      openEditBoard: () => {
        setName(board.name);
        setDescription(board.description ?? "");
        setIcon(board.icon ?? "");
        setEditOpen(true);
      },
      openDeleteBoard: isOwner ? () => setDeleteOpen(true) : undefined,
      openMembersModal: () => setMembersOpen(true),
      toggleChat: () => setChatState((prev) => (prev === "expanded" ? "minimized" : "expanded")),
      createCard: openQuickAddCard,
      focusSearch: () => {
        searchInputRef.current?.focus();
      },
      clearFilters,
      hasActiveFilters,
    });

    return () => {
      clearBoardActions();
    };
  }, [board, currentUser?._id, hasActiveFilters, columns, registerBoardActions, clearBoardActions]);

  if (!boardId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Board not found</p>
      </div>
    );
  }

  if (board === undefined) {
    return (
      <div className="h-full p-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="flex h-[calc(100%-4rem)] gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-full w-72 shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (board === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Board not found or you don't have access</p>
      </div>
    );
  }

  const handleEdit = () => {
    setName(board.name);
    setDescription(board.description ?? "");
    setIcon(board.icon ?? "");
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateBoard({
        id: board._id,
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon || undefined,
      });
      toast.success("Board updated");
      setEditOpen(false);
    } catch {
      toast.error("Failed to update board");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBoard({ id: board._id });
      toast.success("Board deleted");
      navigate("/");
    } catch {
      toast.error("Failed to delete board");
    }
  };

  const handleToggleVisibility = async () => {
    try {
      await updateVisibility({
        id: board._id,
        isPublic: !board.isPublic,
      });
      toast.success(board.isPublic ? "Board is now private" : "Board is now public");
    } catch {
      toast.error("Failed to update visibility");
    }
  };

  const isOwner = currentUser?._id === board.ownerId;

  return (
    <div className="flex h-full flex-col">
      <div className="bg-background flex items-center justify-between border-b px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{board.name}</h1>
            {board.isPublic ? (
              <Badge variant="secondary" className="gap-1">
                <Globe className="h-3 w-3" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Private
              </Badge>
            )}
            {isOwner && pendingRequestCount !== undefined && pendingRequestCount > 0 && (
              <Badge variant="default" className="gap-1">
                {pendingRequestCount} request{pendingRequestCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {board.description && (
            <p className="text-muted-foreground text-sm">{board.description}</p>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              ref={searchInputRef}
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 pr-8 pl-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-0.5 h-7 w-7 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Assignee Filter */}
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSelectedAssigneeIds(new Set())}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                      selectedAssigneeIds.size === 0
                        ? "border-primary bg-primary/10"
                        : "hover:border-muted-foreground/30 border-transparent"
                    )}
                  >
                    <UserCircle2
                      className={cn(
                        "h-5 w-5",
                        selectedAssigneeIds.size === 0 ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>All assignees</p>
                </TooltipContent>
              </Tooltip>

              {members?.map((member) => (
                <Tooltip key={member._id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => toggleAssigneeFilter(member._id)}
                      className={cn(
                        "rounded-full border-2 transition-all",
                        selectedAssigneeIds.has(member._id)
                          ? "border-primary"
                          : "hover:border-muted-foreground/30 border-transparent"
                      )}
                    >
                      <UserAvatar
                        userId={member._id}
                        name={member.name}
                        email={member.email}
                        image={member.image}
                        className={cn(
                          "h-7 w-7",
                          !selectedAssigneeIds.has(member._id) &&
                            selectedAssigneeIds.size > 0 &&
                            "opacity-40"
                        )}
                        fallbackClassName="text-xs"
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{member.name ?? member.email}</p>
                  </TooltipContent>
                </Tooltip>
              ))}

              {hasActiveFilters && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-7 w-7"
                      onClick={clearFilters}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear filters</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>

          <div className="bg-border h-6 w-px" />
        </div>

        <div className="flex items-center gap-3">
          {/* Member Avatars */}
          <TooltipProvider>
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {members?.slice(0, 4).map((member) => (
                  <Tooltip key={member._id}>
                    <TooltipTrigger asChild>
                      <span>
                        <UserAvatar
                          userId={member._id}
                          name={member.name}
                          email={member.email}
                          image={member.image}
                          className="border-background h-8 w-8 border-2"
                          fallbackClassName="text-xs"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{member.name ?? member.email}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {members && members.length > 4 && (
                  <div className="border-background bg-muted flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium">
                    +{members.length - 4}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => setMembersOpen(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                {members?.length ?? 0}
              </Button>
            </div>
          </TooltipProvider>

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit board
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMembersOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                Manage members
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem onClick={handleToggleVisibility}>
                  {board.isPublic ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Make private
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Make public
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActivityOpen(true)}>
                <Activity className="mr-2 h-4 w-4" />
                Activity feed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAnalyticsOpen(true)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Board
        boardId={board._id}
        searchQuery={searchQuery}
        selectedAssigneeIds={selectedAssigneeIds}
      />

      {/* Members Modal */}
      <MembersModal
        boardId={board._id}
        ownerId={board.ownerId}
        open={membersOpen}
        onOpenChange={setMembersOpen}
      />

      {/* Team Chat */}
      <BoardChat boardId={board._id} state={chatState} onStateChange={setChatState} />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit board</DialogTitle>
            <DialogDescription>Update your board's name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Board name</Label>
              <div className="flex gap-2">
                <EmojiPicker value={icon} onChange={setIcon} />
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{board.name}" and all its columns and cards. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Add Card Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create new card</DialogTitle>
            <DialogDescription>Add a new card to your board.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-add-column">Column</Label>
              <select
                id="quick-add-column"
                value={quickAddColumnId ?? ""}
                onChange={(e) => setQuickAddColumnId(e.target.value as Id<"columns">)}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {columns?.map((col) => (
                  <option key={col._id} value={col._id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-add-title">Card title</Label>
              <Input
                id="quick-add-title"
                placeholder="Enter card title..."
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickAddCard()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickAddCard}
              disabled={!quickAddTitle.trim() || !quickAddColumnId}
            >
              Create Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Feed Modal */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="flex h-[85vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </DialogTitle>
            <DialogDescription>Recent activity on this board</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ActivityFeed boardId={board._id} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Modal */}
      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="flex h-[90vh] max-w-6xl flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Board Analytics
            </DialogTitle>
            <DialogDescription>Insights and statistics for this board</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <BoardAnalytics boardId={board._id} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
