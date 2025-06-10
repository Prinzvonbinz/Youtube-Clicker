// --------- Hilfsfunktionen für LocalStorage & Account Sync ---------
function makeID(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len);
}
function saveGame(game) {
  localStorage.setItem('ytclicker_save', JSON.stringify(game));
}
function loadGame() {
  let data = localStorage.getItem('ytclicker_save');
  if (!data) return null;
  return JSON.parse(data);
}
function exportCode(game) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(game))));
}
function importCode(code) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(code))));
  } catch (e) { return null; }
}

// --------- Variablen ---------
let game = {
  id: makeID(10),
  channel: "",
  profilePic: "",
  clips: 0,
  subscribers: 0,
  videos: [],
  upgrades: {
    cutter: 0, clicker: 0, streamer: 0, manager: 0
  },
  shopBase: {
    cutter: 50, clicker: 30, streamer: 80, manager: 120
  },
  shopGrowth: 1.4,
  twitchUnlocked: false,
  twitch: {
    name: "",
    pic: "",
    subscribers: 0
  },
  playButtons: 0,
  lastTime: Date.now()
};

// --------- Menüswitch ---------
function showMenu(menu) {
  document.querySelectorAll('.menu').forEach(m => m.style.display = 'none');
  document.getElementById(menu).style.display = '';
  if(menu==='game-menu') updateGameUI();
  if(menu==='shop-menu') renderShop();
  if(menu==='profile-menu') updateProfileUI();
  if(menu==='twitch-menu') updateTwitchMenu();
  if(menu==='cut-menu') updateCutMenu();
}

// --------- Startmenü ---------
document.getElementById('start-btn').onclick = () => {
  let name = document.getElementById('channel-name').value.trim();
  if (!name) return alert("Bitte Kanalnamen eingeben!");
  game.channel = name;
  let file = document.getElementById('profile-pic').files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = function(e) {
      game.profilePic = e.target.result;
      saveGame(game);
      showMenu('game-menu');
    };
    reader.readAsDataURL(file);
  } else {
    alert("Bitte Profilbild auswählen!");
  }
};

// --------- Game UI ---------
function updateGameUI() {
  document.getElementById('profile-img').src = game.profilePic;
  document.getElementById('profile-channel').textContent = game.channel;
  let btn = document.getElementById('yt-btn');
  btn.style.backgroundImage = `url('${game.profilePic}')`;
  btn.title = "YouTube klicken!";
  document.getElementById('clips-count').textContent = `Clips: ${game.clips}`;
  document.getElementById('subs-count').textContent = `Abonnenten: ${game.subscribers}`;
  document.getElementById('twitch-menu-btn').style.display = game.twitchUnlocked ? '' : 'none';
}
document.getElementById('yt-btn').onclick = () => {
  let boost = (1 + 0.3 * game.playButtons) * (1 + game.upgrades.manager * 0.05);
  game.clips += 1 * boost;
  saveGame(game);
  updateGameUI();
  checkUnlocks();
};
document.getElementById('cut-menu-btn').onclick = () => showMenu('cut-menu');
document.getElementById('shop-btn').onclick = () => showMenu('shop-menu');
document.getElementById('twitch-menu-btn').onclick = () => showMenu('twitch-menu');
document.getElementById('profile-btn').onclick = () => showMenu('profile-menu');

// --------- Cut Menü ---------
function updateCutMenu() {
  document.getElementById('clips-to-cut').max = Math.floor(game.clips);
  document.getElementById('clips-to-cut').value = 1;
  document.getElementById('video-name').value = '';
  document.getElementById('cut-progress').style.display = 'none';
}
document.getElementById('cut-video-btn').onclick = () => {
  let count = +document.getElementById('clips-to-cut').value;
  let name = document.getElementById('video-name').value.trim();
  if (count < 1 || count > game.clips) return alert("Ungültige Clipanzahl!");
  if (!name) return alert("Videoname fehlt!");
  document.getElementById('cut-progress').style.display = '';
  let time = Math.max(2000, 6000 - game.upgrades.cutter * 500) * count;
  setTimeout(() => {
    game.clips -= count;
    let gain = Math.floor((count * (1 + 0.3 * game.playButtons)) * (1 + game.upgrades.manager * 0.05));
    game.subscribers += gain;
    if (Math.random() < 0.1) game.subscribers -= Math.floor(Math.random() * gain/5); // Chance Aboverlust
    if (game.subscribers < 0) game.subscribers = 0;
    game.videos.push({name, count, ts: Date.now()});
    saveGame(game);
    showMenu('game-menu');
    checkUnlocks();
  }, time);
};

