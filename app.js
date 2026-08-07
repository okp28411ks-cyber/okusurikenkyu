// =====================================================
// お薬手帳アプリ app.js
// ① Supabase設定・認証・起動
// =====================================================


// ===============================
// Supabase 設定
// ===============================

const SUPABASE_URL =
"https://nmstudwvvmbttfhanuyu.supabase.co";

const SUPABASE_KEY =
"sb_publishable_DagUSgICo4JTVxwimcZKDw_NYBHPzSf";


const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ===============================
// グローバル変数
// ===============================

let currentUser = null;

let medications = [];

let doseLogs = [];

let editingMedicationId = null;

let currentImageFile = null;

let charts = {};


// ===============================
// アプリ起動
// ===============================

document.addEventListener(
"DOMContentLoaded",
()=>{

    checkSession();

    setupEvents();

});


// ===============================
// セッション確認
// ===============================

async function checkSession(){

    const {
        data,
        error
    } =
    await supabaseClient.auth.getSession();


    if(error){

        console.error(error);

        showLogin();

        return;

    }


    const session =
    data.session;


    if(session){

        currentUser =
        session.user;


        showApp(
            currentUser
        );


    }else{

        showLogin();

    }

}



// ===============================
// ログイン画面表示
// ===============================

function showLogin(){

    const login =
    document.getElementById(
        "login-area"
    );


    const app =
    document.getElementById(
        "app-area"
    );


    if(login){

        login.classList.remove(
            "hidden"
        );

    }


    if(app){

        app.classList.add(
            "hidden"
        );

    }

}



// ===============================
// アプリ表示
// ===============================

async function showApp(user){

    const login =
    document.getElementById(
        "login-area"
    );


    const app =
    document.getElementById(
        "app-area"
    );


    if(login){

        login.classList.add(
            "hidden"
        );

    }


    if(app){

        app.classList.remove(
            "hidden"
        );

    }


    currentUser = user;


    await loadMedications();

    await loadDoseLogs();


}



// ===============================
// 会員登録
// ===============================

async function signUp(
email,
password
){


    const {
        error
    } =
    await supabaseClient.auth.signUp({

        email,

        password

    });



    if(error){

        alert(
            "登録エラー:\n"
            +
            error.message
        );

        return false;

    }


    alert(
        "登録しました。\n確認メールをご確認ください。"
    );


    return true;

}



// ===============================
// ログイン
// ===============================

async function signIn(
email,
password
){


    const {
        data,
        error
    } =
    await supabaseClient.auth.signInWithPassword({

        email,

        password

    });



    if(error){

        alert(
            "ログインエラー:\n"
            +
            error.message
        );


        return false;

    }



    currentUser =
    data.user;



    showApp(
        currentUser
    );


    return true;


}



// ===============================
// ログアウト
// ===============================

async function signOut(){


    await supabaseClient.auth.signOut();


    currentUser = null;


    location.reload();


}



// ===============================
// Supabase認証状態監視
// ===============================

supabaseClient.auth.onAuthStateChange(
(event,session)=>{


    if(session){


        currentUser =
        session.user;


    }else{


        currentUser =
        null;


    }


});
// =====================================================
// ② お薬データ取得・保存・編集・削除
// =====================================================


// ===============================
// お薬データ取得
// ===============================

async function loadMedications(){

    if(!currentUser){

        return;

    }


    const {
        data,
        error
    }
    =
    await supabaseClient
    .from("medications")
    .select("*")
    .eq(
        "user_id",
        currentUser.id
    )
    .order(
        "created_at",
        {
            ascending:false
        }
    );



    if(error){

        console.error(
            "薬データ取得エラー:",
            error
        );

        return;

    }



    medications =
    data || [];



    renderMedicationList();


    updateDashboard();


}




// ===============================
// お薬保存
// ===============================

