import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface BoardActions {
  openEditBoard?: () => void;
  openDeleteBoard?: () => void;
  openMembersModal?: () => void;
  toggleChat?: () => void;
  createCard?: () => void;
  focusSearch?: () => void;
  clearFilters?: () => void;
  hasActiveFilters?: boolean;
  isOwner?: boolean;
  boardName?: string;
}

interface CommandPaletteContextValue {
  // Palette state
  open: boolean;
  setOpen: (open: boolean) => void;

  // Board-specific actions (registered by Board.tsx)
  boardActions: BoardActions;
  registerBoardActions: (actions: BoardActions) => void;
  clearBoardActions: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [boardActions, setBoardActions] = useState<BoardActions>({});

  const registerBoardActions = useCallback((actions: BoardActions) => {
    setBoardActions(actions);
  }, []);

  const clearBoardActions = useCallback(() => {
    setBoardActions({});
  }, []);

  return (
    <CommandPaletteContext.Provider
      value={{
        open,
        setOpen,
        boardActions,
        registerBoardActions,
        clearBoardActions,
      }}
    >
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPaletteContext() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPaletteContext must be used within CommandPaletteProvider");
  }
  return context;
}
