/**
 * Money Flow Index (MFI) - Chỉ số dòng tiền
 * Được mệnh danh là "RSI có trọng số Volume"
 * Nhận diện dòng tiền lớn gom hàng hoặc phân phối sớm
 */

export const mfiIndicator = {
  name: 'MFI',
  shortName: 'MFI',
  calcParams: [14],
  precision: 2,

  figures: [
    {
      key: 'mfi',
      title: 'MFI: ',
      type: 'line',
      styles: () => ({ color: '#06b6d4', size: 2 }),
    },
    {
      key: 'overbought',
      title: '',
      type: 'line',
      styles: () => ({ color: '#ef4444', style: 'dashed', size: 1 }),
    },
    {
      key: 'oversold',
      title: '',
      type: 'line',
      styles: () => ({ color: '#10b981', style: 'dashed', size: 1 }),
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

    if (!cur || cur.mfi == null) {
      return {
        name: 'MFI',
        calcParamsText: `(${indicator.calcParams.join(',')})`,
        icons: [],
        values: [],
      }
    }

    const val = Number(cur.mfi).toFixed(2)
    const color = cur.mfi >= 80 ? '#ef4444' : cur.mfi <= 20 ? '#10b981' : '#06b6d4'

    return {
      name: 'MFI',
      calcParamsText: `(${indicator.calcParams.join(',')})`,
      icons: [],
      values: [
        {
          title: 'MFI (Dòng tiền): ',
          value: { text: val, color },
        },
      ],
    }
  },

  calc: (dataList, indicator) => {
    const [period = 14] = indicator.calcParams
    const n = dataList.length
    const typPrices = dataList.map((d) => (d.high + d.low + d.close) / 3)
    const rawMoneyFlow = dataList.map((d, i) => typPrices[i] * (d.volume || 0))

    const posFlow = new Array(n).fill(0)
    const negFlow = new Array(n).fill(0)

    for (let i = 1; i < n; i++) {
      if (typPrices[i] > typPrices[i - 1]) {
        posFlow[i] = rawMoneyFlow[i]
      } else if (typPrices[i] < typPrices[i - 1]) {
        negFlow[i] = rawMoneyFlow[i]
      }
    }

    return dataList.map((_, i) => {
      if (i < period) {
        return {
          mfi: null,
          overbought: 80,
          oversold: 20,
        }
      }

      let sumPos = 0
      let sumNeg = 0
      for (let j = i - period + 1; j <= i; j++) {
        sumPos += posFlow[j]
        sumNeg += negFlow[j]
      }

      let mfi = 50
      if (sumNeg === 0) {
        mfi = 100
      } else {
        const mr = sumPos / sumNeg
        mfi = 100 - 100 / (1 + mr)
      }

      return {
        mfi,
        overbought: 80,
        oversold: 20,
      }
    })
  },
}
