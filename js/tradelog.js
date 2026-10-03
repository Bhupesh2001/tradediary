// ── TRADE LOG ──────────────────────────────────────────────────────────────
function renderLog(){
  let trades=getTrades();
  const df=document.getElementById('logFDateFrom').value, dt=document.getElementById('logFDateTo').value;
  if(df)trades=trades.filter(t=>t.date>=df);
  if(dt)trades=trades.filter(t=>t.date<=dt);
  trades=applyFilters(trades,document.getElementById('logFSymbol').value,document.getElementById('logFPnl').value,document.getElementById('logFEmotion').value,'',document.getElementById('logFSort').value);
  document.getElementById('tradeCount').textContent=trades.length+' trades';
  renderTradeRows('tradeTableBody',trades);
}
function clearLogDateFilter(){document.getElementById('logFDateFrom').value='';document.getElementById('logFDateTo').value='';renderLog();}

function applyFilters(trades,sym,pnl,em,strat,sort){
  if(sym)trades=trades.filter(t=>t.sym.includes(sym.toUpperCase()));
  if(pnl==='profit')trades=trades.filter(t=>t.pnl>0);
  if(pnl==='loss')trades=trades.filter(t=>t.pnl<0);
  if(em)trades=trades.filter(t=>t.emotion===em);
  if(strat)trades=trades.filter(t=>t.strat===strat);
  const[sf,sd]=(sort||'date-desc').split('-');
  trades.sort((a,b)=>{
    // use full datetime for date sort so trades on same day sort by time too
    const av=sf==='date'?tradeDatetime(a):sf==='pnl'?a.pnl:sf==='sym'?a.sym:tradeDatetime(a);
    const bv=sf==='date'?tradeDatetime(b):sf==='pnl'?b.pnl:sf==='sym'?b.sym:tradeDatetime(b);
    return sd==='desc'?(bv>av?1:-1):(av>bv?1:-1);
  });
  return trades;
}

function navigateToMonthLog(ym){
  const[y,m]=ym.split('-');
  const last=new Date(+y,+m,0).getDate();
  setPage('log');
  document.getElementById('logFDateFrom').value=`${y}-${m}-01`;
  document.getElementById('logFDateTo').value=`${y}-${m}-${String(last).padStart(2,'0')}`;
  renderLog();
  document.getElementById('mainScroll').scrollTo({top:0,behavior:'smooth'});
}

function renderTradeRows(tbodyId,trades){
  const tbody=document.getElementById(tbodyId);tbody.innerHTML='';
  const s=CS();
  if(!trades.length){tbody.innerHTML=`<tr><td colspan="11" style="text-align:center;color:var(--muted);padding:20px">No trades</td></tr>`;return;}
  trades.forEach(t=>{
    const tr=document.createElement('tr');
    const qty=t.amount?s+t.amount+(t.leverage?'×'+t.leverage+'L':''):t.qty;
    const hasImg=t.images&&t.images.length;
    const preview=t.notes?t.notes.slice(0,16)+(t.notes.length>16?'…':''):'—';
    tr.id='tr_'+t.id;
    tr.innerHTML=`
      <td style="color:var(--muted)">${t.date}${t.time?'<br><span style="font-size:10px;color:var(--muted);opacity:.7">'+t.time+'</span>':''}</td>
      <td class="sym">${escHtml(t.sym)}</td>
      <td><span class="${t.dir==='LONG'?'dir-long':'dir-short'}">${t.dir}</span></td>
      <td>${s}${t.entry}</td><td>${s}${t.exit}</td>
      <td style="color:var(--muted)">${qty}</td>
      <td class="${t.pnl>=0?'pnl-pos':'pnl-neg'}">${fmtPnl(t.pnl)}</td>
      <td><span class="em-tag ${t.emotion||'neutral'}" style="padding:2px 7px;font-size:10px">${t.emotion||'—'}</span></td>
      <td style="color:var(--muted);font-family:var(--font);font-size:11px">${escHtml(t.strat||'—')}</td>
      <td><button class="notes-btn${hasImg?' has-img':''}" onclick="openNotesPanelAt('${t.id}')">${preview}${hasImg?` 📷${t.images.length}`:''}</button></td>
      <td><div style="display:flex;gap:3px">
        <button class="btn btn-ghost btn-sm" onclick="openEditModal('${t.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="askDelete('${t.id}')">Del</button>
      </div></td>`;
    tbody.appendChild(tr);
  });
}

