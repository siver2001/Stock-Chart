"""
Exact Python implementations of 3 TradingView open-source indicators:
1. MacD Custom Indicator - Multiple Time Frame (ChrisMoody)
2. ADX and DI (BeikabuOyaji)
3. Weis Wave Volume (LazyBear)

All functions operate on a pandas DataFrame with columns:
['timestamp', 'open', 'high', 'low', 'close', 'volume']
sorted ascending by timestamp.
"""

from typing import Optional
import numpy as np
import pandas as pd


def calc_ema(series: pd.Series, length: int) -> pd.Series:
    """Standard TradingView ta.ema (adjust=False)."""
    return series.ewm(span=length, adjust=False, min_periods=length).mean()


def calc_sma(series: pd.Series, length: int) -> pd.Series:
    """Standard TradingView ta.sma."""
    return series.rolling(window=length, min_periods=length).mean()


def compute_cm_macd_mtf(
    df: pd.DataFrame,
    fast_length: int = 12,
    slow_length: int = 26,
    signal_length: int = 9,
    mtf_rule: Optional[str] = None,
    no_lookahead: bool = True,
) -> pd.DataFrame:
    """
    ChrisMoody's MacD Custom Indicator - Multiple Time Frame.
    Key exact detail: Signal line uses SMA (not EMA), matching ChrisMoody's Pine Script.
    If mtf_rule is provided (e.g., 'W', '4h', '1D'), resamples OHLCV to higher timeframe.
    When no_lookahead=True, shifts higher-TF output by 1 completed bar before forward-filling
    so backtests never peek into future intrabar data.
    """
    out = pd.DataFrame(index=df.index)

    def _core_macd(close: pd.Series) -> pd.DataFrame:
        fast_ma = calc_ema(close, fast_length)
        slow_ma = calc_ema(close, slow_length)
        macd = fast_ma - slow_ma
        signal = calc_sma(macd, signal_length)
        hist = macd - signal
        return pd.DataFrame({"macd": macd, "signal": signal, "hist": hist}, index=close.index)

    if mtf_rule:
        dt_index = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
        temp = pd.DataFrame({"close": df["close"].values}, index=dt_index)
        htf_close = temp["close"].resample(mtf_rule).last().dropna()
        htf_macd = _core_macd(htf_close)
        if no_lookahead:
            htf_macd = htf_macd.shift(1)
        aligned = htf_macd.reindex(dt_index, method="ffill")
        out["cm_macd"] = aligned["macd"].values
        out["cm_signal"] = aligned["signal"].values
        out["cm_hist"] = aligned["hist"].values
    else:
        core = _core_macd(df["close"])
        out["cm_macd"] = core["macd"]
        out["cm_signal"] = core["signal"]
        out["cm_hist"] = core["hist"]

    prev_hist = out["cm_hist"].shift(1)
    # 4-color histogram classification (exact ChrisMoody logic)
    # 1: histA_IsUp (hist > 0 and rising)
    # 2: histA_IsDown (hist > 0 and falling)
    # 3: histB_IsDown (hist <= 0 and falling)
    # 4: histB_IsUp (hist <= 0 and rising)
    conds = [
        (out["cm_hist"] > 0) & (out["cm_hist"] > prev_hist),
        (out["cm_hist"] > 0) & (out["cm_hist"] <= prev_hist),
        (out["cm_hist"] <= 0) & (out["cm_hist"] < prev_hist),
        (out["cm_hist"] <= 0) & (out["cm_hist"] >= prev_hist),
    ]
    out["cm_hist_state"] = np.select(conds, [1, 2, 3, 4], default=0)

    # Cross signals: +1 bullish cross, -1 bearish cross, 0 none
    prev_macd = out["cm_macd"].shift(1)
    prev_sig = out["cm_signal"].shift(1)
    bull_cross = (prev_macd <= prev_sig) & (out["cm_macd"] > out["cm_signal"])
    bear_cross = (prev_macd >= prev_sig) & (out["cm_macd"] < out["cm_signal"])
    out["cm_cross"] = np.where(bull_cross, 1, np.where(bear_cross, -1, 0))

    return out


