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
} from 'lucide-react'

export const DRAWING_TOOLS = [
  // 1. Cursor
  {
    category: 'CURSOR',
    title: 'Con trỏ',
    tools: [
      { id: 'crosshair', name: 'Con trỏ chữ thập (Crosshair)', icon: <Crosshair size={16} /> },
    ],
  },
  // 2. Trend Lines (Đường xu hướng & Kênh giá)
  {
    category: 'LINES',
    title: 'Đường xu hướng & Kênh giá',
    tools: [
      { id: 'segment', name: 'Đoạn xu hướng (Trend Line)', icon: <TrendingUp size={16} /> },
      { id: 'rayLine', name: 'Tia xu hướng (Ray Line)', icon: <ArrowUpRight size={16} /> },
      { id: 'infoLine', name: 'Đường thông tin (Info Line - Đo góc, %, nến)', icon: <Activity size={16} color="#089981" /> },
      { id: 'trendAngle', name: 'Góc xu hướng (Trend Angle)', icon: <Compass size={16} color="#e3b341" /> },
      { id: 'straightLine', name: 'Đường thẳng mở rộng (Extended Line)', icon: <Split size={16} /> },
      { id: 'horizontalStraightLine', name: 'Đường nằm ngang (Horizontal Line)', icon: <Minus size={16} /> },
      { id: 'horizontalRayLine', name: 'Tia nằm ngang (Horizontal Ray)', icon: <Minus size={16} style={{ borderBottom: '1px dotted' }} /> },
      { id: 'verticalStraightLine', name: 'Đường thẳng đứng (Vertical Line)', icon: <Minus size={16} style={{ transform: 'rotate(90deg)' }} /> },
      { id: 'crossLine', name: 'Đường chữ thập tâm điểm (Cross Line)', icon: <Target size={16} color="#58a6ff" /> },
      { id: 'priceChannelLine', name: 'Kênh giá song song (Parallel Channel)', icon: <Maximize2 size={16} /> },
    ],
  },
  // 3. Fibonacci & Gann Suite (Bộ công cụ Fibonacci)
  {
    category: 'FIBONACCI',
    title: 'Bộ công cụ Fibonacci & Gann',
    tools: [
      { id: 'fibonacciLine', name: 'Fibonacci Thoái lui (Fib Retracement)', icon: <Hash size={16} color="#2962ff" /> },
      { id: 'fibExtension', name: 'Fibonacci Mở rộng xu hướng (Trend-Based Fib Extension)', icon: <Layers size={16} color="#a855f7" /> },
      { id: 'fibChannel', name: 'Kênh Fibonacci (Fib Channel)', icon: <Maximize2 size={16} color="#089981" /> },
      { id: 'fibTimeZone', name: 'Vùng thời gian Fibonacci (Fib Time Zone)', icon: <Clock size={16} color="#f59e0b" /> },
      { id: 'fibFan', name: 'Quạt Fibonacci (Fib Speed Resistance Fan)', icon: <Radio size={16} color="#ec4899" /> },
      { id: 'fibCircles', name: 'Vòng tròn Fibonacci (Fib Circles)', icon: <Circle size={16} color="#06b6d4" /> },
    ],
  },
  // 4. Shapes (Hình học & Nét vẽ)
  {
    category: 'SHAPES',
    title: 'Hình học & Nét vẽ',
    tools: [
      { id: 'rect', name: 'Hình chữ nhật / Hộp Darvas (Rectangle)', icon: <Square size={16} /> },
      { id: 'ellipse', name: 'Hình elip (Ellipse)', icon: <Circle size={16} style={{ transform: 'scaleX(1.3)' }} color="#e3b341" /> },
      { id: 'circle', name: 'Hình tròn (Circle)', icon: <Circle size={16} /> },
      { id: 'triangle', name: 'Hình tam giác (Triangle)', icon: <Triangle size={16} /> },
      { id: 'arc', name: 'Cung hình vòm (Arc)', icon: <Compass size={16} color="#a855f7" /> },
    ],
  },
  // 5. Text & Annotations (Chú thích & Ký hiệu)
  {
    category: 'TEXT',
    title: 'Ghi chú & Ký hiệu chú thích',
    tools: [
      { id: 'simpleAnnotation', name: 'Ghi chú văn bản (Text Annotation)', icon: <Type size={16} /> },
      { id: 'callout', name: 'Bong bóng chú thích (Callout)', icon: <MessageSquare size={16} color="#58a6ff" /> },
      { id: 'priceLabel', name: 'Nhãn mốc giá (Price Label)', icon: <Tag size={16} color="#2962ff" /> },
      { id: 'arrow', name: 'Mũi tên chỉ hướng (Arrow)', icon: <ArrowRight size={16} /> },
      { id: 'arrowMarkerUp', name: 'Đánh dấu Mua (Arrow Up Marker)', icon: <ArrowUp size={16} color="#089981" /> },
      { id: 'arrowMarkerDown', name: 'Đánh dấu Bán (Arrow Down Marker)', icon: <ArrowDown size={16} color="#f23645" /> },
    ],
  },
  // 6. Patterns (Mô hình giá & Sóng)
  {
    category: 'PATTERNS',
    title: 'Mô hình giá & Sóng',
    tools: [
      { id: 'headAndShoulders', name: 'Mô hình Vai - Đầu - Vai (Head and Shoulders)', icon: <Network size={16} color="#a855f7" /> },
      { id: 'elliottImpulse', name: 'Sóng đẩy Elliott 12345 (Elliott Wave Impulse)', icon: <GitCommit size={16} color="#2962ff" /> },
      { id: 'elliottCorrection', name: 'Sóng điều chỉnh Elliott ABC (Elliott Wave Correction)', icon: <GitCommit size={16} color="#f23645" /> },
      { id: 'abcdPattern', name: 'Mô hình sóng ABCD (ABCD Pattern)', icon: <Activity size={16} color="#e3b341" /> },
    ],
  },
  // 7. Positions & Measurement (Vị thế & Đo đạc)
  {
    category: 'POSITIONS',
    title: 'Vị thế & Thước đo',
    tools: [
      { id: 'longPosition', name: 'Vị thế Mua (Long Position & Tỷ lệ R:R)', icon: <ArrowUpCircle size={16} color="#089981" /> },
      { id: 'shortPosition', name: 'Vị thế Bán (Short Position & Tỷ lệ R:R)', icon: <ArrowDownCircle size={16} color="#f23645" /> },
      { id: 'priceRange', name: 'Thước đo khoảng giá & % & số nến (Measure Ruler)', icon: <Ruler size={16} color="#58a6ff" /> },
      { id: 'priceLine', name: 'Đường mức giá (Price Line)', icon: <Minus size={16} color="#e3b341" /> },
    ],
  },
]

