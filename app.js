// ==================================================
// お薬手帳アプリ app.js
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
// 起動
// ===============================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    checkSession();
  }
);


// ===============================
// セッション確認
// ===============================

async function checkSession() {

  const {
    data: {
      session
    }
  } = await supabaseClient.auth.getSession();

  if (session) {

    currentUser = session.user;

    showApp();

  } else {

    showLogin();

  }
}


// ===============================
// ログイン画面表示
// ===============================

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


// ===============================
// アプリ表示
// ===============================

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


// ===============================
// 会員登録
// ===============================

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


// ===============================
// ログイン
// ===============================

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
}


// ===============================
// ログアウト
// ===============================

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


// ===============================
// Toast
// ===============================

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



// ===============================
// 薬データ取得
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


console.error(error);


showToast(
"薬データ取得エラー"
);


return;


}



medications =
data || [];



renderMedicationList();


updateDashboard();



}





// ===============================
// 薬保存
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



image_url:

document
.getElementById(
"image-url-text"
)
?.value || "",



name:

document
.getElementById(
"med-name"
)
.value,



strength:

document
.getElementById(
"med-strength"
)
?.value || "",



manufacturer:

document
.getElementById(
"med-manufacturer"
)
?.value || "",



category:

document
.getElementById(
"med-category"
)
.value,



hospital:

document
.getElementById(
"med-hospital"
)
?.value || "",



department:

document
.getElementById(
"med-department"
)
?.value || "",



doctor:

document
.getElementById(
"med-doctor"
)
?.value || "",



stock:

Number(
document
.getElementById(
"med-stock"
)
.value || 0
),



unit:

document
.getElementById(
"med-unit"
)
?.value || "錠",



alert_threshold:

Number(
document
.getElementById(
"med-alert-threshold"
)
.value || 5
),



expiry:

document
.getElementById(
"med-expiry"
)
?.value || "",



dose_amount:

document
.getElementById(
"med-dose-amount"
)
?.value || "",



doses_per_day:

Number(
document
.getElementById(
"med-doses-per-day"
)
?.value || 0
),



status:

document
.getElementById(
"med-status"
)
?.value || "服用中",



source:

document
.getElementById(
"med-source"
)
?.value || "",



memo:

document
.getElementById(
"med-memo"
)
?.value || ""

};





let result;



// 編集

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


// 新規登録

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

"保存エラー\n"

+

result.error.message

);


return;

}




showToast(
"保存しました"
);



editingMedicationId =
null;



document
.getElementById(
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

m =>

m.id === id

);



if(!med){

return;

}




editingMedicationId =
id;



document
.getElementById(
"med-name"
)
.value =
med.name || "";



document
.getElementById(
"med-strength"
)
.value =
med.strength || "";



document
.getElementById(
"med-manufacturer"
)
.value =
med.manufacturer || "";



document
.getElementById(
"med-category"
)
.value =
med.category || "処方薬";



document
.getElementById(
"med-stock"
)
.value =
med.stock || 0;



document
.getElementById(
"med-expiry"
)
.value =
med.expiry || "";



document
.getElementById(
"med-memo"
)
.value =
med.memo || "";



document
.getElementById(
"image-url-text"
)
.value =
med.image_url || "";



showView(
"add"
);



}







// ===============================
// 削除
// ===============================

async function deleteMedication(id){



if(
!confirm(
"この薬を削除しますか？"
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
"削除エラー\n"
+
error.message
);


return;


}



showToast(
"削除しました"
);



loadMedications();



}
// ==================================================
// ③ 薬一覧表示・検索・フィルター・並び替え
// ==================================================



// ===============================
// 薬一覧表示
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



let list = [...medications];




// -------------------------------
// 検索
// -------------------------------

const searchValue =

document
.getElementById(
"search-input"
)
?.value
.toLowerCase()
.trim();



if(searchValue){


list = list.filter(
med =>


(
med.name
||
""
)

.toLowerCase()

.includes(
searchValue
)

);

}





// -------------------------------
// 分類フィルター
// -------------------------------

const category =

document
.getElementById(
"filter-category"
)
?.value || "all";



if(category !== "all"){


list = list.filter(

med =>

med.category === category

);


}





