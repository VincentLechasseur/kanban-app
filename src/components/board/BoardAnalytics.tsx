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
  PieChart,
  Pie,
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
  Target,
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

// Modern color palette
const COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#0ea5e9",
  purple: "#8b5cf6",
  pink: "#ec4899",
  cyan: "#06b6d4",
};

// Assignee colors
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
    <div className="bg-popover rounded-lg border px-3 py-2 text-xs shadow-lg">
      {label && <p className="text-foreground mb-1 font-medium">{label}</p>}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color || COLORS.primary }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// Mini stat card
function MiniStat({
  icon: Icon,
  label,
  value,
  color = "default",
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color?: "default" | "success" | "warning" | "danger" | "info";
  trend?: string;
}) {
  const colorClasses = {
    default: {
      icon: "text-slate-500",
      bg: "bg-slate-500/10",
      value: "text-foreground",
    },
    success: {
      icon: "text-emerald-500",
      bg: "bg-emerald-500/10",
      value: "text-emerald-600 dark:text-emerald-400",
    },
    warning: {
      icon: "text-amber-500",
      bg: "bg-amber-500/10",
      value: "text-amber-600 dark:text-amber-400",
    },
    danger: {
      icon: "text-red-500",
      bg: "bg-red-500/10",
      value: "text-red-600 dark:text-red-400",
    },
    info: {
      icon: "text-blue-500",
      bg: "bg-blue-500/10",
      value: "text-blue-600 dark:text-blue-400",
    },
  };

  const styles = colorClasses[color];

  return (
    <div className="bg-card hover:bg-accent/50 group flex items-center gap-3 rounded-xl border p-3 transition-colors">
      <div className={cn("rounded-lg p-2", styles.bg)}>
        <Icon className={cn("h-4 w-4", styles.icon)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground truncate text-xs">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className={cn("text-lg leading-none font-bold", styles.value)}>{value}</p>
          {trend && <span className="text-muted-foreground text-[10px]">{trend}</span>}
        </div>
      </div>
    </div>
  );
}

// Section header
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  iconColor,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  iconColor: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className={cn("h-4 w-4", iconColor)} />
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-muted-foreground text-[10px]">{subtitle}</p>}
      </div>
    </div>
  );
}

