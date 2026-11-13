/* Материалы от наставников: шаблоны, ссылки, новости. Видны всем, даже без входа. */
(function(){
  if(window.__g11content)return;window.__g11content=1;
  var file=(location.pathname.split('/').pop()||'index.html');
  if(!/^(index|templates|work|team|article)\.html$/.test(file)&&file!=='')return;
  var KEY='g11_content_cache';
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function when(cb){if(window.G11)cb();else document.addEventListener('g11:ready',cb,{once:true})}
  function d(s){try{var x=new Date(s);return x.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})}catch(e){return ''}}
  function R(s){return window.G11Rich?G11Rich.sanitize(s):esc(s)}
  function copyBtn(el,raw){var b=document.createElement('button');b.className='copy';b.type='button';b.textContent='Копировать';b.onclick=function(){var t=raw!=null&&window.G11Rich?G11Rich.toText(raw):(function(){var c=el.cloneNode(true);c.querySelectorAll('.lbl,.copy,.by').forEach(function(x){x.remove()});return c.textContent.trim()})();
    var ok=function(){b.textContent='Скопировано ✓';b.classList.add('done');setTimeout(function(){b.textContent='Копировать';b.classList.remove('done')},1500)};
    if(navigator.clipboard)navigator.clipboard.writeText(t).then(ok,function(){fb(t);ok()});else{fb(t);ok()}};el.appendChild(b)}
  function fb(t){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(e){}a.remove()}
  function by(x){return '<small class="by" style="display:block;color:var(--muted);font-size:11px;margin-top:6px;display:flex;align-items:center;gap:5px"><i data-i="pencil"></i>'+esc(x.author||'наставник')+' · '+d(x.updated)+'</small>'}
  function article(items){var id=new URLSearchParams(location.search).get('id'),x=items.filter(function(i){return i.id===id&&i.type==='article'})[0],box=document.getElementById('art');if(!box)return;
    if(!x){if(render.final)box.innerHTML='<h2>Статья не найдена</h2><p>Возможно, её удалили или ссылка неполная. <a href="work.html">← В «Работу»</a></p>';return}
    var sp=x.section==='team'?['team.html','<i data-i="users"></i> Команда']:['work.html','<i data-i="briefcase"></i> Работа'];document.title=x.title+' · Группа 11';
    var hh=document.querySelector('header h1');if(hh)hh.textContent=x.title;var hp=document.querySelector('header p');if(hp)hp.innerHTML='<a href="'+sp[0]+'#articles" style="color:#fff">'+sp[1]+'</a> · <i data-i="pencil"></i> '+esc(x.author||'')+' · '+d(x.updated);document.querySelectorAll('.g11bar a').forEach(function(a){var on=a.getAttribute('href')===sp[0];a.classList.toggle('on',on)});
    box.innerHTML='<div class="rich art">'+R(x.text)+'</div><div class="art-foot"><a class="btn alt" href="'+sp[0]+'#articles">← Все статьи</a><button class="btn alt" type="button" id="artcopy">🔗 Скопировать ссылку</button></div>';
    var cb=document.getElementById('artcopy');cb.onclick=function(){var u=location.href;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).catch(function(){fb(u)}).then(function(){cb.textContent='✓ Ссылка скопирована'})}}
  // подраздел шаблонов: «club>Начало заголовка h3» — шаблон встаёт в конец этого подраздела
  var subKey=function(t){return String(t||'').replace(/^[^0-9A-Za-zА-Яа-яЁё«"]+/,'').replace(/\s+/g,' ').trim().slice(0,40)};
  function subPlace(v){var i=v.indexOf('>'),sec=document.getElementById(v.slice(0,i)),k=v.slice(i+1);if(!sec)return null;
    var h=[].filter.call(sec.querySelectorAll('h3'),function(x){return subKey(x.textContent)===k})[0];if(!h)return null;
    var n=h.nextElementSibling;while(n&&!(n.tagName==='H3'||n.tagName==='H2'||(n.classList&&n.classList.contains('src'))))n=n.nextElementSibling;
    return {p:h.parentNode,b:n||null}}
  var CATS=[],TSECS=[],TICO={};function ticon(n){var v=TICO[n]||'clipboard';return /^[a-z0-9]+$/.test(v)?'<i data-i="'+v+'"></i>':esc(v)}function artCat(){}
  function render(items,cats,ts,ti){if(cats)CATS=cats;if(ts)TSECS=ts;if(ti)TICO=ti;
    if(artCat.v==null){artCat.v='';try{artCat.v=sessionStorage.getItem('g11_acat_'+(file==='team.html'?'team':'work'))||''}catch(_){}}
    document.querySelectorAll('[data-g11c]').forEach(function(n){n.remove()});
    var main=document.querySelector('main');if(!main)return;
    if(file==='templates.html'){
      var tpls=items.filter(function(x){return x.type==='template'}),loose=[],own={};
      tpls.forEach(function(x){var sec=x.section&&x.section!=='new'&&document.getElementById(x.section);
        var el=document.createElement('div');el.className='tpl';el.id='c-'+x.id;el.setAttribute('data-g11c','1');el.innerHTML='<span class="lbl"><i data-i="pencil"></i> '+esc(x.title)+'</span><div class="rich" style="white-space:normal">'+R(x.text)+'</div>'+by(x);el.style.whiteSpace='normal';copyBtn(el,x.text);
        var sub=/^[\w-]+>/.test(x.section||'')&&subPlace(x.section);
        if(sub){sub.p.insertBefore(el,sub.b)}
        else if(/^u:/.test(x.section||'')){var nm=x.section.slice(2);(own[nm]=own[nm]||[]).push(el)}else if(sec&&sec.tagName==='SECTION'){var src=sec.querySelector('.src');src?sec.insertBefore(el,src):sec.appendChild(el)}else loose.push(el)});
      // свои разделы наставников: отдельные блоки в конце страницы + кнопка в верхнем меню разделов
      var names=(TSECS||[]).filter(function(n){return own[n]});Object.keys(own).forEach(function(n){if(names.indexOf(n)<0)names.push(n)});
      var chips=document.querySelector('.chips'),last=[].slice.call(main.querySelectorAll(':scope>section')).pop();
      names.forEach(function(n){var id='u-'+n.toLowerCase().replace(/[^0-9a-zа-яё]+/g,'-').replace(/^-|-$/g,'');var s0=document.createElement('section');s0.id=id;s0.setAttribute('data-g11c','1');s0.setAttribute('data-keys',n.toLowerCase()+' наставники');s0.innerHTML='<h2>'+ticon(n)+' '+esc(n)+'</h2>';own[n].forEach(function(e){s0.appendChild(e)});
        last&&last.nextSibling?main.insertBefore(s0,last.nextSibling):main.appendChild(s0);last=s0;
        if(chips){var a=document.createElement('a');a.href='#'+id;a.setAttribute('data-g11c','1');a.innerHTML=ticon(n)+' '+esc(n);chips.appendChild(a)}});
      if(loose.length){var s=document.createElement('section');s.id='mentors';s.setAttribute('data-g11c','1');s.setAttribute('data-keys','новое наставники добавлено');s.innerHTML='<h2>✏️ Новое от наставников</h2>';loose.forEach(function(e){s.appendChild(e)});
        var after=document.getElementById('empathy');after&&after.nextSibling?main.insertBefore(s,after.nextSibling):main.insertBefore(s,main.firstChild)}
    }
    if(file==='work.html'||file==='team.html'){
      var sp=file==='work.html'?'work':'team',L=items.filter(function(x){return x.type==='link'&&(x.section||'work')===sp});
      var A=items.filter(function(x){return x.type==='article'&&(x.section||'work')===sp}).sort(function(a,b){return a.updated<b.updated?1:-1});
      if(A.length){var sa=document.createElement('section');sa.id='articles';sa.setAttribute('data-g11c','1');
        var cnt={},none=0;A.forEach(function(x){if(x.category)cnt[x.category]=(cnt[x.category]||0)+1;else none++});
        var order=(CATS||[]).filter(function(c){return cnt[c]});Object.keys(cnt).forEach(function(c){if(order.indexOf(c)<0)order.push(c)});
        var cur=artCat.v;if(cur&&cur!=='-'&&!cnt[cur])cur='';if(cur==='-'&&!none)cur='';
        var chip=function(v,t,n){return '<button type="button" class="acat'+(v===cur?' on':'')+'" data-acat="'+esc(v)+'">'+t+' <span>'+n+'</span></button>'};
        var chips=order.length?'<div class="acats" role="group" aria-label="Категории статей">'+chip('','Все',A.length)+order.map(function(c){return chip(c,'<i data-i="tag"></i>'+esc(c),cnt[c])}).join('')+(none?chip('-','Без категории',none):'')+'</div>':'';
        sa.innerHTML='<h2>📄 Статьи от наставников</h2>'+chips+'<div class="grid">'+A.map(function(x){var t=window.G11Rich?G11Rich.toText(x.text):String(x.text||'');t=t.replace(/https?:\/\/\S+/g,'(ссылка)').replace(/\s+/g,' ').trim();return '<a class="link" id="c-'+x.id+'" data-cat="'+esc(x.category||'-')+'" href="article.html?id='+encodeURIComponent(x.id)+'"'+(cur&&(x.category||'-')!==cur?' hidden':'')+'>'+(x.category?'<span class="acat-t"><i data-i="tag"></i>'+esc(x.category)+'</span>':'')+'<b>'+esc(x.title)+'</b>'+esc(t.slice(0,170))+(t.length>170?'…':'')+'<br><small><i data-i="pencil"></i> '+esc(x.author||'')+' · '+d(x.updated)+'</small></a>'}).join('')+'</div>';
        sa.addEventListener('click',function(e){var b=e.target.closest('[data-acat]');if(!b)return;artCat.v=b.dataset.acat;try{sessionStorage.setItem('g11_acat_'+sp,artCat.v)}catch(_){}
          sa.querySelectorAll('[data-acat]').forEach(function(z){z.classList.toggle('on',z===b)});sa.querySelectorAll('.grid .link').forEach(function(a){a.hidden=!!artCat.v&&a.dataset.cat!==artCat.v})});
        var f1=main.querySelector('section');f1&&f1.nextSibling?main.insertBefore(sa,f1.nextSibling):main.appendChild(sa)}
      if(L.length){var s2=document.createElement('section');s2.id='mentor-links';s2.setAttribute('data-g11c','1');s2.innerHTML='<h2>🔗 Добавлено наставниками</h2><div class="grid">'+L.map(function(x){return '<a class="link" id="c-'+x.id+'" href="'+esc(x.url)+'" target="_blank" rel="noopener"><b>'+esc(x.title)+'</b>'+esc(x.text||'')+'<br><small>'+esc((x.url.split('/')[2]||''))+' · <i data-i="pencil"></i> '+esc(x.author||'')+'</small></a>'}).join('')+'</div>';
        var first=main.querySelector('section');first&&first.nextSibling?main.insertBefore(s2,first.nextSibling):main.appendChild(s2)}
    }
    if(file==='index.html'||file===''){
      var N=items.filter(function(x){return x.type==='news'}).sort(function(a,b){return a.updated<b.updated?1:-1}).slice(0,6);
      if(N.length){var s3=document.createElement('section');s3.id='news';s3.setAttribute('data-g11c','1');s3.style.marginTop='18px';s3.innerHTML='<h2>📰 Новости группы</h2>'+N.map(function(x){return '<div class="note" id="c-'+x.id+'"><b>'+esc(x.title)+'</b>'+(x.text?'<div class="rich" style="margin-top:4px">'+R(x.text)+'</div>':'')+(x.url?'<div><a href="'+esc(x.url)+'" target="_blank" rel="noopener">Подробнее →</a></div>':'')+by(x)+'</div>'}).join('');
        var st=document.getElementById('start');st&&st.nextSibling?main.insertBefore(s3,st.nextSibling):main.insertBefore(s3,main.firstChild);
        if(window.G11Rich)s3.querySelectorAll('.note').forEach(function(n,i){var r=n.querySelector('.rich');r&&G11Rich.clamp(r,{max:200,title:N[i].title})})}
    }
    if(file==='article.html')article(items);
    if(file==='templates.html'&&window.G11Rich)document.querySelectorAll('.tpl[data-g11c] .rich').forEach(function(r){var t=r.closest('.tpl').querySelector('.lbl');G11Rich.clamp(r,{max:260,title:t?t.textContent.trim():''})});
    var h=location.hash;try{h=decodeURIComponent(h)}catch(_){}if(/^#(c|u)-/.test(h)&&!render.j){var t=document.getElementById(h.slice(1));if(t){render.j=1;setTimeout(function(){var nv=0;document.querySelectorAll('nav,.g11bar').forEach(function(n){var cs=getComputedStyle(n);if(cs.position==='sticky')nv=Math.max(nv,n.getBoundingClientRect().height)});window.scrollTo({top:t.getBoundingClientRect().top+scrollY-nv-16,behavior:'smooth'});t.classList.add('g11hl');setTimeout(function(){t.classList.remove('g11hl')},1800)},350)}}
  }
  (function(){var st=document.createElement('style');st.textContent='.acats{display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 14px}.acat{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--soft);color:var(--accent);border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.acat span{font-weight:600;font-size:12px;opacity:.7}.acat.on{background:var(--accent);color:#fff;border-color:var(--accent)}.acat.on span{opacity:.9}.acat .g11i{width:14px;height:14px}.acat-t{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);margin-bottom:4px}.acat-t .g11i{width:12px;height:12px}.grid .link[hidden]{display:none!important}#articles .link,#mentor-links .link,#news .note{min-width:0;overflow-wrap:anywhere;word-break:break-word}#articles .grid,#mentor-links .grid{min-width:0}@media(max-width:699px){.acats{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.acats::-webkit-scrollbar{display:none}.acat{white-space:nowrap;flex:none}}';document.head.appendChild(st)})();
  try{var c=JSON.parse(localStorage.getItem(KEY)||'null');if(c&&c.items){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){render(c.items,c.cats,c.ts,c.ti)});else render(c.items,c.cats,c.ts,c.ti)}}catch(e){}
  when(function(){G11.api('content').then(function(j){render.final=1;try{localStorage.setItem(KEY,JSON.stringify({items:j.items,cats:j.categories,ts:j.tsections,ti:j.ticons,t:Date.now()}))}catch(e){}render(j.items,j.categories,j.tsections,j.ticons)}).catch(function(){})});
  window.G11Content={refresh:function(){G11.api('content').then(function(j){try{localStorage.setItem(KEY,JSON.stringify({items:j.items,cats:j.categories,ts:j.tsections,ti:j.ticons}))}catch(e){}render(j.items,j.categories,j.tsections,j.ticons)})}};
})();
