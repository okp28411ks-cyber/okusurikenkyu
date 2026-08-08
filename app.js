// ==================================================
// お薬手帳アプリ app.js
// ==================================================

// ==================================================
// ① Supabase設定・認証
// ==================================================

const SUPABASE_URL =
    "https://nmstudwvvmbttfhanuyu.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_DagUSgICo4JTVxwimcZKDw_NYBHPzSf";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

let currentUser = null;
let medications = [];
let doseLogs = [];
let editingMedicationId = null;
// ===============================
// 薬画像アップロード
// ===============================

let selectedMedicationImageUrl = "";

const MEDICATION_IMAGE_BUCKET = "medication-images";

async function uploadMedicationImage() {

    const fileInput = document.getElementById("med-image-file");

    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        return "";
    }

    if (!currentUser) {
        alert("ログインしてください");
        return "";
    }

    const file = fileInput.files[0];

    // 画像ファイルだけ許可
    if (!file.type.startsWith("image/")) {
        alert("画像ファイルを選択してください。");
        return "";
    }

    // 10MBまで
    if (file.size > 10 * 1024 * 1024) {
        alert("画像サイズは10MB以下にしてください。");
        return "";
    }

    const extension =
        file.name.split(".").pop().toLowerCase() || "jpg";

    const filePath =
        `${currentUser.id}/${crypto.randomUUID()}.${extension}`;

    const { error } =
        await supabaseClient
            .storage
            .from(MEDICATION_IMAGE_BUCKET)
            .upload(
                filePath,
                file,
                {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type
                }
            );

    if (error) {
        console.error("画像アップロードエラー:", error);

        alert(
            "画像アップロードエラー\n" +
            error.message
        );

        return "";
    }

    const { data } =
        supabaseClient
            .storage
            .from(MEDICATION_IMAGE_BUCKET)
            .getPublicUrl(filePath);

    selectedMedicationImageUrl =
        data.publicUrl;

    return selectedMedicationImageUrl;
}
// ===============================
// 画像選択時のプレビュー
// ===============================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const fileInput =
            document.getElementById("med-image-file");

        const urlInput =
            document.getElementById("image-url-text");

        const preview =
            document.getElementById("med-image-preview");

        // ファイル選択
        if (fileInput) {

            fileInput.addEventListener(
                "change",
                () => {

                    const file =
                        fileInput.files?.[0];

                    if (!file || !preview) {
                        return;
                    }

                    if (!file.type.startsWith("image/")) {
                        alert(
                            "画像ファイルを選択してください。"
                        );

                        fileInput.value = "";
                        return;
                    }

                    const reader =
                        new FileReader();

                    reader.onload = (event) => {

                        preview.innerHTML = `
                            <img
                                src="${event.target.result}"
                                alt="薬の画像"
                                class="w-full h-full object-contain"
                            >
                        `;

                    };

                    reader.readAsDataURL(file);

                }
            );

        }

        // URL入力時のプレビュー
        if (urlInput) {

            urlInput.addEventListener(
                "input",
                () => {

                    const url =
                        urlInput.value.trim();

                    if (!preview) {
                        return;
                    }

                    if (!url) {

                        preview.innerHTML = `
                            <span class="text-slate-400 text-sm">
                                画像が選択されていません
                            </span>
                        `;

                        return;
                    }

                    preview.innerHTML = `
                        <img
                            src="${url}"
                            alt="薬の画像"
                            class="w-full h-full object-contain"
                            onerror="
                                this.parentElement.innerHTML =
                                '<span class=&quot;text-red-400 text-sm&quot;>画像を読み込めません</span>'
                            "
                        >
                    `;

                }
            );

        }

    }
);
// ==================================================
// 起動
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        checkSession();
    }
);


// ==================================================
// セッション確認
// ==================================================

async function checkSession() {

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();

    if (session) {

        currentUser = session.user;

        showApp();

        await loadMedications();
        await loadDoseLogs();

    } else {

        showLogin();

    }
}


// ==================================================
// ログイン画面表示
// ==================================================

function showLogin() {

    const login =
        document.getElementById("login-area");

    const app =
        document.getElementById("app-area");

    if (login) {
        login.classList.remove("hidden");
    }

    if (app) {
        app.classList.add("hidden");
    }
}


