#!/usr/bin/env python3
"""Собирает bz-data.js — все шаблоны из Базы знаний КЦ (раздел «Поддержка покупателей»),
которых ещё нет в шпаргалке. Источник: tools/bz-raw.json (выгрузка блоков-шаблонов из статей БЗ:
[{id, t: заголовок статьи, r: [[подзаголовок, вводный текст, шаблон], ...]}]).
Запуск: python3 tools/build_bz.py (после обновления bz-raw.json или правки шаблонов шпаргалки)."""
import re, json, html, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))

# порядок статей в «Содержании БЗ для поддержки покупателей» (статья 788); id разделов — заголовки групп
ORDER = [int(x) for x in """1168,707,1865,1874,2892,1169,2136,787,448,449,944,269,270,271,272,341,1318,2536,2594,2560,1839,1841,2588,
273,275,276,296,3060,2534,346,363,2504,1541,364,524,1629,635,672,1315,1467,1835,1842,2039,2454,2457,2466,374,378,1901,2531,3219,
3579,1207,1568,1569,376,375,2030,377,350,452,2369,601,1328,1329,2545,2623,653,2187,2192,2252,2530,1107,1108,2943,2182,2239,2116,
1579,381,2543,3093,1608,1310,1581,1607,1850,1204,1309,1984,2897,2025,2027,277,365,384,278,2393,367,369,368,372,281,282,348,379,
383,380,382,2506,450,451,454,1960,2501,469,297,1610,2440,4662,4666,4667,4665,4663,4664,353,2255,355,354,1963,447,1747,2327,2712,
1326,1975,1033,1327,1330,1331,1562,2541,2582,5219,1741,298,2113,1742,1743,1570,2443,2517,1149,535,1115,1116,1151,1572,1148,1114,
1147,3176,3186,3187,3381,3382,3398,3405,4692,3488,954,1571,860,4640,3706,2529""".replace('\n', '').split(',')]
SECTIONS = {1168: '🗂 Обработка обращений', 787: '🛠 Проблемы и операции', 269: '🛒 Оформление заказа', 1839: '🏢 Заказы от юрлиц',
            273: '📦 Доставка товаров', 374: '💳 Оплата товаров', 653: '👛 WB Кошелёк и текущий счёт', 1608: '➕ Пополнить WB Кошелёк',
            1850: '💳 Карта WB Банка', 2025: '🏦 Вклады в WB Банке', 277: '↩️ Возврат товара', 367: '🔍 Проверка товара на брак',
            281: '🚚 Обратная доставка', 379: '💸 Возврат денег', 450: '🏷 Скидки и акции', 4662: '🎁 Программа лояльности «Мой WB»',
            353: '⭐ Отзывы и вопросы', 1326: '👤 Профиль пользователя', 1741: '👑 WB Клуб', 1149: '🛡 Полисы страхования',
            1148: '🧰 Пакеты услуг', 3176: '🍓 Компенсация', 3381: '🅰️ Aliexpress', 4692: '📲 WB Pay', 3488: '⚠️ Ошибки в работе Веб-КЦ',
            954: '🏛 Данные с Госуслуг', 1571: '📱 Mobile ID', 860: '🤝 Сотрудничество', 4640: '↪️ Другие поддержки', 3706: '💬 WB Чат',
            2529: '💜 Конструктор эмпатии'}
SEC_OF, cur = {}, '🗂 Обработка обращений'
for i in ORDER:
    cur = SECTIONS.get(i, cur); SEC_OF[i] = cur
# ВБ Трек и Ресейл — отдельная поддержка, не к группе 11
SKIP_RE = re.compile(r'ресейл|resale|wb ?track|вб ?трек', re.I)

def norm(s): return re.sub(r'[^а-яa-z0-9]', '', s.lower().replace('ё', 'е'))
def words(s): return re.findall(r'[а-яa-z0-9]+', s.lower().replace('ё', 'е'))
def shingles(s, n=4):
    w = words(s); return {' '.join(w[i:i + n]) for i in range(max(1, len(w) - n + 1))}
def clean(s):
    s = s.replace(' ', ' ').replace('​', '')
    s = '\n'.join(l.rstrip() for l in s.split('\n'))
    return re.sub(r'\n{3,}', '\n\n', s).strip()

# что уже есть в шпаргалке: шаблоны со всех страниц + сам текст страниц
site_txt = ''
for f in ['templates.html', 'sv.html', 'work.html']:
    h = open(f, encoding='utf-8').read()
    site_txt += ' ' + html.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<script.*?</script>|<style.*?</style>', ' ', h, flags=re.S)))
site_norm = norm(site_txt)
site_tpls = [shingles(m) for m in re.findall(r'<div class="tpl"><span class="lbl">.*?</span>(.*?)</div>',
             open('templates.html', encoding='utf-8').read(), re.S)]
site_sh = set().union(*site_tpls) if site_tpls else set()

raw = json.load(open('tools/bz-raw.json', encoding='utf-8'))
raw.sort(key=lambda a: ORDER.index(a['id']) if a['id'] in ORDER else 9999)
out, dup, skip = [], 0, 0
for a in raw:
    title = clean(a['t'])
    if SKIP_RE.search(title): skip += len(a['r']); continue
    for h, c, x in a['r']:
        x, h, c = clean(x), clean(h), clean(c)
        if len(norm(x)) < 25: continue
        if SKIP_RE.search(x): skip += 1; continue
        sh = shingles(x)
        if norm(x) in site_norm or (sh and len(sh & site_sh) / len(sh) >= 0.6): dup += 1; continue
        if c and len(c) > 240: c = c[:237].rsplit(' ', 1)[0] + '…'
        if h == c: c = ''
        out.append({'s': SEC_OF.get(a['id'], '🗂 Прочее'), 'a': title, 'id': a['id'], 'h': h, 'c': c, 'x': x})
for i, e in enumerate(out): e['n'] = i
open('bz-data.js', 'w', encoding='utf-8').write(
    '/* Сгенерировано tools/build_bz.py из tools/bz-raw.json — не править руками */\nwindow.G11_BZ=' +
    json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
from collections import Counter
print(len(out), 'новых шаблонов; уже были в шпаргалке:', dup, '; пропущено (Ресейл/Трек):', skip)
print(len({e['id'] for e in out}), 'статей БЗ')
for s, n in Counter(e['s'] for e in out).items(): print(' ', n, s)
