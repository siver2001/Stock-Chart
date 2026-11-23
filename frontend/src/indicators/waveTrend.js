/**
 * WaveTrend Oscillator [LazyBear]
 * Top #3 Most Liked Community Oscillator on TradingView (~55,000+ Likes)
 * 
 * Logic & Math Spec:
 * - ap = (high + low + close) / 3
 * - esa = EMA(ap, n1=10)
 * - d = EMA(abs(ap - esa), n1=10)
 * - ci = (ap - esa) / (0.015 * d)
 * - wt1 = EMA(ci, n2=21)
 * - wt2 = SMA(wt1, 4)
 * - Overbought: +60, Oversold: -60
 * - Điểm Mua Vàng (Golden Cross): wt1 cắt lên wt2 tại vùng quá bán (<= -50)
 * - Điểm Bán Đỉnh (Death Cross): wt1 cắt xuống wt2 tại vùng quá mua (>= +50)
 */

export const waveTrendIndicator = {
  name: 'WAVETREND',
  shortName: 'WaveTrend',
  calcParams: [10, 21], // [channelLength, averageLength]
  precision: 1,
  shouldFormatBigNumber: false,
  figures: [
    {
      key: 'wt1',
      title: 'WT1: ',
      type: 'line',
      styles: () => ({ color: '#00e676', size: 1.8 }), // Fast line (Green)
    },
    {
      key: 'wt2',
      title: 'WT2: ',
      type: 'line',
      styles: () => ({ color: '#ff1744', size: 1.5, style: 'dashed' }), // Slow line (Red)
    },
    {
      key: 'overbought',
      title: '',
      type: 'line',
      styles: () => ({ color: 'rgba(239, 68, 68, 0.5)', style: 'dashed', size: 1 }),
    },
    {
      key: 'oversold',
      title: '',
      type: 'line',
      styles: () => ({ color: 'rgba(16, 185, 129, 0.5)', style: 'dashed', size: 1 }),
    },
    {
      key: 'zero',
      title: '',
      type: 'line',
      styles: () => ({ color: 'rgba(120, 123, 134, 0.3)', style: 'dashed', size: 1 }),
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
    const cur = result[dataIndex] || {}
    const wt1 = cur.wt1 != null ? Number(cur.wt1).toFixed(1) : '--'
    const wt2 = cur.wt2 != null ? Number(cur.wt2).toFixed(1) : '--'

    let signalText = 'Bình thường'
    let signalColor = '#9ca3af'
    if (cur.signal === 'BUY') {
      signalText = '★ MUA QUÁ BÁN'
      signalColor = '#00e676'
    } else if (cur.signal === 'SELL') {
      signalText = '▼ BÁN QUÁ MUA'
      signalColor = '#ff1744'
    } else if (Number(cur.wt1) >= 60) {
      signalText = 'Vùng Quá Mua (>60)'
      signalColor = '#ef4444'
    } else if (Number(cur.wt1) <= -60) {
      signalText = 'Vùng Quá Bán (<-60)'
      signalColor = '#10b981'
    }

    return {
      name: 'WaveTrend',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        {
          title: 'WT1: ',
          value: {
            text: String(wt1),
            color: '#00e676',
          },
        },
        {
          title: 'WT2: ',
          value: {
            text: String(wt2),
            color: '#ff1744',
          },
        },
        {
          title: 'Tín hiệu: ',
          value: {
            text: signalText,
            color: signalColor,
          },
        },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [chlen = 10, avglen = 21] = indicator.calcParams
    const n1 = Math.max(2, Math.floor(chlen))
    const n2 = Math.max(2, Math.floor(avglen))

    const alpha1 = 2 / (n1 + 1)
    const alpha2 = 2 / (n2 + 1)

    let esa = 0
    let d = 0
    let wt1Prev = 0

    const wt1Values = []
    const results = []

    for (let i = 0; i < dataList.length; i++) {
      const bar = dataList[i]
      const ap = (bar.high + bar.low + bar.close) / 3

      if (i === 0) {
        esa = ap
        d = 0
        wt1Prev = 0
        wt1Values.push(0)
        results.push({
          wt1: 0,
          wt2: 0,
          overbought: 60,
          oversold: -60,
          zero: 0,
          signal: null,
        })
        continue
      }

      esa = alpha1 * ap + (1 - alpha1) * esa
      d = alpha1 * Math.abs(ap - esa) + (1 - alpha1) * d
      const ci = d === 0 ? 0 : (ap - esa) / (0.015 * d)
      const wt1 = alpha2 * ci + (1 - alpha2) * wt1Prev
      wt1Prev = wt1
      wt1Values.push(wt1)

      // Calculate SMA(wt1, 4)
      const smaLen = 4
      let sumWt1 = 0
      const count = Math.min(smaLen, wt1Values.length)
      for (let k = 0; k < count; k++) {
        sumWt1 += wt1Values[wt1Values.length - 1 - k]
      }
      const wt2 = sumWt1 / count

      // Signal detection
      let signal = null
      if (i >= 4) {
        const prevWt1 = wt1Values[wt1Values.length - 2]
        const prevWt2 = results[i - 1]?.wt2 || 0
        // Golden Cross in oversold region
        if (prevWt1 <= prevWt2 && wt1 > wt2 && wt1 <= -50) {
          signal = 'BUY'
        }
        // Death Cross in overbought region
        else if (prevWt1 >= prevWt2 && wt1 < wt2 && wt1 >= 50) {
          signal = 'SELL'
        }
      }

      results.push({
        wt1,
        wt2,
        overbought: 60,
        oversold: -60,
        zero: 0,
        signal,
      })
    }

    return results
  },
}
