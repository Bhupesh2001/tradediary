// ── MODAL ──────────────────────────────────────────────────────────────────
function openModal(){
  editingId=null;tradeImages=[];
  document.getElementById('modalTitleText').textContent='Log Trade';
  document.getElementById('saveTradeBtn').textContent='Log Trade';
  ['f_sym','f_strat','f_notes','f_qty','f_sl','f_sl2','f_entry','f_exit','f_qty_calc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('f_date').value=new Date().toISOString().slice(0,10);
  // set current time as default
  const now=new Date();
  document.getElementById('f_time').value=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  document.getElementById('f_dir').value='LONG';
  document.getElementById('f_leverage').value='1';
  document.getElementById('f_amount').value='';
  selectedEmotion='';
  document.querySelectorAll('#emSelectRow .em-tag').forEach(e=>e.classList.remove('selected'));
  populateSymSuggestions();
  renderImgPreviews();toggleProfileFields();
  document.getElementById('modalOverlay').classList.add('open');
}
function openEditModal(id){
  const t=allTrades.find(x=>x.id===id);if(!t)return;
  editingId=id;tradeImages=[...(t.images||[])];
  document.getElementById('modalTitleText').textContent='Edit Trade';
  document.getElementById('saveTradeBtn').textContent='Save';
  document.getElementById('f_sym').value=t.sym;
  document.getElementById('f_date').value=t.date;
  document.getElementById('f_time').value=t.time||'';
  document.getElementById('f_dir').value=t.dir;
  document.getElementById('f_strat').value=t.strat||'';
  document.getElementById('f_entry').value=t.entry;
  document.getElementById('f_exit').value=t.exit;
  document.getElementById('f_qty').value=t.qty||'';
  document.getElementById('f_sl').value=t.sl||'';
  document.getElementById('f_leverage').value=t.leverage||1;
  document.getElementById('f_amount').value=t.amount||'';
  document.getElementById('f_sl2').value=t.sl||'';
  document.getElementById('f_notes').value=t.notes||'';
  selectedEmotion=t.emotion||'';
  document.querySelectorAll('#emSelectRow .em-tag').forEach(e=>e.classList.toggle('selected',e.textContent.toLowerCase()===selectedEmotion));
  populateSymSuggestions();
  renderImgPreviews();toggleProfileFields();
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal(){document.getElementById('modalOverlay').classList.remove('open');}
function toggleProfileFields(){
  const c=currentProfile==='USD';
  document.getElementById('grp_qty').style.display=c?'none':'flex';
  document.getElementById('grp_sl').style.display=c?'none':'flex';
  document.getElementById('grp_leverage').style.display=c?'flex':'none';
  document.getElementById('grp_amount').style.display=c?'flex':'none';
  document.getElementById('grp_qty_calc').style.display=c?'flex':'none';
  document.getElementById('grp_sl2').style.display=c?'flex':'none';
}
function calcCryptoQty(){
  const entry  = parseFloat(document.getElementById('f_entry').value);
  const amount = parseFloat(document.getElementById('f_amount').value);
  const lev    = parseFloat(document.getElementById('f_leverage').value) || 1;
  const el     = document.getElementById('f_qty_calc');
  if(entry > 0 && amount > 0){
    const qty = (amount * lev) / entry;
    // show up to 6 sig figs, strip trailing zeros
    el.value = parseFloat(qty.toFixed(6)) + ' units';
    el.style.color = 'var(--accent)';
  } else {
    el.value = '—';
    el.style.color = 'var(--muted)';
  }
}
function selectEm(el,em){selectedEmotion=em;document.querySelectorAll('#emSelectRow .em-tag').forEach(e=>e.classList.remove('selected'));el.classList.add('selected');}
function saveTrade(){
  const sym=document.getElementById('f_sym').value.trim().toUpperCase();
  const date=document.getElementById('f_date').value;
  const dir=document.getElementById('f_dir').value;
  const strat=document.getElementById('f_strat').value.trim();
  const entry=parseFloat(document.getElementById('f_entry').value);
  const exit=parseFloat(document.getElementById('f_exit').value);
  const notes=document.getElementById('f_notes').value.trim();
  const emotion=selectedEmotion||'calm';
  // time: if blank, assign 23:59 so it sorts last for that date
  const rawTime=document.getElementById('f_time').value.trim();
  const time=rawTime||'23:59';
  if(!sym||!date||isNaN(entry)||isNaN(exit)){alert('Fill Symbol, Date, Entry, Exit.');return;}
  let qty,sl,leverage,amount,pnl;
  if(currentProfile==='USD'){
    leverage=parseFloat(document.getElementById('f_leverage').value)||1;
    amount=parseFloat(document.getElementById('f_amount').value)||0;
    sl=parseFloat(document.getElementById('f_sl2').value)||0;
    qty=amount>0?(amount*leverage/entry):(parseFloat(document.getElementById('f_qty').value)||1);
    pnl=+((dir==='LONG'?(exit-entry):(entry-exit))*qty).toFixed(4);
  } else {
    qty=parseFloat(document.getElementById('f_qty').value)||1;
    sl=parseFloat(document.getElementById('f_sl').value)||0;
    leverage=null;amount=null;
    pnl=Math.round((dir==='LONG'?(exit-entry):(entry-exit))*qty);
  }
  const obj={id:editingId||uid(),profile:currentProfile,sym,date,time,dir,strat,entry,exit,qty,sl,leverage,amount,notes,emotion,pnl,images:tradeImages};
  if(editingId){const i=allTrades.findIndex(x=>x.id===editingId);if(i>=0)allTrades[i]=obj;}
  else allTrades.push(obj);
  saveTradeFB(obj);
  closeModal();renderPage(currentPage);
  if(selectedDates.size)renderDayPanel();
  if(document.getElementById('notesPanel').classList.contains('open')){const i=npTrades.findIndex(t=>t.id===obj.id);if(i>=0){npTrades[i]=obj;renderNotesPanel();}}
}

// ── SYMBOL SUGGESTIONS ────────────────────────────────────────────────────
function populateSymSuggestions(){
  // collect unique symbols from current profile trades
  const syms=[...new Set(allTrades.filter(t=>t.profile===currentProfile).map(t=>t.sym).filter(Boolean))].sort();
  const dl=document.getElementById('symSuggestions');
  dl.innerHTML=syms.map(s=>`<option value="${s}">`).join('');
}

// ── DATETIME SORT HELPER ──────────────────────────────────────────────────
function tradeDatetime(t){
  // returns sortable string "YYYY-MM-DD HH:MM"
  return t.date + ' ' + (t.time||'23:59');
}
function askDelete(id){deleteTargetId=id;document.getElementById('confirmOverlay').classList.add('open');}
function closeConfirm(){document.getElementById('confirmOverlay').classList.remove('open');deleteTargetId=null;}
function confirmDelete(){
  if(!deleteTargetId)return;
  const id=deleteTargetId;
  allTrades=allTrades.filter(t=>t.id!==id);
  deleteTradeFB(id);
  closeConfirm();renderPage(currentPage);
  if(selectedDates.size)renderDayPanel();
  const i=npTrades.findIndex(t=>t.id===id);
  if(i>=0){npTrades.splice(i,1);if(npTrades.length){npIndex=Math.min(npIndex,npTrades.length-1);renderNotesPanel();}else closeNotesPanel();}
}

// ── PROFILE ────────────────────────────────────────────────────────────────
function switchProfile(p){
  currentProfile=p;localStorage.setItem('td_profile',p);
  document.getElementById('btnINR').classList.toggle('active-profile',p==='INR');
  document.getElementById('btnUSD').classList.toggle('active-profile',p==='USD');
  document.getElementById('profileBadge').textContent=p==='INR'?'₹ INR':'$ USD';
  document.getElementById('profileBadge').className='profile-badge '+(p==='INR'?'badge-inr':'badge-usd');
  closeNotesPanel();renderPage(currentPage);
}

