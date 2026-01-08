import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCommandPaletteContext } from "@/contexts/CommandPaletteContext";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Home,
  Globe,
  User,
  Kanban,
  Plus,
  Pencil,
  Trash2,
  Users,
  MessageCircle,
  Search,
  X,
  Keyboard,
  Moon,
  Sun,
} from "lucide-react";

interface CommandPaletteProps {
  onCreateBoard: () => void;
  onShowHelp: () => void;
}

export function CommandPalette({ onCreateBoard, onShowHelp }: CommandPaletteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { open, setOpen, boardActions } = useCommandPaletteContext();

  const boards = useQuery(api.boards.list);

  const isOnBoardPage = location.pathname.startsWith("/board/");
  const isDarkMode = document.documentElement.classList.contains("dark");

  const runCommand = (action: () => void) => {
    setOpen(false);
    action();
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  // Group commands by category
  const navigationCommands = useMemo(() => {
    const commands = [
      {
        id: "home",
        label: "Go to Home",
        icon: Home,
        shortcut: "G H",
        action: () => navigate("/"),
      },
      {
        id: "marketplace",
        label: "Go to Marketplace",
        icon: Globe,
        shortcut: "G M",
        action: () => navigate("/marketplace"),
      },
      {
        id: "profile",
        label: "Go to Profile",
        icon: User,
        shortcut: "G P",
        action: () => navigate("/profile"),
      },
    ];

    // Add dynamic board navigation
    if (boards) {
      boards.forEach((board, index) => {
        commands.push({
          id: `board-${board._id}`,
          label: `Go to ${board.icon ? `${board.icon} ` : ""}${board.name}`,
          icon: Kanban,
          shortcut: index < 9 ? `${index + 1}` : "",
          action: () => navigate(`/board/${board._id}`),
        });
      });
    }

    return commands;
  }, [boards, navigate]);

  const boardCommands = useMemo(() => {
    const commands = [
      {
        id: "create-board",
        label: "Create new board",
        icon: Plus,
        shortcut: "B",
        action: onCreateBoard,
      },
    ];

    if (isOnBoardPage) {
      if (boardActions.openEditBoard) {
        commands.push({
          id: "edit-board",
          label: `Edit ${boardActions.boardName || "board"}`,
          icon: Pencil,
          shortcut: "",
          action: boardActions.openEditBoard,
        });
      }

      if (boardActions.openDeleteBoard && boardActions.isOwner) {
        commands.push({
          id: "delete-board",
          label: `Delete ${boardActions.boardName || "board"}`,
          icon: Trash2,
          shortcut: "",
          action: boardActions.openDeleteBoard,
        });
      }

      if (boardActions.openMembersModal) {
        commands.push({
          id: "manage-members",
          label: "Manage members",
          icon: Users,
          shortcut: "",
          action: boardActions.openMembersModal,
        });
      }

      if (boardActions.toggleChat) {
        commands.push({
          id: "toggle-chat",
          label: "Toggle team chat",
          icon: MessageCircle,
          shortcut: "",
          action: boardActions.toggleChat,
        });
      }
    }

    return commands;
  }, [isOnBoardPage, boardActions, onCreateBoard]);

  const cardCommands = useMemo(() => {
    if (!isOnBoardPage) return [];

    const commands = [];

    if (boardActions.createCard) {
      commands.push({
        id: "create-card",
        label: "Create new card",
        icon: Plus,
        shortcut: "N",
        action: boardActions.createCard,
      });
    }

    if (boardActions.focusSearch) {
      commands.push({
        id: "search-cards",
        label: "Search cards",
        icon: Search,
        shortcut: "/",
        action: boardActions.focusSearch,
      });
    }

    if (boardActions.clearFilters && boardActions.hasActiveFilters) {
      commands.push({
        id: "clear-filters",
        label: "Clear all filters",
        icon: X,
        shortcut: "",
        action: boardActions.clearFilters,
      });
    }

    return commands;
  }, [isOnBoardPage, boardActions]);

  const uiCommands = useMemo(
    () => [
      {
        id: "toggle-theme",
        label: isDarkMode ? "Switch to light mode" : "Switch to dark mode",
        icon: isDarkMode ? Sun : Moon,
        shortcut: "",
        action: toggleTheme,
      },
      {
        id: "show-shortcuts",
        label: "Show keyboard shortcuts",
        icon: Keyboard,
        shortcut: "?",
        action: onShowHelp,
      },
    ],
    [isDarkMode, onShowHelp]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationCommands.map((cmd) => (
            <CommandItem key={cmd.id} value={cmd.label} onSelect={() => runCommand(cmd.action)}>
              <cmd.icon className="mr-2 h-4 w-4" />
              <span>{cmd.label}</span>
              {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Boards">
          {boardCommands.map((cmd) => (
            <CommandItem key={cmd.id} value={cmd.label} onSelect={() => runCommand(cmd.action)}>
              <cmd.icon className="mr-2 h-4 w-4" />
              <span>{cmd.label}</span>
              {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        {cardCommands.length > 0 && (
          <CommandGroup heading="Cards">
            {cardCommands.map((cmd) => (
              <CommandItem key={cmd.id} value={cmd.label} onSelect={() => runCommand(cmd.action)}>
                <cmd.icon className="mr-2 h-4 w-4" />
                <span>{cmd.label}</span>
                {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Settings">
          {uiCommands.map((cmd) => (
            <CommandItem key={cmd.id} value={cmd.label} onSelect={() => runCommand(cmd.action)}>
              <cmd.icon className="mr-2 h-4 w-4" />
              <span>{cmd.label}</span>
              {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
