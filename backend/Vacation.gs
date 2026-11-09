/**
 * Отпуск 2027 · Группа 11 — сервер бронирования (Google Apps Script, отдельный проект).
 *
 * Источник правды — общая таблица отпусков «2027 покупатели звонки+чаты», лист «Покупатели Чаты».
 * Сервер работает ТОЛЬКО со строками, где в колонке «Группа» стоит «11 ночь».
 * День отпуска = «1» в колонке даты (заголовки строки 4: «08.02 Пн»).
 * Строка 1 — всего слотов, строка 3 — занято (СЧЁТЕСЛИ), свободно = всего − занято.
 *
 * Правила: только 2027 год; на каждый день нужен свободный слот отдела;
 * в один день в отпуске может быть только один человек из Группы 11.
 * Кто бронирует — определяет вход на портал (личный кабинет): браузер присылает токен сессии портала,
 * сервер находит его хеш в листе «_сессии» таблицы «Группа 11», а роль — в листе «_доступ».
 * Сотрудник бронирует и меняет только свои отпуска; руководитель (admin) — любые.
 * ПИН-коды больше не нужны.
 */
const VAC_SS = '1AO1UvIQc7J3q3Jbe69FB3MMw6He6z-KJsgPKV3eC6Vg';
const VAC_GID = 1494585550;
const GROUP = '11 ночь';
const HDR_ROW = 4, TOTAL_ROW = 1, TAKEN_ROW = 3, FIRST_DATA_ROW = 5;
const PORTAL_SS = '1WTmuXiOqswY36a12nPJNSDDNxkIIW02VODYRlxsxmeQ'; // таблица «Группа 11»: входы портала
const YEAR = 2027;

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sha_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function iso_(d) { return Utilities.formatDate(d, 'Etc/GMT', 'yyyy-MM-dd'); }
function pd_(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; }
function range_(a, b) { const r = []; for (let d = pd_(a); iso_(d) <= b; d.setUTCDate(d.getUTCDate() + 1)) r.push(iso_(d)); return r; }
function ru_(s) { return s.slice(8, 10) + '.' + s.slice(5, 7); }
function short_(n) { const p = String(n).trim().split(/\s+/); return p[0] + (p[1] ? ' ' + p[1] : ''); }

function vacSheet_() {
  const ss = SpreadsheetApp.openById(VAC_SS);
  const s = ss.getSheets().filter(function (x) { return x.getSheetId() === VAC_GID; })[0];
  if (!s) throw new Error('Не найден лист отпусков');
  return s;
}
/** Вход портала: токен → сотрудник. Хеш токена ищем в «_сессии», роль и активность — в «_доступ». */
function who_(token) {
  token = String(token || '');
  if (token.length < 20) throw new Error('Войдите на портал (кнопка «Войти» вверху), чтобы бронировать отпуск.');
  const th = sha_(token), c = CacheService.getScriptCache(), hit = c.get('vs_' + th);
  if (hit) return JSON.parse(hit);
  const ss = SpreadsheetApp.openById(PORTAL_SS), ses = ss.getSheetByName('_сессии'), acc = ss.getSheetByName('_доступ');
  const sv = ses ? ses.getDataRange().getValues() : [];
  let id = null;
  for (let i = 1; i < sv.length; i++) if (sv[i][0] === th) { id = String(sv[i][1]).trim(); break; }
  if (!id) throw new Error('Вход устарел — выйдите и войдите на портал заново.');
  const av = acc.getDataRange().getValues();
  for (let i = 1; i < av.length; i++) if (String(av[i][0]).trim() === id) {
    if (av[i][5] === false || av[i][5] === 'нет') throw new Error('Аккаунт отключён.');
    const u = { id: id, name: String(av[i][1]), role: String(av[i][2]) };
    c.put('vs_' + th, JSON.stringify(u), 300);
    return u;
  }
  throw new Error('Аккаунт не найден.');
}
function canEdit_(u, empId) { return u.role === 'admin' || u.id === String(empId); }

/** Читает лист: колонки дат, строки Группы 11, свободные слоты. */
function read_() {
  const s = vacSheet_();
  SpreadsheetApp.flush();
  const lastCol = s.getLastColumn(), lastRow = s.getLastRow();
  const top = s.getRange(1, 1, HDR_ROW, lastCol).getDisplayValues();
  const cols = {}, dates = [];
  top[HDR_ROW - 1].forEach(function (h, j) {
    const m = /^(\d{2})\.(\d{2})/.exec(String(h).trim());
    if (m && j >= 7) { const ds = YEAR + '-' + m[2] + '-' + m[1]; cols[ds] = j + 1; dates.push(ds); }
  });
  const free = {};
  dates.forEach(function (ds) {
    const j = cols[ds] - 1, tot = parseFloat(top[TOTAL_ROW - 1][j]), tk = parseFloat(top[TAKEN_ROW - 1][j]);
    free[ds] = (isNaN(tot) ? 0 : tot) - (isNaN(tk) ? 0 : tk);
  });
  const v = s.getRange(FIRST_DATA_ROW, 1, lastRow - FIRST_DATA_ROW + 1, lastCol).getDisplayValues();
  const people = [];
  v.forEach(function (r, i) {
    if (String(r[2]).trim().toLowerCase() !== GROUP) return;
    const p = { row: FIRST_DATA_ROW + i, id: String(r[0]).trim(), name: String(r[1]).trim(), days: {} };
    dates.forEach(function (ds) { if (String(r[cols[ds] - 1]).trim() === '1') p.days[ds] = true; });
    people.push(p);
  });
  return { sheet: s, cols: cols, dates: dates, free: free, people: people };
}

