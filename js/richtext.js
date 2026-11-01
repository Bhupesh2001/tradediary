// ── RICH TEXT: shared toolbar + sanitizer (used by Strategies and Notes) ───
// Storage format: sanitized HTML, allow-list only. Never trust what's in the DOM or in
// Firebase — sanitize on save AND again right before every render, since Firebase data
// can be edited outside this app's own UI.
const RT_TAGS = {
  B:true, STRONG:true, I:true, EM:true, U:true, BR:true,
  UL:true, OL:true, LI:true, DIV:true, P:true,
  SPAN:true   // only the allow-listed inline style below may survive on a span
};
const RT_SIZES = {small:'13px', normal:'15px', large:'19px', huge:'25px'};
const RT_SIZE_VALUES = new Set(Object.values(RT_SIZES));

// Recursively rebuild `dirty` HTML using only RT_TAGS, dropping every attribute except a
// safelisted font-size style on <span>. Disallowed elements are unwrapped (their text and
// allowed children survive) rather than deleted, except SCRIPT/STYLE/IFRAME/OBJECT/EMBED,
// whose content is discarded entirely.
function sanitizeHtml(dirty){
  if(!dirty) return '';
  const src = document.createElement('div');
  src.innerHTML = String(dirty);
  const out = document.createElement('div');
  const DROP_ENTIRELY = {SCRIPT:true, STYLE:true, IFRAME:true, OBJECT:true, EMBED:true, LINK:true, META:true, TEMPLATE:true};
  function clean(node, parent){
    for(const child of Array.from(node.childNodes)){
      if(child.nodeType === 3){ parent.appendChild(document.createTextNode(child.nodeValue)); continue; }
      if(child.nodeType !== 1) continue;               // comments etc. — drop
      const tag = child.tagName;
      if(DROP_ENTIRELY[tag]) continue;                  // drop node AND its content
      if(!RT_TAGS[tag]){                                 // unwrap: keep children, drop the wrapper
        clean(child, parent);
        continue;
      }
      const el = document.createElement(tag);
      if(tag === 'SPAN'){
        const fs = child.style && child.style.fontSize;
        if(fs && RT_SIZE_VALUES.has(fs)) el.style.fontSize = fs;
        // any other attribute (style prop, class, href, onclick, id...) is simply never copied
      }
      clean(child, el);
      // drop now-empty wrapper elements that carry no useful formatting or text
      if(el.tagName==='SPAN' && !el.style.fontSize && !el.textContent && !el.childElementCount) continue;
      parent.appendChild(el);
    }
  }
  clean(src, out);
  return out.innerHTML;
}

// Plain-text preview for list rows (strategy cards, note rows): sanitize first, then strip tags.
function stripToText(html, maxLen){
  const d = document.createElement('div');
  d.innerHTML = sanitizeHtml(html);
  const t = (d.textContent || '').replace(/\s+/g,' ').trim();
  return maxLen && t.length > maxLen ? t.slice(0, maxLen) + '…' : t;
}

// ---------- small shared confirm dialog (Strategies / Notes delete actions) ----------
// Separate from the trade-specific confirm dialog on purpose, to avoid touching that
// already-tested flow; reuses the same .confirm-modal styling.
let _genericConfirmFn = null;
function genericConfirm(message, onConfirm){
  document.getElementById('genericConfirmMsg').textContent = message;
  _genericConfirmFn = onConfirm;
  document.getElementById('genericConfirmOverlay').classList.add('open');
}
function closeGenericConfirm(){
  document.getElementById('genericConfirmOverlay').classList.remove('open');
  _genericConfirmFn = null;
}
function runGenericConfirm(){
  const fn = _genericConfirmFn;
  closeGenericConfirm();
  if(fn) fn();
}

// ---------- toolbar ----------
// Builds a toolbar + contenteditable pair inside `hostEl` (an empty container element) and
// returns {setHtml(html), getHtml(), editEl}. Call setHtml('') for a blank note/strategy.
function buildRichEditor(hostEl){
  hostEl.innerHTML =
    '<div class="rt-toolbar">' +
      '<button type="button" class="rt-btn" data-cmd="bold" title="Bold"><b>B</b></button>' +
      '<button type="button" class="rt-btn" data-cmd="italic" title="Italic"><i>I</i></button>' +
      '<button type="button" class="rt-btn" data-cmd="underline" title="Underline"><u>U</u></button>' +
      '<span class="rt-sep"></span>' +
      '<button type="button" class="rt-btn" data-cmd="insertUnorderedList" title="Bullet list">•≡</button>' +
      '<button type="button" class="rt-btn" data-cmd="insertOrderedList" title="Numbered list">1≡</button>' +
      '<span class="rt-sep"></span>' +
      '<select class="rt-size" title="Text size">' +
        '<option value="">Size</option>' +
        '<option value="small">Small</option><option value="normal">Normal</option>' +
        '<option value="large">Large</option><option value="huge">Huge</option>' +
      '</select>' +
    '</div>' +
    '<div class="rt-edit" contenteditable="true" spellcheck="true"></div>';
  const toolbar = hostEl.querySelector('.rt-toolbar');
  const edit = hostEl.querySelector('.rt-edit');
  let savedRange = null;
  function saveSelection(){
    const sel = window.getSelection();
    if(sel && sel.rangeCount && edit.contains(sel.anchorNode)) savedRange = sel.getRangeAt(0).cloneRange();
  }
  function restoreSelection(){
    if(!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
  edit.addEventListener('keyup', saveSelection);
  edit.addEventListener('mouseup', saveSelection);
  edit.addEventListener('blur', saveSelection);
  toolbar.addEventListener('mousedown', e => e.preventDefault());   // keep focus/selection in the editor
  toolbar.querySelectorAll('.rt-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      edit.focus();
      restoreSelection();
      document.execCommand(btn.dataset.cmd, false, null);
      saveSelection();
    });
  });
  toolbar.querySelector('.rt-size').addEventListener('change', e=>{
    const key = e.target.value; e.target.value='';
    if(!key) return;
    edit.focus();
    restoreSelection();
    const sel = window.getSelection();
    if(!sel || !sel.rangeCount || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = RT_SIZES[key];
    try{ range.surroundContents(span); }
    catch(e2){ span.appendChild(range.extractContents()); range.insertNode(span); }
    sel.removeAllRanges();
    const r2 = document.createRange(); r2.selectNodeContents(span); r2.collapse(false);
    sel.addRange(r2);
    saveSelection();
  });
  // Paste as plain text only — the simplest, safest way to stop clipboard-borne HTML
  // (scripts, inline event handlers, foreign styling) from ever entering the editor.
  edit.addEventListener('paste', e=>{
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });
  return {
    editEl: edit,
    setHtml(html){ edit.innerHTML = sanitizeHtml(html); },
    getHtml(){ return sanitizeHtml(edit.innerHTML); }
  };
}
