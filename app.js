// ============================================================
// お薬手帳 - app.js
// Supabase + 現在の medications テーブル対応版
// ============================================================

const SUPABASE_URL = "https://nmstudwvvmbttfhanuyu.supabase.co";
const SUPABASE_KEY = "sb_publishable_DagUSgICo4JTVxwimcZKDw_NYBHPzSf";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ============================================================
// アプリ状態
// ============================================================

let medications = [];
let doseLogs = JSON.parse(localStorage.getItem("doseLogs") || "[]");
let editingMedicationId = null;
let currentImageUrl = "";

const EXTRA_DATA_KEY = "medicationExtraData";
let extraMedicationData =
  JSON.parse(localStorage.getItem(EXTRA_DATA_KEY) || "{}");


// ============================================================
// DOMContentLoaded
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

  setupNavigation();
  setupMedicationForm();
  setupQuickAdd();
  setupSearchAndFilters();
  setupDoseLogForm();
  setupNotifications();
  setupImageUpload();

  createTimingCheckboxes();

  setDefaultDateTime();

  await loadMedications();

  renderAll();

});


// ============================================================
// ナビゲーション
// ============================================================

function setupNavigation() {

  document.querySelectorAll("[data-view]").forEach(btn => {

    btn.addEventListener("click", () => {

      const view = btn.dataset.view;

      showView(view);

    });

  });

}


function showView(view) {

  document.querySelectorAll(".view-section").forEach(section => {
    section.classList.add("hidden");
  });

  const target = document.getElementById("view-" + view);

  if (target) {
    target.classList.remove("hidden");
  }

  document.querySelectorAll(".nav-btn").forEach(btn => {

    btn.classList.remove("active-nav");

    if (btn.dataset.view === view) {
      btn.classList.add("active-nav");
    }

  });

  if (view === "list") {
    renderMedicationList();
  }

  if (view === "dashboard") {
    renderDashboard();
  }

  if (view === "doselog") {
    renderDoseLogs();
    populateMedicationSelects();
  }

  if (view === "stats") {
    renderStatistics();
  }

  if (view === "notifications") {
    renderNotifications();
  }

}


// ============================================================
// お薬追加ボタン
// ============================================================

function setupQuickAdd() {

  const btn = document.getElementById("quick-add-btn");

  if (!btn) return;

  btn.addEventListener("click", () => {

    resetMedicationForm();

    showView("add");

  });

}


// ============================================================
// Supabaseから薬を取得
// ============================================================

async function loadMedications() {

  try {

    const { data, error } = await supabaseClient
      .from("medications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("薬の取得エラー:", error);
      showToast("お薬データの取得に失敗しました");
      return;
    }

    medications = data || [];

  } catch (error) {

    console.error(error);
    showToast("Supabaseへの接続に失敗しました");

  }

}


// ============================================================
// お薬保存
// ============================================================

function setupMedicationForm() {

  const form = document.getElementById("medication-form");

  if (!form) return;

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const name = document.getElementById("med-name").value.trim();

    if (!name) {
      showToast("お薬の名前を入力してください");
      return;
    }

    const medication = {

      name: name,

      strength:
        document.getElementById("med-strength")?.value.trim() || null,

      manufacturer:
        document.getElementById("med-manufacturer")?.value.trim() || null,

      category:
        document.getElementById("med-category")?.value || null,

      stock:
        Number(document.getElementById("med-stock")?.value || 0),

      unit:
        document.getElementById("med-unit")?.value.trim() || "錠",

      expiry:
        document.getElementById("med-expiry")?.value || null,

      memo:
        document.getElementById("med-memo")?.value.trim() || null

    };


    const saveButton = document.getElementById("save-med-btn");

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> 保存中...';
    }


    try {

      let result;

      // --------------------------------------------------------
      // 新規登録
      // --------------------------------------------------------

      if (!editingMedicationId) {

        result = await supabaseClient
          .from("medications")
          .insert([medication])
          .select()
          .single();

      }

      // --------------------------------------------------------
      // 編集
      // --------------------------------------------------------

      else {

        result = await supabaseClient
          .from("medications")
          .update(medication)
          .eq("id", editingMedicationId)
          .select()
          .single();

      }


      if (result.error) {

        console.error("保存エラー:", result.error);

        alert(
          "保存エラー\n\n" +
          result.error.message
        );

        return;

      }


      // --------------------------------------------------------
      // HTML上の追加項目はlocalStorageへ保存
      // --------------------------------------------------------

      const savedMedication = result.data;

      saveExtraMedicationData(savedMedication.id);


      await loadMedications();

      renderAll();

      resetMedicationForm();

      showView("list");

      showToast(
        editingMedicationId
          ? "お薬を更新しました"
          : "お薬を登録しました"
      );

    }

    catch (error) {

      console.error(error);

      alert("保存中にエラーが発生しました");

    }

    finally {

      if (saveButton) {

        saveButton.disabled = false;

        saveButton.innerHTML =
          '<i class="fa-solid fa-floppy-disk"></i> 保存する';

      }

    }

  });


  const cancelButton =
    document.getElementById("cancel-edit-btn");

  if (cancelButton) {

    cancelButton.addEventListener("click", () => {

      resetMedicationForm();

      showView("list");

    });

  }

}


