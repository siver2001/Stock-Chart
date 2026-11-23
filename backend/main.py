"""
FastAPI Backend for VN Stock KLineChart Pro + Backtest Engine
Run: uvicorn main:app --reload --port 8000
"""

from typing import Optional
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from data_provider import search_symbols, fetch_ohlcv, fetch_live_quotes
from backtester import BacktestConfig, run_backtest

app = FastAPI(
    title="VN Stock KLineChart Pro API",
    version="1.0.0",
    description="Vietnam Stock OHLCV Datafeed + 3 Custom TradingView Indicators + Accurate Backtest Engine",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()


class BacktestRequest(BaseModel):
    symbol: str = Field(default="MWG", description="Mã cổ phiếu VN (VD: MWG, FPT, VCB)")
    start_date: str = Field(default="2023-01-01")
    end_date: str = Field(default="2026-11-01")
    interval: str = Field(default="1D")

    initial_capital: float = Field(default=100_000_000.0, gt=0)
    buy_fee_rate: float = Field(default=0.0015, ge=0, le=0.05)
    sell_fee_rate: float = Field(default=0.0015, ge=0, le=0.05)
    sell_tax_rate: float = Field(default=0.0010, ge=0, le=0.05)
    slippage_rate: float = Field(default=0.0010, ge=0, le=0.05)
    enforce_t_plus_2: bool = Field(default=True)
    execution_mode: str = Field(default="next_open")

    macd_fast: int = Field(default=12, ge=2)
    macd_slow: int = Field(default=26, ge=3)
    macd_signal: int = Field(default=9, ge=2)
    macd_mtf: Optional[str] = Field(default=None)
    adx_length: int = Field(default=14, ge=2)
    adx_threshold: float = Field(default=20.0, ge=0)
    ww_trend_len: int = Field(default=2, ge=1)
    st_period: int = Field(default=10, ge=1)
    st_mult: float = Field(default=3.0, ge=0.5)
    sqz_length: int = Field(default=20, ge=5)
    wt_chlen: int = Field(default=10, ge=2)
    wt_avglen: int = Field(default=21, ge=2)

    use_macd: bool = Field(default=True)
    use_adx: bool = Field(default=True)
    use_weis_wave: bool = Field(default=True)
    use_supertrend: bool = Field(default=False)
    use_squeeze: bool = Field(default=False)
    use_wavetrend: bool = Field(default=False)
    exit_mode: str = Field(default="macd_or_di")

    stop_loss_pct: float = Field(default=0.07, ge=0, le=0.5)
    take_profit_pct: float = Field(default=0.20, ge=0, le=5.0)


@router.get("/health")
def health():
    return {"status": "ok", "service": "vn-stock-klinechart-pro"}


@router.get("/symbols")
def get_symbols(q: str = Query(default="", description="Search ticker or company name")):
    """Returns symbol list matching SymbolInfo format of KLineChart Pro."""
    query_val = q if isinstance(q, str) else getattr(q, "default", "")
    return search_symbols(query_val)


@router.get("/history")
def get_history(
    symbol: str = Query(default="VNINDEX"),
    interval: str = Query(default="1D"),
    from_time: Optional[int] = Query(default=None, alias="from"),
    to_time: Optional[int] = Query(default=None, alias="to"),
):
    """
    Returns historical OHLCV data array in KLineData format:
    [{ "timestamp": 1728432000000, "open": ..., "high": ..., "low": ..., "close": ..., "volume": ... }]
    """
    try:
        from datetime import datetime
        sym_str = symbol if isinstance(symbol, str) else getattr(symbol, "default", "VNINDEX")
        int_str = interval if isinstance(interval, str) else getattr(interval, "default", "1D")
        f_val = from_time if isinstance(from_time, (int, float)) else getattr(from_time, "default", None)
        t_val = to_time if isinstance(to_time, (int, float)) else getattr(to_time, "default", None)

        start_date = None
        end_date = None
        if f_val:
            sec = f_val / 1000.0 if f_val > 10_000_000_000 else float(f_val)
            start_date = datetime.fromtimestamp(sec).strftime("%Y-%m-%d")
        if t_val:
            sec = t_val / 1000.0 if t_val > 10_000_000_000 else float(t_val)
            end_date = datetime.fromtimestamp(sec).strftime("%Y-%m-%d")

        df, _ = fetch_ohlcv(symbol=sym_str, start_date=start_date, end_date=end_date, interval=int_str)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest")
def get_latest(
    symbol: str = Query(default="VNINDEX"),
    interval: str = Query(default="1D"),
):
    """
    Returns the latest OHLCV bar for polling in intraday / real-time updates.
    Includes reference price (yesterday's close) and accurate day change / pct_change.
    """
    try:
        from datetime import datetime, timedelta
        sym_str = (symbol if isinstance(symbol, str) else getattr(symbol, "default", "VNINDEX")).strip().upper()
        int_str = (interval if isinstance(interval, str) else getattr(interval, "default", "1D")).strip()

        # If daily resolution, use the ultra-fast synchronized quote fetcher
        if int_str.upper() in ("1D", "D", "2D", "3D"):
            q_map = fetch_live_quotes([sym_str])
            if sym_str in q_map:
                q = q_map[sym_str]
                return {
                    "timestamp": q["timestamp"],
                    "open": q["open"],
                    "high": q["high"],
                    "low": q["low"],
                    "close": q["close"],
                    "volume": q["volume"],
                    "ref_price": q["ref_price"],
                    "change": q["change"],
                    "pct_change": q["pct_change"],
                }

        # For intraday (1m, 5m, 1h...), fetch only recent 2 days to stay lightning fast
        start_date = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
        df, _ = fetch_ohlcv(symbol=sym_str, interval=int_str, start_date=start_date)
        if df.empty:
            df, _ = fetch_ohlcv(symbol=sym_str, interval=int_str)
        if df.empty:
            raise HTTPException(status_code=404, detail="No bar available")

        last_bar = df.iloc[-1].to_dict()
        c = float(last_bar.get("close", 0.0))
        o = float(last_bar.get("open", c))

        ref_price = o
        if len(df) >= 2:
            prev_bar = df.iloc[-2].to_dict()
            ref_price = float(prev_bar.get("close", o))

        diff = c - ref_price
        pct = (diff / ref_price * 100.0) if ref_price != 0 else 0.0

        last_bar["ref_price"] = ref_price
        last_bar["change"] = round(diff, 2)
        last_bar["pct_change"] = round(pct, 2)
        return last_bar
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quotes")
def get_quotes(symbols: str = Query(default="VNINDEX,VN30,FPT,HPG,VCB,SSI,MWG,TCB")):
    """
    Returns latest price, open, high, low, volume, change, and pct_change
    relative to reference price (yesterday's close) for multiple symbols in parallel.
    Ultra-fast (<0.8s) and synchronized across all watchlist tickers.
    """
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not sym_list:
        return {}
    return fetch_live_quotes(sym_list)


@router.get("/klines")
def get_klines(
    symbol: str = Query(default="MWG"),
    interval: str = Query(default="1D"),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
):
    try:
        df, origin = fetch_ohlcv(symbol=symbol, start_date=start_date, end_date=end_date, interval=interval)
        records = df.to_dict(orient="records")
        return {
            "symbol": symbol.upper(),
            "interval": interval,
            "data_origin": origin,
            "count": len(records),
            "data": records,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backtest")
def post_backtest(req: BacktestRequest):
    try:
        df, origin = fetch_ohlcv(
            symbol=req.symbol,
            start_date=req.start_date,
            end_date=req.end_date,
            interval=req.interval,
        )
        cfg = BacktestConfig(
            initial_capital=req.initial_capital,
            buy_fee_rate=req.buy_fee_rate,
            sell_fee_rate=req.sell_fee_rate,
            sell_tax_rate=req.sell_tax_rate,
            slippage_rate=req.slippage_rate,
            enforce_t_plus_2=req.enforce_t_plus_2,
            execution_mode=req.execution_mode,
            macd_fast=req.macd_fast,
            macd_slow=req.macd_slow,
            macd_signal=req.macd_signal,
            macd_mtf=req.macd_mtf or None,
            adx_length=req.adx_length,
            adx_threshold=req.adx_threshold,
            ww_trend_len=req.ww_trend_len,
            st_period=req.st_period,
            st_mult=req.st_mult,
            sqz_length=req.sqz_length,
            wt_chlen=req.wt_chlen,
            wt_avglen=req.wt_avglen,
            use_macd=req.use_macd,
            use_adx=req.use_adx,
            use_weis_wave=req.use_weis_wave,
            use_supertrend=req.use_supertrend,
            use_squeeze=req.use_squeeze,
            use_wavetrend=req.use_wavetrend,
            exit_mode=req.exit_mode,
            stop_loss_pct=req.stop_loss_pct,
            take_profit_pct=req.take_profit_pct,
        )
        result = run_backtest(df, cfg)
        result["symbol"] = req.symbol.upper()
        result["interval"] = req.interval
        result["data_origin"] = origin
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Include router both with prefix "/api" and at root level
app.include_router(router, prefix="/api")
app.include_router(router)


@app.get("/")
def root():
    return {"status": "ok", "service": "vn-stock-klinechart-pro", "version": "1.0.0"}