async function saveMedication(){


    if(!currentUser){

        alert(
            "ログインしてください"
        );

        return;

    }



    const medication = {


        user_id:
        currentUser.id,


        name:
        document.getElementById(
            "med-name"
        )?.value || "",


        strength:
        document.getElementById(
            "med-strength"
        )?.value || "",


        manufacturer:
        document.getElementById(
            "med-manufacturer"
        )?.value || "",


        category:
        document.getElementById(
            "med-category"
        )?.value || "その他",



        hospital:
        document.getElementById(
            "med-hospital"
        )?.value || "",



        department:
        document.getElementById(
            "med-department"
        )?.value || "",



        doctor:
        document.getElementById(
            "med-doctor"
        )?.value || "",



        stock:
        Number(
            document.getElementById(
                "med-stock"
            )?.value || 0
        ),



        unit:
        document.getElementById(
            "med-unit"
        )?.value || "錠",



        alert_threshold:
        Number(
            document.getElementById(
                "med-alert-threshold"
            )?.value || 5
        ),



        expiry:
        document.getElementById(
            "med-expiry"
        )?.value || null,



        dose_amount:
        document.getElementById(
            "med-dose-amount"
        )?.value || "",



        doses_per_day:
        Number(
            document.getElementById(
                "med-doses-per-day"
            )?.value || 0
        ),



        status:
        document.getElementById(
            "med-status"
        )?.value || "服用中",



        source:
        document.getElementById(
            "med-source"
        )?.value || "",



        memo:
        document.getElementById(
            "med-memo"
        )?.value || ""

    };





    let result;



    // 編集の場合

    if(editingMedicationId){


        result =
        await supabaseClient
        .from("medications")
        .update(
            medication
        )
        .eq(
            "id",
            editingMedicationId
        );



    }


    // 新規登録の場合

    else{


        result =
        await supabaseClient
        .from("medications")
        .insert(
            medication
        );


    }





    if(result.error){


        alert(
            "保存エラー:\n"
            +
            result.error.message
        );


        return;


    }





    alert(
        "保存しました"
    );



    editingMedicationId =
    null;



    document.getElementById(
        "medication-form"
    )
    ?.reset();



    await loadMedications();


}




// ===============================
// 編集開始
// ===============================

function editMedication(id){


    const med =
    medications.find(
        m=>m.id===id
    );



    if(!med){

        return;

    }



    editingMedicationId =
    id;



    document.getElementById(
        "med-name"
    ).value =
    med.name || "";



    document.getElementById(
        "med-strength"
    ).value =
    med.strength || "";



    document.getElementById(
        "med-manufacturer"
    ).value =
    med.manufacturer || "";



    document.getElementById(
        "med-category"
    ).value =
    med.category || "その他";



    document.getElementById(
        "med-stock"
    ).value =
    med.stock || 0;



    document.getElementById(
        "med-unit"
    ).value =
    med.unit || "錠";



    document.getElementById(
        "med-alert-threshold"
    ).value =
    med.alert_threshold || 5;



    document.getElementById(
        "med-expiry"
    ).value =
    med.expiry || "";



    document.getElementById(
        "med-dose-amount"
    ).value =
    med.dose_amount || "";



    document.getElementById(
        "med-doses-per-day"
    ).value =
    med.doses_per_day || 0;



    document.getElementById(
        "med-status"
    ).value =
    med.status || "服用中";



    document.getElementById(
        "med-source"
    ).value =
    med.source || "";



    document.getElementById(
        "med-memo"
    ).value =
    med.memo || "";



    showView(
        "add"
    );


}



// ===============================
// お薬削除
// ===============================

async function deleteMedication(id){


    if(
        !confirm(
            "このお薬を削除しますか？"
        )
    ){

        return;

    }




    const {
        error
    }
    =
    await supabaseClient
    .from("medications")
    .delete()
    .eq(
        "id",
        id
    );




    if(error){


        alert(
            "削除エラー:\n"
            +
            error.message
        );


        return;


    }



    await loadMedications();



}
// =====================================================
// ③ お薬一覧表示・カード生成
// =====================================================


// ===============================
// お薬一覧表示
// ===============================

