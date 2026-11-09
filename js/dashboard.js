// ── DASHBOARD ──────────────────────────────────────────────────────────────
function renderDashboard(){
  const trades=getTrades(),t=getTotals(trades),s=CS();
  document.getElementById('statPnl').textContent=s+Math.abs(t.pnl).toLocaleString();
  document.getElementById('statPnl').className='stat-value '+(t.pnl>=0?'green':'red');
  document.getElementById('statPnlSub').textContent=t.fees>0?('Gross '+s+Math.abs(t.gross).toLocaleString(undefined,{maximumFractionDigits:2})+(t.gross<0?' loss':'')+' · Charges '+s+t.fees.toLocaleString(undefined,{maximumFractionDigits:2})):'net of charges';
  document.getElementById('statWin').textContent=t.winRate+'%';
  document.getElementById('statWinSub').textContent=t.wins+'/'+t.total;
  document.getElementById('statR').textContent=t.avgR+'R';
  document.getElementById('statPF').textContent=t.pf;
  document.getElementById('winCount').textContent=t.wins;
  document.getElementById('lossCount').textContent=t.losses;
  document.getElementById('beCount').textContent=t.be;
  document.getElementById('eqBadge').textContent=(t.pnl>=0?'+':'')+s+Math.abs(t.pnl).toLocaleString();
  const sorted=[...trades].sort((a,b)=>tradeDatetime(a)>tradeDatetime(b)?1:-1);
  let cum=0,labels=[],data=[];
  sorted.forEach(tr=>{cum+=tr.pnl;labels.push(tr.date.slice(5));data.push(+cum.toFixed(2));});
  if(eqChart)eqChart.destroy();
  const ctx1=document.getElementById('equityChart').getContext('2d');
  const g=ctx1.createLinearGradient(0,0,0,180);g.addColorStop(0,'rgba(110,231,183,.3)');g.addColorStop(1,'rgba(110,231,183,0)');
  eqChart=new Chart(ctx1,{type:'line',data:{labels,datasets:[{data,borderColor:'#6ee7b7',backgroundColor:g,borderWidth:2,pointRadius:2,fill:true,tension:.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#7a7f95',font:{size:9}},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#7a7f95',font:{size:9},callback:v=>s+v.toLocaleString()},grid:{color:'rgba(255,255,255,.04)'}}}}});
  if(pieChart)pieChart.destroy();
  pieChart=new Chart(document.getElementById('pieChart').getContext('2d'),{type:'doughnut',data:{labels:['W','L','B'],datasets:[{data:[t.wins,t.losses,t.be],backgroundColor:['rgba(110,231,183,.8)','rgba(248,113,113,.8)','rgba(122,127,149,.5)'],borderColor:'#13161e',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:false}}}});
  renderHeatmap();
}

// ── P&L CALENDAR ───────────────────────────────────────────────────────────
const HM_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const HM_MONTHS_FULL=['January','February','March','April','May','June','July','August','September','October','November','December'];
// compact signed amount for narrow screens: 1.2K, 12K, 1.5L (INR lakh), 2Cr
function fmtCompact(v){
  const a=Math.abs(v),sg=v<0?'−':(v>0?'+':''),t=(x,dp)=>String(+x.toFixed(dp));
  if(currentProfile!=='USD'){
    if(a>=1e7)return sg+t(a/1e7,1)+'Cr';
    if(a>=1e5)return sg+t(a/1e5,1)+'L';
  }
  if(a>=1e6)return sg+t(a/1e6,1)+'M';
  if(a>=1e3)return sg+t(a/1e3,a>=1e4?0:1)+'K';
  return sg+t(a,a<10?1:0);
}
// Mon=0 .. Sun=6, built from the local Date(y,m,d) constructor (no string-parsing timezone risk)
function calDow(dateStr){const p=dateStr.split('-');return (new Date(+p[0],+p[1]-1,+p[2]).getDay()+6)%7;}
// Full Mon..Sun weeks covering the month, including the leading/trailing days of neighbouring months
function calendarWeeks(year,month){
  const startDow=calDow(year+'-'+String(month+1).padStart(2,'0')+'-01');
  const start=new Date(year,month,1-startDow);
  const daysInMonth=new Date(year,month+1,0).getDate();
  const endDow=calDow(year+'-'+String(month+1).padStart(2,'0')+'-'+String(daysInMonth).padStart(2,'0'));
  const end=new Date(year,month,daysInMonth+(6-endDow));
  const weeks=[];let cur=new Date(start);
  while(cur<=end){
    const week=[];
    for(let i=0;i<7;i++){week.push({date:dateStr(cur),inMonth:cur.getMonth()===month});cur.setDate(cur.getDate()+1);}
    weeks.push(week);
  }
  return weeks;
}
function weekRangeLabel(d1,d2){
  const m1=HM_MONTHS[+d1.slice(5,7)-1],m2=HM_MONTHS[+d2.slice(5,7)-1],a=+d1.slice(8,10),b=+d2.slice(8,10);
  return m1===m2?(m1+' '+a+' – '+b):(m1+' '+a+' – '+m2+' '+b);
}
function renderHeatmap(){
  const trades=getTrades();
  renderMonthStrip(trades);
  renderCalendarGrid(trades);
}
function renderMonthStrip(trades){
  document.getElementById('calYear').textContent=String(hmYear);
  const agg=Array.from({length:12},()=>({pnl:0,n:0}));
  trades.forEach(t=>{if(+t.date.slice(0,4)===hmYear){const g=agg[+t.date.slice(5,7)-1];g.pnl+=t.pnl;g.n++;}});
  const now=new Date();
  const strip=document.getElementById('calMonthStrip');
  strip.innerHTML=agg.map((g,m)=>{
    const cls=!g.n?'cm-empty':g.pnl>0?'cm-win':g.pnl<0?'cm-loss':'cm-flat';
    const sel=m===hmMonth?' sel':'', isNow=(hmYear===now.getFullYear()&&m===now.getMonth())?' now':'';
    const title=HM_MONTHS_FULL[m]+' '+hmYear+(g.n?': '+fmtSigned(g.pnl)+' · '+g.n+' trade'+(g.n>1?'s':''):': no trades');
    return '<button class="cal-month '+cls+sel+isNow+'" data-m="'+m+'" title="'+escHtml(title)+'"><span class="cm-ab">'+HM_MONTHS[m]+'</span><span class="cm-v">'+(g.n?fmtSigned(g.pnl):'—')+'</span></button>';
  }).join('');
  strip.querySelectorAll('.cal-month').forEach(b=>{b.onclick=()=>{hmMonth=+b.dataset.m;renderHeatmap();};});
}
function renderCalendarGrid(trades){
  const cols=currentProfile==='USD'?7:5;
  const mKey=hmYear+'-'+String(hmMonth+1).padStart(2,'0');
  const byDate={};
  trades.forEach(t=>{
    const g=(byDate[t.date]=byDate[t.date]||{pnl:0,n:0,w:0,l:0,notes:false});
    g.pnl+=t.pnl;g.n++;if(t.pnl>0)g.w++;else if(t.pnl<0)g.l++;if(t.notes&&t.notes.trim())g.notes=true;
  });
  document.getElementById('calMonthTitle').textContent=HM_MONTHS_FULL[hmMonth]+' '+hmYear;
  const monthDates=Object.keys(byDate).filter(dt=>dt.slice(0,7)===mKey);
  const mPnl=monthDates.reduce((a,dt)=>a+byDate[dt].pnl,0);
  const green=monthDates.filter(dt=>byDate[dt].pnl>0).length, red=monthDates.filter(dt=>byDate[dt].pnl<0).length;
  const mTrades=trades.filter(t=>t.date.slice(0,7)===mKey);
  const win=mTrades.filter(t=>t.pnl>0).length, loss=mTrades.filter(t=>t.pnl<0).length;
  const winRate=mTrades.length?Math.round(win/mTrades.length*100):0;
  let best=null,worst=null,active=null;
  monthDates.forEach(dt=>{
    const g=byDate[dt];
    if(!best||g.pnl>best.pnl)best={dt,pnl:g.pnl};
    if(!worst||g.pnl<worst.pnl)worst={dt,pnl:g.pnl};
    if(!active||g.n>active.n)active={dt,n:g.n};
  });
  const dLabel=dt=>HM_MONTHS[+dt.slice(5,7)-1]+' '+ +dt.slice(8,10);
  const stat=(key,label,value,sub)=>'<div class="cal-stat" data-info="'+key+'"><div class="cs-label">'+label+'</div><div class="cs-value">'+value+'</div>'+(sub?'<div class="cs-sub">'+sub+'</div>':'<div class="cs-sub">&nbsp;</div>')+'</div>';
  document.getElementById('calStats').innerHTML=!monthDates.length?'<div class="empty-note">No trades this month.</div>':
    stat('calMPnl','Monthly P&L',fmtSigned(mPnl))+
    stat('calDays','Trading Days',monthDates.length+'d',green+' green · '+red+' red')+
    stat('calTrades','Trades',mTrades.length+' total',win+'W · '+loss+'L')+
    stat('calWinRate','Win Rate',winRate+'%')+
    stat('calBest','Best Day',best?fmtSigned(best.pnl):'—',best?dLabel(best.dt):'')+
    stat('calWorst','Worst Day',worst?fmtSigned(worst.pnl):'—',worst?dLabel(worst.dt):'')+
    stat('calActive','Most Active Day',active?active.n+' trade'+(active.n>1?'s':''):'—',active?dLabel(active.dt):'')+
    stat('calAvg','Avg / Day',monthDates.length?fmtSigned(mPnl/monthDates.length):'—');
  const DOWFULL=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  document.getElementById('calWeekHead').innerHTML=DOWFULL.slice(0,cols).map(dn=>'<div class="cal-dh">'+dn+'</div>').join('')+'<div class="cal-dh cal-wh">Week</div>';
  document.querySelectorAll('.cal-week-head,.cal-week-row').forEach(r=>r.style.gridTemplateColumns='repeat('+cols+',1fr) 1.25fr');
  const weeks=calendarWeeks(hmYear,hmMonth);
  const today=todayStr();
  const body=document.getElementById('calBody');
  body.innerHTML='';
  weeks.forEach(week=>{
    const cells=week.slice(0,cols);
    const rowEl=document.createElement('div');
    rowEl.className='cal-week-row';rowEl.style.gridTemplateColumns='repeat('+cols+',1fr) 1.25fr';
    cells.forEach(day=>{
      const g=byDate[day.date],isToday=day.date===today;
      const el=document.createElement('div');
      el.className='cal-day'+(day.inMonth?'':' out')+(g?(g.pnl>0?' win':g.pnl<0?' loss':' flat'):'')+(selectedDates.has(day.date)?' selected':'')+(isToday?' today':'');
      const dd=+day.date.slice(8,10);
      el.innerHTML='<div class="cd-top"><span class="cd-date">'+dd+'</span>'+(g&&g.notes?'<span class="cd-note" title="Has notes">✎</span>':'')+'</div>'+
        (g?'<div class="cd-pnl">'+fmtSigned(g.pnl)+'</div><div class="cd-meta">'+g.n+' trade'+(g.n>1?'s':'')+'</div>'+((g.w||g.l)?'<div class="cd-wl">'+(g.w?g.w+' Win':'')+(g.w&&g.l?' · ':'')+(g.l?g.l+' Loss':'')+'</div>':''):'');
      el.title=g?fmtSigned(g.pnl)+' · '+g.n+' trade'+(g.n>1?'s':''):'No trades';
      el.onclick=e=>handleCalClick(day.date,e);
      rowEl.appendChild(el);
    });
    const wdates=cells.map(c=>c.date);
    const wtr=trades.filter(t=>wdates.includes(t.date));
    const wpnl=wtr.reduce((a,t)=>a+t.pnl,0);
    const wdays=wdates.filter(dt=>byDate[dt]).length;
    const ww=wtr.filter(t=>t.pnl>0).length, wl=wtr.filter(t=>t.pnl<0).length;
    const wwr=wtr.length?Math.round(ww/wtr.length*100):0;
    const wk=document.createElement('div');
    wk.className='cal-week-sum'+(wtr.length?(wpnl>=0?' win':' loss'):'');
    wk.innerHTML='<div class="cw-range">'+weekRangeLabel(cells[0].date,cells[cells.length-1].date)+'</div>'+
      (wtr.length?('<div class="cw-pnl">'+fmtSigned(wpnl)+'</div><div class="cw-meta">'+wdays+' day'+(wdays>1?'s':'')+' · '+wtr.length+' trade'+(wtr.length>1?'s':'')+'</div><div class="cw-wl">'+ww+' Win · '+wl+' Loss · '+wwr+'%</div>'):'<div class="cw-empty">No trades</div>');
    wk.onclick=()=>openTradePanel('Week: '+weekRangeLabel(cells[0].date,cells[cells.length-1].date),{from:wdates[0],to:wdates[wdates.length-1]},'calendar');
    rowEl.appendChild(wk);
    body.appendChild(rowEl);
  });
  document.getElementById('calClearBtn').style.display=selectedDates.size?'':'none';
  injectInfoIcons(document.getElementById('calStats'));
}
function handleCalClick(k,e){
  if(e.shiftKey&&lastClickedDate)getAllDatesInRange(lastClickedDate,k).forEach(dt=>selectedDates.add(dt));
  else if(e.ctrlKey||e.metaKey){selectedDates.has(k)?selectedDates.delete(k):selectedDates.add(k);}
  else{if(selectedDates.size===1&&selectedDates.has(k))selectedDates.clear();else{selectedDates.clear();selectedDates.add(k);}}
  lastClickedDate=k;
  renderHeatmap();
  openCalendarSelection();
}
function openCalendarSelection(){
  if(!selectedDates.size){if(TP.open&&TP.source==='calendar')closeTradePanel();return;}
  const arr=[...selectedDates].sort();
  const label=arr.length===1?arr[0]:(arr[0]+' → '+arr[arr.length-1]+' ('+arr.length+' days)');
  openTradePanel(label,{dates:arr},'calendar');
}
function getAllDatesInRange(d1,d2){
  const p=s=>s.split('-').map(Number);
  const a=new Date(...[p(d1)[0],p(d1)[1]-1,p(d1)[2]]), b=new Date(...[p(d2)[0],p(d2)[1]-1,p(d2)[2]]);
  const s=a<=b?a:b, end=a<=b?b:a, arr=[];
  for(let d=new Date(s);d<=end;d.setDate(d.getDate()+1))arr.push(dateStr(d));
  return arr;
}
function clearHmSelection(){selectedDates.clear();renderHeatmap();if(TP.open&&TP.source==='calendar')closeTradePanel();}
function hmPrev(){hmYear--;renderHeatmap();}
function hmNext(){hmYear++;renderHeatmap();}

