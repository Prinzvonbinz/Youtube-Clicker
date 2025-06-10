// YouTube Clicker Game

// -------- DATA STRUCTURES --------
const GAME_DATA = {
  channelName: '',
  profilePic: '',
  subscribers: 0,
  clips: 0,
  playButtons: 0,
  twitchUnlocked: false,
  twitch: {
    name: '',
    pic: '',
    subscribers: 0,
  },
  upgrades: {
    cutter: { level: 0, basePrice: 50 },
    clicker: { level: 0, basePrice: 20 },
    streamer: { level: 0, basePrice: 100 },
    manager: { level: 0, basePrice: 500 },
  },
  shopMultipliers: {
    cutter: 1.35,
    clicker: 1.3,
    streamer: 1.5,
    manager: 2,
  },
  cut: {
    cutting: false,
    cutStart: 0,
    cutDuration: 0,
    videoName: '',
    videos: [],
  },
  code: '',
};

// -------- LOCALSTORAGE --------
function saveGame() {
  localStorage.setItem('ytclicker_save', JSON.stringify(GAME_DATA));
}
function loadGame() {
  const data = localStorage.getItem('ytclicker_save');
  if (data) {
    Object.assign(GAME_DATA, JSON.parse(data));
  }
}
function exportCode() {
  return btoa(unescape(encodeURIComponent(JSON.stringify(GAME_DATA))));
}
function importCode(str) {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(str))));
    Object.assign(GAME_DATA, data);
    saveGame();
    location.reload();
  } catch (e) { alert('Ungültiger Code!'); }
}

// -------- UTILS --------
function updateProfilePicPreview(url, el) {
  el.style.backgroundImage = url ? `url(${url})` : '';
}
function randomCode(len = 8) {
  return Math.random().toString(36).substr(2, len).toUpperCase();
}
function expPrice(base, multi, level) {
  return Math.floor(base * Math.pow(multi, level));
}

// -------- UI HANDLING --------
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function switchMenu(showId) {
  $$('.menu').forEach(m=>m.classList.add('hidden'));
  $(`#${showId}`).classList.remove('hidden');
}

// -------- STARTUP --------
window.onload = function() {
  loadGame();
  // If no code assigned, generate one
  if (!GAME_DATA.code) GAME_DATA.code = randomCode(12);

  // Main button setup
  updateProfilePicPreview(GAME_DATA.profilePic, $('#profile-pic-preview'));
  $('#yt-main-btn').onclick = clickClip;
  $('#yt-main-label').innerText = "Klicke für Clips!";
  $('#yt-main-btn').style.backgroundImage = GAME_DATA.profilePic ? `url(${GAME_DATA.profilePic})` : '';

  // Twitch Button
  $('#twitch-main-btn').onclick = clickTwitch;
  $('#twitch-main-label').innerText = "Klicke für Twitch-Abos!";

  // Profile preview
  $('#mini-profile-pic').style.backgroundImage = GAME_DATA.profilePic ? `url(${GAME_DATA.profilePic})` : '';
  $('#mini-channel-name').innerText = GAME_DATA.channelName || '';

  // Start screen listeners
  $('#profile-pic-input').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      GAME_DATA.profilePic = evt.target.result;
      updateProfilePicPreview(GAME_DATA.profilePic, $('#profile-pic-preview'));
      $('#yt-main-btn').style.backgroundImage = `url(${GAME_DATA.profilePic})`;
      $('#mini-profile-pic').style.backgroundImage = `url(${GAME_DATA.profilePic})`;
      saveGame();
    };
    reader.readAsDataURL(file);
  };

  $('#start-btn').onclick = function() {
    const name = $('#channel-name-input').value.trim();
    if (!name || !GAME_DATA.profilePic) return alert('Bitte Kanalname und Profilbild wählen!');
    GAME_DATA.channelName = name;
    saveGame();
    startGame();
  };

  // Twitch Profil
  $('#twitch-pic-input').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      GAME_DATA.twitch.pic = evt.target.result;
      updateProfilePicPreview(GAME_DATA.twitch.pic, $('#twitch-pic-preview'));
      $('#twitch-main-btn').style.backgroundImage = `url(${GAME_DATA.twitch.pic})`;
      saveGame();
    };
    reader.readAsDataURL(file);
  };

  $('#twitch-name-input').value = GAME_DATA.twitch.name || '';

  // Cut Menü
  $('#start-cut-btn').onclick = startCut;

  // Profile Code
  $('#profile-code').value = GAME_DATA.code;

  // Restore main menu or game
  if (GAME_DATA.channelName && GAME_DATA.profilePic) {
    startGame();
  }
};

// -------- GAME LOGIC --------

function startGame() {
  switchMenu('game-menu');
  renderAll();
  startAuto();
}

