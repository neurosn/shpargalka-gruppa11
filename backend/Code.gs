/**
 * Портал Группы 11 — сервер входа и ролей (Google Apps Script).
 * Хранит данные в таблице «Группа 11», в скрытых листах «_доступ» и «_сессии».
 * Пароли хранятся только в виде соли + хеша (SHA-256, 1000 раундов) — исходных паролей здесь нет.
 *
 * Установка: см. backend/README.md
 */
const SHEET_ID = '1WTmuXiOqswY36a12nPJNSDDNxkIIW02VODYRlxsxmeQ';
const ACC = '_доступ', SES = '_сессии', LOG = '_входы', PAY = '_зп';
const DISC = 'Дисциплина';
const ROLES = ['employee', 'editor', 'admin'];
const MAX_FAILS = 5, LOCK_MIN = 15;

// Начальные аккаунты: ID, ФИО, роль, соль, хеш пароля (пароли выдаются руководителем отдельно)
const SEED = []; // начальные аккаунты уже созданы; новых добавляйте через админку

/* ---------- служебное ---------- */
/* ---------- скорость: одна таблица и одно чтение листа на запрос + общий кэш ---------- */
let _ss = null, _memo = {};
function ss_() { return _ss || (_ss = SpreadsheetApp.openById(SHEET_ID)); }
function memo_(k, f) { if (!(k in _memo)) _memo[k] = f(); return _memo[k]; }
function forget_() { _memo = {}; }
function cache_() { return CacheService.getScriptCache(); }
function cget_(k) { try { const x = cache_().get(k); return x ? JSON.parse(x) : null; } catch (e) { return null; } }
function cput_(k, v, sec) { try { const j = JSON.stringify(v); if (j.length < 95000) cache_().put(k, j, sec); } catch (e) {} }
function cdel_(k) { try { cache_().remove(k); } catch (e) {} }
function sesGen_() { return cache_().get('sesgen') || '0'; }
function bumpSes_() { cache_().put('sesgen', String(Date.now()), 21600); }
function dropDisc_() { forget_(); cdel_('disc_' + todayKey_().slice(0, 7)); const p = shiftNow_().date.slice(0, 7); cdel_('disc_' + p); }
function sheet_(name, headers) {
  const ss = ss_();
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(headers); s.setFrozenRows(1); s.hideSheet(); }
  return s;
}
function accSheet_() { return sheet_(ACC, ['ID', 'ФИО', 'Роль', 'Соль', 'Хеш', 'Активен', 'Обновлён']); }
function logSheet_() { return sheet_(LOG, ['Время', 'ID', 'ФИО', 'Событие', 'Устройство']); }
function paySheet_() { return sheet_(PAY, ['ID', 'Сумма по ГПХ', 'Обновлено']); }
function log_(id, name, ev, device) { try { logSheet_().appendRow([new Date(), String(id || ''), name || '', ev, String(device || '').slice(0, 160)]); } catch (e) {} }
function sesSheet_() { return sheet_(SES, ['Хеш токена', 'ID', 'Создан', 'Активность', 'Устройство']); }
function hex_(b) { return b.map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join(''); }
function sha_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
function hashPw_(salt, pw) { let h = sha_(salt + pw); for (let i = 0; i < 999; i++) h = sha_(h + salt); return h; }
function rnd_(n) { let s = ''; while (s.length < n) s += Utilities.getUuid().replace(/-/g, ''); return s.slice(0, n); }
function genPw_() {
  const A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now());
  let p = '';
  for (let i = 0; i < 12; i++) { p += A[(bytes[i] & 255) % A.length]; if (i === 3 || i === 7) p += '-'; }
  return p;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fail_(msg, code) { const e = new Error(msg); e.code = code || 'error'; throw e; }

function users_() { return memo_('users', function () { const k = 'u_' + sesGen_(), c = cget_(k); if (c) return c; const r = users0_(); cput_(k, r, 600); return r; }); }
function users0_() {
  const v = accSheet_().getDataRange().getValues(); const res = [];
  for (let i = 1; i < v.length; i++) if (v[i][0] !== '') res.push({ row: i + 1, id: String(v[i][0]).trim(), name: v[i][1], role: v[i][2], salt: v[i][3], hash: v[i][4], active: v[i][5] !== false && v[i][5] !== 'нет' });
  return res;
}
function findUser_(id) { id = String(id || '').trim(); return users_().filter(function (u) { return u.id === id; })[0]; }
function pub_(u) { return { id: u.id, name: u.name, role: u.role }; }

/* ---------- сессии: вход сохраняется, пока человек сам не нажмёт «Выйти» ---------- */
function newSession_(id, device) {
  const token = rnd_(48);
  sesSheet_().appendRow([sha_(token), id, new Date(), new Date(), String(device || '').slice(0, 120)]);
  return token;
}
function session_(token, fresh) {
  if (!token) fail_('Нужно войти', 'auth');
  const th = sha_(token), ck = 's_' + sesGen_() + '_' + th;
  if (!fresh) { const c = cget_(ck); if (c) return { user: c, row: null, cached: true }; }
  const s = sesSheet_(), v = s.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (v[i][0] === th) {
    const u = findUser_(v[i][1]);
    if (!u || !u.active) fail_('Аккаунт отключён', 'auth');
    const last = v[i][3] instanceof Date ? v[i][3].getTime() : 0;
    if (Date.now() - last > 6 * 3600 * 1000) s.getRange(i + 1, 4).setValue(new Date());
    cput_(ck, { id: u.id, name: u.name, role: u.role, active: u.active }, 900);
    return { user: u, row: i + 1 };
  }
  fail_('Сессия завершена, войдите снова', 'auth');
}
function dropSessions_(id, exceptRow) {
  bumpSes_();
  const s = sesSheet_(), v = s.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][1]) === String(id) && i + 1 !== exceptRow) s.deleteRow(i + 1);
}
function need_(req, roles, fresh) { const se = session_(req.token, fresh); if (roles && roles.indexOf(se.user.role) < 0) fail_('Недостаточно прав', 'forbidden'); return se; }

