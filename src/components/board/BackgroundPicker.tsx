import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Check, Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackgroundPickerProps {
  boardId: Id<"boards">;
  currentBackground?: {
    type: "color" | "gradient" | "image";
    value: string;
    overlay?: number;
  } | null;
  onClose?: () => void;
}

const PRESET_COLORS = [
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Slate", value: "#64748b" },
];

const PRESET_GRADIENTS = [
  { name: "Ocean", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { name: "Sunset", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { name: "Forest", value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { name: "Fire", value: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)" },
  { name: "Night", value: "linear-gradient(135deg, #232526 0%, #414345 100%)" },
  { name: "Berry", value: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)" },
  { name: "Aqua", value: "linear-gradient(135deg, #00c6fb 0%, #005bea 100%)" },
  { name: "Peach", value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" },
  { name: "Aurora", value: "linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)" },
  { name: "Candy", value: "linear-gradient(135deg, #ff6a88 0%, #ff99ac 100%)" },
  { name: "Midnight", value: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" },
  {
    name: "Rainbow",
    value:
      "linear-gradient(135deg, #f093fb 0%, #f5576c 25%, #4facfe 50%, #00f2fe 75%, #43e97b 100%)",
  },
];

export function BackgroundPicker({ boardId, currentBackground, onClose }: BackgroundPickerProps) {
  const updateBackground = useMutation(api.boards.updateBackground);
  const generateUploadUrl = useMutation(api.boards.generateBackgroundUploadUrl);

  const [selectedType, setSelectedType] = useState<"color" | "gradient" | "image">(
    currentBackground?.type ?? "color"
  );
  const [selectedValue, setSelectedValue] = useState(currentBackground?.value ?? "");
  const [overlay, setOverlay] = useState(currentBackground?.overlay ?? 0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleColorSelect = (color: string) => {
    setSelectedType("color");
    setSelectedValue(color);
  };

  const handleGradientSelect = (gradient: string) => {
    setSelectedType("gradient");
    setSelectedValue(gradient);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      if (!uploadUrl) throw new Error("Failed to get upload URL");

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { storageId } = await response.json();
      setSelectedType("image");
      setSelectedValue(`storage:${storageId}`);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (selectedValue) {
        await updateBackground({
          id: boardId,
          background: {
            type: selectedType,
            value: selectedValue,
            overlay: overlay > 0 ? overlay : undefined,
          },
        });
      } else {
        await updateBackground({
          id: boardId,
          background: undefined,
        });
      }
      onClose?.();
    } catch (error) {
      console.error("Failed to save background:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await updateBackground({
        id: boardId,
        background: undefined,
      });
      setSelectedValue("");
      onClose?.();
    } catch (error) {
      console.error("Failed to clear background:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const previewStyle = selectedValue
    ? {
        background:
          selectedType === "color"
            ? selectedValue
            : selectedType === "gradient"
              ? selectedValue
              : undefined,
        backgroundImage:
          selectedType === "image" && selectedValue.startsWith("storage:")
            ? undefined
            : selectedType === "image"
              ? `url(${selectedValue})`
              : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: "hsl(var(--muted))" };

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Preview */}
      <div className="relative h-32 overflow-hidden rounded-lg border">
        <div className="absolute inset-0" style={previewStyle} />
        {selectedValue && overlay > 0 && (
          <div className="absolute inset-0 bg-black" style={{ opacity: overlay / 100 }} />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded bg-black/30 px-3 py-1 font-semibold text-white text-shadow-sm">
            Preview
          </span>
        </div>
      </div>

      <Tabs
        value={selectedType}
        onValueChange={(v: string) => setSelectedType(v as typeof selectedType)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="color">Solid</TabsTrigger>
          <TabsTrigger value="gradient">Gradient</TabsTrigger>
          <TabsTrigger value="image">Image</TabsTrigger>
        </TabsList>

        <TabsContent value="color" className="space-y-3">
          <div className="grid grid-cols-8 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                className={cn(
                  "h-8 w-8 rounded-md border-2 transition-all hover:scale-110",
                  selectedType === "color" && selectedValue === color.value
                    ? "border-primary ring-primary ring-2 ring-offset-2"
                    : "border-transparent"
                )}
                style={{ backgroundColor: color.value }}
                onClick={() => handleColorSelect(color.value)}
                title={color.name}
              >
                {selectedType === "color" && selectedValue === color.value && (
                  <Check className="mx-auto h-4 w-4 text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground text-xs">Custom:</Label>
            <input
              type="color"
              value={selectedType === "color" ? selectedValue : "#3b82f6"}
              onChange={(e) => handleColorSelect(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border"
            />
          </div>
        </TabsContent>

        <TabsContent value="gradient" className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {PRESET_GRADIENTS.map((gradient) => (
              <button
                key={gradient.name}
                className={cn(
                  "h-12 rounded-md border-2 transition-all hover:scale-105",
                  selectedType === "gradient" && selectedValue === gradient.value
                    ? "border-primary ring-primary ring-2 ring-offset-2"
                    : "border-transparent"
                )}
                style={{ background: gradient.value }}
                onClick={() => handleGradientSelect(gradient.value)}
                title={gradient.name}
              >
                {selectedType === "gradient" && selectedValue === gradient.value && (
                  <Check className="mx-auto h-4 w-4 text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="image" className="space-y-3">
          <div
            className={cn(
              "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
              "hover:border-primary hover:bg-muted/50 cursor-pointer"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
            ) : (
              <>
                <Upload className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">Click to upload an image</p>
                <p className="text-muted-foreground mt-1 text-xs">Max 5MB, JPG/PNG</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </TabsContent>
      </Tabs>

      {/* Overlay slider */}
      {selectedValue && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Darken Overlay</Label>
            <span className="text-muted-foreground text-sm">{overlay}%</span>
          </div>
          <Slider
            value={[overlay]}
            onValueChange={(values: number[]) => setOverlay(values[0])}
            max={80}
            step={5}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={handleClear} disabled={isSaving}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-1 h-4 w-4" />
          )}
          Apply Background
        </Button>
      </div>
    </div>
  );
}
