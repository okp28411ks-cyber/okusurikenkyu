// =================================
// Supabase設定
// =================================

const SUPABASE_URL =
"https://nmstudwvvmbttfhanuyu.supabase.co";


const SUPABASE_KEY =
"sb_publishable_DagUSgICo4JTVxwimcZKDw_NYBHPzSf";


const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =================================
// グローバル状態
// =================================

let currentUser = null;

let medications = [];

let doseLogs = [];

let editingMedicationId = null;

let currentImageURL = "";


// =================================
// 起動
// =================================


document.addEventListener(
"DOMContentLoaded",
()=>{

    checkSession();

    setupEvents();

});



// =================================
// セッション確認
// =================================


async function checkSession(){

const {
data:{
session
}
}
=
await supabaseClient.auth.getSession();



if(session){

    currentUser =
    session.user;


    showApp();


}else{

    showLogin();

}


}




// =================================
// ログイン表示
// =================================


function showLogin(){

const login =
document.getElementById(
"login-area"
);


const app =
document.getElementById(
"app-area"
);



if(login)
login.classList.remove("hidden");



if(app)
app.classList.add("hidden");


}



// =================================
// アプリ表示
// =================================


async function showApp(){

const login =
document.getElementById(
"login-area"
);



const app =
document.getElementById(
"app-area"
);



if(login)
login.classList.add("hidden");



if(app)
app.classList.remove("hidden");



await loadMedications();

await loadDoseLogs();


}




// =================================
// ログアウト
// =================================


async function signOut(){


await supabaseClient.auth.signOut();


location.reload();


}
// =================================
// 会員登録
// =================================


async function signUp(email, password){


const {
data,
error
}
=
await supabaseClient.auth.signUp({

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



// =================================
// ログイン
// =================================


async function signIn(email,password){


const {
data,
error
}
=
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



currentUser =
data.user;



showApp();



}



// =================================
// 薬データ取得
// =================================


async function loadMedications(){


if(!currentUser)
return;



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

alert(
"薬データ取得エラー: "
+
error.message
);

return;

}



medications =
data || [];



renderMedicationList();


updateDashboard();


}




// =================================
// 薬保存
// =================================


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
document
.getElementById("med-name")
.value,



strength:
document
.getElementById("med-strength")
.value,



manufacturer:
document
.getElementById("med-manufacturer")
.value,



category:
document
.getElementById("med-category")
.value,



hospital:
document
.getElementById("med-hospital")
.value,



department:
document
.getElementById("med-department")
.value,



doctor:
document
.getElementById("med-doctor")
.value,



stock:
Number(
document
.getElementById("med-stock")
.value
||0
),



unit:
document
.getElementById("med-unit")
.value,



alert_threshold:
Number(
document
.getElementById("med-alert-threshold")
.value
||5
),



expiry:
document
.getElementById("med-expiry")
.value,



dose_amount:
document
.getElementById("med-dose-amount")
.value,



doses_per_day:
Number(
document
.getElementById("med-doses-per-day")
.value
||0
),



status:
document
.getElementById("med-status")
.value,



source:
document
.getElementById("med-source")
.value,



memo:
document
.getElementById("med-memo")
.value,



image_url:
currentImageURL



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

"保存エラー: "

+
result.error.message

);


return;


}



alert(
"保存しました"
);



editingMedicationId=null;



document
.getElementById(
"medication-form"
)
.reset();



currentImageURL="";



await loadMedications();



}
// =================================
// 薬一覧表示
// =================================


function renderMedicationList(){


const box =
document.getElementById(
"medication-cards-container"
);



if(!box)
return;



box.innerHTML = "";



const empty =
document.getElementById(
"list-empty-state"
);



if(
medications.length === 0
){


if(empty)
empty.classList.remove("hidden");


return;


}



if(empty)
empty.classList.add("hidden");





medications.forEach(
med => {



const card =
document.createElement("div");



card.className =
"med-card";



card.innerHTML = `


<div class="med-card-img">

${
med.image_url

?

`<img src="${med.image_url}" alt="${med.name}">`

:

`<i class="fa-solid fa-pills placeholder-icon"></i>`

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

${med.stock ?? 0}

${med.unit || ""}

</div>



<div class="stock-bar-track">


<div

class="stock-bar-fill bg-brand-500"

style="width:${getStockPercent(med)}%"

>

</div>


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



</div>



`;



box.appendChild(card);



});


}




// =================================
// 在庫バー計算
// =================================


function getStockPercent(med){


const stock =
Number(med.stock || 0);



const max =
Number(
med.alert_threshold || 10
)
*
3;



if(max <= 0)
return 0;



let percent =
(stock / max) * 100;



if(percent > 100)
percent = 100;



return percent;



}




