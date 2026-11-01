// ── STRATEGY LIBRARY ────────────────────────────────────────────────────────
// Shared across both profiles. users/{uid}/strategies/{id}
let allStrategies = [];
let strategiesListenerActive = false;
let stratEditing = null;       // id of the strategy being edited, or null for a new one
let stratTagFilter = new Set();
let stratEditor = null;        // the buildRichEditor() instance for the open editor
let stratLinkedNoteIds = [];

function startStrategiesListener(){
  if(!currentUID||!window._fbReady||strategiesListenerActive)return;
  strategiesListenerActive = true;
  window._fbListen('users/'+currentUID+'/strategies', data=>{
    allStrategies = data ? Object.values(data) : [];
    if(currentPage==='strategy') renderStrategyPage();
  });
}

function ytId(url){
  if(!url) return null;
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/);
  return m ? m[1] : null;
}
function allStrategyTags(){
  const s = new Set();
  allStrategies.forEach(x=>(x.tags||[]).forEach(t=>s.add(t)));
  return [...s].sort();
}

function renderStrategyPage(){
  const tagRow = document.getElementById('stratTagRow');
  const tags = allStrategyTags();
  tagRow.innerHTML = !tags.length ? '' : tags.map(t=>
    '<span class="tag-chip'+(stratTagFilter.has(t)?' sel':'')+'" data-tag="'+escHtml(t)+'">'+escHtml(t)+'</span>').join('');
  const list = allStrategies.filter(s=>!stratTagFilter.size || (s.tags||[]).some(t=>stratTagFilter.has(t)));
  list.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  const grid = document.getElementById('stratGrid');
  grid.innerHTML = !allStrategies.length
    ? '<div class="empty-note">No strategies yet. Tap + to write your first one.</div>'
    : !list.length ? '<div class="empty-note">No strategies match the selected tags.</div>'
    : list.map(s=>{
        const yt = ytId(s.youtubeUrl);
        return '<div class="strat-card" data-id="'+escHtml(s.id)+'">'+
          '<div class="strat-card-top"><span class="strat-name">'+escHtml(s.name)+'</span>'+(yt?'<span class="strat-yt" title="Has a video reference">▶</span>':'')+'</div>'+
          (s.tags&&s.tags.length?'<div class="strat-tags">'+s.tags.map(t=>'<span class="tag-chip">'+escHtml(t)+'</span>').join('')+'</div>':'')+
          '<div class="strat-preview">'+escHtml(stripToText(s.content,140)||'No description yet.')+'</div>'+
          (s.linkedNoteIds&&s.linkedNoteIds.length?'<div class="strat-linked">🔗 '+s.linkedNoteIds.length+' linked note'+(s.linkedNoteIds.length>1?'s':''):'')+
        '</div>';
      }).join('');
  grid.querySelectorAll('.strat-card').forEach(c=>c.onclick=()=>openStrategyView(c.dataset.id));
  tagRow.querySelectorAll('.tag-chip').forEach(c=>c.onclick=()=>{
    const t=c.dataset.tag;
    stratTagFilter.has(t)?stratTagFilter.delete(t):stratTagFilter.add(t);
    renderStrategyPage();
  });
}

// ---------- view (read-only) ----------
function openStrategyView(id){
  const s = allStrategies.find(x=>x.id===id); if(!s) return;
  document.getElementById('stratViewTitle').textContent = s.name;
  const yt = ytId(s.youtubeUrl);
  document.getElementById('stratViewYt').innerHTML = yt
    ? '<a href="https://www.youtube.com/watch?v='+encodeURIComponent(yt)+'" target="_blank" rel="noopener noreferrer" class="strat-yt-link">▶ Watch reference video</a>' : '';
  document.getElementById('stratViewTags').innerHTML = (s.tags||[]).map(t=>'<span class="tag-chip">'+escHtml(t)+'</span>').join('');
  document.getElementById('stratViewBody').innerHTML = sanitizeHtml(s.content) || '<span class="empty-note">No description.</span>';
  const linked = (s.linkedNoteIds||[]).map(nid=>allNotes.find(n=>n.id===nid)).filter(Boolean);
  document.getElementById('stratViewLinked').innerHTML = !linked.length ? '' :
    '<div class="strat-linked-title">Linked notes</div>' + linked.map(n=>
      '<div class="strat-linked-card" data-id="'+escHtml(n.id)+'">'+escHtml(n.title||'Untitled')+'</div>').join('');
  document.getElementById('stratViewLinked').querySelectorAll('.strat-linked-card').forEach(c=>c.onclick=()=>{
    closeStrategyView(); openNotebook(); openNoteEditor(c.dataset.id);
  });
  document.getElementById('stratViewEditBtn').onclick=()=>{closeStrategyView();openStrategyEditor(id);};
  document.getElementById('stratViewDelBtn').onclick=()=>deleteStrategy(id);
  document.getElementById('stratViewOverlay').classList.add('open');
}
function closeStrategyView(){document.getElementById('stratViewOverlay').classList.remove('open');}
function deleteStrategy(id){
  genericConfirm('Delete this strategy? This cannot be undone.', ()=>{
    allStrategies = allStrategies.filter(x=>x.id!==id);
    if(currentUID&&window._fbReady) window._fbRemove('users/'+currentUID+'/strategies/'+id);
    closeStrategyView(); renderStrategyPage();
  });
}

