#!/usr/bin/env python3
"""Собирает kb.js — базу знаний для «Помощника оператора» (helper.html).
Берёт полные тексты шаблонов, ситуации (h3), правила (заметки) и источники БЗ
со страниц шпаргалки. Запуск: python3 tools/build_kb.py (после правки шаблонов)."""
import re, json, html, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))

# какие страницы и как их читать: tpl — шаблоны ответов клиенту, sv — форматы передачи СВ, rules — правила
PAGES = [('templates.html', '📋 Шаблоны', 'tpl'), ('sv.html', '🧑‍💼 Передача СВ', 'sv'), ('work.html', '💼 Работа', 'rules')]
SKIP = {'empathy', 'listen', 'faq', 'gloss', 'whub'}  # конструкторы и справочники — не ответы

def txt(s, keep_lines=False):
    s = re.sub(r'<script.*?</script>|<style.*?</style>|<button.*?</button>', ' ', s, flags=re.S)
    if keep_lines: s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'<[^>]+>', ' ', s); s = html.unescape(s)
    if keep_lines:
        s = '\n'.join(re.sub(r'[ \t]+', ' ', l).strip() for l in s.split('\n'))
        return re.sub(r'\n{3,}', '\n\n', s).strip()
    return re.sub(r'\s+', ' ', s).strip()

TOK = re.compile(r'<h3(?: id="([\w-]+)")?[^>]*>(.*?)</h3>'
                 r'|<div class="tpl"><span class="lbl">(.*?)</span>(.*?)</div>'
                 r'|<div class="note([^"]*)">(.*?)</div>'
                 r'|<p class="src">(.*?)</p>', re.S)

out = []
for f, pname, kind in PAGES:
    h = open(f, encoding='utf-8').read()
    for m in re.finditer(r'<section id="([\w-]+)"([^>]*)>(.*?)</section>', h, re.S):
        sid, attrs, inner = m.groups()
        if sid in SKIP or 'data-nosearch' in attrs: continue
        h2 = re.search(r'<h2[^>]*>(.*?)</h2>', inner, re.S)
        if not h2: continue
        sec = txt(h2.group(1)); keys = (re.search(r'data-keys="([^"]*)"', attrs) or [None, ''])[1]
        src = [{'t': txt(a.group(2)), 'u': a.group(1)} for s in re.finditer(r'<p class="src">(.*?)</p>', inner, re.S)
               for a in re.finditer(r'<a href="([^"]+)"[^>]*>(.*?)</a>', s.group(1), re.S)]
        sit, sit_id, notes = '', sid, []
        if kind == 'rules':  # страница правил: каждый подраздел (h3) — отдельная запись с полным текстом
            parts = re.split(r'(<h3(?: id="[\w-]+")?[^>]*>.*?</h3>)', inner, flags=re.S)
            cur_t, cur_id = '', sid
            for ch in parts:
                hm = re.match(r'<h3(?: id="([\w-]+)")?[^>]*>(.*?)</h3>', ch, re.S)
                if hm: cur_t, cur_id = txt(hm.group(2)), (hm.group(1) or sid); continue
                body = txt(ch)
                if not cur_t and body.startswith(sec): body = body[len(sec):].strip()
                if len(body) > 15:
                    out.append({'k': 'rule', 'sec': sec, 'sit': cur_t, 'p': pname, 'u': f + '#' + cur_id, 'keys': keys, 'x': body[:900]})
            continue
        for t in TOK.finditer(inner):
            if t.group(2) is not None:          # h3 — новая ситуация
                sit, sit_id = txt(t.group(2)), (t.group(1) or sid)
            elif t.group(3) is not None:        # шаблон
                out.append({'k': 'sv' if kind == 'sv' else 'tpl', 'sec': sec, 'sit': sit, 'lbl': txt(t.group(3)),
                            'x': txt(t.group(4), keep_lines=True), 'p': pname, 'u': f + '#' + sit_id,
                            'keys': keys, 'note': ' '.join(notes)[:700], 'src': src})
            elif t.group(6) is not None:        # заметка-правило
                nt = txt(t.group(6))
                if not sit: notes.append(('⚠️ ' if 'warn' in t.group(5) else '') + nt)
                else:  # заметка внутри ситуации — показываем как правило к ней
                    out.append({'k': 'rule', 'sec': sec, 'sit': sit, 'p': pname, 'u': f + '#' + sit_id, 'keys': keys, 'x': nt[:900]})
        if notes and not any(e.get('sec') == sec and e['k'] != 'rule' for e in out):
            out.append({'k': 'rule', 'sec': sec, 'sit': '', 'p': pname, 'u': f + '#' + sid, 'keys': keys, 'x': ' '.join(notes)[:900]})

for i, e in enumerate(out): e['id'] = i
open('kb.js', 'w', encoding='utf-8').write(
    '/* Сгенерировано tools/build_kb.py — не править руками */\nwindow.G11_KB=' +
    json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
from collections import Counter
print(len(out), 'записей', dict(Counter(e['k'] for e in out)))
