"""
Vietnam Stock Market Backtest Engine
Designed for accuracy and realism:
- ZERO lookahead bias: signals computed on bar i close execute at bar i+1 Open (default)
- Vietnam stock market rules:
  * Lot size = 100 shares
  * T+2.5 settlement enforcement (cannot sell until >= 2 trading bars after buy on 1D)
  * Buy fee (default 0.15%), Sell fee (default 0.15%), Sell PIT tax (default 0.10%)
  * Slippage (default 0.10%)
- Realistic Stop-Loss & Take-Profit checked against bar Open/Low/High
- Full performance metrics + Benchmark (Buy & Hold) comparison + Equity Curve + Trade Log
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
import math
import numpy as np
import pandas as pd

from indicators import attach_all_indicators


@dataclass
class BacktestConfig:
    initial_capital: float = 100_000_000.0  # 100 triệu VND
    lot_size: int = 100
    buy_fee_rate: float = 0.0015            # 0.15%
    sell_fee_rate: float = 0.0015           # 0.15%
    sell_tax_rate: float = 0.0010           # 0.10% thuế TNCN bán CK
    slippage_rate: float = 0.0010           # 0.10% trượt giá
    enforce_t_plus_2: bool = True           # Quy định T+2.5 TTCK Việt Nam (khung ngày)
    execution_mode: str = "next_open"       # "next_open" (chuẩn không lookahead) hoặc "same_close"

    # Indicator parameters
    macd_fast: int = 12
    macd_slow: int = 26
    macd_signal: int = 9
    macd_mtf: Optional[str] = None          # e.g., None, "W"
    adx_length: int = 14
    adx_threshold: float = 20.0
    ww_trend_len: int = 2
    st_period: int = 10
    st_mult: float = 3.0
    sqz_length: int = 20
    wt_chlen: int = 10
    wt_avglen: int = 21

    # Strategy toggles
    use_macd: bool = True
    use_adx: bool = True
    use_weis_wave: bool = True
    use_supertrend: bool = False
    use_squeeze: bool = False
    use_wavetrend: bool = False
    exit_mode: str = "macd_or_di"           # "macd_cross", "macd_or_di", "any_bearish", "supertrend", "squeeze", "wavetrend"

    # Risk management (0 = disabled)
    stop_loss_pct: float = 0.07             # 7% cắt lỗ
    take_profit_pct: float = 0.20           # 20% chốt lời


def run_backtest(raw_df: pd.DataFrame, config: BacktestConfig) -> Dict[str, Any]:
    if raw_df is None or len(raw_df) < 40:
        raise ValueError("Cần tối thiểu 40 cây nến để chạy backtest chính xác.")

    df = attach_all_indicators(
        raw_df,
        macd_fast=config.macd_fast,
        macd_slow=config.macd_slow,
        macd_signal=config.macd_signal,
        macd_mtf=config.macd_mtf,
        adx_length=config.adx_length,
        ww_trend_len=config.ww_trend_len,
        st_period=config.st_period,
        st_mult=config.st_mult,
        sqz_length=config.sqz_length,
        wt_chlen=config.wt_chlen,
        wt_avglen=config.wt_avglen,
    )

    n = len(df)
    ts = df["timestamp"].to_numpy(dtype=np.int64)
    opens = df["open"].to_numpy(dtype=float)
    highs = df["high"].to_numpy(dtype=float)
    lows = df["low"].to_numpy(dtype=float)
    closes = df["close"].to_numpy(dtype=float)

    cm_macd = df["cm_macd"].to_numpy(dtype=float)
    cm_signal = df["cm_signal"].to_numpy(dtype=float)
    cm_hist = df["cm_hist"].to_numpy(dtype=float)
    di_plus = df["di_plus"].to_numpy(dtype=float)
    di_minus = df["di_minus"].to_numpy(dtype=float)
    adx = df["adx"].to_numpy(dtype=float)
    ww_wave = df["ww_wave"].to_numpy(dtype=int)
    st_trend = df["st_trend"].to_numpy(dtype=int)
    st_buy = df["st_buy"].to_numpy(dtype=bool)
    st_sell = df["st_sell"].to_numpy(dtype=bool)
    sqz_mom = df["sqz_mom"].to_numpy(dtype=float)
    sqz_color = df["sqz_color"].to_numpy(dtype=int)
    wt1 = df["wt1"].to_numpy(dtype=float)
    wt2 = df["wt2"].to_numpy(dtype=float)

    cash = float(config.initial_capital)
    shares = 0
    entry_price = 0.0
    entry_bar = -1
    entry_ts = 0
    entry_fee = 0.0

    pending_buy = False
    pending_sell = False
    pending_sell_reason = ""

    trades: List[Dict[str, Any]] = []
    equity_curve: List[Dict[str, Any]] = []

    warmup = max(config.macd_slow + config.macd_signal, config.adx_length * 2, config.sqz_length + 5, 35)
    min_hold_bars = 2 if config.enforce_t_plus_2 else 0

    def _execute_buy(bar_idx: int, raw_price: float):
        nonlocal cash, shares, entry_price, entry_bar, entry_ts, entry_fee
        exec_price = raw_price * (1.0 + config.slippage_rate)
        if exec_price <= 0:
            return
        scale = 1000.0 if raw_price < 500.0 else 1.0
        cost_per_share = (exec_price * scale) * (1.0 + config.buy_fee_rate)
        max_lots = int(cash // (cost_per_share * config.lot_size))
        qty = max_lots * config.lot_size
        if qty <= 0:
            return
        gross = qty * (exec_price * scale)
        fee = gross * config.buy_fee_rate
        cash -= (gross + fee)
        shares = qty
        entry_price = exec_price
        entry_bar = bar_idx
        entry_ts = int(ts[bar_idx])
        entry_fee = fee

    def _execute_sell(bar_idx: int, raw_price: float, reason: str):
        nonlocal cash, shares, entry_price, entry_bar, entry_ts, entry_fee
        if shares <= 0:
            return
        exec_price = raw_price * (1.0 - config.slippage_rate)
        scale = 1000.0 if raw_price < 500.0 else 1.0
        gross_sell = shares * (exec_price * scale)
        sell_fee = gross_sell * config.sell_fee_rate
        sell_tax = gross_sell * config.sell_tax_rate
        net_proceeds = gross_sell - sell_fee - sell_tax

        buy_cost = shares * (entry_price * scale) + entry_fee
        net_pnl = net_proceeds - buy_cost
        pnl_pct = (net_pnl / buy_cost) * 100.0 if buy_cost > 0 else 0.0

        cash += net_proceeds
        trades.append({
            "entry_time": entry_ts,
            "exit_time": int(ts[bar_idx]),
            "entry_date": pd.to_datetime(entry_ts, unit="ms").strftime("%Y-%m-%d"),
            "exit_date": pd.to_datetime(int(ts[bar_idx]), unit="ms").strftime("%Y-%m-%d"),
            "shares": int(shares),
            "entry_price": round(entry_price, 2),
            "exit_price": round(exec_price, 2),
            "fees_and_tax": round(entry_fee + sell_fee + sell_tax, 0),
            "net_pnl": round(net_pnl, 0),
            "pnl_pct": round(pnl_pct, 2),
            "holding_bars": int(bar_idx - entry_bar),
            "exit_reason": reason,
        })
        shares = 0
        entry_price = 0.0
        entry_bar = -1
        entry_ts = 0
        entry_fee = 0.0

    for i in range(n):
        # 1. Execute pending orders from previous bar close at TODAY'S OPEN (zero lookahead!)
        if config.execution_mode == "next_open":
            if pending_sell and shares > 0 and (i - entry_bar) >= min_hold_bars:
                _execute_sell(i, opens[i], pending_sell_reason)
                pending_sell = False
                pending_sell_reason = ""
            elif pending_buy and shares == 0:
                _execute_buy(i, opens[i])
                pending_buy = False

        # 2. Check intrabar Stop-Loss / Take-Profit if holding & eligible to sell (T+2.5)
        if shares > 0 and (i - entry_bar) >= min_hold_bars:
            sl_price = entry_price * (1.0 - config.stop_loss_pct) if config.stop_loss_pct > 0 else 0.0
            tp_price = entry_price * (1.0 + config.take_profit_pct) if config.take_profit_pct > 0 else float("inf")

            if sl_price > 0 and lows[i] <= sl_price:
                # If gapped down below SL at open, fill at open; otherwise fill at SL
                fill_p = min(opens[i], sl_price)
                _execute_sell(i, fill_p, "Stop Loss")
                pending_sell = False
            elif tp_price < float("inf") and highs[i] >= tp_price:
                fill_p = max(opens[i], tp_price)
                _execute_sell(i, fill_p, "Take Profit")
                pending_sell = False

        # 3. Record end-of-bar equity
        scale = 1000.0 if closes[i] < 500.0 else 1.0
        mtm_equity = cash + shares * closes[i] * scale
        equity_curve.append({
            "timestamp": int(ts[i]),
            "date": pd.to_datetime(int(ts[i]), unit="ms").strftime("%Y-%m-%d"),
            "equity": round(mtm_equity, 0),
            "close": round(float(closes[i]), 2),
        })

        # 4. Evaluate indicator signals at bar i close (only after warmup)
        if i < warmup:
            continue
        if np.isnan(cm_macd[i]) or np.isnan(cm_signal[i]) or np.isnan(adx[i]):
            continue

        # Entry conditions
        cond_macd_bull = (cm_macd[i] > cm_signal[i]) and (cm_hist[i] >= cm_hist[i - 1])
        cond_adx_bull = (di_plus[i] > di_minus[i]) and (adx[i] >= config.adx_threshold)
        cond_ww_bull = (ww_wave[i] == 1)
        cond_st_bull = (st_trend[i] == 1)
        cond_sqz_bull = (sqz_mom[i] > 0) and (sqz_color[i] == 1)
        cond_wt_bull = (wt1[i] > wt2[i]) and (wt1[i] <= 0)

        buy_signal = True
        if config.use_supertrend:
            buy_signal = buy_signal and cond_st_bull
        if config.use_squeeze:
            buy_signal = buy_signal and cond_sqz_bull
        if config.use_wavetrend:
            buy_signal = buy_signal and cond_wt_bull
        if config.use_macd:
            buy_signal = buy_signal and cond_macd_bull
        if config.use_adx:
            buy_signal = buy_signal and cond_adx_bull
        if config.use_weis_wave:
            buy_signal = buy_signal and cond_ww_bull

        # Exit conditions
        macd_bear = cm_macd[i] < cm_signal[i]
        di_bear = di_minus[i] > di_plus[i]
        ww_bear = ww_wave[i] == -1
        st_bear = st_trend[i] == -1
        sqz_bear = (sqz_mom[i] < 0) or (sqz_color[i] == 2 and sqz_mom[i] > 0)
        wt_bear = (wt1[i] < wt2[i]) and (wt1[i] >= 40)

        sell_signal = False
        sell_reason = ""
        if config.exit_mode == "supertrend":
            if st_bear:
                sell_signal, sell_reason = True, "SuperTrend Bearish (Đảo chiều)"
            elif config.use_macd and macd_bear:
                sell_signal, sell_reason = True, "MACD Bearish Cross"
        elif config.exit_mode == "squeeze":
            if sqz_bear:
                sell_signal, sell_reason = True, "Squeeze Momentum Bearish (Suy yếu)"
            elif config.use_macd and macd_bear:
                sell_signal, sell_reason = True, "MACD Bearish Cross"
        elif config.exit_mode == "wavetrend":
            if wt_bear:
                sell_signal, sell_reason = True, "WaveTrend Death Cross (Quá mua)"
            elif config.use_macd and macd_bear:
                sell_signal, sell_reason = True, "MACD Bearish Cross"
        elif config.exit_mode == "macd_cross":
            if macd_bear:
                sell_signal, sell_reason = True, "MACD Bearish Cross"
        elif config.exit_mode == "any_bearish":
            if st_bear and config.use_supertrend:
                sell_signal, sell_reason = True, "SuperTrend Bearish"
            elif sqz_bear and config.use_squeeze:
                sell_signal, sell_reason = True, "Squeeze Momentum Bearish"
            elif wt_bear and config.use_wavetrend:
                sell_signal, sell_reason = True, "WaveTrend Death Cross"
            elif macd_bear:
                sell_signal, sell_reason = True, "MACD Bearish"
            elif di_bear:
                sell_signal, sell_reason = True, "DI- > DI+"
            elif ww_bear:
                sell_signal, sell_reason = True, "Weis Wave Down"
        else:  # macd_or_di (balanced default)
            if st_bear and config.use_supertrend:
                sell_signal, sell_reason = True, "SuperTrend Bearish"
            elif sqz_bear and config.use_squeeze:
                sell_signal, sell_reason = True, "Squeeze Momentum Bearish"
            elif wt_bear and config.use_wavetrend:
                sell_signal, sell_reason = True, "WaveTrend Death Cross"
            elif macd_bear:
                sell_signal, sell_reason = True, "MACD Bearish Cross"
            elif di_bear:
                sell_signal, sell_reason = True, "DI- > DI+"

        if shares == 0 and buy_signal:
            if config.execution_mode == "same_close":
                _execute_buy(i, closes[i])
                equity_curve[-1]["equity"] = round(cash + shares * closes[i], 0)
            else:
                pending_buy = True
                pending_sell = False
        elif shares > 0 and sell_signal:
            if config.execution_mode == "same_close":
                if (i - entry_bar) >= min_hold_bars:
                    _execute_sell(i, closes[i], sell_reason)
                    equity_curve[-1]["equity"] = round(cash, 0)
            else:
                pending_sell = True
                pending_sell_reason = sell_reason
                pending_buy = False

    # Close any open position at last bar close for clean reporting
    open_position = None
    if shares > 0:
        open_position = {
            "entry_date": pd.to_datetime(entry_ts, unit="ms").strftime("%Y-%m-%d"),
            "shares": int(shares),
            "entry_price": round(entry_price, 2),
            "current_price": round(float(closes[-1]), 2),
            "unrealized_pnl": round((closes[-1] - entry_price) * shares - entry_fee, 0),
        }

    # Performance Metrics
    eq_series = pd.Series([e["equity"] for e in equity_curve], dtype=float)
    final_equity = float(eq_series.iloc[-1])
    net_profit = final_equity - config.initial_capital
    total_return_pct = (net_profit / config.initial_capital) * 100.0

    # Buy & Hold Benchmark (from warmup bar to end)
    bh_start = closes[warmup] if warmup < n else closes[0]
    bh_end = closes[-1]
    buy_hold_return_pct = ((bh_end - bh_start) / bh_start) * 100.0 if bh_start > 0 else 0.0

    # Max Drawdown
    rolling_max = eq_series.cummax()
    drawdowns = (eq_series - rolling_max) / rolling_max
    max_drawdown_pct = abs(float(drawdowns.min())) * 100.0 if len(drawdowns) > 0 else 0.0

    # CAGR
    days_elapsed = max(1.0, (ts[-1] - ts[0]) / (1000.0 * 86400.0))
    years = days_elapsed / 365.25
    cagr_pct = ((final_equity / config.initial_capital) ** (1.0 / years) - 1.0) * 100.0 if years > 0.05 and final_equity > 0 else total_return_pct

    # Daily Returns & Sharpe Ratio (annualized, Rf = 0)
    daily_ret = eq_series.pct_change().dropna()
    sharpe = 0.0
    if len(daily_ret) > 1 and daily_ret.std() > 0:
        sharpe = float((daily_ret.mean() / daily_ret.std()) * math.sqrt(252))

    # Trade stats
    total_trades = len(trades)
    wins = [t for t in trades if t["net_pnl"] > 0]
    losses = [t for t in trades if t["net_pnl"] <= 0]
    win_rate_pct = (len(wins) / total_trades * 100.0) if total_trades > 0 else 0.0
    gross_profit = sum(t["net_pnl"] for t in wins)
    gross_loss = abs(sum(t["net_pnl"] for t in losses))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (99.99 if gross_profit > 0 else 0.0)
    avg_win_pct = float(np.mean([t["pnl_pct"] for t in wins])) if wins else 0.0
    avg_loss_pct = float(np.mean([t["pnl_pct"] for t in losses])) if losses else 0.0

    return {
        "config": asdict(config),
        "metrics": {
            "initial_capital": round(config.initial_capital, 0),
            "final_equity": round(final_equity, 0),
            "net_profit": round(net_profit, 0),
            "total_return_pct": round(total_return_pct, 2),
            "buy_hold_return_pct": round(buy_hold_return_pct, 2),
            "cagr_pct": round(cagr_pct, 2),
            "max_drawdown_pct": round(max_drawdown_pct, 2),
            "sharpe_ratio": round(sharpe, 2),
            "total_trades": total_trades,
            "win_rate_pct": round(win_rate_pct, 2),
            "profit_factor": round(profit_factor, 2),
            "avg_win_pct": round(avg_win_pct, 2),
            "avg_loss_pct": round(avg_loss_pct, 2),
        },
        "open_position": open_position,
        "trades": trades,
        "equity_curve": equity_curve,
    }