// ==================================================
// アプリ表示
// ==================================================

function showApp() {

    const login =
        document.getElementById("login-area");

    const app =
        document.getElementById("app-area");

    if (login) {
        login.classList.add("hidden");
    }

    if (app) {
        app.classList.remove("hidden");
    }
}


// ==================================================
// 会員登録
// ==================================================

async function signUp(email, password) {

    if (!email || !password) {

        alert(
            "メールアドレスとパスワードを入力してください。"
        );

        return;
    }

    if (password.length < 6) {

        alert(
            "パスワードは6文字以上で入力してください。"
        );

        return;
    }

    const {
        data,
        error
    } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {

        console.error(
            "会員登録エラー:",
            error
        );

        alert(
            "登録エラー\n" +
            error.message
        );

        return;
    }

    console.log(
        "会員登録成功:",
        data
    );

    alert(
        "登録しました。\n確認メールを確認してください。"
    );
}


// ==================================================
// ログイン
// ==================================================

async function signIn(email, password) {

    if (!email || !password) {

        alert(
            "メールアドレスとパスワードを入力してください。"
        );

        return;
    }

    const {
        data,
        error
    } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {

        console.error(
            "ログインエラー:",
            error
        );

        alert(
            "ログインエラー\n" +
            error.message
        );

        return;
    }

    currentUser = data.user;

    showApp();

    await loadMedications();
    await loadDoseLogs();
}


// ==================================================
// ログアウト
// ==================================================

async function signOut() {

    const {
        error
    } = await supabaseClient.auth.signOut();

    if (error) {

        console.error(
            "ログアウトエラー:",
            error
        );

        alert(
            "ログアウトエラー\n" +
            error.message
        );

        return;
    }

    location.reload();
}


// ==================================================
// Toast
// ==================================================

function showToast(message) {

    const toast =
        document.getElementById("toast");

    if (!toast) {

        alert(message);

        return;
    }

    toast.textContent = message;

    toast.classList.remove("opacity-0");

    setTimeout(
        () => {
            toast.classList.add("opacity-0");
        },
        2500
    );
}


// ==================================================
// ② 薬データ取得・登録・編集・削除
// ==================================================


// ==================================================
// 薬データ取得
// ==================================================

