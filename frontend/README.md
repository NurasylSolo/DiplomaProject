# Senti News — Frontend

Премиальная веб-платформа для мониторинга медиапространства и анализа новостей.

## 🚀 Tech Stack

- **Framework:** Next.js 15+ (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + CSS Variables
- **UI Components:** shadcn/ui + Radix UI
- **Animations:** Framer Motion
- **State Management:** 
  - Server State: TanStack Query
  - Client State: Zustand
- **Forms:** React Hook Form + Zod
- **Charts:** ECharts
- **i18n:** i18next (EN/RU/KZ)
- **HTTP Client:** Axios

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Dashboard pages
│   │   └── projects/
│   │       └── [projectId]/
│   │           ├── mentions/
│   │           ├── sources/
│   │           ├── settings/
│   │           └── ...
│   ├── layout.tsx
│   ├── page.tsx           # Landing page
│   └── providers.tsx
├── components/
│   ├── ui/                # Base UI components (shadcn/ui)
│   └── layout/            # Layout components (Sidebar, Header)
├── features/              # Feature modules
│   └── mentions/
│       └── components/
├── lib/
│   ├── api/              # API client & utilities
│   ├── constants/        # App constants
│   ├── i18n/             # Internationalization
│   └── utils.ts
├── hooks/                # Custom hooks
├── stores/               # Zustand stores
└── types/                # TypeScript types
```

## 🎨 Design System

### Colors (OKLCH)
- **Primary:** Teal/Cyan — `oklch(0.70 0.15 195)`
- **Accent:** Amber — `oklch(0.75 0.14 75)`
- **Positive:** Green — `oklch(0.65 0.17 155)`
- **Negative:** Red — `oklch(0.60 0.22 25)`

### Typography
- **Display Font:** Syne (headings)
- **Body Font:** DM Sans
- **Mono Font:** JetBrains Mono

### Animations
- Framer Motion for page transitions
- CSS transitions for micro-interactions
- Respects `prefers-reduced-motion`

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone repository
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 📱 Pages

### Implemented (MVP)
- [x] Landing page (`/`)
- [x] Login (`/login`)
- [x] Register (`/register`)
- [x] Mentions & Reach (`/projects/[id]/mentions`)
- [x] Sources (`/projects/[id]/sources`)
- [x] Settings (`/projects/[id]/settings`)

### Planned
- [ ] AI Insights
- [ ] Analysis (multi-tab)
- [ ] AI Brand Assistant
- [ ] Topic Analysis
- [ ] Comparison
- [ ] Influencers
- [ ] Reports (PDF, Excel, Email)
- [ ] Geo Analysis
- [ ] Hot Hours
- [ ] Emotion Analysis

## 🌐 Internationalization

Supported languages:
- 🇬🇧 English (en)
- 🇷🇺 Русский (ru)
- 🇰🇿 Қазақша (kz)

Translations located in `src/lib/i18n/locales/`

## 🔐 Authentication

- JWT-based authentication
- Access + Refresh token flow
- Tokens stored in localStorage
- Auto refresh on 401 response
- OAuth Google (UI ready)

## 📊 API Integration

Base URL configured via environment variable:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

API client with:
- Automatic token injection
- Refresh token handling
- Error standardization

## 🎯 Features

### Mentions Page
- Real-time filters (date, sources, sentiment)
- Interactive charts (mentions over time, sentiment distribution)
- Virtual scrolling table
- Bulk actions
- Saved filters

### Sources Page
- Source management
- Trust/block functionality
- Active/inactive toggle
- Influence scoring

### Settings Page
- Project configuration
- Keywords management
- Notification settings
- Team management

## 📝 Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## 🏗️ Build

```bash
npm run build
```

Output in `.next/` directory.

## 📄 License

Private — Diploma Project

---

Built with ❤️ for diploma project
