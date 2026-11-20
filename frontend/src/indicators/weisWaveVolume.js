/**
 * Weis Wave Volume (LazyBear)
 * Exact TradingView state machine:
 * - trendDetectionLength (default 2)
 * - showDistributionBelowZero (1 = true, 0 = false)
 */

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
      styles: ({ data }) => {
        const cur = data?.current?.indicatorData
        if (!cur) return { color: '#00c853' }
        return {
          color: cur.wave === 1 ? '#00c853' : '#ff1744',
        }
      },
    },
  ],
  calc: (dataList, indicator) => {
    const [trendDetectionLength = 2, belowZeroFlag = 1] = indicator.calcParams
    const L = Math.max(1, Math.floor(trendDetectionLength))
    const belowZero = Boolean(belowZeroFlag)
    const n = dataList.length

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

      let isTrending = false
      if (i >= L) {
        let maxPrev = -Infinity
        let minPrev = Infinity
        for (let j = i - L; j < i; j++) {
          if (dataList[j].close > maxPrev) maxPrev = dataList[j].close
          if (dataList[j].close < minPrev) minPrev = dataList[j].close
        }
        if (close > maxPrev || close < minPrev) {
          isTrending = true
        }
      }

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
