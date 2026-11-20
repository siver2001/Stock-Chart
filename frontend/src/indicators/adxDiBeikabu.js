/**
 * ADX and DI (BeikabuOyaji)
 * Exact TradingView parity:
 * - Smoothed TR, +DM, -DM use Wilder recursive smoothing: S[i] = S[i-1] - S[i-1]/len + X[i]
 * - ADX = SMA(DX, len) (NOT RMA!)
 * - Threshold reference line at th (default 20)
 */

export const adxDiBeikabuIndicator = {
  name: 'ADX_DI',
  shortName: 'ADX & DI',
  calcParams: [14, 20],
  precision: 2,
  figures: [
    {
      key: 'diPlus',
      title: 'DI+: ',
      type: 'line',
      styles: () => ({ color: '#00c853', size: 1.5 }),
    },
    {
      key: 'diMinus',
      title: 'DI-: ',
      type: 'line',
      styles: () => ({ color: '#ff1744', size: 1.5 }),
    },
    {
      key: 'adx',
      title: 'ADX: ',
      type: 'line',
      styles: () => ({ color: '#2979ff', size: 2 }),
    },
    {
      key: 'th',
      title: 'TH: ',
      type: 'line',
      styles: () => ({ color: '#787b86', style: 'dashed', size: 1 }),
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
        name: 'ADX & DI',
        calcParamsText: `(${indicator.calcParams.join(',')})`,
        icons: [],
        values: [],
      }
    }

    return {
      name: 'ADX & DI',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        {
          title: 'DI+: ',
          value: {
            text: cur.diPlus != null ? Number(cur.diPlus).toFixed(2) : '--',
            color: '#00c853',
          },
        },
        {
          title: 'DI-: ',
          value: {
            text: cur.diMinus != null ? Number(cur.diMinus).toFixed(2) : '--',
            color: '#ff1744',
          },
        },
        {
          title: 'ADX: ',
          value: {
            text: cur.adx != null ? Number(cur.adx).toFixed(2) : '--',
            color: '#2979ff',
          },
        },
        {
          title: 'TH: ',
          value: {
            text: cur.th != null ? Number(cur.th).toFixed(0) : '20',
            color: '#787b86',
          },
        },
      ],
    }
  },
  calc: (dataList, indicator) => {
    const [len = 14, th = 20] = indicator.calcParams
    const n = dataList.length
    const dxArr = new Array(n).fill(0)
    const diPlusArr = new Array(n).fill(0)
    const diMinusArr = new Array(n).fill(0)

    let sTr = 0
    let sDmp = 0
    let sDmm = 0

    for (let i = 0; i < n; i++) {
      const cur = dataList[i]
      let tr = cur.high - cur.low
      let dmp = 0
      let dmm = 0

      if (i > 0) {
        const prev = dataList[i - 1]
        tr = Math.max(
          cur.high - cur.low,
          Math.abs(cur.high - prev.close),
          Math.abs(cur.low - prev.close)
        )
        const up = cur.high - prev.high
        const dn = prev.low - cur.low
        dmp = up > dn && up > 0 ? up : 0
        dmm = dn > up && dn > 0 ? dn : 0
        sTr = sTr - sTr / len + tr
        sDmp = sDmp - sDmp / len + dmp
        sDmm = sDmm - sDmm / len + dmm
      } else {
        sTr = tr
        sDmp = 0
        sDmm = 0
      }

      const dip = sTr > 0 ? (sDmp / sTr) * 100 : 0
      const dim = sTr > 0 ? (sDmm / sTr) * 100 : 0
      const sum = dip + dim
      const dx = sum > 0 ? (Math.abs(dip - dim) / sum) * 100 : 0

      diPlusArr[i] = dip
      diMinusArr[i] = dim
      dxArr[i] = dx
    }

    return dataList.map((_, i) => {
      let adx = null
      if (i >= len - 1) {
        let sumDx = 0
        for (let j = i - len + 1; j <= i; j++) sumDx += dxArr[j]
        adx = sumDx / len
      }
      return {
        diPlus: diPlusArr[i],
        diMinus: diMinusArr[i],
        adx,
        th,
      }
    })
  },
}
