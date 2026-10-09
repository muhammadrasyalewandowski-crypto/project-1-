/* ===================== Skuad Stats — data.js ===================== */
/* Berkas bersama untuk login.html dan balbalan.html: konstanta, ikon, utilitas, data awal, penyimpanan. */

/* ------------------------------ constants ------------------------------ */
const POSITIONS = ["Kiper", "Bek", "Gelandang", "Penyerang"];
const ATTR_LABELS = { speed: "Kecepatan", shooting: "Shooting", passing: "Passing", dribbling: "Dribbling", defending: "Bertahan" };
const MISSION_DIFFICULTY = {
  mudah: { label: "Mudah", xp: 30 },
  sedang: { label: "Sedang", xp: 60 },
  sulit: { label: "Sulit", xp: 120 },
};
const MISSION_PERIOD = { harian: "Harian", mingguan: "Mingguan", bulanan: "Bulanan" };
const RANK_TIERS = [
  { name: "Pemula", min: 0 },
  { name: "Amatir", min: 150 },
  { name: "Semi-Pro", min: 400 },
  { name: "Profesional", min: 800 },
  { name: "Elite", min: 1400 },
  { name: "Legenda", min: 2200 },
];
const ACCENTS = [
  { id: "amber", label: "Amber", hex: "#D9A441" },
  { id: "crimson", label: "Merah", hex: "#C4483A" },
  { id: "sky", label: "Biru", hex: "#3F7DB0" },
  { id: "lime", label: "Hijau Terang", hex: "#8FB93B" },
];

/* -------------------------------- icons -------------------------------- */
function icon(name, size = 18) {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const paths = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 5H4a3 3 0 0 0 3 4"/><path d="M17 5h3a3 3 0 0 1-3 4"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2.8.4 5 2.5 5 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"/>',
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/>',
    lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.4-2"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
    mappin: '<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 11h18"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    chevronleft: '<path d="M15 18l-6-6 6-6"/>',
    chevronright: '<path d="M9 18l6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    award: '<circle cx="12" cy="8" r="5"/><path d="M8.2 13.5 7 22l5-3 5 3-1.2-8.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    hand: '<path d="M8 12V5a1.5 1.5 0 0 1 3 0v6"/><path d="M11 11V4a1.5 1.5 0 0 1 3 0v7"/><path d="M14 11V6a1.5 1.5 0 0 1 3 0v8"/><path d="M17 10a1.5 1.5 0 0 1 3 0v3c0 4-2.5 7-6.5 7h-1C9 20 7 18 6 16l-2.3-4a1.4 1.4 0 0 1 2.4-1.4L8 13"/>',
    arrowupright: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  };
  return `<span class="ss-icon">${"<svg " + common + ">" + (paths[name] || "") + "</svg>"}</span>`;
}

/* ------------------------------- utilities ------------------------------ */
function uid() { return Math.random().toString(36).slice(2, 10); }
function initials(name) {
  const w = String(name).trim().split(/\s+/);
  return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
}
function ageStr(p) { return p.age ? ` · ${p.age} tahun` : ""; }
function overallOf(attrs) { const v = Object.values(attrs); return Math.round(v.reduce((a, b) => a + b, 0) / v.length); }
function ratioOf(a, b) { return b > 0 ? (a / b).toFixed(2) : "0.00"; }
function totalXpOf(p) { return p.matches * 15 + (p.xp || 0); }
function rankOf(xpTotal) {
  let current = RANK_TIERS[0], next = null;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (xpTotal >= RANK_TIERS[i].min) current = RANK_TIERS[i];
    else { next = RANK_TIERS[i]; break; }
  }
  const progress = next ? Math.round(((xpTotal - current.min) / (next.min - current.min)) * 100) : 100;
  return { name: current.name, xp: xpTotal, next, progress };
}
function esc(str) {
  return String(str).replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}

/* -------------------------------- storage -------------------------------- */
function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

/* -------------------------------- seed data ------------------------------ */
const DATA_VERSION = 3;
const SEED_ADMINS = ["Fadil"];
const SEED_PLAYERS = ["Ama", "Juna", "Adam", "Nugroho", "Raka", "Raki", "Rasya", "Rengga", "Aan", "Jaki", "Fiki", "Exel", "Erik", "Tio", "Riqul", "Ardan", "Faiq", "Ghatan"];

