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
  Cell,
} from "recharts";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Tag,
  Timer,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardAnalyticsProps {
  boardId: Id<"boards">;
}

// Format minutes to hours string
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Premium color palette
const GRADIENT_COLORS = {
  primary: { start: "#6366f1", end: "#8b5cf6" },
  success: { start: "#10b981", end: "#34d399" },
  warning: { start: "#f59e0b", end: "#fbbf24" },
  danger: { start: "#ef4444", end: "#f87171" },
  info: { start: "#0ea5e9", end: "#38bdf8" },
};

// Modern assignee colors
const ASSIGNEE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
];

// Custom tooltip
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

// Large stat card for dashboard
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
  const bgClasses = {
    default: "from-slate-500/10 to-slate-600/10",
    success: "from-emerald-500/10 to-emerald-600/10",
    warning: "from-amber-500/10 to-amber-600/10",
    danger: "from-red-500/10 to-red-600/10",
  };

  const textClasses = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
  };

  const iconClasses = {
    default: "text-slate-500 bg-slate-500/20",
    success: "text-emerald-500 bg-emerald-500/20",
    warning: "text-amber-500 bg-amber-500/20",
    danger: "text-red-500 bg-red-500/20",
  };

  return (
    <div
      className={cn(
        "bg-card relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6",
        bgClasses[color]
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className={cn("mt-2 text-4xl font-bold tracking-tight", textClasses[color])}>
            {value}
          </p>
          {subtext && <p className="text-muted-foreground mt-1 text-sm">{subtext}</p>}
        </div>
        <div className={cn("rounded-2xl p-4", iconClasses[color])}>
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

// Progress bar for workload
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
      <div className="bg-muted h-4 overflow-hidden rounded-full">
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
          <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground">Loading analytics...</p>
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
  const totalCompleted = velocity.reduce((sum, v) => sum + v.completed, 0);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6">
        {/* Top Stats Row */}
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={Layers} label="Total Cards" value={stats.totalCards} />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={totalCompleted}
            color="success"
            subtext="Last 8 weeks"
          />
          <StatCard
            icon={Zap}
            label="Story Points"
            value={stats.storyPointsStats.total}
            subtext={`${stats.storyPointsStats.completed} completed`}
          />
          <StatCard
            icon={Timer}
            label="Time Tracked"
            value={formatTime(stats.timeStats.totalSpent)}
            subtext={`of ${formatTime(stats.timeStats.totalEstimate)} est.`}
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

        {/* Main Charts Row - 3 columns on large screens */}
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Team Velocity - Takes 2 columns */}
          {velocity.length > 0 && (
            <div className="bg-card rounded-2xl border p-6 xl:col-span-2">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 p-3">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Team Velocity</h3>
                  <p className="text-muted-foreground text-sm">Cards completed per week</p>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={velocity} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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

          {/* Workload Distribution */}
          {stats.assigneeStats.length > 0 && (
            <div className="bg-card rounded-2xl border p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 p-3">
                  <Users className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Workload</h3>
                  <p className="text-muted-foreground text-sm">Cards per member</p>
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

        {/* Bottom Charts Row - 2 columns */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Cards per Column */}
          {stats.cardsPerColumn.length > 0 && (
            <div className="bg-card rounded-2xl border p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 p-3">
                  <Layers className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Cards by Column</h3>
                  <p className="text-muted-foreground text-sm">Workflow distribution</p>
                </div>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.cardsPerColumn}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
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
                      width={120}
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
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Cards by Label */}
          {stats.labelStats.length > 0 && (
            <div className="bg-card rounded-2xl border p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/20 p-3">
                  <Tag className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Cards by Label</h3>
                  <p className="text-muted-foreground text-sm">Categorization breakdown</p>
                </div>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.labelStats}
                    margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
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
                    <Bar dataKey="count" name="Cards" radius={[8, 8, 0, 0]} maxBarSize={70}>
                      {stats.labelStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Label Legend */}
              <div className="mt-4 flex flex-wrap gap-4">
                {stats.labelStats.map((label) => (
                  <div key={label.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-muted-foreground text-sm">{label.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Story Points & Time Tracking Row */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Story Points by Status */}
          {stats.storyPointsStats.total > 0 && (
            <div className="bg-card rounded-2xl border p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-3">
                  <Zap className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Story Points by Status</h3>
                  <p className="text-muted-foreground text-sm">
                    Points distribution across workflow
                  </p>
                </div>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Backlog", points: stats.storyPointsStats.byType.backlog },
                      { name: "To Do", points: stats.storyPointsStats.byType.todo },
                      { name: "In Progress", points: stats.storyPointsStats.byType.in_progress },
                      { name: "Review", points: stats.storyPointsStats.byType.review },
                      { name: "Blocked", points: stats.storyPointsStats.byType.blocked },
                      { name: "Done", points: stats.storyPointsStats.byType.done },
                      { name: "Won't Do", points: stats.storyPointsStats.byType.wont_do },
                    ].filter((d) => d.points > 0)}
                    margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
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
                    <Bar
                      dataKey="points"
                      name="Points"
                      fill="url(#pointsGradient)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={70}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Story Points Summary */}
              <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {stats.storyPointsStats.total}
                  </p>
                  <p className="text-muted-foreground text-xs">Total Points</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.storyPointsStats.completed}
                  </p>
                  <p className="text-muted-foreground text-xs">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {stats.storyPointsStats.total - stats.storyPointsStats.completed}
                  </p>
                  <p className="text-muted-foreground text-xs">Remaining</p>
                </div>
              </div>
            </div>
          )}

          {/* Time Tracking Overview */}
          {stats.timeStats.cardsWithTime > 0 && (
            <div className="bg-card rounded-2xl border p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-3">
                  <Timer className="h-6 w-6 text-cyan-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Time Tracking</h3>
                  <p className="text-muted-foreground text-sm">Estimated vs actual time spent</p>
                </div>
              </div>
              <div className="space-y-6">
                {/* Time Progress Bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Time Progress</span>
                    <span className="text-muted-foreground">
                      {stats.timeStats.totalEstimate > 0
                        ? `${Math.round((stats.timeStats.totalSpent / stats.timeStats.totalEstimate) * 100)}%`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="bg-muted h-6 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        stats.timeStats.totalSpent > stats.timeStats.totalEstimate
                          ? "bg-gradient-to-r from-red-500 to-red-400"
                          : "bg-gradient-to-r from-cyan-500 to-blue-500"
                      )}
                      style={{
                        width: `${Math.min(100, stats.timeStats.totalEstimate > 0 ? (stats.timeStats.totalSpent / stats.timeStats.totalEstimate) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Time Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-cyan-500/10 p-5">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-cyan-500" />
                      <div>
                        <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                          {formatTime(stats.timeStats.totalEstimate)}
                        </p>
                        <p className="text-muted-foreground text-sm">Estimated</p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-xl p-5",
                      stats.timeStats.totalSpent > stats.timeStats.totalEstimate
                        ? "bg-red-500/10"
                        : "bg-emerald-500/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Timer
                        className={cn(
                          "h-8 w-8",
                          stats.timeStats.totalSpent > stats.timeStats.totalEstimate
                            ? "text-red-500"
                            : "text-emerald-500"
                        )}
                      />
                      <div>
                        <p
                          className={cn(
                            "text-2xl font-bold",
                            stats.timeStats.totalSpent > stats.timeStats.totalEstimate
                              ? "text-red-600 dark:text-red-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {formatTime(stats.timeStats.totalSpent)}
                        </p>
                        <p className="text-muted-foreground text-sm">Time Spent</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="flex items-center justify-between border-t pt-4 text-sm">
                  <span className="text-muted-foreground">Cards with time tracking</span>
                  <span className="font-semibold">{stats.timeStats.cardsWithTime} cards</span>
                </div>
                {stats.timeStats.totalEstimate > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Time variance</span>
                    <span
                      className={cn(
                        "font-semibold",
                        stats.timeStats.totalSpent > stats.timeStats.totalEstimate
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {stats.timeStats.totalSpent > stats.timeStats.totalEstimate ? "+" : "-"}
                      {formatTime(
                        Math.abs(stats.timeStats.totalSpent - stats.timeStats.totalEstimate)
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Due Date Overview - Full Width */}
        <div className="bg-card rounded-2xl border p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 p-3">
              <Clock className="h-6 w-6 text-sky-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Due Date Overview</h3>
              <p className="text-muted-foreground text-sm">Task deadline status</p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex items-center gap-5 rounded-xl bg-red-500/10 p-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                  {stats.dueDateStats.overdue}
                </p>
                <p className="text-muted-foreground text-sm">Overdue</p>
              </div>
            </div>
            <div className="flex items-center gap-5 rounded-xl bg-amber-500/10 p-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20">
                <Calendar className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.dueDateStats.dueThisWeek}
                </p>
                <p className="text-muted-foreground text-sm">Due This Week</p>
              </div>
            </div>
            <div className="flex items-center gap-5 rounded-xl bg-slate-500/10 p-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/20">
                <Clock className="h-8 w-8 text-slate-500" />
              </div>
              <div>
                <p className="text-4xl font-bold">{stats.dueDateStats.noDueDate}</p>
                <p className="text-muted-foreground text-sm">No Due Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
