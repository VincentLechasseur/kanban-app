import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  GripVertical,
  Home,
  Kanban,
  Plus,
  Shield,
} from "lucide-react";

interface SortableBoardItemProps {
  board: Doc<"boards">;
  isActive: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

function SortableBoardItem({ board, isActive, onClick, collapsed }: SortableBoardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={setNodeRef}
            style={style}
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10",
              isActive && "bg-accent text-accent-foreground",
              isDragging && "opacity-50"
            )}
            onClick={onClick}
          >
            {board.icon ? (
              <span className="text-lg">{board.icon}</span>
            ) : (
              <Kanban className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{board.name}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={cn("group flex items-center", isDragging && "opacity-50")}
        >
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground hover:text-foreground mr-1 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Button
            variant="ghost"
            className={cn(
              "flex-1 justify-start overflow-hidden",
              isActive && "bg-accent text-accent-foreground"
            )}
            onClick={onClick}
          >
            {board.icon ? (
              <span className="mr-2 shrink-0">{board.icon}</span>
            ) : (
              <Kanban className="mr-2 h-4 w-4 shrink-0" />
            )}
            <span className="truncate text-left">{board.name}</span>
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{board.name}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface SidebarProps {
  onCreateBoard: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ onCreateBoard, collapsed = false, onToggleCollapse }: SidebarProps) {
  const boards = useQuery(api.boards.list);
  const reorderBoards = useMutation(api.boards.reorder);
  const isAdmin = useQuery(api.admin.isAdmin);
  const navigate = useNavigate();
  const location = useLocation();
  const { boardId } = useParams<{ boardId: string }>();

  const isHome = location.pathname === "/";
  const isMarketplace = location.pathname === "/marketplace";
  const isAdminPage = location.pathname === "/admin";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !boards || active.id === over.id) return;

    const oldIndex = boards.findIndex((b) => b._id === active.id);
    const newIndex = boards.findIndex((b) => b._id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(boards, oldIndex, newIndex);
    await reorderBoards({ boardIds: newOrder.map((b) => b._id) as Id<"boards">[] });
  };

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center">
        <div className="space-y-1 p-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-10 w-10", isHome && "bg-accent text-accent-foreground")}
                  onClick={() => navigate("/")}
                >
                  <Home className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Home</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-10 w-10", isMarketplace && "bg-accent text-accent-foreground")}
                  onClick={() => navigate("/marketplace")}
                >
                  <Globe className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Marketplace</TooltipContent>
            </Tooltip>
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-10 w-10", isAdminPage && "bg-accent text-accent-foreground")}
                    onClick={() => navigate("/admin")}
                  >
                    <Shield className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Admin Dashboard</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>

        <div className="bg-border my-2 h-px w-8" />

        <div className="p-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onCreateBoard}>
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Board</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <ScrollArea className="flex-1 px-2">
          <TooltipProvider delayDuration={300}>
            <div className="flex flex-col items-center space-y-1">
              {boards?.map((board) => (
                <SortableBoardItem
                  key={board._id}
                  board={board}
                  isActive={boardId === board._id}
                  onClick={() => navigate(`/board/${board._id}`)}
                  collapsed
                />
              ))}
            </div>
          </TooltipProvider>
        </ScrollArea>

        {onToggleCollapse && (
          <div className="border-t p-2">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={onToggleCollapse}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-1 p-4">
        <Button
          variant="ghost"
          className={cn("w-full justify-start", isHome && "bg-accent text-accent-foreground")}
          onClick={() => navigate("/")}
        >
          <Home className="mr-2 h-4 w-4" />
          Home
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start",
            isMarketplace && "bg-accent text-accent-foreground"
          )}
          onClick={() => navigate("/marketplace")}
        >
          <Globe className="mr-2 h-4 w-4" />
          Marketplace
        </Button>
        {isAdmin && (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start",
              isAdminPage && "bg-accent text-accent-foreground"
            )}
            onClick={() => navigate("/admin")}
          >
            <Shield className="mr-2 h-4 w-4" />
            Admin
          </Button>
        )}
      </div>

      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-semibold uppercase">Boards</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCreateBoard}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        {boards === undefined ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">No boards yet</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={boards.map((b) => b._id)}
              strategy={verticalListSortingStrategy}
            >
              <TooltipProvider delayDuration={300}>
                <div className="space-y-1">
                  {boards.map((board) => (
                    <SortableBoardItem
                      key={board._id}
                      board={board}
                      isActive={boardId === board._id}
                      onClick={() => navigate(`/board/${board._id}`)}
                    />
                  ))}
                </div>
              </TooltipProvider>
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>

      {onToggleCollapse && (
        <div className="border-t p-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground w-full justify-start"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Collapse
          </Button>
        </div>
      )}
    </div>
  );
}