/* ---------- API ---------- */
const API = {
  ping: function () { return { ok: true, time: new Date().toISOString() }; },

  login: function (req) {
    const id = String(req.id || '').replace(/\D/g, ''), pw = String(req.password || '');
    if (!id || !pw) fail_('Введите ID и пароль');
    const cache = CacheService.getScriptCache(), key = 'fail_' + id, fails = Number(cache.get(key) || 0);
    if (fails >= MAX_FAILS) { log_(id, '', '⛔ заблокирован (много попыток)', req.device); fail_('Слишком много попыток. Подождите ' + LOCK_MIN + ' минут или напишите руководителю.'); }
    const u = findUser_(id);
    if (!u || !u.active || hashPw_(u.salt, pw) !== u.hash) {
      cache.put(key, String(fails + 1), LOCK_MIN * 60);
      log_(id, u ? u.name : '', u && !u.active ? '❌ аккаунт отключён' : '❌ неверный пароль', req.device);
      fail_('Неверный ID или пароль');
    }
    cache.remove(key);
    log_(u.id, u.name, '✅ вход', req.device);
    return { ok: true, token: newSession_(u.id, req.device), user: pub_(u) };
  },

  me: function (req) { return { ok: true, user: pub_(need_(req).user) }; },

  logout: function (req) {
    try { const se = session_(req.token, true); bumpSes_(); sesSheet_().deleteRow(se.row); log_(se.user.id, se.user.name, '🚪 выход', ''); } catch (e) {}
    return { ok: true };
  },

  changePassword: function (req) {
    const se = need_(req, null, true), u = se.user, nw = String(req.newPassword || '');
    if (hashPw_(u.salt, String(req.oldPassword || '')) !== u.hash) fail_('Текущий пароль неверный');
    if (nw.length < 8) fail_('Новый пароль — минимум 8 символов');
    const salt = rnd_(16);
    accSheet_().getRange(u.row, 4, 1, 2).setValues([[salt, hashPw_(salt, nw)]]);
    accSheet_().getRange(u.row, 7).setValue(new Date());
    dropSessions_(u.id, se.row); bumpSes_(); // выходим на других устройствах, текущее оставляем
    return { ok: true };
  },

  adminUsers: function (req) {
    need_(req, ['admin']);
    const ses = sesSheet_().getDataRange().getValues().slice(1), cnt = {}, last = {};
    ses.forEach(function (r) { const k = String(r[1]); cnt[k] = (cnt[k] || 0) + 1; if (r[3] instanceof Date && (!last[k] || r[3] > last[k])) last[k] = r[3]; });
    return { ok: true, users: users_().map(function (u) { return { id: u.id, name: u.name, role: u.role, active: u.active, sessions: cnt[u.id] || 0, lastSeen: last[u.id] ? last[u.id].toISOString() : null }; }) };
  },

  adminResetPassword: function (req) {
    need_(req, ['admin']);
    const u = findUser_(req.id); if (!u) fail_('Нет такого сотрудника');
    const pw = genPw_(), salt = rnd_(16);
    accSheet_().getRange(u.row, 4, 1, 2).setValues([[salt, hashPw_(salt, pw)]]);
    accSheet_().getRange(u.row, 7).setValue(new Date());
    dropSessions_(u.id);
    return { ok: true, password: pw };
  },

  adminSetRole: function (req) {
    const se = need_(req, ['admin']);
    const u = findUser_(req.id); if (!u) fail_('Нет такого сотрудника');
    if (ROLES.indexOf(req.role) < 0) fail_('Неизвестная роль');
    if (u.id === se.user.id && req.role !== 'admin') fail_('Нельзя снять права админа с самой себя');
    accSheet_().getRange(u.row, 3).setValue(req.role); bumpSes_();
    return { ok: true };
  },

  adminSetActive: function (req) {
    const se = need_(req, ['admin']);
    const u = findUser_(req.id); if (!u) fail_('Нет такого сотрудника');
    if (u.id === se.user.id) fail_('Нельзя отключить себя');
    accSheet_().getRange(u.row, 6).setValue(!!req.active); bumpSes_();
    if (!req.active) dropSessions_(u.id);
    return { ok: true };
  },

  adminAddUser: function (req) {
    need_(req, ['admin']);
    const id = String(req.id || '').replace(/\D/g, ''), name = String(req.name || '').trim(), role = ROLES.indexOf(req.role) > -1 ? req.role : 'employee';
    if (!id || !name) fail_('Укажите ID и ФИО');
    if (findUser_(id)) fail_('Такой ID уже есть');
    const pw = genPw_(), salt = rnd_(16);
    accSheet_().appendRow([id, name, role, salt, hashPw_(salt, pw), true, new Date()]); bumpSes_();
    return { ok: true, password: pw };
  }
};


/* ================= ДАННЫЕ: смены, дисциплина, KPI, зарплата, премия ================= */
const MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
// планы для премии — как в калькуляторе премии на сайте (направление «чаты»)
const PLANS = { 1: { output: 100, rating: 3.5, ant: 7.5, ops: 0.95 }, 2: { output: 140, rating: 3.7, ant: 5.3, ops: 0.95 }, 3: { output: 180, rating: 4.15, ant: 3.8, ops: 0.95 } };
const NORM1 = { out: 100, csi: 3.5, aht: 7.5, ops: 95, ko: 90 }; // норма плана 1 — минимум для премии
const PAY_FROM = '2026-11';            // расчёт зарплаты в кабинете — с 1 ноября 2026
const SCHEDULE_ANCHOR = '2026-10-27';  // первая смена пары в графике 2/2 группы
const SHIFTS_IN_GPH = 15;              // сумма по ГПХ ÷ 15 = оплата за смену
const PAID_HOURS = 10.75;              // полная смена 21:00–09:00 минус разрешённые 75 мин перерыва

function num_(s) { if (s === null || s === undefined) return null; s = String(s).replace(/\s/g, '').replace('%', '').replace(',', '.'); if (s === '' || isNaN(Number(s))) return null; return Number(s); }
function pct_(s) { const n = num_(s); return n === null ? null : n / 100; }
function hm_(s) { const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/); return m ? Number(m[1]) + Number(m[2]) / 60 : null; }
function dkey_(d) { const m = String(d || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/); return m ? m[3] + '-' + m[2] + '-' + m[1] : null; }
function todayKey_() { return Utilities.formatDate(new Date(), 'Europe/Moscow', 'yyyy-MM-dd'); }

