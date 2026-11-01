// ── LIVE PRICE & SYMBOL SEARCH ────────────────────────────────────────────
const wlPriceCache = {}; // id → {price, change, changePct, currency}
let symSearchTimer = null;

// Map common NSE symbols/indices to Yahoo Finance tickers
const NSE_MAP = {
  'NIFTY':'%5ENSEI','NIFTY50':'%5ENSEI','BANKNIFTY':'%5ENSEBANK',
  'SENSEX':'%5EBSESN','NIFTYMIDCAP':'%5ENSMIDCP',
  'NIFTYNEXT50':'%5ENSMIDCP50','NIFTYIT':'%5ECNXIT',
  'USDINR':'INR%3DX','EURINR':'EURINR%3DX',
  'BTC':'BTC-USD','ETH':'ETH-USD','SOL':'SOL-USD',
  'BNB':'BNB-USD','XRP':'XRP-USD','DOGE':'DOGE-USD',
};

function yfSymbol(sym){
  const upper = sym.toUpperCase();
  if(NSE_MAP[upper]) return NSE_MAP[upper];
  // crypto detection
  if(['BTC','ETH','SOL','BNB','XRP','DOGE','ADA','MATIC','AVAX','DOT'].some(c=>upper.startsWith(c))) return upper+'-USD';
  // Indian stock — append .NS
  return upper+'.NS';
}

function buildLtpHtml(data, entry, dir){
  const {price, changePct, currency} = data;
  const changeClass = changePct >= 0 ? 'up' : 'down';
  const changeSign  = changePct >= 0 ? '+' : '';
  let toEntryHtml = '';
  if(entry && price){
    const diff = ((entry - price) / price) * 100;
    const absDiff = Math.abs(diff).toFixed(1);
    if(dir==='LONG'){
      if(price >= entry) toEntryHtml = `<span class="wl-to-entry above">Above entry +${((price-entry)/entry*100).toFixed(1)}%</span>`;
      else toEntryHtml = `<span class="wl-to-entry ${absDiff<=2?'near':'far'}">${absDiff}% to entry</span>`;
    } else {
      if(price <= entry) toEntryHtml = `<span class="wl-to-entry above">Below entry ${((entry-price)/entry*100).toFixed(1)}%</span>`;
      else toEntryHtml = `<span class="wl-to-entry ${absDiff<=2?'near':'far'}">${absDiff}% to entry</span>`;
    }
  }
  const sym = currency==='INR'?'₹':'$';
  return `<div class="wl-price-live">
    <div class="wl-ltp">${sym}${Number(price).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
    <div class="wl-ltp-change ${changeClass}">${changeSign}${changePct?.toFixed(2)}%</div>
    ${toEntryHtml}
  </div>`;
}

// ── LIVE PRICE ENGINE ─────────────────────────────────────────────────────
// For NSE stocks: deploy free API from https://github.com/0xramm/Indian-Stock-Market-API
// on Render.com (free) and paste your URL below.
// For crypto: CoinGecko (free, no key, works from browser)

// (NSE_API_BASE now lives in js/config.js)

const CRYPTO_IDS = {
  'BTC':'bitcoin','ETH':'ethereum','SOL':'solana','BNB':'binancecoin',
  'XRP':'ripple','DOGE':'dogecoin','ADA':'cardano','MATIC':'matic-network',
  'AVAX':'avalanche-2','DOT':'polkadot','LINK':'chainlink','LTC':'litecoin',
  'UNI':'uniswap','ATOM':'cosmos','TRX':'tron'
};
function isCrypto(sym){ return !!CRYPTO_IDS[sym.toUpperCase()]; }

