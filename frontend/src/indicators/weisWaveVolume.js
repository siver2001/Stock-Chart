/**
 * Weis Wave Volume (LazyBear)
 * Exact TradingView parity and math spec:
 * - trendDetectionLength (default 2)
 * - showDistributionBelowZero (1 = true, 0 = false)
 * - Up wave: #26a69a (Green)
 * - Down wave: #ef5350 (Red)
 */

function getIndicatorData(data) {
  if (!data) return null
  if (data.current && data.current.indicatorData !== undefined) {
    return data.current.indicatorData
  }
  if (data.indicatorData !== undefined) {
    return data.indicatorData
  }
  return data
}

function isRising(dataList, i, length) {
  if (i < length) return false
  for (let k = 0; k < length; k++) {
    if (dataList[i - k].close <= dataList[i - k - 1].close) return false
  }
  return true
}

function isFalling(dataList, i, length) {
  if (i < length) return false
  for (let k = 0; k < length; k++) {
    if (dataList[i - k].close >= dataList[i - k - 1].close) return false
  }
  return true
}

export const weisWaveVolumeIndicator = {
  name: 'WEIS_WAVE',
  shortName: 'Weis Wave',
  calcParams: [2, 0], // [trendDetectionLength, showDistributionBelowZero (1=true, 0=false)]
  precision: 0,
  shouldFormatBigNumber: true,
  figures: [
    {
      key: 'waveVol',
      title: 'WaveVol: ',
      type: 'bar',
      baseValue: 0,
      styles: (data) => {
        const cur = getIndicatorData(data)
        if (!cur) return { color: '#26a69a' }
        return {
          color: cur.wave === 1 ? '#26a69a' : '#ef5350',
        }
      },
    },
  ],
  createTooltipDataSource: ({ kLineDataList, indicator, crosshair }) => {
    let dataIndex = kLineDataList.length - 1
    if (
      crosshair &&
      crosshair.dataIndex !== undefined &&
      crosshair.dataIndex >= 0 &&
      crosshair.dataIndex < kLineDataList.length
    ) {
      dataIndex = crosshair.dataIndex
    }
    const result = indicator.result || []
    const cur = result[dataIndex]
    const vol = cur?.waveVol != null ? Math.abs(cur.waveVol) : 0
    const isUp = (cur?.wave || 1) === 1

    const formatBig = (v) => {
      if (!v && v !== 0) return '--'
      if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B'
      if (v >= 1e6) return (v / 1e6).toFixed(3) + 'M'
      if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
      return Number(v).toLocaleString('vi-VN')
    }

    return {
      name: 'Weis Wave',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        {
          title: 'WaveVol: ',
          value: {
            text: formatBig(vol),
            color: isUp ? '#26a69a' : '#ef5350',
          },
        },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [trendDetectionLength = 2, belowZeroFlag = 0] = indicator.calcParams
    const L = Math.max(1, Math.floor(trendDetectionLength))
    const belowZero = Boolean(belowZeroFlag)

    let prevMov = 0
    let trend = 0
    let wave = 1
    let cumVol = 0

    return dataList.map((bar, i) => {
      if (i === 0) {
        cumVol = bar.volume || 0
        return { waveVol: cumVol, wave: 1 }
      }

      const close = bar.close
      const prevClose = dataList[i - 1].close
      const mov = close > prevClose ? 1 : close < prevClose ? -1 : 0

      if (mov !== 0 && mov !== prevMov) {
        trend = mov
      }
      prevMov = mov

      const isTrending = isRising(dataList, i, L) || isFalling(dataList, i, L)

      const prevWave = wave
      if (trend !== 0 && trend !== prevWave && isTrending) {
        wave = trend
      }

      if (wave === prevWave) {
        cumVol += bar.volume || 0
      } else {
        cumVol = bar.volume || 0
      }

      const signedVol = wave === 1 ? cumVol : (belowZero ? -cumVol : cumVol)
      return {
        waveVol: signedVol,
        wave,
      }
    })
  },
}
