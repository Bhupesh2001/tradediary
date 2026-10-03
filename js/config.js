// ── USER CONFIG — edit these two values ─────────────────────────────────────
// Cloudflare Worker URL that forwards AI requests to Anthropic (keeps your key off the client)
const AI_PROXY = 'https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev';
// Render.com URL of your Indian-Stock-Market-API deployment (NSE/BSE prices)
const NSE_API_BASE = 'https://YOUR-APP.onrender.com';

// ── CHARGES (editable) — percentages are in %, verify against your broker contract note ──
// Defaults follow Zerodha (STT as per Budget 2026-27, effective 1 Apr 2026). Change if your broker differs.
const FEE_RATES = {
  gst: 18,        // % on (brokerage + exchange txn + SEBI)
  sebi: 0.0001,   // % of turnover (Rs 10 per crore)
  INR: {
    intraday: { label:'Equity intraday', brokerage:{type:'min',flat:20,pct:0.03}, sttBuy:0,    sttSell:0.025, txn:0.00297, stamp:0.003 },
    delivery: { label:'Equity delivery', brokerage:{type:'none'},                 sttBuy:0.1,  sttSell:0.1,   txn:0.00297, stamp:0.015 },
    futures:  { label:'Futures',         brokerage:{type:'min',flat:20,pct:0.03}, sttBuy:0,    sttSell:0.05,  txn:0.00173, stamp:0.002 },
    options:  { label:'Options',         brokerage:{type:'flat',flat:20},         sttBuy:0,    sttSell:0.15,  txn:0.03503, stamp:0.003 },
    none:     { label:'No charges' }
  },
  USD: { defaultRate: 0.05 }   // % per side (e.g. Binance futures taker 0.05%, maker 0.02%)
};
