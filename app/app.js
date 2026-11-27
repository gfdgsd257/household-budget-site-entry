/* Hearth Ledger — app.
   Hash routing, page rendering and every control: add/edit/delete
   transactions, filters, editable budgets, savings-goal contributions,
   month switching. State lives in HearthData and localStorage. */

(function () {
  'use strict';

  var D = window.HearthData;
  var C = window.HearthCharts;
  var state = D.loadState();
  var view = document.getElementById('view');
  var monthLabel = document.getElementById('monthLabel');
  var savedNote = document.getElementById('savedNote');

  var AVAILABLE_MONTHS = (function () {
    var set = {};
    state.transactions.forEach(function (t) { set[D.monthKey(t.date)] = true; });
    return Object.keys(set).sort();
  })();
  var currentMonth = AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1];
  var txFilter = { category: 'all', type: 'all', search: '' };

  var ROUTES = ['dashboard', 'transactions', 'budgets', 'goals', 'reports'];

  /* ---------- helpers ---------- */

  function persist(note) {
    D.saveState(state);
    if (note) {
      savedNote.textContent = note;
      setTimeout(function () { savedNote.textContent = ''; }, 2600);
    }
  }

  function fmtDate(iso) {
    var p = iso.split('-');
    return D.MONTHS[Number(p[1]) - 1].slice(0, 3) + ' ' + Number(p[2]) + ', ' + p[0];
  }

  function route() {
    var hash = location.hash.replace(/^#\/?/, '').split('/')[0];
    return ROUTES.indexOf(hash) === -1 ? 'dashboard' : hash;
  }

  function setActiveNav(r) {
    document.querySelectorAll('.sidenav a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === r);
    });
  }

  function updateChrome() {
    monthLabel.textContent = D.monthLabel(currentMonth);
    var t = D.monthTotals(state, currentMonth);
    document.getElementById('navIncome').textContent = D.money(t.income);
    document.getElementById('navSpent').textContent = D.money(t.spent);
    var left = t.income - t.spent;
    var el = document.getElementById('navLeft');
    el.textContent = D.money(left);
    el.classList.toggle('good', left >= 0);
    el.classList.toggle('bad', left < 0);
    document.getElementById('prevMonth').disabled = currentMonth === AVAILABLE_MONTHS[0];
    document.getElementById('nextMonth').disabled = currentMonth === AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1];
  }

  function render() {
    var r = route();
    setActiveNav(r);
    updateChrome();
    if (r === 'dashboard') renderDashboard();
    else if (r === 'transactions') renderTransactions();
    else if (r === 'budgets') renderBudgets();
    else if (r === 'goals') renderGoals();
    else renderReports();
    window.scrollTo(0, 0);
  }

  function statCard(label, value, sub, tone) {
    return '<div class="card stat ' + (tone || '') + '">' +
      '<span class="stat-label">' + label + '</span>' +
      '<strong class="stat-value">' + value + '</strong>' +
      '<span class="stat-sub">' + sub + '</span></div>';
  }

  function txRow(t, showDate) {
    var cat = D.catById(t.category);
    var sign = t.type === 'income' ? '+' : '−';
    return '<tr>' +
      (showDate ? '<td class="tx-date">' + fmtDate(t.date) + '</td>' : '') +
      '<td><span class="cat-chip" style="--chip:' + cat.color + '">' + cat.icon + ' ' + D.esc(cat.name) + '</span></td>' +
      '<td class="tx-desc">' + D.esc(t.desc) + (t.note ? '<span class="tx-note">' + D.esc(t.note) + '</span>' : '') + '</td>' +
      '<td class="tx-amount ' + t.type + '">' + sign + D.money(t.amount) + '</td>' +
      '<td class="tx-actions">' +
        '<button type="button" class="mini-btn" data-action="edit-tx" data-id="' + t.id + '">Edit</button>' +
        '<button type="button" class="mini-btn danger" data-action="delete-tx" data-id="' + t.id + '">Delete</button>' +
      '</td></tr>';
  }

  /* ---------- Dashboard ---------- */

  function renderDashboard() {
    var t = D.monthTotals(state, currentMonth);
    var left = t.income - t.spent;
    var saved = Math.max(0, left);
    var rate = t.income > 0 ? Math.round(saved / t.income * 100) : 0;
    var cats = D.categoryTotals(state, currentMonth);
    var slices = D.CATEGORIES.filter(function (c) { return cats[c.id] > 0; })
      .map(function (c) { return { label: c.name, value: cats[c.id], color: c.color }; })
      .sort(function (a, b) { return b.value - a.value; });
    var topCat = slices.length ? slices[0] : null;

    var recent = state.transactions
      .filter(function (x) { return D.monthKey(x.date) === currentMonth; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); })
      .slice(0, 6);

    var alerts = D.CATEGORIES.filter(function (c) {
      return cats[c.id] > state.budgets[c.id];
    }).map(function (c) {
      return '<li><strong>' + D.esc(c.name) + '</strong> is ' + D.money(cats[c.id] - state.budgets[c.id]) +
        ' over budget (' + D.money(cats[c.id]) + ' of ' + D.money(state.budgets[c.id]) + ').</li>';
    }).join('');

    var donutSvg = C.donut(slices, 220, 34);
    var legend = '<ul class="legend">' + slices.map(function (s) {
      var pct = t.spent > 0 ? Math.round(s.value / t.spent * 100) : 0;
      return '<li><span class="dot" style="background:' + s.color + '"></span>' + D.esc(s.label) +
        '<strong>' + D.money(s.value) + '</strong><span class="pct">' + pct + '%</span></li>';
    }).join('') + '</ul>';

    view.innerHTML =
      '<section class="page-head"><h1>Good evening, Rivera family</h1>' +
      '<p>Here is how ' + D.monthLabel(currentMonth) + ' is shaping up — what came in, what went out, and what is left.</p></section>' +
      '<section class="stat-grid">' +
        statCard('Income', D.money(t.income), 'Paychecks and extra earnings') +
        statCard('Spending', D.money(t.spent), 'All household expenses', t.spent > t.income ? 'warn' : '') +
        statCard('Left to spend', D.money(left), left >= 0 ? 'On track for the month' : 'Over income this month', left >= 0 ? 'ok' : 'warn') +
        statCard('Savings rate', rate + '%', D.money(saved) + ' set aside so far', 'ok') +
      '</section>' +
      '<section class="grid-2">' +
        '<div class="card"><h2>Income vs spending</h2>' +
          '<p class="muted">Income is holding above spending this month. Biggest expense: ' +
          (topCat ? '<strong>' + D.esc(topCat.label) + ' — ' + D.money(topCat.value) + '</strong>' : 'none yet') + '.</p>' +
          '<div class="vs-bars">' +
            '<div class="vs-row"><span>Income</span><div class="bar"><div class="bar-fill" style="width:100%;background:#2f6f5e"></div></div><strong>' + D.money(t.income) + '</strong></div>' +
            '<div class="vs-row"><span>Spending</span><div class="bar"><div class="bar-fill" style="width:' + (t.income ? Math.min(100, t.spent / t.income * 100) : 0) + '%;background:#c26a3d"></div></div><strong>' + D.money(t.spent) + '</strong></div>' +
          '</div>' +
          (alerts ? '<div class="alert-box"><h3>⚠ Budget alerts</h3><ul>' + alerts + '</ul><a class="link" href="#/budgets">Review budgets →</a></div>'
                  : '<p class="all-ok">✓ Every category is inside its budget this month.</p>') +
        '</div>' +
        '<div class="card"><h2>Where the money went</h2><div id="donutSlot"></div>' + legend + '</div>' +
      '</section>' +
      '<section class="card"><div class="card-head"><h2>Recent transactions</h2><a class="link" href="#/transactions">See all →</a></div>' +
        '<div class="table-wrap"><table class="tx-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead>' +
        '<tbody>' + recent.map(function (x) { return txRow(x, true); }).join('') + '</tbody></table></div></section>';

    document.getElementById('donutSlot').appendChild(donutSvg);
  }

  /* ---------- Transactions ---------- */

  function filteredTx() {
    var q = txFilter.search.trim().toLowerCase();
    return state.transactions
      .filter(function (t) { return D.monthKey(t.date) === currentMonth; })
      .filter(function (t) { return txFilter.category === 'all' || t.category === txFilter.category; })
      .filter(function (t) { return txFilter.type === 'all' || t.type === txFilter.type; })
      .filter(function (t) {
        if (!q) return true;
        return (t.desc + ' ' + (t.note || '') + ' ' + D.catById(t.category).name).toLowerCase().indexOf(q) !== -1;
      })
      .sort(function (a, b) { return b.date.localeCompare(a.date) || b.id.localeCompare(a.id); });
  }

  function renderTransactions() {
    var list = filteredTx();
    var spent = list.filter(function (t) { return t.type === 'expense'; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var income = list.filter(function (t) { return t.type === 'income'; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var opts = D.CATEGORIES.map(function (c) {
      return '<option value="' + c.id + '"' + (txFilter.category === c.id ? ' selected' : '') + '>' + D.esc(c.name) + '</option>';
    }).join('');

    view.innerHTML =
      '<section class="page-head"><h1>Transactions</h1>' +
      '<p>Every dollar in and out for ' + D.monthLabel(currentMonth) + '. Add, edit or delete entries — totals everywhere update at once.</p></section>' +
      '<section class="filter-bar card">' +
        '<label>Category <select id="fCat"><option value="all">All categories</option>' + opts + '</select></label>' +
        '<label>Type <select id="fType">' +
          '<option value="all"' + (txFilter.type === 'all' ? ' selected' : '') + '>All</option>' +
          '<option value="expense"' + (txFilter.type === 'expense' ? ' selected' : '') + '>Expenses</option>' +
          '<option value="income"' + (txFilter.type === 'income' ? ' selected' : '') + '>Income</option></select></label>' +
        '<label class="grow">Search <input id="fSearch" type="search" placeholder="e.g. GreenMart, rent, piano…" value="' + D.esc(txFilter.search) + '"></label>' +
        '<button type="button" class="btn btn-primary" data-action="add-tx">+ Add transaction</button>' +
      '</section>' +
      '<section class="stat-grid small">' +
        statCard('Shown', list.length + ' entries', 'Matching your filters') +
        statCard('Income shown', D.money(income), 'In this list') +
        statCard('Spending shown', D.money(spent), 'In this list') +
      '</section>' +
      '<section class="card"><div class="table-wrap"><table class="tx-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead>' +
      '<tbody>' + (list.length ? list.map(function (t) { return txRow(t, true); }).join('') :
        '<tr><td colspan="5" class="empty">No transactions match these filters. Try clearing the search or choosing another category.</td></tr>') +
      '</tbody></table></div></section>';

    document.getElementById('fCat').addEventListener('change', function (e) { txFilter.category = e.target.value; renderTransactions(); });
    document.getElementById('fType').addEventListener('change', function (e) { txFilter.type = e.target.value; renderTransactions(); });
    document.getElementById('fSearch').addEventListener('input', function (e) { txFilter.search = e.target.value; renderTransactions(); });
    var si = document.getElementById('fSearch');
    si.focus(); si.setSelectionRange(si.value.length, si.value.length);
  }

  /* ---------- Budgets ---------- */

  function renderBudgets() {
    var cats = D.categoryTotals(state, currentMonth);
    var totalBudget = 0, totalSpent = 0;
    D.CATEGORIES.forEach(function (c) { totalBudget += state.budgets[c.id]; totalSpent += cats[c.id]; });
    var cards = D.CATEGORIES.map(function (c) {
      var spent = cats[c.id], limit = state.budgets[c.id];
      var pct = limit > 0 ? spent / limit * 100 : 0;
      var left = limit - spent;
      var status = pct > 100 ? '<span class="badge over">Over by ' + D.money(-left) + '</span>'
        : pct > 85 ? '<span class="badge near">Almost there</span>'
        : '<span class="badge ok">On track</span>';
      return '<article class="card budget-card">' +
        '<div class="card-head"><h2><span class="cat-ico" style="background:' + c.color + '">' + c.icon + '</span> ' + D.esc(c.name) + '</h2>' + status + '</div>' +
        '<p class="budget-figures"><strong>' + D.money(spent) + '</strong> of ' + D.money(limit) + ' <span class="muted">· ' + Math.round(pct) + '% used</span></p>' +
        C.progressBar(pct, c.color, c.name + ' budget ' + Math.round(pct) + ' percent used') +
        '<p class="muted">' + (left >= 0 ? D.money(left) + ' left this month' : D.money(-left) + ' over — trim next week or raise the limit') + '</p>' +
        '<form class="budget-edit" data-category="' + c.id + '">' +
          '<label>Monthly limit <input type="number" min="0" step="1" value="' + limit + '" required aria-label="' + D.esc(c.name) + ' monthly limit"></label>' +
          '<button type="submit" class="btn btn-small">Save limit</button>' +
        '</form></article>';
    }).join('');

    view.innerHTML =
      '<section class="page-head"><h1>Budgets for ' + D.monthLabel(currentMonth) + '</h1>' +
      '<p>Set a monthly limit for each category. Spending updates automatically from your transactions — change a limit any time and it is saved.</p></section>' +
      '<section class="stat-grid small">' +
        statCard('Total budgeted', D.money(totalBudget), 'Across all categories') +
        statCard('Total spent', D.money(totalSpent), Math.round(totalSpent / totalBudget * 100) + '% of the plan') +
        statCard('Remaining', D.money(totalBudget - totalSpent), 'Left in the plan') +
      '</section>' +
      '<section class="grid-2">' + cards + '</section>';

    view.querySelectorAll('.budget-edit').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var val = Number(form.querySelector('input').value);
        if (!isFinite(val) || val < 0) return;
        state.budgets[form.getAttribute('data-category')] = Math.round(val);
        persist('Budget saved ✓');
        renderBudgets();
      });
    });
  }

  /* ---------- Goals ---------- */

  function renderGoals() {
    var totalSaved = state.goals.reduce(function (s, g) { return s + g.saved; }, 0);
    var totalTarget = state.goals.reduce(function (s, g) { return s + g.target; }, 0);
    var cards = state.goals.map(function (g) {
      var pct = g.target > 0 ? g.saved / g.target * 100 : 0;
      return '<article class="card goal-card">' +
        '<div class="card-head"><h2>' + D.esc(g.name) + '</h2><span class="badge ' + (pct >= 100 ? 'ok' : '') + '">' + Math.round(pct) + '%</span></div>' +
        '<p class="muted">' + D.esc(g.note) + '</p>' +
        '<p class="budget-figures"><strong>' + D.money(g.saved) + '</strong> of ' + D.money(g.target) + ' <span class="muted">· ' + D.money(g.target - g.saved) + ' to go</span></p>' +
        C.progressBar(pct, '#2f6f5e', g.name + ' ' + Math.round(pct) + ' percent funded') +
        '<div class="goal-actions">' +
          '<button type="button" class="btn btn-small" data-action="add-funds" data-id="' + g.id + '">+ Add funds</button>' +
          '<button type="button" class="btn btn-small btn-ghost" data-action="delete-goal" data-id="' + g.id + '">Remove goal</button>' +
        '</div></article>';
    }).join('');

    view.innerHTML =
      '<section class="page-head"><h1>Goals &amp; savings</h1>' +
      '<p>What the family is saving for. Add money whenever there is some to spare — progress is saved automatically.</p></section>' +
      '<section class="stat-grid small">' +
        statCard('Saved so far', D.money(totalSaved), 'Across ' + state.goals.length + ' goals') +
        statCard('Combined target', D.money(totalTarget), Math.round(totalSaved / totalTarget * 100) + '% funded overall') +
        statCard('Still to save', D.money(totalTarget - totalSaved), 'Keep going — small amounts add up') +
      '</section>' +
      '<section class="grid-2">' + cards + '</section>' +
      '<section class="card"><h2>Start a new goal</h2>' +
      '<form id="newGoal" class="inline-form">' +
        '<label>Goal name <input name="name" type="text" placeholder="e.g. New washing machine" required maxlength="60"></label>' +
        '<label>Target amount ($) <input name="target" type="number" min="1" step="1" placeholder="1000" required></label>' +
        '<label>Already saved ($) <input name="saved" type="number" min="0" step="1" value="0"></label>' +
        '<button type="submit" class="btn btn-primary">Create goal</button>' +
      '</form></section>';

    document.getElementById('newGoal').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var name = f.name.value.trim();
      var target = Number(f.target.value);
      var saved = Number(f.saved.value) || 0;
      if (!name || !isFinite(target) || target <= 0) return;
      state.goals.push({ id: 'g' + (state.nextId++), name: name, target: Math.round(target), saved: Math.min(Math.round(saved), Math.round(target)), note: 'Added by the family.' });
      persist('Goal created ✓');
      renderGoals();
    });
  }

  /* ---------- Reports ---------- */

  function renderReports() {
    var trend = D.fullTrend(state);
    var cats = D.categoryTotals(state, currentMonth);
    var t = D.monthTotals(state, currentMonth);
    var top = D.CATEGORIES.map(function (c) { return { c: c, v: cats[c.id] }; })
      .filter(function (x) { return x.v > 0; })
      .sort(function (a, b) { return b.v - a.v; });
    var best = trend.reduce(function (b, m) { return (m.income - m.spent) > (b.income - b.spent) ? m : b; }, trend[0]);
    var avgSpent = Math.round(trend.reduce(function (s, m) { return s + m.spent; }, 0) / trend.length);
    var avgIncome = Math.round(trend.reduce(function (s, m) { return s + m.income; }, 0) / trend.length);

    var chartWrap = document.createElement('div');
    chartWrap.appendChild(C.trendBars(trend.map(function (m) {
      return { label: D.monthLabel(m.month).slice(0, 3), income: m.income, spent: m.spent };
    }), 720, 300));

    var catBars = top.map(function (x) {
      var pct = t.spent > 0 ? x.v / t.spent * 100 : 0;
      return '<div class="cat-bar-row"><span class="cat-bar-label">' + D.esc(x.c.name) + '</span>' +
        '<div class="bar"><div class="bar-fill" style="width:' + pct + '%;background:' + x.c.color + '"></div></div>' +
        '<strong>' + D.money(x.v) + '</strong><span class="pct">' + Math.round(pct) + '%</span></div>';
    }).join('');

    view.innerHTML =
      '<section class="page-head"><h1>Reports</h1>' +
      '<p>Six months of household money at a glance — trends, biggest categories, and what changed.</p></section>' +
      '<section class="stat-grid small">' +
        statCard('Average income', D.money(avgIncome), 'Per month, last 6 months') +
        statCard('Average spending', D.money(avgSpent), 'Per month, last 6 months') +
        statCard('Best month', D.monthLabel(best.month), 'Saved ' + D.money(best.income - best.spent) + ' that month') +
      '</section>' +
      '<section class="card"><h2>Income vs spending — last 6 months</h2>' +
        '<p class="legend-line"><span class="dot" style="background:#2f6f5e"></span> Income &nbsp; <span class="dot" style="background:#c26a3d"></span> Spending</p>' +
        '<div id="trendSlot"></div></section>' +
      '<section class="grid-2">' +
        '<div class="card"><h2>Spending by category — ' + D.monthLabel(currentMonth) + '</h2>' + catBars + '</div>' +
        '<div class="card"><h2>What the numbers say</h2><ul class="insights">' +
          '<li><strong>' + D.esc(top[0] ? top[0].c.name : '—') + '</strong> is the biggest expense this month at ' + D.money(top[0] ? top[0].v : 0) + ' — ' +
            (top[0] && top[0].c.id === 'housing' ? 'rent is fixed, so savings have to come from the other categories.' : 'worth a look if the family wants to cut back.') + '</li>' +
          '<li>Groceries run about ' + D.money(175) + ' a week. Planning meals before the shop is the easiest way to trim this.</li>' +
          '<li>Spending has stayed below income in all six months shown — the family saved ' + D.money(avgIncome - avgSpent) + ' a month on average.</li>' +
          '<li>November’s Thanksgiving shop added about ' + D.money(132) + ' to groceries; holiday months always run higher.</li>' +
        '</ul>' +
        '<button type="button" class="btn btn-ghost" data-action="reset-data">Reset demo data</button>' +
        '<p class="muted small-note">Restores the original November figures if you have edited or deleted entries.</p></div>' +
      '</section>';

    document.getElementById('trendSlot').appendChild(chartWrap.firstChild);
  }

  /* ---------- Modal forms ---------- */

  var modalRoot = document.getElementById('modalRoot');

  function openModal(html) {
    modalRoot.innerHTML = '<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true">' + html + '</div></div>';
    modalRoot.hidden = false;
    var first = modalRoot.querySelector('input, select, button');
    if (first) first.focus();
  }

  function closeModal() { modalRoot.hidden = true; modalRoot.innerHTML = ''; }

  function txForm(tx) {
    var isEdit = !!tx;
    var d = tx || { date: currentMonth + '-25', type: 'expense', desc: '', amount: '', category: 'groceries', note: '' };
    var catOpts = D.CATEGORIES.map(function (c) {
      return '<option value="' + c.id + '"' + (d.category === c.id ? ' selected' : '') + '>' + D.esc(c.name) + '</option>';
    }).join('');
    openModal(
      '<h2>' + (isEdit ? 'Edit transaction' : 'Add transaction') + '</h2>' +
      '<form id="txForm">' +
      '<label>Description <input name="desc" type="text" required maxlength="80" value="' + D.esc(d.desc) + '" placeholder="e.g. GreenMart weekly shop"></label>' +
      '<div class="form-row"><label>Amount ($) <input name="amount" type="number" min="0.01" step="0.01" required value="' + (d.amount === '' ? '' : d.amount) + '"></label>' +
      '<label>Date <input name="date" type="date" required value="' + D.esc(d.date) + '"></label></div>' +
      '<div class="form-row"><label>Type <select name="type">' +
        '<option value="expense"' + (d.type === 'expense' ? ' selected' : '') + '>Expense</option>' +
        '<option value="income"' + (d.type === 'income' ? ' selected' : '') + '>Income</option></select></label>' +
      '<label>Category <select name="category">' + catOpts + '</select></label></div>' +
      '<label>Note (optional) <input name="note" type="text" maxlength="120" value="' + D.esc(d.note || '') + '" placeholder="e.g. Weekly groceries"></label>' +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Save changes' : 'Add transaction') + '</button></div>' +
      '</form>');

    document.getElementById('txForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var amount = Number(f.amount.value);
      if (!f.desc.value.trim() || !isFinite(amount) || amount <= 0 || !f.date.value) return;
      if (isEdit) {
        tx.desc = f.desc.value.trim();
        tx.amount = Math.round(amount * 100) / 100;
        tx.date = f.date.value;
        tx.type = f.type.value;
        tx.category = f.category.value;
        tx.note = f.note.value.trim();
        persist('Transaction updated ✓');
      } else {
        state.transactions.push({
          id: 't' + (state.nextId++), date: f.date.value, type: f.type.value,
          desc: f.desc.value.trim(), amount: Math.round(amount * 100) / 100,
          category: f.category.value, note: f.note.value.trim()
        });
        persist('Transaction added ✓');
        var mk = D.monthKey(f.date.value);
        if (AVAILABLE_MONTHS.indexOf(mk) === -1) { AVAILABLE_MONTHS.push(mk); AVAILABLE_MONTHS.sort(); }
        currentMonth = mk;
      }
      closeModal();
      render();
    });
  }

  function fundsForm(goal) {
    openModal(
      '<h2>Add funds — ' + D.esc(goal.name) + '</h2>' +
      '<p class="muted">Saved so far: <strong>' + D.money(goal.saved) + '</strong> of ' + D.money(goal.target) + '.</p>' +
      '<form id="fundsForm"><label>Amount to add ($) <input name="amount" type="number" min="1" step="1" required placeholder="100"></label>' +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Add to goal</button></div></form>');
    document.getElementById('fundsForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var amt = Number(e.target.amount.value);
      if (!isFinite(amt) || amt <= 0) return;
      goal.saved = Math.min(goal.target, Math.round((goal.saved + amt) * 100) / 100);
      persist('Funds added ✓');
      closeModal();
      renderGoals();
    });
  }

  /* ---------- global events ---------- */

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    if (action === 'close-modal') {
      if (el.classList.contains('modal-backdrop')) {
        if (e.target === el) closeModal(); // only the backdrop itself, not clicks inside the dialog
      } else {
        closeModal();
      }
      return;
    }
    if (action === 'add-tx') { txForm(null); return; }
    if (action === 'edit-tx') {
      var tx = state.transactions.find(function (t) { return t.id === el.getAttribute('data-id'); });
      if (tx) txForm(tx);
      return;
    }
    if (action === 'delete-tx') {
      var id = el.getAttribute('data-id');
      var doomed = state.transactions.find(function (t) { return t.id === id; });
      if (doomed && window.confirm('Delete “' + doomed.desc + '” (' + D.money(doomed.amount) + ')?')) {
        state.transactions = state.transactions.filter(function (t) { return t.id !== id; });
        persist('Transaction deleted ✓');
        render();
      }
      return;
    }
    if (action === 'add-funds') {
      var goal = state.goals.find(function (g) { return g.id === el.getAttribute('data-id'); });
      if (goal) fundsForm(goal);
      return;
    }
    if (action === 'delete-goal') {
      var gid = el.getAttribute('data-id');
      var g = state.goals.find(function (x) { return x.id === gid; });
      if (g && window.confirm('Remove the goal “' + g.name + '”?')) {
        state.goals = state.goals.filter(function (x) { return x.id !== gid; });
        persist('Goal removed ✓');
        renderGoals();
      }
      return;
    }
    if (action === 'reset-data') {
      if (window.confirm('Reset all figures to the original demo data? Your edits will be lost.')) {
        state = D.seedState();
        D.saveState(state);
        persist('Demo data restored ✓');
        render();
      }
      return;
    }
  });

  document.getElementById('addQuick').addEventListener('click', function () { txForm(null); });
  document.getElementById('prevMonth').addEventListener('click', function () {
    var i = AVAILABLE_MONTHS.indexOf(currentMonth);
    if (i > 0) { currentMonth = AVAILABLE_MONTHS[i - 1]; render(); }
  });
  document.getElementById('nextMonth').addEventListener('click', function () {
    var i = AVAILABLE_MONTHS.indexOf(currentMonth);
    if (i < AVAILABLE_MONTHS.length - 1) { currentMonth = AVAILABLE_MONTHS[i + 1]; render(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modalRoot.hidden) closeModal();
  });

  window.addEventListener('hashchange', render);
  render();
})();