/** Непрерывные отрезки «1» → брони. */
function items_(st) {
  const res = [];
  st.people.forEach(function (p) {
    let cur = null;
    st.dates.forEach(function (ds) {
      if (p.days[ds]) { if (!cur) cur = { emp: p.id, name: p.name, from: ds, to: ds }; else cur.to = ds; }
      else if (cur) { res.push(cur); cur = null; }
    });
    if (cur) res.push(cur);
  });
  res.forEach(function (it) { it.id = it.emp + '_' + it.from; it.days = range_(it.from, it.to).length; });
  res.sort(function (a, b) { return a.from < b.from ? -1 : 1; });
  return res;
}
function state_(st) {
  return { items: items_(st), free: st.free, people: st.people.map(function (p) { return { id: p.id, name: p.name }; }) };
}

/** Проверка дат: год, слот отдела, один человек Группы 11 в день, нет пересечения со своими днями. */
function validate_(st, p, from, to, ignore) {
  if (!pd_(from) || !pd_(to) || from.slice(0, 4) !== String(YEAR) || to.slice(0, 4) !== String(YEAR)) throw new Error('Можно бронировать только даты ' + YEAR + ' года.');
  if (to < from) throw new Error('Дата окончания раньше даты начала.');
  const ds = range_(from, to), noSlot = [];
  ds.forEach(function (d) {
    if (!st.cols[d]) throw new Error('В таблице нет колонки для ' + ru_(d) + '.');
    if (ignore && ignore[d]) return;
    if (p.days[d]) throw new Error('У вас уже отпуск ' + ru_(d) + '.');
    const o = st.people.filter(function (x) { return x.id !== p.id && x.days[d]; })[0];
    if (o) throw new Error(ru_(d) + ' в отпуске ' + short_(o.name) + ' — из Группы 11 одновременно может отдыхать только один человек. Выберите другие даты или договоритесь, чтобы поменяться.');
    // если этот день освобождается при переносе — слот уже учтён как свободный +1
    if (st.free[d] <= 0) noSlot.push(ru_(d));
  });
  if (noSlot.length) throw new Error('Нет свободных слотов в общей таблице: ' + noSlot.slice(0, 8).join(', ') + (noSlot.length > 8 ? '…' : '') + '. Выберите другие даты.');
  return ds;
}
function write_(st, p, list, val) {
  list.forEach(function (d) { const r = st.sheet.getRange(p.row, st.cols[d]); if (val) r.setValue(1); else r.clearContent(); });
}

function doGet() {
  try { return out_(Object.assign({ ok: true }, state_(read_()))); }
  catch (e) { return out_({ ok: false, msg: String(e.message || e) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (x) { return out_({ ok: false, msg: 'Сервер занят, попробуйте ещё раз через минуту.' }); }
  let st;
  try {
    const b = JSON.parse(e.postData.contents || '{}');
    const u = who_(b.token);
    st = read_();
    let msg = '';

    if (b.action === 'book') {
      const p = st.people.filter(function (x) { return x.id === String(b.emp); })[0];
      if (!p) throw new Error('Сотрудник не найден в Группе 11 общей таблицы.');
      if (!canEdit_(u, p.id)) throw new Error('Бронировать можно только свой отпуск.');
      const ds = validate_(st, p, b.from, b.to, null);
      write_(st, p, ds, true);
      msg = 'Отпуск ' + short_(p.name) + ' с ' + ru_(b.from) + ' по ' + ru_(b.to) + ' (' + ds.length + ' дн.) внесён в общую таблицу.';
    } else if (b.action === 'edit' || b.action === 'delete') {
      const it = items_(st).filter(function (x) { return x.id === String(b.id); })[0];
      if (!it) throw new Error('Бронь не найдена — возможно, её уже изменили. Обновите страницу.');
      if (!canEdit_(u, it.emp)) throw new Error('Менять можно только свой отпуск. Если нужно поменяться датами — напишите руководителю группы.');
      const p = st.people.filter(function (x) { return x.id === it.emp; })[0];
      const old = range_(it.from, it.to), oldSet = {};
      old.forEach(function (d) { oldSet[d] = true; });
      if (b.action === 'delete') {
        write_(st, p, old, false);
        msg = 'Бронь ' + short_(p.name) + ' (' + ru_(it.from) + ' – ' + ru_(it.to) + ') удалена из таблицы.';
      } else {
        // при переносе свои старые дни считаем свободными
        old.forEach(function (d) { st.free[d] += 1; delete p.days[d]; });
        const ds = validate_(st, p, b.from, b.to, null);
        write_(st, p, old.filter(function (d) { return ds.indexOf(d) < 0; }), false);
        write_(st, p, ds.filter(function (d) { return !oldSet[d]; }), true);
        msg = 'Отпуск ' + short_(p.name) + ' перенесён: ' + ru_(b.from) + ' – ' + ru_(b.to) + ' (' + ds.length + ' дн.).';
      }
    } else throw new Error('Неизвестное действие.');

    return out_(Object.assign({ ok: true, msg: msg }, state_(read_())));
  } catch (err) {
    let s = {};
    try { s = state_(st || read_()); } catch (x) {}
    return out_(Object.assign({ ok: false, msg: String(err.message || err) }, s));
  } finally { lock.releaseLock(); }
}
