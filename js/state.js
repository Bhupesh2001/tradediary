// ── STATE ──────────────────────────────────────────────────────────────────
let allTrades = [];
let currentProfile = localStorage.getItem('td_profile') || 'INR';
let currentPage = 'dashboard';
let selectedEmotion = '', editingId = null, deleteTargetId = null;
let tradeImages = [];
let hmYear = new Date().getFullYear(), hmMonth = new Date().getMonth();
let selectedDates = new Set(), lastClickedDate = null;
let eqChart, pieChart, stratChart, dowChart, cumChart, emChart, monthChart, ddChart, todChart, symChart, holdChart;
let npTrades = [], npIndex = 0;
let mergeMode = 'merge';
let currentUID = null;
let fbListenerActive = false;
let setupsListenerActive = false;

// ── HELPERS ────────────────────────────────────────────────────────────────
function uid(){return Math.random().toString(36).slice(2,10)}
function getTrades(){return allTrades.filter(t=>t.profile===currentProfile)}
// Paper trading formats like INR (₹, en-IN) by default — only USD gets $ / en-US.
function CS(){return currentProfile==='USD'?'$':'₹'}
function fmtPnl(v){const s=CS();return(v>=0?'+':'')+s+Math.abs(v).toLocaleString(currentProfile==='USD'?'en-US':'en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
function escHtml(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function setSyncStatus(state,text){document.getElementById('syncDot').className='sync-dot '+state;document.getElementById('syncLabel').textContent=text}


// Resize + JPEG-compress an image File -> data URL (keeps DB records small)
function compressImage(file, maxW = 1200, quality = 0.7){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });
}

// Local-date helpers (toISOString() is UTC and gives "yesterday" early morning in IST)
// ── Trade category (Swing / Intraday / F&O), used to slice the Analytics page ──
let analyticsCategory = (function(){try{return localStorage.getItem('td_ana_cat')||'combined'}catch(e){return 'combined'}})();
const CAT_LABELS = {combined:'Combined', intraday:'Intraday', swing:'Swing', fno:'F&O', uncategorized:'Uncategorized'};
// Explicit t.category wins; otherwise fall back to the older instrument/product fields
// (set only on JSON-imported trades) so historical imports still land in the right bucket.
function tradeCategory(t){
  if(t.category) return t.category;
  if(t.instrument==='OPTION'||t.instrument==='FUTURE') return 'fno';
  if(t.product==='DELIVERY') return 'swing';
  if(t.product==='INTRADAY') return 'intraday';
  return 'uncategorized';
}
function getAnalyticsTrades(){
  const base = getTrades();
  return analyticsCategory==='combined' ? base : base.filter(t=>tradeCategory(t)===analyticsCategory);
}
// Smart default for the trade-form category toggle: look at the symbol itself.
function guessCategory(sym){
  const s = String(sym||'').toUpperCase();
  if(/(?:\d|\s)(CE|PE)$/.test(s) || /FUT$/.test(s)) return 'fno';
  return 'intraday';
}
function setAnalyticsCategory(cat){
  analyticsCategory = cat;
  try{localStorage.setItem('td_ana_cat', cat)}catch(e){}
  renderAnalytics();
}
// Capital committed to a trade. INR: notional value at entry (qty × entry price), for
// either direction. USD/crypto: the actual margin put up (the existing `amount` field),
// not the leveraged notional, since that's the real capital at risk.
function tradeAmountUsed(t){
  if(t.profile==='USD') return (t.amount>0) ? t.amount : +(t.entry*t.qty/(t.leverage||1)).toFixed(4);
  return +(t.entry*t.qty).toFixed(2);
}
// Net P&L as a % of capital committed to that one trade. Null when it can't be computed.
function tradePnlPct(t){
  const amt = tradeAmountUsed(t);
  return amt>0 ? (t.pnl/amt*100) : null;
}
function fmtPct(p){ return p===null ? '' : (p>=0?'+':'')+p.toFixed(1)+'%'; }
function dateStr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function todayStr(){return dateStr(new Date())}
// Trade time helpers. A blank time is stored as the sentinel '23:59' (sorts last) and is treated as "unknown".
function realTime(t){return !!(t&&t.time&&t.time!=='23:59')}
function toMin(hhmm){const p=String(hhmm).split(':');return (+p[0])*60+(+p[1]||0)}
function holdMinutes(t){
  if(!realTime(t)||!t.exitTime) return null;
  const m=toMin(t.exitTime)-toMin(t.time);
  return m>=0?m:null;
}
function fmtDur(m){return m<60?Math.round(m)+'m':Math.floor(m/60)+'h '+String(Math.round(m%60)).padStart(2,'0')+'m'}