// ============================================================
// HTMLにある追加項目をlocalStorageへ保存
// ============================================================

function saveExtraMedicationData(id) {

  extraMedicationData[id] = {

    hospital:
      document.getElementById("med-hospital")?.value || "",

    department:
      document.getElementById("med-department")?.value || "",

    doctor:
      document.getElementById("med-doctor")?.value || "",

    alertThreshold:
      Number(
        document.getElementById("med-alert-threshold")?.value || 5
      ),

    doseAmount:
      document.getElementById("med-dose-amount")?.value || "",

    dosesPerDay:
      Number(
        document.getElementById("med-doses-per-day")?.value || 0
      ),

    status:
      document.getElementById("med-status")?.value || "服用中",

    source:
      document.getElementById("med-source")?.value || "",

    imageUrl:
      currentImageUrl || ""

  };


  localStorage.setItem(
    EXTRA_DATA_KEY,
    JSON.stringify(extraMedicationData)
  );

}


// ============================================================
// 追加項目を読み込み
// ============================================================

function getExtraData(id) {

  return extraMedicationData[id] || {

    hospital: "",
    department: "",
    doctor: "",
    alertThreshold: 5,
    doseAmount: "",
    dosesPerDay: 0,
    status: "服用中",
    source: "",
    imageUrl: ""

  };

}


// ============================================================
// 編集
// ============================================================

function editMedication(id) {

  const med = medications.find(m => String(m.id) === String(id));

  if (!med) return;

  const extra = getExtraData(id);

  editingMedicationId = id;

  document.getElementById("med-name").value =
    med.name || "";

  document.getElementById("med-strength").value =
    med.strength || "";

  document.getElementById("med-manufacturer").value =
    med.manufacturer || "";

  document.getElementById("med-category").value =
    med.category || "処方薬";

  document.getElementById("med-stock").value =
    med.stock ?? 0;

  document.getElementById("med-unit").value =
    med.unit || "錠";

  document.getElementById("med-expiry").value =
    med.expiry || "";

  document.getElementById("med-memo").value =
    med.memo || "";

  if (document.getElementById("med-hospital"))
    document.getElementById("med-hospital").value =
      extra.hospital;

  if (document.getElementById("med-department"))
    document.getElementById("med-department").value =
      extra.department;

  if (document.getElementById("med-doctor"))
    document.getElementById("med-doctor").value =
      extra.doctor;

  if (document.getElementById("med-alert-threshold"))
    document.getElementById("med-alert-threshold").value =
      extra.alertThreshold;

  if (document.getElementById("med-dose-amount"))
    document.getElementById("med-dose-amount").value =
      extra.doseAmount;

  if (document.getElementById("med-doses-per-day"))
    document.getElementById("med-doses-per-day").value =
      extra.dosesPerDay;

  if (document.getElementById("med-status"))
    document.getElementById("med-status").value =
      extra.status;

  if (document.getElementById("med-source"))
    document.getElementById("med-source").value =
      extra.source;

  currentImageUrl = extra.imageUrl || "";

  updateImagePreview(currentImageUrl);

  const title =
    document.getElementById("add-form-title");

  if (title) {

    title.innerHTML =
      '<i class="fa-solid fa-pen text-brand-600"></i> お薬を編集';

  }

  const cancel =
    document.getElementById("cancel-edit-btn");

  if (cancel) {
    cancel.classList.remove("hidden");
  }

  showView("add");

}


// ============================================================
// 削除
// ============================================================

async function deleteMedication(id) {

  const med =
    medications.find(m => String(m.id) === String(id));

  if (!med) return;

  const confirmed =
    confirm(`「${med.name}」を削除しますか？`);

  if (!confirmed) return;


  try {

    const { error } = await supabaseClient
      .from("medications")
      .delete()
      .eq("id", id);

    if (error) {

      console.error("削除エラー:", error);

      alert(
        "削除エラー\n\n" +
        error.message
      );

      return;

    }


    delete extraMedicationData[id];

    localStorage.setItem(
      EXTRA_DATA_KEY,
      JSON.stringify(extraMedicationData)
    );


    // 関連服用記録も削除
    doseLogs =
      doseLogs.filter(log =>
        String(log.medicationId) !== String(id)
      );

    saveDoseLogs();


    await loadMedications();

    renderAll();

    showToast("お薬を削除しました");

  }

  catch (error) {

    console.error(error);

    showToast("削除に失敗しました");

  }

}


// ============================================================
// フォームリセット
// ============================================================

function resetMedicationForm() {

  const form =
    document.getElementById("medication-form");

  if (form) {
    form.reset();
  }

  editingMedicationId = null;

  currentImageUrl = "";

  updateImagePreview("");


  if (document.getElementById("med-stock"))
    document.getElementById("med-stock").value = 0;

  if (document.getElementById("med-unit"))
    document.getElementById("med-unit").value = "錠";

  if (document.getElementById("med-alert-threshold"))
    document.getElementById("med-alert-threshold").value = 5;

  if (document.getElementById("med-status"))
    document.getElementById("med-status").value = "服用中";


  const title =
    document.getElementById("add-form-title");

  if (title) {

    title.innerHTML =
      '<i class="fa-solid fa-square-plus text-brand-600"></i> お薬を追加';

  }


  const cancel =
    document.getElementById("cancel-edit-btn");

  if (cancel) {
    cancel.classList.add("hidden");
  }

}