async function loadMedications() {

    if (!currentUser) {
        return;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("medications")
        .select("*")
        .eq(
            "user_id",
            currentUser.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {

        console.error(
            "薬データ取得エラー:",
            error
        );

        showToast(
            "薬データ取得エラー"
        );

        return;
    }

    medications =
        data || [];

    renderMedicationList();

    updateDashboard();

    updateDoseSelect();
}


// ==================================================
// 薬保存
// ==================================================

async function saveMedication() {

    console.log(
        "saveMedication() 実行"
    );

    if (!currentUser) {

        alert(
            "ログインしてください"
        );

        return;
    }
    // ===============================
    // 薬画像を準備
    // ===============================

    let medicationImageUrl =
        document
            .getElementById("image-url-text")
            ?.value
            .trim() || "";

    const fileInput =
        document.getElementById("med-image-file");

    if (
        fileInput &&
        fileInput.files &&
        fileInput.files.length > 0
    ) {

        const uploadedUrl =
            await uploadMedicationImage();

        if (!uploadedUrl) {
            return;
        }

        medicationImageUrl =
            uploadedUrl;
    }
    const nameElement =
        document.getElementById("med-name");

    if (!nameElement) {

        alert(
            "お薬の入力欄が見つかりません。"
        );

        console.error(
            "med-name が見つかりません"
        );

        return;
    }

    const name =
        nameElement.value.trim();

    if (!name) {

        alert(
            "お薬の名前を入力してください。"
        );

        nameElement.focus();

        return;
    }

    const medication = {

        user_id:
            currentUser.id,

        image_url:
    medicationImageUrl,

        name:
            name,
timing:
    Array.from(
        document.querySelectorAll(
            '#timing-checkboxes input[type="checkbox"]:checked'
        )
    ).map(
        checkbox => checkbox.value
    ),
        strength:
            document
                .getElementById("med-strength")
                ?.value || "",

        manufacturer:
            document
                .getElementById("med-manufacturer")
                ?.value || "",

        category:
            document
                .getElementById("med-category")
                ?.value || "処方薬",

        hospital:
            document
                .getElementById("med-hospital")
                ?.value || "",

        department:
            document
                .getElementById("med-department")
                ?.value || "",

        doctor:
            document
                .getElementById("med-doctor")
                ?.value || "",

        stock:
            Number(
                document
                    .getElementById("med-stock")
                    ?.value || 0
            ),

        unit:
            document
                .getElementById("med-unit")
                ?.value || "錠",

        alert_threshold:
            Number(
                document
                    .getElementById("med-alert-threshold")
                    ?.value || 5
            ),

        expiry:
            document
                .getElementById("med-expiry")
                ?.value || null,

        dose_amount:
            document
                .getElementById("med-dose-amount")
                ?.value || "",

        doses_per_day:
            Number(
                document
                    .getElementById("med-doses-per-day")
                    ?.value || 0
            ),

        status:
            document
                .getElementById("med-status")
                ?.value || "服用中",

        source:
            document
                .getElementById("med-source")
                ?.value || "",

        memo:
            document
                .getElementById("med-memo")
                ?.value || ""

    };

    console.log(
        "保存するデータ:",
        medication
    );


    let result;


    // ==================================================
    // 編集
    // ==================================================

    if (editingMedicationId) {

        result =
            await supabaseClient
                .from("medications")
                .update(medication)
                .eq(
                    "id",
                    editingMedicationId
                );

    }


    // ==================================================
    // 新規登録
    // ==================================================

    else {

        result =
            await supabaseClient
                .from("medications")
                .insert(medication);

    }


    // ==================================================
    // 保存エラー
    // ==================================================

    if (result.error) {

        console.error(
            "保存エラー:",
            result.error
        );

        alert(
            "保存エラー\n" +
            result.error.message
        );

        return;
    }


    // ==================================================
    // 保存成功
    // ==================================================

    showToast(
        "保存しました"
    );

    editingMedicationId =
        null;

    document
        .getElementById("medication-form")
        ?.reset();

    document
        .getElementById("cancel-edit-btn")
        ?.classList.add("hidden");

    await loadMedications();

    showView("list");
}


// ==================================================
// 編集開始
// ==================================================

function editMedication(id) {

    const med =
        medications.find(
            m => m.id === id
        );

    if (!med) {
        return;
    }

    editingMedicationId =
        id;


    const fields = {

        "med-name":
            med.name || "",

        "med-strength":
            med.strength || "",

        "med-manufacturer":
            med.manufacturer || "",

        "med-category":
            med.category || "処方薬",

        "med-hospital":
            med.hospital || "",

        "med-department":
            med.department || "",

        "med-doctor":
            med.doctor || "",

        "med-stock":
            med.stock ?? 0,

        "med-unit":
            med.unit || "錠",

        "med-alert-threshold":
            med.alert_threshold ?? 5,

        "med-expiry":
            med.expiry || "",

        "med-dose-amount":
            med.dose_amount || "",

        "med-doses-per-day":
            med.doses_per_day ?? 0,

        "med-status":
            med.status || "服用中",

        "med-source":
            med.source || "",

        "image-url-text":
            med.image_url || "",

        "med-memo":
            med.memo || ""

    };


    Object.entries(fields).forEach(
        ([id, value]) => {

            const element =
                document.getElementById(id);

            if (element) {
                element.value =
                    value;
            }

        }
    );

// ===============================
// 服用タイミングを復元
// ===============================

document
    .querySelectorAll(
        '#timing-checkboxes input[type="checkbox"]'
    )
    .forEach(
        checkbox => {

            checkbox.checked =
                Array.isArray(med.timing) &&
                med.timing.includes(
                    checkbox.value
                );

        }
    );
    document
        .getElementById("cancel-edit-btn")
        ?.classList.remove("hidden");


    showView("add");
}


// ==================================================
// 削除
// ==================================================

async function deleteMedication(id) {

    if (
        !confirm(
            "この薬を削除しますか？"
        )
    ) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("medications")
            .delete()
            .eq(
                "id",
                id
            );


    if (error) {

        console.error(
            "削除エラー:",
            error
        );

        alert(
            "削除エラー\n" +
            error.message
        );

        return;
    }


    showToast(
        "削除しました"
    );


    await loadMedications();
}


// ==================================================
// ③ 薬一覧表示・検索・フィルター・並び替え
// ==================================================

function renderMedicationList() {

    const box =
        document.getElementById(
            "medication-cards-container"
        );

    if (!box) {
        return;
    }


    box.innerHTML = "";


    let list =
        [...medications];


    // ==================================================
    // 検索
    // ==================================================

    const searchValue =
        document
            .getElementById("search-input")
            ?.value
            .toLowerCase()
            .trim();


    if (searchValue) {

        list =
            list.filter(
                med =>
                    (
                        med.name ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            searchValue
                        )
            );
    }


    // ==================================================
    // 分類フィルター
    // ==================================================

    const category =
        document
            .getElementById("filter-category")
            ?.value ||
        "all";


    if (category !== "all") {

        list =
            list.filter(
                med =>
                    med.category === category
            );
    }


    // ==================================================
    // 状態フィルター
    // ==================================================

    const status =
        document
            .getElementById("filter-status")
            ?.value ||
        "all";


    if (status !== "all") {

        list =
            list.filter(
                med =>
                    med.status === status
            );
    }


    // ==================================================
    // 並び替え
    // ==================================================

    const sort =
        document
            .getElementById("sort-select")
            ?.value ||
        "name_asc";


    if (sort === "name_asc") {

        list.sort(
            (a, b) =>
                (a.name || "")
                    .localeCompare(
                        b.name || "",
                        "ja"
                    )
        );
    }


    if (sort === "expiry_asc") {

        list.sort(
            (a, b) =>
                new Date(
                    a.expiry ||
                    "9999-12-31"
                ) -
                new Date(
                    b.expiry ||
                    "9999-12-31"
                )
        );
    }


    if (sort === "stock_asc") {

        list.sort(
            (a, b) =>
                Number(a.stock || 0) -
                Number(b.stock || 0)
        );
    }


    if (sort === "created_desc") {

        list.sort(
            (a, b) =>
                new Date(
                    b.created_at
                ) -
                new Date(
                    a.created_at
                )
        );
    }


    // ==================================================
    // 件数
    // ==================================================

    const countLabel =
        document.getElementById(
            "list-count-label"
        );

    if (countLabel) {

        countLabel.textContent =
            `${list.length}件のお薬`;
    }


    // ==================================================
    // 空状態
    // ==================================================

    const empty =
        document.getElementById(
            "list-empty-state"
        );


    if (list.length === 0) {

        empty
            ?.classList
            .remove("hidden");

        return;

    } else {

        empty
            ?.classList
            .add("hidden");
    }


    // ==================================================
    // カード生成
    // ==================================================

    list.forEach(
        med => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "med-card";


            const imageHtml =
                med.image_url
                    ? `
                        <div class="med-card-img">
                            <img
                                src="${escapeHtml(med.image_url)}"
                                alt=""
                            >
                        </div>
                    `
                    : `
                        <div class="med-card-img">
                            <div class="placeholder-icon">
                                💊
                            </div>
                        </div>
                    `;


            card.innerHTML = `

                ${imageHtml}

                <div class="med-card-body">

                    <div class="med-card-main">

                        <div class="med-card-name">
                            ${escapeHtml(med.name || "")}
                        </div>

                        <div class="med-card-sub">
                            ${escapeHtml(med.strength || "")}
                            ${med.manufacturer
                                ? " / " + escapeHtml(med.manufacturer)
                                : ""}
                        </div>

                    </div>


                    <div class="med-card-stock">

                        <div class="med-card-label">
                            在庫
                        </div>

                        <div class="med-card-value">
                            ${Number(med.stock || 0)}
                            ${escapeHtml(med.unit || "")}
                        </div>

                        <div class="stock-bar-track">

                            <div
                                class="stock-bar-fill"
                                style="width:${getStockPercent(med)}%"
                            ></div>

                        </div>

                    </div>


                    <div class="med-card-expiry">

                        <div class="med-card-label">
                            使用期限
                        </div>

                        <div class="med-card-value">
                            ${escapeHtml(med.expiry || "-")}
                        </div>

                    </div>


                    <div class="med-card-source">

                        <div class="med-card-label">
                            入手先
                        </div>

                        <div class="med-card-value">
                            ${escapeHtml(med.source || "-")}
                        </div>

                    </div>


                    <div class="med-card-memo">

                        <div class="med-card-label">
                            メモ
                        </div>

                        <div class="med-card-value">
                            ${escapeHtml(med.memo || "-")}
                        </div>

                    </div>

                </div>


                <div class="med-card-actions">

                    <button
                        type="button"
                        class="icon-btn"
                        title="編集"
                        onclick="editMedication('${med.id}')"
                    >
                        ✏️
                    </button>

                    <button
                        type="button"
                        class="icon-btn danger"
                        title="削除"
                        onclick="deleteMedication('${med.id}')"
                    >
                        🗑️
                    </button>

                </div>

            `;


            box.appendChild(card);

        }
    );
}


// ==================================================
// HTMLエスケープ
// ==================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==================================================
// 在庫バー
// ==================================================

function getStockPercent(med) {

    const stock =
        Number(med.stock || 0);

    const threshold =
        Number(
            med.alert_threshold || 5
        );

    if (threshold <= 0) {
        return stock > 0 ? 100 : 0;
    }

    return Math.min(
        100,
        Math.max(
            0,
            (stock / (threshold * 4)) * 100
        )
    );
}


// ==================================================
// 検索・フィルターイベント
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const targets = [

            "search-input",
            "filter-category",
            "filter-status",
            "sort-select"

        ];


        targets.forEach(
            id => {

                const el =
                    document.getElementById(id);

                if (el) {

                    el.addEventListener(
                        "input",
                        () => {
                            renderMedicationList();
                        }
                    );

                    el.addEventListener(
                        "change",
                        () => {
                            renderMedicationList();
                        }
                    );

                }

            }
        );

    }
);


