// ─── Storage Keys ─────────────────────────────
const STORAGE_KEY_TX    = 'hematno_data';
const STORAGE_KEY_LIMIT = 'hematno_limit';

// ─── State ────────────────────────────────────
let transactions     = [];
let limits           = { daily: null, weekly: null, monthly: null };
let currentType      = 'income';
let selectedCategory = null;

// ─── Categories ───────────────────────────────
const INCOME_CATEGORIES = [
  { id: 'allowance', label: 'Uang Saku',   emoji: '💵' },
  { id: 'transfer',  label: 'Transfer',    emoji: '📲' },
  { id: 'bonus',     label: 'Bonus',       emoji: '🎁' },
  { id: 'other_in',  label: 'Lain-lain',   emoji: '➕' },
];

const EXPENSE_CATEGORIES = [
  { id: 'transport', label: 'Transportasi', emoji: '🚍' },
  { id: 'food',      label: 'Makan Siang',  emoji: '🍱' },
  { id: 'print',     label: 'Print / ATK',  emoji: '🖨️' },
  { id: 'kost',      label: 'Kost',         emoji: '🏠' },
  { id: 'fuel',      label: 'Bensin',       emoji: '⛽' },
  { id: 'other_out', label: 'Lain-lain',    emoji: '💸' },
];

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

function getCategoryLabel(id) {
  const c = ALL_CATEGORIES.find(c => c.id === id);
  return c ? `${c.emoji} ${c.label}` : id;
}

// ═══════════════════════════════════════════════
// LOCALSTORAGE — SIMPAN & MUAT
// ═══════════════════════════════════════════════

/**
 * Simpan state terkini (transactions & limits) ke LocalStorage.
 * Dipanggil setiap kali ada perubahan data.
 */
function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY_TX,    JSON.stringify(transactions));
  localStorage.setItem(STORAGE_KEY_LIMIT, JSON.stringify(limits));
}

/**
 * Muat data dari LocalStorage ke state saat halaman selesai dimuat.
 * Dipanggil via event DOMContentLoaded.
 */
function loadFromLocalStorage() {
  const rawTx    = localStorage.getItem(STORAGE_KEY_TX);
  const rawLimit = localStorage.getItem(STORAGE_KEY_LIMIT);

  transactions = rawTx    ? JSON.parse(rawTx)    : [];
  limits       = rawLimit ? JSON.parse(rawLimit) : { daily: null, weekly: null, monthly: null };
}

// ═══════════════════════════════════════════════
// EXPORT — BACKUP JSON
// ═══════════════════════════════════════════════

/**
 * Unduh seluruh data HematNo sebagai file backup-hematno.json.
 */
function exportData() {
  const backup = {
    version:      '1.0',
    exportedAt:   new Date().toISOString(),
    transactions,
    limits,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'backup-hematno.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Data berhasil dibackup 💾', 'success');
}

// ═══════════════════════════════════════════════
// IMPORT — RESTORE JSON
// ═══════════════════════════════════════════════

/**
 * Buka dialog pemilih file JSON, lalu panggil importData().
 * Dipanggil oleh tombol "Restore Data" di UI.
 */
function triggerImport() {
  document.getElementById('importFileInput').click();
}

/**
 * Baca file JSON yang dipilih, validasi, timpa LocalStorage, refresh UI.
 * @param {File} file - File .json yang dipilih pengguna
 */