// ============================================================
// お薬一覧
// ============================================================

function renderMedicationList() {

  const container =
    document.getElementById(
      "medication-cards-container"
    );

  const empty =
    document.getElementById(
      "list-empty-state"
    );

  const count =
    document.getElementById(
      "list-count-label"
    );

  if (!container) return;


  const search =
    document.getElementById("search-input")
      ?.value
      .trim()
      .toLowerCase() || "";


  const category =
    document.getElementById("filter-category")
      ?.value || "all";


  const status =
    document.getElementById("filter-status")
      ?.value || "all";


  const sort =
    document.getElementById("sort-select")
      ?.value || "name_asc";


  let filtered =
    medications.filter(med => {

      const extra = getExtraData(med.id);

      const matchesSearch =
        !search ||
        String(med.name || "")
          .toLowerCase()
          .includes(search);

      const matchesCategory =
        category === "all" ||
        med.category === category;

      const matchesStatus =
        status === "all" ||
        extra.status === status;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );

    });


  // 並び替え

  if (sort === "name_asc") {

    filtered.sort((a, b) =>
      String(a.name || "")
        .localeCompare(
          String(b.name || ""),
          "ja"
        )
    );

  }

  else if (sort === "expiry_asc") {

    filtered.sort((a, b) =>
      String(a.expiry || "9999-12-31")
        .localeCompare(
          String(b.expiry || "9999-12-31")
        )
    );

  }

  else if (sort === "stock_asc") {

    filtered.sort((a, b) =>
      Number(a.stock || 0) -
      Number(b.stock || 0)
    );

  }

  else if (sort === "created_desc") {

    filtered.sort((a, b) =>
      String(b.created_at || "")
        .localeCompare(
          String(a.created_at || "")
        )
    );

  }


  if (count) {

    count.textContent =
      `${filtered.length}件のお薬`;

  }


  container.innerHTML = "";


  if (!filtered.length) {

    if (empty) {
      empty.classList.remove("hidden");
    }

    return;

  }


  if (empty) {
    empty.classList.add("hidden");
  }


  filtered.forEach(med => {

    container.appendChild(
      createMedicationCard(med)
    );

  });

}


// ============================================================
// 薬カード
// ============================================================

function createMedicationCard(med) {

  const extra = getExtraData(med.id);

  const card =
    document.createElement("div");

  card.className = "med-card";


  const stock =
    Number(med.stock || 0);

  const threshold =
    Number(extra.alertThreshold || 5);


  let stockClass = "badge-green";

  if (stock <= threshold) {
    stockClass = "badge-amber";
  }

  if (stock <= 0) {
    stockClass = "badge-red";
  }


  const expiryText =
    formatDate(med.expiry);


  const imageHTML =
    extra.imageUrl
      ? `<img src="${escapeAttribute(extra.imageUrl)}" alt="${escapeAttribute(med.name)}">`
      : `<i class="fa-solid fa-pills placeholder-icon"></i>`;


  card.innerHTML = `

    <div class="med-card-img">
      ${imageHTML}
    </div>

    <div class="med-card-body">

      <div class="med-card-main">

        <div class="med-card-name">

          ${escapeHTML(med.name || "名称未設定")}

          ${createCategoryBadge(med.category)}

          ${createStatusBadge(extra.status)}

        </div>

        <div class="med-card-sub">

          ${escapeHTML(med.strength || "")}

          ${
            med.manufacturer
              ? " ・ " + escapeHTML(med.manufacturer)
              : ""
          }

        </div>

      </div>


      <div class="med-card-stock">

        <div class="med-card-label">
          在庫
        </div>

        <div class="med-card-value">

          <span class="badge ${stockClass}">
            ${stock} ${escapeHTML(med.unit || "")}
          </span>

        </div>

        <div class="stock-bar-track">

          <div
            class="stock-bar-fill"
            style="width:${getStockPercent(stock, threshold)}%"
          ></div>

        </div>

      </div>


      <div class="med-card-expiry">

        <div class="med-card-label">
          使用期限
        </div>

        <div class="med-card-value">
          ${expiryText}
        </div>

      </div>


      <div class="med-card-source">

        <div class="med-card-label">
          購入先・処方元
        </div>

        <div class="med-card-value">
          ${escapeHTML(extra.source || "-")}
        </div>

      </div>


      <div class="med-card-memo">

        <div class="med-card-label">
          メモ
        </div>

        <div class="med-card-value">
          ${escapeHTML(med.memo || "-")}
        </div>

      </div>

    </div>


    <div class="med-card-actions">

      <button
        class="icon-btn"
        title="編集"
        onclick="editMedication('${med.id}')"
      >
        <i class="fa-solid fa-pen"></i>
      </button>

      <button
        class="icon-btn danger"
        title="削除"
        onclick="deleteMedication('${med.id}')"
      >
        <i class="fa-solid fa-trash"></i>
      </button>

    </div>

  `;


  return card;

}


