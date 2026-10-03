// ── WATCHLIST ──────────────────────────────────────────────────────────────
let allSetups = [];
let wlImages = [], editingSetupId = null, wlSelectedStatus = 'waiting', wlViewMode = 'grid', openDetailId = null;

function getSetups(){ return allSetups.filter(s=>s.profile===currentProfile); }

function saveSetupFB(setup){
  if(!currentUID||!window._fbReady)return;
  window._fbSet('users/'+currentUID+'/setups/'+setup.id,setup)
    .then(()=>setSyncStatus('synced','Synced ✓')).catch(()=>setSyncStatus('error','Error'));
}
function deleteSetupFB(id){
  if(!currentUID||!window._fbReady)return;
  window._fbRemove('users/'+currentUID+'/setups/'+id)
    .then(()=>setSyncStatus('synced','Synced ✓')).catch(()=>setSyncStatus('error','Error'));
}

function startSetupsListener(){
  if(!currentUID||!window._fbReady||setupsListenerActive)return;
  setupsListenerActive = true;
  window._fbListen('users/'+currentUID+'/setups', data=>{
    allSetups = data ? Object.values(data) : [];
    if(currentPage==='watchlist') renderWatchlist();
  });
}

// Status/priority display helpers
const WL_STATUS_LABELS = {
  waiting:'⏳ Waiting', entered:'✅ Entered', entry_not_found:'🚫 Entry Not Found',
  target_hit:'🎯 Target Hit', stop_hit:'🛑 Stop Hit', cancelled:'❌ Cancelled'
};
const WL_PRIORITY_LABELS = {high:'🔴 High', medium:'🟡 Medium', low:'🟢 Low'};

function wlRR(entry,target,sl,dir){
  const e=parseFloat(entry),t=parseFloat(target),s=parseFloat(sl);
  if(!e||!t||!s) return null;
  const reward = dir==='LONG' ? t-e : e-t;
  const risk   = dir==='LONG' ? e-s : s-e;
  if(risk<=0||reward<0) return null;
  return (reward/risk).toFixed(2);
}

function calcWlRR(){
  const e=document.getElementById('wl_entry').value;
  const t=document.getElementById('wl_target').value;
  const s=document.getElementById('wl_sl').value;
  const dir=document.getElementById('wl_dir').value;
  const rr=wlRR(e,t,s,dir);
  const el=document.getElementById('wl_rr');
  if(rr){ el.value='1 : '+rr; el.style.color=rr>=2?'var(--accent)':rr>=1?'var(--warn)':'var(--danger)'; }
  else { el.value='—'; el.style.color='var(--muted)'; }
}

function selectWlStatus(el){
  wlSelectedStatus=el.dataset.status;
  document.querySelectorAll('#wlStatusRow .wl-status-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
}

// ── OPEN / CLOSE MODAL ────────────────────────────────────────────────────
function openWlModal(id=null){
  editingSetupId=id; wlImages=[];
  const s = id ? allSetups.find(x=>x.id===id) : null;
  document.getElementById('wlModalTitle').textContent = s ? 'Edit Setup' : 'Add Setup';
  document.getElementById('wl_sym').value   = s?.sym||'';
  document.getElementById('wl_yf_sym').value = s?.yfSym||'';
  document.getElementById('wl_date').value  = s?.date||todayStr();
  document.getElementById('wl_strat').value = s?.strat||'';
  document.getElementById('wl_tf').value    = s?.tf||'';
  document.getElementById('wl_dir').value   = s?.dir||'LONG';
  document.getElementById('wl_priority').value = s?.priority||'medium';
  document.getElementById('wl_entry').value  = s?.entry||'';
  document.getElementById('wl_target').value = s?.target||'';
  document.getElementById('wl_sl').value     = s?.sl||'';
  document.getElementById('wl_notes').value  = s?.notes||'';
  wlSelectedStatus = s?.status||'waiting';
  document.querySelectorAll('#wlStatusRow .wl-status-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.status===wlSelectedStatus);
  });
  wlImages = [...(s?.images||[])];
  renderWlImgPreviews();
  calcWlRR();
  document.getElementById('wlModalOverlay').classList.add('open');
}
function closeWlModal(){ document.getElementById('wlModalOverlay').classList.remove('open'); }