function monthSheets_() {
  const res = [];
  ss_().getSheets().forEach(function (s) {
    const m = s.getName().match(/^KPI\s+([а-яё]+)$/i); if (!m) return;
    const mi = MONTHS.indexOf(m[1].toLowerCase()); if (mi < 0) return;
    const yk = 'yr_' + s.getSheetId(); let year = cget_(yk);
    if (!year) { const n = Math.min(s.getLastRow(), 120); const v = n ? s.getRange(1, 1, n, 1).getDisplayValues() : [];
      for (let i = 0; i < v.length && !year; i++) { const k = dkey_(v[i][0]); if (k) year = Number(k.slice(0, 4)); }
      if (year) cput_(yk, year, 21600); }
    if (!year) year = new Date().getFullYear();
    res.push({ key: year + '-' + ('0' + (mi + 1)).slice(-2), name: s.getName(), title: m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() + ' ' + year, sheet: s, values: null });
  });
  const have = {}; res.forEach(function (m) { have[m.key] = true; });
  const now = todayKey_().slice(0, 7); let k = PAY_FROM;
  while (k <= now) { if (!have[k]) { const mi = Number(k.slice(5)) - 1; res.push({ key: k, name: '', title: MONTHS[mi].charAt(0).toUpperCase() + MONTHS[mi].slice(1) + ' ' + k.slice(0, 4), values: [] }); } k = nextMonth_(k); }
  res.sort(function (a, b) { return a.key < b.key ? -1 : 1; });
  return res.filter(function (m) { return m.key >= PAY_FROM; });
}
function nextMonth_(k) { let y = Number(k.slice(0, 4)), m = Number(k.slice(5)) + 1; if (m > 12) { m = 1; y++; } return y + '-' + ('0' + m).slice(-2); }
// график 2/2 всей группы: смены в даты, кратные циклу 4 дня от опорной даты (27.10.2026 — первая смена пары)
function scheduleDates_(monthKey) {
  const a = new Date(SCHEDULE_ANCHOR + 'T12:00:00Z'), res = [];
  let d = new Date(monthKey + '-01T12:00:00Z');
  while (Utilities.formatDate(d, 'UTC', 'yyyy-MM') === monthKey) {
    const diff = Math.round((d - a) / 86400000), r = ((diff % 4) + 4) % 4;
    if (r === 0 || r === 1) res.push(Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd'));
    d = new Date(d.getTime() + 86400000);
  }
  return res;
}
function pickMonth_(list, key) {
  if (!list.length) fail_('В таблице нет листов KPI');
  if (key) { const f = list.filter(function (m) { return m.key === key; })[0]; if (f) return f; }
  const now = todayKey_().slice(0, 7), cur = list.filter(function (m) { return m.key === now; })[0];
  return cur || list[list.length - 1];
}
function block_(v, label) { // строки после заголовка «ID» под меткой label
  let i = 0; while (i < v.length && String(v[i][0]).trim().indexOf(label) !== 0) i++;
  if (i >= v.length) return [];
  while (i < v.length && String(v[i][0]).trim() !== 'ID') i++;
  const out = [];
  for (i = i + 1; i < v.length; i++) { const id = String(v[i][0]).trim(); if (!/^\d{5,9}$/.test(id)) break; out.push(v[i]); }
  return out;
}
function parseKpi_(m) {
  const ck = 'kpi_' + m.key, c = cget_(ck); if (c) return c;
  const r = parseKpi0_(m); cput_(ck, r, 600); return r;
}
function parseKpi0_(m) {
  const v = m.values || (m.sheet ? m.sheet.getDataRange().getDisplayValues() : []), sum = {}, bonus = {}, shifts = {};
  block_(v, 'ИТОГ ЗА ПЕРИОД').forEach(function (r) {
    sum[String(r[0]).trim()] = { name: String(r[1]).trim(), kpiShifts: num_(r[2]), k: { out: pct_(r[3]), csi: pct_(r[4]), aht: pct_(r[5]), ops: pct_(r[6]), ko: pct_(r[7]) }, kpi: pct_(r[8]),
      worked: num_(r[9]), clean: num_(r[10]), viol: num_(r[11]), disc: pct_(r[12]), overBreak: num_(r[13]), edgeBreak: num_(r[14]), early: num_(r[15]) };
  });
  block_(v, 'ДЛЯ КАЛЬКУЛЯТОРА ПРЕМИИ').forEach(function (r) {
    bonus[String(r[0]).trim()] = { stage: String(r[2]).trim(), out: num_(r[3]), csi: num_(r[4]), aht: num_(r[5]), ops: num_(r[6]), ko: num_(r[7]), status: String(r[8]).trim() };
  });
  let i = 0; while (i < v.length && String(v[i][0]).trim() !== 'Дата') i++;
  for (i = i + 1; i < v.length; i++) {
    const d = dkey_(v[i][0]), id = String(v[i][1]).trim(); if (!d || !id) continue;
    (shifts[id] = shifts[id] || []).push({ date: v[i][0], plan: String(v[i][3]).trim(), out: num_(v[i][4]), csi: num_(v[i][5]), aht: num_(v[i][6]), ops: num_(v[i][7]), ko: num_(v[i][8]), kpi: pct_(v[i][14]) });
  }
  return { sum: sum, bonus: bonus, shifts: shifts };
}
function discValues_() { return memo_('disc', function () { const s = ss_().getSheetByName(DISC); return s ? { sheet: s, v: s.getDataRange().getDisplayValues() } : null; }); }
function parseDisc_(monthKey) {
  const ck = 'disc_' + monthKey, c = cget_(ck); if (c) return c;
  const r = parseDisc0_(monthKey); cput_(ck, r, 300); return r;
}
function parseDisc0_(monthKey) {
  const D = discValues_(); if (!D) return {};
  const v = D.v, res = {}, today = todayKey_(); let date = null;
  for (let i = 0; i < v.length; i++) {
    const a = String(v[i][0]).trim(), k = dkey_(a);
    if (k && String(v[i][1]).indexOf('Смена') === 0) { date = k; continue; }
    if (!date || !/^\d{5,9}$/.test(a) || date.slice(0, 7) !== monthKey) continue;
    const came = String(v[i][2]).trim(), left = String(v[i][3]).trim(), status = String(v[i][7]).trim(), comment = String(v[i][19] || '').trim();
    const breaks = []; for (let c = 8; c <= 17; c += 2) if (v[i][c] && v[i][c + 1]) breaks.push(v[i][c] + '–' + v[i][c + 1]);
    let kind;
    if (came) kind = /^✅/.test(status) ? 'ok' : 'viol';
    else if (date >= today) kind = 'future';
    else kind = comment ? 'absent_reason' : 'absent';
    (res[a] = res[a] || []).push({ date: date.split('-').reverse().join('.'), came: came, left: left, breakMin: num_(v[i][4]), leftMin: num_(v[i][5]), worked: String(v[i][6]).trim(), hours: hm_(v[i][6]), status: status, breaks: breaks, edge: String(v[i][18]).trim(), comment: comment, kind: kind });
  }
  return res;
}
function stageOf_(stageText) { const m = String(stageText || '').match(/(\d+)/); const n = m ? Number(m[1]) : 1; return Math.min(3, Math.max(1, n)); }
function premium_(b, salary) {
  if (!b || /Наставник/i.test(b.stage) || b.out === null) return null;
  const E = 1e-9, P = PLANS[stageOf_(b.stage)];
  function sOut(x) { if (!(x > 0)) return 0; if (x < 0.9 - E) return 0; if (x > 1.1 + E) return 1.2; return Math.min(1.2, Math.max(0, x)); }
  function sRat(x) { if (!(x > 0)) return 0; if (x < 0.9 - E) return 0; if (x < 1 - E) return x; if (x <= 1 + E) return 1; if (x <= 1.05 + E) return 1.1; return 1.2; }
  function sAnt(x) { if (!(x > 0)) return 0; if (x < 0.9 - E) return 0; if (x > 1.1 + E) return 1.1; return Math.min(1.1, Math.max(0, x)); }
  function sOps(x) { if (!(x > 0)) return 0; if (x < 0.9 - E) return 0; if (x < 1 - E) return x; return 1; }
  function sKo(sh) { if (sh === null) return 1.05; if (sh < 0.7 - E) return 0; if (sh < 1 - E) return sh; return 1.05; }
  const parts = { out: sOut((b.out || 0) / P.output), csi: sRat((b.csi || 0) / P.rating), aht: b.aht > 0 ? sAnt(P.ant / b.aht) : 0, ops: sOps(((b.ops || 0) / 100) / P.ops) };
  const coef = (0.30 * parts.out + 0.35 * parts.csi + 0.20 * parts.aht + 0.15 * parts.ops) * sKo(b.ko === null ? null : b.ko / 100);
  return { stage: stageOf_(b.stage), plan: P, parts: parts, coef: coef, amount: salary ? Math.round(salary * 0.15 * coef) : null };
}
function salaryOf_(id) { const map = memo_('pay', function () { const c = cget_('pay'); if (c) return c; const v = paySheet_().getDataRange().getValues(), o = {}; for (let i = 1; i < v.length; i++) o[String(v[i][0])] = Number(v[i][1]) || null; cput_('pay', o, 600); return o; }); return map[String(id)] || null; }
function tips_(b, s, disc) {
  const t = [];
  if (b && !/Наставник/i.test(b.stage) && b.out !== null) {
    if (b.out < NORM1.out) t.push(['📈', 'Выработка', 'В среднем ' + b.out + ' чатов за смену при норме ' + NORM1.out + '. Держите 2–3 диалога параллельно, берите следующий чат сразу после ответа, готовые ответы — в «Шаблонах».']);
    if (b.csi !== null && b.csi < NORM1.csi) t.push(['⭐', 'Рейтинг CSI', 'Средняя оценка ' + b.csi + ' при норме ' + NORM1.csi + '. Используйте генератор эмпатии: присоединение к эмоции, фактура из БЗ и запрос оценки, когда вопрос решён.']);
    if (b.aht !== null && b.aht > NORM1.aht) t.push(['⏱', 'АХТ', 'Среднее время ответа ' + b.aht + ' при норме не выше ' + NORM1.aht + '. Ищите ответ через поиск по шаблонам, не держите паузы — отправляйте промежуточный ответ.']);
    if (b.ops !== null && b.ops < NORM1.ops) t.push(['🏷', '% операций', 'Отмечено ' + b.ops + '% операций при норме ' + NORM1.ops + '%. Регистрируйте операцию после каждого обращения — список актуальных операций на странице «Работа».']);
    if (b.ko !== null && b.ko < NORM1.ko) t.push(['⚠️', 'Критические ошибки', 'КО ' + b.ko + '% при норме ' + NORM1.ko + '%. Перед передачей СВ — к наставнику, сверяйтесь с форматами передачи.']);
  }
  if (s) {
    if (s.overBreak > 0) t.push(['☕', 'Перерывы', 'Перебор перерыва — ' + s.overBreak + ' раз(а). Суммарно не более 75 минут за смену, включая обед.']);
    if (s.edgeBreak > 0) t.push(['🕘', 'Перерыв в 1-й/последний час', s.edgeBreak + ' раз(а). В первый и последний час смены перерывы брать нельзя.']);
    if (s.early > 0) t.push(['🚪', 'Ранний уход', s.early + ' раз(а). Если ушли из-за неполадки — напишите в чат, во сколько и почему, и приложите подтверждение.']);
  }
  const abs = (disc || []).filter(function (d) { return d.kind === 'absent'; }).length;
  if (abs) t.push(['📅', 'Нет отметки о приходе', abs + ' смен(ы) без отметки. Если это отпуск или согласованный выходной — сообщите руководителю.']);
  if (!t.length) t.push(['🎉', 'Отлично', 'Все показатели в норме плана 1 — так держать!']);
  return t;
}
function personal_(id, m, kpi, disc) {
  const s = kpi.sum[id] || null, b = kpi.bonus[id] || null, d = disc[id] || [], sal = salaryOf_(id), today = todayKey_();
  const perShift = sal ? sal / SHIFTS_IN_GPH : null, perHour = perShift ? perShift / PAID_HOURS : null;
  // все смены месяца: по графику 2/2 + строки из «Дисциплины»
  const byDate = {}; d.forEach(function (x) { byDate[x.date.split('.').reverse().join('-')] = x; });
  const who = findUser_(id), auto = !!(who && who.role === 'admin'); // руководителю все смены по графику засчитываются автоматически
  if (auto) { Object.keys(byDate).forEach(function (k) { delete byDate[k]; });
    scheduleDates_(m.key).forEach(function (k) { if (k < today) byDate[k] = { date: k.split('-').reverse().join('.'), came: '21:00', left: '09:00', breakMin: null, leftMin: null, worked: '12:00', hours: 12, status: '✅ засчитано автоматически', breaks: [], edge: '', comment: '', kind: 'ok', auto: true }; }); }
  const keys = {}; scheduleDates_(m.key).forEach(function (k) { keys[k] = 1; }); Object.keys(byDate).forEach(function (k) { keys[k] = 1; });
  const shifts = Object.keys(keys).sort().map(function (k) {
    const x = byDate[k] || { date: k.split('-').reverse().join('.'), came: '', left: '', breakMin: null, leftMin: null, worked: '', hours: null, status: '', breaks: [], edge: '', comment: '', kind: k >= today ? 'future' : 'absent', noRow: true };
    let pay = null, lost = 0;
    if (perShift) {
      if (x.kind === 'ok') pay = perShift;
      else if (x.kind === 'viol') { lost = Math.max(0, PAID_HOURS - (x.hours || 0)); pay = Math.max(0, perShift - lost * perHour); }
      else if (x.kind === 'future') pay = null; else pay = 0;
    } else if (x.kind === 'viol') lost = Math.max(0, PAID_HOURS - (x.hours || 0));
    return Object.assign({}, x, { pay: pay === null ? null : Math.round(pay), payExact: pay, lostHours: Math.round(lost * 100) / 100, scheduled: !!keys[k] && scheduleDates_(m.key).indexOf(k) > -1 });
  });
  const past = shifts.filter(function (x) { return x.kind !== 'future'; }), fut = shifts.filter(function (x) { return x.kind === 'future'; });
  const hours = past.reduce(function (a, x) { return a + (x.hours || 0); }, 0);
  const worked = past.filter(function (x) { return x.came; }).length;
  const earned = perShift ? past.reduce(function (a, x) { return a + (x.payExact || 0); }, 0) : null;
  const lostH = past.reduce(function (a, x) { return a + (x.lostHours || 0); }, 0);
  const prem = premium_(b, sal);
  return {
    summary: s, bonus: b, kpiShifts: kpi.shifts[id] || [], discipline: shifts,
    stats: { planned: shifts.length, past: past.length, worked: worked, hours: Math.round(hours * 10) / 10, ok: past.filter(function (x) { return x.kind === 'ok'; }).length,
      viol: past.filter(function (x) { return x.kind === 'viol'; }).length, absent: past.filter(function (x) { return x.kind === 'absent'; }).length,
      absentReason: past.filter(function (x) { return x.kind === 'absent_reason'; }).length, future: fut.length, lostHours: Math.round(lostH * 100) / 100 },
    pay: { salary: sal, perShift: perShift ? Math.round(perShift * 100) / 100 : null, perHour: perHour ? Math.round(perHour * 100) / 100 : null, paidHours: PAID_HOURS,
      shifts: worked, base: earned === null ? null : Math.round(earned), deduct: perShift ? Math.round(lostH * perHour) : null,
      projected: earned === null ? null : Math.round(earned + fut.length * perShift) },
    premium: prem, tips: auto ? [['👑', 'Руководитель', 'Все смены по графику засчитываются автоматически — отмечаться не нужно.']] : tips_(b, s, shifts), auto: auto
  };
}
function monthsPub_(list) { return list.map(function (m) { return { key: m.key, title: m.title }; }); }

Object.assign(API, {
  myData: function (req) {
    const u = need_(req).user, list = monthSheets_(), m = pickMonth_(list, req.month);
    const kpi = parseKpi_(m), disc = parseDisc_(m.key);
    return { ok: true, months: monthsPub_(list), month: m.key, monthTitle: m.title, data: personal_(u.id, m, kpi, disc), norm: NORM1 };
  },
  setSalary: function (req) {
    const u = need_(req).user, a = Number(String(req.amount || '').replace(/\s/g, '').replace(',', '.'));
    if (!(a > 0) || a > 1000000) fail_('Введите сумму по ГПХ числом');
    const s = paySheet_(), v = s.getDataRange().getValues();
    cdel_('pay');
    for (let i = 1; i < v.length; i++) if (String(v[i][0]) === u.id) { s.getRange(i + 1, 2, 1, 2).setValues([[a, new Date()]]); return { ok: true }; }
    s.appendRow([u.id, a, new Date()]); return { ok: true };
  },
  groupData: function (req) {
    need_(req, ['admin']);
    const list = monthSheets_(), m = pickMonth_(list, req.month), kpi = parseKpi_(m), disc = parseDisc_(m.key);
    const ids = {}; users_().forEach(function (u) { if (u.role !== 'admin') ids[u.id] = u.name; });
    Object.keys(kpi.sum).forEach(function (id) { if (!ids[id]) ids[id] = kpi.sum[id].name; });
    const rows = Object.keys(ids).map(function (id) { const p = personal_(id, m, kpi, disc); return { id: id, name: ids[id], stats: p.stats, summary: p.summary, bonus: p.bonus, pay: p.pay, premium: p.premium ? { coef: p.premium.coef, amount: p.premium.amount } : null, tips: p.tips.map(function (t) { return t[1]; }) }; });
    return { ok: true, months: monthsPub_(list), month: m.key, monthTitle: m.title, rows: rows };
  },
  logins: function (req) {
    need_(req, ['admin']);
    const v = logSheet_().getDataRange().getValues().slice(1).reverse().slice(0, Number(req.limit) || 300);
    const names = {}; users_().forEach(function (u) { names[u.id] = u.name; });
    const ses = sesSheet_().getDataRange().getValues().slice(1).map(function (r) { return { id: String(r[1]), name: names[String(r[1])] || '', created: r[2] instanceof Date ? r[2].toISOString() : null, last: r[3] instanceof Date ? r[3].toISOString() : null, device: r[4] }; });
    return { ok: true, log: v.map(function (r) { return { time: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), id: String(r[1]), name: r[2] || names[String(r[1])] || '', event: r[3], device: r[4] }; }), sessions: ses };
  }
});

