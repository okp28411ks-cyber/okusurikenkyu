// ===================== お薬手帳アプリ =====================
const API = {
  base: 'tables',
  async list(table, params = {}) {
    const qs = new URLSearchParams({ limit: 1000, ...params }).toString();
    const res = await fetch(`${this.base}/${table}?${qs}`);
    if (!res.ok) throw new Error('取得に失敗しました');
    return res.json();
  },
  async create(table, data) {
    const res = await fetch(`${this.base}/${table}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('作成に失敗しました');
    return res.json();
  },
  async update(table, id, data) {
    const res = await fetch(`${this.base}/${table}/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('更新に失敗しました');
    return res.json();
  },
  async patch(table, id, data) {
    const res = await fetch(`${this.base}/${table}/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('更新に失敗しました');
    return res.json();
  },
  async remove(table, id) {
    const res = await fetch(`${this.base}/${table}/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error('削除に失敗しました');
    return true;
  }
};

const TIMING_OPTIONS = ['起床時', '朝食前', '朝食後', '昼食前', '昼食後', '夕食前', '夕食後', '就寝前', '頓服'];
const CATEGORY_BADGE = { '処方薬': 'badge-blue', '市販薬': 'badge-green', '個人輸入': 'badge-purple', 'その他': 'badge-gray' };

const state = {
  medications: [],
  doseLogs: [],
  editingId: null,
  currentImageData: '',
  charts: {}
};

// ---------- Utility ----------
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }
function uid() { return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9); }

function showToast(msg, type = 'success') {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.style.background = type === 'error' ? '#dc2626' : '#0f172a';
  toast.style.opacity = '1';
  toast.style.pointerEvents = 'auto';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.style.opacity = '0'; toast.style.pointerEvents = 'none'; }, 2600);
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}
function formatDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  return `${formatDate(d)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}
function isLowStock(med) {
  const th = Number(med.alert_threshold) || 0;
  return Number(med.stock_quantity) <= th;
}
function isExpiringSoon(med, days = 30) {
  if (!med.expiry_date) return false;
  const d = daysUntil(med.expiry_date);
  return d !== null && d <= days;
}
function isExpired(med) {
  if (!med.expiry_date) return false;
  return daysUntil(med.expiry_date) < 0;
}

function confirmDialog(message) {
  return new Promise((resolve) => {
    const modal = $('#confirm-modal');
    $('#confirm-message').textContent = message;
    modal.classList.remove('hidden'); modal.classList.add('flex');
    const cleanup = (result) => {
      modal.classList.add('hidden'); modal.classList.remove('flex');
      okBtn.removeEventListener('click', onOk); cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };
    const okBtn = $('#confirm-ok'), cancelBtn = $('#confirm-cancel');
    const onOk = () => cleanup(true), onCancel = () => cleanup(false);
    okBtn.addEventListener('click', onOk); cancelBtn.addEventListener('click', onCancel);
  });
}

// ---------- Navigation ----------
function switchView(viewName) {
  $all('.view-section').forEach(v => v.classList.add('hidden'));
  const target = $(`#view-${viewName}`);
  if (target) target.classList.remove('hidden');
  $all('.nav-btn').forEach(b => b.classList.toggle('active-nav', b.dataset.view === viewName));
  if (viewName === 'stats') renderStats();
  if (viewName === 'list') renderMedicationList();
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'doselog') renderDoseLogView();
  if (viewName === 'notifications') renderNotifications();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$all('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
  if (btn.dataset.view === 'add') resetMedicationForm();
  switchView(btn.dataset.view);
}));
$('#quick-add-btn').addEventListener('click', () => { resetMedicationForm(); switchView('add'); });

// ---------- Data loading ----------
async function loadAllData() {
  try {
    const [medsRes, logsRes] = await Promise.all([
      API.list('medications'),
      API.list('dose_logs')
    ]);
    state.medications = (medsRes.data || []).filter(m => !m.deleted);
    state.doseLogs = (logsRes.data || []).filter(l => !l.deleted)
      .sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at));
  } catch (e) {
    console.error(e);
    showToast('データの読み込みに失敗しました', 'error');
  }
}

