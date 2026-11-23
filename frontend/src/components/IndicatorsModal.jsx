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
]

export default function IndicatorsModal({ isOpen, onClose, activeIndicators, onToggleIndicator }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')

  if (!isOpen) return null

  const filtered = AVAILABLE_INDICATORS.filter((ind) => {
    const matchesCategory =
      activeCategory === 'ALL' ||
      (activeCategory === 'CUSTOM_VN' && ind.category === 'CUSTOM_VN') ||
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
              { id: 'ALL', label: 'Tất cả chỉ báo', icon: <Star size={14} /> },
              { id: 'CUSTOM_VN', label: '3 Chỉ báo Custom VN', icon: <Sparkles size={14} color="#f1e05a" /> },
              { id: 'TREND', label: 'Xu hướng & Kênh giá', icon: <Activity size={14} /> },
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
