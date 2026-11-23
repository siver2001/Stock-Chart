/**
 * VWAP Indicator (Volume Weighted Average Price)
 * Chuẩn giá bình quân gia quyền theo khối lượng
 * Rất phổ biến cho lướt sóng ngắn hạn (1m, 5m, 15m) và đánh giá dòng tiền
 */

export const vwapIndicator = {
  name: 'VWAP',
  shortName: 'VWAP',
  series: 'price',
  calcParams: [1, 2], // [Band 1 Multiplier, Band 2 Multiplier]
  precision: 0,
  shouldOhlc: true,

  figures: [
    {
      key: 'vwap',
      title: 'VWAP: ',
      type: 'line',
      styles: () => ({ color: '#e3b341', size: 2 }),
    },
    {
      key: 'upperBand1',
      title: 'Upper 1: ',
      type: 'line',
      styles: () => ({ color: '#3b82f6', size: 1, style: 'dashed' }),
    },
    {
      key: 'lowerBand1',
      title: 'Lower 1: ',
      type: 'line',
      styles: () => ({ color: '#3b82f6', size: 1, style: 'dashed' }),
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

    if (!cur || cur.vwap == null) {
      return {
        name: 'VWAP',
        calcParamsText: '',
        icons: [],
        values: [],
      }
    }

    const fmt = (v) => (v != null ? Number(v).toLocaleString('vi-VN') : '--')

    return {
      name: 'VWAP',
      calcParamsText: '',
      icons: [],
      values: [
        { title: 'VWAP: ', value: { text: fmt(cur.vwap), color: '#e3b341' } },
        { title: 'Dải trên: ', value: { text: fmt(cur.upperBand1), color: '#3b82f6' } },
        { title: 'Dải dưới: ', value: { text: fmt(cur.lowerBand1), color: '#3b82f6' } },
      ],
    }
  },

  calc: (dataList, indicator) => {
    const [mult1 = 1.0] = indicator.calcParams
    let cumVol = 0
    let cumVwap = 0
    let cumVwapSq = 0

    return dataList.map((bar) => {
      const vol = bar.volume || 0
      const typPrice = (bar.high + bar.low + bar.close) / 3

      cumVol += vol
      cumVwap += typPrice * vol
      cumVwapSq += typPrice * typPrice * vol

      if (cumVol === 0) return {}

      const vwap = cumVwap / cumVol
      const variance = Math.max(0, cumVwapSq / cumVol - vwap * vwap)
      const stdev = Math.sqrt(variance)

      return {
        vwap,
        upperBand1: vwap + mult1 * stdev,
        lowerBand1: vwap - mult1 * stdev,
      }
    })
  },
}
