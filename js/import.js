// ── JSON TRADE IMPORT (broker AI → TradeDiary) ─────────────────────────────
const IMPORT_EXAMPLE=[
  {symbol:'NIFTY 24500 PE',instrument:'OPTION',optionType:'PE',product:'INTRADAY',side:'BUY',quantity:75,entryPrice:112.5,exitPrice:138,date:'2026-10-01',entryTime:'09:32',exitTime:'09:58',charges:54.3,grossPnl:1912.5,tradeId:'250930000123'},
  {symbol:'TATAMOTORS',instrument:'EQUITY',product:'INTRADAY',side:'SELL',quantity:100,entryPrice:705.4,exitPrice:700.9,date:'2026-10-01',entryTime:'10:15',exitTime:'11:02'},
  {symbol:'BANKNIFTY 52000 CE',instrument:'OPTION',optionType:'CE',side:'BUY',quantity:30,entryPrice:210,exitPrice:185.5,date:'2026-10-01',entryTime:'13:41',exitTime:'14:20'}
];
const IMPORT_PROMPT=
'From my tradebook / trade history for <DATE or DATE RANGE>, convert my executed trades into COMPLETED ROUND-TRIP trades '+
'(one opening order + one closing order per trade). If an order was filled in several parts, merge the parts and use the average price. '+
'Skip positions that are still open.\n\n'+
'Return ONLY a valid JSON array (no markdown, no explanation). Each element must use exactly these fields:\n'+
'- symbol: string, e.g. "NIFTY 24500 PE", "RELIANCE", "BANKNIFTY OCT FUT"\n'+
'- instrument: "EQUITY" | "OPTION" | "FUTURE"\n'+
'- optionType: "CE" or "PE" (options only; omit otherwise)\n'+
'- product: "INTRADAY" or "DELIVERY" (equity only; MIS = INTRADAY, CNC = DELIVERY)\n'+
'- side: "BUY" or "SELL" = the action of the FIRST (opening) order. Buying a PE = "BUY"; short-selling a stock intraday = "SELL"\n'+
'- quantity: number of units traded (lots x lot size for F&O), a plain number\n'+
'- entryPrice: average price of the opening order, a plain number\n'+
'- exitPrice: average price of the closing order, a plain number\n'+
'- date: "YYYY-MM-DD" (date of entry)\n'+
'- entryTime: "HH:MM" 24-hour IST (time of first opening fill)\n'+
'- exitTime: "HH:MM" 24-hour IST (time of last closing fill)\n'+
'- charges: total brokerage + taxes + fees for the round trip, a number (omit if unavailable)\n'+
'- grossPnl: realised P&L before charges, a number (omit if unavailable)\n'+
'- tradeId: broker trade/order id as a string (omit if unavailable)\n\n'+
'Do NOT include stop loss, notes, emotions or strategy. Example of the exact format:\n'+JSON.stringify(IMPORT_EXAMPLE,null,2);

const IMP_EMOTIONS=['calm','fear','greed','revenge','confident','disciplined'];
let impRows=[];

