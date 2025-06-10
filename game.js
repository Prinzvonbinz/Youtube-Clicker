//--- Utility ---//
function genCode(len=8) {
  return Array(len).fill().map(_=>String.fromCharCode(65+Math.random()*26|0)).join('')
}
function saveProfile() {
  localStorage.setItem("ytclicker-profile", JSON.stringify(state));
}
function loadProfile(code) {
  let profiles = JSON.parse(localStorage.getItem("ytclicker-profiles")||"{}");
  let d = profiles[code];
  if (d) Object.assign(state, d);
}
function storeProfile() {
  let profiles = JSON.parse(localStorage.getItem("ytclicker-profiles")||"{}");
  profiles[state.code] = state;
  localStorage.setItem("ytclicker-profiles", JSON.stringify(profiles));
}
function resetProfile() {
  Object.assign(state, defaultState());
  saveProfile();
  render();
}
//--- State ---//
function defaultState() {
  return {
    code: genCode(9),
    name: "",
    pic: "",
    twitchName: "",
    twitchPic: "",
    abos: 0,
    clips: 0,
    videos: [],
    upgrades: { cutter: 0, clicker: 0, streamer: 0, manager: 0 },
    shopBase: { cutter: 30, clicker: 20, streamer: 50, manager: 120 },
    twitch: false,
    twitchClips: 0,
    playButtons: [],
    lastPlayBtn: 0,
    menu: "profile"
  }
}
let state = defaultState();
const PLAY_THRESHOLDS = [100, 1000, 10000, 100000, 1000000, 10000000];
const PLAY_NAMES = ['Silver', 'Gold', 'Diamond', 'Ruby', 'Saphir', 'Red Diamond'];
let local = localStorage.getItem("ytclicker-profile");
if(local) Object.assign(state, JSON.parse(local));

//--- RENDERING ---//
const $ = q => document.querySelector(q);
function render() {
  storeProfile();
  saveProfile();
  let main = $("#main");
  main.innerHTML = `
    <div class="menu-switch">
      <button class="${state.menu=="profile"?"active":""}" onclick="switchMenu('profile')">Profil</button>
      <button class="${state.menu=="game"?"active":""}" onclick="switchMenu('game')">Youtube</button>
      <button class="${state.menu=="shop"?"active":""}" onclick="switchMenu('shop')">Shop</button>
      <button class="${state.menu=="videos"?"active":""}" onclick="switchMenu('videos')">Videos</button>
      ${state.twitch?`<button class="${state.menu=="twitch"?"active":""}" onclick="switchMenu('twitch')">Twitch</button>`:""}
    </div>
    <div id="profile-menu" class="menu ${state.menu=="profile"?"active":""}">
      <h2>Profil</h2>
      <input id="name-inp" placeholder="Youtube-Kanalname" value="${state.name||""}"/>
      <label class="upload-label">Profilbild wählen
        <input type="file" id="pic-inp" accept="image/*" onchange="uploadPic(event,'pic')"/>
      </label>
      <img id="profile-pic-preview" src="${state.pic||'https://upload.wikimedia.org/wikipedia/commons/9/9a/No_avatar.png'}"/>
      <hr/>
      <input id="tw-inp" placeholder="Twitch-Kanalname" value="${state.twitchName||""}"/>
      <label class="upload-label">Twitch-Bild wählen
        <input type="file" id="twpic-inp" accept="image/*" onchange="uploadPic(event,'twitchPic')"/>
      </label>
      <img id="twitch-pic-preview" src="${state.twitchPic||'https://upload.wikimedia.org/wikipedia/commons/9/9a/No_avatar.png'}"/>
      <hr/>
      <div style="margin:1em 0">Dein Account-Code:<br><b>${state.code}</b></div>
      <button onclick="copyCode()">Code kopieren</button>
      <hr/>
      <input id="import-inp" placeholder="Account-Code einfügen"/>
      <button onclick="importAcc()">Account laden</button>
      <hr/>
      <button onclick="resetProfile()">Profil zurücksetzen</button>
    </div>
    <div id="game-menu" class="menu ${state.menu=="game"?"active":""}">
      <h2>Youtube-Clicker</h2>
      <div id="main-btn" onclick="addClip()" title="Klick für Clips!">
        <img src="${state.pic||'https://upload.wikimedia.org/wikipedia/commons/9/9a/No_avatar.png'}"/>
      </div>
      <div class="stats">Clips: <b>${state.clips}</b><br>Abonnenten: <b>${state.abos}</b></div>
      <button onclick="openCut()">Videos schneiden (${state.clips} Clips)</button>
      <div id="play-buttons">${renderPlays()}</div>
    </div>
    <div id="shop-menu" class="menu ${state.menu=="shop"?"active":""}">
      <h2>Shop</h2>
      <div class="shop">
        ${renderShop()}
      </div>
    </div>
    <div id="videos-menu" class="menu ${state.menu=="videos"?"active":""}">
      <h2>Deine Videos</h2>
      <div>
        ${state.videos.map(v=>`
          <div style="margin-bottom:0.5em;border-bottom:1px solid #fff2">
            <b>${v.title}</b><br>
            Views: ${v.views} | Abos: ${v.abos}
          </div>
        `).join('') || "<i>Keine Videos</i>"}
      </div>
    </div>
    <div id="twitch-menu" class="menu ${state.menu=="twitch"?"active":""}">
      <h2>Twitch-Stream</h2>
      <div id="twitch-btn" onclick="addTwitchClip()" title="Twitch Klick!">
        <img src="${state.twitchPic||'https://upload.wikimedia.org/wikipedia/commons/9/9a/No_avatar.png'}"/>
      </div>
      <div class="stats">Twitch-Clips: <b>${state.twitchClips}</b></div>
    </div>
  `;
  setTimeout(autoAll,1);
}
window.render = render;

