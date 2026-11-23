// Entry B — hold-lock bot for make.fun btc-race-24h-20261123-0511.
// Strategy (fixed spec): buy on the first tradable bar with all cash,
// sell everything at +2% over the entry fill price, rebuy with all cash
// on a -0.8% dip from the last sell fill price, repeat. No stop-loss,
// no trailing stop. Long only, CBBTC, 1-minute bars, $1,000 starting
// capital. All price comparisons use exact bigint arithmetic.

import { runBars } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const SLIPPAGE_BPS = 100;

// Take-profit: close >= 102/100 * entry price (+2%).
const TP_NUM = 102n;
const TP_DEN = 100n;
// Rebuy dip: close <= 992/1000 * last sell price (-0.8%).
const DIP_NUM = 992n;
const DIP_DEN = 1000n;

type Phase =
  | 'initial'
  | 'awaiting-buy-fill'
  | 'holding'
  | 'awaiting-sell-fill'
  | 'waiting-dip';

let phase: Phase = 'initial';
let entryPrice: bigint | null = null;
let lastSellPrice: bigint | null = null;
let orderSeq = 0;

function nextClientId(): string {
  orderSeq += 1;
  return `b${orderSeq}`;
}

await runBars({
  onBatch(state, batch) {
    // 1. Fold in fills for orders decided on earlier bars. Fills arrive
    // in the batch right after the order was decided.
    for (const fill of batch.fills) {
      if (fill.symbol !== SYMBOL) continue;
      if (fill.status !== 'filled') {
        // Rejected: step back so the same action can be retried.
        if (fill.side === 'buy' && phase === 'awaiting-buy-fill') {
          phase =
            entryPrice === null && lastSellPrice === null
              ? 'initial'
              : 'waiting-dip';
        } else if (fill.side === 'sell' && phase === 'awaiting-sell-fill') {
          phase = 'holding';
        }
        continue;
      }
      if (fill.side === 'buy') {
        entryPrice = BigInt(fill.price);
        phase = 'holding';
      } else if (fill.side === 'sell') {
        lastSellPrice = BigInt(fill.price);
        entryPrice = null;
        phase = 'waiting-dip';
      }
    }

    // 2. Never trade during warm-up.
    if (state.warmingUp) return [];

    const close = state.close(SYMBOL);
    if (close === null) return [];

    // 3. First buy: first tradable batch, all cash, no price condition.
    if (phase === 'initial') {
      if (state.cash > 0n) {
        phase = 'awaiting-buy-fill';
        return [
          {
            side: 'buy',
            symbol: SYMBOL,
            notional_quote_units: state.cash,
            max_slippage_bps: SLIPPAGE_BPS,
            client_id: nextClientId(),
          },
        ];
      }
      return [];
    }

    // 4. Holding: sell the whole position at +2% over the entry fill.
    if (phase === 'holding' && entryPrice !== null) {
      const held = state.positions.get(SYMBOL);
      if (held === undefined || held.qty === 0n) {
        // Position gone without a sell fill we saw (e.g. harness
        // flattened it): fall back to waiting for a dip instead of
        // sitting in 'holding' forever with nothing to sell.
        phase = lastSellPrice !== null ? 'waiting-dip' : 'initial';
        entryPrice = null;
        return [];
      }
      if (close * TP_DEN >= entryPrice * TP_NUM) {
        // Provisional sell reference until the fill reports the real
        // price; the fill handler overwrites it on the next batch.
        lastSellPrice = close;
        phase = 'awaiting-sell-fill';
        return [
          {
            side: 'sell',
            symbol: SYMBOL,
            qty: held.qty,
            max_slippage_bps: SLIPPAGE_BPS,
            client_id: nextClientId(),
          },
        ];
      }
      return [];
    }

    // 5. After a sale: rebuy with all cash on a -0.8% dip from the last
    // sell fill price, then the same +2% sell rule applies again.
    if (phase === 'waiting-dip' && lastSellPrice !== null) {
      if (close * DIP_DEN <= lastSellPrice * DIP_NUM) {
        if (state.cash > 0n) {
          phase = 'awaiting-buy-fill';
          return [
            {
              side: 'buy',
              symbol: SYMBOL,
              notional_quote_units: state.cash,
              max_slippage_bps: SLIPPAGE_BPS,
              client_id: nextClientId(),
            },
          ];
        }
      }
      return [];
    }

    return [];
  },
});
