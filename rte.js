/* Оформление текста для материалов наставников: безопасный HTML + редактор с панелью. */
(function(){
  if(window.G11Rich)return;
  var TAGS={B:1,STRONG:1,I:1,EM:1,U:1,S:1,MARK:1,A:1,BR:1,P:1,DIV:1,UL:1,OL:1,LI:1,HR:1,H3:1,H4:1,BLOCKQUOTE:1,SMALL:1,SUP:1};
  function okHref(h){h=String(h||'').trim();return /^(https?:|mailto:)/i.test(h)||/^[\w\-]+\.html(#[\w\-]*)?$/.test(h)||/^#[\w\-]+$/.test(h)}
  function clean(node,doc){var out=doc.createDocumentFragment();
    [].slice.call(node.childNodes).forEach(function(n){
      if(n.nodeType===3){out.appendChild(doc.createTextNode(n.nodeValue));return}
      if(n.nodeType!==1)return;var t=n.tagName.toUpperCase(),inner=clean(n,doc);
      if(t==='SPAN'||t==='FONT'){var st=(n.getAttribute('style')||'').toLowerCase();var bold=/font-weight:\s*(bold|[6-9]00)/.test(st),it=/font-style:\s*italic/.test(st),bg=/background/.test(st)&&!/transparent|initial|inherit/.test(st);var w=inner;
        if(bg){var m=doc.createElement('mark');m.appendChild(w);w=m}if(bold){var b=doc.createElement('b');b.appendChild(w);w=b}if(it){var i=doc.createElement('i');i.appendChild(w);w=i}out.appendChild(w);return}
      if(t==='FIGURE'){var fk=n.getAttribute('data-k'),fid=n.getAttribute('data-id')||'';if(/^(img|vid|file)$/.test(fk||'')&&/^[\w-]{20,100}$/.test(fid)&&/\bg11m\b/.test(n.getAttribute('class')||'')){var fg=doc.createElement('figure');fg.setAttribute('class','g11m');fg.setAttribute('data-k',fk);fg.setAttribute('data-id',fid);
          ['data-n','data-m','data-s'].forEach(function(a){var v=n.getAttribute(a);if(v)fg.setAttribute(a,String(v).slice(0,140))});fg.setAttribute('contenteditable','false');out.appendChild(fg)}return}
      if(t==='H1'||t==='H2'){t='H3'}
      if(!TAGS[t]){out.appendChild(inner);return}
      var e=doc.createElement(t);
      if(t==='A'){var h=n.getAttribute('href');if(!okHref(h)){out.appendChild(inner);return}e.setAttribute('href',h.trim());if(/^https?:/i.test(h)){e.setAttribute('target','_blank');e.setAttribute('rel','noopener')}}
      if(t==='BLOCKQUOTE'&&/\bfn\b/.test(n.getAttribute('class')||''))e.setAttribute('class','fn');
      if(t==='MARK'){var mc=(n.getAttribute('class')||'').match(/\bm-(y|g|p|b|v|o)\b/);if(mc)e.setAttribute('class','m-'+mc[1])}
      if(t==='I'){var di=n.getAttribute('data-i');if(di&&ICN[di]){e.setAttribute('data-i',di);e.setAttribute('contenteditable','false');out.appendChild(e);return}}
      e.appendChild(inner);out.appendChild(e)});
    return out}
  var ICN={};function icset(){var P=window.G11Icons&&G11Icons.P||{};Object.keys(P).forEach(function(k){ICN[k]=1});return P}
  function isRich(s){return /<(figure|b|strong|i|em|u|s|mark|a|br|p|div|ul|ol|li|hr|h3|h4|blockquote|small|sup)\b/i.test(String(s||''))}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function sanitize(html){if(!isRich(html))return esc(html).replace(/\n/g,'<br>');var doc=document.implementation.createHTMLDocument('x');var box=doc.createElement('div');box.innerHTML=String(html);var res=doc.createElement('div');res.appendChild(clean(box,doc));return res.innerHTML}
  function toText(html){if(!isRich(html))return String(html||'');var d=document.createElement('div');d.innerHTML=sanitize(html);d.querySelectorAll('figure.g11m').forEach(function(f){f.replaceWith(f.getAttribute('data-k')==='img'?'':'\n'+(f.getAttribute('data-n')||'файл')+': https://drive.google.com/file/d/'+f.getAttribute('data-id')+'/view\n')});d.querySelectorAll('i[data-i]').forEach(function(i){var m={arrowr:'→',arrowl:'←',arrowu:'↑',arrowd:'↓',tick:'✓',check:'✓',xmark:'✗',star:'★',dot:'•'}[i.getAttribute('data-i')];i.replaceWith(m?m+' ':'')});
    d.querySelectorAll('hr').forEach(function(h){h.replaceWith('\n———\n')});d.querySelectorAll('br').forEach(function(b){b.replaceWith('\n')});
    d.querySelectorAll('li').forEach(function(l){l.insertAdjacentText('afterbegin',l.parentNode&&l.parentNode.tagName==='OL'?'':'• ');l.insertAdjacentText('beforeend','\n')});
    d.querySelectorAll('ol').forEach(function(o){var i=1;o.querySelectorAll(':scope>li').forEach(function(l){l.insertAdjacentText('afterbegin',(i++)+'. ')})});
    d.querySelectorAll('p,div,h3,h4,blockquote').forEach(function(p){p.insertAdjacentText('beforeend','\n')});
    return d.textContent.replace(/\n{3,}/g,'\n\n').trim()}
  var EMOS=[['Часто','😊 🙂 😉 🤗 🙏 👍 👏 💪 🎉 🔥 ⭐ 💜 ❤️ ✅ ❌ ⚠️ ❗ ❓ 💡 📌 🚀 ✨ 💯 🆕'],
   ['Эмоции','😀 😃 😄 😁 😅 😂 🙂 😊 😇 🥰 😍 🤩 😘 😋 😎 🤓 🧐 🤔 🤨 😐 😶 🙄 😏 😌 😴 🥳 🤯 😮 😲 😳 🥺 😢 😭 😤 😡 🤬 😱 😨 😰 🤝 🫶 💖 💕 💔 💙 💚 💛 🧡 🤍 🖤'],
   ['Жесты','👋 🤚 ✋ 🖐 👌 🤌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 👏 🙌 👐 🤲 🙏 💪 🫡 🤷 🙋 🙅 🙆 💁 🧑‍💻 👩‍💻 👨‍💻 🦸'],
   ['Работа','📝 📋 📄 📑 📚 📖 🗂 📁 📦 🚚 🏬 🏪 💳 💰 💸 🧾 🎁 🛒 📱 💻 🖥 ⌨️ 🖱 ☎️ 📞 💬 🗨 📢 📣 🔔 🔕 📧 ✉️ 📨 🔗 🔍 🔎 🔐 🔑 🛡 ⚙️ 🛠 🧰 📊 📈 📉 🗓 📅 ⏰ ⏱ ⏳ ⌛ ☕ 🍓 🏆 🥇 🎯 🧠 👑'],
   ['Указатели','➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↔️ ↕️ 🔄 🔁 ↩️ ↪️ ⤴️ ⤵️ ▶️ ◀️ 🔼 🔽 ⏩ ⏪ 👉 👈 👆 👇 ☝️ 🔸 🔹 🔶 🔷 ▪️ ▫️ ◾ ◽ 🟣 🟢 🔴 🟡 🔵 🟠 ⚪ ⚫ ✔️ ☑️ ✖️ ➕ ➖ ❕ ❔ ‼️ ⁉️ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 #️⃣ 🆗 🆘 ℹ️ 🔝']];
  var ICS=['arrowr','arrowl','arrowu','arrowd','tick','check','xmark','info','alert','stop','star','fire','gem','rocket','thumb','heart','bulb','pin','flag','target','zap','sparkle','clock','calendar','timer','coffee','chat','megaphone','bell','mail','phone','link','search','key','lock','shield','shieldcheck','user','users','usercheck','idcard','cap','book','file','clipboard','folder','news','image','box','cart','card','cash','wallet','gift','receipt','chart','calc','building','home','tools','briefcase','crown','undo','redirect','refresh','copy','pencil','eraser','list','hash','layers','moon','sun','eye','wifi','ban','monitor'];
  var MK=[['y','Жёлтый'],['g','Зелёный'],['b','Голубой'],['p','Розовый'],['v','Сиреневый'],['o','Оранжевый']];
  var css='.rte{border:1px solid var(--line);border-radius:12px;background:var(--bg);overflow:hidden}.rte-bar{display:flex;flex-wrap:wrap;gap:4px;padding:6px;border-bottom:1px solid var(--line);background:var(--card);position:sticky;top:0;z-index:2}'+
  '.rte-bar button{border:1px solid transparent;background:transparent;color:var(--ink);border-radius:8px;min-width:34px;height:34px;padding:0 8px;font:600 14px/1 inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px}.rte-bar button:hover{background:var(--soft);border-color:var(--line)}.rte-bar .sep{width:1px;background:var(--line);margin:4px 2px}'+
  '.rte-area{min-height:180px;padding:12px 14px;outline:0;font-size:16px;line-height:1.6;color:var(--ink)}.rte-area:empty:before{content:attr(data-ph);color:var(--muted)}'+
  
  '.rich{line-height:1.6}.rich p{margin:0 0 8px}.rich h3,.rich h4{margin:12px 0 6px;color:var(--accent);font-size:17px}.rich ul,.rich ol{margin:6px 0 8px;padding-left:22px}.rich li{margin:3px 0}.rich hr{border:0;border-top:2px dashed var(--line);margin:12px 0}'+
  '.rich mark{background:rgba(255,196,0,.35);color:inherit;border-radius:4px;padding:0 3px}.rich a{color:var(--accent);font-weight:600}.rich blockquote{margin:8px 0;padding:8px 12px;border-left:4px solid var(--accent);background:var(--soft);border-radius:8px}'+
  '.rich blockquote.fn{font-size:14px;color:var(--muted);border-left-color:var(--warn)}.rich small{color:var(--muted)}.rte-area mark{background:rgba(255,196,0,.35);border-radius:4px;padding:0 3px}.rte-area blockquote{margin:8px 0;padding:8px 12px;border-left:4px solid var(--accent);background:var(--soft);border-radius:8px}.rte-area blockquote.fn{font-size:14px;color:var(--muted);border-left-color:var(--warn)}.rte-area hr{border:0;border-top:2px dashed var(--line);margin:12px 0}.rte-area h3{color:var(--accent);font-size:17px;margin:10px 0 4px}';
  css+='.rich mark.m-g,.rte-area mark.m-g{background:rgba(64,192,87,.32)}.rich mark.m-b,.rte-area mark.m-b{background:rgba(51,154,240,.3)}.rich mark.m-p,.rte-area mark.m-p{background:rgba(240,101,149,.32)}.rich mark.m-v,.rte-area mark.m-v{background:rgba(151,117,250,.35)}.rich mark.m-o,.rte-area mark.m-o{background:rgba(253,126,20,.32)}'+
   '.rte-pop{display:none;border-bottom:1px solid var(--line);background:var(--card);padding:6px 8px}.rte-pop.on{display:block;animation:g11pop .18s ease both}.rte-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}.rte-tabs button{border:1px solid var(--line);background:var(--bg);color:var(--accent);border-radius:999px;padding:4px 11px;font:600 13px/1.4 inherit;cursor:pointer}.rte-tabs button.on{background:var(--accent);color:#fff;border-color:var(--accent)}'+
   '.rte-grid{display:flex;flex-wrap:wrap;gap:2px;max-height:190px;overflow:auto}.rte-grid button{border:0;background:none;font-size:21px;width:38px;height:38px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--accent);transition:background .15s,transform .15s}.rte-grid button:hover{background:var(--soft);transform:scale(1.12)}.rte-grid button i[data-i]{width:20px;height:20px}'+
   '.rte-mk{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rte-mk button{width:34px;height:34px;border-radius:50%;border:2px solid var(--card);box-shadow:0 0 0 1px var(--line);cursor:pointer;transition:transform .15s}.rte-mk button:hover{transform:scale(1.15)}.rte-mk .none{background:var(--bg);color:var(--muted);font-size:14px}.rte-mk small{color:var(--muted);margin-left:4px}'+
   'i[data-i]{display:inline-block;width:1.05em;height:1.05em;vertical-align:-.16em;background:var(--accent,#7b2cbf);-webkit-mask:var(--ic) center/contain no-repeat;mask:var(--ic) center/contain no-repeat;font-style:normal;margin:0 .08em}'+
   '.g11clamp{position:relative;max-height:var(--cl,230px);overflow:hidden;transition:max-height .45s cubic-bezier(.2,.7,.2,1)}.g11clamp:after{content:"";position:absolute;left:0;right:0;bottom:0;height:70px;background:linear-gradient(transparent,var(--clbg,var(--soft)));pointer-events:none}'+
   '.g11more{display:flex;width:max-content;align-items:center;gap:6px;margin-top:8px;border:1px solid var(--line);background:var(--card);color:var(--accent);border-radius:999px;padding:6px 14px;font:700 14px/1.2 inherit;cursor:pointer}.g11more:hover{border-color:var(--accent)}'+
   '.g11view{position:fixed;inset:0;z-index:130;background:rgba(20,16,32,.6);display:flex;align-items:flex-start;justify-content:center;padding:6vh 14px;overflow:auto;animation:g11fade .2s ease both}.g11view .vb{width:100%;max-width:760px;background:var(--card);color:var(--ink);border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.35);padding:24px 26px;animation:g11rise .28s cubic-bezier(.2,.8,.2,1) both;position:relative}'+
   '.g11view h3.vt{margin:0 40px 12px 0;font-size:22px;color:var(--ink)}.g11view .vx{position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:20px;cursor:pointer}.g11view .rich{font-size:16.5px}';
  css+='figure.g11m,figure.g11up{margin:12px 0;position:relative}figure.g11m img{display:block;max-width:100%;max-height:640px;border-radius:12px;border:1px solid var(--line);cursor:zoom-in;background:var(--soft)}'+
   '.g11v{position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden;background:#000;border:1px solid var(--line)}.g11v iframe{position:absolute;inset:0;width:100%;height:100%;border:0}figure.g11m figcaption{font-size:13px;color:var(--muted);margin-top:6px}figure.g11m figcaption a{font-weight:600}'+
   '.g11fc{display:flex;align-items:center;gap:14px;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:var(--soft);text-decoration:none!important;color:var(--ink)!important;max-width:520px;transition:border-color .2s,transform .18s}.g11fc:hover{border-color:var(--accent);transform:translateY(-1px)}'+
   '.g11fc .fi{width:46px;height:46px;border-radius:12px;background:var(--card);display:flex;align-items:center;justify-content:center;flex-shrink:0}.g11fc .fi i[data-i]{width:24px;height:24px}.g11fc b{display:block;font-size:15.5px;word-break:break-word}.g11fc small{color:var(--muted)}.g11fc .play{background:var(--accent)}.g11fc .play i[data-i]{background:#fff}'+
   '.rte-area figure.g11m,.rte-area figure.g11up{user-select:none}.rte-area figure.g11m:hover{outline:2px solid var(--accent);outline-offset:3px;border-radius:12px}.g11rm{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:50%;border:0;background:rgba(20,16,32,.75);color:#fff;font-size:16px;cursor:pointer;z-index:2}'+
   'figure.g11up{display:flex;align-items:center;gap:12px;padding:16px;border:2px dashed var(--line);border-radius:14px;background:var(--soft)}figure.g11up.bad{border-color:var(--warn);color:var(--warn)}.rte.drag .rte-area{outline:3px dashed var(--accent);outline-offset:-6px;background:var(--soft)}'+
   'header i[data-i]{background:#fff!important}.rich figure.g11m+p:has(>br:only-child),.rich p:has(>br:only-child):last-child{display:none}.rte-hint{font-size:13px;color:var(--muted);padding:6px 12px;border-top:1px solid var(--line);background:var(--card)}.g11view .lbx{display:block;max-width:100%;max-height:82vh;margin:0 auto;border-radius:12px}';
  var P0=icset();Object.keys(P0).forEach(function(k){css+='i[data-i="'+k+'"]{--ic:url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+P0[k]+'</svg>')+'")}'});
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  /* длинный текст: показываем начало, «Подробнее» открывает окно с полным текстом */
  function clamp(el,o){o=o||{};var max=o.max||230;if(!el||el.__cl)return;if(el.scrollHeight<=max+60)return;el.__cl=1;el.classList.add('g11clamp');el.style.setProperty('--cl',max+'px');if(o.bg)el.style.setProperty('--clbg',o.bg);
    var b=document.createElement('button');b.type='button';b.className='g11more';b.innerHTML='Подробнее <span aria-hidden="true">→</span>';b.onclick=function(e){e.preventDefault();e.stopPropagation();view(o.title||'',el.innerHTML,o.foot)};el.insertAdjacentElement('afterend',b)}
  function view(title,html,foot){var v=document.createElement('div');v.className='g11view';v.innerHTML='<div class="vb" role="dialog" aria-modal="true"><button class="vx" type="button" aria-label="Закрыть">×</button>'+(title?'<h3 class="vt">'+esc(title)+'</h3>':'')+'<div class="rich">'+html+'</div>'+(foot||'')+'</div>';
    function close(){v.remove();document.removeEventListener('keydown',k);document.body.style.overflow=''}function k(e){if(e.key==='Escape')close()}
    v.addEventListener('click',function(e){if(e.target===v||e.target.closest('.vx'))close()});document.addEventListener('keydown',k);document.body.style.overflow='hidden';document.body.appendChild(v);v.querySelector('.vx').focus()}
  function editor(root,ph,opts){opts=opts||{};
    root.classList.add('rte');
    root.innerHTML='<div class="rte-bar">'+
      '<button type="button" data-c="bold" title="Жирный (Ctrl+B)"><b>Ж</b></button><button type="button" data-c="italic" title="Курсив (Ctrl+I)"><i>К</i></button><button type="button" data-c="underline" title="Подчеркнуть (Ctrl+U)"><u>Ч</u></button>'+
      '<button type="button" data-c="mark" title="Выделить маркером — выберите цвет"><mark style="background:linear-gradient(90deg,rgba(255,196,0,.6),rgba(64,192,87,.5),rgba(51,154,240,.5),rgba(240,101,149,.55));padding:0 4px;border-radius:3px;color:inherit">А</mark> ▾</button><span class="sep"></span>'+
      '<button type="button" data-c="h3" title="Подзаголовок">H</button><button type="button" data-c="ul" title="Список">• список</button><button type="button" data-c="ol" title="Нумерованный список">1. список</button><span class="sep"></span>'+
      '<button type="button" data-c="link" title="Ссылка">🔗 ссылка</button><button type="button" data-c="hr" title="Разделитель">— разделитель</button><button type="button" data-c="quote" title="Важный блок">❝ блок</button><button type="button" data-c="fn" title="Сноска / примечание">✱ сноска</button><span class="sep"></span>'+
      '<button type="button" data-c="emo" title="Смайлы, значки и указатели">😊 смайлы и значки</button><button type="button" data-c="clear" title="Убрать оформление">⌫ формат</button><span class="sep"></span><button type="button" data-c="media" title="Фото, видео или файл — встанет туда, где курсор"><i data-i="image"></i> фото, видео, файл</button><button type="button" data-c="prev" title="Как это увидят ребята"><i data-i="eye"></i> предпросмотр</button></div>'+
      '<div class="rte-pop rte-mkp"><div class="rte-mk">'+MK.map(function(m){return '<button type="button" data-mk="'+m[0]+'" title="'+m[1]+'" class="mk-'+m[0]+'"></button>'}).join('')+'<button type="button" class="none" data-mk="-" title="Убрать выделение">✕</button><small>выделите текст и выберите цвет</small></div></div>'+
      '<div class="rte-pop rte-emo"><div class="rte-tabs">'+EMOS.map(function(g,i){return '<button type="button" data-et="'+i+'"'+(i?'':' class="on"')+'>'+g[0]+'</button>'}).join('')+'<button type="button" data-et="ic">Значки портала</button></div><div class="rte-grid"></div></div>'+
      '<div class="rte-area" contenteditable="true" data-ph="'+esc(ph||'Начните печатать…')+'"></div><div class="rte-hint">Скриншот можно вставить прямо в текст: Ctrl+V или перетащите файл мышкой в нужное место.</div><input type="file" class="rte-file" multiple hidden>';
    var area=root.querySelector('.rte-area'),emo=root.querySelector('.rte-emo'),mkp=root.querySelector('.rte-mkp'),grid=root.querySelector('.rte-grid'),saved=null;
    var MKC={y:'rgba(255,196,0,.6)',g:'rgba(64,192,87,.55)',b:'rgba(51,154,240,.55)',p:'rgba(240,101,149,.6)',v:'rgba(151,117,250,.6)',o:'rgba(253,126,20,.6)'};root.querySelectorAll('[data-mk]').forEach(function(x){if(MKC[x.dataset.mk])x.style.background=MKC[x.dataset.mk]});
    function tab(i){root.querySelectorAll('[data-et]').forEach(function(t){t.classList.toggle('on',t.dataset.et===String(i))});
      grid.innerHTML=i==='ic'?ICS.filter(function(n){return ICN[n]}).map(function(n){return '<button type="button" data-ic="'+n+'" title="'+n+'"><i data-i="'+n+'"></i></button>'}).join(''):EMOS[i][1].split(' ').map(function(e){return '<button type="button" data-e="'+e+'">'+e+'</button>'}).join('')}
    tab(0);
    function keep(){var s=window.getSelection();if(s.rangeCount&&area.contains(s.anchorNode))saved=s.getRangeAt(0).cloneRange()}
    function restore(){area.focus();if(saved){var s=window.getSelection();s.removeAllRanges();s.addRange(saved)}}
    area.addEventListener('keyup',keep);area.addEventListener('mouseup',keep);area.addEventListener('blur',keep);
    var fin=root.querySelector('.rte-file'),pend=0,seq=0;
    function at(range){if(range){var s=window.getSelection();s.removeAllRanges();s.addRange(range);saved=range.cloneRange()}else restore()}
    function shrink(file){return new Promise(function(res){if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size<1200000)return res(file);
      var img=new Image(),u=URL.createObjectURL(file);img.onload=function(){var k=Math.min(1,1920/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);
        c.toBlob(function(b){res(b&&b.size<file.size?new File([b],(file.name||'скрин').replace(/\.\w+$/,'')+'.jpg',{type:'image/jpeg'}):file)},'image/jpeg',.86)};img.onerror=function(){res(file)};img.src=u})}
    function b64(blob){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){res(String(fr.result).split(',')[1]||'')};fr.onerror=rej;fr.readAsDataURL(blob)})}
    function post(o){return fetch(G11.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({token:G11.token()},o))}).then(function(rs){return rs.json()},function(){throw new Error('Нет связи с сервером')}).then(function(j){if(!j.ok)throw new Error(j.error||'Ошибка');return j})}
    function chunked(f,ph){return post({action:'uploadStart',name:f.name||'видео',mime:f.type||'application/octet-stream',size:f.size}).then(function(s){var C=s.chunk||8388608,n=Math.ceil(f.size/C),i=0;
      function one(tries){var st=i*C,part=f.slice(st,Math.min(f.size,st+C));return b64(part).then(function(d){return post({action:'uploadChunk',uid:s.uid,start:st,data:d})}).catch(function(e){if(tries<3)return new Promise(function(z){setTimeout(z,1500*(tries+1))}).then(function(){return one(tries+1)});throw e})}
      function loop(){return one(0).then(function(j){i++;var p=ph();if(p){var pc=p.querySelector('.pc');pc&&(pc.textContent=String(f.name||'').slice(0,50)+' · '+fsize(f.size)+' · '+Math.round(Math.min(i,n)/n*100)+'%')}return j.done?j:loop()})}
      return loop()})}
    function upload(file,range){if(!window.G11||!G11.url){alert('Нужно войти');return}if(file.size>500*1048576){alert('«'+file.name+'» больше 500 МБ. Загрузите его на Google Диск сами и вставьте ссылкой.');return}
      var kind=/^image\//.test(file.type)?'img':/^video\//.test(file.type)?'vid':'file',tid='u'+(++seq)+Date.now(),what=kind==='img'?'фото':kind==='vid'?'видео':'файл';
      at(range);document.execCommand('insertHTML',false,'<figure class="g11up" contenteditable="false" data-tmp="'+tid+'"><span class="g11ld"><span class="g11moon"></span><span><span class="g11lt">Загружаю '+what+'…</span><small class="pc">'+esc(file.name||'')+' · '+fsize(file.size)+'</small></span></span></figure><p><br></p>');keep();pend++;
      var ph=function(){return area.querySelector('[data-tmp="'+tid+'"]')};
      shrink(file).then(function(f2){if(f2.size>8*1048576)return chunked(f2,ph).then(function(j){return {done:j}});return b64(f2).then(function(d){return {f:f2,d:d}})}).then(function(o){if(o.done)return o.done;return new Promise(function(res,rej){fetch(G11.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'upload',token:G11.token(),name:(o.f.name&&o.f.name!=='image.png'?o.f.name:'скрин '+new Date().toLocaleString('ru-RU').replace(/[^\d]+/g,'-')+(o.f.type==='image/jpeg'?'.jpg':'.png')),mime:o.f.type||'application/octet-stream',data:o.d})}).then(function(rs){return rs.json()},function(){throw new Error('Нет связи с сервером')}).then(function(j){j.ok?res(j):rej(new Error(j.error||'Ошибка'))},function(e){rej(e.message?e:new Error('Сервер не ответил'))})})})
      .then(function(j){var p=ph();if(p){var f=document.createElement('figure');f.className='g11m';f.setAttribute('contenteditable','false');f.setAttribute('data-k',kind);f.setAttribute('data-id',j.id);f.setAttribute('data-n',j.name);f.setAttribute('data-s',j.size||'');p.replaceWith(f)}})
      .catch(function(err){var p=ph();if(p){p.classList.add('bad');p.innerHTML='Не загрузилось «'+esc(file.name||'')+'»: '+esc(err.message)+' <button type="button" class="g11rm" data-rm style="position:static">✕</button>'}})
      .then(function(){pend--})}
    function files(list,range){[].slice.call(list||[]).forEach(function(f){upload(f,range);range=null})}
    fin.addEventListener('change',function(){files(fin.files);fin.value=''});
    area.addEventListener('dragover',function(e){if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types,'Files')>-1){e.preventDefault();root.classList.add('drag')}});
    area.addEventListener('dragleave',function(){root.classList.remove('drag')});
    area.addEventListener('drop',function(e){root.classList.remove('drag');if(!e.dataTransfer||!e.dataTransfer.files.length)return;e.preventDefault();var rg=null;if(document.caretRangeFromPoint)rg=document.caretRangeFromPoint(e.clientX,e.clientY);else if(document.caretPositionFromPoint){var cp=document.caretPositionFromPoint(e.clientX,e.clientY);if(cp){rg=document.createRange();rg.setStart(cp.offsetNode,cp.offset)}}
      if(rg&&!area.contains(rg.startContainer))rg=null;files(e.dataTransfer.files,rg)});
    area.addEventListener('paste',function(e){var cd=e.clipboardData||window.clipboardData;if(cd&&cd.files&&cd.files.length){e.preventDefault();keep();files(cd.files);return}var h=(e.clipboardData||window.clipboardData).getData('text/html'),t=(e.clipboardData||window.clipboardData).getData('text/plain');e.preventDefault();document.execCommand('insertHTML',false,h?sanitize(h):esc(t).replace(/\n/g,'<br>'))});
    function selHTML(){var s=window.getSelection();if(!s.rangeCount)return '';var d=document.createElement('div');d.appendChild(s.getRangeAt(0).cloneContents());return d.innerHTML}
    root.querySelector('.rte-bar').addEventListener('mousedown',function(e){if(e.target.closest('button'))e.preventDefault()});
    [emo,mkp].forEach(function(p){p.addEventListener('mousedown',function(e){if(e.target.closest('button'))e.preventDefault()})});
    root.addEventListener('click',function(e){var b=e.target.closest('[data-c]'),em=e.target.closest('[data-e]');
      if(em){restore();document.execCommand('insertText',false,em.dataset.e);keep();return}
      var et=e.target.closest('[data-et]');if(et){tab(et.dataset.et==='ic'?'ic':+et.dataset.et);return}
      var ic=e.target.closest('[data-ic]');if(ic){restore();document.execCommand('insertHTML',false,'<i data-i="'+ic.dataset.ic+'" contenteditable="false"></i>&nbsp;');keep();return}
      var mk=e.target.closest('[data-mk]');if(mk){restore();var hh=selHTML();if(hh){var tmp=document.createElement('div');tmp.innerHTML=sanitize(hh);tmp.querySelectorAll('mark').forEach(function(m){m.replaceWith.apply(m,[].slice.call(m.childNodes))});
        document.execCommand('insertHTML',false,mk.dataset.mk==='-'?tmp.innerHTML:'<mark class="m-'+mk.dataset.mk+'">'+tmp.innerHTML+'</mark>')}mkp.classList.remove('on');keep();return}
      if(!b)return;var c=b.dataset.c;restore();
      if(c==='bold'||c==='italic'||c==='underline')document.execCommand(c);
      else if(c==='mark'){emo.classList.remove('on');mkp.classList.toggle('on');return}
      else if(c==='h3')document.execCommand('formatBlock',false,'h3');
      else if(c==='ul')document.execCommand('insertUnorderedList');else if(c==='ol')document.execCommand('insertOrderedList');
      else if(c==='link'){var u=prompt('Адрес ссылки (https://…)','https://');if(u&&okHref(u)){var tx=window.getSelection().toString();if(tx)document.execCommand('createLink',false,u);else document.execCommand('insertHTML',false,'<a href="'+esc(u)+'">'+esc(u)+'</a>')}else if(u)alert('Ссылка должна начинаться с https://')}
      else if(c==='hr')document.execCommand('insertHTML',false,'<hr><p><br></p>');
      else if(c==='quote'){var q=selHTML()||'Важно: ';document.execCommand('insertHTML',false,'<blockquote>'+sanitize(q)+'</blockquote><p><br></p>')}
      else if(c==='fn'){var f=selHTML()||'Примечание: ';document.execCommand('insertHTML',false,'<blockquote class="fn">'+sanitize(f)+'</blockquote><p><br></p>')}
      else if(c==='media'){fin.click();return}
      else if(c==='prev'){view(opts.title?opts.title():'',sanitize(area.innerHTML));return}
      else if(c==='emo'){mkp.classList.remove('on');emo.classList.toggle('on');return}
      else if(c==='clear'){document.execCommand('removeFormat');document.execCommand('formatBlock',false,'p')}
      keep()});
    return {getHTML:function(){if(!isRich(area.innerHTML))return area.textContent.trim();var h=sanitize(area.innerHTML).replace(/(<p><br><\/p>|<br>)+$/,'');return (toText(h)||/<figure/.test(h))?h:''},setHTML:function(h){area.innerHTML=sanitize(h||'')},focus:function(){area.focus()},el:area,pending:function(){return pend}};
  }
  function fsize(n){n=+n||0;return n>1048576?(n/1048576).toFixed(1).replace('.',',')+' МБ':n>1024?Math.round(n/1024)+' КБ':n?n+' Б':''}
  function hydrate(root){(root||document).querySelectorAll('figure.g11m').forEach(function(f){if(f.__h&&f.firstChild)return;f.__h=1;var k=f.getAttribute('data-k'),id=f.getAttribute('data-id'),nm=f.getAttribute('data-n')||'',ed=!!f.closest('.rte-area'),view='https://drive.google.com/file/d/'+id+'/view';
    var h='';if(k==='img')h='<img src="https://drive.google.com/thumbnail?id='+id+'&sz=w1600" alt="'+esc(nm)+'" loading="lazy">';
    else if(k==='vid')h=ed?'<span class="g11fc"><span class="fi play"><i data-i="video"></i></span><span><b>'+esc(nm||'Видео')+'</b><small>видео · '+fsize(f.getAttribute('data-s'))+' · в статье будет плеер</small></span></span>':'<div class="g11v"><iframe src="https://drive.google.com/file/d/'+id+'/preview" allow="autoplay; fullscreen" allowfullscreen loading="lazy" title="'+esc(nm)+'"></iframe></div><figcaption>'+esc(nm)+' · <a href="'+view+'" target="_blank" rel="noopener">открыть на Диске</a></figcaption>';
    else h='<a class="g11fc" href="'+view+'" target="_blank" rel="noopener"><span class="fi"><i data-i="file"></i></span><span><b>'+esc(nm||'Файл')+'</b><small>'+esc(fsize(f.getAttribute('data-s')))+' · открыть или скачать</small></span></a>';
    if(ed)h+='<button type="button" class="g11rm" data-rm title="Убрать из текста">✕</button>';f.innerHTML=h})}
  document.addEventListener('click',function(e){var im=e.target.closest('figure.g11m img');if(im&&!im.closest('.rte-area')){view(im.alt||'',' <img class="lbx" src="'+im.src.replace(/sz=w\d+/,'sz=w2400')+'" alt="">');return}
    var rm=e.target.closest('[data-rm]');if(rm){var f=rm.closest('figure');f&&f.remove()}});
  function hyAll(){hydrate(document)}var hyT=null;new MutationObserver(function(){clearTimeout(hyT);hyT=setTimeout(hyAll,30)}).observe(document.documentElement,{childList:true,subtree:true});
  window.G11Rich={sanitize:sanitize,toText:toText,isRich:isRich,editor:editor,clamp:clamp,view:view,hydrate:hydrate};
})();