function switchMenu(m) {
  state.menu = m;
  render();
}

function copyCode() {
  navigator.clipboard.writeText(state.code);
  alert('Code kopiert!');
}
function importAcc() {
  let val = $("#import-inp").value.trim().toUpperCase();
  if(!val) return alert("Code eingeben");
  let profiles = JSON.parse(localStorage.getItem("ytclicker-profiles")||"{}");
  if(!profiles[val]) return alert("Nicht gefunden!");
  Object.assign(state, profiles[val]);
  saveProfile();
  render();
}

function uploadPic(e, key) {
  let file = e.target.files[0];
  if(!file) return;
  let reader = new FileReader();
  reader.onload = function(ev) {
    state[key] = ev.target.result;
    render();
  }
  reader.readAsDataURL(file);
}

//--- GAME LOGIC ---//
function addClip() {
  let multi = getBoost();
  state.clips += 1 * multi;
  checkPlayBtn();
  saveProfile();
  render();
}
function addTwitchClip() {
  let multi = getBoost();
  state.twitchClips += 1 * multi;
  state.abos += (5+state.upgrades.streamer*2)*multi;
  checkPlayBtn();
  saveProfile();
  render();
}

function openCut() {
  let clipsToCut = Math.min(state.clips, 10+state.videos.length*5);
  if(clipsToCut<10) return alert("Mindestens 10 Clips!");
  let duration = 3000 - (state.upgrades.cutter*250) - (state.upgrades.manager*0.05*3000);
  duration = Math.max(800, duration);
  let title = prompt("Videotitel?");
  if(!title) return;
  alert("Video wird geschnitten...");
  setTimeout(()=>{
    state.clips -= clipsToCut;
    let abosGained = Math.floor(clipsToCut*20*(1+state.upgrades.manager*0.05));
    state.abos += abosGained;
    state.videos.push({ title, views: clipsToCut*100+Math.random()*1000|0, abos: abosGained });
    checkPlayBtn();
    saveProfile();
    render();
    alert("Video hochgeladen!");
    // Twitch-Menü freischalten
    if(!state.twitch && state.abos>=5000) { state.twitch=true; alert("Twitch-Menü freigeschaltet!"); }
  }, duration);
}

