// --- Game Data Model ---
const defaultData = () => ({
  channelName: "",
  profileImg: "",
  twitchName: "",
  twitchImg: "",
  code: "",
  clips: 0,
  videos: [],
  abos: 0,
  twitchAbos: 0,
  playButtons: 0,
  unlockedTwitch: false,
  shop: {
    cutter: { level: 0, price: 50 },
    klicker: { level: 0, price: 20 },
    streamer: { level: 0, price: 100 },
    manager: { level: 0, price: 200 }
  },
  upgrades: {
    playButtonBoost: 1,
    managerBoost: 1
  },
  auto: {
    cutterTimer: 0,
    klickerTimer: 0,
    streamerTimer: 0
  }
});

let data = null;

// --- LocalStorage ---
function save() {
  localStorage.setItem("ytclicker_save", JSON.stringify(data));
}
function load() {
  const d = localStorage.getItem("ytclicker_save");
  if (d) data = JSON.parse(d);
  else data = defaultData();
}
function genCode() {
  // Simple code (channelName + random 4 digits)
  return (data.channelName || "YT") + "_" + Math.floor(1000 + Math.random()*9000);
}
function importFromCode(code) {
  const save = localStorage.getItem("ytclicker_sync_" + code);
  if (save) {
    data = JSON.parse(save);
    saveToSyncCode(); // update latest
    save();
    render();
    alert("Account geladen!");
  } else {
    alert("Kein Account mit diesem Code gefunden!");
  }
}
function saveToSyncCode() {
  if (!data.code) data.code = genCode();
  localStorage.setItem("ytclicker_sync_" + data.code, JSON.stringify(data));
}

// --- UI Rendering ---
const app = document.getElementById("app");

function render() {
  save();
  saveToSyncCode();
  if (!data.channelName) return renderStart();
  renderMain();
}

// --- Startscreen ---
function renderStart() {
  app.innerHTML = `
    <div class="center menu">
      <h2>Starte deinen YouTube Kanal</h2>
      <div>
        <img src="${data.profileImg||'https://www.gstatic.com/youtube/img/branding/youtubelogo/svg/youtubelogo.svg'}" class="input-img" id="startProfileImg">
        <br>
        <button onclick="document.getElementById('profileImgInput').click()" class="btn">Profilbild wählen</button>
      </div>
      <div class="input-row">
        <input type="text" id="startChannelName" placeholder="Kanalname" maxlength="20" style="font-size:1.2em;padding:8px;border-radius:8px;">
      </div>
      <button class="btn" onclick="startGame()">Start</button>
    </div>`;
  document.getElementById("startProfileImg").onclick = () =>
    document.getElementById("profileImgInput").click();
}
window.onload = () => {
  load();
  render();
};
// Profilbild Upload
document.getElementById("profileImgInput").addEventListener("change", function(e){
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    data.profileImg = evt.target.result;
    render();
  }
  reader.readAsDataURL(file);
});

// --- Twitch Profilbild Upload ---
document.getElementById("twitchImgInput").addEventListener("change", function(e){
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    data.twitchImg = evt.target.result;
    renderProfile();
  }
  reader.readAsDataURL(file);
});

window.startGame = function() {
  const name = document.getElementById("startChannelName").value.trim();
  if (!name) { alert("Bitte Kanalname eingeben!"); return; }
  data.channelName = name;
  data.code = genCode();
  save();
  render();
};

// --- Main Game ---
function renderMain() {
  app.innerHTML = `
    <div class="center">
      <img src="${data.profileImg}" class="yt-btn" onclick="ytClick()" title="Clip aufnehmen">
      <div><b>${data.channelName}</b></div>
      <div>Clips: <b id="clips">${data.clips}</b></div>
      <div>Abonnenten: <b id="abos">${data.abos}</b></div>
      <div>Play-Buttons: <b id="playButtons">${data.playButtons}</b></div>
      <div>
        <button class="btn" onclick="renderCutMenu()" ${data.clips<10?"disabled":""}>Clips schneiden</button>
        <button class="btn" onclick="renderShop()">Shop</button>
        <button class="btn" onclick="renderProfile()">Profil</button>
        ${data.unlockedTwitch?'<button class="btn" onclick="renderTwitch()">Twitch</button>':''}
      </div>
      <div class="video-list">
        <h4>Deine Videos:</h4>
        ${data.videos.map(v=>`<div class="video-entry">${v.title} (${v.clips} Clips) - <b>+${v.abos} Abos</b></div>`).join("")}
      </div>
    </div>
  `;
}

// --- Youtube Button (Klicker) ---
window.ytClick = function() {
  let boost = 1 * data.upgrades.playButtonBoost * data.upgrades.managerBoost;
  boost *= 1 + data.shop.klicker.level * 0.5;
  data.clips += boost;
  data.clips = Math.floor(data.clips);
  render();
  checkTwitchUnlock();
};