// ---------- Form: timing checkboxes ----------
function buildTimingCheckboxes(selected = []) {
  const container = $('#timing-checkboxes');
  container.innerHTML = TIMING_OPTIONS.map(t => `
    <label class="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-50 ${selected.includes(t) ? 'bg-brand-50 border-brand-300 text-brand-700 font-semibold' : ''}">
      <input type="checkbox" value="${t}" class="timing-cb accent-blue-600" ${selected.includes(t) ? 'checked' : ''}> ${t}
    </label>
  `).join('');
  $all('.timing-cb').forEach(cb => cb.addEventListener('change', () => {
    const label = cb.closest('label');
    label.classList.toggle('bg-brand-50', cb.checked);
    label.classList.toggle('border-brand-300', cb.checked);
    label.classList.toggle('text-brand-700', cb.checked);
    label.classList.toggle('font-semibold', cb.checked);
  }));
}

// ---------- Category -> prescription fields toggle ----------
$('#med-category').addEventListener('change', updatePrescriptionFieldsVisibility);
function updatePrescriptionFieldsVisibility() {
  const isPrescription = $('#med-category').value === '処方薬';
  $('#prescription-fields').style.display = isPrescription ? 'grid' : 'none';
}

// ---------- Image handling ----------
$('#image-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    showToast('画像サイズは4MB以下にしてください', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    state.currentImageData = ev.target.result;
    $('#image-url-text').value = '';
    updateImagePreview(state.currentImageData);
  };
  reader.readAsDataURL(file);
});
$('#image-url-text').addEventListener('input', (e) => {
  state.currentImageData = e.target.value.trim();
  updateImagePreview(state.currentImageData);
});
function updateImagePreview(src) {
  const img = $('#image-preview'), placeholder = $('#image-preview-placeholder');
  if (src) {
    img.src = src; img.classList.remove('hidden'); placeholder.classList.add('hidden');
  } else {
    img.classList.add('hidden'); placeholder.classList.remove('hidden');
  }
}

// ---------- Add / Edit Medication ----------
function resetMedicationForm() {
  state.editingId = null;
  state.currentImageData = '';
  $('#medication-form').reset();
  $('#add-form-title').innerHTML = '<i class="fa-solid fa-square-plus text-brand-600"></i> お薬を追加';
  $('#save-med-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 保存する';
  $('#cancel-edit-btn').classList.add('hidden');
  $('#med-unit').value = '錠';
  $('#med-stock').value = 0;
  $('#med-alert-threshold').value = 5;
  updateImagePreview('');
  buildTimingCheckboxes([]);
  updatePrescriptionFieldsVisibility();
}

function fillFormForEdit(med) {
  state.editingId = med.id;
  state.currentImageData = med.image_url || '';
  $('#add-form-title').innerHTML = '<i class="fa-solid fa-pen-to-square text-brand-600"></i> お薬を編集';
  $('#save-med-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 更新する';
  $('#cancel-edit-btn').classList.remove('hidden');
  updateImagePreview(med.image_url || '');
  $('#image-url-text').value = (med.image_url && med.image_url.startsWith('data:')) ? '' : (med.image_url || '');
  $('#med-name').value = med.name || '';
  $('#med-strength').value = med.dosage_strength || '';
  $('#med-manufacturer').value = med.manufacturer || '';
  $('#med-category').value = med.category || '処方薬';
  $('#med-hospital').value = med.hospital_name || '';
  $('#med-department').value = med.department || '';
  $('#med-doctor').value = med.doctor_name || '';
  $('#med-stock').value = med.stock_quantity ?? 0;
  $('#med-unit').value = med.unit || '錠';
  $('#med-alert-threshold').value = med.alert_threshold ?? 5;
  $('#med-expiry').value = med.expiry_date ? new Date(med.expiry_date).toISOString().slice(0, 10) : '';
  $('#med-dose-amount').value = med.dose_amount || '';
  $('#med-doses-per-day').value = med.doses_per_day ?? '';
  $('#med-status').value = med.status || '服用中';
  $('#med-source').value = med.purchase_source || '';
  $('#med-memo').value = med.memo || '';
  buildTimingCheckboxes(Array.isArray(med.dose_timing) ? med.dose_timing : []);
  updatePrescriptionFieldsVisibility();
}

$('#cancel-edit-btn').addEventListener('click', () => { resetMedicationForm(); switchView('list'); });

$('#medication-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#med-name').value.trim();
  if (!name) { showToast('お薬の名前を入力してください', 'error'); return; }

  const timing = $all('.timing-cb').filter(cb => cb.checked).map(cb => cb.value);
  const payload = {
    name,
    image_url: state.currentImageData || '',
    dosage_strength: $('#med-strength').value.trim(),
    manufacturer: $('#med-manufacturer').value.trim(),
    category: $('#med-category').value,
    hospital_name: $('#med-hospital').value.trim(),
    department: $('#med-department').value.trim(),
    doctor_name: $('#med-doctor').value.trim(),
    stock_quantity: parseFloat($('#med-stock').value) || 0,
    unit: $('#med-unit').value.trim() || '錠',
    alert_threshold: parseFloat($('#med-alert-threshold').value) || 0,
    expiry_date: $('#med-expiry').value ? new Date($('#med-expiry').value).getTime() : null,
    dose_amount: $('#med-dose-amount').value.trim(),
    doses_per_day: parseInt($('#med-doses-per-day').value) || 0,
    dose_timing: timing,
    purchase_source: $('#med-source').value.trim(),
    memo: $('#med-memo').value.trim(),
    status: $('#med-status').value
  };

  try {
    if (state.editingId) {
      await API.update('medications', state.editingId, payload);
      showToast('お薬の情報を更新しました');
    } else {
      await API.create('medications', payload);
      showToast('お薬を追加しました');
    }
    await loadAllData();
    resetMedicationForm();
    switchView('list');
  } catch (err) {
    console.error(err);
    showToast('保存に失敗しました', 'error');
  }
});

