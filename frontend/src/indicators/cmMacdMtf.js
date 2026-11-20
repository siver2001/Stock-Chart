/**
 * MacD Custom Indicator - Multiple Time Frame (ChrisMoody)
 * Exact TradingView parity:
 * - EMA(fast), EMA(slow)
 * - Signal = SMA(macd, signalLength)
 * - 4-color Histogram (histA_IsUp, histA_IsDown, histB_IsDown, histB_IsUp)
 * - MACD line color switches green/red relative to Signal
 * - Cross dot marker when MACD crosses Signal
 */

function calcEMA(values, length) {
  const k = 2 / (length + 1)
  const out = new Array(values.length).fill(null)
  let ema = null
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v == null) continue
    if (ema === null) {
      if (i >= length - 1) {
        let sum = 0
        for (let j = i - length + 1; j <= i; j++) sum += values[j]
        ema = sum / length
        out[i] = ema
      }
    } else {
      ema = v * k + ema * (1 - k)
      out[i] = ema
    }
  }
  return out
}

function calcSMA(values, length) {
  const out = new Array(values.length).fill(null)
  for (let i = length - 1; i < values.length; i++) {
    let sum = 0
    let valid = true
    for (let j = i - length + 1; j <= i; j++) {
      if (values[j] == null) {
        valid = false
        break
      }
      sum += values[j]
    }
    if (valid) out[i] = sum / length
  }
  return out
}

export const cmMacdMtfIndicator = {
  name: 'CM_MACD_MTF',
  shortName: 'CM MACD',
  calcParams: [12, 26, 9],
  precision: 2,
  figures: [
    {
      key: 'hist',
      title: 'Hist: ',
      type: 'bar',
      baseValue: 0,
      styles: ({ data }) => {
        const cur = data?.current?.indicatorData
        if (!cur || cur.hist == null) return { color: '#26a69a' }
        const state = cur.histState
        if (state === 1) return { color: '#00e676' } // Bright Green (Aqua)
        if (state === 2) return { color: '#2962ff' } // Blue (histA_IsDown)
        if (state === 3) return { color: '#ff1744' } // Dark Red (histB_IsDown)
        return { color: '#ff8a80' }                  // Light Red (histB_IsUp)
      },
    },
    {
      key: 'zero',
      title: '',
      type: 'line',
      styles: () => ({ color: '#787b86', style: 'dashed', size: 1 }),
    },
    {
      key: 'macd',
      title: 'MACD: ',
      type: 'line',
      styles: ({ data }) => {
        const cur = data?.current?.indicatorData
        if (!cur || cur.macd == null || cur.signal == null) return { color: '#00c853', size: 2 }
        return {
          color: cur.macd >= cur.signal ? '#00c853' : '#d50000',
          size: 2,
        }
      },
    },
    {
      key: 'signal',
      title: 'Signal: ',
      type: 'line',
      styles: () => ({ color: '#ffd600', size: 1.5 }),
    },
    {
      key: 'crossDot',
      title: 'Cross: ',
      type: 'circle',
      styles: ({ data }) => {
        const cur = data?.current?.indicatorData
        if (!cur || cur.cross === 0) return { color: 'transparent' }
        return {
          color: cur.cross === 1 ? '#00e676' : '#ff1744',
          style: 'fill',
        }
      },
    },
  ],
  calc: (dataList, indicator) => {
    const [fastLen = 12, slowLen = 26, sigLen = 9] = indicator.calcParams
    const closes = dataList.map((d) => d.close)
    const fast = calcEMA(closes, fastLen)
    const slow = calcEMA(closes, slowLen)
    const macdArr = closes.map((_, i) =>
      fast[i] != null && slow[i] != null ? fast[i] - slow[i] : null
    )
    const sigArr = calcSMA(macdArr, sigLen)

    return dataList.map((_, i) => {
      const macd = macdArr[i]
      const signal = sigArr[i]
      if (macd == null || signal == null) return {}

      const hist = macd - signal
      const prevHist = i > 0 && macdArr[i - 1] != null && sigArr[i - 1] != null
        ? macdArr[i - 1] - sigArr[i - 1]
        : hist

      let histState = 4
      if (hist > 0 && hist > prevHist) histState = 1
      else if (hist > 0 && hist <= prevHist) histState = 2
      else if (hist <= 0 && hist < prevHist) histState = 3

      let cross = 0
      if (i > 0 && macdArr[i - 1] != null && sigArr[i - 1] != null) {
        if (macdArr[i - 1] <= sigArr[i - 1] && macd > signal) cross = 1
        else if (macdArr[i - 1] >= sigArr[i - 1] && macd < signal) cross = -1
      }

      return {
        macd,
        signal,
        hist,
        histState,
        cross,
        crossDot: cross !== 0 ? signal : undefined,
        zero: 0,
      }
    })
  },
}
