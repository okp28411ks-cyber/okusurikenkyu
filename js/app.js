const SUPABASE_URL = "あなたのProject URL";
const SUPABASE_KEY = "あなたのPublishable key";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// 保存ボタン処理
document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("medication-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();


    const medication = {
      name: document.getElementById("med-name").value,
      strength: document.getElementById("med-strength").value,
      manufacturer: document.getElementById("med-manufacturer").value,
      category: document.getElementById("med-category").value,
      stock: Number(document.getElementById("med-stock").value),
      unit: document.getElementById("med-unit").value,
      expiry: document.getElementById("med-expiry").value || null,
      memo: document.getElementById("med-memo").value
    };


    const { data, error } = await supabaseClient
      .from("medications")
      .insert([medication]);


    if(error){
      console.error(error);
      alert("保存エラー");
      return;
    }


    alert("お薬を登録しました！");
    form.reset();

  });

});
// 画面切り替え
document.querySelectorAll("[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {

    const view = btn.dataset.view;

    document.querySelectorAll(".view-section")
      .forEach(section => section.classList.add("hidden"));

    document.getElementById("view-" + view)
      .classList.remove("hidden");

  });
});


// お薬追加ボタン
document.getElementById("quick-add-btn")
?.addEventListener("click", () => {

  document.querySelectorAll(".view-section")
    .forEach(section => section.classList.add("hidden"));

  document.getElementById("view-add")
    .classList.remove("hidden");

});
