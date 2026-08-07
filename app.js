// ===============================
// Supabase 設定
// ===============================

const SUPABASE_URL = "https://nmstudwvvmbttfhanuyu.supabase.co";
const SUPABASE_KEY = "sb_publishable_DagUSgICo4JTVxwimcZKDw_NYBHPzSf";

const supabaseClient = supabase.createClient(
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


// ===============================
// 起動
// ===============================

document.addEventListener("DOMContentLoaded", () => {

  checkSession();

});


// ===============================
// セッション確認
// ===============================

async function checkSession(){

  const {
    data:{
      session
    }
  } = await supabaseClient.auth.getSession();


  if(session){

    currentUser = session.user;

    showApp(currentUser);

  }else{

    showLogin();

  }

}


// ===============================
// ログイン画面表示
// ===============================

function showLogin(){

  const login =
  document.getElementById("login-area");

  const app =
  document.getElementById("app-area");


  if(login)
    login.classList.remove("hidden");


  if(app)
    app.classList.add("hidden");

}



// ===============================
// アプリ表示
// ===============================

function showApp(user){

  const login =
  document.getElementById("login-area");

  const app =
  document.getElementById("app-area");


  if(login)
    login.classList.add("hidden");


  if(app)
    app.classList.remove("hidden");


  loadMedications();

}



// ===============================
// 会員登録
// ===============================

async function signUp(email,password){

  const {
    data,
    error
  } = await supabaseClient.auth.signUp({

    email,
    password

  });


  if(error){

    alert(
      "登録エラー: "
      + error.message
    );

    return;

  }


  alert(
    "登録しました。確認メールを確認してください。"
  );

}



// ===============================
// ログイン
// ===============================

async function signIn(email,password){

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
      "ログインエラー: "
      + error.message
    );

    return;

  }


  currentUser = data.user;

  showApp(currentUser);

}



// ===============================
// ログアウト
// ===============================

async function signOut(){

  await supabaseClient.auth.signOut();

  location.reload();

}
// ===============================
// 薬データ取得
// ===============================

async function loadMedications(){

  if(!currentUser) return;


  const {
    data,
    error
  } =
  await supabaseClient
  .from("medications")
  .select("*")
  .eq("user_id", currentUser.id)
  .order("created_at",{ascending:false});


  if(error){

    console.error(error);

    return;

  }


  medications = data || [];


  renderMedicationList();

  updateDashboard();

}



// ===============================
// 薬登録
// ===============================

async function saveMedication(){


  const medication = {

    user_id: currentUser.id,

    name:
    document.getElementById("med-name").value,

    strength:
    document.getElementById("med-strength").value,

    manufacturer:
    document.getElementById("med-manufacturer").value,

    category:
    document.getElementById("med-category").value,


    hospital:
    document.getElementById("med-hospital").value,


    department:
    document.getElementById("med-department").value,


    doctor:
    document.getElementById("med-doctor").value,


    stock:
    Number(
      document.getElementById("med-stock").value
    ),


    unit:
    document.getElementById("med-unit").value,


    alert_threshold:
    Number(
      document.getElementById("med-alert-threshold").value
    ),


    expiry:
    document.getElementById("med-expiry").value,


    dose_amount:
    document.getElementById("med-dose-amount").value,


    doses_per_day:
    Number(
      document.getElementById("med-doses-per-day").value
    ),


    status:
    document.getElementById("med-status").value,


    source:
    document.getElementById("med-source").value,


    memo:
    document.getElementById("med-memo").value

  };



  let result;


  if(editingMedicationId){


    result =
    await supabaseClient
    .from("medications")
    .update(medication)
    .eq(
      "id",
      editingMedicationId
    );


  }else{


    result =
    await supabaseClient
    .from("medications")
    .insert(medication);


  }



  if(result.error){

    alert(
      "保存エラー: "
      + result.error.message
    );

    return;

  }



  alert("保存しました");


  editingMedicationId = null;


  document
  .getElementById("medication-form")
  .reset();


  loadMedications();

}



// ===============================
// 薬一覧表示
// ===============================