def compute_adx_di_beikabu(
    df: pd.DataFrame,
    length: int = 14,
) -> pd.DataFrame:
    """
    BeikabuOyaji's 'ADX and DI' indicator.
    Exact Pine Script formula:
      - Smoothed TR, +DM, -DM use Wilder's recursive smoothing:
        S[i] = S[i-1] - S[i-1]/len + X[i]
      - ADX uses SMA(DX, len) instead of RMA(DX, len).
    """
    high = df["high"].to_numpy(dtype=float)
    low = df["low"].to_numpy(dtype=float)
    close = df["close"].to_numpy(dtype=float)
    n = len(df)

    tr = np.zeros(n, dtype=float)
    dm_plus = np.zeros(n, dtype=float)
    dm_minus = np.zeros(n, dtype=float)

    for i in range(n):
        if i == 0:
            tr[i] = high[i] - low[i]
            dm_plus[i] = 0.0
            dm_minus[i] = 0.0
        else:
            tr[i] = max(
                high[i] - low[i],
                abs(high[i] - close[i - 1]),
                abs(low[i] - close[i - 1]),
            )
            up_move = high[i] - high[i - 1]
            down_move = low[i - 1] - low[i]
            dm_plus[i] = up_move if (up_move > down_move and up_move > 0) else 0.0
            dm_minus[i] = down_move if (down_move > up_move and down_move > 0) else 0.0

    s_tr = np.zeros(n, dtype=float)
    s_dmp = np.zeros(n, dtype=float)
    s_dmm = np.zeros(n, dtype=float)

    for i in range(n):
        if i == 0:
            s_tr[i] = tr[i]
            s_dmp[i] = dm_plus[i]
            s_dmm[i] = dm_minus[i]
        else:
            s_tr[i] = s_tr[i - 1] - (s_tr[i - 1] / length) + tr[i]
            s_dmp[i] = s_dmp[i - 1] - (s_dmp[i - 1] / length) + dm_plus[i]
            s_dmm[i] = s_dmm[i - 1] - (s_dmm[i - 1] / length) + dm_minus[i]

    with np.errstate(divide="ignore", invalid="ignore"):
        di_plus = np.where(s_tr > 0, (s_dmp / s_tr) * 100.0, 0.0)
        di_minus = np.where(s_tr > 0, (s_dmm / s_tr) * 100.0, 0.0)
        di_sum = di_plus + di_minus
        dx = np.where(di_sum > 0, (np.abs(di_plus - di_minus) / di_sum) * 100.0, 0.0)

    adx = pd.Series(dx, index=df.index).rolling(window=length, min_periods=length).mean()

    return pd.DataFrame(
        {
            "di_plus": di_plus,
            "di_minus": di_minus,
            "adx": adx.values,
        },
        index=df.index,
    )


def compute_weis_wave_volume(
    df: pd.DataFrame,
    trend_detection_length: int = 2,
    show_distribution_below_zero: bool = False,
) -> pd.DataFrame:
    """
    LazyBear's 'Weis Wave Volume' indicator.
    Exact Pine Script state machine:
      mov = close > close[1] ? 1 : close < close[1] ? -1 : 0
      trend = (mov != 0) and (mov != mov[1]) ? mov : nz(trend[1])
      isTrending = rising(close, trendDetectionLength) or falling(close, trendDetectionLength)
      wave = (trend != nz(wave[1])) and isTrending ? trend : nz(wave[1])
      vol = wave == wave[1] ? (nz(vol[1]) + volume) : volume
    """
    close = df["close"].to_numpy(dtype=float)
    volume = df["volume"].to_numpy(dtype=float)
    n = len(df)

    mov = np.zeros(n, dtype=int)
    trend = np.zeros(n, dtype=int)
    wave = np.zeros(n, dtype=int)
    cum_vol = np.zeros(n, dtype=float)
    up_vol = np.zeros(n, dtype=float)
    dn_vol = np.zeros(n, dtype=float)

    L = max(1, int(trend_detection_length))

    for i in range(n):
        if i == 0:
            mov[i] = 0
            trend[i] = 0
            wave[i] = 1
            cum_vol[i] = volume[i]
        else:
            if close[i] > close[i - 1]:
                mov[i] = 1
            elif close[i] < close[i - 1]:
                mov[i] = -1
            else:
                mov[i] = 0

            if mov[i] != 0 and mov[i] != mov[i - 1]:
                trend[i] = mov[i]
            else:
                trend[i] = trend[i - 1]

            # TradingView rising(close, L): close[i] > max(close[i-1], ..., close[i-L])
            # TradingView falling(close, L): close[i] < min(close[i-1], ..., close[i-L])
            is_trending = False
            if i >= L:
                window = close[i - L : i]
                if close[i] > np.max(window) or close[i] < np.min(window):
                    is_trending = True

            if trend[i] != 0 and trend[i] != wave[i - 1] and is_trending:
                wave[i] = trend[i]
            else:
                wave[i] = wave[i - 1]

            if wave[i] == wave[i - 1]:
                cum_vol[i] = cum_vol[i - 1] + volume[i]
            else:
                cum_vol[i] = volume[i]

        if wave[i] == 1:
            up_vol[i] = cum_vol[i]
            dn_vol[i] = 0.0
        else:
            up_vol[i] = 0.0
            dn_vol[i] = -cum_vol[i] if show_distribution_below_zero else cum_vol[i]

    return pd.DataFrame(
        {
            "ww_wave": wave,
            "ww_vol": cum_vol,
            "ww_up": up_vol,
            "ww_dn": dn_vol,
        },
        index=df.index,
    )


