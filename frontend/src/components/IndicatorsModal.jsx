import React, { useState } from 'react'
import { Search, X, Check, Star, Sparkles, Activity, BarChart2 } from 'lucide-react'

export const AVAILABLE_INDICATORS = [
  // Custom VN Indicators & High-impact TradingView Community
  {
    name: 'SUPERTREND',
    title: 'SuperTrend (Olivier Seban)',
    author: 'Olivier Seban',
    category: 'TREND',
    isOverlay: true,
    description: 'Chỉ báo xu hướng hàng đầu TradingView dựa trên biến động ATR (10, 3.0). Dải Xanh (#089981) báo điểm Mua & giữ vị thế tăng, dải Đỏ (#f23645) báo điểm Bán & cắt lỗ.',
    tags: ['SuperTrend', 'Xu hướng', 'Điểm Mua Bán', 'ATR', 'Overlay', 'Custom VN'],
  },
  {
    name: 'VOLUME_PROFILE',
    title: 'Volume Profile (Volume Kháng cự & Hỗ trợ)',
    author: 'TradingView Style',
    category: 'VOLUME',
    isOverlay: true,
    description: 'Khối lượng giao dịch theo bước giá (Volume by Price). Tự động xác định đường POC (vùng tập trung volume khủng nhất) cùng dải giá trị VAH / VAL (70% volume).',
    tags: ['Volume Profile', 'Kháng cự', 'Hỗ trợ', 'POC', 'VAH', 'VAL', 'Vùng biến động', 'Overlay'],
  },
  {
    name: 'ICHIMOKU',
    title: 'Mây Ichimoku Kinko Hyo',
    author: 'Goichi Hosoda',
    category: 'TREND',
    isOverlay: true,
    description: 'Hệ thống giao dịch toàn diện chuẩn Nhật Bản: Tenkan-sen (9), Kijun-sen (26), Mây Kumo hỗ trợ/kháng cự (Senkou Span A & B 52), Chikou Span (26).',
    tags: ['Ichimoku', 'Mây Kumo', 'Tenkan', 'Kijun', 'Xu hướng', 'Overlay'],
  },
  {
    name: 'VWAP',
    title: 'VWAP (Volume Weighted Average Price)',
    author: 'Institutional',
    category: 'TREND',
    isOverlay: true,
    description: 'Giá bình quân gia quyền theo khối lượng kèm dải độ lệch chuẩn. Chuẩn mực đo lường vị thế gom hàng/xả hàng của dòng tiền tổ chức trong phiên.',
    tags: ['VWAP', 'Dòng tiền', 'Giá bình quân', 'Lướt sóng', 'Overlay'],
  },
  {
    name: 'SQUEEZE_MOMENTUM',
    title: 'Squeeze Momentum Indicator (Top #1 TradingView)',
    author: 'LazyBear',
    category: 'CUSTOM_VN',
    isOverlay: false,
    description: 'Chỉ báo #1 nhiều like nhất TradingView (~92.000 likes). Phát hiện các giai đoạn nén chặt tích lũy (Bollinger Bands trong Keltner Channel) và bùng nổ xu hướng kèm động lượng hồi quy tuyến tính.',
    tags: ['Squeeze Momentum', 'LazyBear', 'Top 1 TV', 'Nén giá', 'Bùng nổ', 'Động lượng', 'Custom VN'],
  },
  {
    name: 'WAVETREND',
    title: 'WaveTrend Oscillator (Top #3 TradingView)',
    author: 'LazyBear',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Chỉ báo dao động đỉnh cao (~55.000 likes). Bắt trọn chân sóng đảo chiều nhờ giao cắt WT1/WT2 tại vùng quá bán (<-50) và cảnh báo chốt lời tại vùng quá mua (>+50).',
    tags: ['WaveTrend', 'LazyBear', 'Dao động', 'Đảo chiều', 'Quá mua/Quá bán', 'Top 3 TV'],
  },
  {
    name: 'CM_MACD_MTF',
    title: 'CM MACD Custom MTF',
    author: 'ChrisMoody',
    category: 'CUSTOM_VN',
    isOverlay: false,
    description: 'Chỉ báo MACD đa khung thời gian chuẩn ChrisMoody. Signal dùng SMA(9), Histogram 4 màu động lượng, MACD đổi màu động Xanh/Đỏ, chấm tròn giao cắt.',
    tags: ['MACD', 'MTF', 'Động lượng', 'Custom VN'],
  },
  {
    name: 'ADX_DI',
    title: 'ADX and DI',
    author: 'BeikabuOyaji',
    category: 'CUSTOM_VN',
    isOverlay: false,
    description: 'Đo lường sức mạnh và phương hướng xu hướng. DI+/DI- làm mượt chuẩn Wilder, đường ADX dùng SMA(DX, 14) thay vì RMA, kèm ngưỡng tham chiếu 20.',
    tags: ['ADX', 'DI', 'Sức mạnh xu hướng', 'Custom VN'],
  },
  {
    name: 'WEIS_WAVE',
    title: 'Weis Wave Volume',
    author: 'LazyBear',
    category: 'CUSTOM_VN',
    isOverlay: false,
    description: 'Thuật toán cộng dồn khối lượng theo sóng giá (trendDetectionLength = 2), định dạng số lớn gọn gàng (1.5M, 250K), sóng tăng Xanh, sóng giảm Đỏ.',
    tags: ['Weis Wave', 'Volume', 'Dòng tiền', 'Custom VN'],
  },
  {
    name: 'MFI',
    title: 'Money Flow Index (MFI - Chỉ số Dòng tiền)',
    author: 'Gene Quong & Avrum Soudack',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Chỉ báo đo lường áp lực mua bán kết hợp cả Giá và Khối lượng (RSI có trọng số Volume). Vùng quá mua > 80, quá bán < 20, báo hiệu phân kỳ đảo chiều sớm.',
    tags: ['MFI', 'Dòng tiền', 'Động lượng', 'Quá mua/Quá bán'],
  },
  {
    name: 'OBV',
    title: 'On Balance Volume (OBV - Khối lượng cân bằng)',
    author: 'Joseph Granville',
    category: 'VOLUME',
    isOverlay: false,
    description: 'Chỉ số khối lượng cân bằng cộng dồn theo các phiên tăng giảm. Nhận biết sớm dòng tiền cá mập âm thầm gom hàng trước khi giá bùng nổ.',
    tags: ['OBV', 'Khối lượng', 'Tích lũy', 'Dòng tiền'],
  },
  // Technical Overlays (Chồng lên biểu đồ nến)
  {
    name: 'EMA',
    title: 'Moving Average Exponential (EMA)',
    author: 'KLineCharts',
    category: 'TREND',
    isOverlay: true,
    description: 'Đường trung bình động hàm mũ gán trọng số lớn hơn cho các phiên giao dịch gần nhất, phản ứng nhanh hơn với biến động giá.',
    tags: ['Xu hướng', 'Overlay'],
  },
  {
    name: 'MA',
    title: 'Moving Average (MA / SMA)',
    author: 'KLineCharts',
    category: 'TREND',
    isOverlay: true,
    description: 'Đường trung bình động giản đơn (SMA) làm mượt biến động giá để xác định xu hướng chủ đạo.',
    tags: ['Xu hướng', 'Overlay'],
  },
  {
    name: 'BOLL',
    title: 'Bollinger Bands (BOLL)',
    author: 'John Bollinger',
    category: 'TREND',
    isOverlay: true,
    description: 'Dải Bollinger Bands gồm dải giữa (SMA 20) và 2 dải biên đo lường độ lệch chuẩn và độ biến động thị trường.',
    tags: ['Biến động', 'Kênh giá', 'Overlay'],
  },
  {
    name: 'SAR',
    title: 'Parabolic SAR',
    author: 'J. Welles Wilder',
    category: 'TREND',
    isOverlay: true,
    description: 'Chỉ báo điểm dừng và đảo chiều (Stop and Reverse) hỗ trợ xác định xu hướng và điểm đặt cắt lỗ di động.',
    tags: ['Đảo chiều', 'Overlay'],
  },
  // Technical Sub-panes & Overlays
  {
    name: 'VOL',
    title: 'Volume (Khối lượng giao dịch chân nến)',
    author: 'TradingView Style',
    category: 'VOLUME',
    isOverlay: true,
    description: 'Khối lượng giao dịch chân nến (tối đa 18% chiều cao), không làm lệch trục giá bên phải, rê chuột xem số lượng CP.',
    tags: ['Volume', 'Thanh khoản', 'Overlay'],
  },
  {
    name: 'RSI',
    title: 'Relative Strength Index (RSI)',
    author: 'J. Welles Wilder',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Chỉ số sức mạnh tương đối (RSI 14) đo lường tốc độ và sự thay đổi của biến động giá, vùng quá mua > 70, quá bán < 30.',
    tags: ['Động lượng', 'Quá mua/Quá bán'],
  },
  {
    name: 'MACD',
    title: 'MACD Chuẩn (Standard)',
    author: 'Gerald Appel',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Đường trung bình động hội tụ phân kỳ tiêu chuẩn (12, 26, 9) với đường Signal EMA và Histogram.',
    tags: ['Động lượng', 'Xu hướng'],
  },
  {
    name: 'KDJ',
    title: 'KDJ Indicator',
    author: 'George Lane',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Chỉ báo ngẫu nhiên mở rộng từ Stochastic Oscillator với 3 đường %K, %D, và %J xác định vùng đảo chiều.',
    tags: ['Động lượng', 'Ngẫu nhiên'],
  },
  // 18 TradingView Sub-pane Indicators (Oscillators, Volatility, Volume & Trend)
  {
    name: 'STOCH_RSI',
    title: 'Stochastic RSI (StochRSI)',
    author: 'Tushar Chande & Stanley Kroll',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Áp dụng công thức Stochastic lên chính chỉ số RSI (3, 3, 14, 14). Rất nhạy trong việc bắt điểm đảo chiều sớm tại vùng Quá bán (<20) và Quá mua (>80).',
    tags: ['StochRSI', 'Động lượng', 'Quá mua/Quá bán', 'TradingView', 'Backtest'],
  },
  {
    name: 'WILLIAMS_VIX_FIX',
    title: 'CM Williams Vix Fix (Bắt đáy Top #2 TradingView)',
    author: 'ChrisMoody',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Chỉ báo #2 nhiều like nhất TradingView (~65k likes). Đo lường tâm lý hoảng loạn để phát hiện chính xác đáy ngắn/trung hạn (cột Xanh lá nổi bật khi chạm ngưỡng đáy).',
    tags: ['Vix Fix', 'Bắt đáy', 'ChrisMoody', 'Top 2 TV', 'TradingView', 'Backtest'],
  },
  {
    name: 'STC',
    title: 'Schaff Trend Cycle (STC)',
    author: 'Doug Schaff',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Kết hợp ưu điểm chu kỳ Stochastic và MACD (10, 23, 50) giúp phát hiện đảo chiều xu hướng nhanh hơn MACD truyền thống. Cắt lên 25 báo Mua, cắt xuống 75 báo Bán.',
    tags: ['STC', 'Chu kỳ', 'MACD', 'TradingView', 'Backtest'],
  },
  {
    name: 'CMF',
    title: 'Chaikin Money Flow (CMF - Dòng tiền tổ chức)',
    author: 'Marc Chaikin',
    category: 'VOLUME',
    isOverlay: false,
    description: 'Đo lường dòng tiền tích lũy hay phân phối trong 20 phiên dựa trên vị trí giá đóng cửa trong biên độ nến và khối lượng. CMF > 0 xác nhận dòng tiền lớn đang vào.',
    tags: ['CMF', 'Dòng tiền', 'Volume', 'TradingView', 'Backtest'],
  },
  {
    name: 'TSI',
    title: 'True Strength Index (TSI)',
    author: 'William Blau',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Chỉ số sức mạnh thực tế làm mượt 2 lần EMA (25, 13, 13) giúp lọc nhiễu cực tốt. Giao cắt TSI/Signal báo hiệu chuyển pha xu hướng tin cậy.',
    tags: ['TSI', 'Động lượng', 'Giao cắt', 'TradingView', 'Backtest'],
  },
  {
    name: 'UO',
    title: 'Ultimate Oscillator (UO)',
    author: 'Larry Williams',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Tổng hợp áp lực mua ở 3 khung thời gian ngắn-trung-dài (7, 14, 28) để hạn chế tín hiệu nhiễu phân kỳ giả so với chỉ báo 1 chu kỳ.',
    tags: ['UO', 'Đa chu kỳ', 'Quá mua/Quá bán', 'TradingView', 'Backtest'],
  },
  {
    name: 'ELDER_RAY',
    title: 'Elder-Ray Index (Bull & Bear Power)',
    author: 'Dr. Alexander Elder',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Đo lường sức mạnh phe Bò (High - EMA13) và phe Gấu (Low - EMA13). Nhận biết lực đẩy thực sự của bên mua/bán so với giá trị hợp lý.',
    tags: ['Elder Ray', 'Bull Power', 'Bear Power', 'TradingView', 'Backtest'],
  },
  {
    name: 'CMO',
    title: 'Chande Momentum Oscillator (CMO)',
    author: 'Tushar Chande',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Chỉ báo động lượng dao động từ -100 đến +100 với hai ngưỡng ±50, phản ánh thuần túy chênh lệch sức tăng và sức giảm trong 14 phiên.',
    tags: ['CMO', 'Động lượng', 'TradingView', 'Backtest'],
  },
  {
    name: 'FORCE_INDEX',
    title: "Elder's Force Index (EFI - Chỉ số Lực đẩy)",
    author: 'Dr. Alexander Elder',
    category: 'VOLUME',
    isOverlay: false,
    description: 'Kết hợp biên độ thay đổi giá và khối lượng (EMA 13) để đo sức mạnh thực chất đằng sau mỗi nhịp tăng/giảm giá.',
    tags: ['Force Index', 'EFI', 'Volume', 'Dòng tiền', 'TradingView', 'Backtest'],
  },
  {
    name: 'CHOP',
    title: 'Choppiness Index (CHOP - Đo thị trường đi ngang)',
    author: 'E.W. Dreiss',
    category: 'TREND',
    isOverlay: false,
    description: 'Xác định thị trường đang có sóng xu hướng (<38.2) hay tích lũy đi ngang (>61.8) để tránh bị cắt lỗ liên tục trong vùng sideway.',
    tags: ['CHOP', 'Sideway', 'Xu hướng', 'TradingView', 'Backtest'],
  },
  {
    name: 'VORTEX',
    title: 'Vortex Indicator (VI+ / VI-)',
    author: 'Etienne Botes & Douglas Siepman',
    category: 'TREND',
    isOverlay: false,
    description: 'Hai đường VI+ (Xanh) và VI- (Đỏ) bắt nhịp khởi đầu và kết thúc của một xu hướng mới thông qua giao cắt quanh trục 1.0.',
    tags: ['Vortex', 'Xu hướng', 'Giao cắt', 'TradingView', 'Backtest'],
  },
  {
    name: 'RVI',
    title: 'Relative Vigor Index (RVI)',
    author: 'John Ehlers',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Đo năng lượng xu hướng bằng tỷ lệ giữa giá Đóng-Mở cửa so với biên độ Cao-Thấp kèm đường Signal mượt mà.',
    tags: ['RVI', 'Động lượng', 'John Ehlers', 'TradingView', 'Backtest'],
  },
  {
    name: 'ATR',
    title: 'Average True Range (ATR - Biên độ biến động)',
    author: 'J. Welles Wilder',
    category: 'TREND',
    isOverlay: false,
    description: 'Đo lường độ biến động thực trung bình 14 phiên. Hữu ích để đặt khoảng cắt lỗ Stop-Loss hợp lý và nhận biết phiên bùng nổ biến động.',
    tags: ['ATR', 'Biến động', 'Stop Loss', 'TradingView', 'Backtest'],
  },
  {
    name: 'CCI',
    title: 'Commodity Channel Index (CCI 20)',
    author: 'Donald Lambert',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Đo độ lệch giá so với mức trung bình thống kê (20 phiên). Vượt +100 báo xung lực mạnh/quá mua, cắt lên từ -100 báo hiệu hồi phục tạo đáy.',
    tags: ['CCI', 'Động lượng', 'Quá mua/Quá bán', 'TradingView', 'Backtest'],
  },
  {
    name: 'WR',
    title: 'Williams %R (Williams Percent Range)',
    author: 'Larry Williams',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Dao động từ 0 đến -100 đo vị thế giá đóng cửa so với đỉnh/đáy 14 phiên. Vùng -80 đến -100 là quá bán; 0 đến -20 là quá mua.',
    tags: ['Williams %R', 'WR', 'Đảo chiều', 'TradingView', 'Backtest'],
  },
  {
    name: 'AO',
    title: 'Awesome Oscillator (AO - Động lượng Bill Williams)',
    author: 'Bill Williams',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Chênh lệch giữa SMA(5) và SMA(34) của giá trung vị (HL/2). Histogram chuyển xanh vượt trục 0 báo hiệu động lượng tăng áp đảo.',
    tags: ['AO', 'Awesome Oscillator', 'Bill Williams', 'TradingView', 'Backtest'],
  },
  {
    name: 'ROC',
    title: 'Rate of Change (ROC - Tốc độ thay đổi giá)',
    author: 'Momentum Classic',
    category: 'MOMENTUM',
    isOverlay: false,
    description: 'Đo tỷ lệ phần trăm thay đổi giá hiện tại so với 12 phiên trước. ROC vượt trục 0 và dốc lên cho thấy đà tăng giá đang gia tốc.',
    tags: ['ROC', 'Tốc độ giá', 'Động lượng', 'TradingView', 'Backtest'],
  },
  {
    name: 'TRIX',
    title: 'TRIX (Triple Exponential Average)',
    author: 'Jack Hutson',
    category: 'TREND',
    isOverlay: false,
    description: 'Tốc độ biến thiên của đường EMA làm mượt 3 lần (12, 9), lọc bỏ hoàn toàn nhiễu ngắn hạn để giữ trọn các sóng tăng trung hạn.',
    tags: ['TRIX', 'Xu hướng', 'EMA', 'TradingView', 'Backtest'],
  },
]

