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
  Users,
  Kanban,
  Layers,
  MessageSquare,
  Shield,
  ShieldOff,
  Trash2,
  Search,
  Globe,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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

  if (isAdmin === false) {
    return <Navigate to="/" replace />;
  }

  if (isAdmin === undefined || stats === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
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
    <div className="flex h-full flex-col">
      {/* Compact Header with Stats */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <h1 className="text-lg font-semibold">Admin</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium">{stats.totals.users}</span>
              <span className="text-muted-foreground">users</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Kanban className="h-3.5 w-3.5 text-violet-500" />
              <span className="font-medium">{stats.totals.boards}</span>
              <span className="text-muted-foreground">boards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-orange-500" />
              <span className="font-medium">{stats.totals.cards}</span>
              <span className="text-muted-foreground">cards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium">{stats.totals.messages}</span>
              <span className="text-muted-foreground">msgs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Tabs */}
      <Tabs defaultValue="users" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b px-4">
          <TabsList className="h-10 bg-transparent p-0">
            <TabsTrigger
              value="users"
              className="data-[state=active]:border-primary gap-1.5 rounded-none border-b-2 border-transparent px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Users className="h-4 w-4" />
              Users
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {users?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="boards"
              className="data-[state=active]:border-primary gap-1.5 rounded-none border-b-2 border-transparent px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Kanban className="h-4 w-4" />
              Boards
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {boards?.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-0 flex-1 overflow-hidden">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b px-4 py-2">
              <Search className="text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="h-8 max-w-xs border-0 bg-transparent px-0 focus-visible:ring-0"
              />
            </div>
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9">User</TableHead>
                    <TableHead className="h-9">Boards</TableHead>
                    <TableHead className="h-9">Cards</TableHead>
                    <TableHead className="h-9">Joined</TableHead>
                    <TableHead className="h-9">Role</TableHead>
                    <TableHead className="h-9 w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            userId={user.id}
                            name={user.name}
                            email={user.email}
                            image={user.image}
                            className="h-7 w-7"
                          />
                          <div>
                            <p className="text-sm leading-none font-medium">{user.name}</p>
                            <p className="text-muted-foreground text-xs">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-muted-foreground text-xs">
                          {user.stats.totalBoards}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-muted-foreground text-xs">
                          {user.stats.createdCards}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-muted-foreground text-xs">
                          {format(user.createdAt, "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        {user.isAdmin ? (
                          <Badge className="h-5 bg-violet-100 px-1.5 text-[10px] text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAdmin(user.id, user.isAdmin, user.name)}
                          className="h-7 gap-1 px-2 text-xs"
                        >
                          {user.isAdmin ? (
                            <ShieldOff className="h-3 w-3" />
                          ) : (
                            <Shield className="h-3 w-3" />
                          )}
                          {user.isAdmin ? "Remove" : "Make Admin"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Boards Tab */}
        <TabsContent value="boards" className="mt-0 flex-1 overflow-hidden">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b px-4 py-2">
              <Search className="text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search boards..."
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                className="h-8 max-w-xs border-0 bg-transparent px-0 focus-visible:ring-0"
              />
            </div>
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9">Board</TableHead>
                    <TableHead className="h-9">Owner</TableHead>
                    <TableHead className="h-9">Members</TableHead>
                    <TableHead className="h-9">Cards</TableHead>
                    <TableHead className="h-9">Visibility</TableHead>
                    <TableHead className="h-9">Created</TableHead>
                    <TableHead className="h-9 w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBoards?.map((board) => (
                    <TableRow key={board.id}>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          {board.icon && <span>{board.icon}</span>}
                          <span className="text-sm font-medium">{board.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-muted-foreground text-xs">{board.owner.name}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-muted-foreground text-xs">{board.memberCount}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-muted-foreground text-xs">{board.cardCount}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        {board.isPublic ? (
                          <Badge className="h-5 gap-0.5 bg-emerald-100 px-1.5 text-[10px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                            <Globe className="h-2.5 w-2.5" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="h-5 gap-0.5 px-1.5 text-[10px]">
                            <Lock className="h-2.5 w-2.5" />
                            Private
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-muted-foreground text-xs">
                          {format(board.createdAt, "MMM d")}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 h-7 w-7"
                          onClick={() =>
                            setDeleteTarget({ type: "board", id: board.id, name: board.name })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}" and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