// --- Cut-Menü ---
window.renderCutMenu = function() {
  app.innerHTML = `
    <div class="center menu">
      <h3>Clips schneiden</h3>
      <div>Clips verfügbar: <b>${data.clips}</b></div>
      <div class="input-row"><input type="text" id="videoTitle" maxlength="20" placeholder="Videotitel" style="font-size:1em;padding:6px;border-radius:8px;"></div>
      <button class="btn" onclick="cutVideo()" ${data.clips<10?"disabled":""}>Jetzt schneiden (${cutTime()} Sek)</button>
      <div><button class="btn" onclick="renderMain()">Zurück</button></div>
    </div>
  `;
};
// Clips zu Video schneiden (simuliert Timer)
window.cutVideo = function() {
  const title = document.getElementById("videoTitle").value.trim() || "Mein Video";
  if (data.clips<10) return alert("Mindestens 10 Clips nötig!");
  let time = cutTime();
  app.innerHTML = `
    <div class="center menu">
      <h3>Video wird geschnitten...</h3>
      <div>Verbleibende Zeit: <span id="cutTimer">${time}</span> s</div>
    </div>
  `;
  let interval = setInterval(()=>{
    time--;
    document.getElementById("cutTimer").textContent = time;
    if(time<=0) {
      clearInterval(interval);
      finishVideo(title);
    }
  },1000);
};
function cutTime() {
  let base = 10;
  let speed = 1 + data.shop.cutter.level * 1.5;
  let boost = data.upgrades.playButtonBoost * data.upgrades.managerBoost;
  return Math.max(2, Math.round(base / speed / boost));
}
function finishVideo(title) {
  let clipsUsed = 10;
  data.clips -= clipsUsed;
  if (data.clips<0) data.clips = 0;
  // Abonnenten generieren: Basis + Upgrade + PlayButtonBoost
  let abos = Math.floor(5 * (1 + data.videos.length/5) * data.upgrades.playButtonBoost * data.upgrades.managerBoost);
  // Chance auf Verlust wenn zu viele Videos
  if (data.videos.length>5 && Math.random()>0.7) abos = Math.floor(abos*0.7);
  data.abos += abos;
  data.videos.push({title, clips:clipsUsed, abos:abos});
  // PlayButton ab Meilenstein
  checkPlayButton();
  renderMain();
}

// --- Shop ---
window.renderShop = function() {
  app.innerHTML = `
    <div class="center menu">
      <h3>Shop</h3>
      <div class="shop-item">
        <div>Cutter (Level ${data.shop.cutter.level})<br><small>Schneidet Videos automatisch</small></div>
        <button class="btn" onclick="upgradeShop('cutter')">Kaufen<br>(${shopPrice('cutter')} Clips)</button>
      </div>
      <div class="shop-item">
        <div>Klicker (Level ${data.shop.klicker.level})<br><small>Klickt automatisch</small></div>
        <button class="btn" onclick="upgradeShop('klicker')">Kaufen<br>(${shopPrice('klicker')} Clips)</button>
      </div>
      <div class="shop-item">
        <div>Streamer (Level ${data.shop.streamer.level})<br><small>Twitch-Klicks automatisch</small></div>
        <button class="btn" onclick="upgradeShop('streamer')">Kaufen<br>(${shopPrice('streamer')} Clips)</button>
      </div>
      <div class="shop-item">
        <div>Manager (Level ${data.shop.manager.level})<br><small>+5% Speed für alles</small></div>
        <button class="btn" onclick="upgradeShop('manager')">Kaufen<br>(${shopPrice('manager')} Clips)</button>
      </div>
      <div>
        <button class="btn" onclick="renderMain()">Zurück</button>
      </div>
    </div>
  `;
};
window.upgradeShop = function(item) {
  let price = shopPrice(item);
  if (data.clips < price) return alert("Nicht genug Clips!");
  data.clips -= price;
  data.shop[item].level += 1;
  data.shop[item].price = Math.round(data.shop[item].price * 1.6); // Preis exponentiell
  if(item==='manager') data.upgrades.managerBoost = 1 + 0.05 * data.shop.manager.level;
  renderShop();
};
function shopPrice(item) {
  return data.shop[item].price;
}

// --- Auto-Worker Loops (Cutter, Klicker, Streamer) ---
setInterval(()=>{
  // Cutter: schneidet automatisch wenn genug Clips
  if (data.shop.cutter.level>0 && data.clips>=10) {
    data.auto.cutterTimer += data.shop.cutter.level * data.upgrades.playButtonBoost * data.upgrades.managerBoost * 0.25;
    if (data.auto.cutterTimer >= cutTime()) {
      data.auto.cutterTimer = 0;
      finishVideo("Auto-Video");
    }
  }
  // Klicker: produziert Clips automatisch
  if (data.shop.klicker.level>0) {
    data.auto.klickerTimer += 0.33 * data.shop.klicker.level * data.upgrades.playButtonBoost * data.upgrades.managerBoost;
    if (data.auto.klickerTimer>=1) {
      data.clips += Math.floor(data.auto.klickerTimer); data.auto.klickerTimer=0;
    }
  }
  // Streamer: produziert Twitch-Klicks automatisch
  if (data.shop.streamer.level>0 && data.unlockedTwitch) {
    data.auto.streamerTimer += 0.33 * data.shop.streamer.level * data.upgrades.playButtonBoost * data.upgrades.managerBoost;
    if (data.auto.streamerTimer>=1) {
      data.twitchAbos += Math.floor(data.auto.streamerTimer); data.auto.streamerTimer=0;
    }
  }
  renderMainMinimal();
  checkTwitchUnlock();
  save();
}, 1000);

