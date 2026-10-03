// ── RULES & GOALS ──────────────────────────────────────────────────────────
// Rules are stored per profile in Firebase at users/{uid}/rules/{INR|USD}.
let allRules = {};
let rulesListenerActive = false;
const RULE_DEFAULTS = {maxDailyLoss:0,maxDailyTrades:0,maxConsecLosses:0,maxLossPerTrade:0,cooldownMin:0,monthlyTarget:0,flagSizeUp:true};
const RULE_FIELDS = ['maxDailyLoss','maxDailyTrades','maxConsecLosses','maxLossPerTrade','cooldownMin','monthlyTarget'];

function fmtMoney(v){return CS()+Math.abs(v).toLocaleString(currentProfile==='INR'?'en-IN':'en-US',{maximumFractionDigits:2})}
function fmtSigned(v){return (v<0?'−':v>0?'+':'')+fmtMoney(v)}
function getRules(){return Object.assign({},RULE_DEFAULTS,allRules[currentProfile]||{})}
function rulesConfigured(R){return R.maxDailyLoss>0||R.maxDailyTrades>0||R.maxConsecLosses>0||R.maxLossPerTrade>0||R.cooldownMin>0||R.monthlyTarget>0}

function startRulesListener(){
  if(!currentUID||!window._fbReady||rulesListenerActive)return;
  rulesListenerActive=true;
  window._fbListen('users/'+currentUID+'/rules',data=>{allRules=data||{};renderPage(currentPage);});
}
function saveRules(){
  const obj={flagSizeUp:document.getElementById('r_flagSizeUp').checked};
  RULE_FIELDS.forEach(k=>{const v=parseFloat(document.getElementById('r_'+k).value);obj[k]=(isNaN(v)||v<0)?0:v;});
  ['maxDailyTrades','maxConsecLosses','cooldownMin'].forEach(k=>obj[k]=Math.round(obj[k]));
  allRules[currentProfile]=obj;
  if(currentUID&&window._fbReady){
    setSyncStatus('syncing','Saving...');
    window._fbSet('users/'+currentUID+'/rules/'+currentProfile,obj).then(()=>setSyncStatus('synced','Synced ✓')).catch(()=>setSyncStatus('error','Error'));
  }
  renderPage(currentPage);
  const b=document.getElementById('rulesSaved');b.style.display='inline';setTimeout(()=>b.style.display='none',1800);
}

function notional(t){return t.amount?t.amount*(t.leverage||1):(t.entry||0)*(t.qty||1)}