// ============================================================
// 検索・フィルター
// ============================================================

function setupSearchAndFilters() {

  [
    "search-input",
    "filter-category",
    "filter-status",
    "sort-select"
  ].forEach(id => {

    const el = document.getElementById(id);

    if (el) {

      el.addEventListener(
        "input",
        renderMedicationList
      );

      el.addEventListener(
        "change",
        renderMedicationList
      );

    }

  });

}


// ============================================================
// ダッシュボード
// ============================================================

function renderDashboard() {

  const total =
    medications.length;

  const active =
    medications.filter(m =>
      getExtraData(m.id).status === "服用中"
    ).length;


  const low =
    medications.filter(m => {

      const extra =
        getExtraData(m.id);

      return Number(m.stock || 0) <=
        Number(extra.alertThreshold || 5);

    }).length;


  const warning =
    medications.filter(m =>
      isExpiryWarning(m) ||
      Number(m.stock || 0) <=
      Number(getExtraData(m.id).alertThreshold || 5)
    ).length;


  setText("stat-total", total);
  setText("stat-active", active);
  setText("stat-low", low);
  setText("stat-warning", warning);


  renderTodaySchedule();

  renderWarningMedications();

  renderRecentLogs();

}


// ============================================================
// 本日の服用予定
// ============================================================

function renderTodaySchedule() {

  const container =
    document.getElementById(
      "today-schedule-list"
    );

  if (!container) return;

  container.innerHTML = "";


  const active =
    medications.filter(m =>
      getExtraData(m.id).status === "服用中"
    );


  if (!active.length) {

    container.innerHTML =
      `<div class="text-sm text-slate-400">
        本日の服用予定はありません
      </div>`;

    return;

  }


  active.forEach(med => {

    const extra =
      getExtraData(med.id);

    const item =
      document.createElement("div");

    item.className = "schedule-item";

    item.innerHTML = `

      <div class="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
        <i class="fa-solid fa-pills"></i>
      </div>

      <div class="flex-1">

        <div class="font-semibold">
          ${escapeHTML(med.name)}
        </div>

        <div class="text-xs text-slate-500">

          ${
            extra.doseAmount
              ? escapeHTML(extra.doseAmount)
              : "服用量未設定"
          }

          ${
            extra.dosesPerDay
              ? ` ・ 1日${extra.dosesPerDay}回`
              : ""
          }

        </div>

      </div>

      <button
        class="btn-primary text-xs"
        onclick="quickDose('${med.id}')"
      >
        <i class="fa-solid fa-check"></i>
        記録
      </button>

    `;

    container.appendChild(item);

  });

}


// ============================================================
// 要注意薬
// ============================================================

function renderWarningMedications() {

  const container =
    document.getElementById(
      "warning-med-list"
    );

  if (!container) return;

  container.innerHTML = "";


  const warnings =
    medications.filter(m =>
      isExpiryWarning(m) ||
      Number(m.stock || 0) <=
        Number(getExtraData(m.id).alertThreshold || 5)
    );


  if (!warnings.length) {

    container.innerHTML =
      `<div class="text-sm text-emerald-600">
        要注意のお薬はありません
      </div>`;

    return;

  }


  warnings.forEach(med => {

    const extra =
      getExtraData(med.id);

    const item =
      document.createElement("div");

    item.className = "warning-item";

    let reason = [];

    if (
      Number(med.stock || 0) <=
      Number(extra.alertThreshold || 5)
    ) {
      reason.push("在庫少");
    }

    if (isExpiryWarning(med)) {
      reason.push("期限注意");
    }


    item.innerHTML = `

      <i class="fa-solid fa-triangle-exclamation text-amber-500"></i>

      <div class="flex-1">

        <div class="font-semibold">
          ${escapeHTML(med.name)}
        </div>

        <div class="text-xs text-slate-500">
          ${reason.join(" / ")}
        </div>

      </div>

    `;

    container.appendChild(item);

  });

}


// ============================================================
// 最近の服用記録
// ============================================================

function renderRecentLogs() {

  const container =
    document.getElementById(
      "recent-logs-list"
    );

  if (!container) return;

  container.innerHTML = "";


  const logs =
    [...doseLogs]
      .sort(
        (a, b) =>
          new Date(b.datetime) -
          new Date(a.datetime)
      )
      .slice(0, 5);


  if (!logs.length) {

    container.innerHTML =
      `<div class="py-6 text-sm text-slate-400">
        服用記録がまだありません
      </div>`;

    return;

  }


  logs.forEach(log => {

    const med =
      medications.find(
        m => String(m.id) === String(log.medicationId)
      );


    const div =
      document.createElement("div");

    div.className =
      "py-3 flex items-center justify-between gap-3";


    div.innerHTML = `

      <div>

        <div class="font-semibold text-sm">
          ${escapeHTML(
            med?.name || log.medicationName || "不明なお薬"
          )}
        </div>

        <div class="text-xs text-slate-500">
          ${formatDateTime(log.datetime)}
          ${
            log.amount
              ? " ・ " + escapeHTML(log.amount)
              : ""
          }
        </div>

      </div>

      <span class="badge badge-green">
        <i class="fa-solid fa-check"></i>
        服用済み
      </span>

    `;


    container.appendChild(div);

  });

}


