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
  heatmap:{t:'Activity Heatmap',d:'Calendar of your trading days. Switch between Daily and Monthly views (click a month to open its daily view) and choose whether each day / month shows its P&L directly or only on hover. Green = net profit, red = net loss. In the daily view click a day to list its trades; Shift-click selects a range; Ctrl/Cmd-click adds or removes single days.'},
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
  ddChart:{t:'Drawdown (Underwater Curve)',d:'How far below its previous high your equity sits after every trade. 0 means a new high; deeper valleys mean bigger drawdowns, and a long flat stretch below 0 means a slow recovery.'},
  // richer analytics
  todChart:{t:'P&L by Time of Day',d:'Net P&L grouped by the hour you entered the trade (uses the trade Time). Hover a bar for trade count and win rate. Trades logged without a time are excluded.'},
  symChart:{t:'P&L by Symbol',d:'Net P&L per symbol. With many symbols it shows your 8 best and 7 worst. Hover a bar for trade count and win rate.'},
  dirTable:{t:'Long vs Short',d:'Compares your long and short trades: win rate, net P&L, expectancy, average win/loss and profit factor. Shows whether you have an edge on one side only. Long = bought first, Short = sold first. For rising vs falling market performance see Bullish vs Bearish and Calls vs Puts.'},
  holdChart:{t:'P&L by Holding Time',d:'Net P&L grouped by how long you held the trade (Exit Time − Time). Needs both times on a trade. Shows whether quick scalps or longer holds pay better.'},
  holdAvg:{t:'Average Holding Time',d:'Average time between entry and exit across trades that have both times logged.'},
  holdWin:{t:'Winners: Average Hold',d:'Average holding time of your winning trades.'},
  holdLoss:{t:'Losers: Average Hold',d:'Average holding time of your losing trades. If this is much longer than winners, you may be holding losses hoping they recover.'},
  exitTime:{t:'Exit Time',d:'Optional. The time you exited the trade (same day). Used for holding-time analytics, and only works when the entry Time is filled too.'},
  // rules & goals
  rulesForm:{t:'My Trading Rules',d:'Personal limits for this profile (0 = off), synced to your account. Trades are checked against them automatically: breaches show in a banner on every page and mark trades with ⚑ in the log.'},
  ruleMaxLoss:{t:'Max Daily Loss',d:'Stop trading for the day once the day’s net P&L falls to this loss (enter a positive number). Any later trade that day is flagged.'},
  ruleMaxTrades:{t:'Max Trades per Day',d:'The most trades you allow yourself in a day. The next trade after the limit is flagged as over-trading.'},
  ruleMaxConsec:{t:'Max Consecutive Losses',d:'Stop for the day after this many losing trades in a row. Breakeven trades neither extend nor reset the run. Later trades are flagged.'},
  ruleMaxLossTrade:{t:'Max Loss per Trade',d:'The largest loss you accept on a single trade. A trade losing this much or more is flagged — usually a sign a stop-loss was ignored.'},
  ruleCooldown:{t:'Cooldown After a Loss',d:'Minimum minutes to wait after a loss before the next entry. Entering sooner is flagged as a quick re-entry. Uses the Time logged on trades.'},
  ruleTarget:{t:'Monthly Profit Target',d:'Your net profit goal for the current month. Progress shows on the Rules page and a banner appears when you reach it.'},
  ruleSizeUp:{t:'Flag Size-ups After a Loss',d:'Flags a trade whose position size is more than 1.5× the previous trade’s size right after a same-day loss — a classic revenge-trading pattern.'},
  rDaily:{t:'Daily P&L',d:'Today’s net P&L versus your max daily loss. The bar fills as you approach the limit: amber at 80%, red when reached.'},
  rTrades:{t:'Trades Today',d:'How many trades you have taken today versus your daily cap.'},
  rStreak:{t:'Loss Streak Today',d:'Current run of consecutive losing trades today versus your stop limit.'},
  rMonth:{t:'Monthly Target',d:'Net P&L so far this calendar month versus your monthly target.'},
  discipline:{t:'Discipline',d:'How well you follow your rules. A clean day has no rule-breaking trades and no daily-loss breach.'},
  cleanDays:{t:'Clean Days (30d)',d:'Share of your trading days in the last 30 days with no rule breaks.',f:'clean days ÷ trading days'},
  cleanStreak:{t:'Clean Streak',d:'Number of consecutive trading days, ending with your most recent day, with no rule breaks.'},
  brokeRules:{t:'Rule-breaking Trades',d:'Trades flagged with ⚑. Compare the P&L of trades that broke your rules with those that followed them — that gap is the cost of indiscipline.'},
  revenge:{t:'Revenge-trading Signals',d:'Signs of emotional trading: trades you tagged “revenge”, quick re-entries after a loss, and bigger positions right after a loss.'},
  revTag:{t:'Tagged Revenge',d:'Trades where you selected the “Revenge” emotion, with their combined net P&L.'},
  revQuick:{t:'Quick Re-entries',d:'Trades entered sooner than your cooldown after a same-day loss. Needs a cooldown rule and trade Times.'},
  revSize:{t:'Size-ups After a Loss',d:'Trades taken right after a loss with a position more than 1.5× the previous trade.'},
  afterLoss:{t:'Win Rate After a Loss',d:'Win rate of trades taken right after a same-day loss, compared with your overall win rate. A clearly lower number means you trade worse after losing.'},
  dirField:{t:'Direction',d:'Long = you bought first (profit when the price rises). Short = you sold first (profit when it falls). A bought option is Long whether it is a CE or a PE — use Analytics → Calls vs Puts and Bullish vs Bearish to compare how you do in rising and falling markets.'},
  importJson:{t:'Import Trades from JSON',d:'Paste a JSON list of completed trades produced by your broker AI. Direction is set automatically from the opening order (Buy first = Long, Sell first = Short). You then add emotion, stop loss, strategy and comments, review the P&L, and save. Trades already in your journal are detected and unticked.'},
  viewTable:{t:'Bullish vs Bearish Bets',d:'Compares trades by the market view they express, whatever the instrument. Bullish = profits when the market rises (long equity/futures, bought CE, sold PE). Bearish = profits when it falls (short equity/futures, bought PE, sold CE). Shows how you perform in rising vs falling markets.'},
  cepeTable:{t:'Calls (CE) vs Puts (PE)',d:'Options only: performance on Calls (CE) vs Puts (PE), whether bought or sold. Options are detected from the imported instrument or from a symbol ending in CE / PE.'},
  recentBreaks:{t:'Recent Rule Breaks',d:'Trades and days from the last 30 days that violated your rules, with the reason for each.'}
};

// "click to see the trades" hints
['byStrategy','byDow','byMonth','todChart','symChart','holdChart','emotionDist'].forEach(k=>{INFO[k].d+=' Click a bar to list the matching trades in a side panel.';});
INFO.emotionPnl.d+=' Click a row to list those trades.';
['dirTable','viewTable','cepeTable'].forEach(k=>{INFO[k].d+=' Click a column heading to list those trades.';});
['avgWin','avgLoss','bestTrade','worstTrade','bestDay','worstDay','maxDD','curDD','winStreak','lossStreak','curStreak','greenDays'].forEach(k=>{INFO[k].d+=' Click the card to list the related trades.';});

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
