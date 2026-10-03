// ── PERFORMANCE METRICS (net P&L) ──────────────────────────────────────────
function getCapital(){return parseFloat(lsGet('td_capital_'+currentProfile,''))||0}
function daysBetween(a,b){return Math.round((Date.UTC(+b.slice(0,4),+b.slice(5,7)-1,+b.slice(8,10))-Date.UTC(+a.slice(0,4),+a.slice(5,7)-1,+a.slice(8,10)))/864e5)}

function computePerf(trades){
  const sorted=[...trades].sort((a,b)=>tradeDatetime(a)>tradeDatetime(b)?1:-1);
  const n=sorted.length, cap=getCapital();
  const wins=sorted.filter(t=>t.pnl>0), losses=sorted.filter(t=>t.pnl<0);
  const net=sorted.reduce((a,t)=>a+t.pnl,0);
  const avgWin=wins.length?wins.reduce((a,t)=>a+t.pnl,0)/wins.length:0;
  const avgLoss=losses.length?Math.abs(losses.reduce((a,t)=>a+t.pnl,0))/losses.length:0;
  const payoff=avgLoss>0?avgWin/avgLoss:null;
  const winRate=n?wins.length/n:0;
  const beWin=payoff!==null?1/(1+payoff):null;
  // expectancy in R (only trades with a stop loss)
  let rSum=0,rN=0;
  sorted.forEach(t=>{if(t.sl&&t.entry){const risk=Math.abs(t.entry-t.sl)*t.qty;if(risk>0){rSum+=t.pnl/risk;rN++;}}});
  // drawdown
  let eq=0,peak=0,peakDate=null,maxDD=0,maxDDPeak=null,maxDDDate=null,maxPct=0;
  let ddStart=null,maxDur=0,durOngoing=false;
  const labels=[],ddSeries=[];
  sorted.forEach(t=>{
    eq+=t.pnl;
    if(eq>=peak){
      if(ddStart){const dur=daysBetween(ddStart,t.date);if(dur>maxDur){maxDur=dur;durOngoing=false;}ddStart=null;}
      if(eq>peak){peak=eq;peakDate=t.date;}
    } else if(!ddStart){ddStart=peakDate||t.date;}
    const d=peak-eq;
    if(d>maxDD){maxDD=d;maxDDPeak=peakDate||t.date;maxDDDate=t.date;}
    if(cap>0){const p=d/(cap+peak);if(p>maxPct)maxPct=p;}
    labels.push((t.time?t.time+' ':'')+t.date.slice(5));
    ddSeries.push(+(-d).toFixed(2));
  });
  if(ddStart&&n){const dur=daysBetween(ddStart,sorted[n-1].date);if(dur>=maxDur){maxDur=dur;durOngoing=true;}}
  const curDD=peak-eq, curPct=cap>0?curDD/(cap+peak):0;
  // streaks (breakeven ignored)
  let cw=0,cl=0,mw=0,ml=0;
  sorted.forEach(t=>{
    if(t.pnl>0){cw++;cl=0;}else if(t.pnl<0){cl++;cw=0;}else return;
    if(cw>mw)mw=cw; if(cl>ml)ml=cl;
  });
  const cur=cw>0?{n:cw,type:'W'}:cl>0?{n:cl,type:'L'}:null;
  // extremes
  const byPnl=[...sorted].sort((a,b)=>b.pnl-a.pnl);
  const best=byPnl[0], worst=byPnl[byPnl.length-1];
  const dayMap={};sorted.forEach(t=>{(dayMap[t.date]=dayMap[t.date]||{pnl:0,n:0});dayMap[t.date].pnl+=t.pnl;dayMap[t.date].n++;});
  const days=Object.entries(dayMap).map(([date,v])=>({date,pnl:v.pnl,n:v.n}));
  const bestDay=days.length?days.reduce((a,b)=>b.pnl>a.pnl?b:a):null;
  const worstDay=days.length?days.reduce((a,b)=>b.pnl<a.pnl?b:a):null;
  const green=days.filter(d=>d.pnl>0).length;
  return {n,cap,net,wins:wins.length,losses:losses.length,avgWin,avgLoss,payoff,winRate,beWin,
    expectancy:n?net/n:0,expR:rN?rSum/rN:null,rN,
    maxDD,maxDDPeak,maxDDDate,maxPct,curDD,curPct,maxDur,durOngoing,
    maxWinStreak:mw,maxLossStreak:ml,cur,best,worst,bestDay,worstDay,tradingDays:days.length,green,labels,ddSeries};
}