export default function IndicatorsModal({ isOpen, onClose, activeIndicators, onToggleIndicator }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')

  if (!isOpen) return null

  const filtered = AVAILABLE_INDICATORS.filter((ind) => {
    const matchesCategory =
      activeCategory === 'ALL' ||
      (activeCategory === 'CUSTOM_VN' && ind.category === 'CUSTOM_VN') ||
      (activeCategory === 'SUB_PANE' && !ind.isOverlay) ||
      (activeCategory === 'TREND' && ind.category === 'TREND') ||
      (activeCategory === 'MOMENTUM' && (ind.category === 'MOMENTUM' || ind.category === 'VOLUME'))

    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      ind.name.toLowerCase().includes(q) ||
      ind.title.toLowerCase().includes(q) ||
      ind.description.toLowerCase().includes(q) ||
      ind.tags.some((t) => t.toLowerCase().includes(q))

    return matchesCategory && matchesSearch
  })

  return (
    <div className="tv-modal-backdrop" onClick={onClose}>
      <div className="tv-modal-box tv-indicators-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tv-modal-header">
          <div className="tv-modal-title">
            <Sparkles size={18} color="#58a6ff" />
            <span>Bảng chỉ báo, Số liệu &amp; Chiến lược (Indicators)</span>
          </div>
          <button className="tv-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="tv-indicators-search-bar">
          <Search size={16} className="tv-search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm chỉ báo (VD: MACD, ADX, Weis Wave, RSI, EMA)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="tv-indicators-search-input"
            autoFocus
          />
          {search && (
            <button className="tv-icon-btn" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="tv-indicators-body">
          <div className="tv-indicators-sidebar">
            {[
              { id: 'ALL', label: `Tất cả (${AVAILABLE_INDICATORS.length})`, icon: <Star size={14} /> },
              { id: 'SUB_PANE', label: `Chỉ báo phụ (${AVAILABLE_INDICATORS.filter((i) => !i.isOverlay).length})`, icon: <BarChart2 size={14} color="#38bdf8" /> },
              { id: 'CUSTOM_VN', label: 'Chỉ báo Custom VN', icon: <Sparkles size={14} color="#f1e05a" /> },
              { id: 'TREND', label: 'Xu hướng & Biến động', icon: <Activity size={14} /> },
              { id: 'MOMENTUM', label: 'Động lượng & Volume', icon: <BarChart2 size={14} /> },
            ].map((cat) => (
              <button
                key={cat.id}
                className={`tv-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="tv-indicators-list">
            {filtered.length === 0 && (
              <div className="tv-list-empty">Không tìm thấy chỉ báo phù hợp</div>
            )}
            {filtered.map((ind) => {
              const isActive = activeIndicators.some((ai) => ai.name === ind.name)
              const isCustom = ind.category === 'CUSTOM_VN'
              return (
                <div key={ind.name} className={`tv-ind-card ${isActive ? 'is-active' : ''}`}>
                  <div className="tv-ind-card-info">
                    <div className="tv-ind-card-title-row">
                      <span className="tv-ind-name">{ind.title}</span>
                      <span className="tv-ind-code">({ind.name})</span>
                      {isCustom && <span className="tv-tag-custom-vn">🇻🇳 Custom VN</span>}
                      {ind.isOverlay ? (
                        <span className="tv-tag-overlay">Chồng nến (Overlay)</span>
                      ) : (
                        <span className="tv-tag-subpane">Khung phụ (Sub-pane)</span>
                      )}
                    </div>
                    <div className="tv-ind-desc">{ind.description}</div>
                    <div className="tv-ind-tags">
                      Tác giả: <b>{ind.author}</b>
                      {ind.tags.map((tag) => (
                        <span key={tag} className="tv-mini-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="tv-ind-card-action">
                    {isActive ? (
                      <button
                        className="tv-btn-remove-ind"
                        onClick={() => onToggleIndicator(ind.name)}
                        title="Tắt chỉ báo này"
                      >
                        <Check size={14} />
                        Đang bật • Tắt
                      </button>
                    ) : (
                      <button
                        className="tv-btn-add-ind"
                        onClick={() => onToggleIndicator(ind.name)}
                        title="Thêm chỉ báo vào biểu đồ"
                      >
                        + Thêm vào biểu đồ
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