/* ================= ОТМЕТКИ СМЕНЫ: пришёл / перерыв / вернулся / ушёл ================= */
const MARKS = '_отметки';
const SHIFT = { start: '21:00', end: '09:00', openFrom: '20:30', closeAt: '09:30', breakLimit: 75, maxOnBreak: 3 };
function marksSheet_() { return sheet_(MARKS, ['Время', 'ID', 'ФИО', 'Действие', 'Записано', 'Смена', 'Примечание']); }
function nowMsk_() { const d = new Date(); return { date: Utilities.formatDate(d, 'Europe/Moscow', 'yyyy-MM-dd'), hm: Utilities.formatDate(d, 'Europe/Moscow', 'HH:mm'), raw: d }; }
function mins_(hm) { const m = String(hm || '').match(/(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function shiftNow_() { // смена 21:00–09:00 относится к дате начала
  const n = nowMsk_(), t = mins_(n.hm); let date = n.date;
  if (t < 12 * 60) { const d = new Date(n.raw.getTime() - 24 * 3600 * 1000); date = Utilities.formatDate(d, 'Europe/Moscow', 'yyyy-MM-dd'); }
  const open = t >= mins_(SHIFT.openFrom) || t <= mins_(SHIFT.closeAt);
  return { date: date, label: date.split('-').reverse().join('.'), hm: n.hm, t: t, open: open };
}
// минуты от начала смены (21:00 = 0), чтобы сравнивать время через полночь
function rel_(hm) { const m = mins_(hm); if (m === null) return null; return m >= 12 * 60 ? m - 21 * 60 : m + 3 * 60; }
function findShiftRow_(id, label) {
  const D = discValues_(); if (!D) fail_('Нет листа «Дисциплина»');
  const s = D.sheet, v = D.v;
  for (let i = 0; i < v.length; i++) {
    if (String(v[i][0]).trim() !== label || String(v[i][1]).indexOf('Смена') !== 0) continue;
    let h = i + 1; while (h < v.length && String(v[h][0]).trim() !== 'Сотрудник') h++;
    if (h >= v.length) break;
    const col = {}; v[h].forEach(function (name, j) { col[String(name).trim()] = j + 1; });
    for (let r = h + 1; r < v.length; r++) {
      const a = String(v[r][0]).trim();
      if (dkey_(a)) break;
      if (a === String(id)) return { sheet: s, row: r + 1, col: col, values: v[r] };
    }
    return { missing: 'row' };
  }
  return { missing: 'block' };
}
function shiftState_(f) {
  const g = function (name) { const c = f.col[name]; return c ? String(f.values[c - 1] || '').trim() : ''; };
  const breaks = [];
  for (let k = 1; k <= 5; k++) { const a = g('Пер.' + k + ' начало'), b = g('Пер.' + k + ' конец'); if (a) breaks.push({ n: k, from: a, to: b }); }
  let used = 0; breaks.forEach(function (b) { if (b.to) { let d = rel_(b.to) - rel_(b.from); if (d < 0) d += 1440; used += d; } });
  const open = breaks.filter(function (b) { return !b.to; })[0] || null;
  return { came: g('Пришёл'), left: g('Ушёл'), breaks: breaks, onBreak: !!open, openBreak: open, usedMin: used, status: g('Статус') };
}

function breakBoard_(label) { // кто сейчас на перерыве в смене label
  const D = discValues_(); if (!D) return [];
  const v = D.v, res = [];
  for (let i = 0; i < v.length; i++) {
    if (String(v[i][0]).trim() !== label || String(v[i][1]).indexOf('Смена') !== 0) continue;
    let h = i + 1; while (h < v.length && String(v[h][0]).trim() !== 'Сотрудник') h++;
    if (h >= v.length) break;
    const col = {}; v[h].forEach(function (n, j) { col[String(n).trim()] = j; });
    for (let r = h + 1; r < v.length; r++) {
      const a = String(v[r][0]).trim(); if (dkey_(a)) break; if (!/^\d{5,9}$/.test(a)) continue;
      if (v[r][col['Ушёл']]) continue;
      for (let k = 5; k >= 1; k--) { const from = v[r][col['Пер.' + k + ' начало']], to = v[r][col['Пер.' + k + ' конец']]; if (from) { if (!to) res.push({ id: a, name: String(v[r][1]).trim(), from: from }); break; } }
    }
    break;
  }
  return res;
}
function markLog_(u, action, written, shift, note) { try { marksSheet_().appendRow([new Date(), u.id, u.name, action, written, shift, note || '']); } catch (e) {} }

Object.assign(API, {
  shiftState: function (req) {
    const u = need_(req).user, sh = shiftNow_(), f = findShiftRow_(u.id, sh.label);
    const base = { ok: true, shift: sh.label, now: sh.hm, windowOpen: sh.open, limit: SHIFT.breakLimit, board: breakBoard_(sh.label), maxOnBreak: SHIFT.maxOnBreak };
    if (f.missing) return Object.assign(base, { scheduled: false });
    return Object.assign(base, { scheduled: true, state: shiftState_(f) });
  },
  mark: function (req) {
    const u = need_(req).user, sh = shiftNow_(), type = String(req.type || '');
    if (!sh.open) fail_('Отмечаться можно только во время смены: с ' + SHIFT.openFrom + ' до ' + SHIFT.closeAt + ' по Москве.');
    const f = findShiftRow_(u.id, sh.label);
    if (f.missing) { markLog_(u, type, sh.hm, sh.label, 'нет в графике'); fail_('На смену ' + sh.label + ' вас нет в листе «Дисциплина». Отметка сохранена в журнал — напишите руководителю.'); }
    const st = shiftState_(f), set = function (name, val) { const c = f.col[name]; if (!c) fail_('В листе нет столбца «' + name + '»'); f.sheet.getRange(f.row, c).setValue(val); };
    const r = rel_(sh.hm); let written = sh.hm, note = '';
    if (type === 'start') {
      if (st.came) fail_('Приход уже отмечен в ' + st.came);
      if (r < 0) { written = SHIFT.start; note = 'пришёл раньше — засчитано ' + SHIFT.start; }
      set('Пришёл', written);
    } else if (type === 'break') {
      if (!st.came) fail_('Сначала отметьте «Вышел на смену»');
      if (st.left) fail_('Смена уже завершена');
      if (st.onBreak) fail_('Вы уже на перерыве с ' + st.openBreak.from);
      if (r < 60) fail_('В первый час смены (21:00–22:00) перерыв брать нельзя. Перерыв можно с 22:00.');
      if (r >= 11 * 60) fail_('В последний час смены (08:00–09:00) перерыв брать нельзя.');
      if (st.breaks.length >= 5) fail_('В таблице место только для 5 перерывов. Напишите руководителю.');
      const bb = breakBoard_(sh.label).filter(function (x) { return x.id !== u.id; });
      if (bb.length >= SHIFT.maxOnBreak) fail_('Сейчас на перерыве ' + bb.length + ' человека: ' + bb.map(function (x) { return x.name.split(' ').slice(0, 2).join(' '); }).join(', ') + '. Дождитесь, пока кто-то вернётся.');
      const k = st.breaks.length + 1; set('Пер.' + k + ' начало', written);
    } else if (type === 'back') {
      if (!st.onBreak) fail_('Сейчас вы не на перерыве');
      set('Пер.' + st.openBreak.n + ' конец', written);
    } else if (type === 'end') {
      if (!st.came) fail_('Сначала отметьте «Вышел на смену»');
      if (st.left) fail_('Уход уже отмечен в ' + st.left);
      if (r < 0) fail_('Смена ещё не началась');
      if (r > 12 * 60) { written = SHIFT.end; note = 'ушёл позже — засчитано ' + SHIFT.end; }
      if (st.onBreak) set('Пер.' + st.openBreak.n + ' конец', written);
      set('Ушёл', written);
      if (r < 12 * 60 && r >= 0) note = note || 'ушёл раньше окончания смены';
    } else fail_('Неизвестная отметка');
    markLog_(u, type, written, sh.label, note);
    SpreadsheetApp.flush(); dropDisc_();
    const f2 = findShiftRow_(u.id, sh.label);
    return { ok: true, written: written, note: note, state: shiftState_(f2), shift: sh.label, limit: SHIFT.breakLimit, board: breakBoard_(sh.label), maxOnBreak: SHIFT.maxOnBreak, now: sh.hm, windowOpen: true, scheduled: true };
  },
  marksLog: function (req) {
    need_(req, ['admin']);
    const v = marksSheet_().getDataRange().getValues().slice(1).reverse().slice(0, 300);
    return { ok: true, log: v.map(function (r) { return { time: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), id: String(r[1]), name: r[2], action: r[3], written: r[4], shift: r[5], note: r[6] }; }) };
  }
});

/* ================= ТЕСТИРОВАНИЕ (лист «Тесты»): те же кнопки, в любое время ================= */
const TESTS = 'Тесты';
const TCOLS = ['Дата теста', 'ID', 'ФИО', 'Пришёл', 'Ушёл', 'Пер.1 начало', 'Пер.1 конец', 'Пер.2 начало', 'Пер.2 конец', 'Пер.3 начало', 'Пер.3 конец', 'Пер.4 начало', 'Пер.4 конец', 'Пер.5 начало', 'Пер.5 конец', 'Перерыв, мин', 'Обновлено'];
function testsSheet_() { const ss = ss_(); let s = ss.getSheetByName(TESTS); if (!s) { s = ss.insertSheet(TESTS); s.getRange(1, 1, 1000, TCOLS.length).setNumberFormat('@'); s.appendRow(TCOLS); s.setFrozenRows(1); } return s; }
function testRow_(u, create) {
  const s = testsSheet_(), v = s.getDataRange().getDisplayValues(), today = nowMsk_().date.split('-').reverse().join('.');
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][0]) === today && String(v[i][1]) === u.id) return { sheet: s, row: i + 1, values: v[i], today: today };
  if (!create) return { today: today };
  s.appendRow([today, u.id, u.name]);
  return { sheet: s, row: s.getLastRow(), values: [today, u.id, u.name].concat(TCOLS.slice(3).map(function () { return ''; })), today: today };
}
function testState_(t) {
  if (!t.sheet) return { came: '', left: '', breaks: [], onBreak: false, openBreak: null, usedMin: 0 };
  const g = function (n) { return String(t.values[TCOLS.indexOf(n)] || '').trim(); }, breaks = [];
  for (let k = 1; k <= 5; k++) { const a = g('Пер.' + k + ' начало'), b = g('Пер.' + k + ' конец'); if (a) breaks.push({ n: k, from: a, to: b }); }
  let used = 0; breaks.forEach(function (b) { if (b.to) { let d = mins_(b.to) - mins_(b.from); if (d < 0) d += 1440; used += d; } });
  const open = breaks.filter(function (b) { return !b.to; })[0] || null;
  return { came: g('Пришёл'), left: g('Ушёл'), breaks: breaks, onBreak: !!open, openBreak: open, usedMin: used };
}
function testBoard_() {
  const s = testsSheet_(), v = s.getDataRange().getDisplayValues(), today = nowMsk_().date.split('-').reverse().join('.'), res = [];
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][0]) !== today || v[i][4]) continue;
    for (let k = 5; k >= 1; k--) { const from = v[i][TCOLS.indexOf('Пер.' + k + ' начало')], to = v[i][TCOLS.indexOf('Пер.' + k + ' конец')]; if (from) { if (!to) res.push({ id: String(v[i][1]), name: String(v[i][2]), from: from }); break; } }
  }
  return res;
}
Object.assign(API, {
  breakBoard: function (req) { need_(req); const sh = shiftNow_(); return { ok: true, shift: sh.label, board: breakBoard_(sh.label), maxOnBreak: SHIFT.maxOnBreak }; },
  testState: function (req) {
    const u = need_(req, ['editor', 'admin']).user, t = testRow_(u, false), n = nowMsk_();
    return { ok: true, test: true, shift: t.today + ' (тест)', now: n.hm, windowOpen: true, scheduled: true, limit: SHIFT.breakLimit, maxOnBreak: SHIFT.maxOnBreak, state: testState_(t), board: testBoard_() };
  },
  testMark: function (req) {
    const u = need_(req, ['editor', 'admin']).user, type = String(req.type || ''), n = nowMsk_();
    const t = testRow_(u, true), st = testState_(t);
    const set = function (name, val) { t.sheet.getRange(t.row, TCOLS.indexOf(name) + 1).setValue(val); };
    const real = shiftNow_(), r = rel_(n.hm); let note = '';
    if (type === 'start') { if (st.came) fail_('Приход уже отмечен в ' + st.came); set('Пришёл', n.hm); if (r < 0 && real.open) note = 'в реальной смене засчиталось бы 21:00'; else if (!real.open) note = 'вне окна 20:30–09:30 — в реальной смене кнопка была бы неактивна'; }
    else if (type === 'break') {
      if (!st.came) fail_('Сначала отметьте «Вышел на смену»'); if (st.left) fail_('Тестовая смена уже завершена'); if (st.onBreak) fail_('Вы уже на перерыве с ' + st.openBreak.from);
      if (st.breaks.length >= 5) fail_('Не больше 5 перерывов');
      const bb = testBoard_().filter(function (x) { return x.id !== u.id; });
      if (bb.length >= SHIFT.maxOnBreak) fail_('Сейчас на тестовом перерыве ' + bb.length + ' человека. Дождитесь, пока кто-то вернётся.');
      set('Пер.' + (st.breaks.length + 1) + ' начало', n.hm);
    } else if (type === 'back') { if (!st.onBreak) fail_('Сейчас вы не на перерыве'); set('Пер.' + st.openBreak.n + ' конец', n.hm); }
    else if (type === 'end') { if (!st.came) fail_('Сначала отметьте «Вышел на смену»'); if (st.left) fail_('Уход уже отмечен в ' + st.left); if (st.onBreak) set('Пер.' + st.openBreak.n + ' конец', n.hm); set('Ушёл', n.hm); }
    else fail_('Неизвестная отметка');
    SpreadsheetApp.flush();
    const t2 = testRow_(u, false), st2 = testState_(t2);
    t2.sheet.getRange(t2.row, TCOLS.indexOf('Перерыв, мин') + 1, 1, 2).setValues([[st2.usedMin, new Date()]]);
    return { ok: true, test: true, written: n.hm, note: note, shift: t2.today + ' (тест)', now: n.hm, windowOpen: true, scheduled: true, limit: SHIFT.breakLimit, maxOnBreak: SHIFT.maxOnBreak, state: st2, board: testBoard_() };
  },
  testReset: function (req) {
    const u = need_(req, ['editor', 'admin']).user, t = testRow_(u, false);
    if (t.sheet) t.sheet.deleteRow(t.row);
    return { ok: true };
  }
});