// -------------------------------
// 状態フィルター
// -------------------------------

const status =

document
.getElementById(
"filter-status"
)
?.value || "all";



if(status !== "all"){


list = list.filter(

med =>

med.status === status

);


}





// -------------------------------
// 並び替え
// -------------------------------

const sort =

document
.getElementById(
"sort-select"
)
?.value || "name_asc";




if(sort === "name_asc"){


list.sort(

(a,b)=>

(a.name || "")
.localeCompare(
(b.name || ""),
"ja"
)

);


}



if(sort === "expiry_asc"){


list.sort(

(a,b)=>

new Date(
a.expiry || "9999-12-31"
)

-

new Date(
b.expiry || "9999-12-31"
)

);


}



if(sort === "stock_asc"){


list.sort(

(a,b)=>

Number(a.stock || 0)

-

Number(b.stock || 0)

);


}



if(sort === "created_desc"){


list.sort(

(a,b)=>

new Date(
b.created_at
)

-

new Date(
a.created_at
)

);


}





// 件数表示

const countLabel =

document
.getElementById(
"list-count-label"
);



if(countLabel){


countLabel.textContent =

`${list.length}件のお薬`;

}




// 空状態

const empty =

document
.getElementById(
"list-empty-state"
);



if(list.length === 0){


empty
?.classList
.remove(
"hidden"
);


return;


}else{


empty
?.classList
.add(
"hidden"
);


}






// ===============================
// カード生成
// ===============================

