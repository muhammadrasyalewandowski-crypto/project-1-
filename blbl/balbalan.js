/* ===================== Skuad Stats — balbalan.js (halaman utama) ===================== */
/* Butuh data.js dan auth.js dimuat lebih dulu. Kalau belum login, otomatis diarahkan ke login.html. */

/* --------------------------------- state --------------------------------- */
const STATE = {
  players: [], matches: [], groups: [], chats: {}, invites: [], pending: [], missions: [],
  theme: "dark", accentId: "amber",
  currentUsername: null,
  tab: "beranda",
  viewProfileId: null,
  lbFilters: { position: "Semua", sortBy: "overall", query: "" },
  ui: { historyOpen: false, scheduleOpen: false, editingAdminId: null, openGroupId: null, joinPwFor: null, showCreateGroup: false, showInviteForm: false },
};

function currentUser() { return STATE.players.find(p => p.username === STATE.currentUsername) || null; }
function accentObj() { return ACCENTS.find(a => a.id === STATE.accentId) || ACCENTS[0]; }

function init() {
  applyThemeAttrs();
  const session = Auth.requireLogin(); // belum login -> otomatis ke login.html
  if (!session) return;
  Object.assign(STATE, loadDB());
  STATE.currentUsername = session;
  const settings = loadJSON("ss_settings", null);
  if (settings) { STATE.theme = settings.theme || "dark"; STATE.accentId = settings.accentId || "amber"; }
  render();
}

function persistPlayers() { saveJSON("ss_players", STATE.players); }
function persistMatches() { saveJSON("ss_matches", STATE.matches); }
function persistGroups() { saveJSON("ss_groups", STATE.groups); }
function persistChats() { saveJSON("ss_chats", STATE.chats); }
function persistInvites() { saveJSON("ss_invites", STATE.invites); }
function persistPending() { saveJSON("ss_pending", STATE.pending); }
function persistMissions() { saveJSON("ss_missions", STATE.missions); }
function persistSettings() { saveJSON("ss_settings", { theme: STATE.theme, accentId: STATE.accentId }); }

function notify(msg) {
  const shell = document.querySelector(".ss-shell");
  if (!shell) return;
  const t = document.createElement("div");
  t.className = "ss-toast";
  t.textContent = msg;
  shell.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ================================ RENDER ROOT ============================ */
function render() {
  if (!currentUser()) { location.replace("login.html"); return; }
  const app = document.getElementById("app");
  app.innerHTML = renderShell();
  bindShell();
}

/* ================================= SHELL =================================== */
const TABS = ["beranda", "leaderboard", "grup", "profil", "admin", "settings"];

function renderShell() {
  const user = currentUser();
  return `
    <div class="ss-topbar">
      <div>
        <div class="ss-h1">SKUAD STATS</div>
        <div class="ss-sub">Halo, ${esc(user.name.split(" ")[0])}${user.isAdmin ? " · Admin" : ""}</div>
      </div>
      <div class="ss-row">
        <button class="ss-avatar-btn" data-action="my-profile" title="Profil saya">${avatarHTML(user)}</button>
        <button class="ss-btn-ghost" data-action="logout" title="Keluar">${icon("logout", 16)}</button>
      </div>
    </div>
    <div class="ss-content" id="ss-content"></div>
    ${renderBottomNav(user)}
  `;
}

function renderBottomNav(user) {
  const items = [
    { id: "beranda", label: "Beranda", icon: "home" },
    { id: "leaderboard", label: "Papan Peringkat", icon: "trophy" },
    { id: "grup", label: "Grup", icon: "users" },
    { id: "profil", label: "Profil", icon: "user" },
    ...(user.isAdmin ? [{ id: "admin", label: "Admin", icon: "shield" }] : []),
    { id: "settings", label: "Setelan", icon: "settings" },
  ];
  return `<div class="ss-bottomnav">
    ${items.map(it => `
      <button class="ss-navbtn ${STATE.tab === it.id ? "active" : ""}" data-tab="${it.id}">
        ${icon(it.icon, 19)}
        <span>${it.label}</span>
      </button>`).join("")}
  </div>`;
}

function bindShell() {
  const logoutBtn = document.querySelector('[data-action="logout"]');
  if (logoutBtn) logoutBtn.onclick = () => {
    Auth.logout();
  };
  const myProfileBtn = document.querySelector('[data-action="my-profile"]');
  if (myProfileBtn) myProfileBtn.onclick = () => { STATE.viewProfileId = null; STATE.tab = "profil"; render(); };
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.onclick = () => {
      STATE.tab = btn.dataset.tab;
      if (STATE.tab !== "profil") STATE.viewProfileId = null;
      render();
    };
  });
  renderTabContent();
}

function goLeaderboard(sortBy) {
  STATE.lbFilters.sortBy = sortBy;
  STATE.tab = "leaderboard";
  render();
}
function openProfile(id) {
  STATE.viewProfileId = id;
  STATE.tab = "profil";
  render();
}

function renderTabContent() {
  const content = document.getElementById("ss-content");
  if (!content) return;
  switch (STATE.tab) {
    case "beranda": content.innerHTML = renderBeranda(); bindBeranda(); break;
    case "leaderboard": content.innerHTML = renderLeaderboard(); bindLeaderboard(); break;
    case "grup": content.innerHTML = renderGrup(); bindGrup(); break;
    case "profil": content.innerHTML = renderProfil(); bindProfil(); break;
    case "admin": content.innerHTML = currentUser().isAdmin ? renderAdmin() : ""; bindAdmin(); break;
    case "settings": content.innerHTML = renderSettings(); bindSettings(); break;
  }
}

