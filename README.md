# Kanban Board App

A real-time collaborative Kanban board application built with Convex, React, and TypeScript.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | [Bun](https://bun.sh/) |
| Framework | [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) |
| Language | TypeScript (strict) |
| Backend/DB | [Convex](https://convex.dev/) (real-time reactive database) |
| Auth | [Convex Auth](https://labs.convex.dev/auth) (GitHub, Google OAuth + Password) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Drag & Drop | [@dnd-kit](https://dndkit.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Linting | [oxlint](https://oxc.rs/docs/guide/usage/linter.html) (fast Rust-based linter) |
| Formatting | [Prettier](https://prettier.io/) + [prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) |
| Dead Code | [Knip](https://knip.dev/) (find unused files, exports, dependencies) |
| Git Hooks | [Lefthook](https://github.com/evilmartians/lefthook) (fast git hooks manager) |

## Features

### Board Management
- **Real-time collaboration** - Changes sync instantly across all connected clients
- **Drag & drop** - Reorder cards within columns and move between columns
- **Team boards** - Invite members to collaborate on boards
- **Board marketplace** - Discover public boards and request to join
- **Board reordering** - Drag boards in the sidebar to reorder them

### Cards & Tasks
- **Card management** - Labels, assignees, due dates, descriptions, colors
- **Card comments** - Add comments with @mention support
- **Card filtering** - Search cards and filter by assignee
- **Card colors** - Visual color coding for cards

### Communication
- **Team chat** - Real-time board-level messaging
- **@mentions** - Tag users in chat with `@username` or `@[Full Name]`
- **!card references** - Link cards in chat with `!cardname` or `![Card Name]`
- **Global notifications** - Get notified when mentioned in comments or chat
- **Notification center** - View, mark as read, and clear all notifications

### User Experience
- **Profile customization** - Upload profile pictures, colored avatar initials
- **Dark mode** - Toggle between light and dark themes
- **Keyboard shortcuts** - Navigate and create with keyboard
- **Responsive design** - Works on desktop and mobile

## Prerequisites

- [Bun](https://bun.sh/) installed
- A [Convex](https://convex.dev/) account (free tier available)

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Set up Convex

```bash
bunx convex dev
```

This will:
- Prompt you to log in to Convex (creates account if needed)
- Create a new Convex project
- Deploy the backend schema and functions
- Generate TypeScript types

### 3. Configure Authentication

Run the Convex Auth setup:

```bash
bunx @convex-dev/auth
```

This generates the required `JWT_PRIVATE_KEY` environment variable.

For OAuth providers (optional), add these to your Convex dashboard environment variables:
- `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` for GitHub OAuth
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` for Google OAuth

### 4. Start the development server

In one terminal, run Convex:
```bash
bunx convex dev
```

In another terminal, run the frontend:
```bash
bun run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
kanban-app/
├── convex/                    # Convex backend
│   ├── _generated/            # Auto-generated types
│   ├── schema.ts              # Database schema
│   ├── auth.ts                # Auth configuration
│   ├── boards.ts              # Board mutations/queries
│   ├── columns.ts             # Column mutations/queries
│   ├── cards.ts               # Card mutations/queries
│   ├── labels.ts              # Label mutations/queries
│   ├── comments.ts            # Card comments
│   ├── messages.ts            # Board chat messages
│   ├── notifications.ts       # Notification system
│   ├── joinRequests.ts        # Board join requests
│   └── users.ts               # User queries
├── src/
│   ├── components/
│   │   ├── ui/                # shadcn components
│   │   ├── board/             # Board, Column, Card, CardModal, BoardChat
│   │   └── layout/            # Header, Sidebar, Layout
│   ├── lib/
│   │   ├── utils.ts           # Utility functions
│   │   └── avatar.ts          # Avatar color generator
│   ├── pages/                 # Route pages
│   ├── App.tsx                # Main app with routing
│   └── main.tsx               # Entry point
├── .github/workflows/         # CI/CD (Convex auto-deploy)
├── package.json
└── convex.json
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run lint` | Run oxlint (fast Rust-based linter) |
| `bun run lint:eslint` | Run ESLint |
| `bun run format` | Format code with Prettier |
| `bun run format:check` | Check code formatting |
| `bun run knip` | Find unused code and dependencies |
| `bunx convex dev` | Start Convex dev server |
| `bunx convex dashboard` | Open Convex dashboard |

## Code Quality

This project uses several tools to maintain code quality:

### Pre-commit Hooks (Lefthook)

Automatically runs on every commit:
- **Prettier** - Checks code formatting
- **oxlint** - Lints staged files
- **TypeScript** - Type checks the codebase

Pre-push hook runs the full build to prevent broken deployments.

### Formatting

Prettier is configured with Tailwind CSS class sorting:

```bash
bun run format        # Format all files
bun run format:check  # Check without modifying
```

### Linting

oxlint provides fast linting (50-100x faster than ESLint):

```bash
bun run lint          # Run oxlint
bun run lint:eslint   # Run ESLint (for comparison)
```

### Dead Code Detection

Knip finds unused files, exports, and dependencies:

```bash
bun run knip
```

## Database Schema

| Table | Description |
|-------|-------------|
| **users** | User accounts (managed by Convex Auth) |
| **boards** | Kanban boards with owner and member references |
| **columns** | Board columns with ordering |
| **cards** | Cards with labels, assignees, due dates, colors |
| **labels** | Color-coded labels per board |
| **comments** | Card comments with @mention support |
| **messages** | Team chat messages per board |
| **notifications** | User notifications (mentions, assignments) |
| **joinRequests** | Requests to join public boards |
| **chatReadStatus** | Tracks unread messages per user/board |

## Deployment

### Auto-deploy with GitHub Actions

Both frontend and backend deploy automatically on push to main:

| Component | Deployment |
|-----------|------------|
| Frontend (Vite) | Vercel auto-deploys on push |
| Backend (Convex) | GitHub Actions runs `bunx convex deploy` |

**Setup Convex Deploy Key:**

1. Go to [Convex Dashboard](https://dashboard.convex.dev/) > Your Project > Settings > Deploy Keys
2. Create a new deploy key
3. Add it to GitHub: Repository Settings > Secrets > Actions > New secret
   - Name: `CONVEX_DEPLOY_KEY`
   - Value: Your deploy key

### Manual Deployment

```bash
bunx convex deploy         # Deploy to production (interactive)
bunx convex deploy --yes   # Deploy without confirmation
```

## Keyboard Shortcuts

| Keys | Action |
|------|--------|
| `?` | Show keyboard shortcuts help |
| `B` | Create new board |
| `N` | Create new card (on board page) |
| `/` | Focus search (on board page) |
| `G` then `H` | Go to Home |
| `G` then `M` | Go to Marketplace |
| `G` then `P` | Go to Profile |
| `1-9` | Open board by position |

## Architecture Notes

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  Pages          │  Components       │  UI Library            │
│  - Home         │  - Board          │  - shadcn/ui           │
│  - Board        │  - Column         │  - Radix primitives    │
│  - Profile      │  - Card           │                        │
│  - Marketplace  │  - CardModal      │                        │
│  - Login        │  - BoardChat      │                        │
│                 │  - Notifications  │                        │
├─────────────────────────────────────────────────────────────┤
│                    Convex React Hooks                        │
│              useQuery() / useMutation()                      │
└─────────────────────────────────────────────────────────────┘
                              │
                    Real-time WebSocket
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Convex)                         │
├─────────────────────────────────────────────────────────────┤
│  Queries         │  Mutations        │  Auth                 │
│  - boards.list   │  - boards.create  │  - getAuthUserId()    │
│  - cards.get     │  - cards.move     │  - GitHub OAuth       │
│  - messages.list │  - comments.add   │  - Google OAuth       │
│                  │  - notifications  │  - Password           │
├─────────────────────────────────────────────────────────────┤
│                      Database (Convex)                       │
│  Tables: boards, columns, cards, labels, comments,           │
│          messages, notifications, joinRequests, users        │
└─────────────────────────────────────────────────────────────┘
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Convex over traditional API | Real-time sync, type-safe, no REST boilerplate |
| @dnd-kit over react-beautiful-dnd | Modern, maintained, better TypeScript support |
| shadcn/ui over Material UI | Customizable, copy-paste components, smaller bundle |
| Feature-based file structure | Easier to navigate, related code together |
| No global state library | Convex handles server state, local state is minimal |

### Future Improvements

For continued growth and maintainability:

1. **Extract Custom Hooks**
   - `useCardModal()` - Modal state management
   - `useBoardFilters()` - Search and filter logic
   - `useMentions()` - @mention parsing and suggestions

2. **Split Large Components**
   - `CardModal.tsx` (500+ lines) → Extract AssigneeSection, LabelSection, CommentSection
   - `BoardChat.tsx` → Extract MessageList, MentionSuggestions

3. **Add Tests**
   - Unit tests for card reordering logic
   - Integration tests for auth flows
   - E2E tests with Playwright

4. **Backend Helpers**
   - `requireBoardAccess(ctx, boardId)` - Reduce auth check duplication
   - Structured error responses

5. **Performance**
   - Code splitting with React.lazy()
   - Virtual scrolling for large boards

## Convex Dashboard

Access the Convex dashboard to manage your data:

```bash
bunx convex dashboard
```

Or visit [dashboard.convex.dev](https://dashboard.convex.dev/)

From the dashboard you can:
- Browse and edit data in all tables
- View function logs and errors
- Manage environment variables
- Monitor real-time connections
- View file storage

## License

MIT
