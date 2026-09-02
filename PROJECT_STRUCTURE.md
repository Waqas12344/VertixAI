# VertixAI — Project Folder Structure

> Generated: 2026-08-31  
> Framework: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui  
> Infrastructure: Supabase · Prisma · Google Gen AI SDK

---

## Root

```
nexus-ai/
├── .agents/                         # Agent skill definitions
│   └── skills/
│       └── prisma-composer/
├── .claude/                         # Claude agent skills
│   └── skills/
├── .cursor/                         # Cursor agent skills
│   └── skills/
├── .devin/                          # Devin agent skills
│   └── skills/
├── .env.local                       # Local environment variables (secrets)
├── .gitignore
├── .husky/
│   └── pre-commit                   # Git pre-commit hook
├── .kiro/
│   └── settings/
│       └── mcp.json                 # MCP server configuration
├── AGENTS.md                        # AI agent rules & phased dev workflow
├── biome.json                       # Biome linter/formatter config
├── components.json                  # shadcn/ui registry config
├── CONTRIBUTING.md
├── LICENSE
├── media/
│   └── dashboard.png
├── next.config.mjs                  # Next.js configuration
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── prisma/
│   └── schema.prisma                # Prisma data models (Phase 1)
├── prisma.config.ts                 # Prisma client config
├── PROJECT_STRUCTURE.md             # This file
├── README.md
├── tsconfig.json
└── tsconfig.scripts.json
```

---

## src/