function renderAll() {
  // Header
  $('#mini-profile-pic').style.backgroundImage = GAME_DATA.profilePic ? `url(${GAME_DATA.profilePic})` : '';
  $('#mini-channel-name').innerText = GAME_DATA.channelName || '';
  $('#subscribers').innerText = `Abos: ${GAME_DATA.subscribers}`;
  $('#clips').innerText = `Clips: ${GAME_DATA.clips}`;
  $('#play-btns').innerText = '🏆'.repeat(GAME_DATA.playButtons);

  // Main button
  $('#yt-main-btn').style.backgroundImage = GAME_DATA.profilePic ? `url(${GAME_DATA.profilePic})` : '';

  // Twitch Unlock
  if (GAME_DATA.subscribers >= 10000 || GAME_DATA.twitchUnlocked) {
    GAME_DATA.twitchUnlocked = true;
    $('#twitch-btn-menu').classList.remove('hidden');
  } else {
    $('#twitch-btn-menu').classList.add('hidden');
  }

  saveGame();
}

function clickClip() {
  let base = 1 + GAME_DATA.upgrades.clicker.level;
  if (GAME_DATA.playButtons > 0) base = Math.floor(base * 1.3);
  GAME_DATA.clips += base;
  renderAll();
}

function clickTwitch() {
  if (!GAME_DATA.twitchUnlocked) return;
  let base = 1 + GAME_DATA.upgrades.streamer.level;
  if (GAME_DATA.playButtons > 0) base = Math.floor(base * 1.3);
  GAME_DATA.twitch.subscribers = (GAME_DATA.twitch.subscribers || 0) + base;
  GAME_DATA.subscribers += Math.floor(base/2);
  renderAll();
}

// -------- SHOP --------
function showShopMenu() {
  switchMenu('shop-menu');
  const items = [
    {
      key: 'clicker',
      name: 'Klicker',
      desc: 'Klickt automatisch für dich (mehr pro Upgrade)',
      speed: 1000,
    },
    {
      key: 'cutter',
      name: 'Cutter',
      desc: 'Schneidet Videos automatisch (schneller pro Upgrade)',
      speed: 10000,
    },
    {
      key: 'streamer',
      name: 'Streamer',
      desc: 'Streamt auf Twitch automatisch',
      speed: 2000,
    },
    {
      key: 'manager',
      name: 'Manager',
      desc: 'Alle werden +5% schneller pro Upgrade',
    }
  ];
  let html = '';
  items.forEach(item => {
    const up = GAME_DATA.upgrades[item.key];
    const lvl = up.level;
    const price = expPrice(up.basePrice, GAME_DATA.shopMultipliers[item.key], lvl);
    html += `<div>
      <b>${item.name}</b> (Lvl ${lvl})<br>
      <small>${item.desc}</small><br>
      <b>Preis:</b> ${price} Clips<br>
      <button onclick="buyUpgrade('${item.key}')">Kaufen</button>
    </div><hr>`;
  });
  $('#shop-items').innerHTML = html;
}
function hideShopMenu() { switchMenu('game-menu'); }

function buyUpgrade(type) {
  const up = GAME_DATA.upgrades[type];
  const lvl = up.level;
  const price = expPrice(up.basePrice, GAME_DATA.shopMultipliers[type], lvl);
  if (GAME_DATA.clips < price) return alert('Nicht genug Clips!');
  GAME_DATA.clips -= price;
  up.level++;
  renderAll();
  showShopMenu();
}

// -------- CUT MENU --------
function showCutMenu() {
  switchMenu('cut-menu');
  renderCutStatus();
}
function hideCutMenu() { switchMenu('game-menu'); }