function saveSetup(){
  const sym=document.getElementById('wl_sym').value.trim().toUpperCase();
  const date=document.getElementById('wl_date').value;
  if(!sym||!date){ alert('Symbol and date are required.'); return; }
  const setup={
    id: editingSetupId||uid(),
    profile: currentProfile,
    sym, date,
    yfSym: document.getElementById('wl_yf_sym').value || yfSymbol(sym),
    strat: document.getElementById('wl_strat').value.trim(),
    tf: document.getElementById('wl_tf').value,
    dir: document.getElementById('wl_dir').value,
    priority: document.getElementById('wl_priority').value,
    entry: parseFloat(document.getElementById('wl_entry').value)||0,
    target: parseFloat(document.getElementById('wl_target').value)||0,
    sl: parseFloat(document.getElementById('wl_sl').value)||0,
    notes: document.getElementById('wl_notes').value.trim(),
    status: wlSelectedStatus,
    images: wlImages,
    comments: editingSetupId ? (allSetups.find(x=>x.id===editingSetupId)?.comments||[]) : [],
    createdAt: editingSetupId ? (allSetups.find(x=>x.id===editingSetupId)?.createdAt||Date.now()) : Date.now(),
    updatedAt: Date.now()
  };
  if(editingSetupId){ const i=allSetups.findIndex(x=>x.id===editingSetupId); if(i>=0) allSetups[i]=setup; }
  else allSetups.push(setup);
  saveSetupFB(setup);
  closeWlModal();
  renderWatchlist();
  if(openDetailId===setup.id) renderWlDetail(setup.id);
}

// ── DELETE ────────────────────────────────────────────────────────────────
function deleteSetupFromDetail(){
  const id = openDetailId;
  if(!id||!confirm('Delete this setup?')) return;
  allSetups=allSetups.filter(s=>s.id!==id);
  deleteSetupFB(id);
  closeWlDetail();
  renderWatchlist();
}

// ── DETAIL PANEL ─────────────────────────────────────────────────────────
function openWlDetail(id){
  openDetailId=id;
  renderWlDetail(id);
  document.getElementById('wlDetailOverlay').classList.add('open');
}
function closeWlDetail(){ document.getElementById('wlDetailOverlay').classList.remove('open'); openDetailId=null; }
function editSetupFromDetail(){
  const id = openDetailId;
  closeWlDetail();
  openWlModal(id);
}

function renderWlDetail(id){
  const s=allSetups.find(x=>x.id===id); if(!s) return;
  openDetailId=id;
  const rr=wlRR(s.entry,s.target,s.sl,s.dir);
  const rrColor=rr>=2?'var(--accent)':rr>=1?'var(--warn)':'var(--danger)';
  document.getElementById('wlDetailSym').textContent=s.sym+(s.tf?' · '+s.tf:'')+(s.strat?' · '+s.strat:'');
  document.getElementById('wlDetailStatus').className='badge wl-badge '+s.status;
  document.getElementById('wlDetailStatus').textContent=WL_STATUS_LABELS[s.status]||s.status;
  document.getElementById('wlDetailPriority').className='badge wl-badge '+s.priority;
  document.getElementById('wlDetailPriority').textContent=WL_PRIORITY_LABELS[s.priority]||s.priority;

  const comments=s.comments||[];
  document.getElementById('wlDetailBody').innerHTML=`
    <div class="wl-detail-prices">
      <div class="wl-price-box"><div class="wl-price-lbl">Entry</div><div class="wl-price-val entry">${s.entry?CS()+s.entry:'—'}</div></div>
      <div class="wl-price-box"><div class="wl-price-lbl">Target</div><div class="wl-price-val target">${s.target?CS()+s.target:'—'}</div></div>
      <div class="wl-price-box"><div class="wl-price-lbl">Stop Loss</div><div class="wl-price-val sl">${s.sl?CS()+s.sl:'—'}</div></div>
    </div>
    ${rr?`<div style="text-align:center;margin-bottom:14px;font-size:13px;color:var(--muted)">R:R <b style="color:${rrColor};font-family:var(--mono)">1 : ${rr}</b> · Direction <b>${s.dir}</b></div>`:''}
    ${s.notes?`<div class="wl-detail-section"><div class="wl-detail-label">Entry Plan</div><div style="font-size:13px;line-height:1.7;color:var(--text);background:var(--surface2);border-radius:8px;padding:12px;border:1px solid var(--border);white-space:pre-wrap">${escHtml(s.notes)}</div></div>`:''}
    ${s.images&&s.images.length?`<div class="wl-detail-section"><div class="wl-detail-label">Charts (${s.images.length})</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">${s.images.map(src=>`<img src="${src}" style="width:100%;border-radius:7px;border:1px solid var(--border2);cursor:zoom-in" onclick="openLightbox(this)"/>`).join('')}</div></div>`:''}
    <div class="wl-detail-section">
      <div class="wl-detail-label">Update Status</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px" id="wlDetailStatusBtns">
        ${Object.entries(WL_STATUS_LABELS).map(([k,v])=>`<div class="wl-status-btn${s.status===k?' active':''}" data-status="${k}" onclick="quickUpdateStatus('${id}','${k}')">${v}</div>`).join('')}
      </div>
    </div>
    <div class="wl-detail-section">
      <div class="wl-detail-label">Comments (${comments.length})</div>
      <div class="wl-comments" id="wlCommentsList">
        ${comments.length?comments.map(c=>`<div class="wl-comment"><div class="wl-comment-meta">${new Date(c.ts).toLocaleString()}</div><div class="wl-comment-text">${escHtml(c.text)}</div></div>`).join(''):'<div style="font-size:12px;color:var(--muted);font-style:italic">No comments yet. Add your latest update below.</div>'}
      </div>
      <div class="wl-comment-input-row">
        <textarea class="wl-comment-input" id="wlCommentInput" placeholder="Add update or observation..." rows="2"></textarea>
        <button class="btn btn-accent btn-sm" style="align-self:flex-end" onclick="addComment('${id}')">Post</button>
      </div>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:8px">Added ${new Date(s.createdAt).toLocaleDateString()} · Updated ${new Date(s.updatedAt).toLocaleDateString()}</div>`;
}

