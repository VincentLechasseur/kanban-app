import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";

const EMOJI_CATEGORIES = {
  "Work & Objects": [
    "📋",
    "📝",
    "📌",
    "📎",
    "📁",
    "📂",
    "🗂️",
    "📊",
    "📈",
    "📉",
    "💼",
    "🎯",
    "🔧",
    "⚙️",
    "🔨",
    "🛠️",
    "💡",
    "🔍",
    "📦",
    "🏷️",
  ],
  Status: [
    "✅",
    "❌",
    "⏳",
    "🔄",
    "⚡",
    "🚀",
    "🎉",
    "⭐",
    "🌟",
    "💫",
    "🔥",
    "💪",
    "👍",
    "👎",
    "🎊",
    "🏆",
    "🥇",
    "🎖️",
    "✨",
    "💯",
  ],
  "Nature & Weather": [
    "🌱",
    "🌿",
    "🍀",
    "🌸",
    "🌺",
    "🌻",
    "🌈",
    "☀️",
    "🌙",
    "⛅",
    "🌊",
    "🏔️",
    "🌲",
    "🌴",
    "🍁",
    "🍂",
    "❄️",
    "🔮",
    "🌍",
    "🌎",
  ],
  "Tech & Dev": [
    "💻",
    "🖥️",
    "📱",
    "⌨️",
    "🖱️",
    "🔌",
    "💾",
    "📀",
    "🎮",
    "🕹️",
    "🤖",
    "👾",
    "🔒",
    "🔓",
    "🔑",
    "🛡️",
    "🧪",
    "🧬",
    "📡",
    "🛰️",
  ],
  Symbols: [
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "💔",
    "❣️",
    "💕",
    "💖",
    "🔴",
    "🟠",
    "🟡",
    "🟢",
    "🔵",
    "🟣",
    "⚪",
    "⚫",
  ],
};

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(Object.keys(EMOJI_CATEGORIES)[0]);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-10 w-10 p-0 text-lg", className)} type="button">
          {value || "📋"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="mb-2 flex gap-1 overflow-x-auto pb-2">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "secondary" : "ghost"}
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-10 gap-1">
          {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={cn(
                "hover:bg-muted flex h-7 w-7 items-center justify-center rounded text-lg transition-colors",
                value === emoji && "bg-muted ring-primary ring-2"
              )}
              onClick={() => handleSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground mt-2 w-full"
            onClick={() => handleSelect("")}
          >
            Remove icon
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