/* ================================= RADAR CHART ============================= */
function radarPoints(attrs, size) {
  const labels = Object.keys(ATTR_LABELS);
  const n = labels.length;
  const cx = size / 2, cy = size / 2 - 6;
  const maxR = size / 2 - 34;
  const pt = (i, ratio) => {
    const angle = -Math.PI / 2 + i * (2 * Math.PI / n);
    const r = maxR * ratio;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  return { labels, n, cx, cy, maxR, pt };
}
function radarSVG(attrs, size = 220, svgId) {
  const { labels, pt } = radarPoints(attrs, size);
  let gridPolys = "";
  [0.2, 0.4, 0.6, 0.8, 1].forEach(level => {
    const pts = labels.map((_, i) => pt(i, level).join(",")).join(" ");
    gridPolys += `<polygon class="ss-radar-grid" points="${pts}"/>`;
  });
  let axisLines = "";
  const { cx, cy } = radarPoints(attrs, size);
  labels.forEach((_, i) => {
    const [x, y] = pt(i, 1);
    axisLines += `<line class="ss-radar-grid" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`;
  });
  const dataPts = labels.map((k, i) => pt(i, (attrs[k] || 0) / 100).join(",")).join(" ");
  let labelText = "";
  labels.forEach((k, i) => {
    const [x, y] = pt(i, 1.22);
    let anchor = "middle";
    if (x < cx - 10) anchor = "end"; else if (x > cx + 10) anchor = "start";
    labelText += `<text class="ss-radar-label" x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle">${ATTR_LABELS[k]}</text>`;
  });
  return `<svg id="${svgId || ""}" width="100%" height="${size}" viewBox="0 0 ${size} ${size}" data-size="${size}">
    ${gridPolys}${axisLines}
    <polygon class="ss-radar-area" data-role="radar-data" points="${dataPts}" fill="var(--accent)" stroke="var(--accent)" stroke-width="2"/>
    ${labelText}
  </svg>`;
}
function updateRadarLive(svgEl, attrs) {
  const size = Number(svgEl.dataset.size) || 220;
  const { labels, pt } = radarPoints(attrs, size);
  const poly = svgEl.querySelector('[data-role="radar-data"]');
  if (poly) poly.setAttribute("points", labels.map((k, i) => pt(i, (attrs[k] || 0) / 100).join(",")).join(" "));
}

/* ================================= BERANDA ================================= */
function renderBeranda() {
  const players = STATE.players;
  const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0];
  const topAssist = [...players].sort((a, b) => b.assists - a.assists)[0];
  const nextInvite = STATE.invites[STATE.invites.length - 1];
  const me = currentUser();
  const total = totalXpOf(me);
  const rank = rankOf(total);
  const done = me.completedMissions || [];
  const myGroups = STATE.groups.filter(g => g.members.includes(me.username));

  const quickNav = [
    { id: "leaderboard", label: "Leaderboard", icon: "trophy" },
    { id: "topskor", label: "Top Skor", icon: "target" },
    { id: "topassist", label: "Top Assist", icon: "award" },
    { id: "riwayat", label: "Riwayat", icon: "clock" },
  ];

  return `
    <div class="ss-scrollx mb18">
      ${quickNav.map(q => `<button class="ss-btn-ghost nowrap" data-quick="${q.id}">${icon(q.icon, 14)} ${q.label}</button>`).join("")}
    </div>

    ${STATE.ui.historyOpen ? `
    <div class="mb18">
      <div class="ss-h2 mt0">Riwayat Pertandingan</div>
      ${STATE.matches.length === 0 ? '<div class="ss-sub">Belum ada pertandingan.</div>' : ""}
      <div class="ss-scrollx">
        ${STATE.matches.slice().reverse().map(m => `
          <div class="ss-card minw180">
            <div class="fs12-muted">${esc(m.date)}</div>
            <div class="fw7-fs14-mt4">vs ${esc(m.opponent)}</div>
            <div class="score">${esc(m.score)}</div>
            <div class="ss-sub small mt6">Gol: ${esc(m.scorers.join(", ") || "-")}</div>
          </div>`).join("")}
      </div>
    </div>` : ""}

    <div class="ss-h2 mt0">Informasi</div>
    <div class="ss-scrollx mb18">
      <div class="ss-card minw200" data-goto-profile="${topScorer.id}">
        ${icon("target", 16)}
        <div class="ss-sub mt6">Top Skor</div>
        <div class="fw7-fs14">${esc(topScorer.name)}</div>
        <div class="fs12-accent">${topScorer.goals} gol</div>
      </div>
      <div class="ss-card minw200" data-goto-profile="${topAssist.id}">
        ${icon("award", 16)}
        <div class="ss-sub mt6">Top Assist</div>
        <div class="fw7-fs14">${esc(topAssist.name)}</div>
        <div class="fs12-accent">${topAssist.assists} assist</div>
      </div>
      ${nextInvite ? `
      <div class="ss-card minw220">
        ${icon("calendar", 16)}
        <div class="ss-sub mt6">Ajakan Main Terdekat</div>
        <div class="fw7-fs14">${esc(nextInvite.date)} · ${esc(nextInvite.time)}</div>
        <div class="ss-sub small">${esc(nextInvite.place)}, ${esc(nextInvite.region)}</div>
      </div>` : ""}
    </div>

    <div class="ss-card mb18 center">
      ${avatarHTML(me, "lg", "avatar-center")}
      <div class="fw7-fs18">${esc(me.name)}</div>
      <div class="ss-sub">${esc(me.position)}${ageStr(me)}</div>
      <div class="ss-row rank-chips">
        <span class="ss-chip accent">${esc(rank.name)}</span>
        <span class="ss-chip">OVR ${overallOf(me.attrs)}</span>
      </div>
      <div class="mt12">
        <div class="ss-progress-track"><div class="ss-progress-fill" data-progress="${rank.progress}"></div></div>
        <div class="ss-sub small mt6">${rank.xp} XP${rank.next ? ` · ${rank.next.min - rank.xp} XP menuju ${rank.next.name}` : " · Peringkat maksimum"}</div>
      </div>
    </div>

    <div class="ss-card mb18">
      <div class="ss-h2 mt0">Statistik Saya</div>
      ${radarSVG(me.attrs, 200)}
      <div class="ss-row stats-row">
        <div class="center"><div class="stat-num">${me.goals}</div><div class="ss-sub small">Gol</div></div>
        <div class="center"><div class="stat-num">${me.assists}</div><div class="ss-sub small">Assist</div></div>
        <div class="center"><div class="stat-num">${me.matches}</div><div class="ss-sub small">Main</div></div>
      </div>
      <div class="ss-sub small mt10">Nilai gol, assist, dan atribut hanya bisa diubah oleh admin.</div>
    </div>

    <div class="ss-h2 mt0">Misi</div>
    <div class="ss-card mb18">
      ${STATE.missions.length === 0 ? '<div class="ss-sub">Belum ada misi dari admin.</div>' : STATE.missions.map(m => {
        const diff = MISSION_DIFFICULTY[m.difficulty];
        const isDone = done.includes(m.id);
        return `<div class="ss-list-item">
          <div>
            <div class="fw6-fs13">${esc(m.title)}</div>
            <div class="ss-sub small">${MISSION_PERIOD[m.period]} · ${diff.label} · +${diff.xp} XP</div>
          </div>
          <button class="${isDone ? "ss-chip" : "ss-btn"}" ${isDone ? "disabled" : ""} data-complete-mission="${m.id}">
            ${isDone ? icon("check", 13) : "Selesai"}
          </button>
        </div>`;
      }).join("")}
    </div>

    <div class="ss-h2 mt0">Jadwalkan Pertandingan</div>
    <div class="ss-card">
      ${nextInvite ? `
      <div class="mb12">
        <div class="ss-row-between">
          <div class="ss-row">${icon("calendar", 14)}<span class="fs13">${esc(nextInvite.date)} · ${esc(nextInvite.time)}</span></div>
          <span class="ss-chip">${nextInvite.joined.length} ikut</span>
        </div>
        <div class="ss-row mt6">${icon("mappin", 14)}<span class="fs13">${esc(nextInvite.place)}, ${esc(nextInvite.region)}</span></div>
      </div>` : ""}
      <button class="ss-btn wfull" data-action="toggle-beranda-schedule">${icon("plus", 14)} Buat Ajakan Main</button>
      ${STATE.ui.scheduleOpen ? renderInviteForm("beranda", myGroups) : ""}
    </div>
  `;
}

