// ── INFO TOOLTIPS ──────────────────────────────────────────────────────────
// Add data-info="key" to any element and an (i) icon is appended automatically.
// t = title, d = description, f = formula / how it is calculated (optional)
const INFO = {
  // dashboard
  netPnl:{t:'Net P&L',d:'Your total profit or loss after charges (brokerage, taxes, fees) across every trade in the current profile.',f:'Σ (gross P&L − charges)'},
  winRate:{t:'Win Rate',d:'The share of trades that closed in profit. Breakeven trades do not count as wins. A high win rate alone is not enough — it must be paired with a healthy payoff ratio (see Expectancy).',f:'winning trades ÷ total trades'},
  avgR:{t:'Average R',d:'Average R-multiple: how many times your initial risk you make or lose per trade. +1R means you made exactly what you risked; −1R means you lost the full risk. Only trades that have a stop loss entered are counted.',f:'net P&L ÷ (|entry − stop loss| × qty)'},
  profitFactor:{t:'Profit Factor',d:'How much you win for every ₹/$1 you lose. Above 1.0 is profitable, 1.5+ is solid, 2.0+ is excellent. Shows “—” until you have at least one losing trade.',f:'gross profit ÷ gross loss'},
  equityCurve:{t:'Equity Curve',d:'Running total of your net P&L, trade by trade. A steadily rising line with shallow dips suggests consistency; sharp drops point to losing streaks or oversized losses.'},
  winLoss:{t:'Win / Loss',d:'How many trades were winners (▲), losers (▼) and breakeven (—).'},
  heatmap:{t:'Activity Heatmap',d:'Calendar of your trading days. Green = net profit that day, red = net loss. Click a day to list its trades; Shift-click selects a range; Ctrl/Cmd-click adds or removes single days.'},
  // analytics (existing)
  byStrategy:{t:'P&L by Strategy',d:'Net P&L grouped by the strategy name on each trade. Trades with no strategy are grouped under “Other”. Shows which setups actually pay you.'},
  byDow:{t:'P&L by Day of Week',d:'Net P&L grouped by weekday. Useful for spotting days where you consistently lose and might skip trading.'},
  byMonth:{t:'P&L by Month',d:'Net P&L for each calendar month (bars) with the number of trades (line). Tap a bar to open that month in the Trade Log.'},
  cumPnl:{t:'Cumulative P&L',d:'Cumulative net P&L over time, trade by trade, with timestamps. Same data as the equity curve on the dashboard.'},
  // psychology
  emotionDist:{t:'Emotion Distribution',d:'How often you logged each emotional state when taking trades.'},
  emotionPnl:{t:'Emotion vs P&L',d:'Net P&L grouped by the emotion you logged. Shows which mental states make or lose you money.'},
  insights:{t:'Insights',d:'Automatic observations from your emotion data: best and worst state, and how many revenge trades you took.'},
  // table / form
  pnlCol:{t:'P&L (net)',d:'Trade profit or loss after charges. Hover a value to see gross P&L and the charges deducted.',f:'gross P&L − charges'},
  rrCol:{t:'R:R (Risk : Reward)',d:'Potential reward divided by risk. 2.00 means you stand to make twice what you risk if the target is hit before the stop.',f:'|target − entry| ÷ |entry − stop loss|'},
  fees:{t:'Charges & Fees',d:'Brokerage, STT/taxes, exchange and other fees for this trade. “Auto” estimates them from the rates in js/config.js; type your own amount to override (e.g. from your contract note).'},
  // new performance metrics
  performance:{t:'Performance Metrics',d:'Statistics calculated on net P&L (after charges) for the current profile. Sections: edge (is the system profitable per trade), risk (drawdowns) and streaks / extremes.'},
  startCapital:{t:'Starting Capital',d:'Optional. Enter your account size to also show drawdown and returns as a percentage of capital. Stored on this device only, per profile.'},
  expectancy:{t:'Expectancy',d:'The average amount you make (or lose) per trade, after charges. Positive expectancy means your approach has a statistical edge over many trades.',f:'avg win × win% − avg loss × loss%  (= net P&L ÷ trades)'},
  avgWin:{t:'Average Win',d:'Average profit of your winning trades (net of charges).'},
  avgLoss:{t:'Average Loss',d:'Average loss of your losing trades (net of charges, shown as a positive size).'},
  payoff:{t:'Payoff Ratio',d:'Average win divided by average loss. With a 40% win rate you need a payoff above 1.5 just to break even. Shows “—” until you have a losing trade.',f:'avg win ÷ avg loss'},
  beWin:{t:'Break-even Win Rate',d:'The win rate you need to break even at your current payoff ratio. If your actual win rate is above this number you have a positive edge; below it you are losing money over time.',f:'1 ÷ (1 + payoff ratio)'},
  maxDD:{t:'Max Drawdown',d:'The largest peak-to-trough fall in your equity curve — your worst losing stretch so far. Ask yourself whether you could sit through it again without breaking your rules.',f:'max (running peak equity − current equity)'},
  curDD:{t:'Current Drawdown',d:'How far your equity is below its all-time high right now. “At high” means you are at a new equity peak.',f:'peak equity − current equity'},
  ddDuration:{t:'Longest Drawdown',d:'The longest time, in calendar days, between an equity high and the next new high. “Ongoing” means you are still underwater from the last peak.'},
  recovery:{t:'Recovery Factor',d:'Net profit divided by max drawdown: how many times your profit covers your worst drawdown. Higher is better; above 2–3 is generally considered good.',f:'net P&L ÷ max drawdown'},
  returnCap:{t:'Return on Capital',d:'Net P&L as a percentage of the starting capital you entered.',f:'net P&L ÷ starting capital'},
  bestTrade:{t:'Best Trade',d:'Your single most profitable trade (net).'},
  worstTrade:{t:'Worst Trade',d:'Your single biggest losing trade (net). Compare it with your average loss — a much larger number suggests a stop-loss was ignored.'},
  bestDay:{t:'Best Day',d:'Your most profitable calendar day — all trades on that date added together.'},
  worstDay:{t:'Worst Day',d:'Your worst calendar day — all trades on that date added together.'},
  winStreak:{t:'Max Win Streak',d:'Longest run of consecutive winning trades. Breakeven trades neither extend nor break a streak.'},
  lossStreak:{t:'Max Loss Streak',d:'Longest run of consecutive losing trades. Size your risk so this streak cannot hurt you badly. Breakeven trades neither extend nor break a streak.'},
  curStreak:{t:'Current Streak',d:'Your current run of consecutive wins (W) or losses (L), counted from your most recent trades.'},
  greenDays:{t:'Green Days',d:'Share of trading days that ended in profit, with all trades on a date summed together.',f:'profitable days ÷ trading days'},
  ddChart:{t:'Drawdown (Underwater Curve)',d:'How far below its previous high your equity sits after every trade. 0 means a new high; deeper valleys mean bigger drawdowns, and a long flat stretch below 0 means a slow recovery.'}
};

