/* Общее верхнее меню шпаргалки Группы 11: Главная · Работа · Инструменты · Команда */
(function(){
  if(window.__g11site)return;window.__g11site=1;
  var MAP={'index.html':'home','':'home','work.html':'work','templates.html':'work','bz.html':'work','sv.html':'work',
    'tools.html':'tools','helper.html':'tools','calc.html':'tools','salary.html':'tools','check.html':'tools',
    'team.html':'team','vacation.html':'team','zp.html':'team','account.html':'team','admin.html':'team','editor.html':'team','logins.html':'team','article.html':'work','gen.html':'work'};
  var file=(location.pathname.split('/').pop()||'');
  var cur=document.body.getAttribute('data-space')||MAP[file]||'';
  var items=[['home','index.html','🏠','Главная'],['work','work.html','💼','Работа'],['tools','tools.html','🧰','Инструменты'],['team','team.html','👥','Команда']];
  var css='.g11bar{background:#1d1730;color:#fff;font:600 14px/1.2 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;position:relative;z-index:6}'+
  '.g11bar .in{max-width:960px;margin:0 auto;display:flex;align-items:center;gap:4px;padding:6px 12px;overflow-x:auto;scrollbar-width:none}'+
  '.g11bar .in::-webkit-scrollbar{display:none}'+
  '.g11bar a{color:#e9defa;text-decoration:none;padding:7px 11px;border-radius:9px;white-space:nowrap;display:flex;gap:6px;align-items:center}'+
  '.g11bar a:hover{background:rgba(255,255,255,.08)}.g11bar a.on{background:#7b2cbf;color:#fff}'+
  '.g11bar .brand{font-weight:800;color:#fff;margin-right:6px;padding-left:4px}.g11bar .sp{flex:1}'+
  '@media(max-width:520px){.g11bar .brand .lbl{display:none}.g11bar a{padding:7px 8px;font-size:13px;gap:4px}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var bar=document.createElement('div');bar.className='g11bar';
  var h='<div class="in"><a class="brand" href="index.html">💜 <span class="lbl">Группа 11</span></a>';
  items.slice(1).forEach(function(i){h+='<a href="'+i[1]+'"'+(cur===i[0]?' class="on" aria-current="page"':'')+'><span>'+i[2]+'</span><span class="lbl">'+i[3]+'</span></a>'});
  h+='<span class="sp"></span><span id="g11acc"></span></div>';
  bar.innerHTML=h;document.body.insertBefore(bar,document.body.firstChild);
  var a=document.createElement('script');a.src='auth.js?v=7';document.body.appendChild(a);
  var ij=document.createElement('script');ij.src='icons.js?v=13';ij.async=false;document.body.appendChild(ij);
  var rj=document.createElement('script');rj.src='rte.js?v=13';rj.async=false;document.body.appendChild(rj);
  var cj=document.createElement('script');cj.src='content.js?v=10';cj.async=false;document.body.appendChild(cj);
  if(/(templates|gen)\.html$/.test(location.pathname)){var mj=document.createElement('script');mj.src='markers.js?v=2';mj.async=false;document.body.appendChild(mj)}
  if(/templates\.html$/.test(location.pathname)){var fj=document.createElement('script');fj.src='favs.js?v=8';fj.async=false;document.body.appendChild(fj)}
  var sj=document.createElement('script');sj.src='search.js?v=3';document.body.appendChild(sj);
})();