function quickUpdateStatus(id, status){
  const i=allSetups.findIndex(s=>s.id===id); if(i<0) return;
  allSetups[i].status=status; allSetups[i].updatedAt=Date.now();
  saveSetupFB(allSetups[i]);
  renderWatchlist();
  renderWlDetail(id);
}

function addComment(id){
  const input=document.getElementById('wlCommentInput');
  const text=input.value.trim(); if(!text) return;
  const i=allSetups.findIndex(s=>s.id===id); if(i<0) return;
  if(!allSetups[i].comments) allSetups[i].comments=[];
  allSetups[i].comments.push({text, ts:Date.now()});
  allSetups[i].updatedAt=Date.now();
  saveSetupFB(allSetups[i]);
  input.value='';
  renderWlDetail(id);
}

// ── RENDER WATCHLIST ──────────────────────────────────────────────────────
function toggleWlView(){
  wlViewMode = wlViewMode==='grid'?'list':'grid';
  document.getElementById('wlViewToggle').textContent = wlViewMode==='grid'?'⊞ Grid':'☰ List';
  renderWatchlist();
}

function renderWatchlist(){
  let setups=getSetups();
  const symF=document.getElementById('wlFSym')?.value.trim().toUpperCase();
  const statusF=document.getElementById('wlFStatus')?.value;
  const prioF=document.getElementById('wlFPriority')?.value;
  const tfF=document.getElementById('wlFTF')?.value;
  const sortF=document.getElementById('wlFSort')?.value||'date-desc';

  if(symF) setups=setups.filter(s=>s.sym.includes(symF));
  if(statusF) setups=setups.filter(s=>s.status===statusF);
  if(prioF) setups=setups.filter(s=>s.priority===prioF);
  if(tfF) setups=setups.filter(s=>s.tf===tfF);

  const prioOrder={high:0,medium:1,low:2};
  setups.sort((a,b)=>{
    if(sortF==='priority') return prioOrder[a.priority]-prioOrder[b.priority];
    if(sortF==='sym-asc') return a.sym.localeCompare(b.sym);
    if(sortF==='date-asc') return a.createdAt-b.createdAt;
    return b.createdAt-a.createdAt; // date-desc default
  });

  document.getElementById('wlCount').textContent=setups.length+' setups';
  const grid=document.getElementById('wlGrid');
  const list=document.getElementById('wlList');
  const empty=document.getElementById('wlEmpty');
  const listBody=document.getElementById('wlListBody');

  if(!setups.length){ grid.style.display='none'; list.style.display='none'; empty.style.display='block'; return; }
  empty.style.display='none';

  if(wlViewMode==='grid'){
    grid.style.display='grid'; list.style.display='none';
    grid.innerHTML=setups.map(s=>{
      const rr=wlRR(s.entry,s.target,s.sl,s.dir);
      const rrClass=rr>=2?'good':rr>=1?'ok':'bad';
      const liveKey='lp_'+s.id;
      const cached=wlPriceCache[liveKey];
      const ltpHtml = cached ? buildLtpHtml(cached, s.entry, s.dir) : `<span class="wl-fetch-btn" onclick="event.stopPropagation();fetchPrice('${s.id}')">⟳ Price</span>`;
      return `<div class="wl-card" onclick="openWlDetail('${s.id}')">
        <div class="wl-card-top">
          <div>
            <div class="wl-card-sym">${escHtml(s.sym)}</div>
            <div class="wl-card-badges">
              <span class="wl-badge ${s.status}">${WL_STATUS_LABELS[s.status]||s.status}</span>
              ${s.tf?`<span class="wl-badge tf">${s.tf}</span>`:''}
              <span class="wl-badge ${s.priority}">${WL_PRIORITY_LABELS[s.priority]||s.priority}</span>
            </div>
          </div>
          <div id="lp_${s.id}" style="text-align:right">${ltpHtml}</div>
        </div>
        ${s.images&&s.images[0]?`<img src="${s.images[0]}" class="wl-card-img" onclick="event.stopPropagation();openLightbox(this)"/>`:''}
        <div class="wl-card-meta">
          ${s.entry?`<span class="wl-meta-item">Entry <b>${CS()}${s.entry}</b></span>`:''}
          ${s.target?`<span class="wl-meta-item">Target <b style="color:var(--accent)">${CS()}${s.target}</b></span>`:''}
          ${s.sl?`<span class="wl-meta-item">SL <b style="color:var(--danger)">${CS()}${s.sl}</b></span>`:''}
        </div>
        ${s.notes?`<div class="wl-card-note">${escHtml(s.notes)}</div>`:''}
        <div class="wl-card-footer">
          <span>${s.dir} · ${s.date} ${s.comments?.length?`· 💬${s.comments.length}`:''}</span>
          ${rr?`<span class="wl-rr ${rrClass}">R:R 1:${rr}</span>`:''}
        </div>
      </div>`;
    }).join('');
  } else {
    grid.style.display='none'; list.style.display='block';
    listBody.innerHTML=setups.map(s=>{
      const rr=wlRR(s.entry,s.target,s.sl,s.dir);
      const rrColor=rr>=2?'var(--accent)':rr>=1?'var(--warn)':'var(--danger)';
      return `<tr onclick="openWlDetail('${s.id}')" style="cursor:pointer">
        <td style="color:var(--muted)">${s.date}</td>
        <td class="wl-list-sym">${escHtml(s.sym)}</td>
        <td style="font-family:var(--font);color:var(--muted)">${escHtml(s.strat||'—')}</td>
        <td><span class="wl-badge tf">${s.tf||'—'}</span></td>
        <td>${s.entry?CS()+s.entry:'—'}</td>
        <td style="color:var(--accent)">${s.target?CS()+s.target:'—'}</td>
        <td style="color:var(--danger)">${s.sl?CS()+s.sl:'—'}</td>
        <td>${rr?`<span style="color:${rrColor};font-family:var(--mono);font-weight:700">1:${rr}</span>`:'—'}</td>
        <td><span class="wl-badge ${s.priority}">${WL_PRIORITY_LABELS[s.priority]}</span></td>
        <td><span class="wl-badge ${s.status}">${WL_STATUS_LABELS[s.status]}</span></td>
        <td><div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openWlModal('${s.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteSetup('${s.id}')">Del</button>
        </div></td>
      </tr>`;
    }).join('');
  }
}