/* ================= МАТЕРИАЛЫ РЕДАКТОРОВ (лист «_контент») ================= */
const CONTENT = '_контент';
const FILES_FOLDER = 'Портал Группы 11 — файлы статей';
function filesFolder_() {
  const pr = PropertiesService.getScriptProperties(), id = pr.getProperty('filesFolder');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const it = DriveApp.getFoldersByName(FILES_FOLDER), f = it.hasNext() ? it.next() : DriveApp.createFolder(FILES_FOLDER);
  pr.setProperty('filesFolder', f.getId()); return f;
}
// ▶ запустить один раз из редактора: Google попросит разрешить доступ к Диску, создаст папку для файлов статей
function setupFiles() { const f = filesFolder_(); Logger.log('Папка для файлов: ' + f.getName() + ' — ' + f.getUrl()); }
const CCOLS = ['ID', 'Тип', 'Раздел', 'Заголовок', 'Текст', 'Ссылка', 'Автор', 'Обновлено', 'Активен'];
function contentSheet_() { return sheet_(CONTENT, CCOLS); }
function contentAll_() {
  const v = contentSheet_().getDataRange().getValues(), res = [];
  for (let i = 1; i < v.length; i++) if (v[i][0]) res.push({ row: i + 1, id: String(v[i][0]), type: v[i][1], section: v[i][2], title: v[i][3], text: v[i][4], url: v[i][5], author: v[i][6], updated: v[i][7] instanceof Date ? v[i][7].toISOString() : String(v[i][7] || ''), active: v[i][8] !== false });
  return res;
}
function cpub_(x) { return { id: x.id, type: x.type, section: x.section, title: x.title, text: x.text, url: x.url, author: x.author, updated: x.updated }; }
Object.assign(API, {
  content: function () { // публично: материалы видны всем, даже без входа
    const cache = CacheService.getScriptCache(), hit = cache.get('content_v1');
    if (hit) return JSON.parse(hit);
    const res = { ok: true, items: contentAll_().filter(function (x) { return x.active; }).map(cpub_) };
    try { cache.put('content_v1', JSON.stringify(res), 300); } catch (e) {}
    return res;
  },
  contentSave: function (req) {
    const u = need_(req, ['editor', 'admin']).user, it = req.item || {};
    const type = ['template', 'link', 'news', 'article'].indexOf(it.type) > -1 ? it.type : fail_('Выберите тип');
    const title = String(it.title || '').trim().slice(0, 200), text = String(it.text || '').trim().slice(0, it.type === 'article' ? 45000 : 20000), url = String(it.url || '').trim().slice(0, 500), section = String(it.section || '').trim().slice(0, 40);
    if (!title) fail_('Укажите заголовок');
    if (type === 'template' && !text) fail_('Вставьте текст шаблона');
    if (type === 'article' && !text) fail_('Напишите текст статьи');
    if (type === 'link' && !/^https?:\/\//.test(url)) fail_('Ссылка должна начинаться с http:// или https://');
    const s = contentSheet_(), row = [null, type, section, title, text, url, u.name, new Date(), true];
    if (it.id) { const ex = contentAll_().filter(function (x) { return x.id === String(it.id); })[0]; if (!ex) fail_('Материал не найден'); row[0] = ex.id; s.getRange(ex.row, 1, 1, CCOLS.length).setValues([row]); }
    else { row[0] = 'c' + Date.now().toString(36); s.appendRow(row); }
    CacheService.getScriptCache().remove('content_v1');
    return { ok: true, id: row[0] };
  },
  contentDelete: function (req) {
    need_(req, ['editor', 'admin']);
    const ex = contentAll_().filter(function (x) { return x.id === String(req.id); })[0]; if (!ex) fail_('Материал не найден');
    contentSheet_().getRange(ex.row, 9).setValue(false);
    CacheService.getScriptCache().remove('content_v1');
    return { ok: true };
  },
  upload: function (req) { // фото / видео / файл для статей → папка на Google Диске, доступ по ссылке
    const u = need_(req, ['editor', 'admin']).user;
    const name = String(req.name || 'файл').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120), mime = String(req.mime || 'application/octet-stream').slice(0, 100), data = String(req.data || '');
    if (!data) fail_('Пустой файл');
    if (data.length > 36 * 1024 * 1024) fail_('Файл больше 25 МБ — загрузите его на Google Диск сами и вставьте ссылкой');
    const blob = Utilities.newBlob(Utilities.base64Decode(data), mime, name);
    const f = filesFolder_().createFile(blob);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    f.setDescription('Загрузил(а): ' + u.name + ' · ' + new Date().toLocaleString('ru-RU'));
    return { ok: true, id: f.getId(), name: name, mime: mime, size: f.getSize() };
  },
  contentMine: function (req) { need_(req, ['editor', 'admin']); return { ok: true, items: contentAll_().filter(function (x) { return x.active; }).map(cpub_) }; }
});