// Progress ring for completion
function CompletionRing({
  completed,
  total,
  label,
}: {
  completed: number;
  total: number;
  label: string;
}) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={COLORS.success}
            strokeWidth="3"
            strokeDasharray={`${percentage}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold">{percentage}%</span>
        </div>
      </div>
      <p className="text-muted-foreground mt-1 text-[10px]">{label}</p>
    </div>
  );
}

// Compact workload bar
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
    <div className="group flex items-center gap-2">
      <span className="w-20 truncate text-xs font-medium">{name}</span>
      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-muted-foreground w-8 text-right text-[10px]">{count}</span>
    </div>
  );
}

export function BoardAnalytics({ boardId }: BoardAnalyticsProps) {
  const stats = useQuery(api.analytics.getBoardStats, { boardId });
  const velocity = useQuery(api.analytics.getVelocity, { boardId, weeks: 8 });

  if (stats === undefined || velocity === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
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
  const totalCompleted = velocity.reduce((sum, v) => sum + v.completed, 0);
  const avgVelocity = velocity.length > 0 ? Math.round(totalCompleted / velocity.length) : 0;

  // Prepare pie chart data for cards by type
  const typeData = [
    { name: "Done", value: stats.cardsByType.done, color: COLORS.success },
    { name: "In Progress", value: stats.cardsByType.in_progress, color: COLORS.warning },
    { name: "To Do", value: stats.cardsByType.todo, color: COLORS.info },
    { name: "Backlog", value: stats.cardsByType.backlog, color: "#94a3b8" },
    { name: "Review", value: stats.cardsByType.review, color: COLORS.purple },
    { name: "Blocked", value: stats.cardsByType.blocked, color: COLORS.danger },
  ].filter((d) => d.value > 0);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Top Stats Grid - 6 columns */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MiniStat icon={Layers} label="Total Cards" value={stats.totalCards} />
          <MiniStat
            icon={CheckCircle2}
            label="Completed"
            value={totalCompleted}
            color="success"
            trend="8 weeks"
          />
          <MiniStat
            icon={TrendingUp}
            label="Avg Velocity"
            value={avgVelocity}
            color="info"
            trend="/week"
          />
          <MiniStat
            icon={Zap}
            label="Story Points"
            value={stats.storyPointsStats.total}
            trend={`${stats.storyPointsStats.completed} done`}
          />
          <MiniStat
            icon={AlertTriangle}
            label="Overdue"
            value={stats.dueDateStats.overdue}
            color="danger"
          />
          <MiniStat
            icon={Calendar}
            label="Due Soon"
            value={stats.dueDateStats.dueThisWeek}
            color="warning"
          />
        </div>

        {/* Main Content - 3 column layout */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Velocity Chart - 2 columns */}
          {velocity.length > 0 && (
            <div className="bg-card rounded-xl border p-4 lg:col-span-2">
              <SectionHeader
                icon={TrendingUp}
                title="Team Velocity"
                subtitle="Cards completed per week"
                iconColor="text-emerald-500"
              />
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={velocity} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.success} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={COLORS.success} stopOpacity={0.05} />
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
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      dy={5}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      width={30}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Completed"
                      stroke={COLORS.success}
                      strokeWidth={2}
                      fill="url(#velocityFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Status Distribution - Pie + Legend */}
          <div className="bg-card rounded-xl border p-4">
            <SectionHeader icon={Target} title="Status Distribution" iconColor="text-indigo-500" />
            <div className="flex items-center gap-4">
              <div className="h-[140px] w-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {typeData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Second Row - Time & Story Points */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Time Tracking */}
          {stats.timeStats.cardsWithTime > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <SectionHeader
                icon={Timer}
                title="Time Tracking"
                subtitle={`${stats.timeStats.cardsWithTime} cards tracked`}
                iconColor="text-cyan-500"
              />
              <div className="flex items-center gap-6">
                <CompletionRing
                  completed={stats.timeStats.totalSpent}
                  total={stats.timeStats.totalEstimate}
                  label="Time Progress"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-muted-foreground text-xs">Estimated</span>
                    </div>
                    <span className="font-semibold">
                      {formatTime(stats.timeStats.totalEstimate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="h-3.5 w-3.5 text-cyan-500" />
                      <span className="text-muted-foreground text-xs">Spent</span>
                    </div>
                    <span className="font-semibold">{formatTime(stats.timeStats.totalSpent)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-muted-foreground text-xs">Variance</span>
                    <span
                      className={cn(
                        "text-sm font-bold",
                        stats.timeStats.totalSpent > stats.timeStats.totalEstimate
                          ? "text-red-500"
                          : "text-emerald-500"
                      )}
                    >
                      {stats.timeStats.totalSpent > stats.timeStats.totalEstimate ? "+" : "-"}
                      {formatTime(
                        Math.abs(stats.timeStats.totalSpent - stats.timeStats.totalEstimate)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Story Points by Status */}
          {stats.storyPointsStats.total > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <SectionHeader
                icon={Zap}
                title="Story Points"
                subtitle="By workflow status"
                iconColor="text-indigo-500"
              />
              <div className="flex items-center gap-6">
                <CompletionRing
                  completed={stats.storyPointsStats.completed}
                  total={stats.storyPointsStats.total}
                  label="Completed"
                />
                <div className="h-[120px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Backlog", pts: stats.storyPointsStats.byType.backlog },
                        { name: "To Do", pts: stats.storyPointsStats.byType.todo },
                        { name: "In Prog", pts: stats.storyPointsStats.byType.in_progress },
                        { name: "Review", pts: stats.storyPointsStats.byType.review },
                        { name: "Done", pts: stats.storyPointsStats.byType.done },
                      ].filter((d) => d.pts > 0)}
                      margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        width={25}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="pts"
                        name="Points"
                        fill={COLORS.primary}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Third Row - Workload & Cards by Column */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Workload Distribution */}
          {stats.assigneeStats.length > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <SectionHeader
                icon={Users}
                title="Team Workload"
                subtitle={`${totalAssigned} assigned cards`}
                iconColor="text-violet-500"
              />
              <div className="space-y-2">
                {stats.assigneeStats.slice(0, 6).map((stat, index) => (
                  <WorkloadBar
                    key={stat.userId}
                    name={stat.name}
                    count={stat.count}
                    total={totalAssigned}
                    color={ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length]}
                  />
                ))}
                {stats.assigneeStats.length > 6 && (
                  <p className="text-muted-foreground text-center text-[10px]">
                    +{stats.assigneeStats.length - 6} more members
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cards per Column */}
          {stats.cardsPerColumn.length > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <SectionHeader icon={Layers} title="Cards by Column" iconColor="text-indigo-500" />
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.cardsPerColumn}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="columnGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={COLORS.primary} />
                        <stop offset="100%" stopColor={COLORS.purple} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                    />
                    <Bar
                      dataKey="count"
                      name="Cards"
                      fill="url(#columnGradient)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Labels & Due Dates Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Labels */}
          {stats.labelStats.length > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <SectionHeader icon={Tag} title="By Label" iconColor="text-orange-500" />
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.labelStats}
                    margin={{ top: 5, right: 10, left: -20, bottom: 15 }}
                  >
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      angle={-45}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      width={25}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Cards" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {stats.labelStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Due Date Summary */}
          <div className="bg-card rounded-xl border p-4">
            <SectionHeader icon={Calendar} title="Due Dates" iconColor="text-sky-500" />
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-red-500/10 p-3 text-center">
                <AlertTriangle className="mx-auto h-5 w-5 text-red-500" />
                <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                  {stats.dueDateStats.overdue}
                </p>
                <p className="text-muted-foreground text-[10px]">Overdue</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                <Calendar className="mx-auto h-5 w-5 text-amber-500" />
                <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.dueDateStats.dueThisWeek}
                </p>
                <p className="text-muted-foreground text-[10px]">This Week</p>
              </div>
              <div className="rounded-lg bg-slate-500/10 p-3 text-center">
                <Clock className="mx-auto h-5 w-5 text-slate-400" />
                <p className="mt-1 text-xl font-bold">{stats.dueDateStats.noDueDate}</p>
                <p className="text-muted-foreground text-[10px]">No Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