function renderPerf(){
  const grid=document.getElementById('perfGrid'); if(!grid) return;
  const trades=getTrades(), s=CS(), loc=currentProfile==='INR'?'en-IN':'en-US';
  const money=v=>s+Math.abs(v).toLocaleString(loc,{maximumFractionDigits:2});
  const sgn=v=>(v<0?'−':v>0?'+':'')+money(v);
  const pct=x=>(x*100).toFixed(1)+'%';
  const cap=getCapital();
  document.getElementById('capCur').textContent='('+s+')';
  const ci=document.getElementById('capInput');
  if(document.activeElement!==ci) ci.value=cap||'';
  if(ddChart){ddChart.destroy();ddChart=null;}
  if(!trades.length){grid.innerHTML='<div style="color:var(--muted);font-size:13px;padding:6px 0">Log some trades to see performance metrics.</div>';return;}
  const P=computePerf(trades);
  const card=(key,label,val,sub,cls)=>`<div class="stat-card"><div class="stat-label" data-info="${key}">${label}</div><div class="stat-value ${cls||''}" style="font-size:19px">${val}</div><div class="stat-sub">${sub||'&nbsp;'}</div></div>`;
  const pn=v=>v>0?'green':v<0?'red':'';
  const short=d=>d?d.slice(5):'';
  const edge=[
    card('expectancy','Expectancy',sgn(P.expectancy),'per trade'+(P.expR!==null?` · ${P.expR>=0?'+':'−'}${Math.abs(P.expR).toFixed(2)}R (${P.rN} w/ SL)`:''),pn(P.expectancy)),
    card('avgWin','Avg Win',P.wins?sgn(P.avgWin):'—',P.wins+' winning trades',P.wins?'green':''),
    card('avgLoss','Avg Loss',P.losses?'−'+money(P.avgLoss):'—',P.losses+' losing trades',P.losses?'red':''),
    card('payoff','Payoff Ratio',P.payoff!==null?P.payoff.toFixed(2):'—','avg win ÷ avg loss',P.payoff!==null?(P.payoff>=1?'green':'red'):''),
    card('beWin','Break-even Win %',P.beWin!==null?pct(P.beWin):'—','your win rate '+pct(P.winRate),P.beWin!==null?(P.winRate>P.beWin?'green':'red'):'')
  ];
  const risk=[
    card('maxDD','Max Drawdown',P.maxDD>0?'−'+money(P.maxDD):'None',P.maxDD>0?((cap>0?pct(P.maxPct)+' · ':'')+short(P.maxDDPeak)+' → '+short(P.maxDDDate)):'no losing stretch yet',P.maxDD>0?'red':'green'),
    card('curDD','Current Drawdown',P.curDD>0?'−'+money(P.curDD):'At high',P.curDD>0?(cap>0?pct(P.curPct)+' below peak':'below peak equity'):'new equity high',P.curDD>0?'red':'green'),
    card('ddDuration','Longest Drawdown',P.maxDur+' d',P.maxDD>0?(P.durOngoing?'ongoing':'recovered'):'—'),
    card('recovery','Recovery Factor',P.maxDD>0?(P.net/P.maxDD).toFixed(2):'—','net ÷ max drawdown',P.maxDD>0?(P.net>0?'green':'red'):'')
  ];
  if(cap>0) risk.push(card('returnCap','Return on Capital',(P.net>=0?'+':'−')+pct(Math.abs(P.net)/cap),'on '+money(cap),pn(P.net)));
  const tr=(t)=>t?`${escHtml(t.sym)} · ${t.date}`:'';
  const ext=[
    card('bestTrade','Best Trade',P.best?sgn(P.best.pnl):'—',tr(P.best),P.best&&P.best.pnl>0?'green':''),
    card('worstTrade','Worst Trade',P.worst?sgn(P.worst.pnl):'—',tr(P.worst),P.worst&&P.worst.pnl<0?'red':''),
    card('bestDay','Best Day',P.bestDay?sgn(P.bestDay.pnl):'—',P.bestDay?`${P.bestDay.date} · ${P.bestDay.n} trade${P.bestDay.n>1?'s':''}`:'',P.bestDay&&P.bestDay.pnl>0?'green':''),
    card('worstDay','Worst Day',P.worstDay?sgn(P.worstDay.pnl):'—',P.worstDay?`${P.worstDay.date} · ${P.worstDay.n} trade${P.worstDay.n>1?'s':''}`:'',P.worstDay&&P.worstDay.pnl<0?'red':''),
    card('winStreak','Max Win Streak',P.maxWinStreak,'consecutive wins','green'),
    card('lossStreak','Max Loss Streak',P.maxLossStreak,'consecutive losses',P.maxLossStreak?'red':''),
    card('curStreak','Current Streak',P.cur?P.cur.n+' '+P.cur.type:'—','latest trades',P.cur?(P.cur.type==='W'?'green':'red'):''),
    card('greenDays','Green Days',P.tradingDays?pct(P.green/P.tradingDays):'—',P.green+' of '+P.tradingDays+' days',P.tradingDays&&P.green/P.tradingDays>=.5?'green':'')
  ];
  const grp=(title,cards)=>`<div class="perf-group-title">${title}</div><div class="stats-grid perf-grid">${cards.join('')}</div>`;
  grid.innerHTML=grp('Edge',edge)+grp('Risk & Drawdown',risk)+grp('Streaks & Extremes',ext);
  // underwater chart
  const ctx=document.getElementById('ddChart').getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,190);g.addColorStop(0,'rgba(248,113,113,0)');g.addColorStop(1,'rgba(248,113,113,.3)');
  ddChart=new Chart(ctx,{type:'line',data:{labels:P.labels,datasets:[{data:P.ddSeries,borderColor:'#f87171',backgroundColor:g,borderWidth:2,fill:true,tension:.3,pointRadius:1.5}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>'Drawdown '+(c.parsed.y<0?'−':'')+money(c.parsed.y)}}},
      scales:{x:{ticks:{color:'#7a7f95',font:{size:9}},grid:{display:false}},y:{max:0,ticks:{color:'#7a7f95',font:{size:9},callback:v=>(v<0?'−':'')+s+Math.abs(v)},grid:{color:'rgba(255,255,255,.04)'}}}}});
  injectInfoIcons(grid);
}

document.getElementById('capInput').addEventListener('change',e=>{
  const v=parseFloat(e.target.value);
  lsSet('td_capital_'+currentProfile,isNaN(v)||v<=0?'':String(v));
  renderPerf();
});
