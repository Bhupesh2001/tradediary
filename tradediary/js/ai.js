// ── AI ─────────────────────────────────────────────────────────────────────
function setAiPrompt(txt){document.getElementById('aiPrompt').value=txt;}
async function runAI(){
  const prompt=document.getElementById('aiPrompt').value.trim();if(!prompt)return;
  const out=document.getElementById('aiOutput');
  out.innerHTML='<span class="ai-thinking">Analysing...</span><span class="ai-cursor"></span>';
  const trades=getTrades(),t=getTotals(trades),s=CS();
  const summary=JSON.stringify(trades.map(x=>({sym:x.sym,date:x.date,dir:x.dir,strat:x.strat,pnl:x.pnl,fees:x.fees||0,emotion:x.emotion,leverage:x.leverage})));
  const sys=`You are a professional trading coach. Profile: ${currentProfile==='INR'?'Indian Stock Trader (INR)':'Crypto Trader (USD)'}. Trades (pnl is NET of fees):\n${summary}\nStats: ${t.total} trades, ${t.winRate}% win rate, Net P&L: ${s}${t.pnl}, PF: ${t.pf}, R: ${t.avgR}.\nGive 3-5 sentences of specific, actionable insight referencing actual trade data.`;
  try{
    const res=await fetch(AI_PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:sys,prompt})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data=await res.json();
    out.innerHTML=escHtml(data.content?.[0]?.text||'No response.').replace(/\n/g,'<br>');
  }catch(e){out.innerHTML='<span style="color:var(--danger)">Error connecting to AI. Check AI_PROXY in js/config.js.</span>';}
}