// ---------- Medication List ----------
function renderMedicationList() {
  const searchTerm = $('#search-input').value.trim().toLowerCase();
  const catFilter = $('#filter-category').value;
  const statusFilter = $('#filter-status').value;
  const sortMode = $('#sort-select').value;

  let meds = state.medications.filter(m => {
    if (searchTerm && !(m.name || '').toLowerCase().includes(searchTerm)) return false;
    if (catFilter !== 'all' && m.category !== catFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  meds.sort((a, b) => {
    switch (sortMode) {
      case 'name_asc': return (a.name || '').localeCompare(b.name || '', 'ja');
      case 'expiry_asc': {
        const da = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
        const db = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
        return da - db;
      }
      case 'stock_asc': return (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0);
      case 'created_desc': return (b.created_at || 0) - (a.created_at || 0);
      default: return 0;
    }
  });

  $('#list-count-label').textContent = `${meds.length} 件のお薬`;
  const container = $('#medication-cards-container');
  const emptyState = $('#list-empty-state');

  if (meds.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  container.innerHTML = meds.map(med => renderMedCard(med)).join('');

  $all('.med-edit-btn').forEach(b => b.addEventListener('click', () => {
    const med = state.medications.find(m => m.id === b.dataset.id);
    if (med) { fillFormForEdit(med); switchView('add'); }
  }));
  $all('.med-delete-btn').forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmDialog('このお薬を削除しますか？服用記録は残ります。');
    if (!ok) return;
    try {
      await API.remove('medications', b.dataset.id);
      showToast('削除しました');
      await loadAllData();
      renderMedicationList();
    } catch (err) { showToast('削除に失敗しました', 'error'); }
  }));
  $all('.med-log-btn').forEach(b => b.addEventListener('click', () => {
    switchView('doselog');
    $('#log-med-select').value = b.dataset.id;
    onLogMedSelectChange();
  }));
}

function renderMedCard(med) {
  const th = Number(med.alert_threshold) || 0;
  const stock = Number(med.stock_quantity) || 0;
  const low = isLowStock(med);
  const expired = isExpired(med);
  const expiringSoon = isExpiringSoon(med, 30) && !expired;
  const pct = th > 0 ? Math.min(100, Math.round((stock / Math.max(th * 3, 1)) * 100)) : Math.min(100, stock > 0 ? 100 : 0);
  const barColor = expired ? '#dc2626' : low ? '#f59e0b' : '#22c55e';
  const catBadge = CATEGORY_BADGE[med.category] || 'badge-gray';

  const imgHtml = med.image_url
    ? `<img src="${med.image_url}" alt="${escapeHtml(med.name)}">`
    : `<i class="fa-solid fa-pills placeholder-icon"></i>`;

  return `
  <article class="med-card">
    <div class="med-card-img">${imgHtml}</div>
    <div class="med-card-body">
      <div class="med-card-main">
        <div class="med-card-name">
          ${escapeHtml(med.name || '(名称未設定)')}
          <span class="badge ${catBadge}">${escapeHtml(med.category || 'その他')}</span>
          ${med.status && med.status !== '服用中' ? `<span class="badge badge-gray">${escapeHtml(med.status)}</span>` : ''}
          ${expired ? `<span class="badge badge-red">期限切れ</span>` : expiringSoon ? `<span class="badge badge-amber">期限間近</span>` : ''}
          ${low ? `<span class="badge badge-amber"><i class="fa-solid fa-triangle-exclamation"></i> 在庫少</span>` : ''}
        </div>
        <div class="med-card-sub">${escapeHtml(med.dosage_strength || '規格未登録')}${med.manufacturer ? ' ・ ' + escapeHtml(med.manufacturer) : ''}</div>
      </div>
      <div class="med-card-stock">
        <p class="med-card-label">在庫数</p>
        <p class="med-card-value">${stock} ${escapeHtml(med.unit || '')}</p>
        <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${pct}%; background:${barColor};"></div></div>
      </div>
      <div class="med-card-expiry">
        <p class="med-card-label">使用期限</p>
        <p class="med-card-value ${expired ? 'text-red-600' : expiringSoon ? 'text-amber-600' : ''}">${med.expiry_date ? formatDate(med.expiry_date) : '未設定'}</p>
      </div>
      <div class="med-card-source">
        <p class="med-card-label">${med.category === '処方薬' ? '医療機関' : '購入先'}</p>
        <p class="med-card-value truncate">${escapeHtml(med.category === '処方薬' ? (med.hospital_name || med.purchase_source || '-') : (med.purchase_source || '-'))}</p>
      </div>
      <div class="med-card-memo">
        <p class="med-card-label">メモ</p>
        <p class="med-card-value text-slate-500 font-normal truncate" title="${escapeHtml(med.memo || '')}">${escapeHtml(med.memo || 'なし')}</p>
      </div>
    </div>
    <div class="med-card-actions">
      <button class="icon-btn med-log-btn" data-id="${med.id}" title="服用記録"><i class="fa-solid fa-clipboard-check"></i></button>
      <button class="icon-btn med-edit-btn" data-id="${med.id}" title="編集"><i class="fa-solid fa-pen"></i></button>
      <button class="icon-btn danger med-delete-btn" data-id="${med.id}" title="削除"><i class="fa-solid fa-trash"></i></button>
    </div>
  </article>`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

['search-input'].forEach(id => $(`#${id}`).addEventListener('input', renderMedicationList));
['filter-category', 'filter-status', 'sort-select'].forEach(id => $(`#${id}`).addEventListener('change', renderMedicationList));

// ---------- Dashboard ----------
function renderDashboard() {
  const meds = state.medications;
  const total = meds.length;
  const active = meds.filter(m => m.status === '服用中').length;
  const lowStock = meds.filter(isLowStock).length;
  const warningMeds = meds.filter(m => isLowStock(m) || isExpiringSoon(m, 30) || isExpired(m));

  $('#stat-total').textContent = total;
  $('#stat-active').textContent = active;
  $('#stat-low').textContent = lowStock;
  $('#stat-warning').textContent = warningMeds.length;

  // Today schedule
  const scheduleContainer = $('#today-schedule-list');
  const activeMedsWithTiming = meds.filter(m => m.status === '服用中' && Array.isArray(m.dose_timing) && m.dose_timing.length);
  if (activeMedsWithTiming.length === 0) {
    scheduleContainer.innerHTML = `<p class="text-sm text-slate-400 py-6 text-center">本日の服用予定はありません</p>`;
  } else {
    let rows = [];
    activeMedsWithTiming.forEach(m => {
      m.dose_timing.forEach(t => rows.push({ med: m, timing: t }));
    });
    const order = TIMING_OPTIONS;
    rows.sort((a, b) => order.indexOf(a.timing) - order.indexOf(b.timing));
    scheduleContainer.innerHTML = rows.map(r => `
      <div class="schedule-item">
        <span class="badge badge-blue">${escapeHtml(r.timing)}</span>
        <span class="font-semibold text-slate-700">${escapeHtml(r.med.name)}</span>
        <span class="text-slate-400 text-xs">${escapeHtml(r.med.dose_amount || '')}</span>
      </div>
    `).join('');
  }

  // Warning meds
  const warningContainer = $('#warning-med-list');
  if (warningMeds.length === 0) {
    warningContainer.innerHTML = `<p class="text-sm text-slate-400 py-6 text-center">要注意のお薬はありません 👍</p>`;
  } else {
    warningContainer.innerHTML = warningMeds.slice(0, 8).map(m => {
      let reason = [];
      if (isExpired(m)) reason.push('<span class="badge badge-red">期限切れ</span>');
      else if (isExpiringSoon(m, 30)) reason.push('<span class="badge badge-amber">期限間近</span>');
      if (isLowStock(m)) reason.push('<span class="badge badge-amber">在庫少</span>');
      return `<div class="warning-item">
        <span class="font-semibold text-slate-700 flex-1 truncate">${escapeHtml(m.name)}</span>
        <div class="flex gap-1">${reason.join('')}</div>
      </div>`;
    }).join('');
  }

  // Recent logs
  const recentContainer = $('#recent-logs-list');
  const recent = state.doseLogs.slice(0, 6);
  if (recent.length === 0) {
    recentContainer.innerHTML = `<p class="text-sm text-slate-400 py-6 text-center">服用記録はまだありません</p>`;
  } else {
    recentContainer.innerHTML = recent.map(l => `
      <div class="flex items-center justify-between py-2.5 text-sm">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-circle-check text-emerald-500"></i>
          <span class="font-semibold text-slate-700">${escapeHtml(l.medication_name || '')}</span>
          <span class="text-slate-400 text-xs">${escapeHtml(l.amount_taken || '')} ${escapeHtml(l.unit || '')}</span>
        </div>
        <span class="text-slate-400 text-xs">${formatDateTime(l.taken_at)}</span>
      </div>
    `).join('');
  }
}

// ---------- Dose Log ----------
function populateLogMedSelects() {
  const activeMeds = state.medications;
  const options = activeMeds.map(m => `<option value="${m.id}">${escapeHtml(m.name)}${m.dosage_strength ? ' (' + escapeHtml(m.dosage_strength) + ')' : ''}</option>`).join('');
  $('#log-med-select').innerHTML = options || '<option value="">登録されているお薬がありません</option>';
  $('#log-filter-med').innerHTML = '<option value="all">すべてのお薬</option>' + options;
  $('#log-timing').innerHTML = TIMING_OPTIONS.map(t => `<option value="${t}">${t}</option>`).join('');
  onLogMedSelectChange();
}

function onLogMedSelectChange() {
  const med = state.medications.find(m => m.id === $('#log-med-select').value);
  if (med) {
    $('#log-amount').value = med.dose_amount || '';
  }
}
$('#log-med-select').addEventListener('change', onLogMedSelectChange);

function setDefaultDatetimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  $('#log-datetime').value = now.toISOString().slice(0, 16);
}

$('#dose-log-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const medId = $('#log-med-select').value;
  const med = state.medications.find(m => m.id === medId);
  if (!med) { showToast('お薬を選択してください', 'error'); return; }

  const dtValue = $('#log-datetime').value;
  const takenAt = dtValue ? new Date(dtValue).getTime() : Date.now();
  const amount = $('#log-amount').value.trim() || med.dose_amount || '';

  try {
    await API.create('dose_logs', {
      medication_id: med.id,
      medication_name: med.name,
      taken_at: takenAt,
      amount_taken: amount,
      unit: med.unit || '',
      timing_label: $('#log-timing').value,
      notes: $('#log-notes').value.trim()
    });

    // decrement stock (simple numeric extraction from amount string)
    const numMatch = amount.match(/[\d.]+/);
    const consumeQty = numMatch ? parseFloat(numMatch[0]) : 0;
    if (consumeQty > 0) {
      const newStock = Math.max(0, (Number(med.stock_quantity) || 0) - consumeQty);
      await API.patch('medications', med.id, { stock_quantity: newStock });
    }

    showToast('服用を記録しました');
    $('#log-notes').value = '';
    setDefaultDatetimeLocal();
    await loadAllData();
    populateLogMedSelects();
    $('#log-med-select').value = medId;
    renderDoseLogView();
  } catch (err) {
    console.error(err);
    showToast('記録に失敗しました', 'error');
  }
});

