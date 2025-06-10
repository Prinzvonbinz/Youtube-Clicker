// --- Datenstruktur ---
const defaultData = {
  name: "Dein Kanal", img: "", clips: 0, videos: 0, subs: 0,
  upgrades: { cutter: 0, clicker: 0, streamer: 0, manager: 0 },
  shop: [
    { key:"clicker", name:"Klicker", base:20, desc:"+1 Clip/sec pro Upgrade", type:"clip" },
    { key:"cutter", name:"Cutter", base:50, desc:"Videos schneller schneiden", type:"cut" },
    { key:"streamer", name:"Streamer", base:200, desc:"+1 Twitch-Klick/sec", type:"stream" },
    { key:"manager", name:"Manager", base:500, desc:"+5% Speed für alle", type:"mgr" }
  ],
  twitch: { unlocked:false, name:"", img:"" },
  code: ""
};
let game = null, intervalCl = null, intervalSt = null, cutTimeout = null;

// --- Hilfsfunktionen ---
function genCode() {
  return btoa(JSON.stringify(game)).replace(/=+$/,"").substr(0,24);
}
function save() {
  game.code = genCode();
  localStorage.setItem("ytclicker", JSON.stringify(game));
}
function load() {
  let raw = localStorage.getItem("ytclicker");
  if (raw) { game = JSON.parse(raw); } else { game = {...defaultData}; }
}
function applyProfile() {
  document.getElementById("profileImg").src = game.img||"https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_(2017).svg";
  document.getElementById("ytBtnImg").src = game.img||"https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_(2017).svg";
  document.getElementById("profileImg2").src = game.img||"https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_(2017).svg";
  document.getElementById("profileName").innerText = game.name;
  document.getElementById("profileName2").innerText = game.name;
  document.getElementById("accountCode").innerText = game.code;
}
function updateStats() {
  document.getElementById("clips").innerText = game.clips;
  document.getElementById("videos").innerText = game.videos;
  document.getElementById("subs").innerText = game.subs;
  document.getElementById("cutClips").innerText = game.clips;
  if(game.subs>=1000)document.getElementById("toTwitch").classList.remove("hide");
  else document.getElementById("toTwitch").classList.add("hide");
}
function showMenu(mn) {
  document.querySelectorAll(".menu").forEach(m=>m.classList.remove("active"));
  document.getElementById(mn).classList.add("active");
}
function expPrice(base, lvl) {
  return Math.floor(base * Math.pow(1.35, lvl));
}
function managerBonus() {
  return 1 + 0.05 * game.upgrades.manager;
}
function playBtnBoost() { return 1; /* hier später 1.3 falls Play-Button erreicht */ }

// --- Game-Loop / Automatisierungen ---
function startLoops() {
  clearInterval(intervalCl); clearInterval(intervalSt);
  intervalCl = setInterval(()=>{
    let cps = game.upgrades.clicker * managerBonus() * playBtnBoost();
    game.clips += Math.round(cps);
    updateStats(); save();
  }, 1000);
  // Placeholder für Streamer/Twitch: analog zum Klicker
}

// --- Event-Handler ---
window.onload = function() {
  load(); save(); applyProfile(); updateStats();
  // --- Start ---
  document.getElementById("startBtn").onclick = ()=> {
    let n = document.getElementById("channelName").value.trim();
    let f = document.getElementById("channelPic").files[0];
    if (n.length<2) return alert("Name zu kurz!");
    game.name = n;
    if (f) {
      let fr = new FileReader();
      fr.onload = function(e) {
        game.img = e.target.result;
        save(); applyProfile();
      };
      fr.readAsDataURL(f);
    }
    showMenu("menu-main"); save(); applyProfile(); startLoops();
  };
  // Youtube Button (Clicker)
  document.getElementById("youtubeBtn").onclick = ()=> {
    let plus = 1 * managerBonus() * playBtnBoost();
    game.clips += Math.round(plus); updateStats(); save();
  };
  // Zu Cut-Menü
  document.getElementById("toCut").onclick = ()=>showMenu("menu-cut");
  // Zu Shop
  document.getElementById("toShop").onclick = ()=>showMenu("menu-shop");
  // Zu Profil
  document.getElementById("openProfile").onclick = ()=>showMenu("menu-profile");
  // Cut-Menu zurück
  document.getElementById("toMain1").onclick = ()=>showMenu("menu-main");
  // Shop zurück
  document.getElementById("toMain2").onclick = ()=>showMenu("menu-main");
  // Profil zurück
  document.getElementById("toMain3").onclick = ()=>showMenu("menu-main");
  // Twitch zurück
  document.getElementById("toMain4").onclick = ()=>showMenu("menu-main");

  // Video schneiden
  document.getElementById("cutBtn").onclick = ()=>{
    let n = document.getElementById("videoName").value.trim();
    let need = 10;
    if (game.clips<need) return alert("Zu wenig Clips!");
    if (cutTimeout) return;
    document.getElementById("cutStatus").innerText = "Schneide...";
    let base = 4000, cutLvl = game.upgrades.cutter;
    let dur = Math.max(1200, base * Math.pow(0.80,cutLvl) / managerBonus() / playBtnBoost());
    cutTimeout = setTimeout(()=>{
      game.clips -= need; game.videos += 1;
      document.getElementById("cutStatus").innerText = `Video "${n||'Neues Video'}" fertig!`;
      // Subs gewinnen/verloren
      let plus = 20 + Math.floor(game.videos * Math.random() * 2);
      game.subs = Math.max(0, game.subs + plus - Math.floor(game.videos/10));
      updateStats(); save(); setTimeout(()=>{document.getElementById("cutStatus").innerText="";}, 2000);
      cutTimeout=null;
    }, dur);
  };

  // Shop-Menü
  function updateShop() {
    let s = "";
    game.shop.forEach((it,i)=>{
      let lvl = game.upgrades[it.key];
      let price = expPrice(it.base, lvl);
      s += `<div>
        <b>${it.name}</b> (Level ${lvl})<br>
        <small>${it.desc}</small><br>
        <button data-k="${it.key}" class="sec-btn">Kaufen (${price} Abos)</button>
      </div>`;
    });
    document.getElementById("shopItems").innerHTML = s;
    document.querySelectorAll("#shopItems button").forEach(btn=>{
      btn.onclick = function(){
        let key = btn.getAttribute("data-k");
        let lvl = game.upgrades[key];
        let price = expPrice(game.shop.find(it=>it.key==key).base, lvl);
        if(game.subs<price)return alert("Nicht genug Abos!");
        game.subs -= price;
        game.upgrades[key] += 1;
        save(); updateStats(); updateShop(); startLoops();
      };
    });
  }
  document.getElementById("toShop").addEventListener("click",updateShop);

  // Profil-Menü Import
  document.getElementById("importBtn").onclick = ()=>{
    let code = document.getElementById("importCode").value.trim();
    try {
      let obj = JSON.parse(atob(code));
      if(obj.name && obj.img) {
        game = obj; save(); applyProfile(); updateStats(); startLoops();
        alert("Account geladen!");
        showMenu("menu-main");
      }
    } catch(e) {alert("Ungültiger Code!");}
  };

  // Twitch-Menü (ab Abos)
  document.getElementById("toTwitch").onclick=()=>showMenu("menu-twitch");
  // (Twitch-Funktionen als Platzhalter, analog zu Youtube realisieren)
  // Play-Buttons: siehe playBtnBoost()

  // Initialisierung
  showMenu(game.name&&game.img?"menu-main":"menu-start");
  applyProfile(); updateStats(); updateShop(); startLoops();
};