// ---------- tolerant field mapping ----------
const IMP_ALIASES={
  symbol:['symbol','tradingsymbol','sym','scrip','instrumentname'],
  instrument:['instrument','instrumenttype'],
  optionType:['optiontype','optype','right','cepe','callput'],
  product:['product','producttype'],
  side:['side','transactiontype','action','openingorder','openingside','firstorder','buysell'],
  quantity:['quantity','qty','units'],
  entryPrice:['entryprice','entry','avgentryprice','openprice'],
  exitPrice:['exitprice','exit','avgexitprice','closeprice'],
  date:['date','tradedate','entrydate'],
  entryTime:['entrytime','time','opentime','entrytimestamp'],
  exitTime:['exittime','closetime','exittimestamp'],
  charges:['charges','fees','totalcharges','totalfees'],
  grossPnl:['grosspnl','pnl','realizedpnl','realisedpnl','profitloss'],
  tradeId:['tradeid','id','orderid','externalid','ref'],
  profile:['profile','currency'],
  leverage:['leverage']
};
const IMP_LOOKUP={};Object.entries(IMP_ALIASES).forEach(([c,a])=>a.forEach(x=>{IMP_LOOKUP[x]=c;}));
function impCanon(raw){
  const o={};
  Object.keys(raw).forEach(k=>{const c=IMP_LOOKUP[String(k).toLowerCase().replace(/[^a-z0-9]/g,'')];if(c&&o[c]===undefined&&raw[k]!==null&&raw[k]!=='')o[c]=raw[k];});
  return o;
}
function impNum(v){
  if(typeof v==='number')return isFinite(v)?v:NaN;
  if(typeof v!=='string')return NaN;
  const n=parseFloat(v.replace(/[,₹$\s]/g,''));return isNaN(n)?NaN:n;
}
function impDate(v){
  if(v==null)return null;const s=String(v).trim();let y,m,d,mm;
  if((mm=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))){y=+mm[1];m=+mm[2];d=+mm[3];}
  else if((mm=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))){d=+mm[1];m=+mm[2];y=+mm[3];}   // DD-MM-YYYY (Indian)
  else return null;
  const dt=new Date(Date.UTC(y,m-1,d));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return null;
  return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function impTime(v){
  if(v==null)return null;
  const mm=String(v).match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/);if(!mm)return null;
  let h=+mm[1];const mi=+mm[2];
  if(mm[3]){const pm=/p/i.test(mm[3]);if(h===12)h=pm?12:0;else if(pm)h+=12;}
  if(h>23||mi>59)return null;
  return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0');
}
function impSide(v){
  const s=String(v||'').trim().toUpperCase();
  if(['BUY','B','LONG','BOUGHT'].includes(s))return 'BUY';
  if(['SELL','S','SHORT','SOLD'].includes(s))return 'SELL';
  return null;
}
function impInstrument(v,sym){
  const s=String(v||'').trim().toUpperCase();
  if(/^(OPT|OPTION|OPTIONS|OPTIDX|OPTSTK|OPTFUT)/.test(s)||s==='CE'||s==='PE')return 'OPTION';
  if(/^(FUT|FUTURE|FUTURES|FUTIDX|FUTSTK)/.test(s))return 'FUTURE';
  if(/^(EQ|EQUITY|STOCK|STOCKS|CASH)/.test(s))return 'EQUITY';
  if(/(\d|\s)(CE|PE)$/.test(sym))return 'OPTION';
  if(/FUT$/.test(sym))return 'FUTURE';
  return 'EQUITY';
}
// Direction = the order you placed first: Buy first = LONG, Sell first = SHORT (a bought CE and a bought PE are both LONG).
// Rising-vs-falling-market comparisons live in Analytics (Calls vs Puts, Bullish vs Bearish).
function impDirection(side){return side==='SELL'?'SHORT':'LONG'}