function bindBeranda() {
  document.querySelectorAll("[data-progress]").forEach(el => { el.style.width = el.dataset.progress + "%"; });
  document.querySelectorAll("[data-quick]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.quick;
      if (id === "leaderboard") goLeaderboard("overall");
      else if (id === "topskor") goLeaderboard("goals");
      else if (id === "topassist") goLeaderboard("assists");
      else if (id === "riwayat") { STATE.ui.historyOpen = !STATE.ui.historyOpen; render(); }
    };
  });
  document.querySelectorAll("[data-goto-profile]").forEach(el => {
    el.onclick = () => openProfile(el.dataset.gotoProfile);
  });
  document.querySelectorAll("[data-complete-mission]").forEach(btn => {
    btn.onclick = () => {
      const missionId = btn.dataset.completeMission;
      const mission = STATE.missions.find(m => m.id === missionId);
      completeMission(currentUser().id, mission);
    };
  });
  const scheduleBtn = document.querySelector('[data-action="toggle-beranda-schedule"]');
  if (scheduleBtn) scheduleBtn.onclick = () => { STATE.ui.scheduleOpen = !STATE.ui.scheduleOpen; render(); };
  bindInviteForm("beranda");
}

function completeMission(playerId, mission) {
  const player = STATE.players.find(p => p.id === playerId);
  if (!player || (player.completedMissions || []).includes(mission.id)) return;
  const xpGain = MISSION_DIFFICULTY[mission.difficulty].xp;
  player.xp = (player.xp || 0) + xpGain;
  player.completedMissions = [...(player.completedMissions || []), mission.id];
  persistPlayers();
  notify(`Misi selesai! +${xpGain} XP`);
  render();
}

/* ------------------------------ shared invite form -------------------------- */
function renderInviteForm(ctx, groupsForSelect) {
  return `
    <div class="ss-card mt10" id="invite-form-${ctx}">
      <div class="ss-sub mb8">Tanggal, tempat, dan region wajib diisi sebelum ajakan bisa dibuat.</div>
      <div class="ss-row mb8 ss-gap8">
        <input class="ss-input" type="date" id="inv-date-${ctx}" />
        <input class="ss-input" type="time" id="inv-time-${ctx}" />
      </div>
      <input class="ss-input mb8" placeholder="Tempat (mis. Lapangan GOR X)" id="inv-place-${ctx}" />
      <input class="ss-input mb8" placeholder="Region (mis. Tulungagung)" id="inv-region-${ctx}" />
      <input class="ss-input mb8" placeholder="Catatan (opsional)" id="inv-note-${ctx}" />
      <select class="ss-select mb8" id="inv-group-${ctx}">
        <option value="">Terbuka untuk semua region</option>
        ${groupsForSelect.map(g => `<option value="${g.id}">Khusus grup: ${esc(g.name)}</option>`).join("")}
      </select>
      <button class="ss-btn wfull" data-action="submit-invite-${ctx}">Publikasikan Ajakan</button>
    </div>`;
}
function bindInviteForm(ctx) {
  const btn = document.querySelector(`[data-action="submit-invite-${ctx}"]`);
  if (!btn) return;
  btn.onclick = () => {
    const date = document.getElementById(`inv-date-${ctx}`).value;
    const time = document.getElementById(`inv-time-${ctx}`).value;
    const place = document.getElementById(`inv-place-${ctx}`).value.trim();
    const region = document.getElementById(`inv-region-${ctx}`).value.trim();
    const note = document.getElementById(`inv-note-${ctx}`).value.trim();
    const groupId = document.getElementById(`inv-group-${ctx}`).value || null;
    if (!date || !time || !place || !region) { notify("Lengkapi tanggal, waktu, tempat, dan region."); return; }
    STATE.invites.push({ id: uid(), creator: currentUser().username, date, time, place, region, note, groupId, joined: [currentUser().username] });
    persistInvites();
    STATE.ui.scheduleOpen = false;
    STATE.ui.showInviteForm = false;
    notify("Ajakan main dibuat.");
    render();
  };
}

/* ================================ LEADERBOARD =============================== */
function statOptions() {
  return [
    { id: "overall", label: "Overall" },
    { id: "goals", label: "Gol" },
    { id: "assists", label: "Assist" },
    { id: "saves", label: "Penyelamatan" },
    { id: "passSuccess", label: "Pass Success %" },
    { id: "matches", label: "Pertandingan" },
  ];
}
function valueOf(p, key) { return key === "overall" ? overallOf(p.attrs) : p[key]; }

