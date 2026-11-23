import React, { useState } from 'react'
import {
  Crosshair,
  TrendingUp,
  Minus,
  Maximize2,
  Square,
  Hash,
  Trash2,
  ArrowUpRight,
  ArrowRight,
  Circle,
  Triangle,
  Ruler,
  Type,
  Split,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  Compass,
  Radio,
  Target,
  MessageSquare,
  Tag,
  GitCommit,
  Layers,
  Activity,
  Network,
  Clock,
  ArrowUp,
  ArrowDown,
  Star,
  Magnet,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Flame,
  Bookmark,
  Pin,
  MapPin,
  Flag,
  BarChart2,
  Grid,
  Calendar,
  Percent,
  Sparkles,
  MousePointer,
  PenTool,
  Highlighter,
} from 'lucide-react'

// Cấu trúc danh mục công cụ vẽ chuẩn 100% TradingView
export const DRAWING_CATEGORIES = [
  // 1. Con trỏ (Cursor)
  {
    category: 'CURSOR',
    title: 'Con trỏ',
    defaultIcon: <Crosshair size={16} />,
    sections: [
      {
        title: 'CON TRỎ',
        tools: [
          { id: 'crosshair', name: 'Con trỏ chữ thập (Crosshair)', icon: <Crosshair size={16} /> },
          { id: 'dot', name: 'Dấu chấm (Dot)', icon: <Circle size={10} fill="currentColor" /> },
          { id: 'arrowCursor', name: 'Mũi tên con trỏ (Arrow)', icon: <MousePointer size={16} /> },
        ],
      },
    ],
  },

  // 2. Đường xu hướng & Kênh giá (Trend Lines)
  {
    category: 'LINES',
    title: 'Đường xu hướng & Kênh giá',
    defaultIcon: <TrendingUp size={16} />,
    sections: [
      {
        title: 'ĐƯỜNG XU HƯỚNG',
        tools: [
          { id: 'segment', name: 'Đoạn xu hướng (Trend Line)', icon: <TrendingUp size={16} color="#2962ff" /> },
          { id: 'rayLine', name: 'Tia xu hướng (Ray Line)', icon: <ArrowUpRight size={16} /> },
          { id: 'infoLine', name: 'Đường thông tin (Info Line - Đo góc, %, nến)', icon: <Activity size={16} color="#089981" /> },
          { id: 'trendAngle', name: 'Góc xu hướng (Trend Angle)', icon: <Compass size={16} color="#e3b341" /> },
          { id: 'straightLine', name: 'Đường thẳng mở rộng (Extended Line)', icon: <Split size={16} /> },
          { id: 'horizontalStraightLine', name: 'Đường nằm ngang (Horizontal Line)', icon: <Minus size={16} /> },
          { id: 'horizontalRayLine', name: 'Tia nằm ngang (Horizontal Ray)', icon: <Minus size={16} style={{ borderBottom: '1px dotted' }} /> },
          { id: 'verticalStraightLine', name: 'Đường thẳng đứng (Vertical Line)', icon: <Minus size={16} style={{ transform: 'rotate(90deg)' }} /> },
          { id: 'crossLine', name: 'Đường chữ thập tâm điểm (Cross Line)', icon: <Target size={16} color="#58a6ff" /> },
          { id: 'priceChannelLine', name: 'Kênh giá song song (Parallel Channel)', icon: <Maximize2 size={16} color="#089981" /> },
        ],
      },
    ],
  },

  // 3. Fibonacci & Gann (Hình 1)
  {
    category: 'FIBONACCI_GANN',
    title: 'Bộ công cụ Fibonacci & Gann',
    defaultIcon: <Hash size={16} color="#2962ff" />,
    sections: [
      {
        title: 'FIBONACCI',
        tools: [
          { id: 'fibonacciLine', name: 'Fib thoái lui (Fib Retracement)', hotkey: 'Alt + F', icon: <Hash size={16} color="#2962ff" /> },
          { id: 'fibExtension', name: 'Phần mở rộng fib dựa trên xu hướng', icon: <Layers size={16} color="#a855f7" /> },
          { id: 'fibChannel', name: 'Kênh Fib', icon: <Maximize2 size={16} color="#089981" /> },
          { id: 'fibTimeZone', name: 'Fib múi giờ', icon: <Clock size={16} color="#f59e0b" /> },
          { id: 'fibFan', name: 'Fib kháng cự dạng quạt', icon: <Radio size={16} color="#ec4899" /> },
          { id: 'trendBasedFibTime', name: 'Thời gian fib dựa trên xu hướng', icon: <Calendar size={16} color="#06b6d4" /> },
          { id: 'fibCircles', name: 'Chu kỳ Fib', icon: <Circle size={16} color="#06b6d4" /> },
          { id: 'fibSpeedResistanceArcs', name: 'Fib kháng cự dạng cung', icon: <Compass size={16} color="#e3b341" /> },
          { id: 'fibSpiral', name: 'Fib xoắn ốc', icon: <Sparkles size={16} color="#ec4899" /> },
        ],
      },
      {
        title: 'GANN',
        tools: [
          { id: 'gannBox', name: 'Mô hình hộp Gann (Gann Box)', icon: <Grid size={16} color="#3b82f6" /> },
          { id: 'gannSquareFixed', name: 'Hình vuông Gann cố định', icon: <Square size={16} color="#8b5cf6" /> },
          { id: 'gannSquare', name: 'Hình vuông Gann', icon: <Square size={16} color="#10b981" /> },
          { id: 'gannFan', name: 'Quạt Gann (Gann Fan)', icon: <Radio size={16} color="#f59e0b" /> },
        ],
      },
    ],
  },

  // 4. Hình học & Nét vẽ (Shapes & Brushes)
  {
    category: 'SHAPES',
    title: 'Hình học & Nét vẽ',
    defaultIcon: <Square size={16} />,
    sections: [
      {
        title: 'HÌNH HỌC',
        tools: [
          { id: 'rect', name: 'Hình chữ nhật / Hộp Darvas', icon: <Square size={16} color="#2962ff" /> },
          { id: 'ellipse', name: 'Hình elip (Ellipse)', icon: <Circle size={16} style={{ transform: 'scaleX(1.3)' }} color="#e3b341" /> },
          { id: 'circle', name: 'Hình tròn (Circle)', icon: <Circle size={16} color="#089981" /> },
          { id: 'triangle', name: 'Hình tam giác (Triangle)', icon: <Triangle size={16} color="#ec4899" /> },
          { id: 'arc', name: 'Cung hình vòm (Arc)', icon: <Compass size={16} color="#a855f7" /> },
        ],
      },
      {
        title: 'NÉT VẼ',
        tools: [
          { id: 'brush', name: 'Cọ vẽ (Brush)', icon: <PenTool size={16} color="#f59e0b" /> },
          { id: 'highlighter', name: 'Bút đánh dấu (Highlighter)', icon: <Highlighter size={16} color="#10b981" /> },
        ],
      },
    ],
  },

  // 5. Văn bản & Ghi chú (Text & Annotations - Hình 4)
  {
    category: 'TEXT',
    title: 'Văn bản và Ghi chú',
    defaultIcon: <Type size={16} />,
    sections: [
      {
        title: 'VĂN BẢN VÀ GHI CHÚ',
        tools: [
          { id: 'simpleAnnotation', name: 'Văn bản (Text)', icon: <Type size={16} /> },
          { id: 'priceNote', name: 'Ghi chú giá (Price Note)', icon: <Bookmark size={16} color="#089981" /> },
          { id: 'callout', name: 'Chú thích (Callout)', icon: <MessageSquare size={16} color="#58a6ff" /> },
          { id: 'commentBalloon', name: 'Bình luận (Speech Balloon)', icon: <MessageSquare size={16} color="#e3b341" /> },
          { id: 'priceLabel', name: 'Nhãn giá (Price Label)', icon: <Tag size={16} color="#2962ff" /> },
          { id: 'signpost', name: 'Biển chỉ dẫn (Signpost)', icon: <MapPin size={16} color="#ec4899" /> },
          { id: 'flagMark', name: 'Cờ đánh dấu (Flag Mark)', icon: <Flag size={16} color="#f23645" /> },
          { id: 'arrowMarkerUp', name: 'Mũi tên Mua (Arrow Up)', icon: <ArrowUp size={16} color="#089981" /> },
          { id: 'arrowMarkerDown', name: 'Mũi tên Bán (Arrow Down)', icon: <ArrowDown size={16} color="#f23645" /> },
          { id: 'arrow', name: 'Mũi tên chỉ hướng (Arrow)', icon: <ArrowRight size={16} /> },
        ],
      },
    ],
  },

  // 6. Mô hình biểu đồ & Sóng Elliott (Patterns & Waves - Hình 2)
  {
    category: 'PATTERNS',
    title: 'Mô hình biểu đồ & Sóng Elliott',
    defaultIcon: <Network size={16} color="#a855f7" />,
    sections: [
      {
        title: 'MÔ HÌNH BIỂU ĐỒ',
        tools: [
          { id: 'xabcdPattern', name: 'Mô hình XABCD Harmonics (Gartley/Bat/Butterfly)', icon: <Network size={16} color="#a855f7" /> },
          { id: 'cypherPattern', name: 'Mô hình Cypher', icon: <Network size={16} color="#3b82f6" /> },
          { id: 'headAndShoulders', name: 'Đầu và vai (Head and Shoulders)', icon: <Activity size={16} color="#ec4899" /> },
          { id: 'abcdPattern', name: 'Mô hình ABCD', icon: <Activity size={16} color="#e3b341" /> },
          { id: 'trianglePattern', name: 'Mô hình tam giác (Triangle Pattern)', icon: <Triangle size={16} color="#089981" /> },
          { id: 'threeDrives', name: 'Mô hình Three Drives', icon: <GitCommit size={16} color="#06b6d4" /> },
        ],
      },
      {
        title: 'SÓNG ELLIOTT',
        tools: [
          { id: 'elliottImpulse', name: 'Sóng đẩy Elliott (1-2-3-4-5)', icon: <GitCommit size={16} color="#2962ff" /> },
          { id: 'elliottCorrection', name: 'Sóng điều chỉnh Elliott (A-B-C)', icon: <GitCommit size={16} color="#f23645" /> },
          { id: 'elliottTriangle', name: 'Sóng tam giác Elliott (A-B-C-D-E)', icon: <GitCommit size={16} color="#10b981" /> },
          { id: 'elliottDoubleCombo', name: 'Sóng kết hợp kép Elliott (W-X-Y)', icon: <GitCommit size={16} color="#a855f7" /> },
        ],
      },
      {
        title: 'VÒNG TRÒN / CHU KỲ',
        tools: [
          { id: 'cycleLines', name: 'Các đường chu kỳ (Cycle Lines)', icon: <Split size={16} color="#f59e0b" /> },
        ],
      },
    ],
  },

  // 7. Dự báo, Khối lượng & Thước đo (Predictions, Volume & Measurement - Hình 3)
  {
    category: 'MEASUREMENT',
    title: 'Dự báo, Khối lượng & Công cụ đo',
    defaultIcon: <Ruler size={16} color="#58a6ff" />,
    sections: [
      {
        title: 'DỰ BÁO',
        tools: [
          { id: 'longPosition', name: 'Vị thế mua (Long Position R:R)', icon: <ArrowUpCircle size={16} color="#089981" /> },
          { id: 'shortPosition', name: 'Vị thế bán (Short Position R:R)', icon: <ArrowDownCircle size={16} color="#f23645" /> },
          { id: 'forecast', name: 'Dự báo vị thế (Forecast)', icon: <Target size={16} color="#3b82f6" /> },
        ],
      },
      {
        title: 'DỰA TRÊN KHỐI LƯỢNG',
        tools: [
          { id: 'anchoredVWAP', name: 'VWAP được neo (Anchored VWAP)', icon: <BarChart2 size={16} color="#f59e0b" /> },
        ],
      },
      {
        title: 'CÔNG CỤ ĐO',
        tools: [
          { id: 'priceRange', name: 'Phạm vi giá (Price Range - Thước đo giá & %)', icon: <Ruler size={16} color="#58a6ff" /> },
          { id: 'dateRange', name: 'Phạm vi ngày (Date Range - Số nến & ngày)', icon: <Calendar size={16} color="#089981" /> },
          { id: 'datePriceRange', name: 'Phạm vi ngày và giá (Date & Price Range)', icon: <Maximize2 size={16} color="#a855f7" /> },
          { id: 'priceLine', name: 'Đường mức giá (Price Line)', icon: <Minus size={16} color="#e3b341" /> },
        ],
      },
    ],
  },
]

