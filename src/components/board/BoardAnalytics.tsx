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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { AlertTriangle, Calendar } from "lucide-react";

interface BoardAnalyticsProps {
  boardId: Id<"boards">;
}

const CHART_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
];

export function BoardAnalytics({ boardId }: BoardAnalyticsProps) {
  const stats = useQuery(api.analytics.getBoardStats, { boardId });
  const velocity = useQuery(api.analytics.getVelocity, { boardId, weeks: 8 });

  if (stats === undefined || velocity === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
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

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-2xl font-bold">{stats.totalCards}</p>
            <p className="text-muted-foreground text-xs">Total Cards</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-2xl font-bold">{stats.totalColumns}</p>
            <p className="text-muted-foreground text-xs">Columns</p>
          </div>
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-500">{stats.dueDateStats.overdue}</p>
              <p className="text-muted-foreground text-xs">Overdue</p>
            </div>
          </div>
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
            <Calendar className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{stats.dueDateStats.dueThisWeek}</p>
              <p className="text-muted-foreground text-xs">Due This Week</p>
            </div>
          </div>
        </div>

        {/* Cards per Column */}
        {stats.cardsPerColumn.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="mb-4 font-semibold">Cards per Column</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.cardsPerColumn} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Team Velocity */}
        {velocity.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="mb-4 font-semibold">Team Velocity (Cards Completed)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#10b981"
                    fill="#10b98120"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Workload Distribution */}
          {stats.assigneeStats.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="mb-4 font-semibold">Workload Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.assigneeStats}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(props) => {
                        const { name, percent } = props as { name?: string; percent?: number };
                        return `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`;
                      }}
                      labelLine={false}
                    >
                      {stats.assigneeStats.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Labels Distribution */}
          {stats.labelStats.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="mb-4 font-semibold">Cards by Label</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.labelStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.labelStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Cards Over Time */}
        {stats.cardsOverTime.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="mb-4 font-semibold">Cards Created (Last 30 Days)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.cardsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#8b5cf6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Due Date Summary */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h3 className="mb-4 font-semibold">Due Date Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm">Overdue</span>
              </div>
              <span className="font-medium">{stats.dueDateStats.overdue}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="text-sm">Due This Week</span>
              </div>
              <span className="font-medium">{stats.dueDateStats.dueThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-400" />
                <span className="text-sm">No Due Date</span>
              </div>
              <span className="font-medium">{stats.dueDateStats.noDueDate}</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
