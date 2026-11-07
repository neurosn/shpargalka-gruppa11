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
  function by(x){return '<small class="by" style="display:block;color:var(--muted);font-size:11px;margin-top:6px">✏️ '+esc(x.author||'наставник')+' · '+d(x.updated)+'</small>'}
  function article(items){var id=new URLSearchParams(location.search).get('id'),x=items.filter(function(i){return i.id===id&&i.type==='article'})[0],box=document.getElementById('art');if(!box)return;
    if(!x){if(render.final)box.innerHTML='<h2>Статья не найдена</h2><p>Возможно, её удалили или ссылка неполная. <a href="work.html">← В «Работу»</a></p>';return}
    var sp=x.section==='team'?['team.html','👥 Команда']:['work.html','💼 Работа'];document.title=x.title+' · Группа 11';
    var hh=document.querySelector('header h1');if(hh)hh.textContent=x.title;var hp=document.querySelector('header p');if(hp)hp.innerHTML='<a href="'+sp[0]+'#articles" style="color:#fff">'+sp[1]+'</a> · ✏️ '+esc(x.author||'')+' · '+d(x.updated);document.querySelectorAll('.g11bar a').forEach(function(a){var on=a.getAttribute('href')===sp[0];a.classList.toggle('on',on)});
    box.innerHTML='<div class="rich art">'+R(x.text)+'</div><div class="art-foot"><a class="btn alt" href="'+sp[0]+'#articles">← Все статьи</a><button class="btn alt" type="button" id="artcopy">🔗 Скопировать ссылку</button></div>';
    var cb=document.getElementById('artcopy');cb.onclick=function(){var u=location.href;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).catch(function(){fb(u)}).then(function(){cb.textContent='✓ Ссылка скопирована'})}}
  function render(items){
    document.querySelectorAll('[data-g11c]').forEach(function(n){n.remove()});
    var main=document.querySelector('main');if(!main)return;
    if(file==='templates.html'){
      var tpls=items.filter(function(x){return x.type==='template'}),loose=[];
      tpls.forEach(function(x){var sec=x.section&&x.section!=='new'&&document.getElementById(x.section);
        var el=document.createElement('div');el.className='tpl';el.id='c-'+x.id;el.setAttribute('data-g11c','1');el.innerHTML='<span class="lbl">✏️ '+esc(x.title)+'</span><div class="rich" style="white-space:normal">'+R(x.text)+'</div>'+by(x);el.style.whiteSpace='normal';copyBtn(el,x.text);
        if(sec&&sec.tagName==='SECTION'){var src=sec.querySelector('.src');src?sec.insertBefore(el,src):sec.appendChild(el)}else loose.push(el)});
      if(loose.length){var s=document.createElement('section');s.id='mentors';s.setAttribute('data-g11c','1');s.setAttribute('data-keys','новое наставники добавлено');s.innerHTML='<h2>✏️ Новое от наставников</h2>';loose.forEach(function(e){s.appendChild(e)});
        var after=document.getElementById('empathy');after&&after.nextSibling?main.insertBefore(s,after.nextSibling):main.insertBefore(s,main.firstChild)}
    }
    if(file==='work.html'||file==='team.html'){
      var sp=file==='work.html'?'work':'team',L=items.filter(function(x){return x.type==='link'&&(x.section||'work')===sp});
      var A=items.filter(function(x){return x.type==='article'&&(x.section||'work')===sp}).sort(function(a,b){return a.updated<b.updated?1:-1});
      if(A.length){var sa=document.createElement('section');sa.id='articles';sa.setAttribute('data-g11c','1');sa.innerHTML='<h2>📄 Статьи от наставников</h2><div class="grid">'+A.map(function(x){var t=window.G11Rich?G11Rich.toText(x.text):String(x.text||'');t=t.replace(/\s+/g,' ').trim();return '<a class="link" id="c-'+x.id+'" href="article.html?id='+encodeURIComponent(x.id)+'"><b>'+esc(x.title)+'</b>'+esc(t.slice(0,170))+(t.length>170?'…':'')+'<br><small>✏️ '+esc(x.author||'')+' · '+d(x.updated)+'</small></a>'}).join('')+'</div>';
        var f1=main.querySelector('section');f1&&f1.nextSibling?main.insertBefore(sa,f1.nextSibling):main.appendChild(sa)}
      if(L.length){var s2=document.createElement('section');s2.id='mentor-links';s2.setAttribute('data-g11c','1');s2.innerHTML='<h2>🔗 Добавлено наставниками</h2><div class="grid">'+L.map(function(x){return '<a class="link" id="c-'+x.id+'" href="'+esc(x.url)+'" target="_blank" rel="noopener"><b>'+esc(x.title)+'</b>'+esc(x.text||'')+'<br><small>'+esc((x.url.split('/')[2]||''))+' · ✏️ '+esc(x.author||'')+'</small></a>'}).join('')+'</div>';
        var first=main.querySelector('section');first&&first.nextSibling?main.insertBefore(s2,first.nextSibling):main.appendChild(s2)}
    }
    if(file==='index.html'||file===''){
      var N=items.filter(function(x){return x.type==='news'}).sort(function(a,b){return a.updated<b.updated?1:-1}).slice(0,6);
      if(N.length){var s3=document.createElement('section');s3.id='news';s3.setAttribute('data-g11c','1');s3.style.marginTop='18px';s3.innerHTML='<h2>📰 Новости группы</h2>'+N.map(function(x){return '<div class="note" id="c-'+x.id+'"><b>'+esc(x.title)+'</b>'+(x.text?'<div class="rich" style="margin-top:4px">'+R(x.text)+'</div>':'')+(x.url?'<div><a href="'+esc(x.url)+'" target="_blank" rel="noopener">Подробнее →</a></div>':'')+by(x)+'</div>'}).join('');
        var st=document.getElementById('start');st&&st.nextSibling?main.insertBefore(s3,st.nextSibling):main.insertBefore(s3,main.firstChild);
        if(window.G11Rich)s3.querySelectorAll('.note').forEach(function(n,i){var r=n.querySelector('.rich');r&&G11Rich.clamp(r,{max:200,title:N[i].title})})}
    }
    if(file==='article.html')article(items);
    if(file==='templates.html'&&window.G11Rich)document.querySelectorAll('.tpl[data-g11c] .rich').forEach(function(r){var t=r.closest('.tpl').querySelector('.lbl');G11Rich.clamp(r,{max:260,title:t?t.textContent.replace(/^✏️\s*/,''):''})});
    var h=location.hash;if(/^#c-/.test(h)&&!render.j){var t=document.getElementById(h.slice(1));if(t){render.j=1;setTimeout(function(){var nv=0;document.querySelectorAll('nav,.g11bar').forEach(function(n){var cs=getComputedStyle(n);if(cs.position==='sticky')nv=Math.max(nv,n.getBoundingClientRect().height)});window.scrollTo({top:t.getBoundingClientRect().top+scrollY-nv-16,behavior:'smooth'});t.classList.add('g11hl');setTimeout(function(){t.classList.remove('g11hl')},1800)},350)}}
  }
  try{var c=JSON.parse(localStorage.getItem(KEY)||'null');if(c&&c.items){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){render(c.items)});else render(c.items)}}catch(e){}
  when(function(){G11.api('content').then(function(j){render.final=1;try{localStorage.setItem(KEY,JSON.stringify({items:j.items,t:Date.now()}))}catch(e){}render(j.items)}).catch(function(){})});
  window.G11Content={refresh:function(){G11.api('content').then(function(j){try{localStorage.setItem(KEY,JSON.stringify({items:j.items}))}catch(e){}render(j.items)})}};
})();