// Walk every trade chronologically and flag rule breaks. Pure function (no DOM).
function evalRules(trades,R){
  const sorted=[...trades].sort((a,b)=>tradeDatetime(a)>tradeDatetime(b)?1:-1);
  const flags={},days={};
  const add=(id,r)=>{(flags[id]=flags[id]||[]).push(r)};
  const byDate={};sorted.forEach(t=>{(byDate[t.date]=byDate[t.date]||[]).push(t)});
  const afterLoss={n:0,w:0};let quick=0,sizeUp=0;
  Object.keys(byDate).sort().forEach(date=>{
    let cum=0,consec=0,prev=null;
    const day={date,pnl:0,n:0,consec:0,breaches:[]};
    byDate[date].forEach((t,idx)=>{
      if(R.maxDailyLoss>0&&cum<=-R.maxDailyLoss)add(t.id,'Traded after the daily loss limit was hit');
      if(R.maxDailyTrades>0&&idx>=R.maxDailyTrades)add(t.id,'Trade #'+(idx+1)+' exceeds the max of '+R.maxDailyTrades+' per day');
      if(R.maxConsecLosses>0&&consec>=R.maxConsecLosses)add(t.id,'Traded after '+R.maxConsecLosses+' losses in a row');
      if(R.maxLossPerTrade>0&&t.pnl<=-R.maxLossPerTrade)add(t.id,'Loss at or above the per-trade limit');
      if(prev&&prev.pnl<0){
        afterLoss.n++;if(t.pnl>0)afterLoss.w++;
        if(R.cooldownMin>0&&realTime(t)&&realTime(prev)){
          const gap=toMin(t.time)-toMin(prev.time);
          if(gap>=0&&gap<R.cooldownMin){add(t.id,'Re-entered '+gap+' min after a loss (cooldown '+R.cooldownMin+' min)');quick++;}
        }
        if(R.flagSizeUp&&notional(prev)>0&&notional(t)>1.5*notional(prev)){add(t.id,'Position size increased after a loss');sizeUp++;}
      }
      if(t.emotion==='revenge')add(t.id,'Tagged as a revenge trade');
      cum+=t.pnl;day.pnl=cum;day.n++;
      consec=t.pnl<0?consec+1:(t.pnl>0?0:consec);
      prev=t;
    });
    day.consec=consec;
    if(R.maxDailyLoss>0&&day.pnl<=-R.maxDailyLoss)day.breaches.push('Daily loss limit hit');
    day.flagged=byDate[date].filter(t=>flags[t.id]).length;
    day.clean=day.flagged===0&&day.breaches.length===0;
    days[date]=day;
  });
  const sum=a=>a.reduce((x,t)=>x+t.pnl,0);
  const flaggedT=sorted.filter(t=>flags[t.id]),cleanT=sorted.filter(t=>!flags[t.id]);
  const revT=sorted.filter(t=>t.emotion==='revenge');
  const dayList=Object.values(days).sort((a,b)=>a.date<b.date?-1:1);
  let cleanStreak=0;for(let i=dayList.length-1;i>=0;i--){if(dayList[i].clean)cleanStreak++;else break;}
  const cutoff=dateStr(new Date(Date.now()-30*864e5));
  const last30=dayList.filter(d=>d.date>=cutoff);
  return {flags,days,dayList,flaggedT,cleanT,pnlFlagged:sum(flaggedT),pnlClean:sum(cleanT),revT,revPnl:sum(revT),quick,sizeUp,afterLoss,
    overallWR:sorted.length?sorted.filter(t=>t.pnl>0).length/sorted.length:0,cleanStreak,cutoff,last30,cleanDays30:last30.filter(d=>d.clean).length};
}

// Today's status against the limits (drives the banner + status cards)
function ruleStatus(trades,R){
  const E=evalRules(trades,R),today=todayStr();
  const d=E.days[today]||{pnl:0,n:0,consec:0};
  const mKey=today.slice(0,7);
  const mPnl=trades.filter(t=>t.date.slice(0,7)===mKey).reduce((a,t)=>a+t.pnl,0);
  const items=[];
  const cls=v=>v>0?'green':v<0?'red':'';
  // daily loss
  if(R.maxDailyLoss>0){
    const pct=Math.max(0,-d.pnl)/R.maxDailyLoss,lvl=pct>=1?'danger':pct>=.8?'warn':'ok';
    items.push({key:'rDaily',label:'Daily P&L',value:fmtSigned(d.pnl),sub:'Loss limit '+fmtMoney(R.maxDailyLoss)+' · '+Math.round(pct*100)+'% used',cls:cls(d.pnl),pct:pct*100,level:lvl,
      banner:lvl==='danger'?'⛔ Daily loss limit reached ('+fmtSigned(d.pnl)+' of −'+fmtMoney(R.maxDailyLoss)+'). Stop trading for today.':lvl==='warn'?'⚠️ Daily loss is at '+Math.round(pct*100)+'% of your limit ('+fmtSigned(d.pnl)+').':''});
  } else items.push({key:'rDaily',label:'Daily P&L',value:fmtSigned(d.pnl),sub:'No daily loss limit set',cls:cls(d.pnl),pct:null,level:'ok',banner:''});
  // trades per day
  if(R.maxDailyTrades>0){
    const pct=d.n/R.maxDailyTrades,lvl=d.n>=R.maxDailyTrades?'danger':pct>=.8?'warn':'ok';
    items.push({key:'rTrades',label:'Trades Today',value:d.n+' / '+R.maxDailyTrades,sub:'Max trades per day',cls:lvl==='danger'?'red':'',pct:pct*100,level:lvl,
      banner:lvl==='danger'?'⛔ Max trades for today reached ('+d.n+'/'+R.maxDailyTrades+'). Any further trade breaks your rule.':lvl==='warn'?'⚠️ '+d.n+' of '+R.maxDailyTrades+' trades used today.':''});
  } else items.push({key:'rTrades',label:'Trades Today',value:String(d.n),sub:'No daily trade cap set',cls:'',pct:null,level:'ok',banner:''});
  // consecutive losses
  if(R.maxConsecLosses>0){
    const pct=d.consec/R.maxConsecLosses,lvl=d.consec>=R.maxConsecLosses?'danger':(R.maxConsecLosses>=2&&d.consec===R.maxConsecLosses-1)?'warn':'ok';
    items.push({key:'rStreak',label:'Loss Streak Today',value:d.consec+' / '+R.maxConsecLosses,sub:'Losses in a row',cls:lvl==='danger'?'red':'',pct:pct*100,level:lvl,
      banner:lvl==='danger'?'⛔ '+d.consec+' losses in a row — your rule says stop for the day.':lvl==='warn'?'⚠️ One more loss reaches your streak limit.':''});
  } else items.push({key:'rStreak',label:'Loss Streak Today',value:String(d.consec),sub:'No streak limit set',cls:'',pct:null,level:'ok',banner:''});
  // monthly target
  if(R.monthlyTarget>0){
    const pct=mPnl/R.monthlyTarget*100,lvl=pct>=100?'success':'ok';
    items.push({key:'rMonth',label:'Monthly Target',value:fmtSigned(mPnl),sub:'Target '+fmtMoney(R.monthlyTarget)+' · '+Math.round(pct)+'%',cls:cls(mPnl),pct,level:lvl,
      banner:lvl==='success'?'🎯 Monthly target reached ('+fmtSigned(mPnl)+')! Consider protecting your gains.':''});
  } else items.push({key:'rMonth',label:'Monthly Target',value:fmtSigned(mPnl),sub:'No monthly target set',cls:cls(mPnl),pct:null,level:'ok',banner:''});
  return {E,today:d,mPnl,items};
}

