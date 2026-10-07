// ── MOBILE SIDEBAR ─────────────────────────────────────────────────────────
function isDesktop(){return !!(window.matchMedia&&window.matchMedia('(min-width:769px)').matches)}
function toggleSidebarCollapse(){
  const c=!document.body.classList.contains('sb-collapsed');
  document.body.classList.toggle('sb-collapsed',c);
  try{localStorage.setItem('td_sb_collapsed',c?'1':'0')}catch(e){}
}
function applySidebarState(){
  let c=false;try{c=localStorage.getItem('td_sb_collapsed')==='1'}catch(e){}
  document.body.classList.toggle('sb-collapsed',c);
  document.querySelectorAll('.nav-item').forEach(n=>{n.title=n.textContent.trim();});   // tooltips when only icons show
}
// ☰ collapses the sidebar on desktop, opens the drawer on mobile
function openSidebar(){
  if(isDesktop()){toggleSidebarCollapse();return;}
  document.getElementById('sidebar').classList.add('mobile-open');document.getElementById('drawerOverlay').classList.add('open');
}
function closeSidebar(){document.getElementById('sidebar').classList.remove('mobile-open');document.getElementById('drawerOverlay').classList.remove('open');}

// ── NAVIGATION ─────────────────────────────────────────────────────────────
function setPage(p){
  if(p!==currentPage)closeTradePanel();
  currentPage=p;
  ['dashboard','log','analytics','psychology','ai','watchlist','rules'].forEach(id=>{
    const el=document.getElementById('page'+id.charAt(0).toUpperCase()+id.slice(1));
    if(el){el.style.display=id===p?'flex':'none';if(id===p)el.style.flexDirection='column';}
  });
  document.querySelectorAll('.nav-item').forEach((el,i)=>el.classList.toggle('active',['dashboard','log','analytics','psychology','ai','watchlist','rules'][i]===p));
  ['dashboard','log','analytics','psychology','ai','watchlist','rules'].forEach(id=>{
    const bn=document.getElementById('bn-'+id);
    if(bn)bn.classList.toggle('active',id===p);
  });
  document.getElementById('pageTitle').textContent={dashboard:'Dashboard',log:'Trade Log',analytics:'Analytics',psychology:'Psychology',ai:'AI Summariser',watchlist:'Watchlist',rules:'Rules & Goals'}[p];
  document.getElementById('mainScroll').scrollTo({top:0,behavior:'smooth'});
  renderPage(p);
}
function renderPage(p){
  if(p==='dashboard')renderDashboard();
  if(p==='log')renderLog();
  if(p==='analytics')renderAnalytics();
  if(p==='psychology')renderPsychology();
  if(p==='watchlist')renderWatchlist();
  if(p==='rules')renderRules();
  updateRuleBanner();
  tpRefresh();
}

// ── STATS ──────────────────────────────────────────────────────────────────
function getTotals(trades){
  let pnl=0,wins=0,losses=0,be=0,grossWin=0,grossLoss=0,rSum=0,rN=0,fees=0,gross=0;
  trades.forEach(t=>{
    pnl+=t.pnl;fees+=t.fees||0;gross+=(t.grossPnl??t.pnl);
    if(t.pnl>0){wins++;grossWin+=t.pnl;}else if(t.pnl<0){losses++;grossLoss+=Math.abs(t.pnl);}else be++;
    if(t.sl&&t.entry){const risk=Math.abs(t.entry-t.sl)*t.qty;if(risk>0){rSum+=t.pnl/risk;rN++;}}
  });
  const total=trades.length;
  return{pnl,fees,gross,wins,losses,be,total,grossWin,grossLoss,winRate:total?Math.round((wins/total)*100):0,pf:grossLoss?(grossWin/grossLoss).toFixed(2):'—',avgR:rN?(rSum/rN).toFixed(2):0};
}

