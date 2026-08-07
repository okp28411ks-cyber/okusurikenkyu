////////////////////////////////////////////////////
// Supabase 設定
////////////////////////////////////////////////////

const SUPABASE_URL =
"https://nmstudwvvmbttfhanuyu.supabase.co";

const SUPABASE_KEY =
"sb_publishable_DagUSgICo4JTVxwimcZKDw_NYBHPzSf";


const supabaseClient =
supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);



////////////////////////////////////////////////////
// DOM
////////////////////////////////////////////////////

const authArea = document.getElementById("auth-area");
const appArea = document.getElementById("app-area");


const loginBox =
document.getElementById("login-box");

const registerBox =
document.getElementById("register-box");



////////////////////////////////////////////////////
// トースト
////////////////////////////////////////////////////

function showToast(message){

const toast =
document.getElementById("toast");

if(!toast) return;


toast.textContent = message;

toast.classList.remove(
"opacity-0"
);

setTimeout(()=>{

toast.classList.add(
"opacity-0"
);

},2500);

}




////////////////////////////////////////////////////
// 認証切替
////////////////////////////////////////////////////


document
.getElementById("show-register-btn")
?.addEventListener(
"click",
()=>{

loginBox.classList.add("hidden");
registerBox.classList.remove("hidden");

});



document
.getElementById("show-login-btn")
?.addEventListener(
"click",
()=>{

registerBox.classList.add("hidden");
loginBox.classList.remove("hidden");

});






////////////////////////////////////////////////////
// 会員登録
////////////////////////////////////////////////////


document
.getElementById("register-btn")
?.addEventListener(
"click",
async()=>{


const name =
document
.getElementById("register-name")
.value;


const email =
document
.getElementById("register-email")
.value;


const password =
document
.getElementById("register-password")
.value;



if(!email || !password){

showToast(
"メールとパスワードを入力してください"
);

return;

}



const {
data,
error
}=await supabaseClient.auth.signUp({

email,
password,

options:{
data:{
name:name
}
}

});



if(error){

showToast(
error.message
);

return;

}



showToast(
"登録しました。メール確認をしてください"
);



});







////////////////////////////////////////////////////
// ログイン
////////////////////////////////////////////////////


document
.getElementById("login-btn")
?.addEventListener(
"click",
async()=>{


const email =
document
.getElementById("login-email")
.value;


const password =
document
.getElementById("login-password")
.value;



const {
data,
error
}=await supabaseClient.auth.signInWithPassword({

email,
password

});



if(error){

showToast(
"ログイン失敗：" + error.message
);

return;

}



showApp(
data.user
);



});








////////////////////////////////////////////////////
// ログアウト
////////////////////////////////////////////////////


document
.getElementById("logout-btn")
?.addEventListener(
"click",
async()=>{


await supabaseClient.auth.signOut();


appArea.classList.add(
"hidden"
);


authArea.classList.remove(
"hidden"
);


showToast(
"ログアウトしました"
);



});






////////////////////////////////////////////////////
// 起動時ログイン確認
////////////////////////////////////////////////////


async function checkSession(){


const {
data
}=await supabaseClient.auth.getSession();



if(data.session){

showApp(
data.session.user
);

}


}



checkSession();






////////////////////////////////////////////////////
// アプリ表示
////////////////////////////////////////////////////


function showApp(user){


authArea.classList.add(
"hidden"
);


appArea.classList.remove(
"hidden"
);



const display =
document.getElementById(
"user-display"
);


if(display){

display.textContent =
user.email;

}



loadMedicines();


}
////////////////////////////////////////////////////
// お薬データ取得
////////////////////////////////////////////////////

let medicines = [];


async function loadMedicines(){


const {
data,
error
}=await supabaseClient
.from("medications")
.select("*")
.order("created_at",{ascending:false});



if(error){

console.error(error);

showToast(
"お薬データ取得エラー"
);

return;

}



medicines = data || [];



renderMedicineList();

updateDashboard();



}




