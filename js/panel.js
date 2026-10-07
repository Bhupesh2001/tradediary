// ── RIGHT-SIDE TRADES PANEL (opened by clicking analytics) ───────────────────
const TP={open:false,label:'',F:null,edited:false,profile:null,filtersOpen:false};
const DOW_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const TP_CTRL={sym:'tpf_sym',result:'tpf_result',dir:'tpf_dir',strat:'tpf_strat',emotion:'tpf_emotion',dow:'tpf_dow',hour:'tpf_hour',hold:'tpf_hold',opt:'tpf_opt',view:'tpf_view',from:'tpf_from',to:'tpf_to'};
function emptyF(){return {sym:'',result:'',dir:'',emotion:'',strat:'',from:'',to:'',dow:'',hour:'',hold:'',opt:'',view:'',ids:null}}
function dowOf(date){const p=String(date).split('-');return new Date(+p[0],+p[1]-1,+p[2]).getDay()}
const has=v=>v!==''&&v!==null&&v!==undefined;

// Does a trade pass the panel filters? (pure)
function tpMatch(t,F){
  if(F.ids&&!F.ids.includes(t.id))return false;
  if(F.sym&&String(t.sym||'').toUpperCase()!==String(F.sym).toUpperCase())return false;
  if(F.result==='win'&&!(t.pnl>0))return false;
  if(F.result==='loss'&&!(t.pnl<0))return false;
  if(F.result==='be'&&t.pnl!==0)return false;
  if(F.dir&&t.dir!==F.dir)return false;
  if(F.emotion&&(t.emotion||'neutral')!==F.emotion)return false;
  if(F.strat&&(t.strat||'Other')!==F.strat)return false;
  if(F.from&&t.date<F.from)return false;
  if(F.to&&t.date>F.to)return false;
  if(has(F.dow)&&dowOf(t.date)!==+F.dow)return false;
  if(has(F.hour)&&(!realTime(t)||+t.time.slice(0,2)!==+F.hour))return false;
  if(F.hold){const m=holdMinutes(t);if(m===null||holdBucket(m)!==F.hold)return false;}
  if(F.opt){const o=optTypeOf(t);if(F.opt==='NONE'){if(o)return false;}else if(o!==F.opt)return false;}
  if(F.view&&marketView(t)!==F.view)return false;
  return true;
}

// Chart.js inline plugin: click (or tap) a bar / slice -> fn(index, datasetIndex); pointer cursor on hover
function clickPlugin(fn,opts){
  const o=Object.assign({mode:'index',axis:'x',intersect:false},opts||{});
  return {id:'tdClick',afterEvent(chart,args){
    const ev=args.event;if(!ev||args.replay)return;
    const hit=()=>chart.getElementsAtEventForMode(ev,o.mode,{intersect:o.intersect,axis:o.axis},false);
    if(ev.type==='mousemove'){const el=ev.native&&ev.native.target;if(el)el.style.cursor=(args.inChartArea&&hit().length)?'pointer':'default';return;}
    if(ev.type==='click'&&args.inChartArea){const els=hit();if(els.length)fn(els[0].index,els[0].datasetIndex);}
  }};
}

function openTradePanel(label,filters){
  if(typeof closeNotesPanel==='function')closeNotesPanel();
  TP.label=label;TP.F=Object.assign(emptyF(),filters||{});TP.edited=false;TP.profile=currentProfile;TP.open=true;
  document.getElementById('tradePanel').classList.add('open');
  document.getElementById('mainScroll').classList.add('tp-open');
  document.getElementById('tpFilters').style.display=TP.filtersOpen?'grid':'none';
  tpBuildControls();tpRender();
}
function closeTradePanel(){
  TP.open=false;
  const p=document.getElementById('tradePanel');if(p)p.classList.remove('open');
  const m=document.getElementById('mainScroll');if(m)m.classList.remove('tp-open');
}
function openMonthPanel(ym){
  const[y,m]=ym.split('-'),last=new Date(+y,+m,0).getDate();
  const names=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  openTradePanel('Trades in '+names[+m-1]+' '+y,{from:y+'-'+m+'-01',to:y+'-'+m+'-'+String(last).padStart(2,'0')});
}
function tpToggleFilters(){
  TP.filtersOpen=!TP.filtersOpen;
  document.getElementById('tpFilters').style.display=TP.filtersOpen?'grid':'none';
  document.getElementById('tpFiltBtn').classList.toggle('active',TP.filtersOpen);
}
function tpClearAll(){TP.F=emptyF();TP.edited=true;tpBuildControls();tpRender();}
function tpRemoveChip(k){TP.F[k]=(k==='ids')?null:'';TP.edited=true;tpBuildControls();tpRender();}

