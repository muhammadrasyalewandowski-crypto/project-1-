/* ===================== Skuad Stats — login.js (halaman login) ===================== */
/* Butuh data.js dan auth.js dimuat lebih dulu. Setelah berhasil masuk, diarahkan ke balbalan.html. */

const L = { step: "role", role: null, selectedUsername: null, error: "", players: [] };

function init() {
  applyThemeAttrs();
  if (Auth.redirectIfLoggedIn()) return; // sudah login -> langsung ke halaman utama
  L.players = loadDB().players;
  render();
}

function render() {
  document.getElementById("app").innerHTML = renderLogin();
  bindLogin();
}

function renderLogin() {
  let body = "";
  if (L.step === "role") {
    body = `
      <button class="ss-role-btn" data-role="admin">
        ${icon("shield", 22)}
        <div><div class="fw7-fs15">Masuk sebagai Admin</div>
        <div class="fs12-muted">Kelola statistik, misi, dan persetujuan</div></div>
      </button>
      <button class="ss-role-btn" data-role="member">
        ${icon("user", 22)}
        <div><div class="fw7-fs15">Masuk sebagai Pemain</div>
        <div class="fs12-muted">Lihat statistik, misi, dan ajakan main</div></div>
      </button>`;
  } else if (L.step === "account") {
    const list = L.players.filter(p => L.role === "admin" ? p.isAdmin : !p.isAdmin);
    body = `
      <button class="ss-btn-ghost mb12" data-action="back-to-role">${icon("chevronleft", 14)} Ganti peran</button>
      <div class="ss-login-box">
        <div class="ss-sub mb10">Pilih akun ${L.role === "admin" ? "admin" : "pemain"}:</div>
        ${list.map(p => `
          <button class="ss-account-row" data-account="${esc(p.username)}">
            ${avatarHTML(p)}
            <div class="flex1">
              <div class="fw6-fs14">${esc(p.name)}</div>
              <div class="fs12-muted">@${esc(p.username)}</div>
            </div>
          </button>`).join("")}
      </div>`;
  } else {
    const p = L.players.find(x => x.username === L.selectedUsername);
    body = `
      <button class="ss-btn-ghost mb12" data-action="back-to-account">${icon("chevronleft", 14)} Pilih akun lain</button>
      <div class="ss-login-box">
        <div class="ss-row mb16">
          ${avatarHTML(p)}
          <div><div class="fw7-fs15">${esc(p.name)}</div>
          <div class="fs12-muted">@${esc(p.username)}</div></div>
        </div>
        <input class="ss-input mb8" type="password" id="login-password" placeholder="Kata sandi" />
        ${L.error ? `<div class="ss-error">${esc(L.error)}</div>` : ""}
        <button class="ss-btn wfull jc-center" data-action="submit-password">Masuk</button>
      </div>`;
  }
  return `
    <div class="ss-login-wrap">
      <div class="ss-login-title">SKUAD STATS</div>
      <div class="ss-login-sub">Basis data & leaderboard pemain</div>
      ${body}
      <div class="ss-hint">Prototipe frontend — demo sandi: username + "123" (mis. fadil123). Data tersimpan di localStorage peramban ini.</div>
    </div>`;
}

function bindLogin() {
  document.querySelectorAll("[data-role]").forEach(btn => {
    btn.onclick = () => { L.role = btn.dataset.role; L.step = "account"; L.error = ""; render(); };
  });
  const backRole = document.querySelector('[data-action="back-to-role"]');
  if (backRole) backRole.onclick = () => { L.step = "role"; render(); };
  document.querySelectorAll("[data-account]").forEach(btn => {
    btn.onclick = () => { L.selectedUsername = btn.dataset.account; L.step = "password"; L.error = ""; render(); };
  });
  const backAccount = document.querySelector('[data-action="back-to-account"]');
  if (backAccount) backAccount.onclick = () => { L.step = "account"; render(); };

  const submitBtn = document.querySelector('[data-action="submit-password"]');
  const pwInput = document.getElementById("login-password");
  const doSubmit = () => {
    const res = Auth.login(L.selectedUsername, pwInput ? pwInput.value : "");
    if (!res.ok) { L.error = res.error; render(); return; }
    Auth.goMain();
  };
  if (submitBtn) submitBtn.onclick = doSubmit;
  if (pwInput) { pwInput.focus(); pwInput.onkeydown = e => { if (e.key === "Enter") doSubmit(); }; }
}

document.addEventListener("DOMContentLoaded", init);