/* ---------- очистка журнала входов: всё, кроме руководителя ---------- */
function clearLogins_(keepAdmin) {
  const admins = {}; users_().forEach(function (u) { if (u.role === 'admin') admins[u.id] = true; });
  const L = logSheet_(), v = L.getDataRange().getValues(); let n = 0;
  for (let i = v.length - 1; i >= 1; i--) if (!keepAdmin || !admins[String(v[i][1])]) { L.deleteRow(i + 1); n++; }
  bumpSes_(); const S = sesSheet_(), sv = S.getDataRange().getValues(); let s = 0;
  for (let i = sv.length - 1; i >= 1; i--) if (!admins[String(sv[i][1])]) { S.deleteRow(i + 1); s++; }
  return { log: n, sessions: s };
}
// ▶ запустить из редактора: удаляет тестовые входы сотрудников и наставников (вход руководителя остаётся)
function clearTestLogins() { const r = clearLogins_(true); Logger.log('Удалено записей журнала: ' + r.log + ', активных входов: ' + r.sessions); }
Object.assign(API, {
  adminRefresh: function (req) { // сбросить кэш, если таблицу правили вручную
    need_(req, ['admin']); const keys = ['pay']; monthSheets_().forEach(function (m) { keys.push('kpi_' + m.key, 'disc_' + m.key); });
    cache_().removeAll(keys); bumpSes_(); return { ok: true };
  },
  adminClearLogins: function (req) { need_(req, ['admin']); return Object.assign({ ok: true }, clearLogins_(true)); }
});