// ---------- editor ----------
function openStrategyEditor(id){
  stratEditing = id || null;
  const s = id ? allStrategies.find(x=>x.id===id) : null;
  document.getElementById('stratEdTitle').textContent = s ? 'Edit Strategy' : 'New Strategy';
  document.getElementById('stratEdName').value = s ? s.name : '';
  document.getElementById('stratEdYt').value = s ? (s.youtubeUrl||'') : '';
  stratLinkedNoteIds = s ? (s.linkedNoteIds||[]).slice() : [];
  renderStratTagInput(s ? (s.tags||[]).slice() : []);
  renderStratLinkChips();
  document.getElementById('stratEdNoteSearch').value = '';
  renderStratNotePicker('');
  stratEditor = buildRichEditor(document.getElementById('stratEdBody'));
  stratEditor.setHtml(s ? s.content : '');
  document.getElementById('stratEditOverlay').classList.add('open');
}
function closeStrategyEditor(){document.getElementById('stratEditOverlay').classList.remove('open');}

// tag chips (type + Enter/comma to add, click × to remove)
let stratTagsCur = [];
function renderStratTagInput(initial){
  stratTagsCur = initial || [];
  const box = document.getElementById('stratEdTags');
  box.querySelectorAll('.tag-chip').forEach(c=>c.remove());
  const input = document.getElementById('stratEdTagInput');
  stratTagsCur.forEach(t=>{
    const chip = document.createElement('span');
    chip.className = 'tag-chip removable';
    chip.innerHTML = escHtml(t) + '<button type="button">×</button>';
    chip.querySelector('button').onclick=()=>{stratTagsCur=stratTagsCur.filter(x=>x!==t);renderStratTagInput(stratTagsCur);};
    box.insertBefore(chip, input);
  });
}
document.getElementById('stratEdTagInput').addEventListener('keydown', e=>{
  if(e.key==='Enter'||e.key===','){
    e.preventDefault();
    const v = e.target.value.trim().replace(/,$/,'');
    if(v && !stratTagsCur.includes(v)){stratTagsCur.push(v);renderStratTagInput(stratTagsCur);}
    e.target.value='';
  }
});

function renderStratLinkChips(){
  const box = document.getElementById('stratEdLinked');
  box.innerHTML = !stratLinkedNoteIds.length ? '<span class="empty-note" style="padding:0">No notes linked yet.</span>' :
    stratLinkedNoteIds.map(id=>{
      const n = allNotes.find(x=>x.id===id);
      return '<span class="tag-chip removable">'+escHtml(n?n.title||'Untitled':'(deleted note)')+'<button type="button" data-rm="'+escHtml(id)+'">×</button></span>';
    }).join('');
  box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{
    stratLinkedNoteIds = stratLinkedNoteIds.filter(x=>x!==b.dataset.rm);
    renderStratLinkChips();
  });
}
function renderStratNotePicker(q){
  const list = allNotes.filter(n=>!stratLinkedNoteIds.includes(n.id) && (!q || (n.title||'').toLowerCase().includes(q.toLowerCase())));
  const box = document.getElementById('stratEdNotePicker');
  box.innerHTML = !list.length ? '<div class="empty-note" style="padding:4px 0">'+(allNotes.length?'No matching notes.':'No notes exist yet.')+'</div>' :
    list.slice(0,30).map(n=>'<div class="strat-pick-row" data-id="'+escHtml(n.id)+'">'+escHtml(n.title||'Untitled')+'</div>').join('');
  box.querySelectorAll('.strat-pick-row').forEach(r=>r.onclick=()=>{
    stratLinkedNoteIds.push(r.dataset.id);
    renderStratLinkChips();
    renderStratNotePicker(document.getElementById('stratEdNoteSearch').value);
  });
}
document.getElementById('stratEdNoteSearch').addEventListener('input', e=>renderStratNotePicker(e.target.value));

function saveStrategy(){
  const name = document.getElementById('stratEdName').value.trim();
  if(!name){alert('Please give the strategy a name.');return;}
  const now = Date.now();
  const existing = stratEditing ? allStrategies.find(x=>x.id===stratEditing) : null;
  const obj = {
    id: stratEditing || uid(),
    name,
    youtubeUrl: document.getElementById('stratEdYt').value.trim(),
    tags: stratTagsCur.slice(),
    linkedNoteIds: stratLinkedNoteIds.slice(),
    content: stratEditor.getHtml(),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
  allStrategies = [...allStrategies.filter(x=>x.id!==obj.id), obj];
  if(currentUID&&window._fbReady) window._fbSet('users/'+currentUID+'/strategies/'+obj.id, obj);
  closeStrategyEditor();
  renderStrategyPage();
}