$('#log-filter-med').addEventListener('change', renderDoseLogHistory);

function renderDoseLogView() {
  populateLogMedSelects();
  setDefaultDatetimeLocal();
  renderDoseLogHistory();
}

function renderDoseLogHistory() {
  const filterMed = $('#log-filter-med').value;
  let logs = state.doseLogs.slice();
  if (filterMed !== 'all') logs = logs.filter(l => l.medication_id === filterMed);

  const container = $('#dose-log-history');
  const empty = $('#doselog-empty-state');
  if (logs.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // group by day
  const groups = {};
  logs.forEach(l => {
    const day = formatDate(l.taken_at);
    if (!groups[day]) groups[day] = [];
    groups[day].push(l);
  });

  container.innerHTML = Object.keys(groups).map(day => `
    <div class="log-day-group">
      <span class="log-day-title">${day}</span>
      ${groups[day].map(l => `
        <div class="log-entry">
          <div class="flex items-center gap-3">
            <i class="fa-solid fa-pills text-brand-500"></i>
            <div>
              <p class="font-semibold text-sm text-slate-700">${escapeHtml(l.medication_name)} <span class="text-xs text-slate-400 font-normal">${escapeHtml(l.amount_taken || '')} ${escapeHtml(l.unit || '')}</span></p>
              <p class="text-xs text-slate-400">${l.timing_label ? escapeHtml(l.timing_label) + ' ・ ' : ''}${escapeHtml(l.notes || '')}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-500 font-medium">${new Date(l.taken_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
            <button class="icon-btn danger log-delete-btn" data-id="${l.id}" title="削除"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  $all('.log-delete-btn').forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmDialog('この服用記録を削除しますか？');
    if (!ok) return;
    try {
      await API.remove('dose_logs', b.dataset.id);
      showToast('削除しました');
      await loadAllData();
      renderDoseLogHistory();
    } catch (err) { showToast('削除に失敗しました', 'error'); }
  }));
}