// =================================
// 薬編集
// =================================


function editMedication(id){



const med =
medications.find(
m => m.id === id
);



if(!med)
return;



editingMedicationId =
id;



document
.getElementById("med-name")
.value =
med.name || "";



document
.getElementById("med-strength")
.value =
med.strength || "";



document
.getElementById("med-manufacturer")
.value =
med.manufacturer || "";



document
.getElementById("med-category")
.value =
med.category || "その他";



document
.getElementById("med-hospital")
.value =
med.hospital || "";



document
.getElementById("med-department")
.value =
med.department || "";



document
.getElementById("med-doctor")
.value =
med.doctor || "";



document
.getElementById("med-stock")
.value =
med.stock || 0;



document
.getElementById("med-unit")
.value =
med.unit || "錠";



document
.getElementById("med-expiry")
.value =
med.expiry || "";



document
.getElementById("med-dose-amount")
.value =
med.dose_amount || "";



document
.getElementById("med-doses-per-day")
.value =
med.doses_per_day || 0;



document
.getElementById("med-status")
.value =
med.status || "服用中";



document
.getElementById("med-source")
.value =
med.source || "";



document
.getElementById("med-memo")
.value =
med.memo || "";



currentImageURL =
med.image_url || "";



showView("add");



}




// =================================
// 薬削除
// =================================


async function deleteMedication(id){



const ok =
confirm(
"このお薬を削除しますか？"
);



if(!ok)
return;





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
"削除エラー: "
+
error.message
);


return;


}



await loadMedications();



}
// =================================
// フィルター状態
// =================================

let filterKeyword = "";

let filterCategory = "all";

let filterStatus = "all";

let sortType = "name_asc";




// =================================
// 表示用データ作成
// =================================

function getFilteredMedications(){


let result =
[...medications];



// 検索

if(filterKeyword){


result =
result.filter(
med => {


const text =

(
med.name
+
" "
+
med.manufacturer
+
" "
+
med.memo
+
" "
+
med.source

)
.toLowerCase();



return text.includes(
filterKeyword
);



}

);


}




// 分類フィルター

if(filterCategory !== "all"){


result =
result.filter(

med =>

med.category === filterCategory

);


}





// 状態フィルター

if(filterStatus !== "all"){


result =
result.filter(

med =>

med.status === filterStatus

);


}




// 並び替え


switch(sortType){



case "name_asc":


result.sort(

(a,b)=>

(a.name || "")
.localeCompare(
(b.name || ""),
"ja"
)

);


break;





case "expiry_asc":


result.sort(

(a,b)=>{


if(!a.expiry)
return 1;


if(!b.expiry)
return -1;


return (

new Date(a.expiry)

-

new Date(b.expiry)

);


}

);


break;





case "stock_asc":


result.sort(

(a,b)=>

Number(a.stock || 0)

-

Number(b.stock || 0)

);


break;






case "created_desc":


result.sort(

(a,b)=>

new Date(b.created_at)

-

new Date(a.created_at)

);


break;


}



return result;



}







// =================================
// 一覧再描画
// =================================


function renderFilteredMedicationList(){


const original =
medications;



medications =
getFilteredMedications();



renderMedicationList();



const count =
document.getElementById(
"list-count-label"
);



if(count){


count.textContent =

`${medications.length}件表示`;


}



medications =
original;



}






// =================================
// フィルターイベント設定
// =================================


function setupFilterEvents(){



const search =
document.getElementById(
"search-input"
);



if(search){



search.addEventListener(
"input",
()=>{


filterKeyword =

search.value
.trim()
.toLowerCase();



renderFilteredMedicationList();



}

);



}






const category =
document.getElementById(
"filter-category"
);



if(category){



category.addEventListener(
"change",
()=>{


filterCategory =
category.value;



renderFilteredMedicationList();



}

);



}





const status =
document.getElementById(
"filter-status"
);



if(status){



status.addEventListener(
"change",
()=>{


filterStatus =
status.value;



renderFilteredMedicationList();



}

);



}







const sort =
document.getElementById(
"sort-select"
);



if(sort){



sort.addEventListener(
"change",
()=>{


sortType =
sort.value;



renderFilteredMedicationList();



}

);



}




}






// =================================
// 初期イベントへ追加
// =================================


// 既存の setupEvents() の中に追加してください

function setupEvents(){


setupFilterEvents();



const form =
document.getElementById(
"medication-form"
);



if(form){


form.addEventListener(
"submit",
(e)=>{


e.preventDefault();


saveMedication();



}

);


}





const logForm =
document.getElementById(
"dose-log-form"
);



if(logForm){


logForm.addEventListener(
"submit",
(e)=>{


e.preventDefault();


saveDoseLog();



}

);


}



}
// =================================
// 服用記録取得
// =================================


