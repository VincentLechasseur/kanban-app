import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardAnalyticsProps {
  boardId: Id<"boards">;
}

// Premium color palette - sophisticated gradients
const GRADIENT_COLORS = {
  primary: { start: "#6366f1", end: "#8b5cf6" }, // Indigo to violet
  success: { start: "#10b981", end: "#34d399" }, // Emerald gradient
  warning: { start: "#f59e0b", end: "#fbbf24" }, // Amber gradient
  danger: { start: "#ef4444", end: "#f87171" }, // Red gradient
  info: { start: "#0ea5e9", end: "#38bdf8" }, // Sky gradient
};

// Modern assignee colors
const ASSIGNEE_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f43f5e", // rose
];

// Custom tooltip component
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover/95 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-sm">
      {label && <p className="text-foreground mb-2 text-sm font-medium">{label}</p>}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color || GRADIENT_COLORS.primary.start }}
          />
          <span className="text-muted-foreground text-sm">{entry.name}:</span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  color = "default",
  subtext,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color?: "default" | "success" | "warning" | "danger";
  subtext?: string;
}) {
  const colorClasses = {
    default: "from-slate-500/20 to-slate-600/20 text-foreground",
    success: "from-emerald-500/20 to-emerald-600/20 text-emerald-600 dark:text-emerald-400",
    warning: "from-amber-500/20 to-amber-600/20 text-amber-600 dark:text-amber-400",
    danger: "from-red-500/20 to-red-600/20 text-red-600 dark:text-red-400",
  };

  const iconColors = {
    default: "text-slate-500",
    success: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5",
        colorClasses[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className={cn("mt-1 text-3xl font-bold tracking-tight", colorClasses[color])}>
            {value}
          </p>
          {subtext && <p className="text-muted-foreground mt-1 text-xs">{subtext}</p>}
        </div>
        <div className={cn("bg-background/50 rounded-xl p-2.5", iconColors[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// Progress bar for workload distribution
function WorkloadBar({
  name,
  count,
  total,
  color,
}: {
  name: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground">
          {count} cards ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="bg-muted h-3 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

export function BoardAnalytics({ boardId }: BoardAnalyticsProps) {
  const stats = useQuery(api.analytics.getBoardStats, { boardId });
  const velocity = useQuery(api.analytics.getVelocity, { boardId, weeks: 8 });

  if (stats === undefined || velocity === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="border-primary h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (stats === null) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Unable to load analytics</p>
      </div>
    );
  }

  const totalAssigned = stats.assigneeStats.reduce((sum, s) => sum + s.count, 0);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-8 p-6">
        {/* Hero Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Layers} label="Total Cards" value={stats.totalCards} />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={velocity.reduce((sum, v) => sum + v.completed, 0)}
            color="success"
            subtext="Last 8 weeks"
          />
          <StatCard
            icon={AlertTriangle}
            label="Overdue"
            value={stats.dueDateStats.overdue}
            color="danger"
          />
          <StatCard
            icon={Calendar}
            label="Due This Week"
            value={stats.dueDateStats.dueThisWeek}
            color="warning"
          />
        </div>

        {/* Team Velocity Chart - Full Width Hero */}
        {velocity.length > 0 && (
          <div className="bg-card rounded-2xl border p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 p-2.5">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Team Velocity</h3>
                <p className="text-muted-foreground text-sm">Cards completed per week</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={GRADIENT_COLORS.success.start}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={GRADIENT_COLORS.success.end}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    dy={10}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke={GRADIENT_COLORS.success.start}
                    strokeWidth={3}
                    fill="url(#velocityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Cards per Column */}
          {stats.cardsPerColumn.length > 0 && (
            <div className="bg-card rounded-2xl border p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 p-2.5">
                  <Layers className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Cards by Column</h3>
                  <p className="text-muted-foreground text-sm">Distribution across workflow</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.cardsPerColumn}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={GRADIENT_COLORS.primary.start} />
                        <stop offset="100%" stopColor={GRADIENT_COLORS.primary.end} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 13, fill: "hsl(var(--foreground))" }}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                    />
                    <Bar
                      dataKey="count"
                      name="Cards"
                      fill="url(#barGradient)"
                      radius={[0, 8, 8, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Workload Distribution */}
          {stats.assigneeStats.length > 0 && (
            <div className="bg-card rounded-2xl border p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 p-2.5">
                  <Users className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Workload Distribution</h3>
                  <p className="text-muted-foreground text-sm">Cards per team member</p>
                </div>
              </div>
              <div className="space-y-5">
                {stats.assigneeStats.map((stat, index) => (
                  <WorkloadBar
                    key={stat.userId}
                    name={stat.name}
                    count={stat.count}
                    total={totalAssigned}
                    color={ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length]}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Labels Chart - Full Width */}
        {stats.labelStats.length > 0 && (
          <div className="bg-card rounded-2xl border p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/20 p-2.5">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Cards by Label</h3>
                <p className="text-muted-foreground text-sm">Categorization breakdown</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.labelStats}
                  margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    dy={10}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                  />
                  <Bar dataKey="count" name="Cards" radius={[8, 8, 0, 0]} maxBarSize={60}>
                    {stats.labelStats.map((entry, index) => (
                      <rect key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Label Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
              {stats.labelStats.map((label) => (
                <div key={label.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                  <span className="text-muted-foreground text-sm">{label.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Due Date Summary */}
        <div className="bg-card rounded-2xl border p-6">
          <h3 className="mb-4 text-lg font-semibold">Due Date Overview</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-xl bg-red-500/10 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.dueDateStats.overdue}
                </p>
                <p className="text-muted-foreground text-sm">Overdue</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl bg-amber-500/10 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                <Calendar className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.dueDateStats.dueThisWeek}
                </p>
                <p className="text-muted-foreground text-sm">Due This Week</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl bg-slate-500/10 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-500/20">
                <Clock className="h-6 w-6 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.dueDateStats.noDueDate}</p>
                <p className="text-muted-foreground text-sm">No Due Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