function getBoost() {
  let boost = 1;
  boost *= 1 + state.playButtons.length*0.3;
  return boost;
}
function checkPlayBtn() {
  for(let i=0;i<PLAY_THRESHOLDS.length;i++) {
    if(state.abos>=PLAY_THRESHOLDS[i] && !state.playButtons.includes(i)) {
      state.playButtons.push(i);
      alert(`Du hast den ${PLAY_NAMES[i]} Play-Button erhalten! +30% Boost`);
    }
  }
}

function renderPlays() {
  return state.playButtons.map(i=>`<div class="play-btn" title="${PLAY_NAMES[i]}">${PLAY_NAMES[i][0]}</div>`).join('');
}

function renderShop() {
  // Upgrades: Cutter, Klicker, Streamer, Manager
  let html = '';
  Object.entries(state.upgrades).forEach(([upg, lvl])=>{
    let base = state.shopBase[upg];
    let price = Math.floor(base*Math.pow(1.85,lvl));
    let name = {cutter:"Cutter",clicker:"Klicker",streamer:"Streamer",manager:"Manager"}[upg];
    let desc = {
      cutter:"Schneidet Videos automatisch",
      clicker:"Klickt automatisch Youtube",
      streamer:"Klickt automatisch Twitch",
      manager:"+5% Speed für alle"
    }[upg];
    html += `
      <div class="shop-upgrade">
        <span><b>${name}</b> Lv.${lvl}<br><small>${desc}</small></span>
        <button class="shop-btn" onclick="buyUpg('${upg}')">${price} Abos</button>
      </div>
    `;
  });
  return html;
}
function buyUpg(upg) {
  let lvl = state.upgrades[upg];
  let price = Math.floor(state.shopBase[upg]*Math.pow(1.85,lvl));
  if(state.abos<price) return alert("Nicht genug Abos!");
  state.abos -= price;
  state.upgrades[upg]++;
  saveProfile();
  render();
}

//--- AUTO ---//
let autoTimers = {};
function autoAll() {
  clearTimeout(autoTimers.cutter); clearTimeout(autoTimers.clicker); clearTimeout(autoTimers.streamer);
  // Cutter: alle 12s/lvl (schneller mit Manager), min 2s
  let cutTime = Math.max(12000/(1+state.upgrades.cutter+state.upgrades.manager*0.05),2000);
  if(state.upgrades.cutter)
    autoTimers.cutter = setTimeout(()=>{ autoCut(); autoAll(); }, cutTime);
  // Klicker: alle 2s/lvl
  let clickTime = Math.max(2000/(1+state.upgrades.clicker+state.upgrades.manager*0.05),500);
  if(state.upgrades.clicker)
    autoTimers.clicker = setTimeout(()=>{ state.clips+=getBoost(); saveProfile(); render(); autoAll(); }, clickTime);
  // Streamer: alle 4s/lvl
  let streamTime = Math.max(4000/(1+state.upgrades.streamer+state.upgrades.manager*0.05),700);
  if(state.upgrades.streamer && state.twitch)
    autoTimers.streamer = setTimeout(()=>{ state.twitchClips+=getBoost(); state.abos+=(5+state.upgrades.streamer*2)*getBoost(); saveProfile(); render(); autoAll(); }, streamTime);
}
function autoCut() {
  let clipsToCut = Math.min(state.clips, 10+state.videos.length*5);
  if(clipsToCut<10) return;
  state.clips -= clipsToCut;
  let abosGained = Math.floor(clipsToCut*20*(1+state.upgrades.manager*0.05));
  state.abos += abosGained;
  state.videos.push({ title:"Auto-Video "+(state.videos.length+1), views: clipsToCut*100+Math.random()*1000|0, abos: abosGained });
  checkPlayBtn();
  saveProfile();
  render();
}

//--- INIT ---//
window.switchMenu = switchMenu;
window.addClip = addClip;
window.addTwitchClip = addTwitchClip;
window.openCut = openCut;
window.buyUpg = buyUpg;
window.uploadPic = uploadPic;
window.copyCode = copyCode;
window.importAcc = importAcc;
window.resetProfile = resetProfile;
window.render = render;

window.onload = render;
