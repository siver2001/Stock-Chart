"""
Automated verification tests for:
1. ChrisMoody MACD MTF (SMA signal, 4-color hist, no-lookahead MTF)
2. BeikabuOyaji ADX & DI (Wilder smoothing + SMA(DX))
3. LazyBear Weis Wave Volume (wave detection + cumulative volume)
4. Vietnam Stock Backtester (lot size 100, T+2.5 rule, fees/tax, zero lookahead)
"""

import numpy as np
import pandas as pd
from data_provider import generate_demo_ohlcv
from indicators import (
    compute_cm_macd_mtf,
    compute_adx_di_beikabu,
    compute_weis_wave_volume,
)
from backtester import BacktestConfig, run_backtest


def test_cm_macd_uses_sma_signal():
    df = generate_demo_ohlcv("MWG", "2023-01-01", "2025-12-31", "1D")
    res = compute_cm_macd_mtf(df, 12, 26, 9)
    # Manually verify signal is SMA(macd, 9)
    expected_sig = res["cm_macd"].rolling(9, min_periods=9).mean()
    valid = ~expected_sig.isna()
    assert np.allclose(res.loc[valid, "cm_signal"], expected_sig[valid], atol=1e-9), "Signal must be SMA(9)!"
    # Verify histogram = macd - signal
    assert np.allclose(res.loc[valid, "cm_hist"], res.loc[valid, "cm_macd"] - res.loc[valid, "cm_signal"], atol=1e-9)
    # Verify 4-color states exist
    states = set(res["cm_hist_state"].dropna().unique())
    assert {1, 2, 3, 4}.issubset(states), f"Expected all 4 hist states, got {states}"
    # Verify MTF works without crashing
    mtf_res = compute_cm_macd_mtf(df, 12, 26, 9, mtf_rule="W", no_lookahead=True)
    assert len(mtf_res) == len(df)
    print("[PASS] CM MACD MTF (SMA signal, 4-color hist, weekly MTF)")


def test_adx_di_beikabu_uses_sma_dx():
    df = generate_demo_ohlcv("FPT", "2023-01-01", "2025-12-31", "1D")
    res = compute_adx_di_beikabu(df, length=14)
    assert (res["di_plus"] >= 0).all() and (res["di_minus"] >= 0).all()
    valid_adx = res["adx"].dropna()
    assert (valid_adx >= 0).all() and (valid_adx <= 100).all()
    # Verify ADX is SMA of DX
    dx = np.where((res["di_plus"] + res["di_minus"]) > 0,
                  np.abs(res["di_plus"] - res["di_minus"]) / (res["di_plus"] + res["di_minus"]) * 100.0,
                  0.0)
    expected_adx = pd.Series(dx).rolling(14, min_periods=14).mean()
    valid = ~expected_adx.isna()
    assert np.allclose(res.loc[valid, "adx"], expected_adx[valid], atol=1e-9), "ADX must be SMA(DX, 14)!"
    print("[PASS] ADX and DI BeikabuOyaji (Wilder DI + SMA ADX)")


def test_weis_wave_volume():
    df = generate_demo_ohlcv("HPG", "2023-01-01", "2025-12-31", "1D")
    res = compute_weis_wave_volume(df, trend_detection_length=2, show_distribution_below_zero=True)
    assert set(res["ww_wave"].unique()).issubset({-1, 1})
    # When wave == 1, ww_up > 0 and ww_dn == 0; when wave == -1, ww_dn <= 0 and ww_up == 0
    up_mask = res["ww_wave"] == 1
    dn_mask = res["ww_wave"] == -1
    assert (res.loc[up_mask, "ww_up"] >= 0).all() and (res.loc[up_mask, "ww_dn"] == 0).all()
    assert (res.loc[dn_mask, "ww_dn"] <= 0).all() and (res.loc[dn_mask, "ww_up"] == 0).all()
    # Cumulative property: if wave[i] == wave[i-1], ww_vol[i] == ww_vol[i-1] + volume[i]
    for i in range(1, len(df)):
        if res["ww_wave"].iloc[i] == res["ww_wave"].iloc[i - 1]:
            assert abs(res["ww_vol"].iloc[i] - (res["ww_vol"].iloc[i - 1] + df["volume"].iloc[i])) < 1e-6
    print("[PASS] Weis Wave Volume LazyBear (wave state machine + cumulative volume)")


def test_backtester_vn_rules_and_no_lookahead():
    df = generate_demo_ohlcv("MWG", "2023-01-01", "2026-06-01", "1D")
    cfg = BacktestConfig(
        initial_capital=100_000_000,
        enforce_t_plus_2=True,
        execution_mode="next_open",
        stop_loss_pct=0.07,
        take_profit_pct=0.20,
    )
    res = run_backtest(df, cfg)
    m = res["metrics"]
    assert m["total_trades"] > 0, "Expected at least 1 trade on 3.5-year demo data"
    for t in res["trades"]:
        assert t["shares"] % 100 == 0 and t["shares"] > 0, "Lot size must be multiple of 100!"
        assert t["holding_bars"] >= 2, f"T+2.5 violated! holding_bars={t['holding_bars']}"
        assert t["fees_and_tax"] > 0, "Fees and tax must be positive!"

    # Zero-lookahead sanity check: truncating future bars must not change earlier trades
    cutoff = len(df) - 100
    res_trunc = run_backtest(df.iloc[:cutoff].copy(), cfg)
    cutoff_ts = int(df["timestamp"].iloc[cutoff - 1])
    full_earlier_trades = [t for t in res["trades"] if t["exit_time"] < cutoff_ts]
    trunc_earlier_trades = [t for t in res_trunc["trades"] if t["exit_time"] < cutoff_ts]
    assert full_earlier_trades == trunc_earlier_trades, "Lookahead bias detected!"

    print(f"[PASS] Backtester VN Rules & Zero Lookahead | Trades={m['total_trades']} | Return={m['total_return_pct']}% | MaxDD={m['max_drawdown_pct']}% | WinRate={m['win_rate_pct']}%")


if __name__ == "__main__":
    test_cm_macd_uses_sma_signal()
    test_adx_di_beikabu_uses_sma_dx()
    test_weis_wave_volume()
    test_backtester_vn_rules_and_no_lookahead()
    print("\nALL TESTS PASSED SUCCESSFULLY!")