// ============================================================
// 服用記録
// ============================================================

function setupDoseLogForm() {

  const form =
    document.getElementById(
      "dose-log-form"
    );

  if (!form) return;


  form.addEventListener("submit", e => {

    e.preventDefault();

    const medId =
      document.getElementById(
        "log-med-select"
      ).value;

    const med =
      medications.find(
        m => String(m.id) === String(medId)
      );

    if (!med) {

      showToast("お薬を選択してください");

      return;

    }


    const log = {

      id:
        Date.now().toString(),

      medicationId:
        med.id,

      medicationName:
        med.name,

      amount:
        document.getElementById(
          "log-amount"
        ).value.trim(),

      datetime:
        document.getElementById(
          "log-datetime"
        ).value,

      timing:
        document.getElementById(
          "log-timing"
        ).value,

      notes:
        document.getElementById(
          "log-notes"
        ).value.trim()

    };


    doseLogs.push(log);

    saveDoseLogs();

    renderAll();

    form.reset();

    setDefaultDateTime();

    showToast("服用を記録しました");

  });


  const filter =
    document.getElementById(
      "log-filter-med"
    );

  if (filter) {

    filter.addEventListener(
      "change",
      renderDoseLogs
    );

  }

}


// ============================================================
// 服用記録保存
// ============================================================

function saveDoseLogs() {

  localStorage.setItem(
    "doseLogs",
    JSON.stringify(doseLogs)
  );

}


// ============================================================
// 服用薬セレクト
// ============================================================

function populateMedicationSelects() {

  const selects = [

    document.getElementById(
      "log-med-select"
    ),

    document.getElementById(
      "log-filter-med"
    )

  ];


  selects.forEach(select => {

    if (!select) return;


    const current =
      select.value;


    if (
      select.id ===
      "log-filter-med"
    ) {

      select.innerHTML =
        `<option value="all">
          すべてのお薬
        </option>`;

    }

    else {

      select.innerHTML =
        `<option value="">
          お薬を選択してください
        </option>`;

    }


    medications.forEach(med => {

      const option =
        document.createElement("option");

      option.value =
        med.id;

      option.textContent =
        med.name;

      select.appendChild(option);

    });


    if (current) {
      select.value = current;
    }

  });

}


// ============================================================
// 服用履歴表示
// ============================================================

function renderDoseLogs() {

  populateMedicationSelects();


  const container =
    document.getElementById(
      "dose-log-history"
    );

  const empty =
    document.getElementById(
      "doselog-empty-state"
    );

  if (!container) return;


  const filter =
    document.getElementById(
      "log-filter-med"
    )?.value || "all";


  let logs =
    [...doseLogs]
      .sort(
        (a, b) =>
          new Date(b.datetime) -
          new Date(a.datetime)
      );


  if (filter !== "all") {

    logs =
      logs.filter(
        log =>
          String(log.medicationId) ===
          String(filter)
      );

  }


  container.innerHTML = "";


  if (!logs.length) {

    if (empty)
      empty.classList.remove("hidden");

    return;

  }


  if (empty)
    empty.classList.add("hidden");


  const groups = {};


  logs.forEach(log => {

    const day =
      formatDate(log.datetime);

    if (!groups[day]) {
      groups[day] = [];
    }

    groups[day].push(log);

  });


  Object.entries(groups)
    .forEach(([day, dayLogs]) => {

      const group =
        document.createElement("div");

      group.className =
        "log-day-group";


      group.innerHTML = `

        <div class="log-day-title">
          ${escapeHTML(day)}
        </div>

      `;


      dayLogs.forEach(log => {

        const med =
          medications.find(
            m =>
              String(m.id) ===
              String(log.medicationId)
          );


        const entry =
          document.createElement("div");

        entry.className =
          "log-entry";


        entry.innerHTML = `

          <div>

            <div class="font-semibold text-sm">
              ${escapeHTML(
                med?.name ||
                log.medicationName ||
                "不明なお薬"
              )}
            </div>

            <div class="text-xs text-slate-500 mt-1">

              ${formatTime(log.datetime)}

              ${
                log.amount
                  ? ` ・ ${escapeHTML(log.amount)}`
                  : ""
              }

              ${
                log.timing
                  ? ` ・ ${escapeHTML(log.timing)}`
                  : ""
              }

            </div>

            ${
              log.notes
                ? `
                  <div class="text-xs text-slate-500 mt-1">
                    ${escapeHTML(log.notes)}
                  </div>
                `
                : ""
            }

          </div>


          <button
            class="icon-btn danger"
            onclick="deleteDoseLog('${log.id}')"
            title="削除"
          >
            <i class="fa-solid fa-trash"></i>
          </button>

        `;


        group.appendChild(entry);

      });


      container.appendChild(group);

    });

}


// ============================================================
// 服用記録削除
// ============================================================

function deleteDoseLog(id) {

  const confirmed =
    confirm("この服用記録を削除しますか？");

  if (!confirmed) return;


  doseLogs =
    doseLogs.filter(
      log => String(log.id) !== String(id)
    );


  saveDoseLogs();

  renderAll();

  showToast("服用記録を削除しました");

}


