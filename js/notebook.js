// ── NOTES (nested outliner) ─────────────────────────────────────────────────
// Shared across both profiles. users/{uid}/notes/{id}: {id,parentId,title,content,order,createdAt,updatedAt}
let allNotes = [];
let notesListenerActive = false;
let notebookExpanded = new Set();   // ids currently expanded in the tree view (UI state only)
let noteEditing = null;              // id of the note open in the editor
let noteEditor = null;               // buildRichEditor() instance for the open editor

function startNotesListener(){
  if(!currentUID||!window._fbReady||notesListenerActive)return;
  notesListenerActive = true;
  window._fbListen('users/'+currentUID+'/notes', data=>{
    allNotes = data ? Object.values(data) : [];
    if(currentPage==='notebook') renderNotebookPage();
  });
}

function noteChildren(parentId){
  return allNotes.filter(n=>(n.parentId||null)===(parentId||null))
    .sort((a,b)=>(a.order??0)-(b.order??0) || (a.createdAt||0)-(b.createdAt||0));
}
function notePath(id){      // [root, ..., note] by walking parentId up
  const path=[]; let cur=allNotes.find(n=>n.id===id);
  while(cur){ path.unshift(cur); cur = cur.parentId ? allNotes.find(n=>n.id===cur.parentId) : null; }
  return path;
}
function noteDescendantIds(id){
  const out=[]; const walk=pid=>{ noteChildren(pid).forEach(c=>{out.push(c.id);walk(c.id);}); };
  walk(id); return out;
}

function openNotebook(){ setPage('notebook'); }

function renderNotebookPage(){
  const root = document.getElementById('notebookTree');
  root.innerHTML = !allNotes.length
    ? '<div class="empty-note">No notes yet. Tap + to add your first one.</div>'
    : noteChildren(null).map(n=>noteRowHtml(n)).join('');
  wireNoteRows(root);
}
function noteRowHtml(n){
  const kids = noteChildren(n.id);
  const open = notebookExpanded.has(n.id);
  return '<div class="note-row-wrap">'+
    '<div class="note-row" data-id="'+escHtml(n.id)+'">'+
      '<span class="note-chevron'+(kids.length?'':' none')+'" data-toggle="'+escHtml(n.id)+'">'+(kids.length?(open?'▾':'▸'):'')+'</span>'+
      '<span class="note-row-main" data-open="'+escHtml(n.id)+'"><span class="note-title">'+escHtml(n.title||'Untitled')+'</span>'+
      '<span class="note-row-preview">'+escHtml(stripToText(n.content,70))+'</span></span>'+
      (kids.length?'<span class="note-child-count">'+kids.length+'</span>':'')+
    '</div>'+
    (open&&kids.length?'<div class="note-children">'+kids.map(c=>noteRowHtml(c)).join('')+'</div>':'')+
  '</div>';
}
function wireNoteRows(root){
  root.querySelectorAll('[data-toggle]').forEach(el=>el.onclick=e=>{
    e.stopPropagation();
    const id=el.dataset.toggle;
    notebookExpanded.has(id)?notebookExpanded.delete(id):notebookExpanded.add(id);
    renderNotebookPage();
  });
  root.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>openNoteEditor(el.dataset.open));
}

function newRootNote(){ openNoteEditor(null, null); }
function newSubNote(parentId){ openNoteEditor(null, parentId); }

// ---------- editor ----------
function openNoteEditor(id, parentIdForNew){
  noteEditing = id;
  const n = id ? allNotes.find(x=>x.id===id) : null;
  document.getElementById('noteEdTitleInput').value = n ? (n.title||'') : '';
  const path = id ? notePath(id).slice(0,-1) : (parentIdForNew ? notePath(parentIdForNew) : []);
  document.getElementById('noteBreadcrumb').innerHTML = (path.length?path.map(p=>
    '<span class="crumb" data-id="'+escHtml(p.id)+'">'+escHtml(p.title||'Untitled')+'</span>').join('<span class="crumb-sep">›</span>')+'<span class="crumb-sep">›</span>':'')+
    '<span class="crumb here">'+escHtml(n?n.title||'Untitled':'New note')+'</span>';
  document.getElementById('noteBreadcrumb').querySelectorAll('.crumb[data-id]').forEach(c=>c.onclick=()=>openNoteEditor(c.dataset.id));
  document.getElementById('noteEditOverlay').dataset.parentForNew = n ? (n.parentId||'') : (parentIdForNew||'');
  noteEditor = buildRichEditor(document.getElementById('noteEdBody'));
  noteEditor.setHtml(n ? n.content : '');
  renderNoteChildrenPanel(id);
  document.getElementById('noteDelBtn').style.display = id ? '' : 'none';
  document.getElementById('noteEditOverlay').classList.add('open');
}
function closeNoteEditor(){ document.getElementById('noteEditOverlay').classList.remove('open'); noteEditing=null; }

