/**
 * Ichimoku Kinko Hyo (Mây Ichimoku)
 * Hệ thống giao dịch toàn diện chuẩn Nhật Bản:
 * 
 * - Tenkan-sen (Conversion Line): (Cao nhất 9 + Thấp nhất 9) / 2 -> Màu Xanh dương (#2962ff)
 * - Kijun-sen (Base Line): (Cao nhất 26 + Thấp nhất 26) / 2 -> Màu Vàng/Cam (#e3b341)
 * - Senkou Span A (Leading Span A): (Tenkan + Kijun) / 2 phóng về phía trước 26 phiên -> Màu Xanh lá (#089981)
 * - Senkou Span B (Leading Span B): (Cao nhất 52 + Thấp nhất 52) / 2 phóng về phía trước 26 phiên -> Màu Đỏ (#f23645)
 * - Chikou Span (Lagging Span): Giá đóng cửa lùi về sau 26 phiên -> Màu Tím (#a855f7)
 */

function getHighestLowest(dataList, start, end) {
  let highest = -Infinity
  let lowest = Infinity
  for (let i = start; i <= end; i++) {
    if (dataList[i].high > highest) highest = dataList[i].high
    if (dataList[i].low < lowest) lowest = dataList[i].low
  }
  return { highest, lowest }
}

export const ichimokuCloudIndicator = {
  name: 'ICHIMOKU',
  shortName: 'Ichimoku',
  series: 'price',
  calcParams: [9, 26, 52], // [Tenkan, Kijun, Senkou B]
  precision: 0,
  shouldOhlc: true,

  figures: [
    {
      key: 'tenkan',
      title: 'Tenkan (9): ',
      type: 'line',
      styles: () => ({ color: '#2962ff', size: 1.5 }),
    },
    {
      key: 'kijun',
      title: 'Kijun (26): ',
      type: 'line',
      styles: () => ({ color: '#e3b341', size: 1.5 }),
    },
    {
      key: 'spanA',
      title: 'Span A: ',
      type: 'line',
      styles: () => ({ color: '#089981', size: 1 }),
    },
    {
      key: 'spanB',
      title: 'Span B: ',
      type: 'line',
      styles: () => ({ color: '#f23645', size: 1 }),
    },
    {
      key: 'chikou',
      title: 'Chikou: ',
      type: 'line',
      styles: () => ({ color: '#a855f7', size: 1, style: 'dashed' }),
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

    if (!cur) {
      return {
        name: 'Ichimoku',
        calcParamsText: `(${indicator.calcParams.join(',')})`,
        icons: [],
        values: [],
      }
    }

    const fmt = (v) => (v != null ? Number(v).toLocaleString('vi-VN') : '--')

    return {
      name: 'Ichimoku',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        { title: 'Tenkan: ', value: { text: fmt(cur.tenkan), color: '#2962ff' } },
        { title: 'Kijun: ', value: { text: fmt(cur.kijun), color: '#e3b341' } },
        { title: 'Span A: ', value: { text: fmt(cur.spanA), color: '#089981' } },
        { title: 'Span B: ', value: { text: fmt(cur.spanB), color: '#f23645' } },
      ],
    }
  },

  calc: (dataList, indicator) => {
    const [tenkanLen = 9, kijunLen = 26, senkouBLen = 52] = indicator.calcParams
    const n = dataList.length
    const result = new Array(n)

    for (let i = 0; i < n; i++) {
      let tenkan = null
      let kijun = null
      let spanA = null
      let spanB = null
      let chikou = null

      // Tenkan-sen
      if (i >= tenkanLen - 1) {
        const { highest, lowest } = getHighestLowest(dataList, i - tenkanLen + 1, i)
        tenkan = (highest + lowest) / 2
      }

      // Kijun-sen
      if (i >= kijunLen - 1) {
        const { highest, lowest } = getHighestLowest(dataList, i - kijunLen + 1, i)
        kijun = (highest + lowest) / 2
      }

      // Senkou Span A (tính từ Tenkan + Kijun)
      if (tenkan != null && kijun != null) {
        spanA = (tenkan + kijun) / 2
      }

      // Senkou Span B
      if (i >= senkouBLen - 1) {
        const { highest, lowest } = getHighestLowest(dataList, i - senkouBLen + 1, i)
        spanB = (highest + lowest) / 2
      }

      // Chikou Span
      chikou = dataList[i].close

      result[i] = {
        tenkan,
        kijun,
        spanA,
        spanB,
        chikou,
      }
    }

    return result
  },
}
