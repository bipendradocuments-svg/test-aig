# Ledgerly — Personal Expense & Budget Tracker PWA

Offline-first Progressive Web App (PWA) for tracking daily expenses, income, monthly spending pace, and per-category budget caps using device `localStorage`.

## Live Mobile URL

Open on your iPhone (Safari) or Android phone (Chrome / Edge):

**https://bipendradocuments-svg.github.io/test-aig/**

## Testing PWA Features on Mobile

1. **Install to Home Screen**
   - **Android (Chrome / Edge):** Tap the **Install** button in the top bar (or open **Settings -> Install App Now**).
   - **iOS (Safari):** Tap **Share** in Safari's toolbar -> **Add to Home Screen** -> **Add**.
2. **Verify Standalone App Launch**
   - Open **Ledgerly** from your phone's Home Screen. Under **Settings -> Mobile PWA Status**, **Launch Mode** will switch to `Standalone App`.
3. **Test Offline Persistence**
   - Enable **Airplane Mode** on your phone, reload or reopen the app, and add or edit transactions. All changes persist locally in `localStorage` while the Service Worker (`sw.js`) serves the cached app shell and fonts offline.
4. **Backup & Export**
   - Export your ledger to **CSV** or **JSON** anytime from the **Settings** tab.
