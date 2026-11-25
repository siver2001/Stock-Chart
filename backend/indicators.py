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

    # Squeeze On: BB is inside KC; Squeeze Off: BB is outside KC
    squeeze_on = (bb_lower > kc_lower) & (bb_upper < kc_upper)
    squeeze_off = (bb_lower < kc_lower) & (bb_upper > kc_upper)

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
            "sqz_off": squeeze_off.to_numpy(dtype=bool),
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


def compute_extra_indicator_signals(df: pd.DataFrame, indicator_names: list) -> dict:
    """
    Compute (bull_mask, bear_mask) boolean numpy arrays for any of the 22+ TradingView
    sub-pane indicators requested in backtests (exact parity with frontend TradingView formulas).
    """
    if not indicator_names:
        return {}

    names = {str(x).strip().upper() for x in indicator_names if x}
    n = len(df)
    open_s = df["open"].astype(float)
    high_s = df["high"].astype(float)
    low_s = df["low"].astype(float)
    close_s = df["close"].astype(float)
    vol_s = df["volume"].astype(float).fillna(0.0)

    prev_close = close_s.shift(1).fillna(close_s)
    tr_s = np.maximum(
        high_s - low_s,
        np.maximum((high_s - prev_close).abs(), (low_s - prev_close).abs()),
    )

    signals = {}

    def _pack(bull_series, bear_series):
        return (
            pd.Series(bull_series, index=df.index).fillna(False).to_numpy(dtype=bool),
            pd.Series(bear_series, index=df.index).fillna(False).to_numpy(dtype=bool),
        )

    def _wilder_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        vals = series.to_numpy(dtype=float)
        rsi = np.full(len(vals), np.nan)
        avg_g, avg_l = 0.0, 0.0
        for i in range(1, len(vals)):
            diff = vals[i] - vals[i - 1]
            g = diff if diff > 0 else 0.0
            l = -diff if diff < 0 else 0.0
            if i <= period:
                avg_g += g
                avg_l += l
                if i == period:
                    avg_g /= period
                    avg_l /= period
                    rsi[i] = 100.0 if avg_l == 0 else 100.0 - 100.0 / (1.0 + avg_g / avg_l)
            else:
                avg_g = (avg_g * (period - 1) + g) / period
                avg_l = (avg_l * (period - 1) + l) / period
                rsi[i] = 100.0 if avg_l == 0 else 100.0 - 100.0 / (1.0 + avg_g / avg_l)
        return pd.Series(rsi, index=series.index)

    if "RSI" in names or "STOCH_RSI" in names:
        rsi14 = _wilder_rsi(close_s, 14)
        if "RSI" in names:
            signals["RSI"] = _pack(
                ((rsi14 > 50) & (rsi14 < 75)) | ((rsi14 > 30) & (rsi14.shift(1) <= 30)),
                ((rsi14 < 70) & (rsi14.shift(1) >= 70)) | (rsi14 < 45),
            )
        if "STOCH_RSI" in names:
            lo = rsi14.rolling(14, min_periods=14).min()
            hi = rsi14.rolling(14, min_periods=14).max()
            stoch = np.where((hi - lo) > 0, (rsi14 - lo) / (hi - lo) * 100.0, 50.0)
            k = pd.Series(stoch, index=df.index).rolling(3, min_periods=3).mean()
            d = k.rolling(3, min_periods=3).mean()
            signals["STOCH_RSI"] = _pack(
                (k > d) & (k < 80.0),
                (k < d) & (k > 35.0),
            )

    if "WILLIAMS_VIX_FIX" in names:
        max_c = close_s.rolling(22, min_periods=22).max()
        wvf = np.where(max_c > 0, (max_c - low_s) / max_c * 100.0, 0.0)
        wvf_s = pd.Series(wvf, index=df.index)
        mid = wvf_s.rolling(20, min_periods=20).mean()
        sd = wvf_s.rolling(20, min_periods=20).std(ddof=0)
        upper = mid + 2.0 * sd
        range_hi = wvf_s.rolling(50, min_periods=22).max() * 0.85
        is_bottom = (wvf_s >= upper) | (wvf_s >= range_hi)
        ema10 = calc_ema(close_s, 10)
        ema20 = calc_ema(close_s, 20)
        signals["WILLIAMS_VIX_FIX"] = _pack(
            is_bottom | (is_bottom.shift(1, fill_value=False) & (close_s >= close_s.shift(1))),
            (close_s < ema10) & (ema10 < ema10.shift(1)) & (close_s < ema20),
        )

    if "STC" in names:
        macd = calc_ema(close_s, 23) - calc_ema(close_s, 50)
        m_arr = macd.to_numpy(dtype=float)
        f1 = np.zeros(n)
        pf = np.zeros(n)
        f2 = np.zeros(n)
        pff = np.full(n, np.nan)
        length = 10
        factor = 0.5
        for i in range(length - 1, n):
            if np.isnan(m_arr[i]):
                continue
            win = m_arr[i - length + 1 : i + 1]
            win_valid = win[~np.isnan(win)]
            if len(win_valid) == 0:
                continue
            lo, hi = np.min(win_valid), np.max(win_valid)
            f1[i] = ((m_arr[i] - lo) / (hi - lo) * 100.0) if hi > lo else f1[i - 1]
            pf[i] = pf[i - 1] + factor * (f1[i] - pf[i - 1]) if i > 0 else f1[i]
            pf_win = pf[i - length + 1 : i + 1]
            lo2, hi2 = np.min(pf_win), np.max(pf_win)
            f2[i] = ((pf[i] - lo2) / (hi2 - lo2) * 100.0) if hi2 > lo2 else f2[i - 1]
            prev = f2[i] if np.isnan(pff[i - 1]) else pff[i - 1]
            pff[i] = prev + factor * (f2[i] - prev)
        stc_s = pd.Series(pff, index=df.index)
        signals["STC"] = _pack(
            (stc_s > 25.0) & (stc_s >= stc_s.shift(1)) & (stc_s < 85.0),
            (stc_s < 75.0) & (stc_s < stc_s.shift(1)),
        )

    if "CMF" in names:
        hl = (high_s - low_s).replace(0, np.nan)
        mfm = ((close_s - low_s) - (high_s - close_s)) / hl
        mfv = mfm.fillna(0.0) * vol_s
        cmf = mfv.rolling(20, min_periods=20).sum() / vol_s.rolling(20, min_periods=20).sum().replace(0, np.nan)
        signals["CMF"] = _pack(cmf > 0.0, cmf < 0.0)

    if "TSI" in names:
        pc = close_s - prev_close
        ds_pc = calc_ema(calc_ema(pc, 25), 13)
        ds_apc = calc_ema(calc_ema(pc.abs(), 25), 13).replace(0, np.nan)
        tsi = 100.0 * ds_pc / ds_apc
        tsi_sig = calc_ema(tsi, 13)
        signals["TSI"] = _pack(tsi > tsi_sig, tsi < tsi_sig)

    if "UO" in names:
        t_low = np.minimum(low_s, prev_close)
        t_high = np.maximum(high_s, prev_close)
        bp = close_s - t_low
        tr_u = t_high - t_low
        a7 = bp.rolling(7, min_periods=7).sum() / tr_u.rolling(7, min_periods=7).sum().replace(0, np.nan)
        a14 = bp.rolling(14, min_periods=14).sum() / tr_u.rolling(14, min_periods=14).sum().replace(0, np.nan)
        a28 = bp.rolling(28, min_periods=28).sum() / tr_u.rolling(28, min_periods=28).sum().replace(0, np.nan)
        uo = 100.0 * (4.0 * a7 + 2.0 * a14 + a28) / 7.0
        signals["UO"] = _pack(
            ((uo > 30.0) & (uo.shift(1) <= 30.0)) | ((uo > 50.0) & (uo >= uo.shift(1))),
            ((uo < 70.0) & (uo.shift(1) >= 70.0)) | (uo < 42.0),
        )

    if "ELDER_RAY" in names:
        ema13 = calc_ema(close_s, 13)
        bull = high_s - ema13
        bear = low_s - ema13
        signals["ELDER_RAY"] = _pack(
            (bull > 0.0) & (bear >= bear.shift(1)),
            bull < 0.0,
        )

    if "CMO" in names:
        diff = close_s - prev_close
        up = diff.clip(lower=0.0).rolling(14, min_periods=14).sum()
        dn = (-diff.clip(upper=0.0)).rolling(14, min_periods=14).sum()
        cmo = 100.0 * (up - dn) / (up + dn).replace(0, np.nan)
        signals["CMO"] = _pack((cmo > 0.0) & (cmo >= cmo.shift(1)), cmo < 0.0)

    if "FORCE_INDEX" in names:
        efi = calc_ema((close_s - prev_close) * vol_s, 13)
        signals["FORCE_INDEX"] = _pack(efi > 0.0, efi < 0.0)

    if "CHOP" in names:
        s_tr = tr_s.rolling(14, min_periods=14).sum()
        hh = high_s.rolling(14, min_periods=14).max()
        ll = low_s.rolling(14, min_periods=14).min()
        rng = (hh - ll).replace(0, np.nan)
        chop = 100.0 * np.log10((s_tr / rng).clip(lower=1e-9)) / np.log10(14.0)
        sma20 = calc_sma(close_s, 20)
        signals["CHOP"] = _pack(
            (chop < 55.0) & (close_s > sma20),
            (chop > 61.8) | (close_s < sma20),
        )

    if "VORTEX" in names:
        vm_p = (high_s - low_s.shift(1)).abs()
        vm_m = (low_s - high_s.shift(1)).abs()
        s_tr14 = tr_s.rolling(14, min_periods=14).sum().replace(0, np.nan)
        vi_p = vm_p.rolling(14, min_periods=14).sum() / s_tr14
        vi_m = vm_m.rolling(14, min_periods=14).sum() / s_tr14
        signals["VORTEX"] = _pack(vi_p > vi_m, vi_m > vi_p)

    if "RVI" in names:
        co = close_s - open_s
        hl = high_s - low_s
        num = (co + 2.0 * co.shift(1) + 2.0 * co.shift(2) + co.shift(3)) / 6.0
        den = (hl + 2.0 * hl.shift(1) + 2.0 * hl.shift(2) + hl.shift(3)) / 6.0
        rvi = calc_sma(num, 10) / calc_sma(den, 10).replace(0, np.nan)
        rvi_sig = (rvi + 2.0 * rvi.shift(1) + 2.0 * rvi.shift(2) + rvi.shift(3)) / 6.0
        signals["RVI"] = _pack(rvi > rvi_sig, rvi < rvi_sig)

    if "ATR" in names:
        atr = pd.Series(tr_s, index=df.index).ewm(alpha=1.0 / 14.0, adjust=False, min_periods=14).mean()
        atr_ma = calc_sma(atr, 20)
        sma10 = calc_sma(close_s, 10)
        signals["ATR"] = _pack((atr > atr_ma) & (close_s > sma10), close_s < sma10)

    if "CCI" in names:
        tp = (high_s + low_s + close_s) / 3.0
        tp_sma = calc_sma(tp, 20)
        mad = tp.rolling(20, min_periods=20).apply(lambda x: np.mean(np.abs(x - np.mean(x))), raw=True).replace(0, np.nan)
        cci = (tp - tp_sma) / (0.015 * mad)
        signals["CCI"] = _pack(
            ((cci > -100.0) & (cci.shift(1) <= -100.0)) | ((cci > 0.0) & (cci >= cci.shift(1))),
            ((cci < 100.0) & (cci.shift(1) >= 100.0)) | (cci < 0.0),
        )

    if "WR" in names:
        hh14 = high_s.rolling(14, min_periods=14).max()
        ll14 = low_s.rolling(14, min_periods=14).min()
        wr = -100.0 * (hh14 - close_s) / (hh14 - ll14).replace(0, np.nan)
        signals["WR"] = _pack(
            ((wr > -80.0) & (wr.shift(1) <= -80.0)) | ((wr > -50.0) & (wr >= wr.shift(1))),
            ((wr < -20.0) & (wr.shift(1) >= -20.0)) | (wr < -55.0),
        )

    if "AO" in names:
        hl2 = (high_s + low_s) / 2.0
        ao = calc_sma(hl2, 5) - calc_sma(hl2, 34)
        signals["AO"] = _pack((ao > 0.0) & (ao >= ao.shift(1)), ao < 0.0)

    if "ROC" in names:
        roc = (close_s - close_s.shift(12)) / close_s.shift(12).replace(0, np.nan) * 100.0
        signals["ROC"] = _pack(roc > 0.0, roc < 0.0)

    if "TRIX" in names:
        e1 = calc_ema(close_s, 12)
        e2 = calc_ema(e1, 12)
        e3 = calc_ema(e2, 12)
        trix = (e3 - e3.shift(1)) / e3.shift(1).replace(0, np.nan) * 100.0
        trma = calc_sma(trix, 9)
        signals["TRIX"] = _pack(trix > trma, trix < trma)

    if "MFI" in names:
        tp = (high_s + low_s + close_s) / 3.0
        rmf = tp * vol_s
        pos = np.where(tp > tp.shift(1), rmf, 0.0)
        neg = np.where(tp < tp.shift(1), rmf, 0.0)
        mr = pd.Series(pos, index=df.index).rolling(14, min_periods=14).sum() / pd.Series(neg, index=df.index).rolling(14, min_periods=14).sum().replace(0, np.nan)
        mfi = 100.0 - 100.0 / (1.0 + mr)
        signals["MFI"] = _pack(((mfi > 20.0) & (mfi.shift(1) <= 20.0)) | ((mfi > 50.0) & (mfi < 80.0)), (mfi < 80.0) & (mfi.shift(1) >= 80.0) | (mfi < 45.0))

    if "OBV" in names:
        obv_step = np.where(close_s > prev_close, vol_s, np.where(close_s < prev_close, -vol_s, 0.0))
        obv = pd.Series(obv_step, index=df.index).cumsum()
        obv_ma = calc_sma(obv, 20)
        signals["OBV"] = _pack(obv > obv_ma, obv < obv_ma)

    if "KDJ" in names:
        ll9 = low_s.rolling(9, min_periods=9).min()
        hh9 = high_s.rolling(9, min_periods=9).max()
        rsv = np.where((hh9 - ll9) > 0, (close_s - ll9) / (hh9 - ll9) * 100.0, 50.0)
        k = pd.Series(rsv, index=df.index).ewm(alpha=1.0 / 3.0, adjust=False).mean()
        d = k.ewm(alpha=1.0 / 3.0, adjust=False).mean()
        signals["KDJ"] = _pack((k > d) & (k < 80.0), (k < d) & (k > 30.0))

    return signals
