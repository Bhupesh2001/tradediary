// ── INIT ───────────────────────────────────────────────────────────────────
['modalOverlay','confirmOverlay','backupOverlay','wlModalOverlay','wlDetailOverlay'].forEach(id=>{
  document.getElementById(id).addEventListener('click',e=>{if(e.target===document.getElementById(id))document.getElementById(id).classList.remove('open');});
});
setSyncStatus('syncing','Connecting...');
injectInfoIcons();
applySidebarState();

// ── SERVICE WORKER ─────────────────────────────────────────────────────────
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('/tradediary/sw.js').catch(()=>{}));
}