function renderLeaderboard() {
  const f = STATE.lbFilters;
  const opts = statOptions();
  const rows = STATE.players
    .filter(p => f.position === "Semua" || p.position === f.position)
    .filter(p => p.name.toLowerCase().includes(f.query.toLowerCase()))
    .sort((a, b) => valueOf(b, f.sortBy) - valueOf(a, f.sortBy));

  return `
    <div class="ss-h2 mt0">Papan Peringkat</div>
    <div class="ss-row mb10">
      ${icon("search", 15)}
      <input class="ss-input" id="lb-query" placeholder="Cari nama pemain…" value="${esc(f.query)}" />
    </div>
    <div class="ss-row mb16 ss-gap8">
      <select class="ss-select" id="lb-position">
        <option ${f.position === "Semua" ? "selected" : ""}>Semua</option>
        ${POSITIONS.map(p => `<option ${f.position === p ? "selected" : ""}>${p}</option>`).join("")}
      </select>
      <select class="ss-select" id="lb-sort">
        ${opts.map(s => `<option value="${s.id}" ${f.sortBy === s.id ? "selected" : ""}>${s.label}</option>`).join("")}
      </select>
    </div>
    <div class="ss-card">
      ${rows.length === 0 ? '<div class="ss-sub">Tidak ada pemain yang cocok.</div>' : rows.map((p, i) => `
        <div class="ss-list-item pointer" data-open-profile="${p.id}">
          <div class="ss-row">
            <div class="rank-num ${i < 3 ? "top" : ""}">${i + 1}</div>
            ${avatarHTML(p)}
            <div><div class="fw6-fs14">${esc(p.name)}</div><div class="ss-sub">${esc(p.position)}</div></div>
          </div>
          <div class="ta-right">
            <div class="fw7-accent">${valueOf(p, f.sortBy)}</div>
            <div class="ss-sub">${opts.find(s => s.id === f.sortBy).label}</div>
          </div>
        </div>`).join("")}
    </div>
  `;
}
function bindLeaderboard() {
  const q = document.getElementById("lb-query");
  if (q) { q.oninput = () => { STATE.lbFilters.query = q.value; renderLeaderboardListOnly(); }; }
  const pos = document.getElementById("lb-position");
  if (pos) pos.onchange = () => { STATE.lbFilters.position = pos.value; render(); };
  const sort = document.getElementById("lb-sort");
  if (sort) sort.onchange = () => { STATE.lbFilters.sortBy = sort.value; render(); };
  document.querySelectorAll("[data-open-profile]").forEach(el => { el.onclick = () => openProfile(el.dataset.openProfile); });
}
// lightweight re-render of just the list while typing search, to keep input focus
function renderLeaderboardListOnly() {
  const content = document.getElementById("ss-content");
  if (!content) return;
  const q = document.getElementById("lb-query");
  const focusVal = q ? q.value : "";
  const caret = q ? q.selectionStart : null;
  content.innerHTML = renderLeaderboard();
  bindLeaderboard();
  const newQ = document.getElementById("lb-query");
  if (newQ) { newQ.focus(); if (caret !== null) newQ.setSelectionRange(caret, caret); }
}

/* =================================== PROFIL ================================= */
function renderProfil() {
  const me = currentUser();
  const player = STATE.players.find(p => p.id === STATE.viewProfileId) || me;
  const isMe = player.id === me.id;
  const overall = overallOf(player.attrs);
  const myMatches = STATE.matches;
  const canEditPhoto = isMe || me.isAdmin;

  return `
    ${!isMe ? `<button class="ss-btn-ghost mb12" data-action="back-to-me">${icon("chevronleft", 14)} Profil saya</button>` : ""}
    <div class="ss-card center mb16">
      ${avatarHTML(player, "lg", "avatar-center")}
      ${canEditPhoto ? `
        <div class="ss-row photo-actions">
          <button class="ss-btn-ghost small" data-action="change-photo">${player.photo ? "Ganti foto" : "Pasang foto profil"}</button>
          ${player.photo ? '<button class="ss-btn-ghost small" data-action="remove-photo">Hapus foto</button>' : ""}
          <input type="file" accept="image/*" id="photo-input" hidden />
        </div>` : ""}
      <div class="fw7-fs18">${esc(player.name)}</div>
      <div class="ss-sub">${esc(player.position)}${ageStr(player)} · @${esc(player.username)}</div>
      ${player.secondaryPositions && player.secondaryPositions.length ? `
        <div class="ss-row secpos-chips">
          ${player.secondaryPositions.map(p => `<span class="ss-chip small">${esc(p)}</span>`).join("")}
        </div>` : ""}
      <div class="mt10 ovr-pill">
        OVERALL ${overall}
      </div>
    </div>

    <div class="ss-card mb16">
      <div class="ss-h2 mt0">Atribut</div>
      ${radarSVG(player.attrs, 220)}
      <div class="grid2 mt8">
        ${Object.entries(player.attrs).map(([k, v]) => `<div class="ss-row-between"><span class="ss-sub">${ATTR_LABELS[k]}</span><span class="fw6">${v}</span></div>`).join("")}
      </div>
    </div>

    <div class="ss-card mb16">
      <div class="ss-h2 mt0">Statistik Karier</div>
      ${renderStatGrid(player)}
    </div>

    ${isMe ? `
    <div class="ss-card mb16">
      <div class="ss-h2 mt0">Ajukan Update Statistik</div>
      <div class="ss-sub mb10">Penambahan gol/assist/penyelamatan perlu disetujui admin sebelum masuk statistik resmi.</div>
      <div class="ss-row mb8 ss-gap8">
        <select class="ss-select" id="claim-type">
          <option value="goals">Gol</option>
          <option value="assists">Assist</option>
          <option value="saves">Penyelamatan</option>
        </select>
        <input class="ss-input w80" type="number" min="1" id="claim-value" value="1" />
      </div>
      <input class="ss-input mb10" id="claim-note" placeholder="Catatan (mis. lawan Elang FC, 12 Sep)" />
      <button class="ss-btn" data-action="submit-claim">Kirim Pengajuan</button>
    </div>` : ""}

    <div class="ss-card">
      <div class="ss-h2 mt0">Riwayat Pertandingan Diikuti</div>
      ${myMatches.length === 0 ? '<div class="ss-sub">Belum ada pertandingan.</div>' : ""}
      ${myMatches.slice().reverse().map(m => `
        <div class="ss-list-item">
          <div><div class="fw6-fs13">vs ${esc(m.opponent)}</div><div class="ss-sub">${esc(m.date)}</div></div>
          <div class="fw7">${esc(m.score)}</div>
        </div>`).join("")}
    </div>
  `;
}
function renderStatGrid(player) {
  const items = [
    { label: "Pertandingan", value: player.matches, icon: "clock" },
    { label: "Gol", value: player.goals, icon: "target" },
    { label: "Assist", value: player.assists, icon: "award" },
    { label: "Penyelamatan", value: player.saves, icon: "hand" },
    { label: "Kartu Kuning", value: player.yellow, icon: "shield" },
    { label: "Kartu Merah", value: player.red, icon: "shield" },
    { label: "Rasio Gol", value: ratioOf(player.goals, player.matches), icon: "arrowupright" },
    { label: "Rasio Assist", value: ratioOf(player.assists, player.matches), icon: "arrowupright" },
    { label: "Pass Success", value: player.passSuccess + "%", icon: "target" },
  ];
  return `<div class="grid2">
    ${items.map(it => `
      <div class="ss-row gap8">
        <span class="op55">${icon(it.icon, 14)}</span>
        <div><div class="fw7-fs14">${it.value}</div><div class="ss-sub small">${it.label}</div></div>
      </div>`).join("")}
  </div>`;
}
function bindProfil() {
  const target = STATE.players.find(p => p.id === STATE.viewProfileId) || currentUser();
  const changeBtn = document.querySelector('[data-action="change-photo"]');
  const photoInput = document.getElementById("photo-input");
  if (changeBtn && photoInput) {
    changeBtn.onclick = () => photoInput.click();
    photoInput.onchange = async () => {
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      try {
        target.photo = await resizeImage(file, 256);
        persistPlayers();
        notify("Foto profil diperbarui.");
      } catch (e) { notify("Gambar tidak bisa dibaca, coba file lain."); }
      render();
    };
  }
  const removeBtn = document.querySelector('[data-action="remove-photo"]');
  if (removeBtn) removeBtn.onclick = () => { target.photo = null; persistPlayers(); notify("Foto profil dihapus."); render(); };
  const back = document.querySelector('[data-action="back-to-me"]');
  if (back) back.onclick = () => { STATE.viewProfileId = null; render(); };
  const submitClaim = document.querySelector('[data-action="submit-claim"]');
  if (submitClaim) submitClaim.onclick = () => {
    const type = document.getElementById("claim-type").value;
    const value = Number(document.getElementById("claim-value").value) || 1;
    const note = document.getElementById("claim-note").value.trim();
    STATE.pending.push({ id: uid(), playerId: currentUser().id, type, value, note, status: "pending", createdAt: Date.now() });
    persistPending();
    notify("Pengajuan dikirim, menunggu persetujuan admin.");
    render();
  };
}