function importData(file) {
  if (!file) return;

  // Tolak file bukan JSON
  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    showToast('Format file harus .json', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      // ── Validasi struktur minimal ──────────────
      if (!Array.isArray(data.transactions)) {
        throw new Error('Field "transactions" tidak ditemukan atau bukan array.');
      }
      if (typeof data.limits !== 'object' || data.limits === null) {
        throw new Error('Field "limits" tidak ditemukan atau tidak valid.');
      }

      // Validasi setiap item transaksi
      const requiredTxFields = ['id', 'type', 'amount', 'category', 'date'];
      data.transactions.forEach((tx, i) => {
        requiredTxFields.forEach(field => {
          if (tx[field] === undefined) {
            throw new Error(`Transaksi ke-${i + 1} tidak memiliki field "${field}".`);
          }
        });
        if (!['income', 'expense'].includes(tx.type)) {
          throw new Error(`Transaksi ke-${i + 1} memiliki type tidak valid: "${tx.type}".`);
        }
        if (typeof tx.amount !== 'number' || tx.amount < 0) {
          throw new Error(`Transaksi ke-${i + 1} memiliki amount tidak valid.`);
        }
      });

      // ── Terapkan data ──────────────────────────
      transactions = data.transactions;
      limits       = {
        daily:   data.limits.daily   ?? null,
        weekly:  data.limits.weekly  ?? null,
        monthly: data.limits.monthly ?? null,
      };

      saveToLocalStorage();
      renderAll();
      showToast(`${transactions.length} transaksi berhasil dipulihkan ✓`, 'success');

    } catch (err) {
      showToast(`File tidak valid: ${err.message}`, 'error');
    }

    // Reset input agar file yang sama bisa dipilih ulang
    document.getElementById('importFileInput').value = '';
  };

  reader.readAsText(file);
}

// ─── Date Helpers ─────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}

function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = (day === 0) ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().split('T')[0], sun.toISOString().split('T')[0]];
}

function getMonthRange(date = new Date()) {
  const y = date.getFullYear(), m = date.getMonth();
  const first = new Date(y, m, 1).toISOString().split('T')[0];
  const last  = new Date(y, m + 1, 0).toISOString().split('T')[0];
  return [first, last];
}