def compute_supertrend(
    df: pd.DataFrame,
    period: int = 10,
    multiplier: float = 3.0,
) -> pd.DataFrame:
    """
    SuperTrend Indicator (Olivier Seban).
    - Wilder RMA True Range (ATR)
    - Upper Band / Lower Band adjustment
    - Returns: supertrend_val, supertrend_trend (1=Bull, -1=Bear), supertrend_buy, supertrend_sell
    """
    n = len(df)
    high = df["high"].to_numpy(dtype=float)
    low = df["low"].to_numpy(dtype=float)
    close = df["close"].to_numpy(dtype=float)

    tr = np.zeros(n)
    tr[0] = high[0] - low[0]
    for i in range(1, n):
        tr[i] = max(high[i] - low[i], abs(high[i] - close[i - 1]), abs(low[i] - close[i - 1]))

    atr = np.zeros(n)
    if n >= period:
        atr[period - 1] = np.mean(tr[:period])
        for i in range(period, n):
            atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period

    upper_band = np.zeros(n)
    lower_band = np.zeros(n)
    trend = np.ones(n, dtype=int)

    for i in range(n):
        if i < period - 1:
            upper_band[i] = high[i]
            lower_band[i] = low[i]
            trend[i] = 1
            continue

        hl2 = (high[i] + low[i]) / 2.0
        basic_upper = hl2 + multiplier * atr[i]
        basic_lower = hl2 - multiplier * atr[i]

        prev_upper = upper_band[i - 1]
        prev_lower = lower_band[i - 1]
        prev_close = close[i - 1]
        prev_trend = trend[i - 1]

        if basic_upper < prev_upper or prev_close > prev_upper:
            curr_upper = basic_upper
        else:
            curr_upper = prev_upper

        if basic_lower > prev_lower or prev_close < prev_lower:
            curr_lower = basic_lower
        else:
            curr_lower = prev_lower

        if prev_trend == 1:
            curr_trend = -1 if close[i] < curr_lower else 1
        else:
            curr_trend = 1 if close[i] > curr_upper else -1

        upper_band[i] = curr_upper
        lower_band[i] = curr_lower
        trend[i] = curr_trend

    prev_trend_series = pd.Series(trend).shift(1).fillna(1).to_numpy(dtype=int)
    buy_signals = (trend == 1) & (prev_trend_series == -1)
    sell_signals = (trend == -1) & (prev_trend_series == 1)

    return pd.DataFrame(
        {
            "st_val": np.where(trend == 1, lower_band, upper_band),
            "st_trend": trend,
            "st_buy": buy_signals,
            "st_sell": sell_signals,
        },
        index=df.index,
    )


