#!/usr/bin/env python3
"""Собирает search-index.js — индекс поиска по всему порталу. Запуск: python3 tools/build_search.py"""
import re, json, html, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
PAGES = [('index.html','🏠 Главная'),('work.html','💼 Работа'),('templates.html','📋 Шаблоны'),('sv.html','🧑‍💼 Передача СВ'),
         ('tools.html','🧰 Инструменты'),('helper.html','🤖 Помощник оператора'),('calc.html','🧮 Калькулятор премии'),('salary.html','💵 Калькулятор зарплаты'),('check.html','📶 Проверка связи'),
         ('team.html','👥 Команда'),('vacation.html','🌴 Отпуск 2027'),('zp.html','💰 Как вывести зарплату'),
         ('account.html','🏠 Мой кабинет'),('editor.html','✏️ Кабинет редактора'),('admin.html','🛡 Панель руководителя'),('logins.html','🔑 Журнал входов')]
def txt(s):
    s = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', s, flags=re.S)
    s = re.sub(r'<[^>]+>', ' ', s); s = html.unescape(s)
    return re.sub(r'\s+', ' ', s).strip()
idx = []
for f, pname in PAGES:
    if not os.path.exists(f): continue
    h = open(f, encoding='utf-8').read()
    body = h[h.find('<body'):]
    hdr = re.search(r'<header.*?</header>', body, re.S)
    sub = txt(re.search(r'<p>(.*?)</p>', hdr.group(0), re.S).group(1)) if hdr and re.search(r'<p>(.*?)</p>', hdr.group(0), re.S) else ''
    idx.append({'t': pname, 'p': pname, 'u': f, 'k': 'page', 'x': sub[:200]})
    for m in re.finditer(r'<section id="([\w-]+)"([^>]*)>(.*?)</section>', body, re.S):
        sid, attrs, inner = m.group(1), m.group(2), m.group(3)
        h2 = re.search(r'<h2[^>]*>(.*?)</h2>', inner, re.S)
        if not h2: continue
        title = txt(h2.group(1)); keys = (re.search(r'data-keys="([^"]*)"', attrs) or [None, ''])[1]
        if 'data-nosearch' in attrs:  # раздел со своим поиском (разборы «Флудилки») — в общий индекс только заголовок
            idx.append({'t': title, 'p': pname, 'u': f + '#' + sid, 'k': 'section', 'x': 'Свой поиск внутри раздела', 'w': keys})
            continue
        body_txt = txt(inner)
        idx.append({'t': title, 'p': pname, 'u': f + '#' + sid, 'k': 'section', 'x': body_txt[len(title):len(title)+180].strip(), 'w': (keys + ' ' + body_txt)[:500]})
        for h3 in re.finditer(r'<h3(?: id="([\w-]+)")?[^>]*>(.*?)</h3>', inner, re.S):
            ht = txt(h3.group(2))
            if ht: idx.append({'t': ht, 'p': pname + ' → ' + title, 'u': f + '#' + (h3.group(1) or sid), 'k': 'sub', 'x': ''})
        for lb in re.finditer(r'<div class="tpl"><span class="lbl">(.*?)</span>(.*?)</div>', inner, re.S):
            lt = txt(lb.group(1))
            if lt: idx.append({'t': lt, 'p': pname + ' → ' + title, 'u': f + '#' + sid, 'k': 'tpl', 'x': txt(lb.group(2))[:140], 'w': txt(lb.group(2))[:260]})
        for lk in re.finditer(r'<a class="link[^"]*" href="([^"]+)"[^>]*><b>(.*?)</b>(.*?)</a>', inner, re.S):
            lt = txt(lk.group(2)); href = lk.group(1)
            if lt: idx.append({'t': lt, 'p': pname + ' → ' + title, 'u': href, 'k': 'link', 'x': txt(lk.group(3))[:140], 'ext': href.startswith('http')})
    for g in re.finditer(r'<div><b>([^<]+)</b>\s*—\s*(.*?)</div>', body, re.S):
        idx.append({'t': txt(g.group(1)), 'p': pname + ' → 📖 Сокращения', 'u': f + '#gloss', 'k': 'term', 'x': txt(g.group(2))[:160]})
seen=set(); out=[]
for e in idx:
    key=(e['t'],e['u'])
    if key in seen: continue
    seen.add(key); out.append(e)
open('search-index.js','w',encoding='utf-8').write('window.G11_INDEX='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
print(len(out),'записей')