function formatRp(n) {
  if (n === null || n === undefined) return 'Rp 0';
  return 'Rp ' + Math.abs(n).toLocaleString('id-ID');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── Filter Helpers ───────────────────────────
function filterByDate(arr, from, to) {
  return arr.filter(t => t.date >= from && t.date <= to);
}

function sumExpenses(arr) {
  return arr.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
}

function sumIncome(arr) {
  return arr.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
}

// ─── Tab Switching ────────────────────────────
let activeTab = 'daily';

function switchTab(tab) {
  activeTab = tab;
  ['daily', 'weekly', 'monthly'].forEach(t => {
    document.getElementById(`tab-${t}`).className = `flex-1 py-3 text-sm font-semibold ${t === tab ? 'tab-active' : 'tab-inactive'}`;
    const view = document.getElementById(`view-${t}`);
    view.classList.toggle('hidden', t !== tab);
    if (t === tab) view.classList.add('fade-in');
  });
  renderAll();
}

// ─── Render Summary Cards ─────────────────────
function renderSummary() {
  const totalInc = sumIncome(transactions);
  const totalExp = sumExpenses(transactions);
  const balance  = totalInc - totalExp;
  document.getElementById('totalIncome').textContent  = formatRp(totalInc);
  document.getElementById('totalExpense').textContent = formatRp(totalExp);
  document.getElementById('totalBalance').textContent = formatRp(balance);
}

// ─── Limit Progress Bar ───────────────────────
function renderLimitBar(prefix, spent, limit) {
  const card = document.getElementById(`${prefix}LimitCard`);
  if (!limit) { card.classList.add('hidden'); return; }
  card.classList.remove('hidden');

  const pct  = Math.min((spent / limit) * 100, 100);
  const over = spent > limit;
  const warn = pct >= 80 && !over;

  const bar = document.getElementById(`${prefix}ProgressBar`);
  bar.style.width = pct + '%';
  bar.className = `progress-bar-inner h-full rounded-full ${over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-brand-500'}`;

  const statusEl = document.getElementById(`${prefix}LimitStatus`);
  if (over) {
    statusEl.textContent = '⚠️ Overbudget!';
    statusEl.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600';
  } else if (warn) {
    statusEl.textContent = '⚡ 80% terpakai';
    statusEl.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600';
  } else {
    statusEl.textContent = '✓ Aman';
    statusEl.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600';
  }

  document.getElementById(`${prefix}Spent`).textContent = `Terpakai: ${formatRp(spent)}`;
  document.getElementById(`${prefix}Limit`).textContent = `Limit: ${formatRp(limit)}`;
}

// ─── Render Daily Tab ─────────────────────────
function renderDaily() {
  const todayStr   = today();
  const txToday    = filterByDate(transactions, todayStr, todayStr).sort((a, b) => b.id - a.id);
  const spentToday = sumExpenses(txToday);

  renderLimitBar('daily', spentToday, limits.daily);

  const container = document.getElementById('dailyTransactions');
  if (!txToday.length) {
    container.innerHTML = `
      <div class="text-center py-6">
        <svg class="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"/>
        </svg>
        <p class="text-sm text-gray-400">Belum ada transaksi hari ini</p>
      </div>`;
    return;
  }
  container.innerHTML = txToday.map(t => transactionItemHTML(t)).join('');
}

// ─── Render Weekly Tab ────────────────────────
function renderWeekly() {
  const [wStart, wEnd] = getWeekRange();
  const txWeek         = filterByDate(transactions, wStart, wEnd);
  const spentWeek      = sumExpenses(txWeek);

  renderLimitBar('weekly', spentWeek, limits.weekly);

  const days        = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const todayDate   = new Date();
  const startOfWeek = new Date(wStart + 'T00:00:00');

  let maxSpent = 0;
  const dayData = days.map((label, i) => {
    const d       = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const spent   = sumExpenses(filterByDate(transactions, dateStr, dateStr));
    if (spent > maxSpent) maxSpent = spent;
    return { label, dateStr, spent };
  });

  const container = document.getElementById('weeklyChart');
  if (maxSpent === 0) {
    container.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">Belum ada pengeluaran minggu ini</p>`;
    return;
  }
  container.innerHTML = dayData.map(({ label, dateStr, spent }) => {
    const pct     = maxSpent > 0 ? (spent / maxSpent) * 100 : 0;
    const isToday = dateStr === todayDate.toISOString().split('T')[0];
    return `
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium w-7 ${isToday ? 'text-brand-600' : 'text-gray-400'}">${label}</span>
          <div class="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div class="h-full rounded-full ${isToday ? 'bg-brand-500' : 'bg-brand-200'} transition-all" style="width:${pct}%"></div>
          </div>
          <span class="text-xs font-semibold text-gray-600 w-20 text-right">${spent > 0 ? formatRp(spent) : '–'}</span>
        </div>
      </div>`;
  }).join('');
}

// ─── Render Monthly Tab ───────────────────────
function renderMonthly() {
  const [mStart, mEnd] = getMonthRange();
  const txMonth        = filterByDate(transactions, mStart, mEnd);
  const incMonth       = sumIncome(txMonth);
  const expMonth       = sumExpenses(txMonth);
  const saving         = incMonth - expMonth;

  renderLimitBar('monthly', expMonth, limits.monthly);

  document.getElementById('monthIncome').textContent  = formatRp(incMonth);
  document.getElementById('monthExpense').textContent = formatRp(expMonth);
  document.getElementById('monthSaving').textContent  = (saving < 0 ? '- ' : '') + formatRp(saving);

  const expTx = txMonth.filter(t => t.type === 'expense');
  const byCat = {};
  expTx.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const total = Object.values(byCat).reduce((s, v) => s + v, 0);

  const container = document.getElementById('categoryBreakdown');
  if (!Object.keys(byCat).length) {
    container.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">Belum ada pengeluaran bulan ini</p>`;
    return;
  }
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  container.innerHTML = sorted.map(([cat, amt]) => {
    const pct = total > 0 ? (amt / total) * 100 : 0;
    return `
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="font-medium text-gray-700">${getCategoryLabel(cat)}</span>
          <span class="font-semibold text-gray-600">${formatRp(amt)} <span class="text-gray-400 font-normal">(${pct.toFixed(0)}%)</span></span>
        </div>
        <div class="bg-gray-100 rounded-full h-2 overflow-hidden">
          <div class="h-full bg-brand-400 rounded-full" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

// ─── Render All Transactions ──────────────────
function renderAllTransactions() {
  const sorted = [...transactions].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.id - a.id;
  });
  const container = document.getElementById('allTransactions');
  document.getElementById('txCount').textContent = `${sorted.length} catatan`;
  if (!sorted.length) {
    container.innerHTML = `
      <div class="text-center py-8">
        <p class="text-sm text-gray-400">Belum ada transaksi</p>
        <p class="text-xs text-gray-300 mt-1">Tap tombol + untuk menambah</p>
      </div>`;
    return;
  }
  const grouped = {};
  sorted.forEach(t => {
    if (!grouped[t.date]) grouped[t.date] = [];
    grouped[t.date].push(t);
  });
  container.innerHTML = Object.entries(grouped).map(([date, txs]) => `
    <div>
      <div class="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
        <span class="text-xs font-semibold text-gray-400 uppercase">${formatDate(date)}</span>
      </div>
      ${txs.map(t => transactionItemHTML(t, true)).join('')}
    </div>`).join('');
}

// ─── Transaction Item HTML ─────────────────────
function transactionItemHTML(t, showDelete = true) {
  const isIncome = t.type === 'income';
  return `
    <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      <div class="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${isIncome ? 'bg-emerald-50' : 'bg-red-50'}">
        ${getCategoryLabel(t.category).split(' ')[0]}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-gray-800 truncate">${getCategoryLabel(t.category).substring(2)}</p>
        ${t.note ? `<p class="text-xs text-gray-400 truncate">${t.note}</p>` : ''}
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-sm font-bold ${isIncome ? 'text-emerald-600' : 'text-red-500'}">
          ${isIncome ? '+' : '−'}${formatRp(t.amount)}
        </p>
        ${showDelete ? `
        <button onclick="deleteTransaction(${t.id})" class="text-xs text-gray-300 hover:text-red-400 transition-colors mt-0.5">hapus</button>` : ''}
      </div>
    </div>`;
}

// ─── Render All ───────────────────────────────
function renderAll() {
  renderSummary();
  renderAllTransactions();
  if (activeTab === 'daily')   renderDaily();
  if (activeTab === 'weekly')  renderWeekly();
  if (activeTab === 'monthly') renderMonthly();
}

// ─── Transaction Modal ─────────────────────────
function openTransactionModal() {
  document.getElementById('txAmount').value = '';
  document.getElementById('txNote').value   = '';
  document.getElementById('txDate').value   = today();
  setType('income');
  document.getElementById('transactionModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('txAmount').focus(), 100);
}

function closeTransactionModal() {
  document.getElementById('transactionModal').classList.add('hidden');
}

function setType(type) {
  currentType      = type;
  selectedCategory = null;
  const incBtn = document.getElementById('typeIncome');
  const expBtn = document.getElementById('typeExpense');
  if (type === 'income') {
    incBtn.className = 'flex-1 py-2 rounded-lg text-sm font-semibold transition-all bg-emerald-500 text-white';
    expBtn.className = 'flex-1 py-2 rounded-lg text-sm font-semibold transition-all text-gray-500';
  } else {
    expBtn.className = 'flex-1 py-2 rounded-lg text-sm font-semibold transition-all bg-red-500 text-white';
    incBtn.className = 'flex-1 py-2 rounded-lg text-sm font-semibold transition-all text-gray-500';
  }
  renderCategoryButtons();
}

function renderCategoryButtons() {
  const cats      = currentType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const container = document.getElementById('categoryButtons');
  container.innerHTML = cats.map(c => `
    <button onclick="selectCategory('${c.id}')" id="cat-${c.id}"
      class="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs font-medium
             ${selectedCategory === c.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'}">
      <span class="text-xl leading-none">${c.emoji}</span>
      <span class="leading-tight text-center">${c.label}</span>
    </button>`).join('');
}

function selectCategory(id) {
  selectedCategory = id;
  renderCategoryButtons();
}

function saveTransaction() {
  const amount = parseFloat(document.getElementById('txAmount').value);
  const note   = document.getElementById('txNote').value.trim();
  const date   = document.getElementById('txDate').value;

  if (!amount || amount <= 0) { showToast('Masukkan jumlah yang valid', 'error'); return; }
  if (!selectedCategory)      { showToast('Pilih kategori dulu', 'error'); return; }
  if (!date)                  { showToast('Pilih tanggal', 'error'); return; }

  const tx = { id: Date.now(), type: currentType, amount, category: selectedCategory, note, date };
  transactions.unshift(tx);
  saveToLocalStorage();
  closeTransactionModal();
  renderAll();
  checkLimitWarning(tx);
  showToast(`Transaksi ${currentType === 'income' ? 'pemasukan' : 'pengeluaran'} tersimpan ✓`, 'success');
}

function checkLimitWarning(tx) {
  if (tx.type !== 'expense') return;
  const todayStr       = today();
  const [wStart, wEnd] = getWeekRange();
  const [mStart, mEnd] = getMonthRange();

  const checks = [
    { label: 'harian',   limit: limits.daily,   spent: sumExpenses(filterByDate(transactions, todayStr, todayStr)) },
    { label: 'mingguan', limit: limits.weekly,   spent: sumExpenses(filterByDate(transactions, wStart, wEnd)) },
    { label: 'bulanan',  limit: limits.monthly,  spent: sumExpenses(filterByDate(transactions, mStart, mEnd)) },
  ];

  checks.forEach(c => {
    if (!c.limit) return;
    if (c.spent > c.limit) {
      setTimeout(() => showToast(`⚠️ Limit ${c.label} terlampaui!`, 'warning'), 600);
    } else if (c.spent / c.limit >= 0.8) {
      setTimeout(() => showToast(`⚡ 80% limit ${c.label} terpakai`, 'warning'), 600);
    }
  });
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveToLocalStorage();
  renderAll();
  showToast('Transaksi dihapus', 'info');
}

// ─── Limit Modal ──────────────────────────────
function openLimitModal() {
  document.getElementById('limitDaily').value   = limits.daily   || '';
  document.getElementById('limitWeekly').value  = limits.weekly  || '';
  document.getElementById('limitMonthly').value = limits.monthly || '';
  document.getElementById('limitModal').classList.remove('hidden');
}

function closeLimitModal() {
  document.getElementById('limitModal').classList.add('hidden');
}

function saveLimit() {
  const d = parseFloat(document.getElementById('limitDaily').value)   || null;
  const w = parseFloat(document.getElementById('limitWeekly').value)  || null;
  const m = parseFloat(document.getElementById('limitMonthly').value) || null;
  limits = { daily: d, weekly: w, monthly: m };
  saveToLocalStorage();
  closeLimitModal();
  renderAll();
  showToast('Limit berhasil disimpan ✓', 'success');
}

// ─── Toast ────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const el     = document.getElementById('toast');
  const colors = { success: 'bg-gray-900', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-gray-600' };
  el.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg whitespace-nowrap fade-in ${colors[type]}`;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2800);
}

// ─── Close modals on backdrop click ──────────
document.getElementById('transactionModal').addEventListener('click', function (e) {
  if (e.target === this) closeTransactionModal();
});
document.getElementById('limitModal').addEventListener('click', function (e) {
  if (e.target === this) closeLimitModal();
});

// ─── Init via DOMContentLoaded ────────────────
document.addEventListener('DOMContentLoaded', function () {
  loadFromLocalStorage();
  renderAll();
});

// ─── Service Worker Registration ──────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker terdaftar:', reg))
      .catch(err => console.log('Gagal mendaftarkan Service Worker:', err));
  });
}