// ---------- parse -> rows ----------
function impBuildRow(raw,idx){
  const errs=[],warn=[];
  const c=impCanon(raw&&typeof raw==='object'?raw:{});
  const sym=String(c.symbol||'').trim().toUpperCase();
  const side=impSide(c.side),qty=impNum(c.quantity),entry=impNum(c.entryPrice),exit=impNum(c.exitPrice);
  const date=impDate(c.date)||impDate(c.entryTime);
  if(!sym)errs.push('symbol is missing');
  if(!side)errs.push('side must be BUY or SELL');
  if(!(qty>0))errs.push('quantity must be a positive number');
  if(!(entry>0))errs.push('entryPrice must be a positive number');
  if(!(exit>0))errs.push('exitPrice must be a positive number (open positions are not imported)');
  if(!date)errs.push('date is missing or invalid (use YYYY-MM-DD)');
  const instrument=impInstrument(c.instrument,sym);
  let optType=null;
  if(instrument==='OPTION'){
    const o=String(c.optionType||'').trim().toUpperCase();
    optType=/^C/.test(o)?'CE':/^P/.test(o)?'PE':((sym.match(/(CE|PE)$/)||[])[1]||null);
    if(!optType)errs.push('optionType (CE or PE) is missing for this option');
  }
  const time=impTime(c.entryTime);
  if(!time)warn.push('No entry time — it will be saved without a time and skipped by time-based stats');
  let exitTime=c.exitTime!==undefined?impTime(c.exitTime):null;
  if(c.exitTime!==undefined&&!exitTime)warn.push('Exit time could not be read — ignored');
  if(time&&exitTime&&toMin(exitTime)<toMin(time)){warn.push('Exit time is earlier than entry time — ignored');exitTime=null;}
  if(!time)exitTime=null;
  const ps=String(c.profile||'');
  const profile=/usd|\$/i.test(ps)?'USD':/inr|₹/i.test(ps)?'INR':currentProfile;
  const chg=c.charges!==undefined?impNum(c.charges):NaN,gp=c.grossPnl!==undefined?impNum(c.grossPnl):NaN;
  const product=instrument==='EQUITY'?(/DELIV|CNC/i.test(String(c.product||''))?'DELIVERY':'INTRADAY'):null;
  const row={idx,errs,warn,ok:!errs.length,include:!errs.length,profile,sym,date,time,exitTime,instrument,optType,product,side,
    dir:impDirection(side),qty,entry,exit,
    charges:isNaN(chg)?null:Math.max(0,chg),brokerGross:isNaN(gp)?null:gp,
    externalId:c.tradeId!==undefined?String(c.tradeId).trim():'',
    leverage:Math.max(1,impNum(c.leverage)||1),
    seg:instrument==='OPTION'?'options':instrument==='FUTURE'?'futures':(product==='DELIVERY'?'delivery':'intraday'),
    emotion:'',strat:'',sl:'',notes:'',dup:''};
  row.chargesManual=row.charges!==null;
  if(row.ok)impRecompute(row);
  return row;
}
function impRecompute(r){
  const dp=r.profile==='USD'?4:2;
  r.gross=+((r.dir==='LONG'?r.exit-r.entry:r.entry-r.exit)*r.qty).toFixed(dp);
  if(r.chargesManual)r.fees=r.charges||0;
  else{
    const res=calcCharges({profile:r.profile,dir:r.dir,entry:r.entry,exit:r.exit,qty:r.qty,seg:r.seg,rate:getFeeRate()});
    r.fees=res?+res.total.toFixed(dp):0;
  }
  r.net=+(r.gross-r.fees).toFixed(dp);
}
function impMarkDups(rows){
  const fp=t=>[t.profile,String(t.sym||'').toUpperCase(),t.date,t.time||'23:59',(+t.entry).toFixed(4),(+t.exit).toFixed(4),(+t.qty).toFixed(4)].join('|');
  const have=new Set();
  allTrades.forEach(t=>{have.add(fp(t));if(t.externalId)have.add(t.profile+'|id|'+t.externalId);});
  const seen=new Set();
  rows.filter(r=>r.ok).forEach(r=>{
    const keys=[fp(r)];if(r.externalId)keys.push(r.profile+'|id|'+r.externalId);
    if(keys.some(k=>have.has(k)))r.dup='Already in your journal';
    else if(keys.some(k=>seen.has(k)))r.dup='Duplicate of another row in this list';
    keys.forEach(k=>seen.add(k));
    if(r.dup)r.include=false;
  });
}
function impParseText(txt){
  let s=String(txt||'').trim();
  if(!s)throw new Error('Paste your JSON first.');
  s=s.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").trim();
  const tryParse=x=>JSON.parse(x.replace(/,\s*([\]}])/g,'$1'));
  let data;
  try{data=tryParse(s);}
  catch(e){
    const a=s.indexOf('['),b=s.lastIndexOf(']');   // AI added chatter around the JSON?
    if(a>=0&&b>a){try{data=tryParse(s.slice(a,b+1));}catch(e2){throw new Error('Not valid JSON: '+e.message);}}
    else throw new Error('Not valid JSON: '+e.message);
  }
  if(!Array.isArray(data))data=Array.isArray(data&&data.trades)?data.trades:(data&&typeof data==='object'?[data]:[]);
  if(!data.length)throw new Error('No trades found in the JSON.');
  return data;
}

