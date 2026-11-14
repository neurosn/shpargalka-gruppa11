// ⭐ избранные шаблоны: звёздочка на каждом шаблоне + блок «Избранное» вверху страницы «Шаблоны»
(function(){
  if(!/templates\.html$/.test(location.pathname))return;
  var FAV={},ITEMS=[],busy={};
  var st=document.createElement('style');st.textContent='.tpl .lbl{padding-right:130px}.favb{position:absolute;top:6px;right:104px;border:0;background:none;padding:2px 6px;font-size:20px;line-height:1;color:var(--muted);cursor:pointer;border-radius:8px}.favb:hover{background:var(--card)}.favb.on{color:#f5b301}#favsec .favc{position:relative;border-left:4px solid #f5b301;background:var(--soft);border-radius:10px;padding:10px 14px;margin:8px 0}#favsec .favc b{display:block;margin-bottom:4px;padding-right:220px}#favsec .favc .tx{white-space:pre-wrap;max-height:4.6em;overflow:hidden;color:var(--ink);font-size:14px}#favsec .favc.open .tx{max-height:none}#favsec .favc .ab{position:absolute;top:8px;right:8px;display:flex;gap:6px}#favsec .favc .ab button,#favsec .favc .ab a{border:0;background:var(--accent);color:#fff;border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer;text-decoration:none}#favsec .favc .ab .lt{background:var(--card);color:var(--ink)}#favsec .more{border:0;background:none;color:var(--accent);padding:0;margin-top:4px;font:inherit;font-size:13px;cursor:pointer}';document.head.appendChild(st);
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function key(el){if(el.id)return el.id;var t=((el.querySelector('.lbl')||{}).textContent||'')+'|'+el.textContent.replace(/\s+/g,' ').slice(0,60),h=5381;for(var i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))|0;el.id='s-'+(h>>>0).toString(36);return el.id}
  function title(el){var l=el.querySelector('.lbl');return l?l.textContent.replace(/\s+/g,' ').trim():'Шаблон'}
  function text(el){var c=el.cloneNode(true);c.querySelectorAll('.lbl,.copy,.by,.favb,.cpb').forEach(function(x){x.remove()});var r=c.querySelector('.rich');if(r&&window.G11Rich)return G11Rich.toText(r.innerHTML);return c.textContent.replace(/^\s+|\s+$/g,'')}
  function upd(b){var on=!!FAV[b.dataset.k],t=on?'★':'☆';if(b.textContent===t&&b.classList.contains('on')===on)return;b.textContent=t;b.classList.toggle('on',on);b.title=on?'Убрать из избранного':'Добавить в избранное';b.setAttribute('aria-pressed',on)}
  function deco(){document.querySelectorAll('main .tpl').forEach(function(el){if(el.closest('#favsec'))return;var b=el.querySelector(':scope>.favb');if(!b){b=document.createElement('button');b.type='button';b.className='favb';b.dataset.k=key(el);el.appendChild(b)}upd(b)})}
  function set(items){ITEMS=items||[];FAV={};ITEMS.forEach(function(x){FAV[x.key]=x});deco();box()}
  function copy(t,b){var ok=function(){var o=b.textContent;b.textContent='Скопировано ✓';setTimeout(function(){b.textContent=o},1400)};if(navigator.clipboard)navigator.clipboard.writeText(t).then(ok,function(){});else ok()}
  function box(){var main=document.querySelector('main');if(!main)return;var s=document.getElementById('favsec');
    if(!ITEMS.length){if(s)s.remove();var c0=document.getElementById('favchip');if(c0)c0.remove();return}
    if(!s){s=document.createElement('section');s.id='favsec';s.setAttribute('data-keys','избранное мои');var first=main.querySelector(':scope>section');first?main.insertBefore(s,first):main.appendChild(s)}
    s.innerHTML='<h2>⭐ Избранное <small style="font-weight:400;color:var(--muted);font-size:14px">· видно только вам · ещё они есть в <a href="gen.html#fav">генераторе ответа</a></small></h2>'+ITEMS.map(function(x,i){return '<div class="favc" data-i="'+i+'"><b>'+esc(x.title)+'</b><div class="tx">'+esc(x.text)+'</div>'+(x.text.split('\n').length>3||x.text.length>240?'<button type="button" class="more">показать полностью</button>':'')+'<div class="ab"><button type="button" data-cp="'+i+'">Копировать</button>'+(document.getElementById(x.key)?'<a class="lt" href="#'+esc(x.key)+'">к шаблону</a>':'')+'<button type="button" class="lt" data-un="'+i+'" title="Убрать из избранного">✕</button></div></div>'}).join('');
    var ch=document.querySelector('.chips');if(ch&&!document.getElementById('favchip')){var a=document.createElement('a');a.id='favchip';a.href='#favsec';a.textContent='⭐ Избранное';ch.insertBefore(a,ch.firstChild)}}
  function toggle(k,el){if(!window.G11||!G11.user()){if(window.G11)G11.login();return}if(busy[k])return;busy[k]=1;
    var was=!!FAV[k],t=el?title(el):(FAV[k]||{}).title,x=el?text(el):(FAV[k]||{}).text;
    if(was)delete FAV[k];else FAV[k]={key:k,title:t,text:x};document.querySelectorAll('.favb[data-k="'+k+'"]').forEach(upd);
    G11.api('favToggle',{key:k,title:t,text:x}).then(function(j){set(j.items)}).catch(function(e){if(was)FAV[k]={key:k,title:t,text:x};else delete FAV[k];document.querySelectorAll('.favb[data-k="'+k+'"]').forEach(upd);alert('Не получилось: '+e.message)}).then(function(){busy[k]=0})}
  document.addEventListener('click',function(e){var b=e.target.closest('.favb');if(b){e.preventDefault();toggle(b.dataset.k,b.closest('.tpl'));return}
    var s=e.target.closest('#favsec');if(!s)return;var c=e.target.closest('[data-cp]'),u=e.target.closest('[data-un]'),m=e.target.closest('.more');
    if(c){var x=ITEMS[+c.dataset.cp];if(x)copy(x.text,c)}else if(u){var y=ITEMS[+u.dataset.un];if(y)toggle(y.key,document.getElementById(y.key))}else if(m){var card=m.closest('.favc');card.classList.toggle('open');m.textContent=card.classList.contains('open')?'свернуть':'показать полностью'}});
  function load(){if(!window.G11||!G11.user()){set([]);return}G11.api('favList').then(function(j){set(j.items)}).catch(function(){deco()})}
  var t0;new MutationObserver(function(){clearTimeout(t0);t0=setTimeout(deco,200)}).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
  function go(){deco();load()}
  if(window.G11)go();else document.addEventListener('g11:ready',go,{once:true});
  document.addEventListener('g11:login',load);document.addEventListener('g11:logout',function(){set([])});
})();
