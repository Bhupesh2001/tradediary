import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, off } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA-UN4q6Mttu43jCgICf912q7cXdNVXfkc",
  authDomain: "tradediary-fd03e.firebaseapp.com",
  databaseURL: "https://tradediary-fd03e-default-rtdb.firebaseio.com",
  projectId: "tradediary-fd03e",
  storageBucket: "tradediary-fd03e.firebasestorage.app",
  messagingSenderId: "634991237808",
  appId: "1:634991237808:web:05858672c3f9241894b975"
};

const app  = initializeApp(firebaseConfig);
const db   = getDatabase(app);
const auth = getAuth(app);

window._fbSet    = (path,val) => set(ref(db,path),val);
window._fbRemove = (path)     => remove(ref(db,path));
window._fbOff    = (path)     => off(ref(db,path));
window._fbListen = (path,cb)  => onValue(ref(db,path), snap => cb(snap.val()));
window._auth     = auth;
window._fbReady  = true;

// Auth state
onAuthStateChanged(auth, user => {
  if(user){ window._currentUser = user; window._onLogin && window._onLogin(user); }
  else    { window._currentUser = null; window._onLogout && window._onLogout(); }
});
window._signIn    = (e,p) => signInWithEmailAndPassword(auth,e,p);
window._signUp    = (e,p) => createUserWithEmailAndPassword(auth,e,p);
window._signOut   = ()    => signOut(auth);
window._resetPwd  = (e)   => sendPasswordResetEmail(auth,e);