// ============================================================
// クイック服用記録
// ============================================================

function quickDose(id) {

  showView("doselog");

  setTimeout(() => {

    const select =
      document.getElementById(
        "log-med-select"
      );

    if (select) {
      select.value = id;
    }

    const med =
      medications.find(
        m => String(m.id) === String(id)
      );

    if (med) {

      const extra =
        getExtraData(id);

      const amount =
        document.getElementById(
          "log-amount"
        );

      if (amount) {
        amount.value =
          extra.doseAmount || "";
      }

    }

  }, 50);

}


// ============================================================
// タイミング
// ============================================================

function createTimingCheckboxes() {

  const container =
    document.getElementById(
      "timing-checkboxes"
    );

  if (!container) return;


  const timings = [

    "起床時",
    "朝食前",
    "朝食後",
    "昼食前",
    "昼食後",
    "夕食前",
    "夕食後",
    "就寝前",
    "食間",
    "必要時"

  ];


  container.innerHTML = "";


  timings.forEach(timing => {

    const label =
      document.createElement("label");

    label.className =
      "cursor-pointer";


    label.innerHTML = `

      <input
        type="checkbox"
        value="${escapeAttribute(timing)}"
        class="hidden timing-checkbox"
      >

      <span
        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm text-slate-600"
      >
        ${escapeHTML(timing)}
      </span>

    `;


    const checkbox =
      label.querySelector("input");

    const span =
      label.querySelector("span");


    checkbox.addEventListener(
      "change",
      () => {

        if (checkbox.checked) {

          span.classList.add(
            "bg-brand-100",
            "text-brand-700",
            "border-brand-300"
          );

        }

        else {

          span.classList.remove(
            "bg-brand-100",
            "text-brand-700",
            "border-brand-300"
          );

        }

      }
    );


    container.appendChild(label);

  });


  const logTiming =
    document.getElementById(
      "log-timing"
    );

  if (logTiming) {

    logTiming.innerHTML =
      `<option value="">選択してください</option>`;

    timings.forEach(timing => {

      const option =
        document.createElement("option");

      option.value = timing;
      option.textContent = timing;

      logTiming.appendChild(option);

    });

  }

}


// ============================================================
// 通知
// ============================================================

function setupNotifications() {

  const daysInput =
    document.getElementById(
      "expiry-alert-days"
    );

  if (daysInput) {

    daysInput.addEventListener(
      "change",
      () => {

        localStorage.setItem(
          "expiryAlertDays",
          daysInput.value
        );

        renderNotifications();

        renderDashboard();

      }
    );


    const saved =
      localStorage.getItem(
        "expiryAlertDays"
      );

    if (saved) {
      daysInput.value = saved;
    }

  }


  const button =
    document.getElementById(
      "enable-browser-notif"
    );

  if (button) {

    button.addEventListener(
      "click",
      async () => {

        if (!("Notification" in window)) {

          showToast(
            "このブラウザは通知に対応していません"
          );

          return;

        }


        const permission =
          await Notification.requestPermission();


        if (permission === "granted") {

          showToast(
            "ブラウザ通知を有効化しました"
          );

          new Notification(
            "お薬手帳",
            {
              body:
                "ブラウザ通知が有効になりました。"
            }
          );

        }

        else {

          showToast(
            "通知が許可されませんでした"
          );

        }

      }
    );

  }

}


// ============================================================
// 通知表示
// ============================================================

function renderNotifications() {

  const expiryContainer =
    document.getElementById(
      "notif-expiry-list"
    );

  const stockContainer =
    document.getElementById(
      "notif-stock-list"
    );


  const days =
    Number(
      document.getElementById(
        "expiry-alert-days"
      )?.value || 30
    );


  const expiryWarnings =
    medications.filter(med =>
      isExpiryWarning(med, days)
    );


  const stockWarnings =
    medications.filter(med => {

      const extra =
        getExtraData(med.id);

      return Number(med.stock || 0) <=
        Number(extra.alertThreshold || 5);

    });


  if (expiryContainer) {

    expiryContainer.innerHTML = "";


    if (!expiryWarnings.length) {

      expiryContainer.innerHTML =
        `<div class="text-sm text-emerald-600">
          使用期限が近いお薬はありません
        </div>`;

    }


    expiryWarnings.forEach(med => {

      const div =
        document.createElement("div");

      div.className =
        "warning-item";


      div.innerHTML = `

        <i class="fa-solid fa-hourglass-end text-red-500"></i>

        <div class="flex-1">

          <div class="font-semibold">
            ${escapeHTML(med.name)}
          </div>

          <div class="text-xs text-slate-500">
            使用期限：${formatDate(med.expiry)}
          </div>

        </div>

      `;


      expiryContainer.appendChild(div);

    });

  }


  if (stockContainer) {

    stockContainer.innerHTML = "";


    if (!stockWarnings.length) {

      stockContainer.innerHTML =
        `<div class="text-sm text-emerald-600">
          在庫不足のお薬はありません
        </div>`;

    }


    stockWarnings.forEach(med => {

      const div =
        document.createElement("div");

      div.className =
        "warning-item";


      div.innerHTML = `

        <i class="fa-solid fa-box-open text-amber-500"></i>

        <div class="flex-1">

          <div class="font-semibold">
            ${escapeHTML(med.name)}
          </div>

          <div class="text-xs text-slate-500">
            在庫：
            ${Number(med.stock || 0)}
            ${escapeHTML(med.unit || "")}
          </div>

        </div>

      `;


      stockContainer.appendChild(div);

    });

  }


  updateNotificationBadge(
    expiryWarnings.length +
    stockWarnings.length
  );

}


