// ── CHARGES & FEES ─────────────────────────────────────────────────────────
// Convention: trade.pnl is NET (gross − fees). Also stored: grossPnl, fees, feeSeg (INR) / feeRate (USD), feesManual.
// Older trades without `fees` are treated as fees = 0 (pnl == gross).
let feesManual = false;

function lsGet(k,d){try{return localStorage.getItem(k)||d}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function getFeeSeg(){return lsGet('td_fee_seg','intraday')}
function getFeeRate(){const v=parseFloat(lsGet('td_fee_rate_usd',''));return isNaN(v)?FEE_RATES.USD.defaultRate:v}
function feeDp(){return currentProfile==='USD'?4:2}

// Pure calculator. Returns {total, parts:{name:amount}} or null when inputs are incomplete.
function calcCharges({profile,dir,entry,exit,qty,seg,rate}){
  if(!(entry>0)||!(exit>0)||!(qty>0)) return null;
  const buyP=dir==='LONG'?entry:exit, sellP=dir==='LONG'?exit:entry;
  const buyV=buyP*qty, sellV=sellP*qty, turn=buyV+sellV;
  if(profile==='USD'){
    const fee=turn*(rate/100);
    return {total:fee,parts:{'Trading fee':fee}};
  }
  const r=FEE_RATES.INR[seg];
  if(!r||seg==='none') return {total:0,parts:{}};
  const b=r.brokerage;
  const brk=v=>b.type==='flat'?b.flat:b.type==='min'?Math.min(b.flat,v*b.pct/100):0;
  const brokerage=brk(buyV)+brk(sellV);
  const stt=buyV*r.sttBuy/100+sellV*r.sttSell/100;
  const txn=turn*r.txn/100;
  const sebi=turn*FEE_RATES.sebi/100;
  const stamp=buyV*r.stamp/100;
  const gst=(brokerage+txn+sebi)*FEE_RATES.gst/100;
  const total=brokerage+stt+txn+sebi+stamp+gst;
  return {total,parts:{Brokerage:brokerage,STT:stt,Exchange:txn,GST:gst,Stamp:stamp,SEBI:sebi}};
}

// Read qty + gross P&L from the open trade form (same rules as saveTrade)
function feeFormCore(){
  const g=id=>document.getElementById(id);
  const entry=parseFloat(g('f_entry').value), exit=parseFloat(g('f_exit').value), dir=g('f_dir').value;
  let qty;
  if(currentProfile==='USD'){
    const amount=parseFloat(g('f_amount').value)||0, lev=parseFloat(g('f_leverage').value)||1;
    qty=amount>0&&entry>0?(amount*lev/entry):(parseFloat(g('f_qty').value)||1);
  } else qty=parseFloat(g('f_qty').value)||1;
  const gross=(entry>0&&exit>0)?(dir==='LONG'?(exit-entry):(entry-exit))*qty:null;
  return {entry,exit,dir,qty,gross};
}

function recalcFees(){
  const g=id=>document.getElementById(id); if(!g('f_fees')) return;
  const core=feeFormCore();
  const seg=g('f_feeSeg').value, rate=parseFloat(g('f_feeRate').value);
  g('feeCur').textContent='('+CS()+')';
  const res=calcCharges({profile:currentProfile,dir:core.dir,entry:core.entry,exit:core.exit,qty:core.qty,seg,rate:isNaN(rate)?0:rate});
  if(!feesManual) g('f_fees').value=res?+res.total.toFixed(feeDp()):'';
  const s=CS(), dp=feeDp();
  if(feesManual) g('feeBreakdown').textContent='Manual amount — press Auto to recalculate';
  else if(res&&Object.keys(res.parts).length) g('feeBreakdown').textContent=Object.entries(res.parts).filter(([,v])=>v>0).map(([k,v])=>k+' '+s+v.toFixed(dp)).join(' · ');
  else g('feeBreakdown').textContent='';
  const fees=parseFloat(g('f_fees').value)||0;
  g('netPreview').textContent=core.gross===null?'':'Gross '+fmtPnl(core.gross)+'  −  charges '+s+fees.toFixed(dp)+'  =  Net '+fmtPnl(+(core.gross-fees).toFixed(dp));
}
function feesAuto(){feesManual=false;recalcFees();}

// Wire up form events (modal exists in DOM when this script runs)
(function(){
  const ov=document.getElementById('modalOverlay');
  const watch=['f_entry','f_exit','f_qty','f_amount','f_leverage','f_dir','f_feeSeg','f_feeRate'];
  ['input','change'].forEach(ev=>ov.addEventListener(ev,e=>{
    const id=e.target.id;
    if(id==='f_fees'){feesManual=true;recalcFees();return;}
    if(watch.includes(id)){
      if(id==='f_feeSeg') lsSet('td_fee_seg',e.target.value);
      if(id==='f_feeRate'&&!isNaN(parseFloat(e.target.value))) lsSet('td_fee_rate_usd',e.target.value);
      recalcFees();
    }
  }));
})();

// One-off: apply estimated charges to existing trades that have none recorded
function applyFeesToOldTrades(){
  const list=getTrades().filter(t=>t.fees===undefined);
  if(!list.length){alert('All trades in this profile already have charges recorded.');return;}
  let seg='intraday', rate=getFeeRate();
  if(currentProfile==='INR'){
    seg=(prompt('Charges for '+list.length+' older trades. Segment: intraday / delivery / futures / options','intraday')||'').trim().toLowerCase();
    if(!seg||seg==='none'||!FEE_RATES.INR[seg]){alert('Cancelled — enter one of: intraday, delivery, futures, options.');return;}
  } else if(!confirm('Apply '+rate+'% per side to '+list.length+' older trades?')) return;
  const dp=feeDp();
  list.forEach(t=>{
    const gross=t.pnl;
    const r=calcCharges({profile:currentProfile,dir:t.dir,entry:t.entry,exit:t.exit,qty:t.qty,seg,rate});
    const fees=r?+r.total.toFixed(dp):0;
    t.grossPnl=gross; t.fees=fees; t.feeSeg=currentProfile==='INR'?seg:null; t.feeRate=currentProfile==='USD'?rate:null; t.feesManual=false;
    t.pnl=+(gross-fees).toFixed(dp);
    saveTradeFB(t);
  });
  renderPage(currentPage);
  alert('Charges applied to '+list.length+' trades. You can fine-tune any trade via Edit.');
}