async function fetchPrice(setupId){
  const s = allSetups.find(x=>x.id===setupId); if(!s) return;
  const el = document.getElementById('lp_'+setupId);
  if(el) el.innerHTML = `<span style="font-size:11px;color:var(--muted)">Loading...</span>`;
  const sym = s.sym.toUpperCase();
  try{
    let priceData;
    if(isCrypto(sym)){
      // CoinGecko — free, no key, proper CORS
      const cgId = CRYPTO_IDS[sym];
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true`,
        {signal: AbortSignal.timeout(8000)}
      );
      const data = await res.json();
      const coin = data[cgId];
      if(!coin) throw new Error('Coin not found');
      priceData = {price: coin.usd, changePct: coin.usd_24h_change, currency:'USD'};
    } else {
      // NSE/BSE via self-hosted API
      if(NSE_API_BASE.includes('YOUR-APP')){
        throw new Error('NSE API not configured. Deploy from github.com/0xramm/Indian-Stock-Market-API on Render.com and update NSE_API_BASE in index.html');
      }
      const res = await fetch(
        `${NSE_API_BASE}/stock?symbol=${sym}&res=num`,
        {signal: AbortSignal.timeout(8000)}
      );
      const data = await res.json();
      if(data.status !== 'success') throw new Error(data.message||'API error');
      priceData = {
        price: data.data.last_price,
        changePct: data.data.percent_change,
        currency: 'INR'
      };
    }
    wlPriceCache['lp_'+setupId] = {...priceData, ts:Date.now()};
    if(el) el.innerHTML = buildLtpHtml(priceData, s.entry, s.dir);
  } catch(e){
    const msg = e.message.includes('NSE_API_BASE') ? '⚙ Setup needed' : '⟳ Retry';
    const title = e.message.replace(/"/g,"'");
    if(el) el.innerHTML = `<span class="wl-fetch-btn" onclick="event.stopPropagation();fetchPrice('${setupId}')" title="${title}">${msg}</span>`;
  }
}

function fetchAllPrices(){
  getSetups().forEach((s,i) => setTimeout(()=>fetchPrice(s.id), i*300));
}

// Symbol search
async function searchWlSymbol(query){
  const res = document.getElementById('wlSymResults');
  if(!query || query.length < 2){ res.classList.remove('open'); return; }
  clearTimeout(symSearchTimer);
  symSearchTimer = setTimeout(async ()=>{
    res.innerHTML = `<div class="sym-result-item" style="color:var(--muted)">Searching...</div>`;
    res.classList.add('open');
    const upper = query.toUpperCase();
    // Crypto matches (instant, no API)
    const cryptoMatches = Object.keys(CRYPTO_IDS).filter(k=>k.startsWith(upper));
    // Try NSE search API
    let stockRows = '';
    try{
      if(!NSE_API_BASE.includes('YOUR-APP')){
        const data = await (await fetch(`${NSE_API_BASE}/search?query=${encodeURIComponent(query)}`, {signal:AbortSignal.timeout(5000)})).json();
        const results = (data.results||[]).slice(0,8);
        stockRows = results.map(r=>{
          const sym = r.symbol; const name = (r.company_name||'').replace(/['"]/g,'');
          return `<div class="sym-result-item" onclick="selectWlSym('${sym}','${name}')">
            <div><span class="wl-sym-ticker">${sym}</span><div class="sym-result-name">${name}</div></div>
            <span style="font-size:10px;color:var(--muted);background:var(--surface3);padding:1px 5px;border-radius:3px">NSE</span>
          </div>`;
        }).join('');
      }
    } catch(e){ /* fallback below */ }
    // Common NSE fallback list
    if(!stockRows){
      const common = ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','WIPRO','ITC','NIFTY','BANKNIFTY','LTIM','HINDUNILVR','BAJFINANCE','AXISBANK','MARUTI','TATAMOTORS','ADANIENT','NESTLEIND','ASIANPAINT','SUNPHARMA'];
      stockRows = common.filter(s=>s.includes(upper)).map(s=>
        `<div class="sym-result-item" onclick="selectWlSym('${s}','${s}')">
          <span class="wl-sym-ticker">${s}</span>
          <span style="font-size:10px;color:var(--muted)">NSE</span>
        </div>`
      ).join('');
    }
    const cryptoRows = cryptoMatches.map(k=>
      `<div class="sym-result-item" onclick="selectWlSym('${k}','${k}')">
        <span class="wl-sym-ticker" style="color:var(--accent2)">${k}</span>
        <span style="font-size:10px;color:var(--accent2)">Crypto</span>
      </div>`
    ).join('');
    const combined = cryptoRows + stockRows;
    res.innerHTML = combined ||
      `<div class="sym-result-item" style="color:var(--muted)">No match. Type exact symbol e.g. RELIANCE, ITC, BTC</div>`;
  }, 300);
}

function selectWlSym(sym, name){
  document.getElementById('wl_sym').value = sym.toUpperCase();
  document.getElementById('wl_yf_sym').value = sym.toUpperCase();
  document.getElementById('wlSymResults').classList.remove('open');
}

// Close search on outside click
document.addEventListener('click', e=>{
  const wrap = document.querySelector('.sym-search-wrap');
  if(wrap && !wrap.contains(e.target)) document.getElementById('wlSymResults')?.classList.remove('open');
});

// Store yfSym when saving setup