function deleteSetup(id){
  if(!confirm('Delete this setup?')) return;
  allSetups=allSetups.filter(s=>s.id!==id);
  deleteSetupFB(id);
  renderWatchlist();
}

// Watchlist images
let wlPasteActive=false;
function handleWlImages(input){
  Array.from(input.files).forEach(f=>{compressImage(f).then(d=>{wlImages.push(d);renderWlImgPreviews();}).catch(()=>alert('Could not read image.'));});
}
function renderWlImgPreviews(){
  const row=document.getElementById('wlImgPreviewRow'); if(!row) return;
  row.innerHTML='';
  wlImages.forEach((src,i)=>{
    const w=document.createElement('div');w.className='img-preview-wrap';
    w.innerHTML=`<img src="${src}" class="img-preview" onclick="openLightbox(this)"/><button class="img-remove-btn" onclick="wlImages.splice(${i},1);renderWlImgPreviews()">✕</button>`;
    row.appendChild(w);
  });
}

// Paste image in wl modal
document.addEventListener('paste',e=>{
  if(!document.getElementById('wlModalOverlay').classList.contains('open')) return;
  const items=e.clipboardData?.items; if(!items) return;
  for(const item of items){ if(item.type.startsWith('image/')){compressImage(item.getAsFile()).then(d=>{wlImages.push(d);renderWlImgPreviews();});break;} }
},true); // use capture to avoid conflict with trade modal paste

