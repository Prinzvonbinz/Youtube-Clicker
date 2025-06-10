l// === YouTube Clicker Game ===

// --- GLOBALS ---
const BOOSTS = [1000, 10000, 100000, 1000000, 10000000]; // Play-Button Thresholds

const defaultProfilePic = "https://yt3.ggpht.com/ytc/AGIKgqP4lS6rYj1R6dRIGI6ViQhA6v1O1eJk=s88-c-k-c0x00ffffff-no-rj"; // fallback img

const initialState = {
  profile: {
    youtubeName: "",
    youtubePic: "",
    twitchName: "",
    twitchPic: "",
    code: "",
  },
  stats: {
    clips: 0,
    videos: [],
    abos: 0,
    playButtons: [],
    twitchUnlocked: false,
  },
  upgrades: {
    clicker: 0,
    cutter: 0,
    streamer: 0,
    manager: 0,
  },
  shopBase: {
    clicker: 50,
    cutter: 200,
    streamer: 100,
    manager: 1000,
  },
  shopExp: {
    clicker: 1.25,
    cutter: 1.20,
    streamer: 1.3,
    manager: 1.4,
  },
  inProgress: {
    cutting: false,
    cuttingCount: 0,
    cuttingTotal: 0,
    cuttingName: "",
  },
  twitch: {
    twitchClips: 0,
    twitchVideos: [],
    twitchAbos: 0,
    twitchStreamActive: false,
  }
};

let state = {};

const app = document.getElementById("app");

// --- STORAGE ---
function saveState() {
  localStorage.setItem("ytclicker-save", JSON.stringify(state));
}
function loadState() {
  let s = localStorage.getItem("ytclicker-save");
  if(s) {
    state = JSON.parse(s);
    // Backward compatible
    if (!state.profile.twitchName) state.profile.twitchName = "";
    if (!state.profile.twitchPic) state.profile.twitchPic = "";
    if (!state.twitch) state.twitch = initialState.twitch;
    if (!state.upgrades.streamer) state.upgrades.streamer=0;
    if (!state.stats.playButtons) state.stats.playButtons=[];
    if (!state.inProgress) state.inProgress = initialState.inProgress;
    if (!state.shopExp) state.shopExp = initialState.shopExp;
    if (!state.shopBase) state.shopBase = initialState.shopBase;
  } else {
    newGame();
  }
}
function getProfileCode() {
  // Kurzcode aus Profil
  let data = Object.assign({}, state.profile, state.stats, state.upgrades, state.twitch);
  let code = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  return code;
}
function importProfileCode(code) {
  try {
    let data = JSON.parse(decodeURIComponent(escape(atob(code))));
    state.profile = {
      youtubeName: data.youtubeName,
      youtubePic: data.youtubePic,
      twitchName: data.twitchName || "",
      twitchPic: data.twitchPic || "",
      code: "", // wird neu generiert
    };
    state.stats = {
      clips: data.clips,
      videos: data.videos,
      abos: data.abos,
      playButtons: data.playButtons || [],
      twitchUnlocked: data.twitchUnlocked || false,
    };
    state.upgrades = {
      clicker: data.clicker,
      cutter: data.cutter,
      streamer: data.streamer||0,
      manager: data.manager,
    };
    state.twitch = {
      twitchClips: data.twitchClips||0,
      twitchVideos: data.twitchVideos||[],
      twitchAbos: data.twitchAbos||0,
      twitchStreamActive: false,
    };
    saveState();
    render();
    alert("Profil erfolgreich geladen!");
  } catch(e) {
    alert("Ungültiger Code!");
  }
}
function newGame() {
  state = JSON.parse(JSON.stringify(initialState));
  renderSetup();
}