// ==================================================
// ④ 服用記録・服用履歴・在庫減算
// ==================================================


// ==================================================
// 服用記録取得
// ==================================================

async function loadDoseLogs() {

    if (!currentUser) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("dose_logs")
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "taken_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "服用記録取得エラー:",
            error
        );

        return;
    }


    doseLogs =
        data || [];


    renderDoseLogs();
}


// ==================================================
// 服用記録保存
// ==================================================

async function saveDoseLog() {

    if (!currentUser) {

        alert(
            "ログインしてください"
        );

        return;
    }


    const medicationId =
        document
            .getElementById(
                "log-med-select"
            )
            ?.value;


    const amount =
        document
            .getElementById(
                "log-amount"
            )
            ?.value || "";


    const datetime =
        document
            .getElementById(
                "log-datetime"
            )
            ?.value;


    const timing =
        document
            .getElementById(
                "log-timing"
            )
            ?.value || "";


    const notes =
        document
            .getElementById(
                "log-notes"
            )
            ?.value || "";


    if (!medicationId) {

        alert(
            "薬を選択してください"
        );

        return;
    }


    const takenAt =
        datetime
            ? new Date(datetime).toISOString()
            : new Date().toISOString();


    const {
        error
    } =
        await supabaseClient
            .from("dose_logs")
            .insert({

                user_id:
                    currentUser.id,

                medication_id:
                    medicationId,

                amount:
                    amount,

                timing:
                    timing,

                notes:
                    notes,

                taken_at:
                    takenAt

            });


    if (error) {

        console.error(
            "服用記録エラー:",
            error
        );

        alert(
            "記録エラー\n" +
            error.message
        );

        return;
    }


    // ==================================================
    // 在庫減算
    // ==================================================

    const med =
        medications.find(
            m =>
                String(m.id) ===
                String(medicationId)
        );


    if (med) {

        const numbers =
            String(amount)
                .match(/[0-9.]+/);

        const useAmount =
            numbers
                ? Number(numbers[0])
                : 1;


        await supabaseClient
            .from("medications")
            .update({

                stock:
                    Math.max(
                        0,
                        Number(
                            med.stock || 0
                        ) -
                        useAmount
                    )

            })
            .eq(
                "id",
                medicationId
            );
    }


    showToast(
        "服用を記録しました"
    );


    await loadMedications();

    await loadDoseLogs();
}