// --------- Shop ---------
const upgradeNames = {
  cutter: "Cutter", clicker: "Klicker", streamer: "Streamer", manager: "Manager"
};
function priceFor(upg) {
  return Math.floor(game.shopBase[upg] * Math.pow(game.shopGrowth, game.upgrades[upg]));
}
function renderShop() {
  let html = "";
  for (let upg of ["cutter","clicker","streamer","manager"]) {
    html += `<div>
      <b>${upgradeNames[upg]}</b> (lvl ${game.upgrades[upg]})<br>
      <span>${shopDesc(upg)}</span><br>
      <button onclick="buyUpgrade('${upg}')">Kaufen (${priceFor(upg)} Clips)</button>
    </div>`;
  }
  document.getElementById('shop-list').innerHTML = html;
}
function shopDesc(upg) {
  switch(upg) {
    case "cutter": return `Videos schneiden automatisch (${4000-Math.min(3900,game.upgrades.cutter*500)}ms pro Clip)`;
    case "clicker": return `Klickt automatisch (+${game.upgrades.clicker+1}/sec)`;
    case "streamer": return `Twitch klickt automatisch (+${game.upgrades.streamer+1}/sec)`;
    case "manager": return `Boostet alles um +${5*game.upgrades.manager}%`;
  }
}
window.buyUpgrade = function(upg) {
  let price = priceFor(upg);
  if (game.clips < price) return alert("Nicht genug Clips!");
  game.clips -= price;
  game.upgrades[upg]++;
  saveGame(game);
  renderShop();
  updateGameUI();
};

// --------- Twitch Menü ---------
function updateTwitchMenu() {
  let btn = document.getElementById('twitch-btn');
  btn.style.backgroundImage = `url('${game.twitch.pic||game.profilePic}')`;
  btn.title = "Twitch klicken!";
  document.getElementById('twitch-subs-count').textContent = `Twitch Abonnenten: ${game.twitch.subscribers}`;
  document.getElementById('twitch-name').value = game.twitch.name;
}

document.getElementById('twitch-btn').onclick = () => {
  let boost = (1 + 0.3 * game.playButtons) * (1 + game.upgrades.manager * 0.05);
  game.twitch.subscribers += 1 * boost;
  saveGame(game);
  updateTwitchMenu();
};

document.getElementById('save-twitch-profile').onclick = () => {
  game.twitch.name = document.getElementById('twitch-name').value.trim();
  let file = document.getElementById('twitch-pic').files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = function(e) {
      game.twitch.pic = e.target.result;
      saveGame(game);
      updateTwitchMenu();
    };
    reader.readAsDataURL(file);
  } else {
    saveGame(game);
    updateTwitchMenu();
  }
};

// --------- Profil-Menü ---------
function updateProfileUI() {
  document.getElementById('profile-channel2').textContent = game.channel;
  document.getElementById('profile-img2').src = game.profilePic;
  let code = exportCode(game);
  document.getElementById('account-code').textContent = code;
}
document.getElementById('load-account-btn').onclick = () => {
  let code = document.getElementById('load-code').value.trim();
  let loaded = importCode(code);
  if (!loaded) return alert("Ungültiger Code!");
  game = loaded;
  saveGame(game);
  showMenu('game-menu');
};

// --------- Autoclicker & Autocutter ---------
setInterval(()=>{
  // Klicker
  let boost = (1 + 0.3 * game.playButtons) * (1 + game.upgrades.manager * 0.05);
  game.clips += game.upgrades.clicker * boost;
  // Streamer
  game.twitch.subscribers += game.upgrades.streamer * boost;
  // Cutter
  if (game.upgrades.cutter > 0 && game.clips >= 1) {
    let cutAmount = Math.min(game.clips, 1 + Math.floor(game.upgrades.cutter/2));
    let time = Math.max(2000, 6000 - game.upgrades.cutter * 500) * cutAmount;
    if (!game._cutting) {
      game._cutting = true;
      setTimeout(()=>{
        game.clips -= cutAmount;
        let gain = Math.floor((cutAmount * boost));
        game.subscribers += gain;
        if (Math.random() < 0.1) game.subscribers -= Math.floor(Math.random() * gain/5);
        if (game.subscribers < 0) game.subscribers = 0;
        game.videos.push({name:"Auto-Video", count:cutAmount, ts:Date.now()});
        game._cutting = false;
        saveGame(game);
        updateGameUI();
        checkUnlocks();
      }, time);
    }
  }
  saveGame(game);
  updateGameUI();
  updateTwitchMenu();
}, 1000);

// --------- Play-Buttons & Unlocks ---------
const playButtonThresholds = [10000, 100000, 1000000, 10000000];
function checkUnlocks() {
  for(let i=0;i<playButtonThresholds.length;i++) {
    if (game.subscribers >= playButtonThresholds[i] && game.playButtons === i) {
      game.playButtons++;
      alert(`Herzlichen Glückwunsch! Du hast einen Play-Button erhalten! (+30% Boost)`);
    }
  }
  if (!game.twitchUnlocked && game.subscribers >= 5000) {
    game.twitchUnlocked = true;
    alert("Twitch Menü freigeschaltet!");
    saveGame(game);
    updateGameUI();
  }
}

// --------- Spielstand laden ---------
window.onload = () => {
  let data = loadGame();
  if (data && data.channel && data.profilePic) {
    game = data;
    showMenu('game-menu');
  } else {
    showMenu('main-menu');
  }
};
