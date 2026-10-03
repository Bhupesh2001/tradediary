// ── NOTES PANEL ────────────────────────────────────────────────────────────
function openNotesPanelAt(id){
  let trades;
  if(currentPage==='log'){
    const df=document.getElementById('logFDateFrom').value,dt=document.getElementById('logFDateTo').value;
    trades=getTrades();
    if(df)trades=trades.filter(t=>t.date>=df);
    if(dt)trades=trades.filter(t=>t.date<=dt);
    trades=applyFilters(trades,document.getElementById('logFSymbol').value,document.getElementById('logFPnl').value,document.getElementById('logFEmotion').value,'',document.getElementById('logFSort').value);
  } else {
    trades=getTrades().filter(t=>selectedDates.has(t.date));
  }
  npTrades=trades;
  npIndex=Math.max(0,npTrades.findIndex(t=>t.id===id));
  document.getElementById('notesPanel').classList.add('open');
  document.getElementById('mainScroll').classList.add('panel-open');
  renderNotesPanel();
}
function closeNotesPanel(){
  document.getElementById('notesPanel').classList.remove('open');
  document.getElementById('mainScroll').classList.remove('panel-open');
  document.querySelectorAll('.row-active').forEach(r=>r.classList.remove('row-active'));
}
function npNavigate(dir){npIndex=Math.max(0,Math.min(npTrades.length-1,npIndex+dir));renderNotesPanel();}
function renderNotesPanel(){
  if(!npTrades.length){closeNotesPanel();return;}
  const t=npTrades[npIndex],s=CS();
  document.querySelectorAll('.row-active').forEach(r=>r.classList.remove('row-active'));
  const row=document.getElementById('tr_'+t.id);
  if(row){row.classList.add('row-active');row.scrollIntoView({block:'nearest',behavior:'smooth'});}
  document.getElementById('npCounter').textContent=(npIndex+1)+' / '+npTrades.length;
  document.getElementById('npPrev').disabled=npIndex===0;
  document.getElementById('npNext').disabled=npIndex===npTrades.length-1;
  document.getElementById('npTitle').textContent=t.sym+' · '+t.date;
  document.getElementById('npBody').innerHTML=`
    <div class="np-trade-meta">
      <span class="np-meta-chip sym">${escHtml(t.sym)}</span>
      <span class="np-meta-chip">${t.date}</span>
      <span class="${t.dir==='LONG'?'dir-long':'dir-short'}" style="font-size:10px;padding:3px 7px;border-radius:4px">${t.dir}</span>
      <span class="np-meta-chip ${t.pnl>=0?'pos':'neg'}">${fmtPnl(t.pnl)}</span>
      <span class="em-tag ${t.emotion||'neutral'}" style="font-size:10px;padding:2px 8px">${t.emotion||'—'}</span>
      ${t.strat?`<span class="np-meta-chip">${escHtml(t.strat)}</span>`:''}
      ${t.leverage?`<span class="np-meta-chip" style="color:var(--accent2)">${t.leverage}x</span>`:''}
    </div>
    <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <span style="font-size:12px;color:var(--muted)">Entry <b style="color:var(--text)">${s}${t.entry}</b></span>
      <span style="font-size:12px;color:var(--muted)">Exit <b style="color:var(--text)">${s}${t.exit}</b></span>
      ${t.sl?`<span style="font-size:12px;color:var(--muted)">SL <b style="color:var(--danger)">${s}${t.sl}</b></span>`:''}
    </div>
    <div class="np-section-label">Notes</div>
    <div class="np-notes-text">${t.notes&&t.notes.trim()?escHtml(t.notes):'<span class="np-empty">No notes.</span>'}</div>
    ${t.images&&t.images.length?`<div class="np-divider"></div><div class="np-section-label">Screenshots (${t.images.length})</div><div class="np-images">${t.images.map(src=>`<img src="${src}" class="np-img" onclick="openLightbox(this)"/>`).join('')}</div>`:''}
    <div class="np-divider"></div>
    <div style="display:flex;gap:7px">
      <button class="btn btn-ghost btn-sm" onclick="openEditModal('${t.id}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="askDelete('${t.id}')">Delete</button>
    </div>`;
}