// ==================================================
// 服用履歴表示
// ==================================================

function renderDoseLogs() {

    const box =
        document.getElementById(
            "dose-log-history"
        );


    if (!box) {
        return;
    }


    box.innerHTML = "";


    if (doseLogs.length === 0) {

        document
            .getElementById(
                "doselog-empty-state"
            )
            ?.classList
            .remove("hidden");

        return;

    } else {

        document
            .getElementById(
                "doselog-empty-state"
            )
            ?.classList
            .add("hidden");
    }


    doseLogs.forEach(
        log => {

            const med =
                medications.find(
                    m =>
                        String(m.id) ===
                        String(log.medication_id)
                );


            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "log-entry";


            const date =
                log.taken_at
                    ? new Date(
                        log.taken_at
                    ).toLocaleString(
                        "ja-JP"
                    )
                    : "";


            div.innerHTML = `

                <div>

                    <div class="font-bold">
                        ${escapeHtml(
                            med?.name ||
                            "不明なお薬"
                        )}
                    </div>

                    <div class="text-sm text-slate-500">
                        ${escapeHtml(
                            log.amount || ""
                        )}
                        ${escapeHtml(
                            log.timing || ""
                        )}
                    </div>

                </div>


                <div class="text-right">

                    <div class="text-sm">
                        ${escapeHtml(date)}
                    </div>

                    <div class="text-sm text-slate-500">
                        ${escapeHtml(
                            log.notes || ""
                        )}
                    </div>

                </div>

            `;


            box.appendChild(div);

        }
    );
}


