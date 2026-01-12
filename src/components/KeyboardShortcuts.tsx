import { useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SHORTCUTS = [
  {
    category: "Navigation",
    shortcuts: [
      { keys: ["G", "H"], description: "Go to Home" },
      { keys: ["G", "M"], description: "Go to Marketplace" },
      { keys: ["G", "P"], description: "Go to Profile" },
    ],
  },
  {
    category: "Boards",
    shortcuts: [
      { keys: ["B"], description: "Create new board" },
      { keys: ["1-9"], description: "Open board by position" },
    ],
  },
  {
    category: "Cards",
    shortcuts: [
      { keys: ["N"], description: "Create new card (on board)" },
      { keys: ["Esc"], description: "Close modal / Cancel" },
    ],
  },
  {
    category: "Chat",
    shortcuts: [
      { keys: ["C"], description: "Open team chat (on board)" },
      { keys: ["⌘/Ctrl", "F"], description: "Search messages (in chat)" },
    ],
  },
  {
    category: "General",
    shortcuts: [
      { keys: ["⌘/Ctrl", "K"], description: "Open command palette" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["/"], description: "Focus search (on board)" },
    ],
  },
];

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {SHORTCUTS.map((category) => (
            <div key={category.category}>
              <h3 className="text-muted-foreground mb-3 text-sm font-semibold uppercase">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut) => (
                  <div key={shortcut.description} className="flex items-center justify-between">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          <kbd className="bg-muted border-border text-muted-foreground rounded border px-2 py-1 font-mono text-xs">
                            {key}
                          </kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground mx-1 text-xs">then</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-center text-xs">
          Press{" "}
          <kbd className="bg-muted border-border rounded border px-1.5 py-0.5 font-mono text-xs">
            ?
          </kbd>{" "}
          anytime to show this help
        </p>
      </DialogContent>
    </Dialog>
  );
}

interface UseKeyboardShortcutsOptions {
  onNewBoard: () => void;
  onNewCard?: () => void;
  onShowHelp: () => void;
  onNavigate: (path: string) => void;
  onFocusSearch?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenChat?: () => void;
  boards?: { _id: string }[];
}

export function useKeyboardShortcuts({
  onNewBoard,
  onNewCard,
  onShowHelp,
  onNavigate,
  onFocusSearch,
  onOpenCommandPalette,
  onOpenChat,
  boards,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Command palette shortcut (Cmd+K / Ctrl+K) - works even in inputs
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        onOpenCommandPalette?.();
        return;
      }

      // Don't trigger other shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (isInput) {
        // Allow Escape to work in inputs
        if (event.key === "Escape") {
          target.blur();
        }
        return;
      }

      // Check for modifier keys - don't interfere with browser shortcuts
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      switch (event.key) {
        case "?":
          event.preventDefault();
          onShowHelp();
          break;

        case "b":
        case "B":
          event.preventDefault();
          onNewBoard();
          break;

        case "n":
        case "N":
          if (onNewCard) {
            event.preventDefault();
            onNewCard();
          }
          break;

        case "c":
        case "C":
          if (onOpenChat) {
            event.preventDefault();
            onOpenChat();
          }
          break;

        case "/":
          if (onFocusSearch) {
            event.preventDefault();
            onFocusSearch();
          }
          break;

        case "g":
        case "G":
          // Start a "go to" sequence
          const handleGoTo = (e: KeyboardEvent) => {
            document.removeEventListener("keydown", handleGoTo);

            if (e.metaKey || e.ctrlKey || e.altKey) return;

            switch (e.key.toLowerCase()) {
              case "h":
                e.preventDefault();
                onNavigate("/");
                break;
              case "m":
                e.preventDefault();
                onNavigate("/marketplace");
                break;
              case "p":
                e.preventDefault();
                onNavigate("/profile");
                break;
            }
          };

          // Listen for the next key
          document.addEventListener("keydown", handleGoTo, { once: true });

          // Clear listener after 1 second if no key pressed
          setTimeout(() => {
            document.removeEventListener("keydown", handleGoTo);
          }, 1000);
          break;

        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          if (boards && boards.length > 0) {
            const index = parseInt(event.key) - 1;
            if (index < boards.length) {
              event.preventDefault();
              onNavigate(`/board/${boards[index]._id}`);
            }
          }
          break;
      }
    },
    [
      onNewBoard,
      onNewCard,
      onShowHelp,
      onNavigate,
      onFocusSearch,
      onOpenCommandPalette,
      onOpenChat,
      boards,
    ]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
