// ── MOBILE SIDEBAR ─────────────────────────────────────────────────────────
function openSidebar(){document.getElementById('sidebar').classList.add('mobile-open');document.getElementById('drawerOverlay').classList.add('open');}
function closeSidebar(){document.getElementById('sidebar').classList.remove('mobile-open');document.getElementById('drawerOverlay').classList.remove('open');}

// ── NAVIGATION ─────────────────────────────────────────────────────────────
function setPage(p){
  currentPage=p;
  ['dashboard','log','analytics','psychology','ai','watchlist'].forEach(id=>{
    const el=document.getElementById('page'+id.charAt(0).toUpperCase()+id.slice(1));
    if(el){el.style.display=id===p?'flex':'none';if(id===p)el.style.flexDirection='column';}
  });
  document.querySelectorAll('.nav-item').forEach((el,i)=>el.classList.toggle('active',['dashboard','log','analytics','psychology','ai','watchlist'][i]===p));
  ['dashboard','log','analytics','psychology','ai','watchlist'].forEach(id=>{
    const bn=document.getElementById('bn-'+id);
    if(bn)bn.classList.toggle('active',id===p);
  });
  document.getElementById('pageTitle').textContent={dashboard:'Dashboard',log:'Trade Log',analytics:'Analytics',psychology:'Psychology',ai:'AI Summariser',watchlist:'Watchlist'}[p];
  document.getElementById('mainScroll').scrollTo({top:0,behavior:'smooth'});
  renderPage(p);
}
function renderPage(p){
  if(p==='dashboard')renderDashboard();
  if(p==='log')renderLog();
  if(p==='analytics')renderAnalytics();
  if(p==='psychology')renderPsychology();
  if(p==='watchlist')renderWatchlist();
}

// ── STATS ──────────────────────────────────────────────────────────────────
function getTotals(trades){
  let pnl=0,wins=0,losses=0,be=0,grossWin=0,grossLoss=0,rSum=0,fees=0,gross=0;
  trades.forEach(t=>{
    pnl+=t.pnl;fees+=t.fees||0;gross+=(t.grossPnl??t.pnl);
    if(t.pnl>0){wins++;grossWin+=t.pnl;}else if(t.pnl<0){losses++;grossLoss+=Math.abs(t.pnl);}else be++;
    if(t.sl&&t.entry){const risk=Math.abs(t.entry-t.sl)*t.qty;if(risk>0)rSum+=t.pnl/risk;}
  });
  const total=trades.length;
  return{pnl,fees,gross,wins,losses,be,total,grossWin,grossLoss,winRate:total?Math.round((wins/total)*100):0,pf:grossLoss?(grossWin/grossLoss).toFixed(2):'—',avgR:total?(rSum/total).toFixed(2):0};
}