// ==================================================
// 服用薬選択欄更新
// ==================================================

function updateDoseSelect() {

    const select =
        document.getElementById(
            "log-med-select"
        );


    if (!select) {
        return;
    }


    select.innerHTML = "";


    if (medications.length === 0) {

        const option =
            document.createElement(
                "option"
            );

        option.value = "";

        option.textContent =
            "登録されているお薬がありません";

        select.appendChild(
            option
        );

        return;
    }


    medications.forEach(
        med => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                med.id;


            option.textContent =
                med.name;


            select.appendChild(
                option
            );

        }
    );
}


// ==================================================
// 服用フォーム送信
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "dose-log-form"
            );


        if (form) {

            form.addEventListener(
                "submit",
                e => {

                    e.preventDefault();

                    saveDoseLog();

                }
            );

        }

    }
);


// ==================================================
// ⑤ ダッシュボード・通知・初期化
// ==================================================


// ==================================================
// ダッシュボード更新
// ==================================================

function updateDashboard() {

    const total =
        document.getElementById(
            "stat-total"
        );


    const active =
        document.getElementById(
            "stat-active"
        );


    const low =
        document.getElementById(
            "stat-low"
        );


    const warning =
        document.getElementById(
            "stat-warning"
        );


    if (total) {

        total.textContent =
            medications.length;
    }


    if (active) {

        active.textContent =
            medications.filter(
                m =>
                    m.status ===
                    "服用中"
            ).length;
    }


    if (low) {

        low.textContent =
            medications.filter(
                m =>
                    Number(
                        m.stock || 0
                    ) <=
                    Number(
                        m.alert_threshold || 0
                    )
            ).length;
    }


    if (warning) {

        warning.textContent =
            medications.filter(
                m => {

                    if (!m.expiry) {
                        return false;
                    }


                    const today =
                        new Date();


                    const expiry =
                        new Date(
                            m.expiry
                        );


                    const diff =
                        (
                            expiry -
                            today
                        ) /
                        (
                            1000 *
                            60 *
                            60 *
                            24
                        );


                    return diff >= 0 &&
                           diff <= 30;

                }
            ).length;
    }
}


// ==================================================
// 画面切替
// ==================================================