function renderMainMinimal() {
  // Update only values for performance
  if (document.getElementById("clips")) document.getElementById("clips").textContent = data.clips;
  if (document.getElementById("abos")) document.getElementById("abos").textContent = data.abos;
  if (document.getElementById("playButtons")) document.getElementById("playButtons").textContent = data.playButtons;
}

// --- Twitch Unlock ---
function checkTwitchUnlock() {
  if (!data.unlockedTwitch && data.abos>=100) {
    data.unlockedTwitch = true;
    alert("Du hast das Twitch-Menü freigeschaltet!");
    render();
  }
}

// --- Twitch Menü ---
window.renderTwitch = function() {
  app.innerHTML = `
    <div class="center menu">
      <h3>Twitch Menü</h3>
      <img src="${data.twitchImg||data.profileImg||'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png'}" class="tw-btn" onclick="twitchClick()" title="Streamen!">
      <div><b>${data.twitchName||"DeinTwitchKanal"}</b></div>
      <div>Twitch-Abonnenten: <b>${data.twitchAbos}</b></div>
      <div>
        <button class="btn" onclick="renderTwitchProfile()">Twitch-Profil</button>
        <button class="btn" onclick="renderMain()">Zurück</button>
      </div>
    </div>
  `;
};
window.twitchClick = function() {
  let boost = 1 * data.upgrades.playButtonBoost * data.upgrades.managerBoost;
  boost *= 1 + data.shop.streamer.level * 0.5;
  data.twitchAbos += boost;
  data.twitchAbos = Math.floor(data.twitchAbos);
  renderTwitch();
};

// --- Twitch Profil ---
window.renderTwitchProfile = function() {
  app.innerHTML = `
    <div class="center menu">
      <h3>Twitch-Profil bearbeiten</h3>
      <img src="${data.twitchImg||'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png'}" class="input-img" id="twitchProfileImg">
      <br>
      <button class="btn" onclick="document.getElementById('twitchImgInput').click()">Profilbild ändern</button>
      <div class="input-row">
        <input type="text" id="twitchNameInput" value="${data.twitchName||""}" placeholder="Twitch-Kanalname" maxlength="20" style="font-size:1em;padding:6px;border-radius:8px;">
      </div>
      <button class="btn" onclick="saveTwitchProfile()">Speichern</button>
      <button class="btn" onclick="renderTwitch()">Zurück</button>
    </div>
  `;
  document.getElementById("twitchProfileImg").onclick = () =>
    document.getElementById("twitchImgInput").click();
};
window.saveTwitchProfile = function() {
  data.twitchName = document.getElementById("twitchNameInput").value.trim() || "MeinTwitch";
  renderTwitch();
};

// --- Play-Button Unlock ---
function checkPlayButton() {
  // PlayButton ab z.B. 100, 1000, 10000, ... Abos
  let steps = [100, 1000, 10000, 100000, 1000000];
  for (let i=0;i<steps.length;i++) {
    if (data.abos>=steps[i] && data.playButtons<i+1) {
      data.playButtons = i+1;
      data.upgrades.playButtonBoost = 1 + 0.3 * data.playButtons;
      alert("Du hast einen Play-Button erhalten! Alles wird 30% schneller.");
    }
  }
}

// --- Profil-Menü ---
window.renderProfile = function() {
  app.innerHTML = `
    <div class="center menu">
      <h3>Profil</h3>
      <img src="${data.profileImg}" class="profile-img"><br>
      <b>${data.channelName}</b><br><br>
      <div>Twitch: <img src="${data.twitchImg||'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png'}" style="width:28px;height:28px;border-radius:50%;vertical-align:middle;"> ${data.twitchName||'–'}</div>
      <div class="input-row"><b>Account-Code:</b><br>
        <span style="font-size:1.1em;letter-spacing:2px;background:#444;padding:3px 10px;border-radius:6px;">${data.code}</span>
      </div>
      <div class="input-row">
        <button class="btn" onclick="renderSync()">Account auf anderes Gerät laden</button>
      </div>
      <button class="btn" onclick="renderMain()">Zurück</button>
    </div>
  `;
};

// --- Sync via Code ---
window.renderSync = function() {
  app.innerHTML = `
    <div class="center menu">
      <h3>Account laden</h3>
      <div class="input-row"><input type="text" id="syncCodeInput" placeholder="Account-Code eingeben" maxlength="30" style="font-size:1em;padding:6px;border-radius:8px;"></div>
      <button class="btn" onclick="doSync()">Laden</button>
      <button class="btn" onclick="renderProfile()">Zurück</button>
    </div>
  `;
};
window.doSync = function() {
  const code = document.getElementById("syncCodeInput").value.trim();
  if (!code) return alert("Bitte Code eingeben!");
  importFromCode(code);
  render();
};