const READ_ONLY = { upload: 1, ping: 1, me: 1, myData: 1, groupData: 1, logins: 1, marksLog: 1, shiftState: 1, breakBoard: 1, testState: 1, content: 1, contentMine: 1, adminUsers: 1 };
function doGet() { return out_({ ok: true, service: 'g11-portal' }); }
function doPost(e) {
  forget_();
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const fn = API[req.action];
    if (!fn) fail_('Неизвестное действие');
    if (READ_ONLY[req.action]) return out_(fn(req)); // чтение — без очереди, параллельно
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try { return out_(fn(req)); } finally { lock.releaseLock(); }
  } catch (err) {
    return out_({ ok: false, error: String(err.message || err), code: err.code || 'error' });
  }
}

/* ---------- запустить один раз из редактора: ▶ setup ---------- */
function setup() {
  const s = accSheet_(); sesSheet_(); logSheet_(); paySheet_(); marksSheet_(); contentSheet_(); testsSheet_();
  const have = {}; users_().forEach(function (u) { have[u.id] = true; });
  SEED.forEach(function (r) { if (!have[r[0]]) s.appendRow([r[0], r[1], r[2], r[3], r[4], true, new Date()]); });
  bumpSes_(); forget_(); Logger.log('Готово: аккаунтов ' + users_().length);
}

