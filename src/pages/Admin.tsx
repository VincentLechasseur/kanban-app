import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Navigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/UserAvatar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Kanban,
  Layers,
  MessageSquare,
  Activity,
  Shield,
  ShieldOff,
  Trash2,
  Search,
  Globe,
  Lock,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

// Mini stat card
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subtext?: string;
  color?: "default" | "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    default: { icon: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
    blue: { icon: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/40" },
    green: {
      icon: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-900/40",
    },
    purple: {
      icon: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-100 dark:bg-violet-900/40",
    },
    orange: {
      icon: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-100 dark:bg-orange-900/40",
    },
  };
  const styles = colorClasses[color];

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg p-2.5", styles.bg)}>
          <Icon className={cn("h-5 w-5", styles.icon)} />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtext && <p className="text-muted-foreground text-[10px]">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

// Custom tooltip for charts
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover rounded-lg border px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          {entry.name}: <span className="text-foreground font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function Admin() {
  const isAdmin = useQuery(api.admin.isAdmin);
  const stats = useQuery(api.admin.getPlatformStats);
  const users = useQuery(api.admin.listUsers);
  const boards = useQuery(api.admin.listAllBoards);
  const setUserAdmin = useMutation(api.admin.setUserAdmin);
  const deleteBoard = useMutation(api.admin.deleteBoard);

  const [userSearch, setUserSearch] = useState("");
  const [boardSearch, setBoardSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "board";
    id: Id<"boards">;
    name: string;
  } | null>(null);

  // Check admin status
  if (isAdmin === false) {
    return <Navigate to="/" replace />;
  }

  if (isAdmin === undefined || stats === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users?.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredBoards = boards?.filter(
    (b) =>
      b.name.toLowerCase().includes(boardSearch.toLowerCase()) ||
      b.owner.name.toLowerCase().includes(boardSearch.toLowerCase())
  );

  const handleToggleAdmin = async (
    userId: Id<"users">,
    currentStatus: boolean,
    userName: string
  ) => {
    try {
      await setUserAdmin({ userId, isAdmin: !currentStatus });
      toast.success(`${userName} is ${!currentStatus ? "now an admin" : "no longer an admin"}`);
    } catch {
      toast.error("Failed to update admin status");
    }
  };

  const handleDeleteBoard = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBoard({ boardId: deleteTarget.id });
      toast.success(`Board "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete board");
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-3">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Platform overview and management</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Users} label="Total Users" value={stats.totals.users} color="blue" />
          <StatCard
            icon={UserPlus}
            label="Active Users"
            value={stats.totals.activeUsers}
            subtext="With boards"
            color="green"
          />
          <StatCard icon={Kanban} label="Boards" value={stats.totals.boards} color="purple" />
          <StatCard icon={Layers} label="Cards" value={stats.totals.cards} color="orange" />
          <StatCard icon={MessageSquare} label="Messages" value={stats.totals.messages} />
          <StatCard icon={Activity} label="Activities" value={stats.totals.activities} />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* User Growth */}
          <div className="bg-card rounded-xl border p-4">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold">User Growth</h3>
              <span className="text-muted-foreground text-xs">Last 8 weeks</span>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.userGrowth}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="userGrowthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={30} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="New Users"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#userGrowthFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Boards */}
          <div className="bg-card rounded-xl border p-4">
            <div className="mb-4 flex items-center gap-2">
              <Kanban className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-semibold">Top Boards by Cards</h3>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.topBoards.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="cardCount"
                    name="Cards"
                    fill="#6366f1"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-500" />
              <span className="text-sm">Public Boards</span>
            </div>
            <span className="text-lg font-bold">{stats.totals.publicBoards}</span>
          </div>
          <div className="bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Private Boards</span>
            </div>
            <span className="text-lg font-bold">{stats.totals.privateBoards}</span>
          </div>
          <div className="bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Avg Cards/Board</span>
            </div>
            <span className="text-lg font-bold">{stats.averages.cardsPerBoard}</span>
          </div>
          <div className="bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" />
              <span className="text-sm">Avg Members/Board</span>
            </div>
            <span className="text-lg font-bold">{stats.averages.membersPerBoard}</span>
          </div>
        </div>

        {/* Tabs for Users and Boards */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users ({users?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="boards" className="gap-2">
              <Kanban className="h-4 w-4" />
              Boards ({boards?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="bg-card rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Boards</TableHead>
                    <TableHead>Cards</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            userId={user.id}
                            name={user.name}
                            email={user.email}
                            image={user.image}
                            className="h-8 w-8"
                          />
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-muted-foreground text-xs">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {user.stats.ownedBoards} owned, {user.stats.memberBoards} member
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {user.stats.createdCards} created, {user.stats.assignedCards} assigned
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {format(user.createdAt, "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAdmin(user.id, user.isAdmin, user.name)}
                          className="gap-1"
                        >
                          {user.isAdmin ? (
                            <>
                              <ShieldOff className="h-3.5 w-3.5" />
                              Remove
                            </>
                          ) : (
                            <>
                              <Shield className="h-3.5 w-3.5" />
                              Make Admin
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Boards Tab */}
          <TabsContent value="boards" className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search boards..."
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="bg-card rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Board</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Cards</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBoards?.map((board) => (
                    <TableRow key={board.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {board.icon && <span className="text-lg">{board.icon}</span>}
                          <div>
                            <p className="font-medium">{board.name}</p>
                            {board.description && (
                              <p className="text-muted-foreground max-w-[200px] truncate text-xs">
                                {board.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{board.owner.name}</p>
                          <p className="text-muted-foreground text-xs">{board.owner.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{board.memberCount}</TableCell>
                      <TableCell>{board.cardCount}</TableCell>
                      <TableCell>
                        {board.isPublic ? (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                            <Globe className="h-3 w-3" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Private
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {format(board.createdAt, "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 h-8 w-8"
                          onClick={() =>
                            setDeleteTarget({ type: "board", id: board.id, name: board.name })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}" and all its columns, cards,
              messages, and activities. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
}