// ---------- UI ----------
function impMoney(v,p){return (p==='USD'?'$':'₹')+Math.abs(v).toLocaleString(p==='INR'?'en-IN':'en-US',{maximumFractionDigits:2})}
function impSigned(v,p){return (v<0?'−':v>0?'+':'')+impMoney(v,p)}
function impToast(msg){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('show');clearTimeout(impToast._h);impToast._h=setTimeout(()=>t.classList.remove('show'),3200);
}
function openImport(){
  document.getElementById('impErr').textContent='';
  document.getElementById('impStep1').style.display='';document.getElementById('impStep2').style.display='none';
  const strats=[...new Set(allTrades.map(t=>(t.strat||'').trim()).filter(Boolean))];
  document.getElementById('impStratList').innerHTML=strats.map(s=>'<option value="'+escHtml(s)+'">').join('');
  document.getElementById('impFormat').textContent=JSON.stringify(IMPORT_EXAMPLE,null,2);
  document.getElementById('importOverlay').classList.add('open');
}
function closeImport(){document.getElementById('importOverlay').classList.remove('open');}
function impBack(){document.getElementById('impStep1').style.display='';document.getElementById('impStep2').style.display='none';}
function impSample(){document.getElementById('impText').value=JSON.stringify(IMPORT_EXAMPLE,null,2);}
function impCopyPrompt(){
  const done=()=>impToast('Prompt copied — paste it into your broker AI');
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(IMPORT_PROMPT).then(done).catch(()=>impCopyFallback(done));
  else impCopyFallback(done);
}
function impCopyFallback(done){
  const ta=document.createElement('textarea');ta.value=IMPORT_PROMPT;document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');done();}catch(e){impToast('Copy failed — select the text manually');}
  ta.remove();
}
function impParse(){
  const err=document.getElementById('impErr');err.textContent='';
  let data;
  try{data=impParseText(document.getElementById('impText').value);}
  catch(e){err.textContent=e.message;return;}
  impRows=data.map((raw,i)=>impBuildRow(raw,i));
  impMarkDups(impRows);
  document.getElementById('impStep1').style.display='none';document.getElementById('impStep2').style.display='';
  impRender();
}
function impWarnings(r){
  const w=[...r.warn];
  if(r.brokerGross!==null&&Math.abs(r.gross-r.brokerGross)>Math.max(1,Math.abs(r.brokerGross)*0.005))
    w.push('Broker gross P&L '+impSigned(r.brokerGross,r.profile)+' differs from computed '+impSigned(r.gross,r.profile)+' — check side, quantity and prices');
  if(r.dup)w.unshift(r.dup);
  return w;
}
function impMeta(r){
  const tm=(r.time||'no time')+(r.exitTime?' → '+r.exitTime:'');
  return escHtml(r.date)+' · '+tm+' · qty '+r.qty+' · '+r.entry+' → '+r.exit+' · gross '+impSigned(r.gross,r.profile)+' · charges '+impMoney(r.fees,r.profile)+(r.chargesManual?'':' (est.)');
}
function impBadge(r){
  return escHtml((r.instrument==='OPTION'?'OPTION '+r.optType:r.instrument+(r.product?' '+r.product:''))+(r.profile!==currentProfile?' · '+r.profile:''));
}
function impCardHtml(r){
  const ems=IMP_EMOTIONS.map(e=>'<div class="em-tag '+e+' clickable'+(r.emotion===e?' selected':'')+'" data-em="'+e+'">'+e[0].toUpperCase()+e.slice(1)+'</div>').join('');
  const opt=(v,cur)=>'<option value="'+v+'"'+(v===cur?' selected':'')+'>'+v+'</option>';
  return '<div class="imp-card'+(r.include?'':' off')+'" data-i="'+r.idx+'">'+
   '<div class="imp-top"><label class="imp-chk"><input type="checkbox" data-f="include"'+(r.include?' checked':'')+'><b>'+escHtml(r.sym)+'</b></label>'+
   '<span data-r="dir"></span><span class="imp-badge" data-r="badge"></span><span class="imp-net" data-r="net"></span></div>'+
   '<div class="imp-meta" data-r="meta"></div><div data-r="warns"></div>'+
   '<div class="imp-ems">'+ems+'</div>'+
   '<div class="imp-fields">'+
     '<input class="form-input" data-f="strat" list="impStratList" placeholder="Strategy" value="'+escHtml(r.strat)+'">'+
     '<input class="form-input" type="number" step="any" data-f="sl" placeholder="Stop loss (price)" value="'+escHtml(r.sl)+'">'+
     '<input class="form-input" data-f="notes" placeholder="Comments / notes" value="'+escHtml(r.notes)+'" style="grid-column:1/-1">'+
   '</div>'+
   '<details class="imp-adv"><summary>Direction, opening order &amp; charges</summary><div class="imp-fields">'+
     '<label class="imp-lbl">Direction<select class="form-select" data-f="dir">'+opt('LONG',r.dir)+opt('SHORT',r.dir)+'</select></label>'+
     '<label class="imp-lbl">Charges ('+(r.profile==='USD'?'$':'₹')+') <span class="imp-auto" data-act="auto">Auto</span><input class="form-input" type="number" step="any" min="0" data-f="charges" value="'+(r.chargesManual?r.charges:'')+'" placeholder="auto"></label>'+
   '</div></details></div>';
}
function impRefresh(card,r){
  const q=k=>card.querySelector('[data-r="'+k+'"]');
  const d=q('dir');d.className=r.dir==='LONG'?'dir-long':'dir-short';d.textContent=r.dir;
  q('badge').innerHTML=impBadge(r);
  const n=q('net');n.textContent=impSigned(r.net,r.profile);n.className='imp-net '+(r.net>=0?'pnl-pos':'pnl-neg');
  q('meta').innerHTML=impMeta(r);
  q('warns').innerHTML=impWarnings(r).map(w=>'<div class="imp-warn">⚠ '+escHtml(w)+'</div>').join('');
  const ci=card.querySelector('[data-f="charges"]');if(ci&&!r.chargesManual)ci.placeholder='auto: '+r.fees;
}
function impUpdateFooter(){
  const sel=impRows.filter(r=>r.ok&&r.include);
  const btn=document.getElementById('impSaveBtn');btn.textContent='Save '+sel.length+' trade'+(sel.length===1?'':'s');btn.disabled=!sel.length;
  const noEm=sel.filter(r=>!r.emotion).length;
  document.getElementById('impNoEm').textContent=noEm?noEm+' selected trade'+(noEm>1?'s have':' has')+' no emotion chosen — saved as Calm.':'';
}
function impRender(){
  const ok=impRows.filter(r=>r.ok),bad=impRows.filter(r=>!r.ok),dups=ok.filter(r=>r.dup);
  document.getElementById('impSummary').textContent=impRows.length+' parsed · '+(ok.length-dups.length)+' new'+(dups.length?' · '+dups.length+' already logged / duplicate':'')+(bad.length?' · '+bad.length+' invalid':'');
  document.getElementById('impSkipped').innerHTML=bad.length?'<details class="imp-bad" open><summary>'+bad.length+' row'+(bad.length>1?'s':'')+' skipped</summary>'+
    bad.map(r=>'<div class="imp-warn">Row '+(r.idx+1)+(r.sym?' ('+escHtml(r.sym)+')':'')+': '+r.errs.map(escHtml).join('; ')+'</div>').join('')+'</details>':'';
  const box=document.getElementById('impRows');
  box.innerHTML=ok.map(impCardHtml).join('');
  box.querySelectorAll('.imp-card').forEach(card=>impRefresh(card,impRows[+card.dataset.i]));
  impUpdateFooter();
}
function impApplyAll(){
  const em=document.getElementById('impBulkEm').value,st=document.getElementById('impBulkStrat').value.trim();
  impRows.filter(r=>r.ok&&r.include).forEach(r=>{if(em)r.emotion=em;if(st)r.strat=st;});
  impRender();
}
function impSave(){
  const sel=impRows.filter(r=>r.ok&&r.include);if(!sel.length)return;
  const made=sel.map(r=>{
    const usd=r.profile==='USD';
    const t={id:uid(),profile:r.profile,sym:r.sym,date:r.date,time:r.time||'23:59',dir:r.dir,strat:r.strat.trim(),entry:r.entry,exit:r.exit,qty:r.qty,
      sl:parseFloat(r.sl)||0,leverage:usd?r.leverage:null,amount:usd?+(r.entry*r.qty/r.leverage).toFixed(4):null,
      notes:r.notes.trim(),emotion:r.emotion||'calm',pnl:r.net,grossPnl:r.gross,fees:r.fees,
      feeSeg:usd?null:r.seg,feeRate:usd?getFeeRate():null,feesManual:r.chargesManual,
      exitTime:r.exitTime||'',instrument:r.instrument,source:'import',images:[]};
    if(r.optType)t.optType=r.optType;
    if(r.product)t.product=r.product;
    if(r.externalId)t.externalId=r.externalId;
    return t;
  });
  made.forEach(t=>{allTrades.push(t);saveTradeFB(t);});
  const other=made.filter(t=>t.profile!==currentProfile).length;
  closeImport();renderPage(currentPage);
  impToast(made.length+' trade'+(made.length>1?'s':'')+' imported'+(other?' ('+other+' in the '+(currentProfile==='INR'?'USD':'INR')+' profile)':''));
}

