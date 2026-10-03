// ── CSV ────────────────────────────────────────────────────────────────────
function exportCSV(){
  const trades=getTrades();if(!trades.length){alert('No trades.');return;}
  const headers=['ID','Profile','Symbol','Date','Direction','Entry','Exit','Qty','Amount','Leverage','StopLoss','Strategy','Emotion','Gross P&L','Charges','Net P&L','Currency','Notes'];
  const rows=trades.map(t=>[t.id,t.profile,t.sym,t.date,t.dir,t.entry,t.exit,t.qty?.toFixed?t.qty.toFixed(6):t.qty,t.amount||'',t.leverage||'',t.sl||'',t.strat||'',t.emotion||'',(t.grossPnl??t.pnl),(t.fees||0),t.pnl,currentProfile==='INR'?'INR':'USD','"'+(t.notes||'').replace(/"/g,'""')+'"']);
  const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`tradediary_${currentProfile.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
}

// ── BACKUP ─────────────────────────────────────────────────────────────────
function openBackup(){
  const inr=allTrades.filter(t=>t.profile==='INR').length;
  const usd=allTrades.filter(t=>t.profile==='USD').length;
  const imgs=allTrades.reduce((a,t)=>a+(t.images?.length||0),0);
  const kb=Math.round(JSON.stringify(allTrades).length/1024);
  document.getElementById('backupStats').innerHTML=`<span class="backup-stat">Stocks: <b>${inr}</b></span><span class="backup-stat">Crypto: <b>${usd}</b></span><span class="backup-stat">Screenshots: <b>${imgs}</b></span><span class="backup-stat">~<b>${kb}KB</b></span>`;
  document.getElementById('importResult').style.display='none';
  document.getElementById('importFileInput').value='';
  selectMerge('merge');
  document.getElementById('backupOverlay').classList.add('open');
}
function closeBackup(){document.getElementById('backupOverlay').classList.remove('open');}
function exportJSON(){
  const blob=new Blob([JSON.stringify({version:3,exportedAt:new Date().toISOString(),trades:allTrades},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`tradediary_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
}
function selectMerge(m){mergeMode=m;document.getElementById('optMerge').classList.toggle('selected',m==='merge');document.getElementById('optReplace').classList.toggle('selected',m==='replace');}
function handleImportFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const res=document.getElementById('importResult');
    try{
      const payload=JSON.parse(e.target.result);
      const incoming=Array.isArray(payload)?payload:(payload.trades||[]);
      if(!Array.isArray(incoming)||!incoming.length)throw new Error('No trades found.');
      if(!incoming[0].id||!incoming[0].date)throw new Error('Unrecognised format.');
      let added=0,skipped=0;
      if(mergeMode==='replace'){allTrades=incoming;added=incoming.length;}
      else{const ids=new Set(allTrades.map(t=>t.id));incoming.forEach(t=>{if(ids.has(t.id))skipped++;else{allTrades.push(t);added++;}});}
      save();renderPage(currentPage);
      res.className='import-result ok';
      res.textContent=mergeMode==='replace'?`✓ Replaced with ${added} trades.`:`✓ ${added} added, ${skipped} skipped.`;
      res.style.display='block';
    }catch(err){res.className='import-result err';res.textContent='✕ '+err.message;res.style.display='block';}
  };
  reader.readAsText(file);
}
(()=>{
  const drop=document.getElementById('importDrop');
  drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag-over');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('drag-over'));
  drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag-over');handleImportFile({files:[e.dataTransfer.files[0]]});});
})();

