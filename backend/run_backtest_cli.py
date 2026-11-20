"""
CLI Runner to execute Backtests across multiple VN tickers and display detailed stats.
"""

import sys
from data_provider import fetch_ohlcv
from backtester import BacktestConfig, run_backtest

SYMBOLS = ["VNINDEX", "FPT", "MWG", "HPG", "SSI", "VCB"]

def run_all():
    print("=" * 80)
    print("CHẠY BACKTEST HỆ THỐNG CHIẾN LƯỢC: CM_MACD_MTF + ADX_DI + WEIS_WAVE")
    print("Quy tắc TTCK VN: Vốn 100tr, Lô 100, T+2.5, Phí mua/bán 0.15%, Thuế bán 0.1%, Trượt giá 0.1%")
    print("Khớp lệnh: Giá Open nến T+1 (Zero Lookahead Bias), Cắt lỗ 7%, Chốt lời 20%")
    print("=" * 80)

    summary_rows = []

    for sym in SYMBOLS:
        df, origin = fetch_ohlcv(symbol=sym, start_date="2023-01-01", end_date="2026-11-01", interval="1D")
        cfg = BacktestConfig(
            initial_capital=100_000_000.0,
            buy_fee_rate=0.0015,
            sell_fee_rate=0.0015,
            sell_tax_rate=0.0010,
            slippage_rate=0.0010,
            enforce_t_plus_2=True,
            execution_mode="next_open",
            stop_loss_pct=0.07,
            take_profit_pct=0.20,
            exit_mode="macd_or_di",
            use_macd=True,
            use_adx=True,
            use_weis_wave=True,
        )
        try:
            res = run_backtest(df, cfg)
            m = res["metrics"]
            trades = res["trades"]
            summary_rows.append({
                "symbol": sym,
                "data_origin": origin,
                "bars": len(df),
                "total_return_pct": m["total_return_pct"],
                "buy_hold_return_pct": m["buy_hold_return_pct"],
                "final_equity": m["final_equity"],
                "max_drawdown_pct": m["max_drawdown_pct"],
                "total_trades": m["total_trades"],
                "win_rate_pct": m["win_rate_pct"],
                "profit_factor": m["profit_factor"],
                "sharpe_ratio": m["sharpe_ratio"],
                "latest_trade": trades[-1] if trades else None,
            })
            print(f"\n[+] Mã: {sym:<8} | Nguồn: {origin:<15} | Số nến: {len(df)}")
            print(f"    Lợi nhuận CL: {m['total_return_pct']:>+6.2f}% | Buy&Hold: {m['buy_hold_return_pct']:>+6.2f}% | Vốn cuối: {m['final_equity']:,.0f} VND")
            print(f"    Max DD: -{m['max_drawdown_pct']:.2f}% | Sharpe: {m['sharpe_ratio']:.2f} | Profit Factor: {m['profit_factor']:.2f}")
            print(f"    Số lệnh: {m['total_trades']:2d} | Tỷ lệ thắng (Win Rate): {m['win_rate_pct']:.1f}%")
            if trades:
                print("    3 lệnh gần nhất:")
                for t in trades[-3:]:
                    print(f"      - {t['entry_date']} -> {t['exit_date']} | Khối lượng: {t['shares']} CP | Lãi/Lỗ: {t['pnl_pct']:>+6.2f}% | Lý do: {t['exit_reason']}")
        except Exception as e:
            print(f"[-] Lỗi mã {sym}: {e}")

    print("\n" + "=" * 80)
    print("TỔNG KẾT BẢNG SO SÁNH HIỆU SUẤT:")
    print(f"{'Mã':<8} | {'LN Chiến Lược':<14} | {'Buy & Hold':<12} | {'Vốn Cuối (VND)':<16} | {'Max DD':<8} | {'Win Rate':<9} | {'Lệnh'}")
    print("-" * 80)
    for r in summary_rows:
        print(f"{r['symbol']:<8} | {r['total_return_pct']:>+12.2f}% | {r['buy_hold_return_pct']:>+10.2f}% | {r['final_equity']:>16,.0f} | {r['max_drawdown_pct']:>6.2f}% | {r['win_rate_pct']:>7.1f}% | {r['total_trades']:>4}")
    print("=" * 80)

if __name__ == "__main__":
    run_all()
