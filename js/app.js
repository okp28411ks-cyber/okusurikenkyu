const SUPABASE_URL = "https://nmstudwvvmbttfhanuyu.supabase.co";
const SUPABASE_KEY = "sb_publishable_DagUSgICo4JTVxwimcZKDw_NYBHPzSf";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase接続準備OK");
alert("Supabase接続準備OK");
async function testInsert() {
  const { data, error } = await supabaseClient
    .from("medications")
    .insert([
      {
        name: "テスト製品"
      }
    ]);

  if (error) {
    console.error(error);
    alert("保存エラー");
  } else {
    console.log(data);
    alert("保存成功");
  }
}

testInsert();