// Banner shown on every page when a limit is hit / close / goal reached
function updateRuleBanner(){
  const el=document.getElementById('ruleBanner');if(!el)return;
  const R=getRules();
  if(!currentUID||!rulesConfigured(R)){el.style.display='none';return;}
  const S=ruleStatus(getTrades(),R);
  const pick=l=>S.items.filter(i=>i.level===l&&i.banner);
  let lvl='danger',msgs=pick('danger');
  if(!msgs.length){lvl='warn';msgs=pick('warn');}
  if(!msgs.length){lvl='success';msgs=pick('success');}
  if(!msgs.length){el.style.display='none';return;}
  el.className='rule-banner '+lvl;el.textContent='';
  msgs.forEach(m=>{const d=document.createElement('div');d.textContent=m.banner;el.appendChild(d);});
  const hint=document.createElement('div');hint.className='rb-hint';hint.textContent='Tap to review your rules';el.appendChild(hint);
  el.style.display='block';
}

// ⚑ marker for the trade log
function ruleFlagMap(){return evalRules(getTrades(),getRules()).flags}
function flagMark(map,id){return map[id]?'<span class="rule-flag" title="'+escHtml(map[id].join('\n'))+'">⚑</span>':''}

function renderRules(){
  const R=getRules(),trades=getTrades(),S=ruleStatus(trades,R),E=S.E;
  document.getElementById('rulesProfileBadge').textContent=currentProfile==='INR'?'₹ INR':'$ USD';
  document.querySelectorAll('.rcur').forEach(el=>el.textContent='('+CS()+')');
  const form=document.getElementById('rulesForm');
  if(!form.contains(document.activeElement)){
    RULE_FIELDS.forEach(k=>{document.getElementById('r_'+k).value=R[k]||'';});
    document.getElementById('r_flagSizeUp').checked=!!R.flagSizeUp;
  }
  const card=(key,label,val,sub,cls,extra)=>`<div class="stat-card"><div class="stat-label" data-info="${key}">${label}</div><div class="stat-value ${cls||''}" style="font-size:19px">${val}</div><div class="stat-sub">${sub||'&nbsp;'}</div>${extra||''}</div>`;
  // today's status
  document.getElementById('rulesStatus').innerHTML=S.items.map(i=>{
    const bar=i.pct===null?'':`<div class="prog"><div class="prog-bar ${i.level==='danger'?'danger':i.level==='warn'?'warn':''}" style="width:${Math.min(100,Math.max(0,i.pct))}%"></div></div>`;
    return card(i.key,i.label,i.value,i.sub,i.cls,bar);
  }).join('');
  const any=rulesConfigured(R);
  document.getElementById('rulesHint').style.display=any?'none':'block';
  // discipline (last 30 days)
  const dTot=E.last30.length,tTot=trades.length;
  const sp=v=>`<span style="color:var(--${v>=0?'accent':'danger'})">${fmtSigned(v)}</span>`;
  document.getElementById('rulesDiscipline').innerHTML=!tTot?'<div class="empty-note">Log some trades to see discipline stats.</div>':`<div class="stats-grid">`+
    card('cleanDays','Clean Days (30d)',dTot?Math.round(E.cleanDays30/dTot*100)+'%':'—',E.cleanDays30+' of '+dTot+' trading days',dTot&&E.cleanDays30/dTot>=.8?'green':'')+
    card('cleanStreak','Clean Streak',E.cleanStreak+' d','consecutive rule-following days',E.cleanStreak>0?'green':'')+
    card('brokeRules','Rule-breaking Trades',E.flaggedT.length,tTot?Math.round(E.flaggedT.length/tTot*100)+'% of all trades':'',E.flaggedT.length?'red':'green')+
    card('brokeRules','P&L: Broke vs Followed',sp(E.pnlFlagged),'followed rules: '+sp(E.pnlClean),'')+`</div>`;
  // revenge patterns
  const aw=E.afterLoss.n?E.afterLoss.w/E.afterLoss.n:null;
  document.getElementById('rulesRevenge').innerHTML=!tTot?'<div class="empty-note">No data yet.</div>':`<div class="stats-grid">`+
    card('revTag','Tagged Revenge',E.revT.length,E.revT.length?'net '+sp(E.revPnl):'none logged',E.revT.length?'red':'green')+
    card('revQuick','Quick Re-entries',R.cooldownMin>0?E.quick:'—',R.cooldownMin>0?'within '+R.cooldownMin+' min of a loss':'set a cooldown to track',R.cooldownMin>0&&E.quick?'red':'')+
    card('revSize','Size-ups After Loss',R.flagSizeUp?E.sizeUp:'—',R.flagSizeUp?'size > 1.5× prev trade':'turned off',R.flagSizeUp&&E.sizeUp?'red':'')+
    card('afterLoss','Win Rate After a Loss',aw===null?'—':Math.round(aw*100)+'%','overall '+Math.round(E.overallWR*100)+'%',aw===null?'':(aw<E.overallWR-0.05?'red':'green'))+`</div>`;
  // recent breaks
  const rows=[];
  E.flaggedT.filter(t=>t.date>=E.cutoff).forEach(t=>rows.push({date:t.date,time:t.time&&t.time!=='23:59'?t.time:'',sym:t.sym,pnl:t.pnl,why:E.flags[t.id].join(' · ')}));
  E.last30.filter(d=>d.breaches.length).forEach(d=>rows.push({date:d.date,time:'',sym:'(day)',pnl:d.pnl,why:d.breaches.join(' · ')}));
  rows.sort((a,b)=>(a.date+a.time)<(b.date+b.time)?1:-1);
  document.getElementById('rulesBreaks').innerHTML=!rows.length?'<div class="empty-note">'+(any||tTot?'No rule breaks in the last 30 days. 👏':'Set your rules above to start tracking.')+'</div>':
    '<div style="overflow-x:auto"><table class="mini-table"><thead><tr><th>When</th><th>Symbol</th><th>P&L</th><th>Why flagged</th></tr></thead><tbody>'+
    rows.slice(0,40).map(r=>`<tr><td>${r.date}${r.time?' '+r.time:''}</td><td>${escHtml(r.sym)}</td><td style="color:var(--${r.pnl>=0?'accent':'danger'})">${fmtSigned(r.pnl)}</td><td>${escHtml(r.why)}</td></tr>`).join('')+'</tbody></table></div>';
  injectInfoIcons(document.getElementById('pageRules'));
}

document.getElementById('ruleBanner').addEventListener('click',()=>setPage('rules'));
