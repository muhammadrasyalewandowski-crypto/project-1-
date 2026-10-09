/* ===================== Skuad Stats — auth.js ===================== */
/* Semua urusan masuk/keluar & sesi ada di sini. Dipakai index.html (login) dan balbalan.html.
   Butuh data.js dimuat lebih dulu. */

const Auth = (() => {
  const SESSION_KEY = "ss_session";
  const LOGIN_PAGE = "index.html";
  const MAIN_PAGE = "balbalan.html";

  // username yang sedang login (null kalau belum / akunnya sudah tidak ada)
  function getSession() {
    const u = loadJSON(SESSION_KEY, null);
    if (!u) return null;
    return loadDB().players.some(p => p.username === u) ? u : null;
  }

  // cek username + kata sandi; kalau cocok simpan sesi
  function login(username, password) {
    const p = loadDB().players.find(x => x.username === username);
    if (!p || p.password !== password) return { ok: false, error: "Kata sandi salah. Coba lagi." };
    saveJSON(SESSION_KEY, p.username);
    return { ok: true, user: p };
  }

  function logout() {
    saveJSON(SESSION_KEY, null);
    location.href = LOGIN_PAGE;
  }

  // dipanggil di halaman utama: belum login -> lempar ke index.html
  function requireLogin() {
    const u = getSession();
    if (!u) { location.replace(LOGIN_PAGE); return null; }
    return u;
  }

  // dipanggil di halaman login: sudah login -> lempar ke balbalan.html
  function redirectIfLoggedIn() {
    if (getSession()) { location.replace(MAIN_PAGE); return true; }
    return false;
  }

  function goMain() { location.href = MAIN_PAGE; }

  return { getSession, login, logout, requireLogin, redirectIfLoggedIn, goMain };
})();