async function loadDoseLogs(){


if(!currentUser)
return;



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


console.error(
error
);


return;


}



doseLogs =
data || [];



renderDoseLogs();


}




// =================================
// 服用記録保存
// =================================


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
"お薬を選択してください"
);


return;


}






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

"服用記録エラー: "

+
error.message

);



return;


}




// 在庫減少

await decreaseStock(
medicationId,
amount
);





alert(
"服用を記録しました"
);




document
.getElementById(
"dose-log-form"
)
.reset();




await loadDoseLogs();



await loadMedications();



}







// =================================
// 在庫減少
// =================================


async function decreaseStock(
medicationId,
amount
){



const med =

medications.find(

m =>

m.id === medicationId

);




if(!med)
return;



// 数字だけ取得

const value =

Number(

String(amount)

.replace(
/[^0-9.]/g,
""

)

);



if(!value)
return;





const newStock =

Math.max(

0,

Number(med.stock || 0)

-

value

);





await supabaseClient

.from("medications")

.update({

stock:
newStock

})

.eq(

"id",

medicationId

);



}






// =================================
// 服用履歴表示
// =================================


function renderDoseLogs(){



const box =

document
.getElementById(
"dose-log-history"
);




if(!box)
return;




box.innerHTML = "";





const empty =

document
.getElementById(
"doselog-empty-state"
);





if(
doseLogs.length === 0
){



if(empty)

empty.classList.remove(
"hidden"
);



return;



}





if(empty)

empty.classList.add(
"hidden"
);







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


<div class="font-bold text-slate-700">

${

med

?

med.name

:

"不明なお薬"

}

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



${
log.notes

?

`

<div class="text-sm mt-1">

メモ:
${log.notes}

</div>

`

:

""

}



</div>





`;




box.appendChild(div);



});



}






// =================================
// 服用薬選択欄更新
// =================================


function updateMedicationSelect(){



const select =

document
.getElementById(
"log-med-select"
);



if(!select)
return;




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



}

);



}
// =================================
// ダッシュボード更新
// =================================


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





// 登録数

if(total){

total.textContent =
medications.length;

}





// 服用中

if(active){

active.textContent =

medications.filter(

m =>

m.status === "服用中"

).length;

}







// 在庫少ない

if(low){


low.textContent =

medications.filter(

m =>


Number(m.stock || 0)

<=

Number(m.alert_threshold || 0)


).length;



}






// 要注意

if(warning){


warning.textContent =

getWarningMedications().length;


}





renderTodaySchedule();



renderWarningList();



renderRecentLogs();



}







// =================================
// 要注意薬取得
// =================================


function getWarningMedications(){



const today =
new Date();




return medications.filter(

med=>{


// 在庫不足

const stockWarning =


Number(med.stock || 0)

<=

Number(
med.alert_threshold || 0
);





// 使用期限

let expiryWarning =
false;




if(med.expiry){


const expiry =
new Date(
med.expiry
);



const diff =


(
expiry - today
)

/

(
1000 *
60 *
60 *
24
);




expiryWarning =

diff <= 30;



}






return (

stockWarning

||

expiryWarning

);



}

);



}






// =================================
// 要注意一覧表示
// =================================


function renderWarningList(){



const box =

document
.getElementById(
"warning-med-list"
);




if(!box)
return;




box.innerHTML = "";




const list =

getWarningMedications();






if(list.length===0){


box.innerHTML = `

<div class="warning-item">

<i class="fa-solid fa-circle-check text-emerald-500"></i>

問題のあるお薬はありません

</div>

`;

return;


}





list.forEach(

med=>{



const div =

document.createElement(
"div"
);



div.className =
"warning-item";



let message="";



if(

Number(med.stock || 0)

<=

Number(
med.alert_threshold || 0
)

){

message +=
"在庫不足 ";

}




if(med.expiry){

message +=
"期限確認";

}





div.innerHTML = `


<i class="fa-solid fa-triangle-exclamation text-amber-500"></i>


<div>

<b>
${med.name}
</b>

<div class="text-xs text-slate-500">

${message}

</div>


</div>



`;



box.appendChild(div);



}

);



}






// =================================
// 本日の服用予定
// =================================


function renderTodaySchedule(){



const box =

document
.getElementById(
"today-schedule-list"
);



if(!box)
return;




box.innerHTML="";






const activeMeds =

medications.filter(

m=>

m.status === "服用中"

);






if(activeMeds.length===0){


box.innerHTML = `

<div class="schedule-item">

服用予定はありません

</div>

`;

return;


}







activeMeds.forEach(

med=>{


const div =

document.createElement(
"div"
);



div.className =
"schedule-item";



div.innerHTML = `


<i class="fa-solid fa-clock text-brand-600"></i>


<div>


<b>

${med.name}

</b>



<div class="text-xs text-slate-500">

${

med.dose_amount || "-"

}

/

1日

${

med.doses_per_day || 0

}

回

</div>


</div>



`;



box.appendChild(div);



}

);



}







// =================================
// 最近の服用記録
// =================================


function renderRecentLogs(){



const box =

document
.getElementById(
"recent-logs-list"
);



if(!box)
return;



box.innerHTML="";





const logs =

doseLogs.slice(
0,
5
);







if(logs.length===0){


box.innerHTML = `

<div class="text-sm text-slate-400">

服用記録がありません

</div>

`;

return;


}







logs.forEach(

log=>{


const med =

medications.find(

m=>

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


<b>

${

med

?

med.name

:

"不明"

}

</b>



<div class="text-xs text-slate-500">

${log.amount || ""}

${log.timing || ""}

</div>


</div>



<div class="text-xs text-slate-400">

${

new Date(
log.taken_at
)

.toLocaleDateString(
"ja-JP"
)

}

</div>


`;



box.appendChild(div);



}

);



}
// =================================
// 通知設定
// =================================