function showView(viewName) {

    document
        .querySelectorAll(
            ".view-section"
        )
        .forEach(
            section => {

                section.classList.add(
                    "hidden"
                );

            }
        );


    const target =
        document.getElementById(
            "view-" + viewName
        );


    if (target) {

        target.classList.remove(
            "hidden"
        );
    }


    document
        .querySelectorAll(
            ".nav-btn"
        )
        .forEach(
            btn => {

                btn.classList.remove(
                    "active-nav"
                );

            }
        );


    const activeBtn =
        document.querySelector(
            `.nav-btn[data-view="${viewName}"]`
        );


    if (activeBtn) {

        activeBtn.classList.add(
            "active-nav"
        );
    }


    if (viewName === "doselog") {

        updateDoseSelect();
        renderDoseLogs();

    }


    if (viewName === "list") {

        renderMedicationList();

    }


    if (viewName === "stats") {

        updateStats();

    }


    if (viewName === "notifications") {

        updateNotifications();

    }
}


// ==================================================
// ブラウザ通知
// ==================================================

async function enableNotification() {

    if (!("Notification" in window)) {

        alert(
            "このブラウザは通知非対応です"
        );

        return;
    }


    const permission =
        await Notification.requestPermission();


    if (permission === "granted") {

        new Notification(
            "お薬手帳",
            {
                body:
                    "通知を有効化しました"
            }
        );


        showToast(
            "通知を有効化しました"
        );

    } else {

        alert(
            "通知が許可されませんでした。"
        );

    }
}


// ==================================================
// 通知ボタン
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const btn =
            document.getElementById(
                "enable-browser-notif"
            );


        if (btn) {

            btn.addEventListener(
                "click",
                enableNotification
            );

        }

    }
);


// ==================================================
// 初期化処理
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // ------------------------------------------
        // 薬保存フォーム
        // ------------------------------------------

        const medForm =
            document.getElementById(
                "medication-form"
            );


        if (medForm) {

            medForm.addEventListener(
                "submit",
                e => {

                    e.preventDefault();

                    saveMedication();

                }
            );

        }


        // ------------------------------------------
        // キャンセル
        // ------------------------------------------

        const cancel =
            document.getElementById(
                "cancel-edit-btn"
            );


        if (cancel) {

            cancel.addEventListener(
                "click",
                () => {

                    editingMedicationId =
                        null;


                    medForm?.reset();


                    cancel.classList.add(
                        "hidden"
                    );


                    showView(
                        "list"
                    );

                }
            );

        }


        // ------------------------------------------
        // ナビゲーション
        // ------------------------------------------

        document
            .querySelectorAll(
                ".nav-btn"
            )
            .forEach(
                btn => {

                    btn.addEventListener(
                        "click",
                        () => {

                            const view =
                                btn.dataset.view;


                            if (view) {

                                showView(
                                    view
                                );

                            }

                        }
                    );

                }
            );


        // ------------------------------------------
        // 初期値
        // ------------------------------------------

        const datetime =
            document.getElementById(
                "log-datetime"
            );


        if (
            datetime &&
            !datetime.value
        ) {

            const now =
                new Date();


            const local =
                new Date(
                    now.getTime() -
                    now.getTimezoneOffset() *
                    60000
                )
                    .toISOString()
                    .slice(
                        0,
                        16
                    );


            datetime.value =
                local;
        }

    }
);


// ==================================================
// 統計
// ==================================================

