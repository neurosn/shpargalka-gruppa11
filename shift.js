/* Виджет «Смена»: кнопки Пришёл / Перерыв / Вернулся / Ушёл. Режимы: real (лист «Дисциплина») и test (лист «Тесты»). */
window.G11Shift=function(root,mode){
  var test=mode==='test',A=test?{state:'testState',mark:'testMark'}:{state:'shiftState',mark:'mark'},SH=null;
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  root.classList.add('shift');
  root.innerHTML='<h2>'+(test?'🧪 Тестовая смена':'⏱ Смена сегодня')+'</h2>'+
   (test?'<div class="note" style="margin-top:0">Тест работает в любое время и пишет в лист «Тесты» — реальная «Дисциплина» не меняется. Покажите ребятам, как работают кнопки.</div>':'')+
   '<div class="now"><span class="sh-title">Загружаю…</span><b class="sh-now"></b></div>'+
   '<div class="sbtns"><button class="sbtn b-start" data-m="start" type="button" disabled>🟢 Вышел на смену<small>'+(test?'в любое время':'с 20:30, раньше 21:00 → 21:00')+'</small></button>'+
   '<button class="sbtn b-break" data-m="break" type="button" disabled>☕ Ушёл на перерыв<small class="b-hint">не больше 3 человек сразу</small></button>'+
   '<button class="sbtn b-back" data-m="back" type="button" disabled>🔙 Вернулся<small>закрыть перерыв</small></button>'+
   '<button class="sbtn b-end" data-m="end" type="button" disabled>🔴 Ушёл со смены<small>'+(test?'завершить тест':'до 09:30, позже 09:00 → 09:00')+'</small></button></div>'+
   '<div class="board"></div><div class="tl"></div><div class="brk" hidden><div class="bar"><i style="width:0"></i></div><small class="brkt" style="color:var(--muted)"></small></div><div class="msg"></div>'+
   (test?'<button class="btn alt reset" type="button" style="margin-top:8px">↺ Сбросить мой тест за сегодня</button>':'<p style="color:var(--muted);font-size:13px;margin:6px 0 0">Время берётся с сервера по Москве и сразу записывается в лист «Дисциплина». Писать в чат о перерыве не нужно — все видят, кто сейчас на перерыве. Перерывы — не более 75 минут за смену, не в первый и последний час.</p>');
  var q=function(s){return root.querySelector(s)},B=function(m){return root.querySelector('[data-m="'+m+'"]')};
  function draw(j){SH=j;['start','break','back','end'].forEach(function(m){B(m).disabled=true});q('.sh-now').textContent=j.now?('сейчас '+j.now+' МСК'):'';
    var me=G11.user()&&G11.user().id,max=j.maxOnBreak||3,others=(j.board||[]).filter(function(x){return x.id!==me}),full=others.length>=max;
    q('.board').innerHTML='<div class="bwho'+(full?' full':'')+'"><b>☕ Сейчас на перерыве: '+(j.board||[]).length+' из '+max+'</b>'+((j.board||[]).length?'<div>'+(j.board||[]).map(function(x){return '<span>'+esc(String(x.name).split(' ').slice(0,2).join(' '))+' · с '+esc(String(x.from).slice(0,5))+'</span>'}).join('')+'</div>':'<div><span class="empty">никого — можно идти</span></div>')+'</div>';
    if(!j.scheduled){q('.sh-title').textContent='Смена '+j.shift+': вас нет в графике';q('.tl').innerHTML='';q('.brk').hidden=true;return}
    var s=j.state;q('.sh-title').innerHTML='Смена <b>'+esc(j.shift)+'</b>'+(test?'':' · '+(j.windowOpen?'отметки открыты':'отметки откроются в 20:30'));
    if(j.windowOpen){B('start').disabled=!!s.came;B('break').disabled=!s.came||!!s.left||s.onBreak||full;B('back').disabled=!s.onBreak;B('end').disabled=!s.came||!!s.left}
    q('.b-hint').textContent=full&&!s.onBreak?'занято: 3 человека на перерыве':'не больше 3 человек сразу';
    var tl=[];if(s.came)tl.push('🟢 пришёл '+String(s.came).slice(0,5));s.breaks.forEach(function(x){tl.push('☕ '+String(x.from).slice(0,5)+'–'+(x.to?String(x.to).slice(0,5):'…'))});if(s.left)tl.push('🔴 ушёл '+String(s.left).slice(0,5));if(s.status)tl.push(s.status);
    q('.tl').innerHTML=tl.map(function(x){return '<span>'+esc(x)+'</span>'}).join('');
    var lim=j.limit||75,used=s.usedMin||0;q('.brk').hidden=!s.came;q('.bar i').style.width=Math.min(100,used/lim*100)+'%';q('.bar i').style.background=used>lim?'var(--warn)':'';
    q('.brkt').textContent='Перерывы: '+used+' из '+lim+' мин'+(used>lim?' — перебор!':' · осталось '+(lim-used)+' мин')+(s.onBreak?' (сейчас на перерыве с '+String(s.openBreak.from).slice(0,5)+')':'')}
  function load(){return G11.api(A.state).then(draw).catch(function(x){q('.sh-title').textContent=x.message})}
  root.addEventListener('click',function(e){var btn=e.target.closest('[data-m]');if(btn&&!btn.disabled){var m=btn.dataset.m,msg=q('.msg');
    if(m==='end'&&!confirm(test?'Завершить тестовую смену?':'Завершить смену? Уход будет записан сейчас.'))return;
    if(m==='break'&&!test&&SH&&SH.now){var p=SH.now.split(':'),t=+p[0]*60+ +p[1];if((t>=21*60&&t<22*60)||(t>=8*60&&t<9*60)){if(!confirm('Сейчас первый или последний час смены — перерыв в это время считается нарушением. Всё равно отметить?'))return}}
    msg.className='msg';msg.textContent='Записываю…';root.querySelectorAll('[data-m]').forEach(function(x){x.disabled=true});
    G11.api(A.mark,{type:m}).then(function(j){msg.textContent='✅ Записано: '+String(j.written).slice(0,5)+(j.note?' · '+j.note:'');msg.classList.add('ok');draw(j)}).catch(function(x){msg.textContent=x.message;msg.classList.add('bad');load()})}
    if(e.target.closest('.reset')){if(!confirm('Удалить вашу тестовую запись за сегодня?'))return;G11.api('testReset').then(function(){q('.msg').textContent='Тест сброшен';load()})}});
  var timer=setInterval(function(){if(G11.user()&&!document.hidden)load()},test?20000:60000);
  load();return {reload:load,stop:function(){clearInterval(timer)}};
};
(function(){var css='.shift{border:2px solid var(--accent);background:linear-gradient(180deg,var(--soft),var(--card))}.shift .now{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:baseline;margin-bottom:12px}.shift .now b{font-size:18px}'+
'.sbtns{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.sbtn{border:0;border-radius:14px;padding:16px 12px;font:inherit;font-size:16px;font-weight:700;cursor:pointer;color:#fff;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}'+
'.sbtn small{font-weight:500;font-size:12px;opacity:.85}.sbtn:disabled{opacity:.35;cursor:not-allowed}.b-start{background:#1f9d6b}.b-break{background:#d9480f}.b-back{background:#2f7de1}.b-end{background:#6b6480}'+
'.tl{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.tl span{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:4px 10px;font-size:13px}'+
'.bar{height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:10px}.bar i{display:block;height:100%;background:var(--accent)}'+
'.bwho{margin-top:12px;border:1px solid var(--line);background:var(--card);border-radius:12px;padding:10px 12px}.bwho.full{border-color:var(--warn)}.bwho b{font-size:14px}.bwho div{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.bwho span{background:var(--soft);border-radius:999px;padding:3px 10px;font-size:13px}.bwho .empty{color:var(--muted)}';
var s=document.createElement('style');s.textContent=css;document.head.appendChild(s)})();