function renderMedicationList(){


    const box =
    document.getElementById(
        "medication-cards-container"
    );



    if(!box){

        return;

    }



    box.innerHTML = "";



    const empty =
    document.getElementById(
        "list-empty-state"
    );



    if(
        medications.length === 0
    ){


        if(empty){

            empty.classList.remove(
                "hidden"
            );

        }


        return;

    }



    if(empty){

        empty.classList.add(
            "hidden"
        );

    }





    medications.forEach(
    med=>{


        const card =
        document.createElement(
            "div"
        );



        card.className =
        "med-card";




        card.innerHTML = `


        <div class="med-card-img">

            ${
                med.image_url

                ?

                `<img src="${med.image_url}" alt="${med.name}">`

                :

                `<div class="placeholder-icon">
                    <i class="fa-solid fa-pills"></i>
                 </div>`

            }

        </div>



        <div class="med-card-body">


            <div class="med-card-main">


                <div class="med-card-name">


                    ${escapeHTML(
                        med.name || ""
                    )}



                    <span class="badge badge-blue">

                        ${escapeHTML(
                            med.category || ""
                        )}

                    </span>


                </div>



                <div class="med-card-sub">

                    ${escapeHTML(
                        med.strength || ""
                    )}

                    ${
                        med.manufacturer
                        ?
                        " / " +
                        escapeHTML(
                            med.manufacturer
                        )
                        :
                        ""
                    }

                </div>


            </div>




            <div class="med-card-stock">


                <div class="med-card-label">

                    在庫

                </div>



                <div class="med-card-value">


                    ${med.stock || 0}

                    ${escapeHTML(
                        med.unit || ""
                    )}


                </div>



                <div class="stock-bar-track">


                    <div
                    class="stock-bar-fill bg-brand-500"
                    style="
                    width:${getStockPercent(med)}%
                    ">
                    </div>


                </div>


            </div>





            <div class="med-card-expiry">


                <div class="med-card-label">

                    使用期限

                </div>



                <div class="med-card-value">


                    ${
                        med.expiry
                        ?
                        med.expiry
                        :
                        "-"
                    }


                </div>


            </div>





            <div class="med-card-source">


                <div class="med-card-label">

                    入手先

                </div>



                <div class="med-card-value">

                    ${
                        med.source
                        ?
                        escapeHTML(
                            med.source
                        )
                        :
                        "-"
                    }

                </div>


            </div>






            <div class="med-card-memo">


                <div class="med-card-label">

                    メモ

                </div>



                <div class="med-card-value">


                    ${
                        med.memo
                        ?
                        escapeHTML(
                            med.memo
                        )
                        :
                        "-"
                    }


                </div>


            </div>



        </div>





        <div class="med-card-actions">


            <button
            class="icon-btn"
            onclick="
            editMedication('${med.id}')
            ">

                <i class="fa-solid fa-pen"></i>

            </button>





            <button
            class="icon-btn danger"
            onclick="
            deleteMedication('${med.id}')
            ">

                <i class="fa-solid fa-trash"></i>

            </button>


        </div>



        `;




        box.appendChild(
            card
        );



    });


}



// ===============================
// 在庫バー計算
// ===============================

function getStockPercent(med){


    const stock =
    Number(
        med.stock || 0
    );



    const threshold =
    Number(
        med.alert_threshold || 5
    );



    if(threshold <= 0){

        return 100;

    }



    let percent =
    (stock / (threshold * 3))
    * 100;



    if(percent > 100){

        percent = 100;

    }



    if(percent < 0){

        percent = 0;

    }



    return percent;


}



// ===============================
// HTMLエスケープ
// ===============================

function escapeHTML(str){


    return String(str)

    .replace(
        /&/g,
        "&amp;"
    )

    .replace(
        /</g,
        "&lt;"
    )

    .replace(
        />/g,
        "&gt;"
    )

    .replace(
        /"/g,
        "&quot;"
    )

    .replace(
        /'/g,
        "&#039;"
    );


}
// ===============================
// ④ 検索・分類・状態・並び替え
// ===============================

