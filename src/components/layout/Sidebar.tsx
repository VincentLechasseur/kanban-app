import { useQuery } from "convex/react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Globe, Home, Kanban, Plus } from "lucide-react";

interface SidebarProps {
  onCreateBoard: () => void;
}

export function Sidebar({ onCreateBoard }: SidebarProps) {
  const boards = useQuery(api.boards.list);
  const navigate = useNavigate();
  const location = useLocation();
  const { boardId } = useParams<{ boardId: string }>();

  const isHome = location.pathname === "/";
  const isMarketplace = location.pathname === "/marketplace";

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
          <TooltipProvider delayDuration={300}>
            <div className="space-y-1">
              {boards.map((board) => (
                <Tooltip key={board._id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start overflow-hidden",
                        boardId === board._id && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => navigate(`/board/${board._id}`)}
                    >
                      {board.icon ? (
                        <span className="mr-2 shrink-0">{board.icon}</span>
                      ) : (
                        <Kanban className="mr-2 h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate text-left">{board.name}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{board.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}
      </ScrollArea>
    </div>
  );
}
