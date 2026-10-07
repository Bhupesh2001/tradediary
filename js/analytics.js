// ── ANALYTICS ──────────────────────────────────────────────────────────────
function renderAnalytics(){
  const trades=getTrades(),s=CS();
  const sm={};trades.forEach(t=>{sm[t.strat||'Other']=(sm[t.strat||'Other']||0)+t.pnl;});
  if(stratChart)stratChart.destroy();
  const sl=Object.keys(sm),sd=Object.values(sm);
  stratChart=new Chart(document.getElementById('stratChart').getContext('2d'),{type:'bar',plugins:[clickPlugin(i=>openTradePanel('Strategy: '+sl[i],{strat:sl[i]}))],data:{labels:sl,datasets:[{data:sd,backgroundColor:sd.map(v=>v>=0?'rgba(110,231,183,.7)':'rgba(248,113,113,.7)'),borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#7a7f95',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#7a7f95',font:{size:9},callback:v=>s+v},grid:{color:'rgba(255,255,255,.04)'}}}}});
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],dm={};
  trades.forEach(t=>{const d=days[dowOf(t.date)];dm[d]=(dm[d]||0)+t.pnl;});
  if(dowChart)dowChart.destroy();
  dowChart=new Chart(document.getElementById('dowChart').getContext('2d'),{type:'bar',plugins:[clickPlugin(i=>openTradePanel('Weekday: '+days[i],{dow:i}))],data:{labels:days,datasets:[{data:days.map(d=>dm[d]||0),backgroundColor:'rgba(56,189,248,.6)',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#7a7f95',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#7a7f95',font:{size:9},callback:v=>s+v},grid:{color:'rgba(255,255,255,.04)'}}}}});
  const mm={},mc={};
  trades.forEach(t=>{const ym=t.date.slice(0,7);mm[ym]=(mm[ym]||0)+t.pnl;mc[ym]=(mc[ym]||0)+1;});
  const mkeys=Object.keys(mm).sort();
  const mlabels=mkeys.map(k=>{const[y,m]=k.split('-');return['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+' '+y.slice(2);});
  const mdata=mkeys.map(k=>+mm[k].toFixed(2));
  document.getElementById('monthChartBadge').textContent=mkeys.length+' months';
  if(monthChart)monthChart.destroy();
  monthChart=new Chart(document.getElementById('monthChart').getContext('2d'),{type:'bar',plugins:[clickPlugin((i,ds)=>{if(ds===0)openMonthPanel(mkeys[i]);})],
    data:{labels:mlabels,datasets:[
      {data:mdata,backgroundColor:mdata.map(v=>v>=0?'rgba(110,231,183,.75)':'rgba(248,113,113,.75)'),borderRadius:5,label:'P&L'},
      {data:mkeys.map(k=>mc[k]),type:'line',borderColor:'rgba(56,189,248,.8)',backgroundColor:'transparent',borderWidth:2,pointRadius:3,yAxisID:'y2',label:'Trades'}
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:true,labels:{color:'#7a7f95',font:{size:10}}},tooltip:{callbacks:{label:c=>c.datasetIndex===0?s+c.parsed.y.toLocaleString():c.parsed.y+' trades'}}},
      scales:{x:{ticks:{color:'#7a7f95',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#7a7f95',font:{size:9},callback:v=>s+v},grid:{color:'rgba(255,255,255,.04)'},position:'left'},y2:{ticks:{color:'#38bdf8',font:{size:9}},grid:{display:false},position:'right'}},
      }});
  let cum=0,cl=[],cd=[];
  [...trades].sort((a,b)=>tradeDatetime(a)>tradeDatetime(b)?1:-1).forEach(t=>{cum+=t.pnl;cl.push((t.time?t.time+' ':'')+t.date.slice(5));cd.push(+cum.toFixed(2));});
  if(cumChart)cumChart.destroy();
  const ctx=document.getElementById('cumChart').getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,190);g.addColorStop(0,'rgba(56,189,248,.25)');g.addColorStop(1,'rgba(56,189,248,0)');
  cumChart=new Chart(ctx,{type:'line',data:{labels:cl,datasets:[{data:cd,borderColor:'#38bdf8',backgroundColor:g,borderWidth:2,fill:true,tension:.4,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#7a7f95',font:{size:9}},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#7a7f95',font:{size:9},callback:v=>s+v},grid:{color:'rgba(255,255,255,.04)'}}}}});
  renderPerf();
  renderInsights();
}

// ── PSYCHOLOGY ─────────────────────────────────────────────────────────────
function renderPsychology(){
  const trades=getTrades(),emMap={},emPnl={};
  trades.forEach(t=>{const e=t.emotion||'neutral';emMap[e]=(emMap[e]||0)+1;emPnl[e]=(emPnl[e]||0)+t.pnl;});
  const emL=Object.keys(emMap);
  const emC={calm:'rgba(110,231,183,.8)',fear:'rgba(251,191,36,.8)',greed:'rgba(248,113,113,.8)',revenge:'rgba(239,68,68,.8)',confident:'rgba(56,189,248,.8)',disciplined:'rgba(167,139,250,.8)'};
  if(emChart)emChart.destroy();
  emChart=new Chart(document.getElementById('emotionChart').getContext('2d'),{type:'doughnut',plugins:[clickPlugin(i=>openTradePanel('Emotion: '+emL[i],{emotion:emL[i]}),{mode:'nearest',intersect:true})],data:{labels:emL,datasets:[{data:emL.map(e=>emMap[e]),backgroundColor:emL.map(e=>emC[e]||'rgba(122,127,149,.6)'),borderColor:'#13161e',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{legend:{position:'right',labels:{color:'#7a7f95',font:{size:10}}}}}});
  const ep=document.getElementById('emotionPnlTable');ep.innerHTML='';
  [...emL].sort((a,b)=>emPnl[b]-emPnl[a]).forEach(e=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:6px 9px;background:var(--surface2);border-radius:8px';
    row.style.cursor='pointer';row.title='Click to list these trades';row.onclick=()=>openTradePanel('Emotion: '+e,{emotion:e});
    const pnl=emPnl[e];
    row.innerHTML=`<span class="em-tag ${e}" style="padding:2px 9px;font-size:10px">${e}</span><span style="font-family:var(--mono);font-size:12px;font-weight:600;color:${pnl>=0?'var(--accent)':'var(--danger)'}">${fmtPnl(pnl)}</span><span style="font-size:11px;color:var(--muted)">${emMap[e]} trades</span>`;
    ep.appendChild(row);
  });
  const ins=document.getElementById('psychInsights');
  const maxL=Object.entries(emPnl).sort((a,b)=>a[1]-b[1])[0];
  const maxW=Object.entries(emPnl).sort((a,b)=>b[1]-a[1])[0];
  ins.innerHTML=[
    maxL?`⚠️ Worst state: <b style="color:var(--danger)">${maxL[0]}</b> — ${fmtPnl(maxL[1])} in losses.`:'',
    maxW?`✅ Best state: <b style="color:var(--accent)">${maxW[0]}</b> — ${fmtPnl(maxW[1])} in gains.`:'',
    emMap['revenge']?`🔴 <b>${emMap['revenge']}</b> revenge trade(s). Add a cool-down rule.`:'',
    `📊 <b>${trades.length}</b> trades across <b>${emL.length}</b> emotional states.`
  ].filter(Boolean).join('<br><br>');
}