list.forEach(
med => {


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

`<img src="${med.image_url}" alt="">`

:

`<div class="placeholder-icon">
<i class="fa-solid fa-pills"></i>
</div>`

}

</div>



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
購入先・処方元
</div>


<div class="med-card-value">

${med.source || "-"}

</div>


</div>





<div class="med-card-memo">


<div class="med-card-label">
メモ
</div>


<div class="med-card-value">

${med.memo || "-"}

</div>


</div>




</div>





<div class="med-card-actions">


<button

class="icon-btn"

onclick="editMedication('${med.id}')"

>

<i class="fa-solid fa-pen"></i>

</button>




<button

class="icon-btn danger"

onclick="deleteMedication('${med.id}')"

>

<i class="fa-solid fa-trash"></i>

</button>



</div>



`;



box.appendChild(card);



});


}








// ===============================
// 検索・フィルターイベント
// ===============================

document.addEventListener(
"DOMContentLoaded",
()=>{



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



if(el){


el.addEventListener(

"input",

()=>{

renderMedicationList();

}

);



el.addEventListener(

"change",

()=>{

renderMedicationList();

}

);



}


); 



});
// ==================================================
// ④ 服用記録・服用履歴・在庫減算
// ==================================================



// ===============================
// 服用記録取得
// ===============================

async function loadDoseLogs(){


if(!currentUser){

return;

}



const {

data,

error

}

=

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



if(!currentUser){

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
.value;




const amount =

document
.getElementById(
"log-amount"
)
.value;




const datetime =

document
.getElementById(
"log-datetime"
)
.value;




const timing =

document
.getElementById(
"log-timing"
)
.value;




const notes =

document
.getElementById(
"log-notes"
)
.value;





if(!medicationId){

alert(
"薬を選択してください"
);

return;

}





// 服用記録追加

const {

error

}

=

await supabaseClient

.from("dose_logs")

.insert({


user_id:

currentUser.id,


medication_id:

medicationId,


amount,


timing,


notes,


taken_at:

datetime


});





if(error){


alert(

"記録エラー\n"

+

error.message

);


return;


}





// ===============================
// 在庫減算
// ===============================


const med =

medications.find(

m =>

m.id === medicationId

);



if(med){



const useAmount =

Number(
amount.replace(
/[^0-9.]/g,
""
)

)

|| 1;




await supabaseClient

.from("medications")

.update({

stock:

Math.max(

0,

Number(med.stock || 0)

-

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



loadMedications();


loadDoseLogs();



}







// ===============================
// 服用履歴表示
// ===============================

function renderDoseLogs(){



const box =

document
.getElementById(
"dose-log-history"
);



if(!box){

return;

}



box.innerHTML = "";




if(doseLogs.length === 0){


document
.getElementById(
"doselog-empty-state"
)

?.classList

.remove(
"hidden"
);


return;


}else{


document
.getElementById(
"doselog-empty-state"
)

?.classList

.add(
"hidden"
);


}






doseLogs.forEach(

log => {



const med =

medications.find(

m =>

m.id === log.medication_id

);




const div =

document.createElement(
"div"
);



div.className =
"log-entry";




div.innerHTML = `


<div>


<div class="font-bold">

${med?.name || "不明なお薬"}

</div>



<div class="text-sm text-slate-500">

${log.amount || ""}

${log.timing || ""}

</div>



<div class="text-xs text-slate-400">

${

new Date(
log.taken_at

)

.toLocaleString(
"ja-JP"
)

}

</div>


</div>



<div>

${log.notes || ""}

</div>



`;



box.appendChild(div);



});



}







// ===============================
// 服用薬選択欄更新
// ===============================

function updateDoseSelect(){



const select =

document
.getElementById(
"log-med-select"
);



if(!select){

return;

}




select.innerHTML = "";



medications.forEach(

med=>{


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



});



}







// ===============================
// 服用フォーム送信
// ===============================

document.addEventListener(
"DOMContentLoaded",
()=>{


const form =

document
.getElementById(
"dose-log-form"
);



if(form){


form.addEventListener(

"submit",

e=>{


e.preventDefault();


saveDoseLog();



});


}



});
// ==================================================
// ⑤ ダッシュボード・通知・初期化
// ==================================================



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





if(total){


total.textContent =

medications.length;


}




if(active){


active.textContent =

medications.filter(

m =>

m.status === "服用中"

).length;


}




if(low){


low.textContent =

medications.filter(

m =>

Number(m.stock || 0)

<=

Number(m.alert_threshold || 0)

).length;


}





if(warning){


warning.textContent =

medications.filter(

m => {


if(!m.expiry){

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
expiry - today

)

/

(
1000 * 60 * 60 * 24
);



return diff <= 30;



}

).length;


}



}







// ===============================
// 画面切替
// ===============================

function showView(viewName){



document

.querySelectorAll(
".view-section"
)

.forEach(

section=>{


section.classList.add(
"hidden"
);



});




const target =

document.getElementById(

"view-" + viewName

);



if(target){


target.classList.remove(
"hidden"
);


}




document

.querySelectorAll(
".nav-btn"
)

.forEach(

btn=>{


btn.classList.remove(
"active-nav"
);



});



const activeBtn =

document.querySelector(

`.nav-btn[data-view="${viewName}"]`

);



if(activeBtn){


activeBtn.classList.add(
"active-nav"
);


}



}








// ===============================
// ブラウザ通知
// ===============================

async function enableNotification(){



if(
!"Notification" in window
){


alert(
"このブラウザは通知非対応です"
);


return;


}





const permission =

await Notification.requestPermission();





if(permission === "granted"){



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



}



}







// ===============================
// 通知ボタン
// ===============================

document.addEventListener(

"DOMContentLoaded",

()=>{



const btn =

document.getElementById(

"enable-browser-notif"

);



if(btn){



btn.addEventListener(

"click",

enableNotification

);



}




});








// ===============================
// 初期化処理
// ===============================

document.addEventListener(

"DOMContentLoaded",

()=>{



// 薬保存フォーム

const medForm =

document.getElementById(

"medication-form"

);



if(medForm){


medForm.addEventListener(

"submit",

e=>{


e.preventDefault();


saveMedication();


}

);


}





// キャンセル

const cancel =

document.getElementById(

"cancel-edit-btn"

);



if(cancel){


cancel.addEventListener(

"click",

()=>{


editingMedicationId = null;


medForm?.reset();


showView(
"list"
);


}

);



}






// ナビゲーション

document

.querySelectorAll(

".nav-btn"

)

.forEach(

btn=>{


btn.addEventListener(

"click",

()=>{


const view =

btn.dataset.view;



if(view){


showView(view);


}



}

);


});





// 服用薬選択更新

updateDoseSelect();





});








// ===============================
// 薬データ更新後処理
// ===============================

// loadMedicationsを拡張

const originalLoadMedications = loadMedications;


loadMedications = async function(){


await originalLoadMedications();


updateDoseSelect();


};
