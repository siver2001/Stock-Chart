/**
 * 13+ Custom TradingView Sub-pane Indicators for KlineCharts v9
 * Exact mathematical parity with TradingView Pine Script & Python backtester.
 */

function calcEmaArray(values, period) {
  const n = values.length
  const out = new Array(n).fill(null)
  if (n === 0 || period < 1) return out
  const k = 2 / (period + 1)
  let sum = 0
  let count = 0
  let ema = null

  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v == null || !Number.isFinite(v)) continue
    if (ema === null) {
      sum += v
      count++
      if (count === period) {
        ema = sum / period
        out[i] = ema
      }
    } else {
      ema = v * k + ema * (1 - k)
      out[i] = ema
    }
  }
  return out
}

function calcSmaArray(values, period) {
  const n = values.length
  const out = new Array(n).fill(null)
  if (period < 1) return out
  for (let i = period - 1; i < n; i++) {
    let sum = 0
    let valid = true
    for (let j = i - period + 1; j <= i; j++) {
      const v = values[j]
      if (v == null || !Number.isFinite(v)) {
        valid = false
        break
      }
      sum += v
    }
    if (valid) out[i] = sum / period
  }
  return out
}

function calcTrueRangeArray(dataList) {
  const n = dataList.length
  const tr = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    const h = dataList[i].high
    const l = dataList[i].low
    if (i === 0) {
      tr[i] = h - l
    } else {
      const pc = dataList[i - 1].close
      tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc))
    }
  }
  return tr
}

function getHoverIndex(kLineDataList, crosshair) {
  if (
    crosshair &&
    crosshair.dataIndex !== undefined &&
    crosshair.dataIndex >= 0 &&
    crosshair.dataIndex < kLineDataList.length
  ) {
    return crosshair.dataIndex
  }
  return kLineDataList.length - 1
}