////////////////////////////////////////////////////
// お薬登録
////////////////////////////////////////////////////


document
.getElementById("medication-form")
?.addEventListener(
"submit",
async(e)=>{


e.preventDefault();



const name =
document
.getElementById("med-name")
.value;



const memo =
document
.getElementById("med-memo")
.value;



if(!name){

showToast(
"お薬名を入力してください"
);

return;

}



const {
data,
error
}=await supabaseClient
.from("medications")
.insert({

name:name,

memo:memo,

status:"服用中",

stock:0

})
.select();



if(error){

showToast(
"保存失敗：" + error.message
);

return;

}



showToast(
"お薬を登録しました"
);



document
.getElementById("medication-form")
.reset();



loadMedicines();



});








////////////////////////////////////////////////////
// お薬一覧表示
////////////////////////////////////////////////////


function renderMedicineList(){


const box =
document.getElementById(
"medication-cards-container"
);



if(!box)return;



box.innerHTML="";



if(medicines.length===0){

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





medicines.forEach(med=>{


const card =
document.createElement("div");


card.className =
"med-card";



card.innerHTML = `


<div class="med-card-body">


<div class="med-card-main">


<div class="med-card-name">

<i class="fa-solid fa-pills text-brand-600"></i>

${med.name}

</div>



<div class="med-card-sub">

${med.memo || ""}

</div>


</div>



<div class="med-card-actions">


<button
class="icon-btn danger"
onclick="deleteMedicine('${med.id}')">

<i class="fa-solid fa-trash"></i>

</button>


</div>



</div>


`;



box.appendChild(card);



});



}




////////////////////////////////////////////////////
// お薬削除
////////////////////////////////////////////////////


async function deleteMedicine(id){



if(!confirm(
"削除しますか？"
))return;



const {
error
}=await supabaseClient
.from("medications")
.delete()
.eq("id",id);



if(error){

showToast(
"削除できません"
);

return;

}



showToast(
"削除しました"
);



loadMedicines();


}




////////////////////////////////////////////////////
// ダッシュボード更新
////////////////////////////////////////////////////


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



if(total){

total.textContent =
medicines.length;

}



if(active){

active.textContent =
medicines.filter(
m=>m.status==="服用中"
).length;

}



if(low){

low.textContent =
medicines.filter(
m=>(m.stock||0)<=5
).length;

}



}






////////////////////////////////////////////////////
// 服用記録
////////////////////////////////////////////////////


document
.getElementById("dose-log-form")
?.addEventListener(
"submit",
async(e)=>{


e.preventDefault();



const medId =
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




const {
error
}=await supabaseClient
.from("dose_logs")
.insert({

medication_id:medId,

amount:amount,

taken_at:datetime

});



if(error){

showToast(
"記録できませんでした"
);

return;

}



showToast(
"服用を記録しました"
);



e.target.reset();


});








////////////////////////////////////////////////////
// 服用選択欄更新
////////////////////////////////////////////////////


function updateMedicineSelect(){


const select =
document.getElementById(
"log-med-select"
);



if(!select)return;



select.innerHTML="";



medicines.forEach(m=>{


const option =
document.createElement("option");


option.value =
m.id;


option.textContent =
m.name;


select.appendChild(option);


});


}





////////////////////////////////////////////////////
// ナビゲーション
////////////////////////////////////////////////////


document
.querySelectorAll(".nav-btn")
.forEach(btn=>{


btn.addEventListener(
"click",
()=>{


document
.querySelectorAll(".nav-btn")
.forEach(b=>
b.classList.remove(
"active-nav"
));



btn.classList.add(
"active-nav"
);



const view =
btn.dataset.view;



document
.querySelectorAll(".view-section")
.forEach(section=>{


section.classList.add(
"hidden"
);


});



document
.getElementById(
"view-"+view
)
?.classList
.remove(
"hidden"
);



});


});