// ============================================================
// 統計
// ============================================================

function renderStatistics() {

  if (
    typeof Chart === "undefined"
  ) {
    return;
  }


  createAdherenceChart();
  createCategoryChart();
  createRankingChart();
  createStockChart();

}


// ============================================================
// 服用回数グラフ
// ============================================================

function createAdherenceChart() {

  const canvas =
    document.getElementById(
      "chart-adherence"
    );

  if (!canvas) return;


  destroyChart(canvas);


  const labels = [];
  const values = [];


  for (let i = 13; i >= 0; i--) {

    const date =
      new Date();

    date.setHours(0, 0, 0, 0);

    date.setDate(
      date.getDate() - i
    );


    const key =
      date.toISOString()
        .slice(0, 10);


    labels.push(
      `${date.getMonth() + 1}/${date.getDate()}`
    );


    values.push(
      doseLogs.filter(log =>
        String(log.datetime).slice(0, 10) === key
      ).length
    );

  }


  const chart =
    new Chart(canvas, {

      type: "bar",

      data: {

        labels,

        datasets: [{

          label: "服用回数",

          data: values

        }]

      },

      options: {

        responsive: true,

        maintainAspectRatio: false

      }

    });


  canvas._chart = chart;

}


// ============================================================
// 分類グラフ
// ============================================================

function createCategoryChart() {

  const canvas =
    document.getElementById(
      "chart-category"
    );

  if (!canvas) return;


  destroyChart(canvas);


  const categories = [
    "処方薬",
    "市販薬",
    "個人輸入",
    "その他"
  ];


  const values =
    categories.map(category =>
      medications.filter(
        m => m.category === category
      ).length
    );


  canvas._chart =
    new Chart(canvas, {

      type: "doughnut",

      data: {

        labels: categories,

        datasets: [{

          data: values

        }]

      },

      options: {

        responsive: true,

        maintainAspectRatio: false

      }

    });

}


// ============================================================
// ランキング
// ============================================================

function createRankingChart() {

  const canvas =
    document.getElementById(
      "chart-ranking"
    );

  if (!canvas) return;


  destroyChart(canvas);


  const counts = {};


  doseLogs.forEach(log => {

    const name =
      log.medicationName || "不明";

    counts[name] =
      (counts[name] || 0) + 1;

  });


  const ranking =
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);


  canvas._chart =
    new Chart(canvas, {

      type: "bar",

      data: {

        labels:
          ranking.map(x => x[0]),

        datasets: [{

          label: "服用回数",

          data:
            ranking.map(x => x[1])

        }]

      },

      options: {

        indexAxis: "y",

        responsive: true,

        maintainAspectRatio: false

      }

    });

}


// ============================================================
// 在庫グラフ
// ============================================================

function createStockChart() {

  const canvas =
    document.getElementById(
      "chart-stock"
    );

  if (!canvas) return;


  destroyChart(canvas);


  const ranking =
    [...medications]
      .sort(
        (a, b) =>
          Number(a.stock || 0) -
          Number(b.stock || 0)
      )
      .slice(0, 5);


  canvas._chart =
    new Chart(canvas, {

      type: "bar",

      data: {

        labels:
          ranking.map(m => m.name),

        datasets: [{

          label: "在庫数",

          data:
            ranking.map(
              m => Number(m.stock || 0)
            )

        }]

      },

      options: {

        responsive: true,

        maintainAspectRatio: false

      }

    });

}


// ============================================================
// グラフ削除
// ============================================================

function destroyChart(canvas) {

  if (canvas._chart) {

    canvas._chart.destroy();

    canvas._chart = null;

  }

}


// ============================================================
// 画像
// ============================================================

function setupImageUpload() {

  const input =
    document.getElementById(
      "image-file-input"
    );

  const urlInput =
    document.getElementById(
      "image-url-text"
    );


  if (input) {

    input.addEventListener(
      "change",
      () => {

        const file =
          input.files?.[0];

        if (!file) return;


        const reader =
          new FileReader();


        reader.onload = e => {

          currentImageUrl =
            e.target.result;

          updateImagePreview(
            currentImageUrl
          );

        };


        reader.readAsDataURL(file);

      }
    );

  }


  if (urlInput) {

    urlInput.addEventListener(
      "input",
      () => {

        currentImageUrl =
          urlInput.value.trim();

        updateImagePreview(
          currentImageUrl
        );

      }
    );

  }

}