function blankPlayer(name, isAdmin) {
  const username = name.toLowerCase();
  return {
    id: "p_" + username, username, password: username + "123", name, isAdmin: !!isAdmin,
    age: 0, position: "Gelandang", secondaryPositions: [], photo: null,
    attrs: { speed: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50 },
    goals: 0, assists: 0, matches: 0, saves: 0, yellow: 0, red: 0, passSuccess: 0, xp: 0, completedMissions: [],
  };
}
function seedPlayers() {
  return [...SEED_ADMINS.map(n => blankPlayer(n, true)), ...SEED_PLAYERS.map(n => blankPlayer(n, false))];
}
function seedMatches() { return []; }
function seedGroups() {
  return [
    { id: "g1", name: "Skuad Inti", open: true, password: "", members: seedPlayers().map(p => p.username) },
    { id: "g2", name: "Latihan Malam (Privat)", open: false, password: "1234", members: ["fadil"] },
  ];
}
function seedInvites() {
  return [{ id: uid(), creator: "fadil", date: "2026-09-20", time: "16:00", place: "Lapangan Kridosono", region: "Yogyakarta", note: "Butuh 6 pemain lawan", groupId: null, joined: ["fadil"] }];
}
function seedMissions() {
  return [
    { id: uid(), title: "Cetak 2 gol dalam satu pertandingan", difficulty: "sedang", period: "mingguan", createdAt: Date.now() },
    { id: uid(), title: "Hadir latihan tepat waktu", difficulty: "mudah", period: "harian", createdAt: Date.now() },
    { id: uid(), title: "Menang 3 pertandingan beruntun", difficulty: "sulit", period: "bulanan", createdAt: Date.now() },
  ];
}

/* ------------------------------ load all data ------------------------------ */
/* Dipakai oleh login.html (hanya butuh players) dan balbalan.html (butuh semuanya). */
function loadDB() {
  if (loadJSON("ss_version", null) !== DATA_VERSION) {
    // data demo lama (nama pemain lama) dibuang, diganti daftar nama baru
    ["ss_players", "ss_matches", "ss_groups", "ss_chats", "ss_invites", "ss_pending", "ss_missions", "ss_session"]
      .forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
    saveJSON("ss_version", DATA_VERSION);
  }
  let pl = loadJSON("ss_players", null);
  if (!pl) { pl = seedPlayers(); saveJSON("ss_players", pl); }
  else {
    let migrated = false;
    pl = pl.map(p => {
      const patch = {};
      if (!p.password) { patch.password = p.username + "123"; migrated = true; }
      if (typeof p.xp !== "number") { patch.xp = 0; migrated = true; }
      if (!Array.isArray(p.completedMissions)) { patch.completedMissions = []; migrated = true; }
      if (!Array.isArray(p.secondaryPositions)) { patch.secondaryPositions = []; migrated = true; }
      if (!("photo" in p)) { patch.photo = null; migrated = true; }
      return Object.keys(patch).length ? { ...p, ...patch } : p;
    });
    if (migrated) saveJSON("ss_players", pl);
  }
  let mt = loadJSON("ss_matches", null);
  if (!mt) { mt = seedMatches(); saveJSON("ss_matches", mt); }
  let gr = loadJSON("ss_groups", null);
  if (!gr) { gr = seedGroups(); saveJSON("ss_groups", gr); }
  let inv = loadJSON("ss_invites", null);
  if (!inv) { inv = seedInvites(); saveJSON("ss_invites", inv); }
  let ms = loadJSON("ss_missions", null);
  if (!ms) { ms = seedMissions(); saveJSON("ss_missions", ms); }
  return {
    players: pl, matches: mt, groups: gr, invites: inv, missions: ms,
    chats: loadJSON("ss_chats", {}), pending: loadJSON("ss_pending", []),
  };
}

/* ------------------------------ tema (gelap/terang + aksen) ------------------------------ */
function applyThemeAttrs() {
  const s = loadJSON("ss_settings", null) || {};
  document.documentElement.setAttribute("data-theme", s.theme || "dark");
  document.documentElement.setAttribute("data-accent", s.accentId || "amber");
}

/* ------------------------------ foto profil ------------------------------ */
// Avatar: tampilkan foto profil kalau ada, kalau tidak pakai inisial nama.
function avatarHTML(p, size, extraClass) {
  const cls = "ss-avatar" + (size ? " " + size : "") + (extraClass ? " " + extraClass : "");
  if (p.photo) return `<div class="${cls}"><img src="${p.photo}" alt="${esc(p.name)}" /></div>`;
  return `<div class="${cls}">${esc(initials(p.name))}</div>`;
}
// Potong persegi dari tengah & kecilkan supaya muat di localStorage.
function resizeImage(file, max) {
  max = max || 256;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const c = document.createElement("canvas");
        c.width = c.height = max;
        c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, max, max);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}