export default function DrawingToolbar({
  activeTool: externalActiveTool,
  onSelectTool,
  onSelectOverlay,
  onClearOverlays,
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

  // Active tool per category
  const getActiveForCategory = (cat) => {
    return cat.tools.find((t) => t.id === activeTool) || cat.tools[0]
  }

  return (
    <aside className="tv-drawing-toolbar">
      <div className="tv-drawing-tools-group">
        {DRAWING_TOOLS.map((cat) => {
          const current = getActiveForCategory(cat)
          const isCatActive = cat.tools.some((t) => t.id === activeTool)
          const hasMultiple = cat.tools.length > 1

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

              {/* Flyout menu for categories with multiple tools */}
              {openFlyout === cat.category && (
                <div className="tv-tool-flyout" onClick={() => setOpenFlyout(null)}>
                  <div className="tv-flyout-title">{cat.title}</div>
                  {cat.tools.map((t) => (
                    <button
                      key={t.id}
                      className={`tv-flyout-item ${activeTool === t.id ? 'active' : ''}`}
                      onClick={() => handleSelect(t.id)}
                    >
                      <span className="tv-flyout-icon">{t.icon}</span>
                      <span className="tv-flyout-name">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="tv-drawing-tools-divider" />

      {/* Delete / Clear button */}
      <div className="tv-drawing-tools-group">
        <button
          className="tv-draw-btn tv-draw-trash"
          onClick={() => {
            onClearOverlays()
            handleSelect('crosshair')
          }}
          title="Xóa tất cả hình vẽ trên biểu đồ"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </aside>
  )
}
