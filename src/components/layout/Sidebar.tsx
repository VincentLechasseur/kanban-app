import { useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Home, Kanban, Plus } from "lucide-react";

interface SidebarProps {
  onCreateBoard: () => void;
}

export function Sidebar({ onCreateBoard }: SidebarProps) {
  const boards = useQuery(api.boards.list);
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start",
            !boardId && "bg-accent text-accent-foreground"
          )}
          onClick={() => navigate("/")}
        >
          <Home className="mr-2 h-4 w-4" />
          Home
        </Button>
      </div>

      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Boards
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCreateBoard}
          >
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
          <p className="py-4 text-center text-sm text-muted-foreground">
            No boards yet
          </p>
        ) : (
          <div className="space-y-1">
            {boards.map((board) => (
              <Button
                key={board._id}
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  boardId === board._id && "bg-accent text-accent-foreground"
                )}
                onClick={() => navigate(`/board/${board._id}`)}
              >
                <Kanban className="mr-2 h-4 w-4" />
                <span className="truncate">{board.name}</span>
              </Button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