/* ==================================== GRUP =================================== */
function renderGrup() {
  const me = currentUser();
  if (STATE.ui.openGroupId) return renderGroupChat();

  const myGroups = STATE.groups.filter(g => g.members.includes(me.username));
  const otherGroups = STATE.groups.filter(g => !g.members.includes(me.username));

  return `
    <div class="ss-h2 mt0">Grup Saya</div>
    <div class="ss-card mb16">
      ${myGroups.length === 0 ? '<div class="ss-sub">Belum bergabung ke grup manapun.</div>' : myGroups.map(g => `
        <div class="ss-list-item pointer" data-open-group="${g.id}">
          <div class="ss-row">
            ${icon(g.open ? "unlock" : "lock", 15)}
            <div><div class="fw6-fs14">${esc(g.name)}</div><div class="ss-sub">${g.members.length} anggota</div></div>
          </div>
          ${icon("chevronright", 16)}
        </div>`).join("")}
    </div>

    <div class="ss-h2 mt0">Temukan Grup</div>
    <div class="ss-card mb16">
      ${otherGroups.length === 0 ? '<div class="ss-sub">Semua grup sudah kamu ikuti.</div>' : otherGroups.map(g => `
        <div class="ss-list-item">
          <div class="ss-row">
            ${icon(g.open ? "unlock" : "lock", 15)}
            <div><div class="fw6-fs14">${esc(g.name)}</div><div class="ss-sub">${g.open ? "Bergabung langsung" : "Butuh kata sandi"}</div></div>
          </div>
          ${STATE.ui.joinPwFor === g.id ? `
            <div class="ss-row">
              <input class="ss-input w80" id="join-pw-${g.id}" placeholder="Sandi" />
              <button class="ss-btn" data-join-confirm="${g.id}">OK</button>
            </div>` : `<button class="ss-btn-ghost" data-join="${g.id}">Gabung</button>`}
        </div>`).join("")}
    </div>

    <button class="ss-btn-ghost mb20 wfull" data-action="toggle-create-group">${icon("plus", 14)} Buat Grup Baru</button>
    ${STATE.ui.showCreateGroup ? renderCreateGroupForm() : ""}

    <div class="ss-h2 mt0">Ajakan Main Online</div>
    ${STATE.invites.slice().reverse().map(inv => `
      <div class="ss-card mb10">
        <div class="ss-row-between">
          <div class="ss-row">${icon("calendar", 14)}<span class="fs13">${esc(inv.date)} · ${esc(inv.time)}</span></div>
          <span class="ss-chip">${inv.joined.length} ikut</span>
        </div>
        <div class="ss-row mt6">${icon("mappin", 14)}<span class="fs13">${esc(inv.place)}, ${esc(inv.region)}</span></div>
        ${inv.note ? `<div class="ss-sub mt6">${esc(inv.note)}</div>` : ""}
        <button class="ss-btn-ghost mt10" ${inv.joined.includes(me.username) ? "disabled" : ""} data-join-invite="${inv.id}">
          ${inv.joined.includes(me.username) ? "Sudah bergabung" : "Gabung"}
        </button>
      </div>`).join("")}
    <button class="ss-btn wfull mt6" data-action="toggle-invite-form">${icon("plus", 14)} Buat Ajakan Main</button>
    ${STATE.ui.showInviteForm ? renderInviteForm("grup", myGroups) : ""}
  `;
}
function renderCreateGroupForm() {
  return `
    <div class="ss-card mb20">
      <input class="ss-input mb8" id="cg-name" placeholder="Nama grup" />
      <div class="ss-row mb8">
        <label class="ss-row fs13"><input type="radio" name="cg-open" id="cg-open-yes" checked /> Terbuka</label>
        <label class="ss-row fs13"><input type="radio" name="cg-open" id="cg-open-no" /> Berkata sandi</label>
      </div>
      <input class="ss-input mb8" id="cg-password" placeholder="Kata sandi (jika berkata sandi)" />
      <button class="ss-btn" data-action="submit-create-group">Buat</button>
    </div>`;
}
function renderGroupChat() {
  const g = STATE.groups.find(x => x.id === STATE.ui.openGroupId);
  const msgs = STATE.chats[g.id] || [];
  return `
    <button class="ss-btn-ghost mb12" data-action="close-group">${icon("chevronleft", 14)} Grup</button>
    <div class="ss-h2 mt0">${esc(g.name)}</div>
    <div class="ss-sub mb12">${g.members.length} anggota · ${g.open ? "Grup terbuka" : "Berkata sandi"}</div>
    <div class="ss-card mb12 chat-box" id="chat-scroll">
      ${msgs.length === 0 ? '<div class="ss-sub">Belum ada pesan. Mulai obrolan!</div>' : msgs.map(m => `
        <div><div class="fs11-muted">${esc(m.name)}</div><div class="fs14">${esc(m.text)}</div></div>`).join("")}
    </div>
    <div class="ss-row">
      <input class="ss-input" id="chat-input" placeholder="Tulis pesan…" />
      <button class="ss-btn" data-action="send-chat">${icon("send", 15)}</button>
    </div>
  `;
}
function bindGrup() {
  const me = currentUser();
  if (STATE.ui.openGroupId) {
    const back = document.querySelector('[data-action="close-group"]');
    if (back) back.onclick = () => { STATE.ui.openGroupId = null; render(); };
    const scroll = document.getElementById("chat-scroll");
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
    const input = document.getElementById("chat-input");
    const send = () => {
      const val = input.value.trim();
      if (!val) return;
      const g = STATE.ui.openGroupId;
      STATE.chats[g] = [...(STATE.chats[g] || []), { id: uid(), user: me.username, name: me.name, text: val, at: Date.now() }];
      persistChats();
      render();
    };
    const sendBtn = document.querySelector('[data-action="send-chat"]');
    if (sendBtn) sendBtn.onclick = send;
    if (input) { input.focus(); input.onkeydown = e => { if (e.key === "Enter") send(); }; }
    return;
  }

  document.querySelectorAll("[data-open-group]").forEach(el => { el.onclick = () => { STATE.ui.openGroupId = el.dataset.openGroup; render(); }; });
  document.querySelectorAll("[data-join]").forEach(btn => { btn.onclick = () => { STATE.ui.joinPwFor = btn.dataset.join; render(); }; });
  document.querySelectorAll("[data-join-confirm]").forEach(btn => {
    btn.onclick = () => {
      const gid = btn.dataset.joinConfirm;
      const g = STATE.groups.find(x => x.id === gid);
      const pwInput = document.getElementById(`join-pw-${gid}`);
      const pw = pwInput ? pwInput.value : "";
      if (!g.open && g.password !== pw) { notify("Kata sandi salah."); return; }
      if (!g.members.includes(me.username)) g.members.push(me.username);
      persistGroups();
      STATE.ui.joinPwFor = null;
      notify("Berhasil bergabung ke " + g.name);
      render();
    };
  });
  const toggleCreate = document.querySelector('[data-action="toggle-create-group"]');
  if (toggleCreate) toggleCreate.onclick = () => { STATE.ui.showCreateGroup = !STATE.ui.showCreateGroup; render(); };
  const submitCreate = document.querySelector('[data-action="submit-create-group"]');
  if (submitCreate) submitCreate.onclick = () => {
    const name = document.getElementById("cg-name").value.trim();
    if (!name) return;
    const isOpen = document.getElementById("cg-open-yes").checked;
    const password = document.getElementById("cg-password").value;
    STATE.groups.push({ id: uid(), name, open: isOpen, password: isOpen ? "" : password, members: [me.username] });
    persistGroups();
    STATE.ui.showCreateGroup = false;
    notify("Grup dibuat.");
    render();
  };
  document.querySelectorAll("[data-join-invite]").forEach(btn => {
    btn.onclick = () => {
      const inv = STATE.invites.find(i => i.id === btn.dataset.joinInvite);
      if (inv && !inv.joined.includes(me.username)) { inv.joined.push(me.username); persistInvites(); render(); }
    };
  });
  const toggleInvite = document.querySelector('[data-action="toggle-invite-form"]');
  if (toggleInvite) toggleInvite.onclick = () => { STATE.ui.showInviteForm = !STATE.ui.showInviteForm; render(); };
  bindInviteForm("grup");
}