function tpBuildControls(){
  const T=getTrades(),F=TP.F,uniq=a=>[...new Set(a)].sort();
  const fill=(key,items)=>{
    const el=document.getElementById(TP_CTRL[key]),cur=has(F[key])?String(F[key]):'';
    if(cur!==''&&!items.some(i=>String(i[0])===cur))items=[...items,[cur,cur]];
    el.innerHTML=items.map(i=>'<option value="'+escHtml(String(i[0]))+'"'+(String(i[0])===cur?' selected':'')+'>'+escHtml(String(i[1]))+'</option>').join('');
  };
  fill('sym',[['','All symbols'],...uniq(T.map(t=>String(t.sym||'').toUpperCase())).map(s=>[s,s])]);
  fill('result',[['','Any result'],['win','Winners'],['loss','Losers'],['be','Breakeven']]);
  fill('dir',[['','Long & Short'],['LONG','Long'],['SHORT','Short']]);
  fill('strat',[['','All strategies'],...uniq(T.map(t=>t.strat||'Other')).map(s=>[s,s])]);
  fill('emotion',[['','Any emotion'],...uniq(T.map(t=>t.emotion||'neutral')).map(s=>[s,s])]);
  fill('dow',[['','Any day'],...DOW_NAMES.map((n,i)=>[String(i),n])]);
  fill('hour',[['','Any hour'],...[...new Set(T.filter(realTime).map(t=>+t.time.slice(0,2)))].sort((a,b)=>a-b).map(h=>[String(h),String(h).padStart(2,'0')+':00'])]);
  fill('hold',[['','Any holding time'],...HOLD_BUCKETS.map(b=>[b.l,b.l])]);
  fill('opt',[['','Options & others'],['CE','Calls (CE)'],['PE','Puts (PE)'],['NONE','Not an option']]);
  fill('view',[['','Any market view'],['BULL','Bullish'],['BEAR','Bearish']]);
  document.getElementById('tpf_from').value=F.from||'';
  document.getElementById('tpf_to').value=F.to||'';
}
function tpReadControls(){Object.keys(TP_CTRL).forEach(k=>{TP.F[k]=document.getElementById(TP_CTRL[k]).value;});}