def compute_squeeze_momentum(
    df: pd.DataFrame,
    length: int = 20,
    bb_mult: float = 2.0,
    kc_mult: float = 1.5,
) -> pd.DataFrame:
    """
    Squeeze Momentum Indicator [LazyBear] (Top #1 TradingView)
    Bollinger Bands (length, bb_mult) vs Keltner Channels (length, kc_mult)
    Linear Regression Momentum of Delta = Close - (MidDonchian + SMA)/2
    """
    close = df["close"]
    high = df["high"]
    low = df["low"]
    n = len(df)

    # 1. Bollinger Bands
    basis = close.rolling(length, min_periods=length).mean()
    dev = close.rolling(length, min_periods=length).std(ddof=0)
    bb_upper = basis + bb_mult * dev
    bb_lower = basis - bb_mult * dev

    # 2. Keltner Channels using True Range
    prev_close = close.shift(1).fillna(close)
    tr = np.maximum(
        high - low,
        np.maximum(
            (high - prev_close).abs(),
            (low - prev_close).abs()
        )
    )
    tr_ma = pd.Series(tr, index=df.index).rolling(length, min_periods=length).mean()
    kc_upper = basis + kc_mult * tr_ma
    kc_lower = basis - kc_mult * tr_ma

    # Squeeze On: BB is inside KC
    squeeze_on = (bb_lower > kc_lower) & (bb_upper < kc_upper)

    # 3. Linear Regression Momentum
    highest_high = high.rolling(length, min_periods=length).max()
    lowest_low = low.rolling(length, min_periods=length).min()
    donchian_mid = (highest_high + lowest_low) / 2.0
    delta = close - (donchian_mid + basis) / 2.0

    # Weights for rolling linear regression endpoint:
    # linreg_val = intercept + slope * (length - 1)
    x = np.arange(length)
    sum_x = float(x.sum())
    sum_x2 = float((x ** 2).sum())
    denom = length * sum_x2 - sum_x ** 2
    weights = (1.0 / length) + ((length * x - sum_x) * (length - 1) / (2.0 * denom))

    delta_vals = delta.fillna(0).to_numpy(dtype=float)
    mom_vals = np.zeros(n, dtype=float)
    for i in range(length - 1, n):
        mom_vals[i] = np.dot(weights, delta_vals[i - length + 1 : i + 1])

    mom_series = pd.Series(mom_vals, index=df.index)
    mom_prev = mom_series.shift(1).fillna(0)

    # Color states:
    # 1: mom > 0 and rising (Strong Bull)
    # 2: mom > 0 and falling (Weakening Bull)
    # 3: mom < 0 and falling (Strong Bear)
    # 4: mom < 0 and rising (Weakening Bear)
    color_state = np.where(
        mom_series > 0,
        np.where(mom_series >= mom_prev, 1, 2),
        np.where(mom_series <= mom_prev, 3, 4)
    )

    sqz_arr = squeeze_on.to_numpy(dtype=bool)
    sqz_prev = np.roll(sqz_arr, 1)
    sqz_prev[0] = False
    sqz_fired = sqz_prev & (~sqz_arr)

    return pd.DataFrame(
        {
            "sqz_mom": mom_series,
            "sqz_on": sqz_arr,
            "sqz_fired": sqz_fired,
            "sqz_color": color_state,
        },
        index=df.index,
    )


def compute_wavetrend(
    df: pd.DataFrame,
    chlen: int = 10,
    avglen: int = 21,
    smalen: int = 4,
) -> pd.DataFrame:
    """
    WaveTrend Oscillator [LazyBear] (Top #3 TradingView)
    ap = (high + low + close) / 3
    esa = EMA(ap, chlen)
    d = EMA(abs(ap - esa), chlen)
    ci = (ap - esa) / (0.015 * d)
    wt1 = EMA(ci, avglen)
    wt2 = SMA(wt1, smalen)
    """
    ap = (df["high"] + df["low"] + df["close"]) / 3.0
    esa = ap.ewm(span=chlen, adjust=False).mean()
    d = (ap - esa).abs().ewm(span=chlen, adjust=False).mean()
    d_clean = d.replace(0, 1e-9)
    ci = (ap - esa) / (0.015 * d_clean)
    wt1 = ci.ewm(span=avglen, adjust=False).mean()
    wt2 = wt1.rolling(smalen, min_periods=smalen).mean()

    prev_wt1 = wt1.shift(1)
    prev_wt2 = wt2.shift(1)

    wt_buy = (prev_wt1 <= prev_wt2) & (wt1 > wt2) & (wt1 <= -50)
    wt_sell = (prev_wt1 >= prev_wt2) & (wt1 < wt2) & (wt1 >= 50)

    return pd.DataFrame(
        {
            "wt1": wt1,
            "wt2": wt2,
            "wt_buy": wt_buy.fillna(False),
            "wt_sell": wt_sell.fillna(False),
        },
        index=df.index,
    )


def attach_all_indicators(
    df: pd.DataFrame,
    macd_fast: int = 12,
    macd_slow: int = 26,
    macd_signal: int = 9,
    macd_mtf: Optional[str] = None,
    adx_length: int = 14,
    ww_trend_len: int = 2,
    ww_below_zero: bool = False,
    st_period: int = 10,
    st_mult: float = 3.0,
    sqz_length: int = 20,
    wt_chlen: int = 10,
    wt_avglen: int = 21,
) -> pd.DataFrame:
    """Compute and concatenate all indicators onto a copy of df."""
    res = df.copy().reset_index(drop=True)
    m = compute_cm_macd_mtf(res, macd_fast, macd_slow, macd_signal, macd_mtf, no_lookahead=True)
    a = compute_adx_di_beikabu(res, adx_length)
    w = compute_weis_wave_volume(res, ww_trend_len, ww_below_zero)
    st = compute_supertrend(res, st_period, st_mult)
    sqz = compute_squeeze_momentum(res, sqz_length)
    wt = compute_wavetrend(res, wt_chlen, wt_avglen)
    return pd.concat([res, m, a, w, st, sqz, wt], axis=1)
