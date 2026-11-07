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
      if(t==='H1'||t==='H2'){t='H3'}
      if(!TAGS[t]){out.appendChild(inner);return}
      var e=doc.createElement(t);
      if(t==='A'){var h=n.getAttribute('href');if(!okHref(h)){out.appendChild(inner);return}e.setAttribute('href',h.trim());if(/^https?:/i.test(h)){e.setAttribute('target','_blank');e.setAttribute('rel','noopener')}}
      if(t==='BLOCKQUOTE'&&/\bfn\b/.test(n.getAttribute('class')||''))e.setAttribute('class','fn');
      e.appendChild(inner);out.appendChild(e)});
    return out}
  function isRich(s){return /<(b|strong|i|em|u|s|mark|a|br|p|div|ul|ol|li|hr|h3|h4|blockquote|small|sup)\b/i.test(String(s||''))}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function sanitize(html){if(!isRich(html))return esc(html).replace(/\n/g,'<br>');var doc=document.implementation.createHTMLDocument('x');var box=doc.createElement('div');box.innerHTML=String(html);var res=doc.createElement('div');res.appendChild(clean(box,doc));return res.innerHTML}
  function toText(html){if(!isRich(html))return String(html||'');var d=document.createElement('div');d.innerHTML=sanitize(html);
    d.querySelectorAll('hr').forEach(function(h){h.replaceWith('\n———\n')});d.querySelectorAll('br').forEach(function(b){b.replaceWith('\n')});
    d.querySelectorAll('li').forEach(function(l){l.insertAdjacentText('afterbegin',l.parentNode&&l.parentNode.tagName==='OL'?'':'• ');l.insertAdjacentText('beforeend','\n')});
    d.querySelectorAll('ol').forEach(function(o){var i=1;o.querySelectorAll(':scope>li').forEach(function(l){l.insertAdjacentText('afterbegin',(i++)+'. ')})});
    d.querySelectorAll('p,div,h3,h4,blockquote').forEach(function(p){p.insertAdjacentText('beforeend','\n')});
    return d.textContent.replace(/\n{3,}/g,'\n\n').trim()}
  var EMO='😊 🙂 😉 😍 🤗 🙏 👍 👏 💪 🎉 🔥 ⭐ 💜 ❤️ ✅ ❌ ⚠️ ❗ ❓ 💡 📌 📎 📣 📝 📋 📦 🚚 🏬 💳 💰 🎁 🔗 🔍 ⏰ ⏳ 📅 ☕ 🍓 🛒 📱 💬 🧾 🛡 🚀 ➡️ 👉 ✔️'.split(' ');
  var css='.rte{border:1px solid var(--line);border-radius:12px;background:var(--bg);overflow:hidden}.rte-bar{display:flex;flex-wrap:wrap;gap:4px;padding:6px;border-bottom:1px solid var(--line);background:var(--card);position:sticky;top:0;z-index:2}'+
  '.rte-bar button{border:1px solid transparent;background:transparent;color:var(--ink);border-radius:8px;min-width:34px;height:34px;padding:0 8px;font:600 14px/1 inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px}.rte-bar button:hover{background:var(--soft);border-color:var(--line)}.rte-bar .sep{width:1px;background:var(--line);margin:4px 2px}'+
  '.rte-area{min-height:180px;padding:12px 14px;outline:0;font-size:16px;line-height:1.6;color:var(--ink)}.rte-area:empty:before{content:attr(data-ph);color:var(--muted)}'+
  '.rte-emo{display:none;flex-wrap:wrap;gap:2px;padding:6px;border-bottom:1px solid var(--line);background:var(--card)}.rte-emo.on{display:flex}.rte-emo button{border:0;background:none;font-size:20px;width:36px;height:36px;border-radius:8px;cursor:pointer}.rte-emo button:hover{background:var(--soft)}'+
  '.rich{line-height:1.6}.rich p{margin:0 0 8px}.rich h3,.rich h4{margin:12px 0 6px;color:var(--accent);font-size:17px}.rich ul,.rich ol{margin:6px 0 8px;padding-left:22px}.rich li{margin:3px 0}.rich hr{border:0;border-top:2px dashed var(--line);margin:12px 0}'+
  '.rich mark{background:rgba(255,196,0,.35);color:inherit;border-radius:4px;padding:0 3px}.rich a{color:var(--accent);font-weight:600}.rich blockquote{margin:8px 0;padding:8px 12px;border-left:4px solid var(--accent);background:var(--soft);border-radius:8px}'+
  '.rich blockquote.fn{font-size:14px;color:var(--muted);border-left-color:var(--warn)}.rich small{color:var(--muted)}.rte-area mark{background:rgba(255,196,0,.35);border-radius:4px;padding:0 3px}.rte-area blockquote{margin:8px 0;padding:8px 12px;border-left:4px solid var(--accent);background:var(--soft);border-radius:8px}.rte-area blockquote.fn{font-size:14px;color:var(--muted);border-left-color:var(--warn)}.rte-area hr{border:0;border-top:2px dashed var(--line);margin:12px 0}.rte-area h3{color:var(--accent);font-size:17px;margin:10px 0 4px}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  function editor(root,ph){
    root.classList.add('rte');
    root.innerHTML='<div class="rte-bar">'+
      '<button type="button" data-c="bold" title="Жирный (Ctrl+B)"><b>Ж</b></button><button type="button" data-c="italic" title="Курсив (Ctrl+I)"><i>К</i></button><button type="button" data-c="underline" title="Подчеркнуть (Ctrl+U)"><u>Ч</u></button>'+
      '<button type="button" data-c="mark" title="Выделить маркером"><mark style="background:rgba(255,196,0,.5);padding:0 3px;border-radius:3px">А</mark></button><span class="sep"></span>'+
      '<button type="button" data-c="h3" title="Подзаголовок">H</button><button type="button" data-c="ul" title="Список">• список</button><button type="button" data-c="ol" title="Нумерованный список">1. список</button><span class="sep"></span>'+
      '<button type="button" data-c="link" title="Ссылка">🔗 ссылка</button><button type="button" data-c="hr" title="Разделитель">— разделитель</button><button type="button" data-c="quote" title="Важный блок">❝ блок</button><button type="button" data-c="fn" title="Сноска / примечание">✱ сноска</button><span class="sep"></span>'+
      '<button type="button" data-c="emo" title="Смайлы">😊</button><button type="button" data-c="clear" title="Убрать оформление">⌫ формат</button></div>'+
      '<div class="rte-emo">'+EMO.map(function(e){return '<button type="button" data-e="'+e+'">'+e+'</button>'}).join('')+'</div>'+
      '<div class="rte-area" contenteditable="true" data-ph="'+esc(ph||'Начните печатать…')+'"></div>';
    var area=root.querySelector('.rte-area'),emo=root.querySelector('.rte-emo'),saved=null;
    function keep(){var s=window.getSelection();if(s.rangeCount&&area.contains(s.anchorNode))saved=s.getRangeAt(0).cloneRange()}
    function restore(){area.focus();if(saved){var s=window.getSelection();s.removeAllRanges();s.addRange(saved)}}
    area.addEventListener('keyup',keep);area.addEventListener('mouseup',keep);area.addEventListener('blur',keep);
    area.addEventListener('paste',function(e){var h=(e.clipboardData||window.clipboardData).getData('text/html'),t=(e.clipboardData||window.clipboardData).getData('text/plain');e.preventDefault();document.execCommand('insertHTML',false,h?sanitize(h):esc(t).replace(/\n/g,'<br>'))});
    function selHTML(){var s=window.getSelection();if(!s.rangeCount)return '';var d=document.createElement('div');d.appendChild(s.getRangeAt(0).cloneContents());return d.innerHTML}
    root.querySelector('.rte-bar').addEventListener('mousedown',function(e){if(e.target.closest('button'))e.preventDefault()});
    emo.addEventListener('mousedown',function(e){if(e.target.closest('button'))e.preventDefault()});
    root.addEventListener('click',function(e){var b=e.target.closest('[data-c]'),em=e.target.closest('[data-e]');
      if(em){restore();document.execCommand('insertText',false,em.dataset.e);keep();return}
      if(!b)return;var c=b.dataset.c;restore();
      if(c==='bold'||c==='italic'||c==='underline')document.execCommand(c);
      else if(c==='mark'){var h=selHTML();if(h)document.execCommand('insertHTML',false,'<mark>'+sanitize(h)+'</mark>')}
      else if(c==='h3')document.execCommand('formatBlock',false,'h3');
      else if(c==='ul')document.execCommand('insertUnorderedList');else if(c==='ol')document.execCommand('insertOrderedList');
      else if(c==='link'){var u=prompt('Адрес ссылки (https://…)','https://');if(u&&okHref(u)){var tx=window.getSelection().toString();if(tx)document.execCommand('createLink',false,u);else document.execCommand('insertHTML',false,'<a href="'+esc(u)+'">'+esc(u)+'</a>')}else if(u)alert('Ссылка должна начинаться с https://')}
      else if(c==='hr')document.execCommand('insertHTML',false,'<hr><p><br></p>');
      else if(c==='quote'){var q=selHTML()||'Важно: ';document.execCommand('insertHTML',false,'<blockquote>'+sanitize(q)+'</blockquote><p><br></p>')}
      else if(c==='fn'){var f=selHTML()||'Примечание: ';document.execCommand('insertHTML',false,'<blockquote class="fn">'+sanitize(f)+'</blockquote><p><br></p>')}
      else if(c==='emo'){emo.classList.toggle('on');return}
      else if(c==='clear'){document.execCommand('removeFormat');document.execCommand('formatBlock',false,'p')}
      keep()});
    return {getHTML:function(){if(!isRich(area.innerHTML))return area.textContent.trim();var h=sanitize(area.innerHTML).replace(/(<p><br><\/p>|<br>)+$/,'');return toText(h)?h:''},setHTML:function(h){area.innerHTML=sanitize(h||'')},focus:function(){area.focus()},el:area};
  }
  window.G11Rich={sanitize:sanitize,toText:toText,isRich:isRich,editor:editor};
})();
