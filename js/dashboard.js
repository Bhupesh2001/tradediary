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

// ── HEATMAP ────────────────────────────────────────────────────────────────
function renderHeatmap(){
  const trades=getTrades(),dayPnl={};
  trades.forEach(t=>{dayPnl[t.date]=(dayPnl[t.date]||0)+t.pnl;});
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('hmMonthLabel').textContent=months[hmMonth]+' '+hmYear;
  const hm=document.getElementById('heatmap');hm.innerHTML='';
  const first=new Date(hmYear,hmMonth,1).getDay();
  const days=new Date(hmYear,hmMonth+1,0).getDate();
  for(let i=0;i<first;i++){const e=document.createElement('div');e.className='hm-day empty';hm.appendChild(e);}
  for(let d=1;d<=days;d++){
    const key=`${hmYear}-${String(hmMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el=document.createElement('div');
    const v=dayPnl[key];
    el.textContent=d;
    el.className='hm-day '+(v===undefined?'neutral':v>0?'win':'loss')+(selectedDates.has(key)?' selected':'');
    el.title=v!==undefined?fmtPnl(v):'No trades';
    el.onclick=e=>handleHmClick(key,e);
    hm.appendChild(el);
  }
}
function handleHmClick(k,e){
  if(e.shiftKey&&lastClickedDate)getAllDatesInRange(lastClickedDate,k).forEach(d=>selectedDates.add(d));
  else if(e.ctrlKey||e.metaKey){selectedDates.has(k)?selectedDates.delete(k):selectedDates.add(k);}
  else{if(selectedDates.size===1&&selectedDates.has(k))selectedDates.clear();else{selectedDates.clear();selectedDates.add(k);}}
  lastClickedDate=k;renderHeatmap();renderDayPanel();
}
function getAllDatesInRange(d1,d2){
  const s=new Date(Math.min(new Date(d1),new Date(d2))),end=new Date(Math.max(new Date(d1),new Date(d2))),arr=[];
  for(let d=new Date(s);d<=end;d.setDate(d.getDate()+1))arr.push(d.toISOString().slice(0,10));
  return arr;
}
function clearHmSelection(){selectedDates.clear();renderHeatmap();renderDayPanel();}
function hmPrevMonth(){hmMonth--;if(hmMonth<0){hmMonth=11;hmYear--;}renderHeatmap();renderDayPanel();}
function hmNextMonth(){hmMonth++;if(hmMonth>11){hmMonth=0;hmYear++;}renderHeatmap();renderDayPanel();}

function renderDayPanel(){
  const panel=document.getElementById('dayTradesPanel');
  if(!selectedDates.size){panel.style.display='none';return;}
  panel.style.display='block';
  const dateArr=[...selectedDates].sort();
  document.getElementById('dayPanelTitle').textContent=dateArr.length===1?dateArr[0]:dateArr[0]+' → '+dateArr[dateArr.length-1];
  const strats=[...new Set(getTrades().map(t=>t.strat).filter(Boolean))];
  document.getElementById('fStrategy').innerHTML='<option value="">All strategies</option>'+strats.map(s=>`<option>${s}</option>`).join('');
  let trades=getTrades().filter(t=>selectedDates.has(t.date));
  trades=applyFilters(trades,document.getElementById('fSymbol').value,document.getElementById('fPnl').value,document.getElementById('fEmotion').value,'',document.getElementById('fSort').value);
  document.getElementById('dayPanelCount').textContent=trades.length+' trades';
  renderTradeRows('dayTradesTbody',trades);
}

