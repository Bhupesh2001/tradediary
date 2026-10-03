// ── RICHER ANALYTICS: time of day, symbol, direction, holding time ─────────
function groupStats(list){
  const n=list.length,wins=list.filter(t=>t.pnl>0),losses=list.filter(t=>t.pnl<0);
  const net=list.reduce((a,t)=>a+t.pnl,0),gw=wins.reduce((a,t)=>a+t.pnl,0),gl=Math.abs(losses.reduce((a,t)=>a+t.pnl,0));
  return {n,wins:wins.length,winRate:n?wins.length/n:0,net,avgWin:wins.length?gw/wins.length:0,avgLoss:losses.length?gl/losses.length:0,pf:gl>0?gw/gl:null,exp:n?net/n:0};
}

function renderInsights(){
  const trades=getTrades(),s=CS();
  [todChart,symChart,holdChart].forEach(c=>{if(c)c.destroy();});todChart=symChart=holdChart=null;
  const tick={color:'#7a7f95',font:{size:10}},grid={color:'rgba(255,255,255,.04)'};
  const col=v=>v>=0?'rgba(110,231,183,.75)':'rgba(248,113,113,.75)';
  const yFmt=v=>(v<0?'−':'')+s+Math.abs(v).toLocaleString();
  const show=(id,on)=>{const el=document.getElementById(id);if(el)el.parentElement.style.display=on?'':'none';};
  const tipExtra=arr=>({callbacks:{label:c=>fmtSigned(c.parsed.x!==undefined&&c.chart.options.indexAxis==='y'?c.parsed.x:c.parsed.y),afterLabel:c=>{const g=arr[c.dataIndex];return g.n+' trade'+(g.n>1?'s':'')+' · '+Math.round(g.w/g.n*100)+'% win';}}});

  // ---- time of day (entry hour)
  const withTime=trades.filter(realTime),hrs={};
  withTime.forEach(t=>{const h=+t.time.slice(0,2);const g=(hrs[h]=hrs[h]||{pnl:0,n:0,w:0});g.pnl+=t.pnl;g.n++;if(t.pnl>0)g.w++;});
  const hk=Object.keys(hrs).map(Number).sort((a,b)=>a-b),hg=hk.map(h=>hrs[h]);
  const skipped=trades.length-withTime.length;
  show('todChart',hk.length>0);
  if(hk.length){
    const best=hk.reduce((a,b)=>hrs[b].pnl>hrs[a].pnl?b:a),worst=hk.reduce((a,b)=>hrs[b].pnl<hrs[a].pnl?b:a),hh=h=>String(h).padStart(2,'0')+':00';
    document.getElementById('todNote').textContent='Best hour '+hh(best)+' ('+fmtSigned(hrs[best].pnl)+', '+hrs[best].n+' trades) · Worst hour '+hh(worst)+' ('+fmtSigned(hrs[worst].pnl)+', '+hrs[worst].n+' trades)'+(skipped?' · '+skipped+' trade(s) without a time excluded':'');
    todChart=new Chart(document.getElementById('todChart').getContext('2d'),{type:'bar',data:{labels:hk.map(hh),datasets:[{data:hg.map(g=>+g.pnl.toFixed(2)),backgroundColor:hg.map(g=>col(g.pnl)),borderRadius:5}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:tipExtra(hg)},scales:{x:{ticks:tick,grid:{display:false}},y:{ticks:{...tick,callback:yFmt},grid}}}});
  } else document.getElementById('todNote').textContent=trades.length?'Add a Time when logging trades to see performance by hour.':'No trades yet.';

  // ---- by symbol
  const sm={};trades.forEach(t=>{const k=(t.sym||'?').toUpperCase();const g=(sm[k]=sm[k]||{k,pnl:0,n:0,w:0});g.pnl+=t.pnl;g.n++;if(t.pnl>0)g.w++;});
  let arr=Object.values(sm).sort((a,b)=>b.pnl-a.pnl);
  const trimmed=arr.length>15;if(trimmed)arr=[...arr.slice(0,8),...arr.slice(-7)];
  show('symChart',arr.length>0);
  document.getElementById('symNote').textContent=arr.length?(trimmed?'Showing your 8 best and 7 worst of '+Object.keys(sm).length+' symbols':Object.keys(sm).length+' symbol'+(arr.length>1?'s':'')):'No trades yet.';
  if(arr.length){
    document.getElementById('symChart').parentElement.style.height=Math.max(150,arr.length*26+40)+'px';
    symChart=new Chart(document.getElementById('symChart').getContext('2d'),{type:'bar',data:{labels:arr.map(g=>g.k),datasets:[{data:arr.map(g=>+g.pnl.toFixed(2)),backgroundColor:arr.map(g=>col(g.pnl)),borderRadius:4}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:tipExtra(arr)},scales:{x:{ticks:{...tick,callback:yFmt},grid},y:{ticks:tick,grid:{display:false}}}}});
  }

  // ---- long vs short
  const L=groupStats(trades.filter(t=>t.dir==='LONG')),S2=groupStats(trades.filter(t=>t.dir==='SHORT'));
  const cell=(g,f)=>g.n?f(g):'—';
  const pc=g=>Math.round(g.winRate*100)+'%',cl=v=>`<span style="color:var(--${v>=0?'accent':'danger'})">${fmtSigned(v)}</span>`;
  const row=(label,f)=>`<tr><td>${label}</td><td>${cell(L,f)}</td><td>${cell(S2,f)}</td></tr>`;
  document.getElementById('dirTable').innerHTML=!trades.length?'<div class="empty-note">No trades yet.</div>':
    '<table class="mini-table"><thead><tr><th></th><th class="dir-long">Long</th><th class="dir-short">Short</th></tr></thead><tbody>'+
    row('Trades',g=>g.n)+row('Win rate',pc)+row('Net P&L',g=>cl(g.net))+row('Expectancy',g=>cl(g.exp))+
    row('Avg win',g=>fmtMoney(g.avgWin))+row('Avg loss',g=>g.avgLoss?'−'+fmtMoney(g.avgLoss):'—')+row('Profit factor',g=>g.pf===null?'—':g.pf.toFixed(2))+'</tbody></table>';

  // ---- holding time
  const hv=trades.map(t=>({t,m:holdMinutes(t)})).filter(x=>x.m!==null);
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  const aAll=avg(hv.map(x=>x.m)),aW=avg(hv.filter(x=>x.t.pnl>0).map(x=>x.m)),aL=avg(hv.filter(x=>x.t.pnl<0).map(x=>x.m));
  const sc=(key,label,v,cls)=>`<div class="stat-card"><div class="stat-label" data-info="${key}">${label}</div><div class="stat-value ${cls||''}" style="font-size:19px">${v===null?'—':fmtDur(v)}</div></div>`;
  document.getElementById('holdStats').innerHTML=hv.length?sc('holdAvg','Avg Hold',aAll)+sc('holdWin','Winners Avg',aW,'green')+sc('holdLoss','Losers Avg',aL,'red'):'';
  show('holdChart',hv.length>0);
  if(hv.length){
    const B=[{l:'<5m',max:5},{l:'5–15m',max:15},{l:'15–30m',max:30},{l:'30–60m',max:60},{l:'1–2h',max:120},{l:'2h+',max:Infinity}].map(b=>({...b,pnl:0,n:0,w:0}));
    hv.forEach(({t,m})=>{const b=B.find(x=>m<x.max);b.pnl+=t.pnl;b.n++;if(t.pnl>0)b.w++;});
    const used=B.filter(b=>b.n);
    holdChart=new Chart(document.getElementById('holdChart').getContext('2d'),{type:'bar',data:{labels:used.map(b=>b.l),datasets:[{data:used.map(b=>+b.pnl.toFixed(2)),backgroundColor:used.map(b=>col(b.pnl)),borderRadius:5}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:tipExtra(used)},scales:{x:{ticks:tick,grid:{display:false}},y:{ticks:{...tick,callback:yFmt},grid}}}});
    let msg=hv.length+' of '+trades.length+' trades have both entry and exit time. ';
    if(aW!==null&&aL!==null){
      if(aL>aW*1.3)msg+='You hold losers about '+(aL/aW).toFixed(1)+'× longer than winners — a common sign of hoping instead of cutting losses.';
      else if(aW>aL*1.3)msg+='You hold winners longer than losers — a healthy pattern.';
      else msg+='Winners and losers are held for similar times.';
    }
    document.getElementById('holdNote').textContent=msg;
  } else document.getElementById('holdNote').textContent=trades.length?'Add an Exit Time (next to Time) when logging trades to unlock holding-time stats.':'No trades yet.';
  injectInfoIcons(document.getElementById('pageAnalytics'));
}
