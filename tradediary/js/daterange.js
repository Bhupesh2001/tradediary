// ── DATE RANGE PICKER ──────────────────────────────────────────────────────
let drpYear = new Date().getFullYear();
let drpMonth = new Date().getMonth();
let drpStart = null, drpEnd = null, drpSelecting = false;
let drpJustClicked = false; // suppress outside-close right after a day click
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toggleDRP(){
  const dd = document.getElementById('drpDropdown');
  const open = dd.classList.contains('open');
  if(open){ closeDRP(); }
  else { dd.classList.add('open'); document.getElementById('drpTrigger').classList.add('active'); renderDRP(); }
}

function closeDRP(){
  document.getElementById('drpDropdown').classList.remove('open');
  document.getElementById('drpTrigger').classList.remove('active');
}

function drpNav(dir){
  drpMonth += dir;
  if(drpMonth > 11){ drpMonth = 0; drpYear++; }
  if(drpMonth < 0){ drpMonth = 11; drpYear--; }
  renderDRP();
}

function renderDRP(){
  document.getElementById('drpM1Name').textContent = MONTHS[drpMonth] + ' ' + drpYear;
  renderDRPMonth('drpDays1', drpYear, drpMonth);
}

function renderDRPMonth(containerId, year, month){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for(let i = 0; i < firstDay; i++){
    const el = document.createElement('button');
    el.className = 'drp-day empty'; el.disabled = true;
    container.appendChild(el);
  }
  for(let d = 1; d <= daysInMonth; d++){
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el = document.createElement('button');
    el.className = 'drp-day';
    el.textContent = d;
    if(drpStart && drpEnd){
      const s = drpStart <= drpEnd ? drpStart : drpEnd;
      const e = drpStart <= drpEnd ? drpEnd : drpStart;
      if(dateStr === s) el.classList.add('range-start');
      if(dateStr === e) el.classList.add('range-end');
      if(dateStr > s && dateStr < e) el.classList.add('in-range');
    } else if(drpStart && dateStr === drpStart){
      el.classList.add('range-start','range-end');
    }
    el.addEventListener('click', (ev) => { ev.stopPropagation(); drpSelectDay(dateStr); });
    container.appendChild(el);
  }
}

function drpSelectDay(dateStr){
  drpJustClicked = true;
  if(!drpSelecting || !drpStart){
    // first click — set start, stay open for end date
    drpStart = dateStr; drpEnd = null; drpSelecting = true;
    updateDRPLabel(); renderDRP();
  } else {
    // second click — set end, apply, close
    drpEnd = dateStr; drpSelecting = false;
    const s = drpStart <= drpEnd ? drpStart : drpEnd;
    const e = drpStart <= drpEnd ? drpEnd : drpStart;
    drpStart = s; drpEnd = e;
    document.getElementById('logFDateFrom').value = drpStart;
    document.getElementById('logFDateTo').value = drpEnd;
    renderLog();
    updateDRPLabel(); renderDRP();
    closeDRP();
  }
}

function updateDRPLabel(){
  const lbl = document.getElementById('drpLabel');
  const sel = document.getElementById('drpSelectedLabel');
  if(!drpStart && !drpEnd){
    lbl.textContent = 'Select date range'; lbl.className = 'drp-val placeholder';
    if(sel) sel.innerHTML = 'Click a date to start';
  } else if(drpStart && !drpEnd){
    lbl.textContent = drpStart + ' → ?'; lbl.className = 'drp-val';
    if(sel) sel.innerHTML = `From <b>${drpStart}</b> — pick end date`;
  } else {
    lbl.textContent = drpStart + ' → ' + drpEnd; lbl.className = 'drp-val';
    if(sel) sel.innerHTML = `<b>${drpStart}</b> to <b>${drpEnd}</b>`;
  }
}

function clearLogDateFilter(){
  drpStart = null; drpEnd = null; drpSelecting = false;
  document.getElementById('logFDateFrom').value = '';
  document.getElementById('logFDateTo').value = '';
  closeDRP();
  updateDRPLabel();
  renderLog();
}

// outside click — only close if not mid-click on a day
document.addEventListener('click', e => {
  if(drpJustClicked){ drpJustClicked = false; return; }
  const wrap = document.getElementById('drpWrap');
  if(wrap && !wrap.contains(e.target)){
    if(drpSelecting){
      // abandoned mid-selection — keep start as single-date filter
      drpEnd = null; drpSelecting = false;
      document.getElementById('logFDateFrom').value = drpStart;
      document.getElementById('logFDateTo').value = '';
      renderLog();
      updateDRPLabel();
    }
    closeDRP();
  }
});

// Register service worker for PWA