let _tipEl=null,_tipFor=null;
function _tip(){
  if(!_tipEl){_tipEl=document.createElement('div');_tipEl.id='infoTip';_tipEl.setAttribute('role','tooltip');document.body.appendChild(_tipEl);}
  return _tipEl;
}
function showInfo(icon){
  const d=INFO[icon.dataset.key]; if(!d) return;
  const el=_tip(); el.textContent='';
  const t=document.createElement('div');t.className='tt';t.textContent=d.t;
  const p=document.createElement('div');p.className='td';p.textContent=d.d;
  el.append(t,p);
  if(d.f){const f=document.createElement('div');f.className='tf';f.textContent=d.f;el.append(f);}
  el.style.display='block';el.style.left='0px';el.style.top='0px';
  const r=icon.getBoundingClientRect(),tw=el.offsetWidth,th=el.offsetHeight;
  const left=Math.min(Math.max(8,r.left+r.width/2-tw/2),window.innerWidth-tw-8);
  let top=r.bottom+8; if(top+th>window.innerHeight-8) top=Math.max(8,r.top-th-8);
  el.style.left=left+'px';el.style.top=top+'px';
  _tipFor=icon;
}
function hideInfo(){if(_tipEl)_tipEl.style.display='none';_tipFor=null;}
function injectInfoIcons(root){
  (root||document).querySelectorAll('[data-info]').forEach(el=>{
    const k=el.dataset.info; if(!INFO[k]) return;
    if(Array.from(el.children).some(c=>c.classList.contains('info-i'))) return;
    const i=document.createElement('span');
    i.className='info-i';i.dataset.key=k;i.tabIndex=0;i.setAttribute('role','button');
    i.setAttribute('aria-label','What is '+INFO[k].t+'?');i.textContent='i';
    el.appendChild(i);
  });
}
(function(){
  const icon=e=>e.target&&e.target.closest?e.target.closest('.info-i'):null;
  const touchOnly=()=>window.matchMedia&&window.matchMedia('(hover: none)').matches;
  document.addEventListener('mouseover',e=>{const i=icon(e);if(i)showInfo(i);});
  document.addEventListener('mouseout',e=>{const i=icon(e);if(i&&!i.contains(e.relatedTarget))hideInfo();});
  document.addEventListener('focusin',e=>{const i=icon(e);if(i)showInfo(i);});
  document.addEventListener('focusout',e=>{if(icon(e))hideInfo();});
  document.addEventListener('click',e=>{
    const i=icon(e);
    if(i){e.preventDefault();e.stopPropagation();(touchOnly()&&_tipFor===i)?hideInfo():showInfo(i);}
    else hideInfo();
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape')hideInfo();
    if((e.key==='Enter'||e.key===' ')&&icon(e)){e.preventDefault();showInfo(icon(e));}
  });
  window.addEventListener('scroll',hideInfo,true);
})();