/* =================================== ADMIN ==================================== */
function renderAdmin() {
  const pendingOnly = STATE.pending.filter(p => p.status === "pending");
  return `
    <div class="ss-h2 mt0">Tambah Pemain Baru</div>
    <div class="ss-card mb20">${renderAddPlayerForm()}</div>

    <div class="ss-h2 mt0">Kelola Misi</div>
    <div class="ss-card mb20">
      ${STATE.missions.map(m => `
        <div class="ss-list-item">
          <div><div class="fw6-fs13">${esc(m.title)}</div>
          <div class="ss-sub small">${MISSION_PERIOD[m.period]} · ${MISSION_DIFFICULTY[m.difficulty].label} · +${MISSION_DIFFICULTY[m.difficulty].xp} XP</div></div>
          <button class="ss-btn-ghost" data-delete-mission="${m.id}">${icon("x", 14)}</button>
        </div>`).join("")}
      ${renderAddMissionForm()}
    </div>

    <div class="ss-h2 mt0">Persetujuan Statistik</div>
    <div class="ss-card mb20">
      ${pendingOnly.length === 0 ? '<div class="ss-sub">Tidak ada pengajuan yang menunggu.</div>' : pendingOnly.map(claim => {
        const pl = STATE.players.find(p => p.id === claim.playerId);
        const labels = { goals: "Gol", assists: "Assist", saves: "Penyelamatan" };
        return `<div class="ss-list-item">
          <div><div class="fw6-fs13">${esc(pl?.name)} · +${claim.value} ${labels[claim.type]}</div>
          <div class="ss-sub">${esc(claim.note || "Tanpa catatan")}</div></div>
          <div class="ss-row">
            <button class="ss-btn-ghost" data-decide="${claim.id}" data-approve="0">${icon("x", 14)}</button>
            <button class="ss-btn" data-decide="${claim.id}" data-approve="1">${icon("check", 14)}</button>
          </div>
        </div>`;
      }).join("")}
    </div>

    <div class="ss-h2 mt0">Kelola Atribut & Statistik Pemain</div>
    <div class="ss-card">
      ${STATE.players.map(p => `
        <div class="player-block">
          <div class="ss-row-between pointer" data-toggle-edit="${p.id}">
            <div class="ss-row">
              ${avatarHTML(p)}
              <div><div class="fw6-fs14">${esc(p.name)}</div><div class="ss-sub">OVR ${overallOf(p.attrs)} · ${esc(p.position)}</div></div>
            </div>
            <span class="chevron ${STATE.ui.editingAdminId === p.id ? "open" : ""}">${icon("chevronright", 16)}</span>
          </div>
          ${STATE.ui.editingAdminId === p.id ? renderAdminEditPlayer(p) : ""}
        </div>`).join("")}
    </div>
  `;
}
function renderAddPlayerForm() {
  return `
    <input class="ss-input mb8" id="ap-name" placeholder="Nama lengkap" />
    <div class="ss-row mb8 ss-gap8">
      <input class="ss-input" id="ap-username" placeholder="Username" />
      <input class="ss-input" id="ap-password" placeholder="Password" />
    </div>
    <div class="ss-row mb10 ss-gap8">
      <input class="ss-input" type="number" min="14" max="45" id="ap-age" placeholder="Umur" value="20" />
      <select class="ss-select" id="ap-position">${POSITIONS.map(p => `<option>${p}</option>`).join("")}</select>
    </div>
    <button class="ss-btn" data-action="submit-add-player">Tambah Pemain</button>
  `;
}
function renderAddMissionForm() {
  return `
    <div class="divider-top">
      <input class="ss-input mb8" id="am-title" placeholder="Judul misi (mis. Cetak 1 gol)" />
      <div class="ss-row mb8 ss-gap8">
        <select class="ss-select" id="am-difficulty">${Object.entries(MISSION_DIFFICULTY).map(([k, v]) => `<option value="${k}">${v.label} (+${v.xp} XP)</option>`).join("")}</select>
        <select class="ss-select" id="am-period">${Object.entries(MISSION_PERIOD).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
      </div>
      <button class="ss-btn" data-action="submit-add-mission">Tambah Misi</button>
    </div>`;
}
function renderAdminEditPlayer(p) {
  return `
    <div class="admin-edit">
      <div class="ss-sub mb6">Profil</div>
      <input class="ss-input mb8" id="edit-name-${p.id}" value="${esc(p.name)}" />
      <div class="ss-row mb8 ss-gap8">
        <input class="ss-input" type="number" id="edit-age-${p.id}" placeholder="Umur" value="${p.age || ""}" />
        <select class="ss-select" id="edit-position-${p.id}">
          ${POSITIONS.map(pos => `<option ${pos === p.position ? "selected" : ""}>${pos}</option>`).join("")}
        </select>
      </div>
      <div class="ss-sub small mb6">Posisi tambahan (selain posisi utama)</div>
      <div class="ss-row mb8 ss-gap8 wrap" id="secpos-${p.id}">
        ${POSITIONS.map(pos => `<button type="button" class="ss-chip ${p.secondaryPositions.includes(pos) ? "active" : ""} ${pos === p.position ? "hidden" : ""}" data-secpos="${pos}" data-secpos-of="${p.id}">${pos}</button>`).join("")}
      </div>
      <button class="ss-btn-ghost mb16" data-action="save-profile-${p.id}">Simpan Profil</button>

      <div class="ss-sub mb6">Atribut (diagram segilima)</div>
      ${radarSVG(p.attrs, 200, `radar-admin-${p.id}`)}
      ${Object.keys(ATTR_LABELS).map(k => `
        <div class="mb8">
          <div class="ss-row-between fs12">
            <span>${ATTR_LABELS[k]}</span><span id="attrval-${p.id}-${k}">${p.attrs[k]}</span>
          </div>
          <input class="w100" type="range" min="0" max="100" value="${p.attrs[k]}" id="attr-${p.id}-${k}" data-attr-slider="${p.id}" data-attr-key="${k}" />
        </div>`).join("")}
      <button class="ss-btn-ghost mb14" data-action="save-attrs-${p.id}">Simpan Atribut</button>

      <div class="ss-sub mb6">Statistik Karier</div>
      <div class="grid2 mb10">
        ${["goals", "assists", "matches", "saves", "yellow", "red", "passSuccess"].map(k => `
          <div>
            <div class="ss-sub small">${k}</div>
            <input class="ss-input" type="number" id="stat-${p.id}-${k}" value="${p[k]}" />
          </div>`).join("")}
      </div>
      <button class="ss-btn" data-action="save-stats-${p.id}">Simpan Statistik</button>
    </div>
  `;
}
function bindAdmin() {
  const addPlayerBtn = document.querySelector('[data-action="submit-add-player"]');
  if (addPlayerBtn) addPlayerBtn.onclick = () => {
    const name = document.getElementById("ap-name").value.trim();
    const username = document.getElementById("ap-username").value.trim().toLowerCase();
    const password = document.getElementById("ap-password").value.trim();
    const age = Number(document.getElementById("ap-age").value) || 18;
    const position = document.getElementById("ap-position").value;
    if (!name || !username || !password) { notify("Lengkapi nama, username, dan password."); return; }
    if (STATE.players.some(p => p.username === username)) { notify("Username sudah dipakai, pilih yang lain."); return; }
    STATE.players.push({
      id: uid(), username, password, name, age, position, secondaryPositions: [], isAdmin: false,
      attrs: { speed: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50 },
      goals: 0, assists: 0, matches: 0, saves: 0, yellow: 0, red: 0, passSuccess: 0, xp: 0, completedMissions: [],
    });
    persistPlayers();
    notify(`Pemain ${name} ditambahkan.`);
    render();
  };

  const addMissionBtn = document.querySelector('[data-action="submit-add-mission"]');
  if (addMissionBtn) addMissionBtn.onclick = () => {
    const title = document.getElementById("am-title").value.trim();
    if (!title) return;
    const difficulty = document.getElementById("am-difficulty").value;
    const period = document.getElementById("am-period").value;
    STATE.missions.push({ id: uid(), title, difficulty, period, createdAt: Date.now() });
    persistMissions();
    notify("Misi baru ditambahkan.");
    render();
  };
  document.querySelectorAll("[data-delete-mission]").forEach(btn => {
    btn.onclick = () => { STATE.missions = STATE.missions.filter(m => m.id !== btn.dataset.deleteMission); persistMissions(); render(); };
  });

  document.querySelectorAll("[data-decide]").forEach(btn => {
    btn.onclick = () => decideClaim(btn.dataset.decide, btn.dataset.approve === "1");
  });

  document.querySelectorAll("[data-toggle-edit]").forEach(el => {
    el.onclick = () => { STATE.ui.editingAdminId = STATE.ui.editingAdminId === el.dataset.toggleEdit ? null : el.dataset.toggleEdit; render(); };
  });

  if (STATE.ui.editingAdminId) bindAdminEditPlayer(STATE.ui.editingAdminId);
}
function decideClaim(claimId, approve) {
  const claim = STATE.pending.find(c => c.id === claimId);
  if (!claim) return;
  if (approve) {
    const player = STATE.players.find(p => p.id === claim.playerId);
    if (player) player[claim.type] += claim.value;
    persistPlayers();
  }
  claim.status = approve ? "approved" : "rejected";
  persistPending();
  notify(approve ? "Klaim disetujui." : "Klaim ditolak.");
  render();
}
function bindAdminEditPlayer(playerId) {
  const p = STATE.players.find(x => x.id === playerId);
  if (!p) return;

  // secondary position chip toggles (local, saved on "Simpan Profil")
  const secpos = new Set(p.secondaryPositions);
  document.querySelectorAll(`[data-secpos-of="${playerId}"]`).forEach(btn => {
    btn.onclick = () => {
      const pos = btn.dataset.secpos;
      if (secpos.has(pos)) { secpos.delete(pos); btn.classList.remove("active"); }
      else { secpos.add(pos); btn.classList.add("active"); }
    };
  });

  const saveProfileBtn = document.querySelector(`[data-action="save-profile-${playerId}"]`);
  if (saveProfileBtn) saveProfileBtn.onclick = () => {
    p.name = document.getElementById(`edit-name-${playerId}`).value.trim() || p.name;
    p.age = Number(document.getElementById(`edit-age-${playerId}`).value) || p.age;
    p.position = document.getElementById(`edit-position-${playerId}`).value;
    p.secondaryPositions = Array.from(secpos).filter(x => x !== p.position);
    persistPlayers();
    notify("Profil diperbarui.");
    render();
  };

  // live radar preview while dragging sliders
  const attrsDraft = { ...p.attrs };
  const svg = document.getElementById(`radar-admin-${playerId}`);
  document.querySelectorAll(`[data-attr-slider="${playerId}"]`).forEach(slider => {
    slider.oninput = () => {
      const key = slider.dataset.attrKey;
      attrsDraft[key] = Number(slider.value);
      const label = document.getElementById(`attrval-${playerId}-${key}`);
      if (label) label.textContent = slider.value;
      if (svg) updateRadarLive(svg, attrsDraft);
    };
  });
  const saveAttrsBtn = document.querySelector(`[data-action="save-attrs-${playerId}"]`);
  if (saveAttrsBtn) saveAttrsBtn.onclick = () => {
    p.attrs = { ...attrsDraft };
    persistPlayers();
    notify("Atribut diperbarui.");
    render();
  };

  const saveStatsBtn = document.querySelector(`[data-action="save-stats-${playerId}"]`);
  if (saveStatsBtn) saveStatsBtn.onclick = () => {
    ["goals", "assists", "matches", "saves", "yellow", "red", "passSuccess"].forEach(k => {
      const el = document.getElementById(`stat-${playerId}-${k}`);
      if (el) p[k] = Number(el.value) || 0;
    });
    persistPlayers();
    notify("Statistik diperbarui.");
    render();
  };
}

