// --- GLOBAL STATE ---
const initialState = {
  ytName: "",
  ytPic: "",
  twName: "",
  twPic: "",
  code: "",
  clips: 0,
  videos: [],
  abos: 0,
  twitchActive: false,
  twClips: 0,
  playButtons: [],
  upgrades: {
    cutter: { level: 0, base: 50 },
    clicker: { level: 0, base: 40 },
    streamer: { level: 0, base: 60 },
    manager: { level: 0, base: 100 },
  },
  shopBoost: 1,
  ytAutoClicks: 0,
  twAutoClicks: 0,
};
let state = {};
let ytClickActive = false, twClickActive = false, autoInterval = null;
const PLAY_BUTTON_THRESHOLDS = [
  { abos: 1000, name: "Silber" },
  { abos: 10000, name: "Gold" },
  { abos: 1000000, name: "Diamant" },
  { abos: 100000000, name: "Rubin" },
];

// --- UTILITIES ---
function saveState() {
  localStorage.setItem("ytclicker.save", JSON.stringify(state));
}
function loadState(code) {
  let data = code
    ? JSON.parse(localStorage.getItem("ytclicker.save." + code))
    : JSON.parse(localStorage.getItem("ytclicker.save"));
  if (!data) return false;
  state = { ...initialState, ...data };
  saveState();
  render();
  return true;
}
function generateCode() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
}
function saveWithCode() {
  localStorage.setItem("ytclicker.save." + state.code, JSON.stringify(state));
}
function getProfilePic(type = "yt") {
  return type === "yt"
    ? state.ytPic || "https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg"
    : state.twPic || "https://static-cdn.jtvnw.net/jtv_user_pictures/twitch-profile_image.png";
}
function expCost(base, level) {
  return Math.floor(base * Math.pow(1.35, level));
}
function format(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return Math.floor(num);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- INIT ---
function init() {
  let sv = localStorage.getItem("ytclicker.save");
  if (sv) {
    state = { ...initialState, ...JSON.parse(sv) };
    render();
  } else {
    state = { ...initialState, code: generateCode() };
    renderSetup();
  }
  runAuto();
}
window.onload = init;

// --- SETUP MENU ---
function renderSetup() {
  document.getElementById("app").innerHTML = `
    <div class="menu active" id="setupMenu">
      <h2>YouTube Clicker</h2>
      <input id="ytname" type="text" placeholder="YouTube Kanalname"><br>
      <button onclick="selectPic('yt')">Profilbild wählen</button>
      <div id="ytpicPrev" style="margin:8px 0"></div>
      <button onclick="finishSetup()">Start</button>
    </div>
  `;
}
window.selectPic = function(type) {
  const file = document.getElementById('fileInput');
  file.onchange = function(e) {
    const reader = new FileReader();
    reader.onload = function(ev) {
      if (type === "yt") state.ytPic = ev.target.result;
      else state.twPic = ev.target.result;
      render();
    };
    reader.readAsDataURL(e.target.files[0]);
  };
  file.click();
}
window.finishSetup = function() {
  const name = document.getElementById('ytname').value.trim();
  if (!name) return alert("Bitte Kanalnamen eingeben!");
  state.ytName = name;
  state.code = generateCode();
  state.abos = 0; state.clips = 0; state.videos = [];
  saveState(); saveWithCode();
  render();
};

// --- MAIN MENU ---
function render() {
  let menus = `
    <div class="menu-btns">
      <button onclick="showMenu('main')">YouTube</button>
      <button onclick="showMenu('cut')">Videos schneiden</button>
      <button onclick="showMenu('shop')">Shop</button>
      ${state.twitchActive ? `<button onclick="showMenu('twitch')">Twitch</button>` : ""}
      <button onclick="showMenu('profile')">Profil</button>
    </div>
    ${Object.values(state.playButtons).length
        ? `<div>${Object.values(state.playButtons).map(pb => `<span class="play-button">${pb}</span>`).join('')}</div>`
        : ""}
    <div id="mainMenu" class="menu">
      <h2>${state.ytName}</h2>
      <div>Abos: <b id="aboCount">${format(state.abos)}</b> | Clips: <b id="clipCount">${format(state.clips)}</b></div>
      <button class="yt-btn" onclick="ytClick()">
        <img src="${getProfilePic('yt')}" alt="Profilbild">
      </button>
      <div>Drücke den Button um Clips zu sammeln!</div>
      <div style="margin-top:14px">Videos: ${state.videos.length}</div>
    </div>
    <div id="cutMenu" class="menu">
      <h3>Videos schneiden</h3>
      <div>Clips: <span id="clipsCut">${state.clips}</span></div>
      <input type="number" id="clipsToCut" min="1" max="${state.clips}" value="1"/>
      <button onclick="startCut()">Schneiden</button>
      <div id="cutProgress"></div>
      <div id="videosList">${state.videos.map(v => `<div>${v.name} (${format(v.clips)} Clips)</div>`).join('')}</div>
    </div>
    <div id="shopMenu" class="menu">
      <h3>Shop</h3>
      ${renderShop()}
    </div>
    <div id="twitchMenu" class="menu">
      <h3>Twitch</h3>
      <div>Abos: <b id="aboCountTw">${format(state.abos)}</b> | Twitch-Clips: <b id="twClipCount">${format(state.twClips)}</b></div>
      <button class="tw-btn" onclick="twClick()">
        <img src="${getProfilePic('tw')}" alt="Profilbild">
      </button>
      <div>Drücke für Twitch-Clips!</div>
    </div>
    <div id="profileMenu" class="menu">
      <h3>Profil</h3>
      <div>
        <img src="${getProfilePic('yt')}" style="width:60px;height:60px;border-radius:50%;border:2px solid red;"> <br>YouTube: <b>${state.ytName}</b>
      </div>
      <div>
        <img src="${getProfilePic('tw')}" style="width:60px;height:60px;border-radius:50%;border:2px solid purple;"> <br>Twitch: <input id="twname" type="text" value="${state.twName||""}" placeholder="Twitch Name">
        <button onclick="selectPic('tw')">Profilbild wählen</button>
      </div>
      <div>
        <button onclick="saveProfile()">Speichern</button>
      </div>
      <div>Dein Account-Code:<br>
        <input readonly value="${state.code}" style="width:90%;text-align:center">
      </div>
      <div>
        <h4>Account laden:</h4>
        <input id="accCode" type="text" placeholder="Account-Code eingeben">
        <button onclick="loadAccount()">Laden</button>
      </div>
    </div>
  `;
  document.getElementById("app").innerHTML = menus;
  showMenu("main");
  checkPlayButtons();
}
window.showMenu = function(menu) {
  ["mainMenu", "cutMenu", "shopMenu", "twitchMenu", "profileMenu"].forEach(m =>
    document.getElementById(m)?.classList.remove("active")
  );
  if (menu === "main") document.getElementById("mainMenu").classList.add("active");
  if (menu === "cut") document.getElementById("cutMenu").classList.add("active");
  if (menu === "shop") document.getElementById("shopMenu").classList.add("active");
  if (menu === "twitch") document.getElementById("twitchMenu")?.classList.add("active");
  if (menu === "profile") document.getElementById("profileMenu").classList.add("active");
}
window.saveProfile = function() {
  state.twName = document.getElementById('twname').value.trim();
  saveState(); saveWithCode();
  alert("Gespeichert!");
};
window.loadAccount = function() {
  const code = document.getElementById('accCode').value.trim();
  if (!code) return alert("Bitte Code eingeben.");
  if (!loadState(code)) alert("Kein Account unter diesem Code gefunden!");
  else alert("Account geladen!");
};

// --- BUTTON LOGIC ---
window.ytClick = function() {
  state.clips += 1 * getBoost();
  saveState(); saveWithCode();
  document.getElementById('clipCount').innerText = format(state.clips);
  checkTwitchUnlock();
};
window.twClick = function() {
  state.twClips += 1 * getBoost();
  saveState(); saveWithCode();
  document.getElementById('twClipCount').innerText = format(state.twClips);
  addAbos(1 * getBoost());
};
function getBoost() {
  let boost = 1;
  if (state.playButtons.length) boost *= 1.3 ** state.playButtons.length;
  return boost;
}

// --- CUTTING ---
window.startCut = async function() {
  let amt = parseInt(document.getElementById('clipsToCut').value);
  if (isNaN(amt) || amt < 1 || amt > state.clips) return alert("Ungültige Anzahl Clips!");
  let cutTime = Math.max(2000 - state.upgrades.cutter.level * 150, 650);
  document.getElementById('cutProgress').innerText = `Schneide Video... (${(cutTime/1000).toFixed(2)}s)`;
  await sleep(cutTime);
  state.clips -= amt;
  let vname = prompt("Wie soll das Video heißen?") || "Video #" + (state.videos.length + 1);
  state.videos.push({ name: vname, clips: amt });
  let abosGen = Math.floor(amt * (2 + Math.random()*3));
  addAbos(abosGen);
  saveState(); saveWithCode();
  render();
};

// --- ABONNENTEN & PLAY-BUTTONS ---
function addAbos(count) {
  let boost = getBoost();
  state.abos += Math.floor(count * boost);
  checkPlayButtons();
  checkTwitchUnlock();
  saveState(); saveWithCode();
}
function checkPlayButtons() {
  for (let pb of PLAY_BUTTON_THRESHOLDS) {
    if (state.abos >= pb.abos && !state.playButtons.includes(pb.name)) {
      state.playButtons.push(pb.name);
      alert(`Du hast den ${pb.name}-Play-Button erhalten! (+30% Boost)`);
    }
  }
}
function checkTwitchUnlock() {
  if (!state.twitchActive && state.abos >= 5000) {
    state.twitchActive = true;
    alert("Twitch wurde freigeschaltet!");
    render();
  }
}

// --- SHOP/UPGRADE ---
function renderShop() {
  const ups = state.upgrades;
  const items = [
    {
      id: "cutter",
      name: "Cutter (schneidet Videos automatisch)",
      level: ups.cutter.level,
      cost: expCost(ups.cutter.base, ups.cutter.level),
      desc: `+1 Auto-Video/Minute. Kürzere Schnittzeit.`,
    },
    {
      id: "clicker",
      name: "Klicker (macht Auto-Klicks)",
      level: ups.clicker.level,
      cost: expCost(ups.clicker.base, ups.clicker.level),
      desc: `+${ups.clicker.level+1} Auto-Klicks/Sek.`,
    },
    {
      id: "streamer",
      name: "Streamer (macht Auto-Twitch-Klicks)",
      level: ups.streamer.level,
      cost: expCost(ups.streamer.base, ups.streamer.level),
      desc: `+${ups.streamer.level+1} Auto-Twitch/Sek.`,
    },
    {
      id: "manager",
      name: "Manager (gibt +5% Speed auf alles)",
      level: ups.manager.level,
      cost: expCost(ups.manager.base, ups.manager.level),
      desc: `+${(ups.manager.level+1)*5}% Boost auf alles.`,
    },
  ];
  return items.map(item => `
    <div class="shop-item">
      <div>
        <b>${item.name}</b> <br>
        Stufe: ${item.level} <br>
        <small>${item.desc}</small>
      </div>
      <div>
        <button class="shop-upgrade" onclick="buyUpgrade('${item.id}',${item.cost})">Kaufen<br>${format(item.cost)} Clips</button>
      </div>
    </div>
  `).join('');
}
window.buyUpgrade = function(type, cost) {
  if (state.clips < cost) return alert("Nicht genug Clips!");
  state.clips -= cost;
  state.upgrades[type].level++;
  if (type === "manager") state.shopBoost = 1 + state.upgrades.manager.level * 0.05;
  saveState(); saveWithCode();
  render();
};

// --- AUTO-LOOPS ---
function runAuto() {
  if (autoInterval) clearInterval(autoInterval);
  autoInterval = setInterval(() => {
    // Klicker
    let c = state.upgrades.clicker.level;
    if (c > 0) {
      state.clips += (c+1) * getBoost() * state.shopBoost;
    }
    // Streamer
    let s = state.upgrades.streamer.level;
    if (state.twitchActive && s > 0) {
      state.twClips += (s+1) * getBoost() * state.shopBoost;
      addAbos((s+1)*getBoost()*0.2);
    }
    // Cutter
    let cut = state.upgrades.cutter.level;
    if (cut > 0 && state.clips >= 5) {
      let interval = Math.max(60000/(cut+1), 9000);
      if (Math.random() < 1/(interval/1000)) {
        state.clips -= 5;
        state.videos.push({ name: "Auto-Video", clips: 5 });
        addAbos(15 * getBoost());
      }
    }
    saveState(); saveWithCode();
    // Play-Button-Check
    checkPlayButtons();
    // Twitch unlock
    checkTwitchUnlock();
    // UI live update
    if (document.getElementById('clipCount')) document.getElementById('clipCount').innerText = format(state.clips);
    if (document.getElementById('aboCount')) document.getElementById('aboCount').innerText = format(state.abos);
    if (document.getElementById('twClipCount')) document.getElementById('twClipCount').innerText = format(state.twClips);
  }, 950);
}
