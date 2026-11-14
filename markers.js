// 🏷 свои цветные маркеры шаблонов: у каждого сотрудника свои (хранятся на сервере), общие для страницы «Шаблоны» и генератора
(function(){
  if(window.G11Mark)return;
  var COLORS=['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899'];
  var M={data:{defs:[],map:{}},ready:false,COLORS:COLORS},t0=null,loading=null;
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function fire(){try{document.dispatchEvent(new Event('g11:marks'))}catch(e){}}
  M.esc=esc;
  M.load=function(force){if(!window.G11||!G11.user()){M.data={defs:[],map:{}};M.ready=false;fire();return Promise.resolve(M.data)}
    if(loading&&!force)return loading;loading=G11.api('markGet').then(function(j){M.data=j.data||{defs:[],map:{}};M.data.map=M.data.map||{};M.ready=true;fire();return M.data}).catch(function(){loading=null;return M.data});return loading};
  M.save=function(){clearTimeout(t0);t0=setTimeout(function(){if(window.G11&&G11.user())G11.api('markSave',{data:M.data}).catch(function(e){alert('Маркеры не сохранились: '+e.message)})},700)};
  M.def=function(id){return M.data.defs.filter(function(d){return d.id===id})[0]};
  M.of=function(key){return (M.data.map[key]||[]).map(M.def).filter(Boolean)};
  M.has=function(key,id){return (M.data.map[key]||[]).indexOf(id)>-1};
  M.toggle=function(key,id){var a=(M.data.map[key]||[]).slice(),i=a.indexOf(id);if(i>-1)a.splice(i,1);else a.push(id);if(a.length)M.data.map[key]=a;else delete M.data.map[key];M.save();fire()};
  M.add=function(n,c){n=String(n||'').replace(/\s+/g,' ').trim().slice(0,30);if(!n)return null;var ex=M.data.defs.filter(function(d){return d.n.toLowerCase()===n.toLowerCase()})[0];if(ex)return ex;var d={id:'k'+Date.now().toString(36),n:n,c:c||COLORS[M.data.defs.length%COLORS.length]};M.data.defs.push(d);M.save();fire();return d};
  M.del=function(id){M.data.defs=M.data.defs.filter(function(d){return d.id!==id});Object.keys(M.data.map).forEach(function(k){var a=M.data.map[k].filter(function(x){return x!==id});if(a.length)M.data.map[k]=a;else delete M.data.map[k]});M.save();fire()};
  M.count=function(id){var n=0;Object.keys(M.data.map).forEach(function(k){if(M.data.map[k].indexOf(id)>-1)n++});return n};
  M.pills=function(key){return M.of(key).map(function(d){return '<span class="g11mk-pill" style="--mc:'+d.c+'">'+esc(d.n)+'</span>'}).join('')};
  M.chip=function(d,on,extra){return '<button type="button" class="g11mk-chip'+(on?' on':'')+'" data-mk="'+esc(d.id)+'" style="--mc:'+d.c+'"'+(extra||'')+'><span class="dot"></span>'+esc(d.n)+'</button>'};
  var st=document.createElement('style');st.textContent='.g11mk-pill{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;line-height:1;padding:3px 8px;border-radius:99px;background:color-mix(in srgb,var(--mc) 22%,transparent);color:var(--ink);border:1px solid var(--mc);margin:0 4px 4px 0;vertical-align:middle}.g11mk-pill:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--mc)}'+
    '.g11mk-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line,#3a3350);background:var(--card);color:var(--ink);border-radius:999px;padding:5px 11px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}.g11mk-chip .dot{width:10px;height:10px;border-radius:50%;background:var(--mc,var(--accent))}.g11mk-chip.on{border-color:var(--mc,var(--accent));background:color-mix(in srgb,var(--mc,var(--accent)) 25%,var(--card))}'+
    '.g11mk-pop{position:fixed;z-index:200;width:290px;max-width:calc(100vw - 16px);background:var(--card);color:var(--ink);border:1px solid var(--line,#3a3350);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.45);padding:12px;font-size:14px}.g11mk-pop b{display:block;margin-bottom:6px}.g11mk-pop .row{display:flex;align-items:center;gap:8px;padding:5px 4px;border-radius:8px}.g11mk-pop .row:hover{background:var(--soft)}.g11mk-pop .row label{flex:1;display:flex;align-items:center;gap:8px;cursor:pointer}.g11mk-pop .row .dot{width:12px;height:12px;border-radius:50%;flex:none}.g11mk-pop .row small{color:var(--muted)}.g11mk-pop .del{border:0;background:none;color:var(--muted);cursor:pointer;font-size:13px}.g11mk-pop .new{border-top:1px solid var(--line,#3a3350);margin-top:8px;padding-top:8px}.g11mk-pop input[type=text]{width:100%;box-sizing:border-box;font:inherit;font-size:14px;color:var(--ink);background:var(--soft);border:1px solid var(--line,#3a3350);border-radius:8px;padding:6px 9px}.g11mk-pop .sw{display:flex;gap:6px;margin:8px 0}.g11mk-pop .sw button{width:22px;height:22px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}.g11mk-pop .sw button.on{border-color:var(--ink)}.g11mk-pop .go{display:flex;gap:6px;justify-content:space-between}.g11mk-pop .go button{border:0;border-radius:8px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;background:var(--accent);color:#fff}.g11mk-pop .go .lt{background:var(--soft);color:var(--ink)}.g11mk-pop .g11mk-empty{color:var(--muted);font-size:13px;margin:2px 0 4px}';
  document.head.appendChild(st);
  var pop=null,popKey=null,newC=COLORS[0],newN='',openedAt=0;
  function close(){if(pop){pop.remove();pop=null;popKey=null}}
  function render(){if(!pop)return;var k=popKey,defs=M.data.defs;
    pop.innerHTML='<b>🏷 Мои маркеры</b>'+(defs.length?defs.map(function(d){return '<div class="row"><label><input type="checkbox" data-t="'+esc(d.id)+'"'+(k&&M.has(k,d.id)?' checked':'')+(k?'':' hidden')+'><span class="dot" style="background:'+d.c+'"></span>'+esc(d.n)+' <small>'+M.count(d.id)+'</small></label><button type="button" class="del" data-del="'+esc(d.id)+'" title="Удалить маркер">✕</button></div>'}).join(''):'<p class="g11mk-empty">Маркеров пока нет — создайте первый ниже: например «Частые», «Сложные», «Возвраты».</p>')+
      '<div class="new"><input type="text" maxlength="30" placeholder="Название нового маркера…" data-nn value="'+esc(newN)+'"><div class="sw">'+COLORS.map(function(c){return '<button type="button" data-c="'+c+'" style="background:'+c+'"'+(c===newC?' class="on"':'')+' title="Цвет"></button>'}).join('')+'</div><div class="go"><button type="button" data-add>＋ Создать'+(k?' и отметить':'')+'</button><button type="button" class="lt" data-close>Готово</button></div></div>'}
  function place(a){var r=a.getBoundingClientRect(),w=Math.min(290,innerWidth-16),x=Math.min(Math.max(8,r.right-w),innerWidth-w-8),y=r.bottom+6;pop.style.left=x+'px';pop.style.top=y+'px';var h=pop.offsetHeight;if(y+h>innerHeight-8)pop.style.top=Math.max(8,r.top-h-6)+'px'}
  M.open=function(anchor,key){if(!window.G11||!G11.user()){if(window.G11)G11.login();return}close();popKey=key||null;openedAt=Date.now();pop=document.createElement('div');pop.className='g11mk-pop';document.body.appendChild(pop);render();place(anchor);M.load();setTimeout(function(){var i=pop&&pop.querySelector('[data-nn]');if(i&&!M.data.defs.length)i.focus()},30)};
  document.addEventListener('g11:marks',function(){if(pop)render()});
  document.addEventListener('click',function(e){if(!pop)return;if(!pop.contains(e.target)){if(!e.target.closest('[data-mkopen]'))close();return}
    var t=e.target.closest('[data-t]'),dl=e.target.closest('[data-del]'),c=e.target.closest('[data-c]'),ad=e.target.closest('[data-add]');
    if(t&&popKey){M.toggle(popKey,t.dataset.t);return}
    if(dl){var d=M.def(dl.dataset.del);if(d&&confirm('Удалить маркер «'+d.n+'»? Он снимется со всех шаблонов.'))M.del(d.id);return}
    if(c){newC=c.dataset.c;render();var ni=pop.querySelector('[data-nn]');if(ni){ni.focus();ni.setSelectionRange(ni.value.length,ni.value.length)}return}
    if(ad){var inp=pop.querySelector('[data-nn]'),nd=M.add(inp.value,newC);if(nd)newN='';if(nd&&popKey&&!M.has(popKey,nd.id))M.toggle(popKey,nd.id);newC=COLORS[M.data.defs.length%COLORS.length];render();return}
    if(e.target.closest('[data-close]'))close()},true);
  document.addEventListener('keydown',function(e){if(!pop)return;if(e.key==='Escape')close();if(e.key==='Enter'&&e.target.matches&&e.target.matches('[data-nn]')){e.preventDefault();var b=pop.querySelector('[data-add]');b&&b.click()}});
  window.addEventListener('scroll',function(){if(pop&&Date.now()-openedAt>600)close()},{passive:true});
  document.addEventListener('input',function(e){if(pop&&e.target.matches&&e.target.matches('.g11mk-pop [data-nn]'))newN=e.target.value});
  window.G11Mark=M;
  function go(){M.load()}
  if(window.G11)go();else document.addEventListener('g11:ready',go,{once:true});
  document.addEventListener('g11:login',function(){M.load(true)});document.addEventListener('g11:logout',function(){M.data={defs:[],map:{}};fire()});
})();