/* ================================= SETTINGS =================================== */
function renderSettings() {
  return `
    <div class="ss-h2 mt0">Tema</div>
    <div class="ss-card mb16">
      <div class="ss-row ss-gap8">
        <button class="ss-btn-ghost theme-btn ${STATE.theme === "dark" ? "on" : ""}" data-set-theme="dark">Gelap</button>
        <button class="ss-btn-ghost theme-btn ${STATE.theme === "light" ? "on" : ""}" data-set-theme="light">Terang</button>
      </div>
    </div>
    <div class="ss-h2 mt0">Warna Aksen</div>
    <div class="ss-card">
      <div class="ss-row ss-gap8 wrap">
        ${ACCENTS.map(a => `<button class="ss-swatch ${STATE.accentId === a.id ? "selected" : ""}" data-set-accent="${a.id}" title="${a.label}"></button>`).join("")}
      </div>
    </div>
  `;
}
function bindSettings() {
  document.querySelectorAll("[data-set-theme]").forEach(btn => {
    btn.onclick = () => { STATE.theme = btn.dataset.setTheme; applyThemeAttrs(); persistSettings(); render(); };
  });
  document.querySelectorAll("[data-set-accent]").forEach(btn => {
    btn.onclick = () => { STATE.accentId = btn.dataset.setAccent; applyThemeAttrs(); persistSettings(); render(); };
  });
}

/* ================================== BOOT ====================================== */
document.addEventListener("DOMContentLoaded", init);