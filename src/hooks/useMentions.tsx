import { useState, useMemo, useEffect, useCallback, type RefObject } from "react";
import type { Id } from "../../convex/_generated/dataModel";

interface User {
  _id: Id<"users">;
  name?: string;
  email?: string;
  image?: string | null;
}

interface UseMentionsOptions {
  members: User[] | undefined;
  currentUser: User | undefined | null;
  inputRef: RefObject<HTMLInputElement | null>;
}

interface UseMentionsReturn {
  // State
  mentionSearch: string;
  showMentions: boolean;
  selectedMentionIndex: number;
  mentionSuggestions: User[];

  // Actions
  handleInputChange: (value: string, cursorPos: number) => void;
  insertMention: (user: User, currentValue: string) => string;
  handleKeyDown: (
    e: React.KeyboardEvent,
    currentValue: string
  ) => { handled: boolean; newValue?: string };
  closeMentions: () => void;
  setSelectedMentionIndex: (index: number) => void;

  // Utilities
  parseMentions: (text: string) => Id<"users">[];
  renderMentionText: (text: string) => React.ReactNode[];
}

export function useMentions({
  members,
  currentUser,
  inputRef,
}: UseMentionsOptions): UseMentionsReturn {
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Filter members for mention suggestions (exclude current user)
  const mentionSuggestions = useMemo(() => {
    if (!showMentions || !members || !currentUser) return [];
    const search = mentionSearch.toLowerCase();
    return members.filter(
      (m) =>
        m._id !== currentUser._id &&
        (m.name?.toLowerCase().includes(search) || m.email?.toLowerCase().includes(search))
    );
  }, [members, mentionSearch, showMentions, currentUser]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [mentionSearch]);

  // Parse mentions from text
  const parseMentions = useCallback(
    (text: string): Id<"users">[] => {
      if (!members) return [];

      const mentionedUserIds: Id<"users">[] = [];

      // Match @[Name With Spaces] or @name patterns
      const bracketMentionRegex = /@\[([^\]]+)\]/g;
      const simpleMentionRegex = /@(\S+)/g;

      // First, extract bracket mentions
      let match;
      while ((match = bracketMentionRegex.exec(text)) !== null) {
        const mentionName = match[1].trim();
        const user = members.find(
          (m) =>
            m.name?.toLowerCase() === mentionName.toLowerCase() ||
            m.email?.toLowerCase() === mentionName.toLowerCase()
        );
        if (user && !mentionedUserIds.includes(user._id)) {
          mentionedUserIds.push(user._id);
        }
      }

      // Then, extract simple mentions (but skip those already in brackets)
      const textWithoutBrackets = text.replace(/@\[[^\]]+\]/g, "");
      while ((match = simpleMentionRegex.exec(textWithoutBrackets)) !== null) {
        const mentionName = match[1].trim();
        const user = members.find(
          (m) =>
            m.name?.toLowerCase() === mentionName.toLowerCase() ||
            m.email?.toLowerCase() === mentionName.toLowerCase()
        );
        if (user && !mentionedUserIds.includes(user._id)) {
          mentionedUserIds.push(user._id);
        }
      }

      return mentionedUserIds;
    },
    [members]
  );

  // Handle input change to detect @ mention trigger
  const handleInputChange = useCallback((value: string, cursorPos: number) => {
    const textBeforeCursor = value.slice(0, cursorPos);

    // Check for bracket syntax: @[
    const lastAtBracket = textBeforeCursor.lastIndexOf("@[");
    if (lastAtBracket !== -1 && !textBeforeCursor.slice(lastAtBracket).includes("]")) {
      setShowMentions(true);
      setMentionSearch(textBeforeCursor.slice(lastAtBracket + 2));
      return;
    }

    // Check for simple @ mention
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1 && !textBeforeCursor.slice(lastAtIndex).includes(" ")) {
      setShowMentions(true);
      setMentionSearch(textBeforeCursor.slice(lastAtIndex + 1));
    } else {
      setShowMentions(false);
      setMentionSearch("");
    }
  }, []);

  // Insert a mention into the text
  const insertMention = useCallback(
    (user: User, currentValue: string): string => {
      const displayName = user.name ?? user.email ?? "";
      const cursorPos = inputRef.current?.selectionStart ?? currentValue.length;
      const textBeforeCursor = currentValue.slice(0, cursorPos);

      // Find where the mention started
      const bracketIndex = textBeforeCursor.lastIndexOf("@[");
      const simpleIndex = textBeforeCursor.lastIndexOf("@");
      const inBracketMode =
        bracketIndex !== -1 && !textBeforeCursor.slice(bracketIndex).includes("]");

      const needsBrackets = displayName.includes(" ") || inBracketMode;

      let newValue: string;

      if (inBracketMode) {
        const beforeTrigger = currentValue.slice(0, bracketIndex);
        const afterCursor = currentValue.slice(cursorPos);
        newValue = `${beforeTrigger}@[${displayName}] ${afterCursor}`;
      } else if (simpleIndex !== -1) {
        const beforeTrigger = currentValue.slice(0, simpleIndex);
        const afterCursor = currentValue.slice(cursorPos);
        if (needsBrackets) {
          newValue = `${beforeTrigger}@[${displayName}] ${afterCursor}`;
        } else {
          newValue = `${beforeTrigger}@${displayName} ${afterCursor}`;
        }
      } else {
        newValue = currentValue;
      }

      setShowMentions(false);
      setMentionSearch("");

      return newValue;
    },
    [inputRef]
  );

  // Handle keyboard navigation in mention suggestions
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentValue: string): { handled: boolean; newValue?: string } => {
      if (showMentions && mentionSuggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
          return { handled: true };
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedMentionIndex(
            (prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length
          );
          return { handled: true };
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          const selected = mentionSuggestions[selectedMentionIndex];
          if (selected) {
            const newValue = insertMention(selected, currentValue);
            return { handled: true, newValue };
          }
          return { handled: true };
        } else if (e.key === "Escape") {
          setShowMentions(false);
          setMentionSearch("");
          return { handled: true };
        }
      }
      return { handled: false };
    },
    [showMentions, mentionSuggestions, selectedMentionIndex, insertMention]
  );

  // Close mentions dropdown
  const closeMentions = useCallback(() => {
    setShowMentions(false);
    setMentionSearch("");
  }, []);

  // Render text with highlighted mentions
  const renderMentionText = useCallback((text: string): React.ReactNode[] => {
    const mentionRegex = /(@\[[^\]]+\]|@\S+)/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, i) => {
      if (part.startsWith("@[") || part.startsWith("@")) {
        return (
          <span key={i} className="text-primary font-semibold">
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);

  return {
    mentionSearch,
    showMentions,
    selectedMentionIndex,
    mentionSuggestions,
    handleInputChange,
    insertMention,
    handleKeyDown,
    closeMentions,
    setSelectedMentionIndex,
    parseMentions,
    renderMentionText,
  };
}
