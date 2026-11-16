# My Expenses

A modern, minimal, mobile-first personal expense tracking Progressive Web App (PWA) built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **shadcn/ui** primitives, **Dexie.js** (IndexedDB), **Recharts**, **Lucide Icons**, and **vite-plugin-pwa**.

All user data is stored 100% locally in your browser's **IndexedDB**—no account, login, cloud sync, or backend required.

## Live HTTPS URL (iPhone & Mobile Ready)

**https://bipendradocuments-svg.github.io/test-aig/**

---

## Features

- **Dashboard**: Dynamic spending totals in Indian Rupees (`₹` with `en-IN` formatting), unique tag count, All / Week / Month / Year period filters, signature neon-lime **Spending by Category** vertical capsule chart, recent expenses, and quick **Add Expense** action.
- **Fast Manual Expense Entry**: Record expenses in seconds with integer-paise precision (`amountPaise`), optional description, optional user-created tag (with inline tag creation), and local calendar date (`YYYY-MM-DD`, defaulting to today).
- **Transactions History**: Reverse-chronological expense list with instant search, tag filtering, date filters (`Today`, `This week`, `This month`, `This year`, and `Custom` date range), editing, and confirmed deletion.
- **Custom Tag Management**: Create, rename, and delete tags with case-insensitive duplicate protection. Deleting a tag safely reassigns its expenses to `Uncategorized` inside an IndexedDB transaction without deleting any expense records.
- **Insights & Spending Analytics**: Weekly (Mon–Sun), Monthly, and Yearly spending summaries with an interactive Recharts bar chart and tag-by-tag percentage breakdown.
- **Offline-Capable iPhone PWA**: Configured with `vite-plugin-pwa`, standalone Web App Manifest, Apple Touch Icon (`180x180`), `192x192` / `512x512` / maskable icons, and Workbox Service Worker caching.

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the local Vite development server
npm run dev

# 3. Run automated unit & IndexedDB tests
npm test

# 4. Run linter
npm run lint
```

---

## Building & Deploying

```bash
# Type-check with TypeScript and build the production PWA bundle into dist/
npm run build

# Preview the production PWA locally
npm run preview
```

To deploy to static HTTPS hosting (GitHub Pages, Cloudflare Pages, Netlify, or Vercel):
- Serve the generated `dist/` folder over **HTTPS** (`vite.config.ts` uses `base: './'` and `HashRouter` so subpath deployments such as `/test-aig/` work out of the box without 404s).

---

## Installing on iPhone (iOS Safari)

1. Open the HTTPS URL (`https://bipendradocuments-svg.github.io/test-aig/`) in **Safari** on your iPhone.
2. Tap the **Share** button (square with upward arrow) in Safari's bottom bar.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name (**My Expenses**) and tap **Add**.
5. Launch **My Expenses** from your Home Screen—it opens full-screen without browser chrome and works offline.

---

## Known Limitations

- **Device-Specific Storage**: Because all data lives locally inside browser IndexedDB without a cloud backend, expenses recorded in Safari on your iPhone are separate from desktop browsers (and separate between Safari tab storage and isolated iOS Home Screen storage on older iOS versions). Use **Settings -> Backup JSON / Import JSON** to move data across browsers or devices manually.
- **Clearing Browser Website Data**: Clearing Website Data in iOS Settings for Safari/Home Screen Web Apps will erase local IndexedDB storage unless backed up first via **Settings -> Backup JSON**.
