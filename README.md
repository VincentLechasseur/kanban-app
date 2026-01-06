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

## Features

- **Real-time collaboration** - Changes sync instantly across all connected clients
- **Drag & drop** - Reorder cards within columns and move between columns
- **Team boards** - Invite members to collaborate on boards
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
| `bun run lint` | Run ESLint |
| `bunx convex dev` | Start Convex dev server |
| `bunx convex dashboard` | Open Convex dashboard |

## Database Schema

- **users** - User accounts (managed by Convex Auth)
- **boards** - Kanban boards with owner and member references
- **columns** - Board columns with ordering
- **cards** - Cards with labels, assignees, due dates
- **labels** - Color-coded labels per board

## License

MIT
