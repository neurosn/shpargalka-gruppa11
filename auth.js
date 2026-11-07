/* Вход в портал Группы 11: ID + пароль. Сессия хранится на устройстве, пока человек не нажмёт «Выйти». */
(function(){
  if(window.__g11auth)return;window.__g11auth=1;
  var API='https://script.google.com/macros/s/AKfycby6nZIjmGE7stnvABPqyiHLXaBFe7qBCdxYL5HDMd9G53dkrX5hv7YC6gkw1CyA4bWW/exec';                       // ← адрес веб-приложения Apps Script (…/exec) — вставляется после публикации
  var KEY='g11_session';
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}}
  function save(s){try{s?localStorage.setItem(KEY,JSON.stringify(s)):localStorage.removeItem(KEY)}catch(e){}}
  var S=load();
  function call(action,data){
    if(!API)return Promise.reject(new Error('Вход ещё не подключён'));
    var body=Object.assign({action:action,token:S&&S.token},data||{});
    return fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)})
      .then(function(r){return r.json()},function(){throw new Error('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.')})
      .then(function(j){if(!j.ok){if(j.code==='auth'&&S){save(null);S=null;render()}throw new Error(j.error||'Ошибка')}return j});
  }
  // мгновенный показ: сначала последние сохранённые данные, потом свежие с сервера
  function ckey(action,data){return 'g11c_'+(S&&S.user&&S.user.id||'')+'_'+action+'_'+JSON.stringify(data||{})}
  function cached(action,data,fn){var k=ckey(action,data),c=null;try{c=JSON.parse(localStorage.getItem(k)||'null')}catch(e){}
    if(c){try{fn(c,true)}catch(e){}}
    return call(action,data).then(function(j){try{localStorage.setItem(k,JSON.stringify(j))}catch(e){}fn(j,false);return j},function(e){if(c)return c;throw e})}
  function clearCache(){try{Object.keys(localStorage).forEach(function(k){if(k.indexOf('g11c_')===0)localStorage.removeItem(k)})}catch(e){}}
  var pre=0;function prefetch(){if(!S||Date.now()-pre<120000||/account\.html/.test(location.pathname))return;pre=Date.now();cached('myData',{month:null},function(){}).catch(function(){})}
  var ROLE={admin:'Руководитель',editor:'Наставник',employee:'Сотрудник'};
  var css='.g11acc{display:flex;align-items:center;gap:6px}.g11acc button,.g11acc a{font:600 13px/1 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;border:0;cursor:pointer;border-radius:9px;padding:8px 12px;text-decoration:none}'+
  '.g11in{background:#7b2cbf;color:#fff}.g11me{background:rgba(255,255,255,.1);color:#fff;display:flex;gap:6px;align-items:center}'+
  '.g11menu{position:absolute;right:12px;top:46px;background:#fff;color:#1d1730;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.25);min-width:220px;padding:6px;display:none;z-index:60}'+
  '.g11menu.on{display:block}.g11menu a,.g11menu button{text-decoration:none!important;display:block;width:100%;text-align:left;background:none;color:#1d1730!important;padding:10px 12px;border-radius:8px;font-size:14px}.g11menu a:hover,.g11menu button:hover{background:#f1e8fb}'+
  '.g11menu .who{padding:8px 12px 10px;border-bottom:1px solid #eee;margin-bottom:4px;font-size:13px;color:#6b6480}.g11menu .who b{display:block;color:#1d1730;font-size:14px}'+
  '.g11modal{position:fixed;inset:0;background:rgba(20,16,32,.55);display:none;align-items:center;justify-content:center;z-index:100;padding:16px}.g11modal.on{display:flex}'+
  '.g11box{background:#fff;color:#1d1730;border-radius:18px;max-width:380px;width:100%;padding:22px;font:15px/1.5 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.3)}'+
  '.g11box h3{margin:0 0 4px;font-size:20px}.g11box p{margin:0 0 14px;color:#6b6480;font-size:13px}.g11box label{display:block;font-size:12px;font-weight:700;color:#6b6480;margin:10px 0 4px;text-transform:uppercase;letter-spacing:.03em}'+
  '.g11box input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #e6e1f2;border-radius:10px;font:inherit;background:#f6f4fb;color:#1d1730}.g11box input:focus{outline:2px solid #7b2cbf;border-color:transparent}'+
  '.g11box .row{display:flex;gap:8px;margin-top:16px}.g11box .row button{flex:1;border:0;border-radius:10px;padding:11px;font:inherit;font-weight:700;cursor:pointer}'+
  '.g11box .go{background:#7b2cbf;color:#fff}.g11box .cancel{background:#f1e8fb;color:#7b2cbf}.g11box .err{color:#d9480f;font-size:13px;font-weight:600;min-height:18px;margin-top:8px}'+
  '.g11box .show{font-size:12px;color:#7b2cbf;background:none;border:0;cursor:pointer;padding:4px 0;font-weight:600}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  var modal=document.createElement('div');modal.className='g11modal';
  modal.innerHTML='<form class="g11box" autocomplete="on"><h3>🔐 Вход в портал</h3><p>ID сотрудника из таблицы и пароль от руководителя. Вход сохранится на этом устройстве, пока вы не нажмёте «Выйти».</p>'+
   '<label for="g11id">ID сотрудника</label><input id="g11id" name="username" inputmode="numeric" autocomplete="username" placeholder="например, 6452991" required>'+
   '<label for="g11pw">Пароль</label><input id="g11pw" name="password" type="password" autocomplete="current-password" required>'+
   '<button type="button" class="show" id="g11sh">👁 Показать пароль</button>'+
   '<div class="err" id="g11err"></div><div class="row"><button type="button" class="cancel" id="g11x">Отмена</button><button type="submit" class="go" id="g11go">Войти</button></div></form>';
  document.body.appendChild(modal);
  var form=modal.querySelector('form'),err=modal.querySelector('#g11err'),go=modal.querySelector('#g11go');
  modal.querySelector('#g11x').onclick=function(){modal.classList.remove('on')};
  modal.addEventListener('click',function(e){if(e.target===modal)modal.classList.remove('on')});
  modal.querySelector('#g11sh').onclick=function(){var p=modal.querySelector('#g11pw');p.type=p.type==='password'?'text':'password'};
  form.onsubmit=function(e){e.preventDefault();err.textContent='';go.disabled=true;go.textContent='Проверяю…';
    call('login',{id:form.username.value,password:form.password.value,device:navigator.userAgent}).then(function(j){
      S={token:j.token,user:j.user};save(S);modal.classList.remove('on');form.reset();render();document.dispatchEvent(new CustomEvent('g11:login',{detail:S.user}));
    }).catch(function(x){err.textContent=x.message}).then(function(){go.disabled=false;go.textContent='Войти'})};

  function openLogin(){err.textContent=API?'':'Вход скоро заработает — идёт настройка.';modal.classList.add('on');setTimeout(function(){modal.querySelector('#g11id').focus()},50)}
  function logout(){call('logout').catch(function(){}).then(function(){clearCache();save(null);S=null;render();document.dispatchEvent(new Event('g11:logout'));if(/account|admin|editor/.test(location.pathname))location.href='index.html'})}

  var menu;
  function render(){
    var slot=document.getElementById('g11acc');if(!slot)return;
    slot.className='g11acc';
    if(!S){slot.innerHTML='<button class="g11in" type="button">🔐 Войти</button>';slot.firstChild.onclick=openLogin;return}
    var u=S.user,first=String(u.name||'').split(' ')[1]||u.name;
    slot.innerHTML='<button class="g11me" type="button">👤 <span>'+esc(first)+'</span> ▾</button>';
    if(!menu){menu=document.createElement('div');menu.className='g11menu';document.body.appendChild(menu);document.addEventListener('click',function(e){if(!menu.contains(e.target)&&!e.target.closest('.g11me'))menu.classList.remove('on')})}
    var h='<div class="who"><b>'+esc(u.name)+'</b>'+ROLE[u.role]+' · ID '+esc(u.id)+'</div><a href="account.html">🏠 Мой кабинет</a>';
    if(u.role==='editor'||u.role==='admin')h+='<a href="editor.html">✏️ Кабинет редактора</a>';
    if(u.role==='admin')h+='<a href="admin.html">🛡 Панель руководителя</a><a href="logins.html">🔑 Журнал входов</a>';
    h+='<button type="button" id="g11out">🚪 Выйти</button>';menu.innerHTML=h;
    menu.querySelector('#g11out').onclick=logout;
    slot.firstChild.onclick=function(){var r=slot.getBoundingClientRect();menu.style.top=(r.bottom+window.scrollY+6)+'px';menu.classList.toggle('on');prefetch()};
  }
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

  window.G11={api:call,cached:cached,clearCache:clearCache,prefetch:prefetch,user:function(){return S&&S.user},login:openLogin,logout:logout,ready:!!API,roleName:function(r){return ROLE[r]||r}};
  render();
  // тихо обновляем профиль (роль могла поменяться)
  if(S&&API)call('me').then(function(j){S.user=j.user;save(S);render();document.dispatchEvent(new CustomEvent('g11:user',{detail:j.user}))}).catch(function(){});
  document.dispatchEvent(new Event('g11:ready'));
})();