// --- HELPERS ---
function formatNum(x) {
  if (x>=1e9) return (x/1e9).toFixed(2)+"B";
  if (x>=1e6) return (x/1e6).toFixed(2)+"M";
  if (x>=1e3) return (x/1e3).toFixed(2)+"K";
  return x;
}
function getShopPrice(item) {
  let base = state.shopBase[item];
  let exp = state.shopExp[item];
  let n = state.upgrades[item];
  return Math.round(base * Math.pow(exp, n));
}
function getManagerBoost() {
  return 1 + state.upgrades.manager * 0.05;
}
function getCutterSpeed() {
  // Zeit für 1 Clip in ms
  let base = 1800;
  let cutLevel = state.upgrades.cutter;
  return Math.max(350, base / (1+cutLevel) / getManagerBoost());
}
function getClickerSpeed() {
  // Automatisch, je höher desto schneller
  let base = 1600;
  let clickLevel = state.upgrades.clicker;
  return base / (1+clickLevel) / getManagerBoost();
}
function getStreamerSpeed() {
  let base = 1800;
  let streamerLevel = state.upgrades.streamer;
  return base / (1+streamerLevel) / getManagerBoost();
}
function getPlayButtonBoost() {
  return 1 + (state.stats.playButtons.length * 0.3);
}
function getTotalAboBoost() {
  return getPlayButtonBoost();
}
function getAboGain() {
  // Abos pro Video = 10 * Boost
  return Math.round(10 * getTotalAboBoost());
}
function getAboLoss() {
  // Chance auf Abo-Verlust pro Video
  return Math.random()<0.1 ? Math.round(2*getTotalAboBoost()) : 0;
}
function checkPlayButton() {
  for (let threshold of BOOSTS) {
    if (state.stats.abos >= threshold && !state.stats.playButtons.includes(threshold)) {
      state.stats.playButtons.push(threshold);
      saveState();
      alert(`Herzlichen Glückwunsch! Du hast den Play-Button für ${formatNum(threshold)} Abos erhalten. (+30% Boost)`);
    }
  }
}
function unlockTwitchMenu() {
  if (!state.stats.twitchUnlocked && state.stats.abos>=5000) {
    state.stats.twitchUnlocked = true;
    saveState();
    alert("Twitch Menü freigeschaltet! Jetzt kannst du deinen Twitch-Kanal verwalten und streamen.");
  }
}

// --- GAME LOOP ---
let clickerInterval = null, cutterInterval = null, streamerInterval = null;
function startLoops() {
  if (clickerInterval) clearInterval(clickerInterval);
  if (cutterInterval) clearInterval(cutterInterval);
  if (streamerInterval) clearInterval(streamerInterval);

  if (state.upgrades.clicker>0) {
    clickerInterval = setInterval(()=>{
      state.stats.clips += 1*getPlayButtonBoost();
      saveState(); renderMain();
    }, getClickerSpeed());
  }
  if (state.upgrades.cutter>0) {
    cutterInterval = setInterval(()=>{
      if (state.stats.clips>=5 && !state.inProgress.cutting) {
        startCutting(5);
      }
    }, 1500);
  }
  if (state.upgrades.streamer>0 && state.stats.twitchUnlocked) {
    streamerInterval = setInterval(()=>{
      state.twitch.twitchClips += 1*getPlayButtonBoost();
      saveState(); renderTwitch();
    }, getStreamerSpeed());
  }
}