function updateStats() {

    const dose14 =
        document.getElementById(
            "stats-dose-14"
        );

    const category =
        document.getElementById(
            "stats-category"
        );

    const ranking =
        document.getElementById(
            "stats-ranking"
        );

    const lowStock =
        document.getElementById(
            "stats-low-stock"
        );


    if (dose14) {

        const now =
            new Date();

        const start =
            new Date(
                now
            );

        start.setDate(
            start.getDate() - 13
        );

        const count =
            doseLogs.filter(
                log => {

                    if (!log.taken_at) {
                        return false;
                    }

                    const date =
                        new Date(
                            log.taken_at
                        );

                    return date >= start &&
                           date <= now;
                }
            ).length;


        dose14.innerHTML = `
            <div class="text-3xl font-bold">
                ${count}
            </div>
            <div class="text-sm text-slate-500">
                回
            </div>
        `;
    }


    if (category) {

        const counts = {};

        medications.forEach(
            med => {

                const key =
                    med.category ||
                    "その他";

                counts[key] =
                    (counts[key] || 0) + 1;

            }
        );


        category.innerHTML =
            Object.entries(counts)
                .map(
                    ([key, value]) => `
                        <div class="flex justify-between py-1">
                            <span>${escapeHtml(key)}</span>
                            <strong>${value}件</strong>
                        </div>
                    `
                )
                .join("") ||
            `<div class="text-slate-500">データがありません</div>`;
    }


    if (ranking) {

        const counts = {};


        doseLogs.forEach(
            log => {

                const id =
                    String(
                        log.medication_id
                    );

                counts[id] =
                    (counts[id] || 0) + 1;

            }
        );


        ranking.innerHTML =
            Object.entries(counts)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )
                .slice(
                    0,
                    10
                )
                .map(
                    ([id, count]) => {

                        const med =
                            medications.find(
                                m =>
                                    String(m.id) === id
                            );

                        return `
                            <div class="flex justify-between py-1">
                                <span>
                                    ${escapeHtml(
                                        med?.name ||
                                        "不明なお薬"
                                    )}
                                </span>
                                <strong>${count}回</strong>
                            </div>
                        `;

                    }
                )
                .join("") ||
            `<div class="text-slate-500">データがありません</div>`;
    }


    if (lowStock) {

        const list =
            medications.filter(
                med =>
                    Number(
                        med.stock || 0
                    ) <=
                    Number(
                        med.alert_threshold || 0
                    )
            );


        lowStock.innerHTML =
            list.map(
                med => `
                    <div class="flex justify-between py-1">
                        <span>
                            ${escapeHtml(
                                med.name
                            )}
                        </span>
                        <strong>
                            ${Number(
                                med.stock || 0
                            )}${escapeHtml(
                                med.unit || ""
                            )}
                        </strong>
                    </div>
                `
            )
            .join("") ||
            `<div class="text-slate-500">ありません</div>`;
    }
}


// ==================================================
// 通知一覧
// ==================================================

function updateNotifications() {

    const expiryList =
        document.getElementById(
            "notif-expiry-list"
        );

    const stockList =
        document.getElementById(
            "notif-stock-list"
        );


    const alertDays =
        Number(
            document.getElementById(
                "expiry-alert-days"
            )?.value || 30
        );


    const today =
        new Date();


    if (expiryList) {

        const list =
            medications.filter(
                med => {

                    if (!med.expiry) {
                        return false;
                    }


                    const expiry =
                        new Date(
                            med.expiry
                        );


                    const diff =
                        (
                            expiry -
                            today
                        ) /
                        (
                            1000 *
                            60 *
                            60 *
                            24
                        );


                    return diff >= 0 &&
                           diff <= alertDays;

                }
            );


        expiryList.innerHTML =
            list.map(
                med => `
                    <div class="warning-item">
                        <span>⚠️</span>
                        <span>
                            ${escapeHtml(
                                med.name
                            )}
                            の使用期限は
                            ${escapeHtml(
                                med.expiry
                            )}です。
                        </span>
                    </div>
                `
            )
            .join("") ||
            `<div class="text-slate-500">期限が近いお薬はありません。</div>`;
    }


    if (stockList) {

        const list =
            medications.filter(
                med =>
                    Number(
                        med.stock || 0
                    ) <=
                    Number(
                        med.alert_threshold || 0
                    )
            );


        stockList.innerHTML =
            list.map(
                med => `
                    <div class="warning-item">
                        <span>⚠️</span>
                        <span>
                            ${escapeHtml(
                                med.name
                            )}
                            の在庫が
                            ${Number(
                                med.stock || 0
                            )}${escapeHtml(
                                med.unit || ""
                            )}です。
                        </span>
                    </div>
                `
            )
            .join("") ||
            `<div class="text-slate-500">在庫不足のお薬はありません。</div>`;
    }
}


// ==================================================
// 期限アラート日数変更
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const input =
            document.getElementById(
                "expiry-alert-days"
            );


        if (input) {

            input.addEventListener(
                "change",
                updateNotifications
            );

        }

    }
);