```
src/
├── proxy.disabled.ts                # Disabled proxy utility
│
├── app/                             # Next.js App Router
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx                   # Root layout
│   ├── not-found.tsx                # 404 page
│   │
│   ├── (external)/                  # Public / landing routes
│   │   └── page.tsx                 # Landing page
│   │
│   └── (main)/                      # Authenticated app shell
│       ├── auth/                    # Authentication pages
│       │   ├── v1/                  # Auth design v1
│       │   │   ├── login/
│       │   │   │   └── page.tsx
│       │   │   └── register/
│       │   │       └── page.tsx
│       │   ├── v2/                  # Auth design v2 (active)
│       │   │   ├── layout.tsx
│       │   │   ├── login/
│       │   │   │   └── page.tsx
│       │   │   └── register/
│       │   │       └── page.tsx
│       │   └── _components/         # Shared auth UI components
│       │       ├── login-form.tsx
│       │       ├── register-form.tsx
│       │       └── social-auth/
│       │           └── google-button.tsx
│       │
│       ├── chat/                    # Standalone chat page (Phase 4)
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── _components/
│       │       ├── chat-conversation-list.tsx
│       │       ├── chat-header.tsx
│       │       ├── chat-profile-details.tsx
│       │       ├── chat-sidebar.tsx
│       │       ├── chat-thread.tsx
│       │       ├── chat.tsx
│       │       ├── data.ts
│       │       └── use-chat.ts
│       │
│       ├── mail/                    # Mail / inbox page
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── _components/
│       │       ├── data.tsx
│       │       ├── mail-inbox.tsx
│       │       ├── mail-layout-config.ts
│       │       ├── mail-list.tsx
│       │       ├── mail-sidebar.tsx
│       │       ├── mail-view.tsx
│       │       ├── mail.tsx
│       │       └── use-mail.ts
│       │
│       ├── unauthorized/            # 403 / access-denied page
│       │   └── page.tsx
│       │
│       └── dashboard/               # Dashboard shell
│           ├── layout.tsx           # Dashboard layout (sidebar + header)
│           ├── page.tsx             # Dashboard index redirect
│           │
│           ├── _components/         # Shared dashboard chrome
│           │   ├── header/
│           │   │   ├── account-switcher.tsx
│           │   │   ├── github-repositories-menu.tsx
│           │   │   ├── layout-controls.tsx
│           │   │   ├── search-dialog.tsx
│           │   │   └── theme-switcher.tsx
│           │   └── sidebar/
│           │       ├── app-sidebar.tsx
│           │       ├── nav-main.tsx
│           │       ├── nav-user.tsx
│           │       └── support-card.tsx
│           │
│           ├── (legacy)/            # Archived v1 dashboards (not linked)
│           │   ├── analytics-v1/
│           │   │   ├── page.tsx
│           │   │   └── _components/
│           │   │       ├── analytics-actions-manager-queue.tsx
│           │   │       ├── analytics-actions-risk-ledger.tsx
│           │   │       ├── analytics-drivers-coverage-triage.tsx
│           │   │       ├── analytics-drivers-forecast-target.tsx
│           │   │       └── analytics-overview.tsx
│           │   ├── crm-v1/
│           │   │   ├── page.tsx
│           │   │   └── _components/
│           │   │       ├── crm.config.ts
│           │   │       ├── insight-cards.tsx
│           │   │       ├── operational-cards.tsx
│           │   │       ├── overview-cards.tsx
│           │   │       └── recent-leads-table/
│           │   │           ├── columns.tsx
│           │   │           ├── schema.ts
│           │   │           └── table.tsx
│           │   ├── default-v1/
│           │   │   ├── page.tsx
│           │   │   └── _components/
│           │   │       ├── chart-area-interactive.tsx
│           │   │       ├── data.json
│           │   │       ├── section-cards.tsx
│           │   │       └── proposal-sections-table/
│           │   │           ├── columns.tsx
│           │   │           ├── schema.ts
│           │   │           └── table.tsx
│           │   └── finance-v1/
│           │       ├── page.tsx
│           │       └── _components/
│           │           ├── card-overview.tsx
│           │           ├── cash-flow-overview.tsx
│           │           ├── income-reliability.tsx
│           │           ├── spending-breakdown.tsx
│           │           └── kpis/
│           │               ├── monthly-cash-flow.tsx
│           │               ├── net-worth.tsx
│           │               ├── primary-account.tsx
│           │               └── savings-rate.tsx
│           │
│           ├── academy/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── assignment-status.tsx
│           │       ├── class-schedule.tsx
│           │       ├── kpi-cards.tsx
│           │       ├── performance-highlights.tsx
│           │       └── upcoming-events.tsx
│           │
│           ├── analytics/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── analytics-kpi-strip.tsx
│           │       ├── analytics-toolbar.tsx
│           │       ├── realtime-visitors.tsx
│           │       ├── top-pages.tsx
│           │       ├── top-traffic-sources.tsx
│           │       └── traffic-quality.tsx
│           │
│           ├── calendar/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── calendar.tsx
│           │       └── events-data.ts
│           │
│           ├── chat/                # Dashboard-embedded chat page
│           │   └── page.tsx
│           │
│           ├── coming-soon/
│           │   └── page.tsx
│           │
│           ├── crm/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── kpi-cards.tsx
│           │       ├── opportunities-section.tsx
│           │       ├── pipeline-activity.tsx
│           │       ├── task-reminders.tsx
│           │       └── opportunities-table/
│           │           ├── columns.tsx
│           │           ├── data.json
│           │           └── schema.ts
│           │
│           ├── default/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── data.json
│           │       ├── metric-cards.tsx
│           │       ├── performance-overview.tsx
│           │       ├── subscriber-overview.tsx
│           │       └── recent-customers-table/
│           │           ├── columns.tsx
│           │           ├── schema.ts
│           │           └── table.tsx
│           │
│           ├── ecommerce/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── customer-reviews.tsx
│           │       ├── inventory.tsx
│           │       ├── kpi-strip.tsx
│           │       ├── recent-orders.tsx
│           │       ├── store-traffic.tsx
│           │       ├── top-products.tsx
│           │       ├── traffic-sources.tsx
│           │       └── recent-orders-table/
│           │           ├── columns.tsx
│           │           ├── data.json
│           │           ├── formatters.ts
│           │           └── schema.ts
│           │
│           ├── file-manager/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── data.ts
│           │       ├── file-actions.tsx
│           │       ├── file-grid-view.tsx
│           │       ├── file-list-view.tsx
│           │       ├── file-manager-toolbar.tsx
│           │       └── folders-section.tsx
│           │
│           ├── finance/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── balance-distribution-card.tsx
│           │       ├── finance-notification.tsx
│           │       ├── income-breakdown.tsx
│           │       ├── overview-kpis.tsx
│           │       ├── quick-actions.tsx
│           │       ├── transactions-overview-card.tsx
│           │       ├── upcoming-transactions.tsx
│           │       └── wallet.tsx
│           │
│           ├── infrastructure/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── infrastructure-data.ts
│           │       ├── infrastructure-header.tsx
│           │       └── project-environments.tsx
│           │
│           ├── invoice/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── client-selector.tsx
│           │       ├── data.ts
│           │       ├── invoice-adjustments.tsx
│           │       ├── invoice-details.tsx
│           │       ├── invoice-form.tsx
│           │       ├── invoice-items.tsx
│           │       ├── invoice-paper.tsx
│           │       ├── invoice-preview.tsx
│           │       ├── invoice.tsx
│           │       ├── print-invoice.tsx
│           │       └── use-visible-center-position.ts
│           │
│           ├── kanban/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── data.ts
│           │       ├── kanban-column.tsx
│           │       ├── kanban.tsx
│           │       ├── sortable-task-card.tsx
│           │       ├── task-card.tsx
│           │       ├── types.ts
│           │       └── utils.ts
│           │
│           ├── logistics/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── logistics.tsx
│           │       ├── shipment-data.ts
│           │       ├── shipment-details.tsx
│           │       ├── shipment-list.tsx
│           │       └── shipment-route-map.tsx
│           │
│           ├── mail/
│           │   └── page.tsx
│           │
│           ├── patient-monitoring/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── chart-grid.ts
│           │       ├── data.ts
│           │       ├── patient-card.tsx
│           │       ├── patient-detail.tsx
│           │       ├── patient-monitoring.tsx
│           │       ├── patient-trends.tsx
│           │       ├── realtime-utils.ts
│           │       ├── use-patient-vital-series.ts
│           │       ├── use-realtime-tick.ts
│           │       ├── vital-waveform.tsx
│           │       └── waveform-data.ts
│           │
│           ├── productivity/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── calendar-panel.tsx
│           │       ├── focus-card.tsx
│           │       ├── projects-section.tsx
│           │       ├── quick-actions.tsx
│           │       ├── quote-card.tsx
│           │       ├── recent-notes-card.tsx
│           │       ├── summary-cards.tsx
│           │       ├── tasks-section.tsx
│           │       └── weekly-summary-card.tsx
│           │
│           ├── profile/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── profile-data.ts
│           │       ├── profile-documents.tsx
│           │       ├── profile-employment-details.tsx
│           │       ├── profile-header.tsx
│           │       ├── profile-overview.tsx
│           │       ├── profile-personal-details.tsx
│           │       ├── profile-status-sidebar.tsx
│           │       └── profile-time-off-details.tsx
│           │
│           ├── roles/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── roles.tsx
│           │       └── roles-table/
│           │           ├── columns.tsx
│           │           ├── data.ts
│           │           └── table.tsx
│           │
│           ├── tasks/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── columns.tsx
│           │       ├── data.ts
│           │       ├── task-priority-filter.tsx
│           │       ├── task-status-filter.tsx
│           │       ├── tasks-toolbar.tsx
│           │       └── tasks.tsx
│           │
│           ├── users/
│           │   ├── page.tsx
│           │   └── _components/
│           │       ├── data.tsx
│           │       ├── users-columns.tsx
│           │       ├── users-table.tsx
│           │       └── users.tsx
│           │
│           └── [...not-found]/      # Catch-all 404 inside dashboard
│               └── page.tsx
│
├── components/                      # Shared UI components
│   ├── calendar/
│   │   └── event-calendar-views.tsx
│   ├── date-range-picker.tsx
│   ├── simple-icon.tsx
│   └── ui/                          # shadcn/ui primitives (do not edit)
│       ├── accordion.tsx
│       ├── alert-dialog.tsx
│       ├── alert.tsx
│       ├── aspect-ratio.tsx
│       ├── attachment.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── breadcrumb.tsx
│       ├── bubble.tsx
│       ├── button-group.tsx
│       ├── button.tsx
│       ├── calendar.tsx
│       ├── card.tsx
│       ├── carousel.tsx
│       ├── chart.tsx
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── combobox.tsx
│       ├── command.tsx
│       ├── context-menu.tsx
│       ├── dialog.tsx
│       ├── direction.tsx
│       ├── drawer.tsx
│       ├── dropdown-menu.tsx
│       ├── empty.tsx
│       ├── field.tsx
│       ├── hover-card.tsx
│       ├── input-group.tsx
│       ├── input-otp.tsx
│       ├── input.tsx
│       ├── item.tsx
│       ├── kbd.tsx
│       ├── label.tsx
│       ├── marker.tsx
│       ├── menubar.tsx
│       ├── message-scroller.tsx
│       ├── message.tsx
│       ├── native-select.tsx
│       ├── navigation-menu.tsx
│       ├── pagination.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── questionnaire.tsx
│       ├── radio-group.tsx
│       ├── resizable.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── slider.tsx
│       ├── sonner.tsx
│       ├── spinner.tsx
│       ├── switch.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── toggle-group.tsx
│       ├── toggle.tsx
│       └── tooltip.tsx
│
├── config/
│   └── app-config.ts                # Global app configuration
│
├── data/
│   └── users.ts                     # Static user seed / demo data
│
├── hooks/                           # Global React hooks
│   ├── use-lg.ts
│   └── use-mobile.ts
│
├── lib/                             # Utility & client libraries
│   ├── cookie.client.ts
│   ├── data-table-features.ts
│   ├── local-storage.client.ts
│   ├── utils.ts
│   ├── fonts/
│   │   └── registry.ts
│   └── preferences/
│       ├── layout.ts
│       ├── preference-runtime.ts
│       ├── preferences-config.ts
│       ├── preferences-storage.ts
│       ├── theme-utils.ts
│       └── theme.ts
│
├── navigation/
│   └── sidebar/
│       └── sidebar-items.ts         # Sidebar nav route definitions
│
├── scripts/                         # Build / codegen scripts
│   ├── generate-theme-presets.ts
│   └── theme-boot.tsx
│
├── server/
│   └── server-actions.ts            # Next.js Server Actions
│
├── stores/
│   └── preferences/
│       ├── preferences-provider.tsx
│       └── preferences-store.ts
│
└── styles/
    ├── flag-icons/
    │   └── flags.css
    └── presets/
        ├── brutalist.css
        ├── soft-pop.css
        └── tangerine.css
```

---

## Planned Additions (Phase 2–5)

```
src/
├── middleware.ts                        # Phase 2 — Route protection
├── lib/
│   ├── prisma.ts                        # Phase 1 — Prisma singleton
│   ├── gemini.ts                        # Phase 4 — Google Gen AI client
│   ├── credits.ts                       # Phase 3 — Credit deduction logic
│   └── supabase/
│       ├── client.ts                    # Phase 2 — Browser Supabase client
│       └── server.ts                    # Phase 2 — Server Supabase client
└── app/
    ├── api/
    │   ├── auth/
    │   │   └── callback/
    │   │       └── route.ts             # Phase 2 — OAuth callback
    │   └── ai/
    │       ├── chat/
    │       │   └── route.ts             # Phase 4 — Gemini streaming chat
    │       └── image/
    │           └── route.ts             # Phase 5 — Gemini image generation
    └── (main)/
        └── image-generator/
            ├── page.tsx                 # Phase 5 — Image Studio UI
            └── _components/
                ├── prompt-bar.tsx
                └── gallery-grid.tsx
```
