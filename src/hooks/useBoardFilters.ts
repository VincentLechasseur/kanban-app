import { useState, useCallback, useMemo } from "react";
import type { Id } from "../../convex/_generated/dataModel";

interface UseBoardFiltersReturn {
  // State
  searchQuery: string;
  selectedAssigneeIds: Set<Id<"users">>;
  hasActiveFilters: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  toggleAssigneeFilter: (userId: Id<"users">) => void;
  clearAssigneeFilters: () => void;
  clearFilters: () => void;

  // Filter function
  filterCards: <T extends { title: string; description?: string; assigneeIds: Id<"users">[] }>(
    cards: T[]
  ) => T[];
}

export function useBoardFilters(): UseBoardFiltersReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<Set<Id<"users">>>(new Set());

  const toggleAssigneeFilter = useCallback((userId: Id<"users">) => {
    setSelectedAssigneeIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const clearAssigneeFilters = useCallback(() => {
    setSelectedAssigneeIds(new Set());
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedAssigneeIds(new Set());
  }, []);

  const hasActiveFilters = useMemo(
    () => searchQuery.trim() !== "" || selectedAssigneeIds.size > 0,
    [searchQuery, selectedAssigneeIds.size]
  );

  const filterCards = useCallback(
    <T extends { title: string; description?: string; assigneeIds: Id<"users">[] }>(
      cards: T[]
    ): T[] => {
      return cards.filter((card) => {
        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = card.title.toLowerCase().includes(query);
          const matchesDescription = card.description?.toLowerCase().includes(query);
          if (!matchesTitle && !matchesDescription) {
            return false;
          }
        }

        // Filter by assignee
        if (selectedAssigneeIds.size > 0) {
          const hasMatchingAssignee = card.assigneeIds.some((id) => selectedAssigneeIds.has(id));
          if (!hasMatchingAssignee) {
            return false;
          }
        }

        return true;
      });
    },
    [searchQuery, selectedAssigneeIds]
  );

  return {
    searchQuery,
    selectedAssigneeIds,
    hasActiveFilters,
    setSearchQuery,
    toggleAssigneeFilter,
    clearAssigneeFilters,
    clearFilters,
    filterCards,
  };
}
