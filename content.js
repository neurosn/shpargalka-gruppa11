/* Материалы от наставников: шаблоны, ссылки, новости. Видны всем, даже без входа. */
(function(){
  if(window.__g11content)return;window.__g11content=1;
  var file=(location.pathname.split('/').pop()||'index.html');
  if(!/^(index|templates|work|team)\.html$/.test(file)&&file!=='')return;
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
  function render(items){
    document.querySelectorAll('[data-g11c]').forEach(function(n){n.remove()});
    var main=document.querySelector('main');if(!main)return;
    if(file==='templates.html'){
      var tpls=items.filter(function(x){return x.type==='template'}),loose=[];
      tpls.forEach(function(x){var sec=x.section&&x.section!=='new'&&document.getElementById(x.section);
        var el=document.createElement('div');el.className='tpl';el.setAttribute('data-g11c','1');el.innerHTML='<span class="lbl">✏️ '+esc(x.title)+'</span><div class="rich" style="white-space:normal">'+R(x.text)+'</div>'+by(x);el.style.whiteSpace='normal';copyBtn(el,x.text);
        if(sec&&sec.tagName==='SECTION'){var src=sec.querySelector('.src');src?sec.insertBefore(el,src):sec.appendChild(el)}else loose.push(el)});
      if(loose.length){var s=document.createElement('section');s.id='mentors';s.setAttribute('data-g11c','1');s.setAttribute('data-keys','новое наставники добавлено');s.innerHTML='<h2>✏️ Новое от наставников</h2>';loose.forEach(function(e){s.appendChild(e)});
        var after=document.getElementById('empathy');after&&after.nextSibling?main.insertBefore(s,after.nextSibling):main.insertBefore(s,main.firstChild)}
    }
    if(file==='work.html'||file==='team.html'){
      var sp=file==='work.html'?'work':'team',L=items.filter(function(x){return x.type==='link'&&(x.section||'work')===sp});
      if(L.length){var s2=document.createElement('section');s2.id='mentor-links';s2.setAttribute('data-g11c','1');s2.innerHTML='<h2>🔗 Добавлено наставниками</h2><div class="grid">'+L.map(function(x){return '<a class="link" href="'+esc(x.url)+'" target="_blank" rel="noopener"><b>'+esc(x.title)+'</b>'+esc(x.text||'')+'<br><small>'+esc((x.url.split('/')[2]||''))+' · ✏️ '+esc(x.author||'')+'</small></a>'}).join('')+'</div>';
        var first=main.querySelector('section');first&&first.nextSibling?main.insertBefore(s2,first.nextSibling):main.appendChild(s2)}
    }
    if(file==='index.html'||file===''){
      var N=items.filter(function(x){return x.type==='news'}).sort(function(a,b){return a.updated<b.updated?1:-1}).slice(0,6);
      if(N.length){var s3=document.createElement('section');s3.id='news';s3.setAttribute('data-g11c','1');s3.style.marginTop='18px';s3.innerHTML='<h2>📰 Новости группы</h2>'+N.map(function(x){return '<div class="note"><b>'+esc(x.title)+'</b>'+(x.text?'<div class="rich" style="margin-top:4px">'+R(x.text)+'</div>':'')+(x.url?'<div><a href="'+esc(x.url)+'" target="_blank" rel="noopener">Подробнее →</a></div>':'')+by(x)+'</div>'}).join('');
        var st=document.getElementById('start');st&&st.nextSibling?main.insertBefore(s3,st.nextSibling):main.insertBefore(s3,main.firstChild)}
    }
  }
  try{var c=JSON.parse(localStorage.getItem(KEY)||'null');if(c&&c.items){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){render(c.items)});else render(c.items)}}catch(e){}
  when(function(){G11.api('content').then(function(j){try{localStorage.setItem(KEY,JSON.stringify({items:j.items,t:Date.now()}))}catch(e){}render(j.items)}).catch(function(){})});
  window.G11Content={refresh:function(){G11.api('content').then(function(j){try{localStorage.setItem(KEY,JSON.stringify({items:j.items}))}catch(e){}render(j.items)})}};
})();
