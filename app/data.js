/* Hearth Ledger — data layer.
   Owns the household's figures: seed transactions, monthly budgets,
   savings goals and trend history, plus loading/saving to localStorage
   and the small helpers the rest of the app uses. No network calls. */

(function () {
  'use strict';

  var STORE_KEY = 'hearth-ledger-v1';

  var CATEGORIES = [
    { id: 'housing',     name: 'Housing',     color: '#2f6f5e', icon: '⌂' },
    { id: 'groceries',   name: 'Groceries',   color: '#3e8e5a', icon: '❋' },
    { id: 'utilities',   name: 'Utilities',   color: '#4a7fa5', icon: '⚡' },
    { id: 'transport',   name: 'Transport',   color: '#8a6d3b', icon: '➤' },
    { id: 'dining',      name: 'Dining out',  color: '#c26a3d', icon: '◐' },
    { id: 'entertain',   name: 'Entertainment', color: '#7a5ea8', icon: '♪' },
    { id: 'health',      name: 'Health',      color: '#b0486e', icon: '+' },
    { id: 'kids',        name: 'Kids & school', color: '#4f8f8a', icon: '✎' },
    { id: 'shopping',    name: 'Shopping',    color: '#5b7bc0', icon: '▣' },
    { id: 'other',       name: 'Other',       color: '#8a8a8a', icon: '•' }
  ];

  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  /* Realistic seed transactions for the Rivera household (2 adults, 2 kids).
     Amounts are in dollars; type 'expense' or 'income'. */
  function seedTransactions() {
    var rows = [
      // ---- November 2026 ----
      ['2026-11-01', 'income',   'Paycheck — Maya Rivera (teaching)',  2140.00, 'other', 'First half-month pay'],
      ['2026-11-01', 'expense',  'Maple Street rent',                 1450.00, 'housing', 'Monthly rent'],
      ['2026-11-02', 'expense',  'GreenMart weekly shop',             186.40, 'groceries', 'Weekly groceries'],
      ['2026-11-02', 'expense',  'City power & light',                 96.20, 'utilities', 'Electric bill'],
      ['2026-11-03', 'expense',  'Bus passes — family',                84.00, 'transport', 'Monthly bus passes'],
      ['2026-11-04', 'expense',  'Corner Bakery lunch',                23.50, 'dining', 'Lunch with coworkers'],
      ['2026-11-05', 'expense',  'Pharmacy — flu shots',               58.00, 'health', 'Flu shots for two'],
      ['2026-11-06', 'expense',  'GreenMart weekly shop',             172.85, 'groceries', 'Weekly groceries'],
      ['2026-11-07', 'expense',  'Cinema night — family of four',     52.00, 'entertain', 'Saturday movie'],
      ['2026-11-08', 'expense',  'Gas — family car',                   45.30, 'transport', 'Fuel'],
      ['2026-11-09', 'expense',  'School lunch money — Leo',           40.00, 'kids', 'School lunches'],
      ['2026-11-10', 'expense',  'Internet & phone',                  112.00, 'utilities', 'Monthly bundle'],
      ['2026-11-11', 'expense',  'Bookshop — Sofia reading list',      31.75, 'kids', 'School books'],
      ['2026-11-12', 'expense',  'Pizza night',                        38.90, 'dining', 'Friday takeaway'],
      ['2026-11-13', 'expense',  'GreenMart weekly shop',             198.10, 'groceries', 'Weekly groceries'],
      ['2026-11-14', 'expense',  'Kids winter coats',                 129.00, 'shopping', 'Coats for Leo and Sofia'],
      ['2026-11-15', 'income',   'Paycheck — Daniel Rivera (repairs)', 1985.00, 'other', 'First half-month pay'],
      ['2026-11-15', 'expense',  'Water bill',                         54.60, 'utilities', 'Water & sewer'],
      ['2026-11-16', 'expense',  'Dentist — Sofia checkup',            75.00, 'health', 'Six-month checkup'],
      ['2026-11-17', 'expense',  'GreenMart weekly shop',             164.55, 'groceries', 'Weekly groceries'],
      ['2026-11-18', 'expense',  'Train tickets — visit to Grandma',   62.00, 'transport', 'Weekend trip'],
      ['2026-11-19', 'expense',  'Riverside Café — dinner',            74.20, 'dining', 'Anniversary dinner'],
      ['2026-11-20', 'expense',  'Streaming & music',                  24.98, 'entertain', 'Monthly subscriptions'],
      ['2026-11-21', 'expense',  'GreenMart weekly shop',             179.30, 'groceries', 'Weekly groceries'],
      ['2026-11-22', 'expense',  'Sofia piano lesson',                 60.00, 'kids', 'Monthly lesson'],
      ['2026-11-23', 'expense',  'Hardware store — faucet repair',     42.15, 'housing', 'Bathroom faucet'],
      ['2026-11-24', 'expense',  'Thanksgiving groceries',            132.40, 'groceries', 'Holiday cooking'],
      ['2026-11-25', 'expense',  'Pharmacy — Leo inhaler refill',      28.50, 'health', 'Prescription refill'],
      // ---- October 2026 ----
      ['2026-10-01', 'income',   'Paycheck — Maya Rivera (teaching)',  2140.00, 'other', 'First half-month pay'],
      ['2026-10-01', 'expense',  'Maple Street rent',                 1450.00, 'housing', 'Monthly rent'],
      ['2026-10-03', 'expense',  'GreenMart weekly shop',             178.20, 'groceries', 'Weekly groceries'],
      ['2026-10-05', 'expense',  'City power & light',                 88.40, 'utilities', 'Electric bill'],
      ['2026-10-07', 'expense',  'Bus passes — family',                84.00, 'transport', 'Monthly bus passes'],
      ['2026-10-09', 'expense',  'GreenMart weekly shop',             165.75, 'groceries', 'Weekly groceries'],
      ['2026-10-10', 'expense',  'Internet & phone',                  112.00, 'utilities', 'Monthly bundle'],
      ['2026-10-12', 'expense',  'School supplies — fall term',        86.50, 'kids', 'Notebooks and pens'],
      ['2026-10-14', 'expense',  'Pizza night',                        36.40, 'dining', 'Friday takeaway'],
      ['2026-10-15', 'income',   'Paycheck — Daniel Rivera (repairs)', 1985.00, 'other', 'First half-month pay'],
      ['2026-10-16', 'expense',  'GreenMart weekly shop',             191.60, 'groceries', 'Weekly groceries'],
      ['2026-10-17', 'expense',  'Gas — family car',                   48.10, 'transport', 'Fuel'],
      ['2026-10-18', 'expense',  'Dentist — Leo checkup',              75.00, 'health', 'Six-month checkup'],
      ['2026-10-20', 'expense',  'Riverside Café — dinner',            68.50, 'dining', 'Dinner out'],
      ['2026-10-21', 'expense',  'GreenMart weekly shop',             171.90, 'groceries', 'Weekly groceries'],
      ['2026-10-23', 'expense',  'Streaming & music',                  24.98, 'entertain', 'Monthly subscriptions'],
      ['2026-10-24', 'expense',  'Sofia piano lesson',                 60.00, 'kids', 'Monthly lesson'],
      ['2026-10-25', 'expense',  'Autumn jackets — sale',             98.00, 'shopping', 'Two jackets'],
      ['2026-10-27', 'expense',  'GreenMart weekly shop',             158.30, 'groceries', 'Weekly groceries'],
      ['2026-10-28', 'expense',  'Pharmacy — vitamins',               22.40, 'health', 'Vitamins'],
      ['2026-10-30', 'income',   'Tutoring — Maya (evenings)',         240.00, 'other', 'Extra tutoring'],
      // ---- September 2026 ----
      ['2026-09-01', 'income',   'Paycheck — Maya Rivera (teaching)',  2140.00, 'other', 'First half-month pay'],
      ['2026-09-01', 'expense',  'Maple Street rent',                 1450.00, 'housing', 'Monthly rent'],
      ['2026-09-04', 'expense',  'GreenMart weekly shop',             169.80, 'groceries', 'Weekly groceries'],
      ['2026-09-05', 'expense',  'City power & light',                 92.10, 'utilities', 'Electric bill'],
      ['2026-09-08', 'expense',  'Bus passes — family',                84.00, 'transport', 'Monthly bus passes'],
      ['2026-09-10', 'expense',  'Internet & phone',                  112.00, 'utilities', 'Monthly bundle'],
      ['2026-09-11', 'expense',  'GreenMart weekly shop',             174.25, 'groceries', 'Weekly groceries'],
      ['2026-09-13', 'expense',  'Back-to-school clothes',            142.00, 'shopping', 'School clothes'],
      ['2026-09-15', 'income',   'Paycheck — Daniel Rivera (repairs)', 1985.00, 'other', 'First half-month pay'],
      ['2026-09-16', 'expense',  'GreenMart weekly shop',             183.45, 'groceries', 'Weekly groceries'],
      ['2026-09-18', 'expense',  'School lunch money — Leo',           40.00, 'kids', 'School lunches'],
      ['2026-09-20', 'expense',  'Riverside Café — dinner',            61.30, 'dining', 'Dinner out'],
      ['2026-09-22', 'expense',  'Sofia piano lesson',                 60.00, 'kids', 'Monthly lesson'],
      ['2026-09-23', 'expense',  'GreenMart weekly shop',             159.60, 'groceries', 'Weekly groceries'],
      ['2026-09-25', 'expense',  'Gas — family car',                   46.75, 'transport', 'Fuel'],
      ['2026-09-27', 'expense',  'Streaming & music',                  24.98, 'entertain', 'Monthly subscriptions'],
      ['2026-09-29', 'expense',  'Pharmacy — cold medicine',           19.80, 'health', 'Cold medicine']
    ];
    return rows.map(function (r, i) {
      return { id: 't' + (i + 1), date: r[0], type: r[1], desc: r[2], amount: r[3], category: r[4], note: r[5] };
    });
  }

  function seedBudgets() {
    return {
      housing: 1550, groceries: 850, utilities: 280, transport: 220,
      dining: 180, entertain: 120, health: 200, kids: 220, shopping: 200, other: 100
    };
  }

  function seedGoals() {
    return [
      { id: 'g1', name: 'Emergency fund', target: 6000, saved: 4250, note: 'Six months of essentials, one step at a time.' },
      { id: 'g2', name: 'Summer trip to the coast', target: 1800, saved: 640, note: 'A week by the sea for all four of us.' },
      { id: 'g3', name: 'New family car', target: 9000, saved: 2100, note: 'Replace the old sedan next spring.' },
      { id: 'g4', name: 'Sofia’s college starter', target: 3000, saved: 950, note: 'A small head start, added to monthly.' }
    ];
  }

  /* Monthly totals for the six months before the detailed records, so the
     Reports trend chart has a full half-year to show. */
  function seedTrend() {
    return [
      { month: '2026-06', income: 4125, spent: 3280 },
      { month: '2026-07', income: 4125, spent: 3415 },
      { month: '2026-08', income: 4365, spent: 3590 }
    ];
  }

  function seedState() {
    return {
      transactions: seedTransactions(),
      budgets: seedBudgets(),
      goals: seedGoals(),
      trend: seedTrend(),
      nextId: 1000
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.transactions) && parsed.budgets && Array.isArray(parsed.goals)) return parsed;
      }
    } catch (e) { /* corrupted storage: fall through to seed */ }
    var fresh = seedState();
    saveState(fresh);
    return fresh;
  }

  function saveState(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
  }

  function monthKey(dateStr) { return dateStr.slice(0, 7); }

  function monthLabel(key) {
    var parts = key.split('-');
    return MONTHS[Number(parts[1]) - 1] + ' ' + parts[0];
  }

  function money(n) {
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(n);
    return sign + '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function moneyShort(n) {
    if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return money(n);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function catById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return CATEGORIES[CATEGORIES.length - 1];
  }

  function monthTotals(state, key) {
    var income = 0, spent = 0;
    state.transactions.forEach(function (t) {
      if (monthKey(t.date) !== key) return;
      if (t.type === 'income') income += t.amount; else spent += t.amount;
    });
    return { income: income, spent: spent };
  }

  function categoryTotals(state, key) {
    var out = {};
    CATEGORIES.forEach(function (c) { out[c.id] = 0; });
    state.transactions.forEach(function (t) {
      if (t.type !== 'expense') return;
      if (monthKey(t.date) !== key) return;
      out[t.category] = (out[t.category] || 0) + t.amount;
    });
    return out;
  }

  function fullTrend(state) {
    var months = {};
    state.trend.forEach(function (t) { months[t.month] = { income: t.income, spent: t.spent }; });
    state.transactions.forEach(function (t) {
      var k = monthKey(t.date);
      if (!months[k]) months[k] = { income: 0, spent: 0 };
      if (t.type === 'income') months[k].income += t.amount; else months[k].spent += t.amount;
    });
    return Object.keys(months).sort().map(function (k) {
      return { month: k, income: Math.round(months[k].income * 100) / 100, spent: Math.round(months[k].spent * 100) / 100 };
    });
  }

  window.HearthData = {
    CATEGORIES: CATEGORIES,
    MONTHS: MONTHS,
    loadState: loadState,
    saveState: saveState,
    seedState: seedState,
    monthKey: monthKey,
    monthLabel: monthLabel,
    money: money,
    moneyShort: moneyShort,
    esc: esc,
    catById: catById,
    monthTotals: monthTotals,
    categoryTotals: categoryTotals,
    fullTrend: fullTrend
  };
})();