function updateImagePreview(url) {

  const img =
    document.getElementById(
      "image-preview"
    );

  const placeholder =
    document.getElementById(
      "image-preview-placeholder"
    );

  if (!img || !placeholder) return;


  if (url) {

    img.src = url;

    img.classList.remove("hidden");

    placeholder.classList.add("hidden");

  }

  else {

    img.src = "";

    img.classList.add("hidden");

    placeholder.classList.remove("hidden");

  }

}


// ============================================================
// 全体更新
// ============================================================

function renderAll() {

  renderDashboard();

  renderMedicationList();

  renderDoseLogs();

  renderNotifications();

  updateNotificationBadge();

}


// ============================================================
// 通知バッジ
// ============================================================

function updateNotificationBadge(count = null) {

  const badge =
    document.getElementById(
      "notif-badge"
    );

  if (!badge) return;


  if (count === null) {

    count =
      medications.filter(
        m => isExpiryWarning(m) ||
          Number(m.stock || 0) <=
          Number(
            getExtraData(m.id)
              .alertThreshold || 5
          )
      ).length;

  }


  if (count > 0) {

    badge.textContent = count;

    badge.classList.remove("hidden");

  }

  else {

    badge.classList.add("hidden");

  }

}


// ============================================================
// 期限チェック
// ============================================================

function isExpiryWarning(
  medication,
  days = null
) {

  if (!medication.expiry) {
    return false;
  }


  if (days === null) {

    days =
      Number(
        localStorage.getItem(
          "expiryAlertDays"
        ) || 30
      );

  }


  const expiry =
    new Date(
      medication.expiry +
      "T23:59:59"
    );


  const now =
    new Date();


  const diff =
    (
      expiry.getTime() -
      now.getTime()
    ) /
    86400000;


  return diff <= days;

}


// ============================================================
// 在庫バー
// ============================================================

function getStockPercent(
  stock,
  threshold
) {

  if (stock <= 0) {
    return 0;
  }


  const max =
    Math.max(
      threshold * 4,
      20
    );


  return Math.min(
    100,
    Math.max(
      5,
      stock / max * 100
    )
  );

}


// ============================================================
// バッジ
// ============================================================

function createCategoryBadge(category) {

  if (!category) return "";

  const classes = {

    "処方薬": "badge-blue",

    "市販薬": "badge-green",

    "個人輸入": "badge-purple",

    "その他": "badge-gray"

  };


  return `
    <span class="badge ${classes[category] || "badge-gray"}">
      ${escapeHTML(category)}
    </span>
  `;

}


function createStatusBadge(status) {

  if (!status) return "";

  const classes = {

    "服用中": "badge-green",

    "休止中": "badge-amber",

    "中止済み": "badge-gray"

  };


  return `
    <span class="badge ${classes[status] || "badge-gray"}">
      ${escapeHTML(status)}
    </span>
  `;

}


// ============================================================
// 日付
// ============================================================

function formatDate(dateString) {

  if (!dateString) {
    return "-";
  }


  const date =
    new Date(
      dateString.includes("T")
        ? dateString
        : dateString + "T00:00:00"
    );


  if (isNaN(date.getTime())) {
    return "-";
  }


  return `${date.getFullYear()}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${String(
    date.getDate()
  ).padStart(2, "0")}`;

}


function formatTime(dateString) {

  const date =
    new Date(dateString);

  if (isNaN(date.getTime())) {
    return "-";
  }


  return date.toLocaleTimeString(
    "ja-JP",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


function formatDateTime(dateString) {

  const date =
    new Date(dateString);

  if (isNaN(date.getTime())) {
    return "-";
  }


  return date.toLocaleString(
    "ja-JP",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


// ============================================================
// 初期日時
// ============================================================

function setDefaultDateTime() {

  const input =
    document.getElementById(
      "log-datetime"
    );

  if (!input) return;


  const now =
    new Date();


  const offset =
    now.getTimezoneOffset();


  const local =
    new Date(
      now.getTime() -
      offset * 60000
    )
      .toISOString()
      .slice(0, 16);


  input.value = local;

}


// ============================================================
// HTMLエスケープ
// ============================================================

function escapeHTML(value) {

  if (value === null ||
      value === undefined) {

    return "";

  }


  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function escapeAttribute(value) {

  return escapeHTML(value);

}


// ============================================================
// テキスト設定
// ============================================================

function setText(id, value) {

  const el =
    document.getElementById(id);

  if (el) {
    el.textContent = value;
  }

}


// ============================================================
// Toast
// ============================================================

function showToast(message) {

  const toast =
    document.getElementById("toast");

  if (!toast) {

    console.log(message);

    return;

  }


  toast.textContent =
    message;

  toast.classList.remove(
    "opacity-0",
    "pointer-events-none"
  );

  toast.classList.add(
    "opacity-100"
  );


  clearTimeout(
    showToast.timer
  );


  showToast.timer =
    setTimeout(() => {

      toast.classList.remove(
        "opacity-100"
      );

      toast.classList.add(
        "opacity-0",
        "pointer-events-none"
      );

    }, 2500);

}


// ============================================================
// グローバル関数
// HTMLのonclickから呼び出すため
// ============================================================

window.editMedication =
  editMedication;

window.deleteMedication =
  deleteMedication;

window.deleteDoseLog =
  deleteDoseLog;

window.quickDose =
  quickDose;