// --- RENDER LOGIC ---
function render() {
  if (!state.profile.youtubeName) {
    renderSetup();
    return;
  }
  renderApp();
}
function renderSetup() {
  app.innerHTML = `
    <header>YouTube Clicker</header>
    <form id="setup-form">
      <label>YouTube-Kanalname:</label>
      <input type="text" id="ytn" maxlength="24" required placeholder="MeinKanal"/><br>
      <label>Profilbild:</label>
      <input type="file" accept="image/*" id="ytpic" />
      <div id="picPreview" style="margin:0.8em 0"></div>
      <button type="submit">Weiter</button>
    </form>
    <div style="margin-top:2em;font-size:1em;color:#aaa">Fortschritt wird lokal gespeichert</div>
    <div style="margin-top:2em;"><button id="loadProfileBtn">Profil laden (Code)</button></div>
  `;
  let ytPic = "";
  document.getElementById("ytpic").addEventListener("change", (e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      ytPic = ev.target.result;
      document.getElementById("picPreview").innerHTML = `<img src="${ytPic}" alt="Profilbild" style="width:80px;height:80px;border-radius:40px;object-fit:cover"/>`;
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("setup-form").onsubmit=(e)=>{
    e.preventDefault();
    state.profile.youtubeName = document.getElementById("ytn").value;
    state.profile.youtubePic = ytPic || defaultProfilePic;
    state.profile.code = getProfileCode();
    saveState();
    render();
  };
  document.getElementById('loadProfileBtn').onclick=()=>{
    let code = prompt("Profil-Code eingeben");
    if(code) importProfileCode(code.trim());
  };
}

function renderApp() {
  let menu = `
    <div class="menu">
      <button id="mainMenuBtn" class="active">YouTube</button>
      ${state.stats.twitchUnlocked?'<button id="twitchMenuBtn">Twitch</button>':''}
      <button id="cutMenuBtn">Video schneiden</button>
      <button id="shopMenuBtn">Shop</button>
      <button id="profileMenuBtn">Profil</button>
    </div>
  `;
  app.innerHTML = menu + `<div id="main-content"></div>`;
  renderMain();

  document.getElementById("mainMenuBtn").onclick=()=>{
    setActiveMenu("mainMenuBtn");
    renderMain();
  };
  if (state.stats.twitchUnlocked)
  document.getElementById("twitchMenuBtn").onclick=()=>{
    setActiveMenu("twitchMenuBtn");
    renderTwitch();
  };
  document.getElementById("cutMenuBtn").onclick=()=>{
    setActiveMenu("cutMenuBtn");
    renderCutMenu();
  };
  document.getElementById("shopMenuBtn").onclick=()=>{
    setActiveMenu("shopMenuBtn");
    renderShop();
  };
  document.getElementById("profileMenuBtn").onclick=()=>{
    setActiveMenu("profileMenuBtn");
    renderProfile();
  };
  startLoops();
}
function setActiveMenu(id) {
  for (let btn of document.querySelectorAll(".menu button")) btn.classList.remove("active");
  document.getElementById(id).classList.add("active");
}

function renderMain() {
  let c = state.stats.clips;
  let abos = state.stats.abos;
  let boost = Math.round(getPlayButtonBoost()*100-100);
  let pbHtml = state.stats.playButtons.map(pb=>`<span style="color: gold; font-size:1.2em">🏆${formatNum(pb)}</span>`).join(" ");
  document.getElementById("main-content").innerHTML = `
    <div class="center-btn">
      <button id="main-button" title="Clips aufnehmen">
        <img src="${state.profile.youtubePic||defaultProfilePic}" alt="Profilbild">
      </button>
      <div>Clips: <b>${formatNum(c)}</b></div>
      <div style="margin-top:1em;font-size:1.1em;">
        <span>Abonnenten: <b>${formatNum(abos)}</b></span>
        ${pbHtml?'<div style="margin-top:0.6em">'+pbHtml+'</div>':""}
      </div>
      <div style="margin-top:1em;font-size:0.95em;color:#aaa">Boost: +${boost}%</div>
    </div>
    <div class="stat-group">
      <div class="stat">Videos: <b>${state.stats.videos.length}</b></div>
      <div class="stat">Abos/Video: <b>${getAboGain()}</b></div>
      <div class="stat">Videos geschnitten: <b>${state.inProgress.cuttingTotal}</b></div>
    </div>
  `;
  document.getElementById("main-button").onclick=()=>{
    state.stats.clips += 1*getPlayButtonBoost();
    saveState(); renderMain();
  };
}

function renderCutMenu() {
  let c = state.stats.clips;
  let cut = state.inProgress.cutting;
  let inProg = cut ? `
    <div style="margin-top:1em">
      <b>Video wird geschnitten...</b>
      <div class="progress-bar">
        <div class="progress-bar-inner" style="width:${Math.round(100*state.inProgress.cuttingCount/state.inProgress.cuttingTotal)}%"></div>
      </div>
      <div>Clips verbleibend: ${state.inProgress.cuttingTotal-state.inProgress.cuttingCount}</div>
    </div>
  ` : "";
  let canCut = state.stats.clips >= 5 && !cut;
  document.getElementById("main-content").innerHTML = `
    <div style="margin:1em 0;">
      <b>Clips: ${formatNum(c)}</b>
      <form id="cutForm" style="margin-top:1em;">
        <label>Wie viele Clips zu Video schneiden? (min 5)</label>
        <input type="number" id="cutCount" min="5" max="${c}" value="5"/>
        <label>Videoname:</label>
        <input type="text" id="vidName" maxlength="32" required placeholder="Mein Video"/>
        <button type="submit" ${!canCut?'disabled':''}>Starten</button>
      </form>
      ${inProg}
    </div>
    <div style="margin-top:2em">
      <b>Videos:</b>
      <ul>
        ${state.stats.videos.map(v=>`<li>${v.name} (${formatNum(v.clips)} Clips, ${formatNum(v.abos)} Abos)</li>`).join("")}
      </ul>
    </div>
  `;
  if (canCut) {
    document.getElementById("cutForm").onsubmit=(e)=>{
      e.preventDefault();
      let n = Number(document.getElementById("cutCount").value);
      let name = document.getElementById("vidName").value;
      if (n>=5 && n<=state.stats.clips && name.length>0) {
        startCutting(n, name);
        renderCutMenu();
      }
    }
  }
  // Progress loop
  if (cut) {
    let totalMs = state.inProgress.cuttingTotal * getCutterSpeed();
    let start = Date.now();
    let tick = ()=>{
      if (!state.inProgress.cutting) return;
      let elapsed = Date.now() - start;
      let prog = Math.min(1, elapsed/totalMs);
      state.inProgress.cuttingCount = Math.round(prog*state.inProgress.cuttingTotal);
      renderCutMenu();
      if (prog<1) setTimeout(tick, 100);
      else finishCutting();
    };
    tick();
  }
}
function startCutting(n, name="Video") {
  state.inProgress.cutting = true;
  state.inProgress.cuttingCount = 0;
  state.inProgress.cuttingTotal = n;
  state.inProgress.cuttingName = name;
  saveState();
}
function finishCutting() {
  let n = state.inProgress.cuttingTotal;
  let name = state.inProgress.cuttingName;
  state.stats.clips -= n;
  // Upload
  let abos = getAboGain();
  let loss = getAboLoss();
  state.stats.abos += abos - loss;
  if (state.stats.abos<0) state.stats.abos=0;
  state.stats.videos.push({name,clips:n,abos});
  state.inProgress.cutting = false;
  state.inProgress.cuttingCount = 0;
  state.inProgress.cuttingTotal = 0;
  state.inProgress.cuttingName = "";
  saveState();
  checkPlayButton();
  unlockTwitchMenu();
  renderMain();
  alert(`Video "${name}" hochgeladen!\n+${abos} Abos${loss?`\n-${loss} Abos`:''}`);
}

function renderShop() {
  let items = [
    {id:'clicker',name:'Klicker',desc:'Klickt automatisch für dich.'},
    {id:'cutter',name:'Cutter',desc:'Schneidet Videos automatisch.'},
    {id:'streamer',name:'Streamer',desc:'Streamt automatisch auf Twitch.'},
    {id:'manager',name:'Manager',desc:'+5% Speed für alles pro Upgrade.'}
  ];
  document.getElementById("main-content").innerHTML = `
    <div class="shop">
      ${items.map(it=>{
        let price = getShopPrice(it.id);
        let lvl = state.upgrades[it.id];
        let upg = (it.id=="manager")?`+${lvl*5}% Speed`:`Level ${lvl}`;
        return `
          <div class="shop-item">
            <div class="row">
              <div>
                <b>${it.name}</b> <span style="font-size:0.9em;color:#aaa">${it.desc}</span>
              </div>
              <div>
                <button id="buy-${it.id}" ${state.stats.abos<price?'disabled':''}>Kaufen (${formatNum(price)})</button>
              </div>
            </div>
            <div class="row" style="font-size:0.95em;color:#ccc">${upg}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
  for (let it of items) {
    document.getElementById(`buy-${it.id}`).onclick=()=>{
      let price = getShopPrice(it.id);
      if (state.stats.abos>=price) {
        state.stats.abos -= price;
        state.upgrades[it.id]++;
        saveState();
        renderShop();
        startLoops();
      }
    }
  }
}

function renderTwitch() {
  let t = state.twitch;
  let boost = Math.round(getPlayButtonBoost()*100-100);
  let pbHtml = state.stats.playButtons.map(pb=>`<span style="color: gold; font-size:1.2em">🏆${formatNum(pb)}</span>`).join(" ");
  document.getElementById("main-content").innerHTML = `
    <div class="center-btn">
      <button id="twitch-button" title="Stream starten">
        <img src="${state.profile.twitchPic||defaultProfilePic}" alt="Twitch Profil">
      </button>
      <div>Twitch-Clips: <b>${formatNum(t.twitchClips)}</b></div>
      <div style="margin-top:1em;font-size:1.1em;">
        <span>Twitch-Abos: <b>${formatNum(t.twitchAbos)}</b></span>
        ${pbHtml?'<div style="margin-top:0.6em">'+pbHtml+'</div>':""}
      </div>
      <div style="margin-top:1em;font-size:0.95em;color:#aaa">Boost: +${boost}%</div>
    </div>
    <div class="stat-group">
      <div class="stat">Streams: <b>${t.twitchVideos.length}</b></div>
      <div class="stat">Abos/Stream: <b>${getAboGain()}</b></div>
    </div>
  `;
  document.getElementById("twitch-button").onclick=()=>{
    t.twitchClips += 1*getPlayButtonBoost();
    saveState(); renderTwitch();
  };
}

// --- PROFILE ---
function renderProfile() {
  document.getElementById("main-content").innerHTML = `
    <h2>Profil</h2>
    <div>
      <label>YouTube-Kanalname:</label>
      <input type="text" id="edit-ytname" value="${state.profile.youtubeName}" maxlength="24"/>
    </div>
    <div>
      <label>Profilbild:</label>
      <input type="file" accept="image/*" id="edit-ytpic"/>
      <img src="${state.profile.youtubePic||defaultProfilePic}" style="width:54px;height:54px;border-radius:27px;object-fit:cover;vertical-align:middle;margin-left:1em"/>
    </div>
    <hr/>
    <div>
      <label>Twitch-Kanalname:</label>
      <input type="text" id="edit-twitchname" value="${state.profile.twitchName||""}" maxlength="24"/>
    </div>
    <div>
      <label>Twitch-Profilbild:</label>
      <input type="file" accept="image/*" id="edit-twitchpic"/>
      <img src="${state.profile.twitchPic||defaultProfilePic}" style="width:54px;height:54px;border-radius:27px;object-fit:cover;vertical-align:middle;margin-left:1em"/>
    </div>
    <div style="margin:1em 0 0.3em;font-size:1.1em;">
      <b>Profil-Code:</b>
      <input type="text" id="profileCodeOut" value="${getProfileCode()}" readonly style="width:90%"/>
      <button id="copyProfileCodeBtn">Kopieren</button>
    </div>
    <div>
      <button id="importProfileBtn">Profil laden (Code)</button>
      <button id="resetBtn" style="background:#222;color:#fff;">Neues Spiel</button>
    </div>
  `;
  document.getElementById("edit-ytname").onchange=(e)=>{
    state.profile.youtubeName = e.target.value;
    saveState();
  };
  document.getElementById("edit-twitchname").onchange=(e)=>{
    state.profile.twitchName = e.target.value;
    saveState();
  };
  document.getElementById("edit-ytpic").onchange=(e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      state.profile.youtubePic = ev.target.result;
      saveState();
      renderProfile();
    };
    reader.readAsDataURL(file);
  };
  document.getElementById("edit-twitchpic").onchange=(e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      state.profile.twitchPic = ev.target.result;
      saveState();
      renderProfile();
    };
    reader.readAsDataURL(file);
  };
  document.getElementById("copyProfileCodeBtn").onclick=()=>{
    let code = document.getElementById("profileCodeOut").value;
    navigator.clipboard.writeText(code);
    alert("Code kopiert!");
  };
  document.getElementById("importProfileBtn").onclick=()=>{
    let code = prompt("Profil-Code einfügen");
    if(code) importProfileCode(code.trim());
  };
  document.getElementById("resetBtn").onclick=()=>{
    if (confirm("Willst du wirklich ein neues Spiel starten?")) newGame();
  }
}

// --- INIT ---
loadState();
render();
