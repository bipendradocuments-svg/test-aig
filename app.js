/* ==========================================================================
   Ledgerly — Personal Expense & Budget Tracker PWA Logic
   100% LocalStorage persistence + Offline PWA diagnostics
   ========================================================================== */

(function () {
  'use strict';

  const STORAGE_KEY = 'ledgerly_state_v1';

  const CURRENCIES = {
    USD: { symbol: '$', locale: 'en-US', decimals: 2 },
    EUR: { symbol: '€', locale: 'de-DE', decimals: 2 },
    GBP: { symbol: '£', locale: 'en-GB', decimals: 2 },
    INR: { symbol: '₹', locale: 'en-IN', decimals: 2 },
    JPY: { symbol: '¥', locale: 'ja-JP', decimals: 0 },
    CAD: { symbol: 'CA$', locale: 'en-CA', decimals: 2 },
  };

  const EXPENSE_CATEGORIES = [
    { id: 'groceries', name: 'Groceries', emoji: '🥬', defaultCap: 550 },
    { id: 'dining', name: 'Dining & Coffee', emoji: '☕', defaultCap: 320 },
    { id: 'housing', name: 'Housing', emoji: '🏡', defaultCap: 1200 },
    { id: 'transport', name: 'Transport', emoji: '🚇', defaultCap: 220 },
    { id: 'bills', name: 'Bills & Utils', emoji: '⚡', defaultCap: 260 },
    { id: 'shopping', name: 'Shopping', emoji: '🛍️', defaultCap: 250 },
    { id: 'health', name: 'Health', emoji: '🌿', defaultCap: 150 },
    { id: 'leisure', name: 'Leisure', emoji: '🎟️', defaultCap: 180 },
  ];

  const INCOME_CATEGORIES = [
    { id: 'salary', name: 'Salary', emoji: '💼' },
    { id: 'freelance', name: 'Side Income', emoji: '✨' },
    { id: 'refund', name: 'Refund / Gift', emoji: '🎁' },
    { id: 'investment', name: 'Dividends', emoji: '📈' },
  ];

  const ALL_CATEGORIES_MAP = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  // UI Runtime State
  let deferredInstallPrompt = null;
  let swStatusLabel = 'Registering...';
  let activeTab = 'ledger';
  let selectedCategoryFilter = 'all';
  let searchQuery = '';
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth(); // 0-indexed
  let editingTxId = null;
  let activeTxType = 'expense';
  let activeTxCategory = 'groceries';
  let editingBudgetTarget = 'overall'; // 'overall' or category id
  let lastDeletedTx = null;
  let toastTimer = null;

  // Helpers for Local Dates
  function toLocalDateStr(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function shiftDays(baseDate, daysDelta) {
    const copy = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    copy.setDate(copy.getDate() + daysDelta);
    return copy;
  }

  function makeId() {
    return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function buildSeedTransactions() {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const clampToCurrentMonth = (daysAgo) => {
      const candidate = shiftDays(now, -daysAgo);
      return candidate < firstOfMonth ? firstOfMonth : candidate;
    };

    return [
      {
        id: makeId(),
        type: 'income',
        category: 'salary',
        title: 'Monthly Payroll Deposit',
        note: 'Direct deposit',
        amount: 4250.00,
        date: toLocalDateStr(firstOfMonth),
        createdAt: Date.now() - 500000,
      },
      {
        id: makeId(),
        type: 'expense',
        category: 'housing',
        title: 'Apartment Rent Contribution',
        note: 'Monthly lease share',
        amount: 980.00,
        date: toLocalDateStr(firstOfMonth),
        createdAt: Date.now() - 400000,
      },
      {
        id: makeId(),
        type: 'expense',
        category: 'bills',
        title: 'Fiber Internet & Electric',
        note: 'Auto-pay utility bundle',
        amount: 124.50,
        date: toLocalDateStr(clampToCurrentMonth(4)),
        createdAt: Date.now() - 300000,
      },
      {
        id: makeId(),
        type: 'expense',
        category: 'groceries',
        title: 'Trader Joe’s Market',
        note: 'Weekly produce, olive oil & coffee beans',
        amount: 86.40,
        date: toLocalDateStr(clampToCurrentMonth(2)),
        createdAt: Date.now() - 200000,
      },
      {
        id: makeId(),
        type: 'expense',
        category: 'transport',
        title: 'Metro Transit Pass',
        note: 'Commuter reload',
        amount: 34.00,
        date: toLocalDateStr(clampToCurrentMonth(1)),
        createdAt: Date.now() - 120000,
      },
      {
        id: makeId(),
        type: 'expense',
        category: 'dining',
        title: 'Morning Pour-Over & Pastry',
        note: 'Corner roastery',
        amount: 11.75,
        date: toLocalDateStr(now),
        createdAt: Date.now() - 40000,
      },
    ];
  }

  function createDefaultState() {
    const categoryCaps = {};
    EXPENSE_CATEGORIES.forEach((c) => {
      categoryCaps[c.id] = c.defaultCap;
    });
    return {
      currency: 'USD',
      theme: 'auto',
      monthlyBudget: 2600,
      categoryCaps,
      transactions: buildSeedTransactions(),
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = createDefaultState();
        saveState(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      const defaults = createDefaultState();
      return {
        currency: CURRENCIES[parsed.currency] ? parsed.currency : defaults.currency,
        theme: ['auto', 'light', 'dark'].includes(parsed.theme) ? parsed.theme : 'auto',
        monthlyBudget: Number(parsed.monthlyBudget) > 0 ? Number(parsed.monthlyBudget) : defaults.monthlyBudget,
        categoryCaps: { ...defaults.categoryCaps, ...(parsed.categoryCaps || {}) },
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      };
    } catch (_err) {
      return createDefaultState();
    }
  }

  let state = loadState();

  function saveState(nextState = state) {
    state = nextState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_err) {
      showToast('Storage limit reached on device');
    }
    updateStorageDiagnostics();
  }

  // Formatting Helpers
  function formatMoney(amount, opts = {}) {
    const cfg = CURRENCIES[state.currency] || CURRENCIES.USD;
    const decimals = opts.compact ? 0 : cfg.decimals;
    const absVal = Math.abs(Number(amount) || 0);
    const formatted = new Intl.NumberFormat(cfg.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(absVal);
    const prefix = amount < 0 ? '-' : (opts.signPlus ? '+' : '');
    return `${prefix}${cfg.symbol}${formatted}`;
  }

  function getCurrencySymbol() {
    return (CURRENCIES[state.currency] || CURRENCIES.USD).symbol;
  }

  function hapticTick() {
    if (navigator.vibrate) {
      try { navigator.vibrate(10); } catch (_e) { /* ignore */ }
    }
  }

  // Theme Application
  function applyTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = state.theme === 'dark' || (state.theme === 'auto' && prefersDark);
    document.documentElement.setAttribute('data-theme', useDark ? 'dark' : 'light');

    const metaTheme = document.getElementById('meta-theme-color');
    if (metaTheme) {
      metaTheme.setAttribute('content', useDark ? '#0e1613' : '#113c29');
    }

    document.querySelectorAll('.seg-btn[data-theme-opt]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.themeOpt === state.theme);
    });
  }

  // Filter Transactions for Selected Month
  function getMonthTransactions(year = viewYear, month = viewMonth) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    return state.transactions
      .filter((tx) => typeof tx.date === 'string' && tx.date.startsWith(prefix))
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }

  // Render Header & Month Label
  function renderMonthBar() {
    const dt = new Date(viewYear, viewMonth, 1);
    const label = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('label-current-month').textContent = label;
  }

  // Render Ledger Hero & Transaction List
  function renderLedger() {
    const monthTxs = getMonthTransactions();
    let spent = 0;
    let income = 0;

    monthTxs.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') income += amt;
      else spent += amt;
    });

    const budget = state.monthlyBudget;
    const remaining = budget - spent;
    const pctUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0;

    const remainingLabelEl = document.getElementById('hero-remaining-label');
    const remainingAmtEl = document.getElementById('hero-remaining-amount');
    const pacePillEl = document.getElementById('hero-pace-pill');
    const spentTextEl = document.getElementById('hero-spent-text');
    const budgetValEl = document.getElementById('hero-budget-val');
    const progressFillEl = document.getElementById('hero-progress-fill');
    const progressBarEl = document.getElementById('hero-progressbar');
    const dailySafeEl = document.getElementById('hero-daily-safe-val');
    const incomeValEl = document.getElementById('hero-income-val');

    if (remaining >= 0) {
      remainingLabelEl.textContent = 'Remaining Monthly Budget';
      remainingAmtEl.textContent = formatMoney(remaining);
    } else {
      remainingLabelEl.textContent = 'Over Monthly Budget';
      remainingAmtEl.textContent = formatMoney(remaining);
    }

    pacePillEl.textContent = `${pctUsed}% used`;
    pacePillEl.classList.toggle('is-over', remaining < 0);

    spentTextEl.textContent = `${formatMoney(spent)} spent`;
    budgetValEl.textContent = formatMoney(budget, { compact: budget % 1 === 0 });

    const clampedPct = Math.min(100, Math.max(0, (spent / budget) * 100));
    progressFillEl.style.width = `${clampedPct.toFixed(1)}%`;
    progressFillEl.classList.remove('is-warn', 'is-danger');
    if (pctUsed >= 100) progressFillEl.classList.add('is-danger');
    else if (pctUsed >= 80) progressFillEl.classList.add('is-warn');
    progressBarEl.setAttribute('aria-valuenow', String(Math.min(100, pctUsed)));

    // Safe Daily Allowance calculation
    const now = new Date();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    let daysLeft = daysInMonth;
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) {
      daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
    }
    const safePerDay = remaining > 0 ? remaining / daysLeft : 0;
    dailySafeEl.textContent = `${formatMoney(safePerDay, { compact: safePerDay >= 100 })} / day`;
    incomeValEl.textContent = formatMoney(income);

    renderFilterChips();
    renderTransactionGroups(monthTxs);
  }

  function renderFilterChips() {
    const wrap = document.getElementById('category-filter-chips');
    const chips = [
      { id: 'all', label: 'All Entries' },
      ...EXPENSE_CATEGORIES.map((c) => ({ id: c.id, label: `${c.emoji} ${c.name}` })),
      { id: 'income_all', label: '💼 Income' },
    ];

    wrap.innerHTML = chips
      .map((chip) => {
        const active = selectedCategoryFilter === chip.id ? 'is-active' : '';
        return `<button type="button" class="chip-btn ${active}" data-chip="${chip.id}">${chip.label}</button>`;
      })
      .join('');
  }

  function formatDayHeading(dateStr) {
    const todayStr = toLocalDateStr(new Date());
    const yesterdayStr = toLocalDateStr(shiftDays(new Date(), -1));
    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderTransactionGroups(monthTxs) {
    const container = document.getElementById('transactions-container');
    const q = searchQuery.trim().toLowerCase();

    const filtered = monthTxs.filter((tx) => {
      if (selectedCategoryFilter === 'income_all' && tx.type !== 'income') return false;
      if (selectedCategoryFilter !== 'all' && selectedCategoryFilter !== 'income_all' && tx.category !== selectedCategoryFilter) {
        return false;
      }
      if (q) {
        const catObj = ALL_CATEGORIES_MAP[tx.category] || { name: tx.category };
        const haystack = `${tx.title} ${tx.note || ''} ${catObj.name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      const hasFilters = selectedCategoryFilter !== 'all' || q.length > 0;
      container.innerHTML = `
        <div class="empty-ledger">
          <div style="font-size: 1.7rem;" aria-hidden="true">${hasFilters ? '🔍' : '📒'}</div>
          <div class="empty-title">${hasFilters ? 'No matching entries' : 'No entries for this month yet'}</div>
          <p class="empty-desc">${
            hasFilters
              ? 'Try clearing your search or selecting All Entries.'
              : 'Tap the + button below to record an expense or income — saved instantly on your phone.'
          }</p>
          <button type="button" class="btn-primary-inline" id="btn-empty-cta">
            ${hasFilters ? 'Reset Filters' : '+ Add First Entry'}
          </button>
        </div>
      `;
      const cta = document.getElementById('btn-empty-cta');
      if (cta) {
        cta.addEventListener('click', () => {
          if (hasFilters) {
            selectedCategoryFilter = 'all';
            searchQuery = '';
            document.getElementById('input-search').value = '';
            document.getElementById('btn-clear-search').hidden = true;
            renderLedger();
          } else {
            openTransactionSheet();
          }
        });
      }
      return;
    }

    // Group by date
    const groups = [];
    const byDate = new Map();
    filtered.forEach((tx) => {
      if (!byDate.has(tx.date)) {
        const g = { date: tx.date, items: [], netExpense: 0 };
        byDate.set(tx.date, g);
        groups.push(g);
      }
      const grp = byDate.get(tx.date);
      grp.items.push(tx);
      if (tx.type === 'expense') grp.netExpense += Number(tx.amount) || 0;
    });

    container.innerHTML = groups
      .map((grp) => {
        const rowsHtml = grp.items
          .map((tx) => {
            const cat = ALL_CATEGORIES_MAP[tx.category] || { name: 'Other', emoji: '🧾' };
            const isIncome = tx.type === 'income';
            const amtFormatted = isIncome
              ? formatMoney(tx.amount, { signPlus: true })
              : `-${formatMoney(tx.amount)}`;
            const subtext = tx.note ? `${cat.name} · ${tx.note}` : cat.name;

            return `
              <button type="button" class="tx-row" data-tx-id="${escapeHtml(tx.id)}">
                <span class="tx-cat-badge" aria-hidden="true">${cat.emoji}</span>
                <span class="tx-info">
                  <span class="tx-title" style="display:block">${escapeHtml(tx.title)}</span>
                  <span class="tx-meta" style="display:block">${escapeHtml(subtext)}</span>
                </span>
                <span class="tx-amount tabular ${isIncome ? 'is-income' : ''}">${amtFormatted}</span>
              </button>
            `;
          })
          .join('');

        const daySummary = grp.netExpense > 0 ? `${formatMoney(grp.netExpense)} spent` : '';
        return `
          <div class="day-group">
            <div class="day-header">
              <span>${escapeHtml(formatDayHeading(grp.date))}</span>
              <span class="day-total tabular">${escapeHtml(daySummary)}</span>
            </div>
            <div class="tx-card-list">${rowsHtml}</div>
          </div>
        `;
      })
      .join('');
  }

  // Render Tab 2: Budgets & 7-Day Rhythm
  function renderBudgets() {
    // 1. 7-Day Rhythm (anchored to today)
    const today = new Date();
    const days = [];
    let maxDaySpend = 0;
    let weekTotal = 0;

    for (let i = 6; i >= 0; i--) {
      const d = shiftDays(today, -i);
      const dateStr = toLocalDateStr(d);
      const daySpend = state.transactions
        .filter((t) => t.type === 'expense' && t.date === dateStr)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      if (daySpend > maxDaySpend) maxDaySpend = daySpend;
      weekTotal += daySpend;
      days.push({
        dateStr,
        shortDay: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        spend: daySpend,
        isToday: i === 0,
      });
    }

    document.getElementById('rhythm-week-total').textContent = `${formatMoney(weekTotal)} spent over the past 7 days`;

    const barsWrap = document.getElementById('rhythm-chart-bars');
    barsWrap.innerHTML = days
      .map((d) => {
        const heightPct = maxDaySpend > 0 ? Math.max(5, Math.round((d.spend / maxDaySpend) * 100)) : 5;
        const valText = d.spend > 0 ? formatMoney(d.spend, { compact: d.spend >= 10 }) : '—';
        return `
          <div class="rhythm-col ${d.isToday ? 'is-today' : ''}">
            <span class="rhythm-val">${valText}</span>
            <div class="rhythm-bar-track">
              <div class="rhythm-bar-fill" style="height: ${d.spend > 0 ? heightPct : 4}%"></div>
            </div>
            <span class="rhythm-day">${d.isToday ? 'Today' : d.shortDay}</span>
          </div>
        `;
      })
      .join('');

    // 2. Category Caps for Selected Month
    const monthTxs = getMonthTransactions();
    const spendByCat = {};
    monthTxs.forEach((tx) => {
      if (tx.type === 'expense') {
        spendByCat[tx.category] = (spendByCat[tx.category] || 0) + (Number(tx.amount) || 0);
      }
    });

    const listEl = document.getElementById('category-budgets-list');
    listEl.innerHTML = EXPENSE_CATEGORIES.map((cat) => {
      const spent = spendByCat[cat.id] || 0;
      const cap = Number(state.categoryCaps[cat.id]) || cat.defaultCap;
      const pct = cap > 0 ? (spent / cap) * 100 : 0;
      const clamped = Math.min(100, pct);
      let toneClass = '';
      if (pct >= 100) toneClass = 'is-danger';
      else if (pct >= 80) toneClass = 'is-warn';

      return `
        <button type="button" class="budget-cat-item" data-edit-cat="${cat.id}">
          <div class="budget-cat-top">
            <span class="budget-cat-name">
              <span aria-hidden="true">${cat.emoji}</span>
              <span>${escapeHtml(cat.name)}</span>
            </span>
            <span class="budget-cat-figures">
              <strong>${formatMoney(spent)}</strong> / ${formatMoney(cap, { compact: cap % 1 === 0 })}
            </span>
          </div>
          <div class="cat-track">
            <div class="cat-fill ${toneClass}" style="width: ${clamped.toFixed(1)}%"></div>
          </div>
        </button>
      `;
    }).join('');
  }

  // Render Tab 3: Settings & PWA Diagnostics
  function updateStorageDiagnostics() {
    const el = document.getElementById('pwa-storage-used');
    if (!el) return;
    const raw = localStorage.getItem(STORAGE_KEY) || '';
    const bytes = new Blob([raw]).size;
    const kb = (bytes / 1024).toFixed(1);
    el.textContent = `${kb} KB (${state ? state.transactions.length : 0} items)`;
  }

  function updateNetworkAndPwaUI() {
    const online = navigator.onLine;
    const badge = document.getElementById('network-badge');
    const badgeText = document.getElementById('network-status-text');
    const netMetric = document.getElementById('pwa-network-state');
    const displayMetric = document.getElementById('pwa-display-mode');
    const swMetric = document.getElementById('pwa-sw-state');
    const headerInstallBtn = document.getElementById('btn-header-install');
    const settingsInstallLabel = document.getElementById('label-pwa-install-btn');

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    badge.classList.toggle('is-offline', !online);
    if (!online) {
      badgeText.textContent = 'Offline · Saved Locally';
      netMetric.textContent = 'Offline (Local)';
    } else {
      badgeText.textContent = isStandalone ? 'Installed PWA' : 'Local Storage Ready';
      netMetric.textContent = 'Online';
    }

    displayMetric.textContent = isStandalone ? 'Standalone App' : 'Mobile Browser';
    swMetric.textContent = swStatusLabel;

    if (isStandalone) {
      headerInstallBtn.hidden = true;
      settingsInstallLabel.textContent = 'Installed on Home Screen';
    } else if (deferredInstallPrompt) {
      headerInstallBtn.hidden = false;
      settingsInstallLabel.textContent = 'Install App Now';
    } else {
      // Show install guide chip on mobile touch devices so iOS Safari users can easily test Add to Home Screen
      const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
      headerInstallBtn.hidden = !isTouchDevice;
      settingsInstallLabel.textContent = 'How to Add to Home Screen';
    }
  }

  function renderAll() {
    renderMonthBar();
    renderLedger();
    renderBudgets();
    document.getElementById('select-currency').value = state.currency;
    updateStorageDiagnostics();
    updateNetworkAndPwaUI();
  }

  // Navigation
  function switchTab(target) {
    if (!['ledger', 'budgets', 'settings'].includes(target)) return;
    activeTab = target;
    document.querySelectorAll('.tab-panel').forEach((p) => {
      p.classList.toggle('is-active', p.dataset.panel === target);
    });
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.target === target);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Transaction Sheet Logic
  function renderSheetCategoryPicker() {
    const cats = activeTxType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!cats.some((c) => c.id === activeTxCategory)) {
      activeTxCategory = cats[0].id;
    }
    const grid = document.getElementById('tx-category-grid');
    grid.innerHTML = cats
      .map((c) => {
        const selected = c.id === activeTxCategory ? 'is-selected' : '';
        return `
          <button type="button" class="cat-pick-btn ${selected}" data-pick-cat="${c.id}">
            <span class="cat-emoji" aria-hidden="true">${c.emoji}</span>
            <span>${escapeHtml(c.name.split(' ')[0])}</span>
          </button>
        `;
      })
      .join('');
  }

  function setSheetTxType(type) {
    activeTxType = type === 'income' ? 'income' : 'expense';
    document.querySelectorAll('.type-opt-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.type === activeTxType);
    });
    renderSheetCategoryPicker();
  }

  function openTransactionSheet(txId = null) {
    hapticTick();
    editingTxId = txId;
    const sheet = document.getElementById('sheet-transaction');
    const titleEl = document.getElementById('sheet-tx-title');
    const amountInput = document.getElementById('input-tx-amount');
    const titleInput = document.getElementById('input-tx-title');
    const dateInput = document.getElementById('input-tx-date');
    const noteInput = document.getElementById('input-tx-note');
    const deleteBtn = document.getElementById('btn-delete-tx');
    const saveBtn = document.getElementById('btn-save-tx');

    document.getElementById('tx-currency-symbol').textContent = getCurrencySymbol();

    if (txId) {
      const existing = state.transactions.find((t) => t.id === txId);
      if (!existing) return;
      titleEl.textContent = 'Edit Entry';
      activeTxCategory = existing.category;
      setSheetTxType(existing.type);
      amountInput.value = existing.amount;
      titleInput.value = existing.title;
      dateInput.value = existing.date;
      noteInput.value = existing.note || '';
      deleteBtn.hidden = false;
      saveBtn.textContent = 'Update Entry';
    } else {
      titleEl.textContent = 'New Entry';
      activeTxCategory = 'groceries';
      setSheetTxType('expense');
      amountInput.value = '';
      titleInput.value = '';
      // Default date: today if viewing current month, otherwise 1st of viewed month
      const now = new Date();
      if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) {
        dateInput.value = toLocalDateStr(now);
      } else {
        dateInput.value = toLocalDateStr(new Date(viewYear, viewMonth, 1));
      }
      noteInput.value = '';
      deleteBtn.hidden = true;
      saveBtn.textContent = 'Save Entry';
    }

    sheet.classList.add('is-open');
    setTimeout(() => amountInput.focus(), 180);
  }

  function closeSheet(sheetId) {
    const el = document.getElementById(sheetId);
    if (el) el.classList.remove('is-open');
  }

  // Budget Edit Sheet Logic
  function openBudgetEditSheet(target = 'overall') {
    hapticTick();
    editingBudgetTarget = target;
    const titleEl = document.getElementById('sheet-budget-title');
    const helperEl = document.getElementById('budget-edit-helper');
    const inputEl = document.getElementById('input-budget-limit');

    document.getElementById('budget-currency-symbol').textContent = getCurrencySymbol();

    if (target === 'overall') {
      titleEl.textContent = 'Monthly Overall Budget';
      helperEl.textContent = 'Set your total monthly spending target across all categories.';
      inputEl.value = state.monthlyBudget;
    } else {
      const cat = ALL_CATEGORIES_MAP[target];
      if (!cat) return;
      titleEl.textContent = `${cat.emoji} ${cat.name} Cap`;
      helperEl.textContent = `Set your monthly target limit for ${cat.name}.`;
      inputEl.value = state.categoryCaps[target] || cat.defaultCap;
    }

    document.getElementById('sheet-budget-edit').classList.add('is-open');
    setTimeout(() => inputEl.select(), 180);
  }

  // Toast Notification
  function showToast(message, withUndo = false) {
    const banner = document.getElementById('toast-banner');
    const msgEl = document.getElementById('toast-message');
    const undoBtn = document.getElementById('btn-toast-undo');

    msgEl.textContent = message;
    undoBtn.hidden = !withUndo;
    banner.classList.add('is-visible');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      banner.classList.remove('is-visible');
    }, 3600);
  }

  // Export & Import Helpers
  function triggerDownload(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCsv() {
    const header = ['Date', 'Type', 'Category', 'Merchant/Title', 'Amount', 'Currency', 'Note'];
    const rows = state.transactions.map((tx) => {
      const cat = (ALL_CATEGORIES_MAP[tx.category] || { name: tx.category }).name;
      return [tx.date, tx.type, cat, tx.title, tx.amount, state.currency, tx.note || '']
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    triggerDownload(`ledgerly-export-${toLocalDateStr(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
    showToast('Exported CSV ledger');
  }

  function exportJson() {
    const payload = JSON.stringify(state, null, 2);
    triggerDownload(`ledgerly-backup-${toLocalDateStr(new Date())}.json`, payload, 'application/json');
    showToast('Saved JSON backup');
  }

  // Install / Share Triggers
  async function handleInstallAction() {
    hapticTick();
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        deferredInstallPrompt = null;
        showToast('Installing Ledgerly...');
      }
      updateNetworkAndPwaUI();
      return;
    }
    document.getElementById('sheet-install-guide').classList.add('is-open');
  }

  async function handleShareSummary() {
    const monthTxs = getMonthTransactions();
    const spent = monthTxs
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const dtLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const summaryText = `Ledgerly (${dtLabel}): ${formatMoney(spent)} spent of ${formatMoney(state.monthlyBudget)} monthly budget.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ledgerly Monthly Summary',
          text: summaryText,
          url: window.location.href,
        });
        return;
      } catch (_err) {
        return;
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(summaryText);
      showToast('Monthly summary copied to clipboard');
    }
  }

  // Service Worker Registration
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      swStatusLabel = 'Unsupported';
      updateNetworkAndPwaUI();
      return;
    }
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        swStatusLabel = reg.active ? 'Active · Offline Ready' : 'Caching Assets...';
        updateNetworkAndPwaUI();

        navigator.serviceWorker.ready.then(() => {
          swStatusLabel = 'Active · Offline Ready';
          updateNetworkAndPwaUI();
        });
      } catch (_err) {
        swStatusLabel = 'HTTPS Required';
        updateNetworkAndPwaUI();
      }
    });
  }

  // Event Listeners Wiring
  function bindEvents() {
    // Month Switcher
    document.getElementById('btn-prev-month').addEventListener('click', () => {
      hapticTick();
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      renderAll();
    });

    document.getElementById('btn-next-month').addEventListener('click', () => {
      hapticTick();
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      renderAll();
    });

    // Bottom Navigation
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        hapticTick();
        switchTab(btn.dataset.target);
      });
    });

    document.getElementById('btn-fab-add').addEventListener('click', () => openTransactionSheet());

    // Search & Category Filter Chips
    const searchInput = document.getElementById('input-search');
    const searchClear = document.getElementById('btn-clear-search');
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      searchClear.hidden = searchQuery.length === 0;
      renderLedger();
    });
    searchClear.addEventListener('click', () => {
      searchQuery = '';
      searchInput.value = '';
      searchClear.hidden = true;
      renderLedger();
    });

    document.getElementById('category-filter-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-chip]');
      if (!chip) return;
      hapticTick();
      selectedCategoryFilter = chip.dataset.chip;
      renderLedger();
    });

    // Tap Transaction Row to Edit
    document.getElementById('transactions-container').addEventListener('click', (e) => {
      const row = e.target.closest('[data-tx-id]');
      if (!row) return;
      openTransactionSheet(row.dataset.txId);
    });

    // Sheet Close Backdrops & Buttons
    ['sheet-transaction', 'sheet-budget-edit', 'sheet-install-guide'].forEach((id) => {
      const backdrop = document.getElementById(id);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeSheet(id);
      });
    });
    document.getElementById('btn-close-tx-sheet').addEventListener('click', () => closeSheet('sheet-transaction'));
    document.getElementById('btn-close-budget-sheet').addEventListener('click', () => closeSheet('sheet-budget-edit'));
    document.getElementById('btn-close-install-sheet').addEventListener('click', () => closeSheet('sheet-install-guide'));

    // Escape key closes open sheets
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['sheet-transaction', 'sheet-budget-edit', 'sheet-install-guide'].forEach(closeSheet);
      }
    });

    // Transaction Form Interactions
    document.querySelectorAll('.type-opt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        hapticTick();
        setSheetTxType(btn.dataset.type);
      });
    });

    document.getElementById('tx-category-grid').addEventListener('click', (e) => {
      const pick = e.target.closest('[data-pick-cat]');
      if (!pick) return;
      hapticTick();
      activeTxCategory = pick.dataset.pickCat;
      renderSheetCategoryPicker();
    });

    document.getElementById('form-transaction').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('input-tx-amount').value);
      const title = document.getElementById('input-tx-title').value.trim();
      const date = document.getElementById('input-tx-date').value;
      const note = document.getElementById('input-tx-note').value.trim();

      if (!amount || amount <= 0 || !title || !date) return;

      if (editingTxId) {
        state.transactions = state.transactions.map((tx) =>
          tx.id === editingTxId
            ? { ...tx, type: activeTxType, category: activeTxCategory, amount, title, date, note }
            : tx
        );
        showToast('Updated entry');
      } else {
        state.transactions.unshift({
          id: makeId(),
          type: activeTxType,
          category: activeTxCategory,
          amount,
          title,
          date,
          note,
          createdAt: Date.now(),
        });
        // Jump month view to the added entry's month so user sees it immediately
        const [y, m] = date.split('-').map(Number);
        viewYear = y;
        viewMonth = m - 1;
        showToast('Saved to device ledger');
      }

      hapticTick();
      saveState();
      closeSheet('sheet-transaction');
      renderAll();
    });

    // Delete Entry with Undo
    document.getElementById('btn-delete-tx').addEventListener('click', () => {
      if (!editingTxId) return;
      const found = state.transactions.find((t) => t.id === editingTxId);
      if (!found) return;
      lastDeletedTx = found;
      state.transactions = state.transactions.filter((t) => t.id !== editingTxId);
      hapticTick();
      saveState();
      closeSheet('sheet-transaction');
      renderAll();
      showToast('Entry deleted', true);
    });

    document.getElementById('btn-toast-undo').addEventListener('click', () => {
      if (!lastDeletedTx) return;
      state.transactions.push(lastDeletedTx);
      lastDeletedTx = null;
      saveState();
      renderAll();
      document.getElementById('toast-banner').classList.remove('is-visible');
      showToast('Restored entry');
    });

    // Budget Edit Triggers
    document.getElementById('hero-budget-btn').addEventListener('click', () => openBudgetEditSheet('overall'));
    document.getElementById('btn-edit-monthly-budget').addEventListener('click', () => openBudgetEditSheet('overall'));
    document.getElementById('category-budgets-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-edit-cat]');
      if (!btn) return;
      openBudgetEditSheet(btn.dataset.editCat);
    });

    document.getElementById('form-budget-edit').addEventListener('submit', (e) => {
      e.preventDefault();
      const val = parseFloat(document.getElementById('input-budget-limit').value);
      if (!val || val <= 0) return;

      if (editingBudgetTarget === 'overall') {
        state.monthlyBudget = val;
        showToast('Updated monthly budget');
      } else {
        state.categoryCaps[editingBudgetTarget] = val;
        showToast('Updated category cap');
      }
      saveState();
      closeSheet('sheet-budget-edit');
      renderAll();
    });

    // Settings Controls
    document.getElementById('select-currency').addEventListener('change', (e) => {
      state.currency = e.target.value;
      saveState();
      renderAll();
      showToast(`Currency set to ${state.currency}`);
    });

    document.querySelectorAll('.seg-btn[data-theme-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.theme = btn.dataset.themeOpt;
        saveState();
        applyTheme();
      });
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (state.theme === 'auto') applyTheme();
    });

    document.getElementById('btn-export-csv').addEventListener('click', exportCsv);
    document.getElementById('btn-export-json').addEventListener('click', exportJson);

    const importInput = document.getElementById('input-import-file');
    document.getElementById('btn-import-json').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (!Array.isArray(parsed.transactions)) throw new Error('Invalid backup');
          saveState({
            ...state,
            currency: CURRENCIES[parsed.currency] ? parsed.currency : state.currency,
            monthlyBudget: Number(parsed.monthlyBudget) > 0 ? Number(parsed.monthlyBudget) : state.monthlyBudget,
            categoryCaps: { ...state.categoryCaps, ...(parsed.categoryCaps || {}) },
            transactions: parsed.transactions,
          });
          renderAll();
          showToast(`Imported ${parsed.transactions.length} entries`);
        } catch (_err) {
          showToast('Invalid JSON backup file');
        }
        importInput.value = '';
      };
      reader.readAsText(file);
    });

    document.getElementById('btn-reset-demo').addEventListener('click', () => {
      const now = new Date();
      viewYear = now.getFullYear();
      viewMonth = now.getMonth();
      state.transactions = buildSeedTransactions();
      saveState();
      renderAll();
      switchTab('ledger');
      showToast('Loaded sample transactions');
    });

    document.getElementById('btn-clear-all').addEventListener('click', () => {
      if (state.transactions.length === 0) {
        showToast('Ledger is already empty');
        return;
      }
      if (!window.confirm('Clear all transactions stored on this device?')) return;
      state.transactions = [];
      saveState();
      renderAll();
      showToast('Cleared all transactions');
    });

    // PWA Install & Network Events
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      updateNetworkAndPwaUI();
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      updateNetworkAndPwaUI();
      showToast('Ledgerly installed on your Home Screen');
    });

    window.addEventListener('online', () => {
      updateNetworkAndPwaUI();
      showToast('Back online');
    });
    window.addEventListener('offline', () => {
      updateNetworkAndPwaUI();
      showToast('Offline mode · All changes saved locally');
    });

    document.getElementById('btn-header-install').addEventListener('click', handleInstallAction);
    document.getElementById('btn-pwa-install-action').addEventListener('click', handleInstallAction);
    document.getElementById('btn-pwa-share').addEventListener('click', handleShareSummary);
  }

  // Handle Manifest Shortcut Query Params (?action=add or ?tab=budgets)
  function handleShortcutParams() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'budgets' || tab === 'settings') {
      switchTab(tab);
    }
    if (params.get('action') === 'add') {
      setTimeout(() => openTransactionSheet(), 120);
    }
  }

  // Bootstrap
  applyTheme();
  bindEvents();
  renderAll();
  registerServiceWorker();
  handleShortcutParams();
})();