function applyMedicationFilters(){

    const keyword =
        document
        .getElementById("search-input")
        ?.value
        .toLowerCase()
        || "";


    const category =
        document
        .getElementById("filter-category")
        ?.value
        || "all";


    const status =
        document
        .getElementById("filter-status")
        ?.value
        || "all";


    const sort =
        document
        .getElementById("sort-select")
        ?.value
        || "name_asc";



    let filtered = [...medications];



    // -------------------------------
    // 名前検索
    // -------------------------------

    if(keyword){

        filtered =
        filtered.filter(med=>{

            return (

                (med.name || "")
                .toLowerCase()
                .includes(keyword)

                ||

                (med.manufacturer || "")
                .toLowerCase()
                .includes(keyword)

                ||

                (med.memo || "")
                .toLowerCase()
                .includes(keyword)

            );

        });

    }



    // -------------------------------
    // 分類フィルター
    // -------------------------------

    if(category !== "all"){

        filtered =
        filtered.filter(
            med =>
            med.category === category
        );

    }



    // -------------------------------
    // 状態フィルター
    // -------------------------------

    if(status !== "all"){

        filtered =
        filtered.filter(
            med =>
            med.status === status
        );

    }




    // -------------------------------
    // 並び替え
    // -------------------------------

    switch(sort){


        // 名前順

        case "name_asc":

            filtered.sort(
                (a,b)=>
                (a.name || "")
                .localeCompare(
                    b.name || "",
                    "ja"
                )
            );

        break;



        // 使用期限が近い順

        case "expiry_asc":

            filtered.sort(
                (a,b)=>{

                    if(!a.expiry)
                        return 1;

                    if(!b.expiry)
                        return -1;


                    return new Date(a.expiry)
                    -
                    new Date(b.expiry);

                }
            );

        break;



        // 在庫少ない順

        case "stock_asc":

            filtered.sort(
                (a,b)=>

                Number(a.stock || 0)
                -
                Number(b.stock || 0)

            );

        break;



        // 登録新しい順

        case "created_desc":

            filtered.sort(
                (a,b)=>

                new Date(b.created_at)
                -
                new Date(a.created_at)

            );

        break;


    }



    renderFilteredMedicationList(filtered);

}



// ===============================
// フィルター表示用
// ===============================

function renderFilteredMedicationList(list){


    const box =
    document.getElementById(
        "medication-cards-container"
    );


    if(!box)
        return;



    box.innerHTML="";



    const count =
    document.getElementById(
        "list-count-label"
    );


    if(count){

        count.textContent =
        `${list.length}件のお薬`;

    }



    if(list.length===0){


        document
        .getElementById(
            "list-empty-state"
        )
        ?.classList
        .remove("hidden");


        return;

    }



    document
    .getElementById(
        "list-empty-state"
    )
    ?.classList
    .add("hidden");




    list.forEach(med=>{


        const card =
        document.createElement("div");


        card.className =
        "med-card";



        card.innerHTML = `

        <div class="med-card-body">


            <div class="med-card-main">

                <div class="med-card-name">

                    ${med.name || ""}

                    <span class="badge badge-blue">
                    ${med.category || ""}
                    </span>

                </div>


                <div class="med-card-sub">

                    ${med.strength || ""}

                    ${med.manufacturer || ""}

                </div>


            </div>



            <div class="med-card-stock">

                <div class="med-card-label">
                在庫
                </div>

                <div class="med-card-value">

                ${med.stock || 0}
                ${med.unit || ""}

                </div>

            </div>



            <div class="med-card-expiry">

                <div class="med-card-label">
                使用期限
                </div>


                <div class="med-card-value">

                ${med.expiry || "-"}

                </div>

            </div>




            <div class="med-card-source">

                <div class="med-card-label">
                状態
                </div>


                <div class="med-card-value">

                ${med.status || "-"}

                </div>


            </div>




            <div class="med-card-actions">


                <button
                class="icon-btn"
                onclick="editMedication('${med.id}')">

                <i class="fa-solid fa-pen"></i>

                </button>



                <button
                class="icon-btn danger"
                onclick="deleteMedication('${med.id}')">

                <i class="fa-solid fa-trash"></i>

                </button>


            </div>



        </div>

        `;


        box.appendChild(card);


    });


}



// ===============================
// フィルターイベント
// ===============================


document.addEventListener(
"DOMContentLoaded",
()=>{


    document
    .getElementById("search-input")
    ?.addEventListener(
        "input",
        applyMedicationFilters
    );



    document
    .getElementById("filter-category")
    ?.addEventListener(
        "change",
        applyMedicationFilters
    );



    document
    .getElementById("filter-status")
    ?.addEventListener(
        "change",
        applyMedicationFilters
    );



    document
    .getElementById("sort-select")
    ?.addEventListener(
        "change",
        applyMedicationFilters
    );


});