function renderCutStatus() {
  if (GAME_DATA.cut.cutting) {
    const elapsed = Date.now() - GAME_DATA.cut.cutStart;
    let left = Math.max(0, GAME_DATA.cut.cutDuration - elapsed);
    $('#cut-status').innerHTML =
      `Video wird geschnitten... (${Math.ceil(left/1000)}s übrig)`;
    $('#start-cut-btn').disabled = true;
    if (left <= 0) finishCut();
    else setTimeout(renderCutStatus, 500);
  } else {
    $('#cut-status').innerHTML =
      `Du kannst Clips zu einem Video verarbeiten.<br>
      <input type="text" id="video-name-input" placeholder="Videoname..." maxlength="30"><br>
      <input type="number" id="clips-to-cut-input" placeholder="Clips benutzen..." min="1" max="${GAME_DATA.clips}" value="${Math.min(GAME_DATA.clips,10)}"><br>`;
    $('#start-cut-btn').disabled = false;
  }
}
function startCut() {
  const name = $('#video-name-input').value.trim() || 'Mein Video';
  let count = parseInt($('#clips-to-cut-input').value, 10) || 1;
  if (count > GAME_DATA.clips) count = GAME_DATA.clips;
  if (count < 1) return alert('Zu wenig Clips!');
  GAME_DATA.cut.cutting = true;
  GAME_DATA.cut.cutStart = Date.now();
  let baseDuration = 4000 + 1000 * count;
  let cutLvl = GAME_DATA.upgrades.cutter.level;
  let managerLvl = GAME_DATA.upgrades.manager.level;
  let speedup = 1 + 0.05 * managerLvl;
  let duration = Math.ceil(baseDuration/(1+cutLvl) / speedup);
  GAME_DATA.cut.cutDuration = duration;
  GAME_DATA.cut.videoName = name;
  GAME_DATA.clips -= count;
  renderCutStatus();
  saveGame();
}
function finishCut() {
  GAME_DATA.cut.cutting = false;
  GAME_DATA.cut.cutStart = 0;
  GAME_DATA.cut.cutDuration = 0;
  let name = GAME_DATA.cut.videoName;
  // Random chance to lose subs
  let abos = Math.floor(10 + Math.random() * 20 + GAME_DATA.upgrades.manager.level * 5);
  if (GAME_DATA.playButtons > 0) abos = Math.floor(abos * 1.3);
  GAME_DATA.subscribers += abos;
  if (Math.random() < 0.2) GAME_DATA.subscribers -= Math.floor(abos/3);
  if (GAME_DATA.subscribers < 0) GAME_DATA.subscribers = 0;
  GAME_DATA.cut.videos.push({ name, abos, date: Date.now() });
  // Play button
  if (GAME_DATA.subscribers >= 100000 && GAME_DATA.playButtons < 3) {
    GAME_DATA.playButtons++;
  }
  renderAll();
  hideCutMenu();
  alert(`Video "${name}" geschnitten und hochgeladen!\nAbos: ${abos}`);
}

// -------- TWITCH --------
function showTwitchMenu() {
  switchMenu('twitch-menu');
  $('#twitch-name-input').value = GAME_DATA.twitch.name || '';
  updateProfilePicPreview(GAME_DATA.twitch.pic, $('#twitch-pic-preview'));
  $('#twitch-main-btn').style.backgroundImage = GAME_DATA.twitch.pic ? `url(${GAME_DATA.twitch.pic})` : '';
}
function hideTwitchMenu() { switchMenu('game-menu'); }
function saveTwitchProfile() {
  GAME_DATA.twitch.name = $('#twitch-name-input').value.trim();
  saveGame();
  showTwitchMenu();
}

// -------- PROFILE --------
function showProfileMenu() {
  switchMenu('profile-menu');
  $('#profile-channel-name').innerText = GAME_DATA.channelName;
  $('#profile-subs').innerText = GAME_DATA.subscribers;
  $('#profile-clips').innerText = GAME_DATA.clips;
  updateProfilePicPreview(GAME_DATA.profilePic, $('#profile-pic-big'));
  $('#profile-code').value = GAME_DATA.code;
}
function hideProfileMenu() { switchMenu('game-menu'); }
function copyProfileCode() {
  $('#profile-code').select();
  document.execCommand('copy');
}
function importProfile() {
  const code = $('#profile-code-input').value.trim();
  if (!code) return;
  importCode(code);
}

// -------- AUTO UPGRADES --------
let autoIntervalId = null;
function startAuto() {
  if (autoIntervalId) clearInterval(autoIntervalId);
  autoIntervalId = setInterval(() => {
    let managerLvl = GAME_DATA.upgrades.manager.level;
    let speedMulti = 1 + managerLvl * 0.05;
    // Klicker
    if (GAME_DATA.upgrades.clicker.level > 0) {
      let base = GAME_DATA.upgrades.clicker.level;
      if (GAME_DATA.playButtons > 0) base = Math.floor(base * 1.3);
      GAME_DATA.clips += Math.floor(base * speedMulti);
    }
    // Cutter
    if (GAME_DATA.upgrades.cutter.level > 0 && !GAME_DATA.cut.cutting && GAME_DATA.clips >= 10) {
      // Automatisch schneiden
      GAME_DATA.cut.cutting = true;
      GAME_DATA.cut.cutStart = Date.now();
      GAME_DATA.cut.cutDuration = Math.ceil(5000 / (GAME_DATA.upgrades.cutter.level * speedMulti));
      GAME_DATA.cut.videoName = 'Auto-Video';
      GAME_DATA.clips -= 10;
      setTimeout(finishCut, GAME_DATA.cut.cutDuration);
    }
    // Streamer
    if (GAME_DATA.twitchUnlocked && GAME_DATA.upgrades.streamer.level > 0) {
      let base = GAME_DATA.upgrades.streamer.level;
      if (GAME_DATA.playButtons > 0) base = Math.floor(base * 1.3);
      GAME_DATA.twitch.subscribers = (GAME_DATA.twitch.subscribers || 0) + Math.floor(base * speedMulti);
      GAME_DATA.subscribers += Math.floor(base/2 * speedMulti);
    }
    renderAll();
  }, 1100);
}