let expiryAlertDays = 30;



// =================================
// 通知設定読み込み
// =================================


function loadNotificationSettings(){



const input =

document.getElementById(
"expiry-alert-days"
);




if(input){


expiryAlertDays =

Number(
input.value || 30
);



input.addEventListener(
"change",
()=>{


expiryAlertDays =

Number(
input.value
||30
);



checkMedicationNotifications();



}

);



}



}







// =================================
// ブラウザ通知有効化
// =================================


async function enableNotification(){



if(
!("Notification" in window)
){


alert(
"このブラウザは通知に対応していません"
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



checkMedicationNotifications();



}else{


alert(
"通知が許可されませんでした"
);


}



}






// =================================
// お薬通知チェック
// =================================


function checkMedicationNotifications(){



const today =

new Date();




const warnings = [];






medications.forEach(

med=>{





// 在庫不足

if(

Number(med.stock || 0)

<=

Number(
med.alert_threshold || 0
)

){



warnings.push({

type:
"在庫不足",

name:
med.name

});



}






// 使用期限

if(med.expiry){



const expiry =

new Date(
med.expiry
);




const diff =


(

expiry - today

)

/

(

1000 *
60 *
60 *
24

);





if(

diff <= expiryAlertDays

&&

diff >=0

){



warnings.push({

type:
"使用期限",

name:
med.name,

days:
Math.ceil(diff)

});



}



}



});







renderNotificationLists(
warnings
);






if(

Notification.permission === "granted"

&&

warnings.length > 0

){



new Notification(

"お薬の確認があります",

{

body:

warnings

.map(

w =>

`${w.type}: ${w.name}`

)

.join(
"\n"
)

}

);



}



}







// =================================
// 通知一覧表示
// =================================


function renderNotificationLists(
warnings
){



const expiryBox =

document.getElementById(
"notif-expiry-list"
);




const stockBox =

document.getElementById(
"notif-stock-list"
);





if(expiryBox)

expiryBox.innerHTML="";



if(stockBox)

stockBox.innerHTML="";







warnings.forEach(

item=>{



const div =

document.createElement(
"div"
);



div.className =

"warning-item";





div.innerHTML = `


<i class="fa-solid fa-bell text-brand-600"></i>


<div>


<b>

${item.name}

</b>


<div class="text-xs text-slate-500">

${item.type}


${

item.days

?

`（あと${item.days}日）`

:

""

}


</div>



</div>



`;






if(

item.type === "使用期限"

){


expiryBox?.appendChild(div);


}else{


stockBox?.appendChild(div);


}



});







if(
expiryBox &&
expiryBox.innerHTML === ""
){


expiryBox.innerHTML = `

<div class="text-sm text-slate-400">

期限通知はありません

</div>

`;

}




if(
stockBox &&
stockBox.innerHTML === ""
){


stockBox.innerHTML = `

<div class="text-sm text-slate-400">

在庫通知はありません

</div>

`;

}




}





// =================================
// 通知イベント設定
// =================================


function setupNotificationEvents(){



loadNotificationSettings();




document

.getElementById(
"enable-browser-notif"
)

?.addEventListener(

"click",

enableNotification

);





}




// =================================
// setupEventsへ追加
// =================================


// 既存の setupEvents() 内に追加してください


setupNotificationEvents();
