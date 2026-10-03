// ── AUTH ───────────────────────────────────────────────────────────────────
function authTab(tab){
  document.getElementById('tabLogin').classList.toggle('active',tab==='login');
  document.getElementById('tabSignup').classList.toggle('active',tab==='signup');
  document.getElementById('loginForm').style.display=tab==='login'?'block':'none';
  document.getElementById('signupForm').style.display=tab==='signup'?'block':'none';
  document.getElementById('authErr').textContent='';
}
function authErrMsg(e){
  const m={
    'auth/invalid-email':'Invalid email address.',
    'auth/user-not-found':'No account found. Please sign up.',
    'auth/wrong-password':'Incorrect password.',
    'auth/email-already-in-use':'Email already registered. Sign in instead.',
    'auth/weak-password':'Password must be at least 6 characters.',
    'auth/too-many-requests':'Too many attempts. Try again later.',
    'auth/invalid-credential':'Incorrect email or password.'
  };
  return m[e.code]||e.message;
}
async function doLogin(){
  const e=document.getElementById('loginEmail').value.trim(), p=document.getElementById('loginPwd').value;
  document.getElementById('authErr').textContent='';
  if(!e||!p){document.getElementById('authErr').textContent='Enter email and password.';return;}
  try{await window._signIn(e,p);}catch(err){document.getElementById('authErr').textContent=authErrMsg(err);}
}
async function doSignup(){
  const e=document.getElementById('signupEmail').value.trim(), p=document.getElementById('signupPwd').value;
  document.getElementById('authErr').textContent='';
  if(!e||!p){document.getElementById('authErr').textContent='Enter email and password.';return;}
  try{await window._signUp(e,p);}catch(err){document.getElementById('authErr').textContent=authErrMsg(err);}
}
async function doReset(){
  const e=document.getElementById('loginEmail').value.trim();
  if(!e){document.getElementById('authErr').textContent='Enter your email first.';return;}
  try{await window._resetPwd(e);document.getElementById('authErr').style.color='var(--accent)';document.getElementById('authErr').textContent='Reset email sent!';}
  catch(err){document.getElementById('authErr').textContent=authErrMsg(err);}
}
async function doSignOut(){if(confirm('Sign out?'))await window._signOut();}

// Enter key on auth inputs
document.getElementById('loginPwd').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
document.getElementById('signupPwd').addEventListener('keydown',e=>{if(e.key==='Enter')doSignup();});

// ── AUTH STATE CALLBACKS ───────────────────────────────────────────────────
window._onLogin = function(user){
  currentUID = user.uid;
  document.getElementById('authScreen').style.display='none';
  document.getElementById('appScreen').style.display='block';
  const initials = user.email.slice(0,2).toUpperCase();
  document.getElementById('avInitials').textContent=initials;
  document.getElementById('userEmail').textContent=user.email;
  startFirebaseListener();
  startSetupsListener();
  switchProfile(currentProfile);
};
window._onLogout = function(){
  const oldUID = currentUID;
  if(oldUID && window._fbOff){
    window._fbOff('users/'+oldUID+'/trades');
    window._fbOff('users/'+oldUID+'/setups');
  }
  fbListenerActive = false;
  setupsListenerActive = false;
  currentUID = null;
  allTrades = [];
  allSetups = [];
  document.getElementById('authScreen').style.display='flex';
  document.getElementById('appScreen').style.display='none';
};

function startFirebaseListener(){
  if(!currentUID||!window._fbReady)return;
  if(fbListenerActive)return;
  fbListenerActive=true;
  setSyncStatus('syncing','Syncing...');
  window._fbListen('users/'+currentUID+'/trades', data=>{
    allTrades = data ? Object.values(data) : [];
    setSyncStatus('synced','Synced ✓');
    renderPage(currentPage);
    if(selectedDates.size)renderDayPanel();
  });
}

function saveTradeFB(trade){
  if(!currentUID||!window._fbReady)return;
  setSyncStatus('syncing','Saving...');
  window._fbSet('users/'+currentUID+'/trades/'+trade.id, trade)
    .then(()=>setSyncStatus('synced','Synced ✓'))
    .catch(()=>setSyncStatus('error','Error'));
}
function deleteTradeFB(id){
  if(!currentUID||!window._fbReady)return;
  setSyncStatus('syncing','Saving...');
  window._fbRemove('users/'+currentUID+'/trades/'+id)
    .then(()=>setSyncStatus('synced','Synced ✓'))
    .catch(()=>setSyncStatus('error','Error'));
}
function save(){
  if(!currentUID||!window._fbReady)return;
  setSyncStatus('syncing','Saving...');
  const obj={};allTrades.forEach(t=>{obj[t.id]=t;});
  window._fbSet('users/'+currentUID+'/trades',obj)
    .then(()=>setSyncStatus('synced','Synced ✓'))
    .catch(()=>setSyncStatus('error','Error'));
}

// wait for firebase module before starting listener if user already logged in
function waitForFirebase(){
  if(window._fbReady){if(currentUID)startFirebaseListener();}
  else setTimeout(waitForFirebase,100);
}
waitForFirebase();