// Build a fast lookup map for all tools
export const ALL_DRAWING_TOOLS_MAP = {}
DRAWING_CATEGORIES.forEach((cat) => {
  cat.sections.forEach((sec) => {
    sec.tools.forEach((t) => {
      ALL_DRAWING_TOOLS_MAP[t.id] = t
    })
  })
})

export default function DrawingToolbar({
  activeTool: externalActiveTool,
  onSelectTool,
  onSelectOverlay,
  onClearOverlays,
  favorites = [],
  onToggleFavorite,
  showFavoriteToolbar = true,
  onToggleFavoriteToolbar,
  magnetMode = 'off',
  onToggleMagnetMode,
  isContinuousDrawing = false,
  onToggleContinuousDrawing,
  isDrawingsLocked = false,
  onToggleLockDrawings,
  isDrawingsHidden = false,
  onToggleHideDrawings,
}) {
  const [internalActiveTool, setInternalActiveTool] = useState('crosshair')
  const activeTool = externalActiveTool !== undefined ? externalActiveTool : internalActiveTool
  const setActiveTool = onSelectTool || setInternalActiveTool
  const [openFlyout, setOpenFlyout] = useState(null)

  const handleSelect = (toolId) => {
    setActiveTool(toolId)
    setOpenFlyout(null)
    if (toolId === 'crosshair') {
      onSelectOverlay(null)
    } else {
      onSelectOverlay(toolId)
    }
  }

  // Get active tool for a category
  const getActiveForCategory = (cat) => {
    for (const sec of cat.sections) {
      const found = sec.tools.find((t) => t.id === activeTool)
      if (found) return found
    }
    return cat.sections[0]?.tools[0] || { id: 'crosshair', icon: cat.defaultIcon, name: cat.title }
  }

  return (
    <aside className="tv-drawing-toolbar">
      {/* Primary Drawing Categories */}
      <div className="tv-drawing-tools-group">
        {DRAWING_CATEGORIES.map((cat) => {
          const current = getActiveForCategory(cat)
          const allCatTools = cat.sections.flatMap((s) => s.tools)
          const isCatActive = allCatTools.some((t) => t.id === activeTool)
          const hasMultiple = allCatTools.length > 1

          return (
            <div key={cat.category} className="tv-tool-slot">
              <button
                className={`tv-draw-btn ${isCatActive ? 'active' : ''}`}
                onClick={() => handleSelect(current.id)}
                title={current.name}
              >
                {current.icon}
                {hasMultiple && <span className="tv-tool-tiny-arrow">▶</span>}
              </button>

              {hasMultiple && (
                <button
                  className="tv-tool-expand-btn"
                  onClick={() => setOpenFlyout(openFlyout === cat.category ? null : cat.category)}
                  title={`Xem thêm công cụ ${cat.title}`}
                >
                  <ChevronRight size={10} />
                </button>
              )}

              {/* Flyout Submenu with Section Subheaders (TradingView Style) */}
              {openFlyout === cat.category && (
                <div className="tv-tool-flyout" onClick={(e) => e.stopPropagation()}>
                  <div className="tv-flyout-header-title">{cat.title}</div>
                  <div className="tv-flyout-scroll-area">
                    {cat.sections.map((section) => (
                      <div key={section.title} className="tv-flyout-section">
                        <div className="tv-flyout-section-heading">{section.title}</div>
                        {section.tools.map((t) => {
                          const isFav = favorites.includes(t.id)
                          return (
                            <div
                              key={t.id}
                              className={`tv-flyout-item ${activeTool === t.id ? 'active' : ''}`}
                              onClick={() => handleSelect(t.id)}
                            >
                              <span className="tv-flyout-icon">{t.icon}</span>
                              <span className="tv-flyout-name">{t.name}</span>
                              {t.hotkey && <span className="tv-flyout-hotkey">{t.hotkey}</span>}
                              {onToggleFavorite && (
                                <button
                                  className={`tv-flyout-star-btn ${isFav ? 'starred' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onToggleFavorite(t.id)
                                  }}
                                  title={isFav ? 'Bỏ khỏi thanh yêu thích' : 'Thêm vào thanh yêu thích'}
                                >
                                  <Star
                                    size={13}
                                    fill={isFav ? '#f59e0b' : 'none'}
                                    color={isFav ? '#f59e0b' : '#6b7280'}
                                  />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="tv-drawing-tools-divider" />

      {/* Auxiliary Actions Suite (TradingView Bottom Toolbar) */}
      <div className="tv-drawing-tools-group tv-auxiliary-group">
        {/* 1. Nam châm bắt dính giá (Magnet Mode) */}
        {onToggleMagnetMode && (
          <button
            className={`tv-draw-btn ${magnetMode !== 'off' ? 'active active-magnet' : ''}`}
            onClick={onToggleMagnetMode}
            title={
              magnetMode === 'strong'
                ? 'Nam châm mạnh: Hút chặt vào O/H/L/C nến'
                : magnetMode === 'weak'
                ? 'Nam châm nhẹ: Bắt dính khi lại gần nến'
                : 'Bật nam châm bắt dính nến (Magnet Mode)'
            }
          >
            <Magnet size={16} color={magnetMode !== 'off' ? '#2962ff' : 'currentColor'} />
          </button>
        )}

        {/* 2. Khóa chế độ vẽ liên tục (Stay in Drawing Mode) */}
        {onToggleContinuousDrawing && (
          <button
            className={`tv-draw-btn ${isContinuousDrawing ? 'active' : ''}`}
            onClick={onToggleContinuousDrawing}
            title={
              isContinuousDrawing
                ? 'Đang bật vẽ liên tục (Click để tắt)'
                : 'Khóa chế độ vẽ liên tục (Không tự nhảy về con trỏ)'
            }
          >
            <PenTool size={16} color={isContinuousDrawing ? '#2962ff' : 'currentColor'} />
          </button>
        )}

        {/* 3. Khóa tất cả công cụ vẽ (Lock All Drawings) */}
        {onToggleLockDrawings && (
          <button
            className={`tv-draw-btn ${isDrawingsLocked ? 'active' : ''}`}
            onClick={onToggleLockDrawings}
            title={
              isDrawingsLocked
                ? 'Mở khóa tất cả nét vẽ'
                : 'Khóa tất cả nét vẽ (Không cho di chuyển/sửa)'
            }
          >
            {isDrawingsLocked ? <Lock size={16} color="#f59e0b" /> : <Unlock size={16} />}
          </button>
        )}

        {/* 4. Ẩn / Hiện tất cả hình vẽ (Hide/Show Drawings) */}
        {onToggleHideDrawings && (
          <button
            className={`tv-draw-btn ${isDrawingsHidden ? 'active' : ''}`}
            onClick={onToggleHideDrawings}
            title={isDrawingsHidden ? 'Hiện tất cả nét vẽ' : 'Ẩn tất cả nét vẽ'}
          >
            {isDrawingsHidden ? <EyeOff size={16} color="#f23645" /> : <Eye size={16} />}
          </button>
        )}

        {/* 5. Thùng rác xóa toàn bộ hình vẽ */}
        <button
          className="tv-draw-btn tv-draw-trash"
          onClick={() => {
            onClearOverlays()
            handleSelect('crosshair')
          }}
          title="Xóa tất cả nét vẽ trên biểu đồ"
        >
          <Trash2 size={16} />
        </button>

        {/* 6. Bật / Tắt Thanh công cụ Yêu thích nổi (⭐) */}
        {onToggleFavoriteToolbar && (
          <button
            className={`tv-draw-btn ${showFavoriteToolbar ? 'active' : ''}`}
            onClick={onToggleFavoriteToolbar}
            title={
              showFavoriteToolbar
                ? 'Ẩn thanh công cụ yêu thích nổi (Floating Toolbar)'
                : 'Hiện thanh công cụ yêu thích nổi (Floating Toolbar)'
            }
          >
            <Star
              size={16}
              fill={showFavoriteToolbar ? '#f59e0b' : 'none'}
              color={showFavoriteToolbar ? '#f59e0b' : 'currentColor'}
            />
          </button>
        )}
      </div>
    </aside>
  )
}