function renderNoteChildrenPanel(id){
  const box = document.getElementById('noteChildrenList');
  if(!id){ box.innerHTML = '<div class="empty-note" style="padding:4px 0">Save this note first to add sub-notes.</div>'; return; }
  const kids = noteChildren(id);
  box.innerHTML = !kids.length ? '<div class="empty-note" style="padding:4px 0">No sub-notes yet.</div>' :
    kids.map(c=>'<div class="note-child-row" data-id="'+escHtml(c.id)+'">'+escHtml(c.title||'Untitled')+'</div>').join('');
  box.querySelectorAll('.note-child-row').forEach(r=>r.onclick=()=>openNoteEditor(r.dataset.id));
}

function saveNote(){
  const title = document.getElementById('noteEdTitleInput').value.trim();
  if(!title){alert('Please give the note a title.');return;}
  const now = Date.now();
  const existing = noteEditing ? allNotes.find(x=>x.id===noteEditing) : null;
  const parentId = document.getElementById('noteEditOverlay').dataset.parentForNew || null;
  const obj = {
    id: noteEditing || uid(),
    parentId: parentId || null,
    title,
    content: noteEditor.getHtml(),
    order: existing ? (existing.order??0) : (Math.max(0,...noteChildren(parentId).map(c=>c.order??0)) + 1),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
  allNotes = [...allNotes.filter(x=>x.id!==obj.id), obj];
  if(currentUID&&window._fbReady) window._fbSet('users/'+currentUID+'/notes/'+obj.id, obj);
  noteEditing = obj.id;
  closeNoteEditor();
  renderNotebookPage();
}

function addSubNoteFromEditor(){
  if(!noteEditing){alert('Save this note first, then you can add sub-notes.');return;}
  newSubNote(noteEditing);
}

function moveNote(dir){      // dir: -1 up, +1 down, among siblings
  if(!noteEditing) return;
  const n = allNotes.find(x=>x.id===noteEditing); if(!n) return;
  const sibs = noteChildren(n.parentId||null);
  const i = sibs.findIndex(x=>x.id===n.id);
  const j = i+dir;
  if(j<0||j>=sibs.length) return;
  const a=sibs[i], b=sibs[j];
  const tmp=a.order??0; a.order=b.order??0; b.order=tmp;
  [a,b].forEach(x=>{x.updatedAt=Date.now(); if(currentUID&&window._fbReady) window._fbSet('users/'+currentUID+'/notes/'+x.id, x);});
  allNotes = allNotes.map(x=>x.id===a.id?a:x.id===b.id?b:x);
  renderNoteChildrenPanel(n.parentId||null);  // in case a sibling list is open elsewhere
}

function deleteNote(){
  if(!noteEditing) return;
  const id = noteEditing;
  const descendants = noteDescendantIds(id);
  const msg = descendants.length
    ? 'Delete this note and its '+descendants.length+' sub-note'+(descendants.length>1?'s':'')+'? This cannot be undone.'
    : 'Delete this note? This cannot be undone.';
  genericConfirm(msg, ()=>{
    const toRemove = [id, ...descendants];
    allNotes = allNotes.filter(x=>!toRemove.includes(x.id));
    if(currentUID&&window._fbReady) toRemove.forEach(rid=>window._fbRemove('users/'+currentUID+'/notes/'+rid));
    // drop any dangling links from strategies that pointed at removed notes
    allStrategies.forEach(s=>{
      if(s.linkedNoteIds && s.linkedNoteIds.some(x=>toRemove.includes(x))){
        s.linkedNoteIds = s.linkedNoteIds.filter(x=>!toRemove.includes(x));
        if(currentUID&&window._fbReady) window._fbSet('users/'+currentUID+'/strategies/'+s.id, s);
      }
    });
    closeNoteEditor();
    renderNotebookPage();
  });
}