function formatCompact(num) {
  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`
  return `${sign}${abs.toFixed(2)}`
}

// ============================================================================
// 1. STOCHASTIC RSI (STOCH_RSI) [3, 3, 14, 14]
// ============================================================================
export const stochRsiIndicator = {
  name: 'STOCH_RSI',
  shortName: 'StochRSI',
  calcParams: [3, 3, 14, 14],
  precision: 2,
  figures: [
    { key: 'k', title: '%K: ', type: 'line', styles: () => ({ color: '#2962ff', size: 1.8 }) },
    { key: 'd', title: '%D: ', type: 'line', styles: () => ({ color: '#ff6d00', size: 1.5 }) },
    { key: 'ob', title: '', type: 'line', styles: () => ({ color: '#ef4444', style: 'dashed', size: 1 }) },
    { key: 'os', title: '', type: 'line', styles: () => ({ color: '#10b981', style: 'dashed', size: 1 }) },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.k == null) {
      return { name: 'StochRSI', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    return {
      name: 'StochRSI',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        { title: '%K: ', value: { text: Number(cur.k).toFixed(2), color: '#2962ff' } },
        { title: '%D: ', value: { text: cur.d != null ? Number(cur.d).toFixed(2) : '--', color: '#ff6d00' } },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [smoothK = 3, smoothD = 3, rsiLen = 14, stochLen = 14] = indicator.calcParams
    const n = dataList.length
    const rsi = new Array(n).fill(null)

    let avgGain = 0
    let avgLoss = 0
    for (let i = 1; i < n; i++) {
      const diff = dataList[i].close - dataList[i - 1].close
      const gain = diff > 0 ? diff : 0
      const loss = diff < 0 ? -diff : 0
      if (i <= rsiLen) {
        avgGain += gain
        avgLoss += loss
        if (i === rsiLen) {
          avgGain /= rsiLen
          avgLoss /= rsiLen
          rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
        }
      } else {
        avgGain = (avgGain * (rsiLen - 1) + gain) / rsiLen
        avgLoss = (avgLoss * (rsiLen - 1) + loss) / rsiLen
        rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
      }
    }

    const rawStoch = new Array(n).fill(null)
    for (let i = 0; i < n; i++) {
      if (i < rsiLen + stochLen - 1 || rsi[i] == null) continue
      let lo = Infinity
      let hi = -Infinity
      let valid = true
      for (let j = i - stochLen + 1; j <= i; j++) {
        if (rsi[j] == null) {
          valid = false
          break
        }
        if (rsi[j] < lo) lo = rsi[j]
        if (rsi[j] > hi) hi = rsi[j]
      }
      if (!valid) continue
      rawStoch[i] = hi === lo ? 50 : ((rsi[i] - lo) / (hi - lo)) * 100
    }

    const kArr = calcSmaArray(rawStoch, smoothK)
    const dArr = calcSmaArray(kArr, smoothD)
    return dataList.map((_, i) => ({
      k: kArr[i],
      d: dArr[i],
      ob: 80,
      os: 20,
    }))
  },
}

// ============================================================================
// 2. CM WILLIAMS VIX FIX (Bắt đáy - Top #2 TradingView by ChrisMoody)
// ============================================================================
export const williamsVixFixIndicator = {
  name: 'WILLIAMS_VIX_FIX',
  shortName: 'VixFix',
  calcParams: [22, 20, 2, 50],
  precision: 2,
  figures: [
    {
      key: 'wvf',
      title: 'WVF: ',
      type: 'bar',
      baseValue: 0,
      styles: ({ data }) => ({
        color: data?.current?.isBottom ? '#00e676' : '#64748b',
      }),
    },
    {
      key: 'upperBand',
      title: 'Ngưỡng đáy: ',
      type: 'line',
      styles: () => ({ color: '#f59e0b', style: 'dashed', size: 1.2 }),
    },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.wvf == null) {
      return { name: 'CM VixFix', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    return {
      name: 'CM VixFix',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        {
          title: cur.isBottom ? 'Tạo Đáy (Mua): ' : 'WVF: ',
          value: { text: Number(cur.wvf).toFixed(2), color: cur.isBottom ? '#00e676' : '#94a3b8' },
        },
        {
          title: 'Upper: ',
          value: { text: cur.upperBand != null ? Number(cur.upperBand).toFixed(2) : '--', color: '#f59e0b' },
        },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [pd = 22, bbl = 20, mult = 2, lb = 50] = indicator.calcParams
    const ph = 0.85
    const n = dataList.length
    const wvf = new Array(n).fill(null)

    for (let i = 0; i < n; i++) {
      if (i < pd - 1) continue
      let maxClose = -Infinity
      for (let j = i - pd + 1; j <= i; j++) {
        if (dataList[j].close > maxClose) maxClose = dataList[j].close
      }
      wvf[i] = maxClose > 0 ? ((maxClose - dataList[i].low) / maxClose) * 100 : 0
    }

    const mid = calcSmaArray(wvf, bbl)
    return dataList.map((_, i) => {
      if (wvf[i] == null) return { wvf: null, upperBand: null, isBottom: false }
      let upperBand = null
      if (mid[i] != null) {
        let sqSum = 0
        for (let j = i - bbl + 1; j <= i; j++) {
          const diff = (wvf[j] ?? 0) - mid[i]
          sqSum += diff * diff
        }
        const stdev = Math.sqrt(sqSum / bbl)
        upperBand = mid[i] + mult * stdev
      }
      let rangeHigh = null
      if (i >= lb - 1) {
        let maxW = -Infinity
        for (let j = i - lb + 1; j <= i; j++) {
          if ((wvf[j] ?? 0) > maxW) maxW = wvf[j] ?? 0
        }
        rangeHigh = maxW * ph
      }
      const isBottom =
        (upperBand != null && wvf[i] >= upperBand) || (rangeHigh != null && wvf[i] >= rangeHigh)
      return { wvf: wvf[i], upperBand, isBottom }
    })
  },
}

// ============================================================================
// 3. SCHAFF TREND CYCLE (STC) [10, 23, 50]
// ============================================================================
export const stcIndicator = {
  name: 'STC',
  shortName: 'STC',
  calcParams: [10, 23, 50],
  precision: 2,
  figures: [
    {
      key: 'stc',
      title: 'STC: ',
      type: 'line',
      styles: ({ data }) => ({
        color: data?.current?.rising ? '#089981' : '#f23645',
        size: 2,
      }),
    },
    { key: 'ob', title: '', type: 'line', styles: () => ({ color: '#ef4444', style: 'dashed', size: 1 }) },
    { key: 'os', title: '', type: 'line', styles: () => ({ color: '#10b981', style: 'dashed', size: 1 }) },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.stc == null) {
      return { name: 'STC', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    return {
      name: 'STC',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        {
          title: 'STC: ',
          value: { text: Number(cur.stc).toFixed(2), color: cur.rising ? '#089981' : '#f23645' },
        },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [len = 10, fastLen = 23, slowLen = 50] = indicator.calcParams
    const factor = 0.5
    const closes = dataList.map((d) => d.close)
    const emaFast = calcEmaArray(closes, fastLen)
    const emaSlow = calcEmaArray(closes, slowLen)
    const macd = closes.map((_, i) => (emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null))

    const n = dataList.length
    const f1 = new Array(n).fill(0)
    const pf = new Array(n).fill(0)
    const f2 = new Array(n).fill(0)
    const pff = new Array(n).fill(null)

    for (let i = 0; i < n; i++) {
      if (macd[i] == null || i < len - 1) continue
      let lo = Infinity
      let hi = -Infinity
      for (let j = i - len + 1; j <= i; j++) {
        const m = macd[j] ?? macd[i]
        if (m < lo) lo = m
        if (m > hi) hi = m
      }
      f1[i] = hi - lo > 0 ? ((macd[i] - lo) / (hi - lo)) * 100 : (i > 0 ? f1[i - 1] : 0)
      pf[i] = i > 0 ? pf[i - 1] + factor * (f1[i] - pf[i - 1]) : f1[i]

      let loPf = Infinity
      let hiPf = -Infinity
      for (let j = i - len + 1; j <= i; j++) {
        if (pf[j] < loPf) loPf = pf[j]
        if (pf[j] > hiPf) hiPf = pf[j]
      }
      f2[i] = hiPf - loPf > 0 ? ((pf[i] - loPf) / (hiPf - loPf)) * 100 : (i > 0 ? f2[i - 1] : 0)
      const prev = pff[i - 1] ?? f2[i]
      pff[i] = prev + factor * (f2[i] - prev)
    }

    return dataList.map((_, i) => ({
      stc: pff[i],
      rising: i > 0 && pff[i] != null && pff[i - 1] != null ? pff[i] >= pff[i - 1] : true,
      ob: 75,
      os: 25,
    }))
  },
}

// ============================================================================
// 4. CHAIKIN MONEY FLOW (CMF) [20]
// ============================================================================
export const cmfIndicator = {
  name: 'CMF',
  shortName: 'CMF',
  calcParams: [20],
  precision: 3,
  figures: [
    {
      key: 'cmf',
      title: 'CMF: ',
      type: 'bar',
      baseValue: 0,
      styles: ({ data }) => ({
        color: (data?.current?.cmf ?? 0) >= 0 ? 'rgba(8, 153, 129, 0.85)' : 'rgba(242, 54, 69, 0.85)',
      }),
    },
    { key: 'zero', title: '', type: 'line', styles: () => ({ color: '#4b5563', style: 'dashed', size: 1 }) },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.cmf == null) {
      return { name: 'CMF', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    const c = cur.cmf >= 0 ? '#089981' : '#f23645'
    return {
      name: 'CMF',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [{ title: 'Dòng tiền CMF: ', value: { text: Number(cur.cmf).toFixed(3), color: c } }],
    }
  },
  calc: (dataList, indicator) => {
    const [period = 20] = indicator.calcParams
    const mfv = dataList.map((d) => {
      const hl = d.high - d.low
      const mfm = hl === 0 ? 0 : (d.close - d.low - (d.high - d.close)) / hl
      return mfm * (d.volume || 0)
    })
    return dataList.map((_, i) => {
      if (i < period - 1) return { cmf: null, zero: 0 }
      let sumMfv = 0
      let sumVol = 0
      for (let j = i - period + 1; j <= i; j++) {
        sumMfv += mfv[j]
        sumVol += dataList[j].volume || 0
      }
      return { cmf: sumVol > 0 ? sumMfv / sumVol : 0, zero: 0 }
    })
  },
}

// ============================================================================
// 5. TRUE STRENGTH INDEX (TSI) [25, 13, 13]
// ============================================================================
export const tsiIndicator = {
  name: 'TSI',
  shortName: 'TSI',
  calcParams: [25, 13, 13],
  precision: 2,
  figures: [
    { key: 'tsi', title: 'TSI: ', type: 'line', styles: () => ({ color: '#2962ff', size: 1.8 }) },
    { key: 'signal', title: 'Signal: ', type: 'line', styles: () => ({ color: '#f23645', size: 1.5 }) },
    { key: 'zero', title: '', type: 'line', styles: () => ({ color: '#4b5563', style: 'dashed', size: 1 }) },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.tsi == null) {
      return { name: 'TSI', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    return {
      name: 'TSI',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        { title: 'TSI: ', value: { text: Number(cur.tsi).toFixed(2), color: '#2962ff' } },
        { title: 'Signal: ', value: { text: cur.signal != null ? Number(cur.signal).toFixed(2) : '--', color: '#f23645' } },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [longLen = 25, shortLen = 13, sigLen = 13] = indicator.calcParams
    const n = dataList.length
    const pc = new Array(n).fill(null)
    const apc = new Array(n).fill(null)
    for (let i = 1; i < n; i++) {
      const diff = dataList[i].close - dataList[i - 1].close
      pc[i] = diff
      apc[i] = Math.abs(diff)
    }
    const dsPc = calcEmaArray(calcEmaArray(pc, longLen), shortLen)
    const dsApc = calcEmaArray(calcEmaArray(apc, longLen), shortLen)
    const tsi = dsPc.map((v, i) => (v != null && dsApc[i] ? (100 * v) / dsApc[i] : null))
    const sig = calcEmaArray(tsi, sigLen)
    return dataList.map((_, i) => ({ tsi: tsi[i], signal: sig[i], zero: 0 }))
  },
}

// ============================================================================
// 6. ULTIMATE OSCILLATOR (UO) [7, 14, 28]
// ============================================================================
export const uoIndicator = {
  name: 'UO',
  shortName: 'UO',
  calcParams: [7, 14, 28],
  precision: 2,
  figures: [
    { key: 'uo', title: 'UO: ', type: 'line', styles: () => ({ color: '#a855f7', size: 1.8 }) },
    { key: 'ob', title: '', type: 'line', styles: () => ({ color: '#ef4444', style: 'dashed', size: 1 }) },
    { key: 'os', title: '', type: 'line', styles: () => ({ color: '#10b981', style: 'dashed', size: 1 }) },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.uo == null) {
      return { name: 'UO', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    const color = cur.uo >= 70 ? '#ef4444' : cur.uo <= 30 ? '#10b981' : '#a855f7'
    return {
      name: 'UO',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [{ title: 'UO: ', value: { text: Number(cur.uo).toFixed(2), color } }],
    }
  },
  calc: (dataList, indicator) => {
    const [p1 = 7, p2 = 14, p3 = 28] = indicator.calcParams
    const n = dataList.length
    const bp = new Array(n).fill(0)
    const tr = new Array(n).fill(0)
    for (let i = 1; i < n; i++) {
      const pc = dataList[i - 1].close
      const trueLow = Math.min(dataList[i].low, pc)
      const trueHigh = Math.max(dataList[i].high, pc)
      bp[i] = dataList[i].close - trueLow
      tr[i] = trueHigh - trueLow
    }
    const avgRatio = (idx, len) => {
      let sBp = 0
      let sTr = 0
      for (let j = idx - len + 1; j <= idx; j++) {
        sBp += bp[j]
        sTr += tr[j]
      }
      return sTr > 0 ? sBp / sTr : 0
    }
    const maxP = Math.max(p1, p2, p3)
    return dataList.map((_, i) => {
      if (i < maxP) return { uo: null, ob: 70, os: 30 }
      const uo = (100 * (4 * avgRatio(i, p1) + 2 * avgRatio(i, p2) + avgRatio(i, p3))) / 7
      return { uo, ob: 70, os: 30 }
    })
  },
}

// ============================================================================
// 7. ELDER-RAY INDEX (Bull & Bear Power) [13]
// ============================================================================
export const elderRayIndicator = {
  name: 'ELDER_RAY',
  shortName: 'ElderRay',
  calcParams: [13],
  precision: 2,
  figures: [
    { key: 'bull', title: 'Bull: ', type: 'bar', baseValue: 0, styles: () => ({ color: 'rgba(8, 153, 129, 0.78)' }) },
    { key: 'bear', title: 'Bear: ', type: 'bar', baseValue: 0, styles: () => ({ color: 'rgba(242, 54, 69, 0.78)' }) },
    { key: 'zero', title: '', type: 'line', styles: () => ({ color: '#4b5563', style: 'dashed', size: 1 }) },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.bull == null) {
      return { name: 'Elder-Ray', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    return {
      name: 'Elder-Ray',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        { title: 'Bull Power: ', value: { text: Number(cur.bull).toFixed(0), color: '#089981' } },
        { title: 'Bear Power: ', value: { text: Number(cur.bear).toFixed(0), color: '#f23645' } },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [period = 13] = indicator.calcParams
    const ema = calcEmaArray(dataList.map((d) => d.close), period)
    return dataList.map((d, i) => {
      if (ema[i] == null) return { bull: null, bear: null, zero: 0 }
      return { bull: d.high - ema[i], bear: d.low - ema[i], zero: 0 }
    })
  },
}

// ============================================================================
// 8. CHANDE MOMENTUM OSCILLATOR (CMO) [14]
// ============================================================================
export const cmoIndicator = {
  name: 'CMO',
  shortName: 'CMO',
  calcParams: [14],
  precision: 2,
  figures: [
    { key: 'cmo', title: 'CMO: ', type: 'line', styles: () => ({ color: '#38bdf8', size: 1.8 }) },
    { key: 'ob', title: '', type: 'line', styles: () => ({ color: '#ef4444', style: 'dashed', size: 1 }) },
    { key: 'zero', title: '', type: 'line', styles: () => ({ color: '#4b5563', style: 'dashed', size: 1 }) },
    { key: 'os', title: '', type: 'line', styles: () => ({ color: '#10b981', style: 'dashed', size: 1 }) },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.cmo == null) {
      return { name: 'CMO', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    const color = cur.cmo >= 50 ? '#ef4444' : cur.cmo <= -50 ? '#10b981' : '#38bdf8'
    return {
      name: 'CMO',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [{ title: 'CMO: ', value: { text: Number(cur.cmo).toFixed(2), color } }],
    }
  },
  calc: (dataList, indicator) => {
    const [period = 14] = indicator.calcParams
    const n = dataList.length
    const up = new Array(n).fill(0)
    const dn = new Array(n).fill(0)
    for (let i = 1; i < n; i++) {
      const diff = dataList[i].close - dataList[i - 1].close
      if (diff > 0) up[i] = diff
      else if (diff < 0) dn[i] = -diff
    }
    return dataList.map((_, i) => {
      if (i < period) return { cmo: null, ob: 50, zero: 0, os: -50 }
      let sU = 0
      let sD = 0
      for (let j = i - period + 1; j <= i; j++) {
        sU += up[j]
        sD += dn[j]
      }
      const cmo = sU + sD > 0 ? (100 * (sU - sD)) / (sU + sD) : 0
      return { cmo, ob: 50, zero: 0, os: -50 }
    })
  },
}

// ============================================================================
// 9. ELDER'S FORCE INDEX (FORCE_INDEX) [13]
// ============================================================================
export const forceIndexIndicator = {
  name: 'FORCE_INDEX',
  shortName: 'EFI',
  calcParams: [13],
  precision: 0,
  figures: [
    {
      key: 'efi',
      title: 'EFI: ',
      type: 'bar',
      baseValue: 0,
      styles: ({ data }) => ({
        color: (data?.current?.efi ?? 0) >= 0 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)',
      }),
    },
    { key: 'zero', title: '', type: 'line', styles: () => ({ color: '#4b5563', style: 'dashed', size: 1 }) },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.efi == null) {
      return { name: 'Force Index', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    return {
      name: 'Force Index',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        {
          title: 'Lực đẩy EFI: ',
          value: { text: formatCompact(cur.efi), color: cur.efi >= 0 ? '#10b981' : '#ef4444' },
        },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [period = 13] = indicator.calcParams
    const raw = dataList.map((d, i) => (i === 0 ? null : (d.close - dataList[i - 1].close) * (d.volume || 0)))
    const efi = calcEmaArray(raw, period)
    return dataList.map((_, i) => ({ efi: efi[i], zero: 0 }))
  },
}

// ============================================================================
// 10. CHOPPINESS INDEX (CHOP) [14]
// ============================================================================
export const chopIndicator = {
  name: 'CHOP',
  shortName: 'CHOP',
  calcParams: [14],
  precision: 2,
  figures: [
    { key: 'chop', title: 'CHOP: ', type: 'line', styles: () => ({ color: '#f59e0b', size: 1.8 }) },
    { key: 'sideways', title: '', type: 'line', styles: () => ({ color: '#ef4444', style: 'dashed', size: 1 }) },
    { key: 'trend', title: '', type: 'line', styles: () => ({ color: '#10b981', style: 'dashed', size: 1 }) },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.chop == null) {
      return { name: 'CHOP', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    const label = cur.chop >= 61.8 ? 'Đi ngang (Sideway)' : cur.chop <= 38.2 ? 'Có sóng mạnh' : 'Bình thường'
    const color = cur.chop >= 61.8 ? '#ef4444' : cur.chop <= 38.2 ? '#10b981' : '#f59e0b'
    return {
      name: 'CHOP',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [{ title: `${label}: `, value: { text: Number(cur.chop).toFixed(2), color } }],
    }
  },
  calc: (dataList, indicator) => {
    const [period = 14] = indicator.calcParams
    const tr = calcTrueRangeArray(dataList)
    const denomLog = Math.log10(Math.max(2, period))
    return dataList.map((_, i) => {
      if (i < period - 1) return { chop: null, sideways: 61.8, trend: 38.2 }
      let sumTr = 0
      let hh = -Infinity
      let ll = Infinity
      for (let j = i - period + 1; j <= i; j++) {
        sumTr += tr[j]
        if (dataList[j].high > hh) hh = dataList[j].high
        if (dataList[j].low < ll) ll = dataList[j].low
      }
      const range = hh - ll
      const chop = range > 0 && sumTr > 0 ? (100 * Math.log10(sumTr / range)) / denomLog : 50
      return { chop, sideways: 61.8, trend: 38.2 }
    })
  },
}

// ============================================================================
// 11. VORTEX INDICATOR (VORTEX) [14]
// ============================================================================
export const vortexIndicator = {
  name: 'VORTEX',
  shortName: 'VI',
  calcParams: [14],
  precision: 3,
  figures: [
    { key: 'viPlus', title: 'VI+: ', type: 'line', styles: () => ({ color: '#089981', size: 1.8 }) },
    { key: 'viMinus', title: 'VI-: ', type: 'line', styles: () => ({ color: '#f23645', size: 1.8 }) },
    { key: 'mid', title: '', type: 'line', styles: () => ({ color: '#4b5563', style: 'dashed', size: 1 }) },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.viPlus == null) {
      return { name: 'Vortex', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    return {
      name: 'Vortex',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        { title: 'VI+: ', value: { text: Number(cur.viPlus).toFixed(3), color: '#089981' } },
        { title: 'VI-: ', value: { text: Number(cur.viMinus).toFixed(3), color: '#f23645' } },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [period = 14] = indicator.calcParams
    const n = dataList.length
    const tr = calcTrueRangeArray(dataList)
    const vmPlus = new Array(n).fill(0)
    const vmMinus = new Array(n).fill(0)
    for (let i = 1; i < n; i++) {
      vmPlus[i] = Math.abs(dataList[i].high - dataList[i - 1].low)
      vmMinus[i] = Math.abs(dataList[i].low - dataList[i - 1].high)
    }
    return dataList.map((_, i) => {
      if (i < period) return { viPlus: null, viMinus: null, mid: 1 }
      let sTr = 0
      let sVp = 0
      let sVm = 0
      for (let j = i - period + 1; j <= i; j++) {
        sTr += tr[j]
        sVp += vmPlus[j]
        sVm += vmMinus[j]
      }
      return {
        viPlus: sTr > 0 ? sVp / sTr : 1,
        viMinus: sTr > 0 ? sVm / sTr : 1,
        mid: 1,
      }
    })
  },
}

// ============================================================================
// 12. RELATIVE VIGOR INDEX (RVI) [10]
// ============================================================================
export const rviIndicator = {
  name: 'RVI',
  shortName: 'RVI',
  calcParams: [10],
  precision: 3,
  figures: [
    { key: 'rvi', title: 'RVI: ', type: 'line', styles: () => ({ color: '#089981', size: 1.8 }) },
    { key: 'signal', title: 'Signal: ', type: 'line', styles: () => ({ color: '#f23645', size: 1.5 }) },
    { key: 'zero', title: '', type: 'line', styles: () => ({ color: '#4b5563', style: 'dashed', size: 1 }) },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.rvi == null) {
      return { name: 'RVI', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    return {
      name: 'RVI',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        { title: 'RVI: ', value: { text: Number(cur.rvi).toFixed(3), color: '#089981' } },
        { title: 'Signal: ', value: { text: cur.signal != null ? Number(cur.signal).toFixed(3) : '--', color: '#f23645' } },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [period = 10] = indicator.calcParams
    const n = dataList.length
    const num = new Array(n).fill(null)
    const den = new Array(n).fill(null)
    for (let i = 3; i < n; i++) {
      const co = (k) => dataList[k].close - dataList[k].open
      const hl = (k) => dataList[k].high - dataList[k].low
      num[i] = (co(i) + 2 * co(i - 1) + 2 * co(i - 2) + co(i - 3)) / 6
      den[i] = (hl(i) + 2 * hl(i - 1) + 2 * hl(i - 2) + hl(i - 3)) / 6
    }
    const smaNum = calcSmaArray(num, period)
    const smaDen = calcSmaArray(den, period)
    const rvi = smaNum.map((v, i) => (v != null && smaDen[i] ? v / smaDen[i] : null))
    return dataList.map((_, i) => {
      let signal = null
      if (i >= 3 && rvi[i] != null && rvi[i - 1] != null && rvi[i - 2] != null && rvi[i - 3] != null) {
        signal = (rvi[i] + 2 * rvi[i - 1] + 2 * rvi[i - 2] + rvi[i - 3]) / 6
      }
      return { rvi: rvi[i], signal, zero: 0 }
    })
  },
}

// ============================================================================
// 13. AVERAGE TRUE RANGE (ATR) [14]
// ============================================================================
export const atrIndicator = {
  name: 'ATR',
  shortName: 'ATR',
  calcParams: [14],
  precision: 2,
  figures: [{ key: 'atr', title: 'ATR: ', type: 'line', styles: () => ({ color: '#f59e0b', size: 1.8 }) }],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    const idx = getHoverIndex(kLineDataList, crosshair)
    const cur = (indicator.result || [])[idx]
    if (!cur || cur.atr == null) {
      return { name: 'ATR', calcParamsText: `(${indicator.calcParams.join(',')})`, icons: [], values: [] }
    }
    return {
      name: 'ATR',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [{ title: 'Biên độ ATR: ', value: { text: Number(cur.atr).toFixed(2), color: '#f59e0b' } }],
    }
  },
  calc: (dataList, indicator) => {
    const [period = 14] = indicator.calcParams
    const tr = calcTrueRangeArray(dataList)
    const n = dataList.length
    const out = new Array(n).fill(null)
    let rma = 0
    for (let i = 0; i < n; i++) {
      if (i < period - 1) {
        rma += tr[i]
      } else if (i === period - 1) {
        rma = (rma + tr[i]) / period
        out[i] = rma
      } else {
        rma = (rma * (period - 1) + tr[i]) / period
        out[i] = rma
      }
    }
    return out.map((v) => ({ atr: v }))
  },
}

export const TRADINGVIEW_SUB_INDICATORS = [
  stochRsiIndicator,
  williamsVixFixIndicator,
  stcIndicator,
  cmfIndicator,
  tsiIndicator,
  uoIndicator,
  elderRayIndicator,
  cmoIndicator,
  forceIndexIndicator,
  chopIndicator,
  vortexIndicator,
  rviIndicator,
  atrIndicator,
]