/* ---------- проверка из редактора: ▶ debugData (ничего не меняет) ---------- */
function debugData() {
  const list = monthSheets_(); Logger.log('Месяцы: ' + list.map(function (m) { return m.key + ' ' + m.name; }).join(', '));
  const m = pickMonth_(list), kpi = parseKpi_(m), disc = parseDisc_(m.key);
  Logger.log('Выбран: ' + m.title + ' · итогов ' + Object.keys(kpi.sum).length + ' · премия ' + Object.keys(kpi.bonus).length + ' · смен KPI ' + Object.keys(kpi.shifts).length + ' · дисциплина ' + Object.keys(disc).length);
  const id = Object.keys(kpi.sum)[1];
  const p = personal_(id, m, kpi, disc);
  Logger.log(id + ' stats ' + JSON.stringify(p.stats));
  Logger.log('pay ' + JSON.stringify(p.pay) + ' premium ' + JSON.stringify(p.premium && { coef: p.premium.coef, stage: p.premium.stage }));
  Logger.log('summary ' + JSON.stringify(p.summary));
  Logger.log('bonus ' + JSON.stringify(p.bonus));
  Logger.log('disc[0] ' + JSON.stringify(p.discipline[0]));
  Logger.log('tips ' + p.tips.map(function (t) { return t[1]; }).join(', '));
}
