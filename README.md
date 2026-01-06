# Kanban Board App

A real-time collaborative Kanban board application built with Convex, React, and TypeScript.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | [Bun](https://bun.sh/) |
| Framework | [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) |
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

- **Real-time collaboration** - Changes sync instantly across all connected clients
- **Drag & drop** - Reorder cards within columns and move between columns
- **Team boards** - Invite members to collaborate on boards
- **Board marketplace** - Discover public boards and request to join
- **Team chat** - Real-time messaging with @user and !card mentions
- **Card management** - Labels, assignees, due dates, descriptions
- **Profile customization** - Upload profile pictures, colored avatar initials
- **Dark mode** - Toggle between light and dark themes
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

## Convex Dashboard (Admin)

Access the Convex dashboard to manage your data:

```bash
bunx convex dashboard
```

Or visit [dashboard.convex.dev](https://dashboard.convex.dev/) and select your project.

From the dashboard you can:
- Browse and edit data in all tables
- View function logs and errors
- Manage environment variables
- Monitor real-time connections
- View file storage

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
│   └── users.ts               # User queries
├── src/
│   ├── components/
│   │   ├── ui/                # shadcn components
│   │   ├── board/             # Board, Column, Card components
│   │   └── layout/            # Header, Sidebar, Layout
│   ├── lib/
│   │   ├── utils.ts           # Utility functions
│   │   └── avatar.ts          # Avatar color generator
│   ├── pages/                 # Route pages
│   ├── App.tsx                # Main app with routing
│   └── main.tsx               # Entry point
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

- **users** - User accounts (managed by Convex Auth)
- **boards** - Kanban boards with owner and member references
- **columns** - Board columns with ordering
- **cards** - Cards with labels, assignees, due dates
- **labels** - Color-coded labels per board
- **joinRequests** - Requests to join public boards
- **messages** - Team chat messages per board
- **chatReadStatus** - Tracks unread messages per user/board
- **comments** - Card comments

## Convex Best Practices

### Deployment

Convex backend and frontend are deployed separately:

| Component | Deployment |
|-----------|------------|
| Frontend (Vite) | Vercel auto-deploys on push |
| Backend (Convex) | Requires `bunx convex deploy` |

**Important:** Schema changes (new tables, fields, indexes) require deploying Convex to production. If you only push to Vercel, your frontend will try to use tables/functions that don't exist in production yet.

### Auto-deploy on Push

This project includes a pre-push hook that automatically deploys Convex:

```yaml
# lefthook.yml
pre-push:
  jobs:
    - name: convex-deploy
      run: bunx convex deploy --yes
```

This ensures your Convex backend is always in sync with your frontend.

### Manual Deployment

```bash
bunx convex deploy         # Deploy to production (interactive)
bunx convex deploy --yes   # Deploy without confirmation
```

### Schema Migrations

Convex handles schema changes gracefully:

| Change Type | Migration Required | Notes |
|-------------|-------------------|-------|
| Add new table | No | Table is created empty |
| Add optional field | No | Existing docs have `undefined` |
| Add required field | No* | Must provide default or backfill |
| Add index | No | Index builds automatically |
| Remove field | No | Field is ignored |
| Remove table | Manual | Must delete data first |

*For required fields on existing data, either:
1. Make the field optional: `v.optional(v.string())`
2. Run a migration to backfill existing documents

### Environment Variables

Convex uses two sets of environment variables:

| Location | Purpose | Example |
|----------|---------|---------|
| `.env.local` | Local dev config | `CONVEX_DEPLOYMENT=dev:...` |
| Convex Dashboard | Production secrets | `AUTH_GITHUB_SECRET=...` |

Never commit secrets to git. Add them via:
```bash
bunx convex env set AUTH_GITHUB_SECRET "your-secret"
```

### Debugging

```bash
bunx convex logs                    # Stream dev logs
bunx convex logs --prod             # Stream production logs
bunx convex logs --prod --success   # Include successful calls
bunx convex dashboard               # Open web dashboard
```

### Local Development

For faster iteration, use a local Convex backend:

```bash
bunx convex dev --once              # Deploy once and exit
bunx convex dev                     # Watch mode (auto-redeploy)
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

## License

MIT