// event delegation for the review list
(function(){
  const box=document.getElementById('impRows');
  const rowOf=e=>{const c=e.target.closest('.imp-card');return c?{card:c,r:impRows[+c.dataset.i]}:null;};
  box.addEventListener('click',e=>{
    const x=rowOf(e);if(!x)return;
    const chip=e.target.closest('.em-tag[data-em]');
    if(chip){
      x.r.emotion=x.r.emotion===chip.dataset.em?'':chip.dataset.em;
      x.card.querySelectorAll('.em-tag').forEach(c=>c.classList.toggle('selected',c.dataset.em===x.r.emotion));
      impUpdateFooter();return;
    }
    if(e.target.closest('[data-act="auto"]')){
      x.r.chargesManual=false;x.r.charges=null;x.card.querySelector('[data-f="charges"]').value='';
      impRecompute(x.r);impRefresh(x.card,x.r);
    }
  });
  const onField=e=>{
    const x=rowOf(e),f=e.target.dataset&&e.target.dataset.f;if(!x||!f)return;
    const r=x.r,v=e.target.type==='checkbox'?e.target.checked:e.target.value;
    if(f==='include'){r.include=v;x.card.classList.toggle('off',!v);impUpdateFooter();return;}
    if(f==='strat'||f==='sl'||f==='notes'){r[f]=v;return;}
    if(f==='dir'){r.dir=v;}
    if(f==='charges'){
      const n=parseFloat(v);
      if(v===''||isNaN(n)){r.chargesManual=false;r.charges=null;}else{r.chargesManual=true;r.charges=Math.max(0,n);}
    }
    impRecompute(r);impRefresh(x.card,r);
  };
  box.addEventListener('input',onField);box.addEventListener('change',onField);
})();

// One-time tidy of trades saved by an earlier build that stored a separate `side` (e.g. a bought PE as SHORT).
// Their P&L was already computed from the real opening order, so only the direction needs correcting.
function normalizeLegacySide(){
  allTrades.forEach(t=>{
    if(t.side===undefined||t.side===null)return;
    t.dir=t.side==='SELL'?'SHORT':'LONG';
    delete t.side;
    saveTradeFB(t);
  });
}
