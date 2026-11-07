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
function ss_() { return SpreadsheetApp.openById(SHEET_ID); }
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

function users_() {
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
function session_(token) {
  if (!token) fail_('Нужно войти', 'auth');
  const th = sha_(token), s = sesSheet_(), v = s.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (v[i][0] === th) {
    const u = findUser_(v[i][1]);
    if (!u || !u.active) fail_('Аккаунт отключён', 'auth');
    const last = v[i][3] instanceof Date ? v[i][3].getTime() : 0;
    if (Date.now() - last > 6 * 3600 * 1000) s.getRange(i + 1, 4).setValue(new Date());
    return { user: u, row: i + 1 };
  }
  fail_('Сессия завершена, войдите снова', 'auth');
}
function dropSessions_(id, exceptRow) {
  const s = sesSheet_(), v = s.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][1]) === String(id) && i + 1 !== exceptRow) s.deleteRow(i + 1);
}
function need_(req, roles) { const se = session_(req.token); if (roles && roles.indexOf(se.user.role) < 0) fail_('Недостаточно прав', 'forbidden'); return se; }

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
    try { const se = session_(req.token); sesSheet_().deleteRow(se.row); log_(se.user.id, se.user.name, '🚪 выход', ''); } catch (e) {}
    return { ok: true };
  },

  changePassword: function (req) {
    const se = need_(req), u = se.user, nw = String(req.newPassword || '');
    if (hashPw_(u.salt, String(req.oldPassword || '')) !== u.hash) fail_('Текущий пароль неверный');
    if (nw.length < 8) fail_('Новый пароль — минимум 8 символов');
    const salt = rnd_(16);
    accSheet_().getRange(u.row, 4, 1, 2).setValues([[salt, hashPw_(salt, nw)]]);
    accSheet_().getRange(u.row, 7).setValue(new Date());
    dropSessions_(u.id, se.row); // выходим на других устройствах, текущее оставляем
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
    accSheet_().getRange(u.row, 3).setValue(req.role);
    return { ok: true };
  },

  adminSetActive: function (req) {
    const se = need_(req, ['admin']);
    const u = findUser_(req.id); if (!u) fail_('Нет такого сотрудника');
    if (u.id === se.user.id) fail_('Нельзя отключить себя');
    accSheet_().getRange(u.row, 6).setValue(!!req.active);
    if (!req.active) dropSessions_(u.id);
    return { ok: true };
  },

  adminAddUser: function (req) {
    need_(req, ['admin']);
    const id = String(req.id || '').replace(/\D/g, ''), name = String(req.name || '').trim(), role = ROLES.indexOf(req.role) > -1 ? req.role : 'employee';
    if (!id || !name) fail_('Укажите ID и ФИО');
    if (findUser_(id)) fail_('Такой ID уже есть');
    const pw = genPw_(), salt = rnd_(16);
    accSheet_().appendRow([id, name, role, salt, hashPw_(salt, pw), true, new Date()]);
    return { ok: true, password: pw };
  }
};


/* ================= ДАННЫЕ: смены, дисциплина, KPI, зарплата, премия ================= */
const MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
// планы для премии — как в калькуляторе премии на сайте (направление «чаты»)
const PLANS = { 1: { output: 100, rating: 3.5, ant: 7.5, ops: 0.95 }, 2: { output: 140, rating: 3.7, ant: 5.3, ops: 0.95 }, 3: { output: 180, rating: 4.15, ant: 3.8, ops: 0.95 } };
const NORM1 = { out: 100, csi: 3.5, aht: 7.5, ops: 95, ko: 90 }; // норма плана 1 — минимум для премии

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
    const v = s.getDisplayValues(); let year = null;
    for (let i = 0; i < v.length && !year; i++) { const k = dkey_(v[i][0]); if (k) year = Number(k.slice(0, 4)); }
    if (!year) year = new Date().getFullYear();
    res.push({ key: year + '-' + ('0' + (mi + 1)).slice(-2), name: s.getName(), title: m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() + ' ' + year, values: v });
  });
  res.sort(function (a, b) { return a.key < b.key ? -1 : 1; });
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
  const v = m.values, sum = {}, bonus = {}, shifts = {};
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
function parseDisc_(monthKey) {
  const s = ss_().getSheetByName(DISC); if (!s) return {};
  const v = s.getDisplayValues(), res = {}, today = todayKey_(); let date = null;
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
function salaryOf_(id) { const v = paySheet_().getDataRange().getValues(); for (let i = 1; i < v.length; i++) if (String(v[i][0]) === String(id)) return Number(v[i][1]) || null; return null; }
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
  const s = kpi.sum[id] || null, b = kpi.bonus[id] || null, d = disc[id] || [], sal = salaryOf_(id);
  const past = d.filter(function (x) { return x.kind !== 'future'; });
  const hours = past.reduce(function (a, x) { return a + (x.hours || 0); }, 0);
  const breakOver = past.reduce(function (a, x) { return a + (x.leftMin !== null && x.leftMin < 0 ? -x.leftMin : 0); }, 0);
  const worked = past.filter(function (x) { return x.came; }).length;
  const prem = premium_(b, sal);
  return {
    summary: s, bonus: b, kpiShifts: kpi.shifts[id] || [], discipline: d,
    stats: { planned: d.length, past: past.length, worked: worked, hours: Math.round(hours * 10) / 10, ok: past.filter(function (x) { return x.kind === 'ok'; }).length,
      viol: past.filter(function (x) { return x.kind === 'viol'; }).length, absent: past.filter(function (x) { return x.kind === 'absent'; }).length,
      absentReason: past.filter(function (x) { return x.kind === 'absent_reason'; }).length, future: d.length - past.length, breakOverMin: breakOver },
    pay: { salary: sal, perShift: sal ? Math.round(sal / 15 * 100) / 100 : null, shifts: worked, base: sal ? Math.round(sal / 15 * worked) : null },
    premium: prem, tips: tips_(b, s, d)
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

function doGet() { return out_({ ok: true, service: 'g11-portal' }); }
function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const fn = API[req.action];
    if (!fn) fail_('Неизвестное действие');
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try { return out_(fn(req)); } finally { lock.releaseLock(); }
  } catch (err) {
    return out_({ ok: false, error: String(err.message || err), code: err.code || 'error' });
  }
}

/* ---------- запустить один раз из редактора: ▶ setup ---------- */
function setup() {
  const s = accSheet_(); sesSheet_(); logSheet_(); paySheet_();
  const have = {}; users_().forEach(function (u) { have[u.id] = true; });
  SEED.forEach(function (r) { if (!have[r[0]]) s.appendRow([r[0], r[1], r[2], r[3], r[4], true, new Date()]); });
  Logger.log('Готово: аккаунтов ' + users_().length);
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