// ---------- Statistics ----------
function renderStats() {
  renderAdherenceChart();
  renderCategoryChart();
  renderRankingChart();
  renderStockChart();
}

function destroyChart(key) {
  if (state.charts[key]) { state.charts[key].destroy(); delete state.charts[key]; }
}

function renderAdherenceChart() {
  destroyChart('adherence');
  const days = [];
  const counts = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const count = state.doseLogs.filter(l => {
      const ld = new Date(l.taken_at); ld.setHours(0, 0, 0, 0);
      return ld.getTime() === d.getTime();
    }).length;
    days.push(label); counts.push(count);
  }
  const ctx = $('#chart-adherence').getContext('2d');
  state.charts.adherence = new Chart(ctx, {
    type: 'bar',
    data: { labels: days, datasets: [{ label: '服用回数', data: counts, backgroundColor: '#3390fa', borderRadius: 6, maxBarThickness: 26 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

function renderCategoryChart() {
  destroyChart('category');
  const cats = ['処方薬', '市販薬', '個人輸入', 'その他'];
  const counts = cats.map(c => state.medications.filter(m => m.category === c).length);
  const ctx = $('#chart-category').getContext('2d');
  state.charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: cats, datasets: [{ data: counts, backgroundColor: ['#1d6fef', '#22c55e', '#a855f7', '#94a3b8'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderRankingChart() {
  destroyChart('ranking');
  const countMap = {};
  state.doseLogs.forEach(l => { countMap[l.medication_name] = (countMap[l.medication_name] || 0) + 1; });
  const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ctx = $('#chart-ranking').getContext('2d');
  state.charts.ranking = new Chart(ctx, {
    type: 'bar',
    data: { labels: sorted.map(s => s[0]), datasets: [{ label: '服用回数', data: sorted.map(s => s[1]), backgroundColor: '#22c55e', borderRadius: 6 }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

function renderStockChart() {
  destroyChart('stock');
  const sorted = state.medications.slice().sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0)).slice(0, 5);
  const ctx = $('#chart-stock').getContext('2d');
  state.charts.stock = new Chart(ctx, {
    type: 'bar',
    data: { labels: sorted.map(s => s.name), datasets: [{ label: '在庫数', data: sorted.map(s => s.stock_quantity ?? 0), backgroundColor: '#f59e0b', borderRadius: 6 }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
  });
}

// ---------- Notifications ----------
function renderNotifications() {
  const alertDays = parseInt($('#expiry-alert-days').value) || 30;
  const expiring = state.medications.filter(m => m.expiry_date && daysUntil(m.expiry_date) <= alertDays)
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
  const lowStockMeds = state.medications.filter(isLowStock)
    .sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0));

  const expiryContainer = $('#notif-expiry-list');
  if (expiring.length === 0) {
    expiryContainer.innerHTML = `<p class="text-sm text-slate-400 py-6 text-center">対象のお薬はありません</p>`;
  } else {
    expiryContainer.innerHTML = expiring.map(m => {
      const d = daysUntil(m.expiry_date);
      const expired = d < 0;
      return `<div class="warning-item">
        <i class="fa-solid ${expired ? 'fa-circle-xmark text-red-500' : 'fa-hourglass-half text-amber-500'}"></i>
        <div class="flex-1">
          <p class="font-semibold text-slate-700">${escapeHtml(m.name)}</p>
          <p class="text-xs text-slate-400">使用期限：${formatDate(m.expiry_date)}</p>
        </div>
        <span class="badge ${expired ? 'badge-red' : 'badge-amber'}">${expired ? `期限切れ (${Math.abs(d)}日経過)` : `あと${d}日`}</span>
      </div>`;
    }).join('');
  }

  const stockContainer = $('#notif-stock-list');
  if (lowStockMeds.length === 0) {
    stockContainer.innerHTML = `<p class="text-sm text-slate-400 py-6 text-center">対象のお薬はありません</p>`;
  } else {
    stockContainer.innerHTML = lowStockMeds.map(m => `
      <div class="warning-item">
        <i class="fa-solid fa-box-open text-amber-500"></i>
        <div class="flex-1">
          <p class="font-semibold text-slate-700">${escapeHtml(m.name)}</p>
          <p class="text-xs text-slate-400">しきい値：${m.alert_threshold ?? 0} ${escapeHtml(m.unit || '')}</p>
        </div>
        <span class="badge badge-amber">残り ${m.stock_quantity ?? 0} ${escapeHtml(m.unit || '')}</span>
      </div>
    `).join('');
  }

  updateNotifBadge(expiring.length + lowStockMeds.length);
}

function updateNotifBadge(count) {
  const badge = $('#notif-badge');
  if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
  else { badge.classList.add('hidden'); }
}

$('#expiry-alert-days').addEventListener('input', renderNotifications);

$('#enable-browser-notif').addEventListener('click', async () => {
  if (!('Notification' in window)) { showToast('このブラウザは通知に対応していません', 'error'); return; }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    showToast('ブラウザ通知を有効化しました');
    new Notification('お薬手帳', { body: '通知が有効になりました。使用期限・在庫アラートをお知らせします。' });
  } else {
    showToast('通知が許可されませんでした', 'error');
  }
});

// ---------- Init ----------
async function init() {
  buildTimingCheckboxes([]);
  updatePrescriptionFieldsVisibility();
  setDefaultDatetimeLocal();
  await loadAllData();
  renderDashboard();
  updateNotifBadge(
    state.medications.filter(m => isLowStock(m) || isExpiringSoon(m, 30)).length
  );
}

init();