function tpChips(){
  const F=TP.F,c=[];
  if(F.ids)c.push(['ids',F.ids.length+' specific trade'+(F.ids.length===1?'':'s')]);
  if(F.sym)c.push(['sym','Symbol: '+F.sym]);
  if(F.result)c.push(['result',{win:'Winners',loss:'Losers',be:'Breakeven'}[F.result]]);
  if(F.dir)c.push(['dir',F.dir==='LONG'?'Long':'Short']);
  if(F.strat)c.push(['strat','Strategy: '+F.strat]);
  if(F.emotion)c.push(['emotion','Emotion: '+F.emotion]);
  if(F.from)c.push(['from','From '+F.from]);
  if(F.to)c.push(['to','To '+F.to]);
  if(has(F.dow))c.push(['dow','Weekday: '+DOW_NAMES[+F.dow]]);
  if(has(F.hour))c.push(['hour','Entry hour: '+String(F.hour).padStart(2,'0')+':00']);
  if(F.hold)c.push(['hold','Held '+F.hold]);
  if(F.opt)c.push(['opt',{CE:'Calls (CE)',PE:'Puts (PE)',NONE:'Not an option'}[F.opt]]);
  if(F.view)c.push(['view',F.view==='BULL'?'Bullish bets':'Bearish bets']);
  return c;
}
function tpRowHtml(t){
  const s=t.profile==='USD'?'$':'₹';
  const notes=t.notes?'<div class="tp-notes">'+escHtml(t.notes.slice(0,140))+(t.notes.length>140?'…':'')+'</div>':'';
  return '<div class="tp-row"><div class="tp-r1"><span class="tp-sym">'+escHtml(t.sym)+'</span><span class="'+(t.dir==='LONG'?'dir-long':'dir-short')+'">'+escHtml(t.dir)+'</span><span class="tp-pnl '+(t.pnl>=0?'pnl-pos':'pnl-neg')+'">'+fmtSigned(t.pnl)+'</span></div>'+
    '<div class="tp-r2">'+escHtml(t.date)+(realTime(t)?' '+escHtml(t.time):'')+(t.exitTime&&realTime(t)?' → '+escHtml(t.exitTime):'')+' · qty '+t.qty+' · '+t.entry+' → '+t.exit+(t.fees?' · fees '+s+t.fees:'')+(t.images&&t.images.length?' · 📷'+t.images.length:'')+'</div>'+
    '<div class="tp-r3">'+(t.strat?'<span class="tp-tag">'+escHtml(t.strat)+'</span>':'')+'<span class="em-tag '+escHtml(t.emotion||'')+'" style="padding:1px 8px;font-size:9px">'+escHtml(t.emotion||'—')+'</span>'+
    '<span class="tp-actions"><button class="btn btn-ghost btn-sm" data-edit="'+escHtml(t.id)+'">Edit</button><button class="btn btn-danger btn-sm" data-del="'+escHtml(t.id)+'">Del</button></span></div>'+notes+'</div>';
}
function tpRender(){
  const all=getTrades().filter(t=>tpMatch(t,TP.F)).sort((a,b)=>tradeDatetime(a)<tradeDatetime(b)?1:-1);
  document.getElementById('tpTitle').textContent=TP.edited?'Filtered trades':TP.label;
  const g=groupStats(all);
  document.getElementById('tpSummary').innerHTML=
    '<div><b>'+g.n+'</b> trade'+(g.n===1?'':'s')+'</div><div>Win rate <b>'+Math.round(g.winRate*100)+'%</b></div>'+
    '<div>Net <b style="color:var(--'+(g.net>=0?'accent':'danger')+')">'+fmtSigned(g.net)+'</b></div><div>Avg <b>'+fmtSigned(g.exp)+'</b></div>';
  const chips=tpChips();
  document.getElementById('tpChips').innerHTML=chips.length?chips.map(([k,l])=>'<span class="tp-chip">'+escHtml(l)+'<button data-rm="'+k+'" title="Remove filter">×</button></span>').join(''):'<span class="tp-nochip">No filters — showing all trades</span>';
  document.getElementById('tpFiltBtn').classList.toggle('active',TP.filtersOpen);
  const LIM=200;
  document.getElementById('tpList').innerHTML=all.length?all.slice(0,LIM).map(tpRowHtml).join('')+(all.length>LIM?'<div class="tp-more">Showing the latest '+LIM+' of '+all.length+' — narrow the filters to see the rest</div>':''):
    '<div class="empty-note" style="padding:18px 4px">No trades match these filters.</div>';
}
// called at the end of every page render so the panel stays live after edits / deletes / sync
function tpRefresh(){
  if(!TP.open)return;
  if(TP.profile!==currentProfile){closeTradePanel();return;}
  if(!document.getElementById('tpFilters').contains(document.activeElement))tpBuildControls();
  tpRender();
}

(function(){
  const P=document.getElementById('tradePanel');
  P.addEventListener('click',e=>{
    const ed=e.target.closest('[data-edit]');if(ed){openEditModal(ed.dataset.edit);return;}
    const dl=e.target.closest('[data-del]');if(dl){askDelete(dl.dataset.del);return;}
    const rm=e.target.closest('[data-rm]');if(rm)tpRemoveChip(rm.dataset.rm);
  });
  const onF=e=>{if(e.target.id&&e.target.id.indexOf('tpf_')===0){tpReadControls();TP.edited=true;tpRender();}};
  P.addEventListener('input',onF);P.addEventListener('change',onF);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&TP.open&&!document.querySelector('.modal-overlay.open'))closeTradePanel();});
  // comparison tables: click a column heading to list those trades
  const TBL={LONG:'Long trades',SHORT:'Short trades',BULL:'Bullish bets',BEAR:'Bearish bets',CE:'Calls (CE)',PE:'Puts (PE)'};
  ['dirTable','viewTable','cepeTable'].forEach(id=>document.getElementById(id).addEventListener('click',e=>{
    const th=e.target.closest('[data-tp]');if(!th)return;
    const[k,v]=th.dataset.tp.split(':');openTradePanel(TBL[v]||v,{[k]:v});
  }));
})();