function renderMedicationList(){


  const box =
  document.getElementById(
    "medication-cards-container"
  );


  if(!box) return;


  box.innerHTML="";



  if(medications.length===0){

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



  medications.forEach(med=>{


    const card = document.createElement("div");


    card.className="med-card";



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
// 編集
// ===============================

function editMedication(id){


  const med =
  medications.find(
    m=>m.id===id
  );


  if(!med) return;


  editingMedicationId=id;



  document.getElementById("med-name").value =
  med.name || "";


  document.getElementById("med-strength").value =
  med.strength || "";


  document.getElementById("med-manufacturer").value =
  med.manufacturer || "";


  document.getElementById("med-stock").value =
  med.stock || 0;


  document.getElementById("med-memo").value =
  med.memo || "";


  showView("add");


}



// ===============================
// 削除
// ===============================

async function deleteMedication(id){


  if(!confirm("削除しますか？"))
  return;



  const {
    error
  } =
  await supabaseClient
  .from("medications")
  .delete()
  .eq("id",id);



  if(error){

    alert(error.message);

    return;

  }


  loadMedications();


}

// ===============================
// 画面切替
// ===============================

function showView(viewName){

  document
  .querySelectorAll(".view-section")
  .forEach(section=>{

    section.classList.add("hidden");

  });


  const target =
  document.getElementById(
    "view-" + viewName
  );


  if(target){

    target.classList.remove("hidden");

  }


  document
  .querySelectorAll(".nav-btn")
  .forEach(btn=>{

    btn.classList.remove("active-nav");

  });

}



// ===============================
// ダッシュボード更新
// ===============================

function updateDashboard(){


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



  if(total)
    total.textContent =
    medications.length;



  if(active)
    active.textContent =
    medications.filter(
      m=>m.status==="服用中"
    ).length;



  if(low)
    low.textContent =
    medications.filter(
      m=>
      Number(m.stock)
      <=
      Number(m.alert_threshold)
    ).length;



  if(warning)
    warning.textContent =
    medications.filter(
      m=>m.expiry
    ).length;



}



// ===============================
// 服用記録取得
// ===============================

async function loadDoseLogs(){


  if(!currentUser)
  return;


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
      ascending:false
    }
  );


  if(error){

    console.error(error);

    return;

  }


  doseLogs =
  data || [];


  renderDoseLogs();


}



// ===============================
// 服用記録保存
// ===============================

async function saveDoseLog(){


  const medId =
  document.getElementById(
    "log-med-select"
  ).value;



  const amount =
  document.getElementById(
    "log-amount"
  ).value;



  const datetime =
  document.getElementById(
    "log-datetime"
  ).value;



  const timing =
  document.getElementById(
    "log-timing"
  ).value;



  const notes =
  document.getElementById(
    "log-notes"
  ).value;



  const {

    error

  } =
  await supabaseClient
  .from("dose_logs")
  .insert({

    user_id:
    currentUser.id,

    medication_id:
    medId,

    amount,

    timing,

    notes,

    taken_at:
    datetime

  });



  if(error){

    alert(
      "記録エラー:"
      +
      error.message
    );

    return;

  }



  alert("服用を記録しました");


  loadDoseLogs();

}



// ===============================
// 服用履歴表示
// ===============================

function renderDoseLogs(){


 const box =
 document.getElementById(
  "dose-log-history"
 );


 if(!box)
 return;


 box.innerHTML="";



 doseLogs.forEach(log=>{


   const div =
   document.createElement("div");


   div.className =
   "log-entry";


   const med =
   medications.find(
    m=>m.id===log.medication_id
   );


   div.innerHTML = `

   <div>

    <b>
    ${med ? med.name : "不明なお薬"}
    </b>

    <br>

    ${log.amount || ""}

    ${log.timing || ""}

   </div>


   <small>

    ${new Date(
      log.taken_at
    ).toLocaleString()}

   </small>

   `;


   box.appendChild(div);


 });



}



// ===============================
// 初期イベント登録
// ===============================

document.addEventListener(
"DOMContentLoaded",
()=>{


 const form =
 document.getElementById(
  "medication-form"
 );


 if(form){

 form.addEventListener(
 "submit",
 e=>{

  e.preventDefault();

  saveMedication();

 });

 }



 const logForm =
 document.getElementById(
 "dose-log-form"
 );


 if(logForm){

 logForm.addEventListener(
 "submit",
 e=>{

  e.preventDefault();

  saveDoseLog();

 });

 }



});



// ===============================
// 検索
// ===============================

const search =
document.getElementById(
"search-input"
);


if(search){


search.addEventListener(
"input",
()=>{


 const keyword =
 search.value
 .toLowerCase();



 document
 .querySelectorAll(
 ".med-card"
 )
 .forEach(card=>{


 const text =
 card.textContent
 .toLowerCase();



 if(
 text.includes(keyword)
 ){

 card.style.display="";


 }else{

 card.style.display="none";

 }


 });


});


}



// ===============================
// ブラウザ通知
// ===============================

async function enableNotification(){


 if(
 "Notification"
 in window
 ){

 const permission =
 await Notification.requestPermission();


 if(permission==="granted"){

  new Notification(
   "お薬手帳通知を有効化しました"
  );

 }

 }


}



document
.getElementById(
"enable-browser-notif"
)
?.addEventListener(
"click",
enableNotification
);
