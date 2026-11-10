/* Поиск по всему порталу: страницы, разделы, шаблоны, ссылки, термины. Открыть: кнопка 🔍, «/» или Ctrl+K */
(function(){
  if(window.__g11search)return;window.__g11search=1;
  var IDX=null,loading=false,sel=0,res=[];
  var SYN={'отказ':['отмен','отказ'],'отмен':['отмен','отказ'],'деньг':['деньг','дс','возвр'],'вернут':['возвр','верн'],'возвр':['возвр','верн'],'обрат':['обратн'],'кошел':['кошел','wb банк'],'номер':['номер','телефон'],'телеф':['телефон','номер'],'клуб':['клуб','подписк'],'подпи':['подписк','клуб'],'рассро':['рассроч','частями','кредит'],'частям':['частями','рассроч'],'пвз':['пвз','пункт выдачи'],'пункт':['пункт','пвз'],'оцен':['оцен','звезд'],'паспор':['паспорт','госуслуг'],'госус':['госуслуг','паспорт'],'зарпл':['зарплат','выплат','зп','гпх'],'зп':['зп','зарплат','выплат'],'отпус':['отпуск'],'перерыв':['перерыв','обед'],'смен':['смен','график'],'св':['св','супервайзер','передач'],'передач':['передач','св'],'сд':['сд','service desk','заявк'],'кабин':['кабинет','лк'],'лк':['лк','кабинет','личн'],'преми':['преми','kpi'],'kpi':['kpi','преми','кпи'],'кпи':['kpi','кпи'],'шабл':['шаблон'],'ложн':['ложн','ошибочн','неверн'],'ошибоч':['ошибочн','ложн','неверн'],'невер':['неверн','ошибочн','ложн'],'баг':['баг','сбой','ошибк'],'сбой':['сбой','баг','ошибк'],'глюк':['сбой','баг','ошибк'],'вип':['vip','вип'],'vip':['vip','вип'],'кешбэ':['кешбэк','кэшбэк'],'кэшбэ':['кешбэк','кэшбэк'],'ягод':['ягод','балл'],'балл':['балл','ягод'],'новост':['новост'],'уведом':['уведомл','пуш','смс'],'просро':['просроч','задерж'],'задерж':['задерж','просроч'],'неподб':['неподбор','склад']};
  function nz(s){return String(s||'').toLowerCase().replace(/ё/g,'е')}
  function alts(w){var st=w.length>=6?w.slice(0,5):w;for(var k in SYN){if(st.indexOf(k)===0||(k.indexOf(st)===0&&st.length>=3))return SYN[k].concat([st])}return [st]}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  var css='.g11s{position:fixed;inset:0;z-index:120;background:rgba(20,16,32,.55);display:none;align-items:flex-start;justify-content:center;padding:8vh 12px 12px}.g11s.on{display:flex}'+
  '.g11s .box{width:100%;max-width:640px;background:var(--card,#fff);color:var(--ink,#1d1730);border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden;font:15px/1.45 -apple-system,"Segoe UI",Roboto,Arial,sans-serif}'+
  '.g11s input{width:100%;box-sizing:border-box;border:0;border-bottom:1px solid var(--line,#e6e1f2);padding:16px 18px;font:inherit;font-size:17px;background:transparent;color:inherit;outline:0}'+
  '.g11s .list{max-height:60vh;overflow:auto;padding:6px}.g11s a{display:block;text-decoration:none;color:inherit;padding:10px 12px;border-radius:10px}.g11s a.on,.g11s a:hover{background:var(--soft,#f1e8fb)}'+
  '.g11s a b{display:block;color:var(--accent,#7b2cbf);font-size:15px}.g11s a small{display:block;color:var(--muted,#6b6480);font-size:12px}.g11s a span{display:block;font-size:13px;margin-top:2px;color:var(--ink,#1d1730);opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
  '.g11s .hint{padding:10px 16px;color:var(--muted,#6b6480);font-size:12px;border-top:1px solid var(--line,#e6e1f2);display:flex;gap:12px;flex-wrap:wrap}.g11s .hint kbd{background:var(--soft,#f1e8fb);border-radius:5px;padding:1px 6px;font:inherit}'+
  '.g11s .empty{padding:20px;text-align:center;color:var(--muted,#6b6480)}.g11s .chips{display:flex;flex-wrap:wrap;gap:6px;padding:12px}.g11s .chips button{border:1px solid var(--line,#e6e1f2);background:var(--soft,#f1e8fb);color:var(--accent,#7b2cbf);border-radius:999px;padding:5px 11px;font:inherit;font-size:13px;cursor:pointer}'+
  '.g11sbtn{background:rgba(255,255,255,.1)!important;color:#fff!important;border:0;border-radius:9px;padding:7px 12px;font:600 13px/1 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer;margin-right:6px;white-space:nowrap}.g11sbtn kbd{opacity:.6;font:inherit;margin-left:6px}@media(max-width:520px){.g11sbtn kbd,.g11sbtn .t{display:none}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var m=document.createElement('div');m.className='g11s';m.innerHTML='<div class="box" role="dialog" aria-label="Поиск по порталу"><input type="search" placeholder="🔍 Поиск по всему порталу: отмена заказа, отпуск, ягодки, формат СВ…" autocomplete="off"><div class="list"></div><div class="hint"><span><kbd>↑</kbd><kbd>↓</kbd> выбрать</span><span><kbd>Enter</kbd> открыть</span><span><kbd>Esc</kbd> закрыть</span></div></div>';
  document.body.appendChild(m);var inp=m.querySelector('input'),list=m.querySelector('.list');
  var HOT=['шаблоны отмена заказа','формат передачи СВ','ягодки','мой кабинет','отпуск','калькулятор премии','правила смены','госуслуги','кеш веб-кц','рассрочка'];
  function extra(){try{var c=JSON.parse(localStorage.getItem('g11_content_cache')||'null');return (c&&c.items||[]).map(function(x){var tx=window.G11Rich?G11Rich.toText(x.text):String(x.text||'');return {t:'✏️ '+x.title,p:x.type==='template'?'📋 Шаблоны → от наставников':x.type==='link'?'🔗 Ссылка от наставников':x.type==='article'?'📄 Статья · '+(x.section==='team'?'Команда':'Работа'):'📰 Новость',u:x.type==='template'?'templates.html#c-'+x.id:x.type==='link'?x.url:x.type==='article'?'article.html?id='+encodeURIComponent(x.id):'index.html#c-'+x.id,k:x.type==='template'?'tpl':'link',x:tx.slice(0,140),w:tx,ext:x.type==='link'}})}catch(e){return []}}
  function load(cb){if(IDX)return cb();if(loading)return;loading=true;var s=document.createElement('script');s.src='search-index.js?v='+(window.G11_INDEX_V||1);s.onload=function(){IDX=window.G11_INDEX||[];cb()};s.onerror=function(){IDX=[];cb()};document.head.appendChild(s)}
  var W={page:30,section:22,sub:14,tpl:12,link:10,term:8};
  var EN="qwertyuiop[]asdfghjkl;'zxcvbnm,.`",RU='йцукенгшщзхъфывапролджэячсмитьбюё';
  function swap(s){return s.replace(/[a-z\[\];',.`]/g,function(c){var i=EN.indexOf(c);return i<0?c:RU.charAt(i)})}
  function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;var p=[],i,j;for(j=0;j<=b.length;j++)p[j]=j;for(i=1;i<=a.length;i++){var c=[i];for(j=1;j<=b.length;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[b.length]}
  var DOCS=null,VOC=null;
  function prep(){if(DOCS)return;DOCS=IDX.concat(extra()).map(function(e){return {e:e,t:nz(e.t),b:nz(e.p+' '+(e.x||'')+' '+(e.w||''))}});VOC={};DOCS.forEach(function(d){(d.t+' '+d.b).split(/[^a-zа-я0-9]+/).forEach(function(w){if(w.length>=4)VOC[w]=(VOC[w]||0)+1})})}
  function hits(a){var n=0;for(var i=0;i<DOCS.length;i++){if(DOCS[i].t.indexOf(a)>-1||DOCS[i].b.indexOf(a)>-1)n++}return n}
  // слово, которого нет нигде: пробуем раскладку, потом ищем похожее слово с 1–2 опечатками
  function fix(w){if(w.length<3||hits(w.length>=6?w.slice(0,5):w))return w;if(/^[a-z\[\];',.`]+$/.test(w)){var s=swap(w);if(hits(s.length>=6?s.slice(0,5):s))return s}
    if(w.length<4)return w;var max=w.length>=7?2:1,best=null,bd=9,bf=0;for(var v in VOC){if(Math.abs(v.length-w.length)>max)continue;var d=lev(w,v);if(d<=max&&(d<bd||(d===bd&&VOC[v]>bf))){bd=d;bf=VOC[v];best=v}}return best||w}
  function search(q){prep();var ws=nz(q).replace(/[«»"“”.,:;!?()]/g,' ').split(/\s+/).filter(Boolean);
    ws=ws.filter(function(w){return w.length>1||/\d/.test(w)});if(!ws.length)return [];
    var fixed=ws.map(fix),A=fixed.map(alts),out=[];search.fixed=fixed.join(' ')!==ws.join(' ')?fixed.join(' '):'';
    // слово, которое встречается редко, важнее частого
    var wt=A.map(function(al){var n=0;al.forEach(function(a){n=Math.max(n,hits(a))});return n?1+Math.log(DOCS.length/n):0});
    var need=ws.length<=2?1:Math.ceil(ws.length*.6),phrase=nz(q).trim();
    DOCS.forEach(function(d){var sc=0,cnt=0;A.forEach(function(al,i){var inT=al.some(function(a){return d.t.indexOf(a)>-1}),inB=inT||al.some(function(a){return d.b.indexOf(a)>-1});if(inT)sc+=10*wt[i];else if(inB)sc+=2*wt[i];if(inB)cnt++});
      if(cnt<need)return;if(d.t.indexOf(phrase)>-1)sc+=40;else if(d.t.indexOf(phrase)===0)sc+=15;
      sc*=cnt===ws.length?1.6:cnt/ws.length;out.push({e:d.e,s:sc+(W[d.e.k]||0)})});
    out.sort(function(a,b){return b.s-a.s});return out.slice(0,40).map(function(x){return x.e})}
  function draw(){var q=inp.value.trim();if(!q){list.innerHTML='<div class="chips">'+HOT.map(function(h){return '<button type="button">'+esc(h)+'</button>'}).join('')+'</div>';res=[];return}
    res=search(q);sel=0;var hq='helper.html?q='+encodeURIComponent(q),help='<a href="'+esc(hq)+'" data-i="'+res.length+'"'+(res.length?'':' class="on"')+'><b>🤖 Подобрать ответ в помощнике оператора</b><small>Поиск по шпаргалке, новостям и всем шаблонам БЗ</small><span>«'+esc(q)+'»</span></a>';res.push({u:hq});
    list.innerHTML=(search.fixed?'<div class="empty" style="padding:8px 12px;text-align:left">✏️ Ищем: <b>'+esc(search.fixed)+'</b></div>':'')+(res.length>1?res.map(function(e,i){return '<a href="'+esc(e.u)+'"'+(e.ext?' target="_blank" rel="noopener"':'')+' data-i="'+i+'"'+(i===0?' class="on"':'')+'><b>'+esc(e.t)+(e.ext?' ↗':'')+'</b><small>'+esc(e.p)+'</small>'+(e.x?'<span>'+esc(e.x)+'</span>':'')+'</a>'}).slice(0,res.length-1).join('')+help:'<div class="empty">В разделах шпаргалки ничего не нашлось — попробуйте помощника или спросите во «Флудилке».</div>'+help)}
  function hi(){[].forEach.call(list.querySelectorAll('a'),function(a,i){a.classList.toggle('on',i===sel);if(i===sel)a.scrollIntoView({block:'nearest'})})}
  function open(){m.classList.add('on');load(draw);setTimeout(function(){inp.focus();inp.select()},30)}
  function close(){m.classList.remove('on')}
  inp.addEventListener('input',function(){load(draw)});
  inp.addEventListener('keydown',function(e){if(e.key==='ArrowDown'){sel=Math.min(res.length-1,sel+1);hi();e.preventDefault()}else if(e.key==='ArrowUp'){sel=Math.max(0,sel-1);hi();e.preventDefault()}else if(e.key==='Enter'){var a=list.querySelectorAll('a')[sel];if(a){a.click();close()}e.preventDefault()}else if(e.key==='Escape')close()});
  m.addEventListener('click',function(e){if(e.target===m)close();var b=e.target.closest('.chips button');if(b){inp.value=b.textContent;draw();inp.focus()}var a=e.target.closest('a');if(a)setTimeout(close,50)});
  document.addEventListener('keydown',function(e){var t=e.target,typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable);if((e.key==='/'&&!typing)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){e.preventDefault();open()}if(e.key==='Escape'&&m.classList.contains('on'))close()});
  var slot=document.getElementById('g11acc');if(slot){var b=document.createElement('button');b.type='button';b.className='g11sbtn';b.innerHTML='🔍<span class="t"> Поиск</span><kbd>/</kbd>';b.onclick=open;slot.parentNode.insertBefore(b,slot)}
  window.G11Search={open:open};
})();
