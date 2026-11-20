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
  Scale,
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
  // 2. Position & Risk/Reward (Tỉ lệ lời lỗ)
  {
    category: 'POSITIONS',
    title: 'Vị thế & Tỉ lệ Lời/Lỗ (R:R)',
    tools: [
      {
        id: 'longPosition',
        name: 'Vị thế Mua (Long Position & Tỷ lệ R:R)',
        icon: <ArrowUpCircle size={16} color="#089981" />,
      },
      {
        id: 'shortPosition',
        name: 'Vị thế Bán (Short Position & Tỷ lệ R:R)',
        icon: <ArrowDownCircle size={16} color="#f23645" />,
      },
    ],
  },
  // 3. Measurement & Ruler (% & Khoảng giá)
  {
    category: 'MEASURE',
    title: 'Thước đo khoảng giá & %',
    tools: [
      {
        id: 'priceRange',
        name: 'Thước đo khoảng giá & % & số nến (Measure Ruler)',
        icon: <Ruler size={16} color="#58a6ff" />,
      },
      {
        id: 'priceLine',
        name: 'Đường mức giá (Price Line)',
        icon: <Minus size={16} color="#e3b341" />,
      },
    ],
  },
  // 4. Lines & Channels
  {
    category: 'LINES',
    title: 'Đường xu hướng & Kênh giá',
    tools: [
      { id: 'segment', name: 'Đoạn xu hướng (Trend Line)', icon: <TrendingUp size={16} /> },
      { id: 'rayLine', name: 'Tia xu hướng (Ray Line)', icon: <ArrowUpRight size={16} /> },
      { id: 'straightLine', name: 'Đường thẳng mở rộng (Extended Line)', icon: <Split size={16} /> },
      { id: 'arrow', name: 'Mũi tên chỉ hướng (Arrow)', icon: <ArrowRight size={16} /> },
      { id: 'horizontalStraightLine', name: 'Đường nằm ngang (Horizontal Line)', icon: <Minus size={16} /> },
      { id: 'horizontalRayLine', name: 'Tia nằm ngang (Horizontal Ray)', icon: <Minus size={16} style={{ borderBottom: '1px dotted' }} /> },
      { id: 'verticalStraightLine', name: 'Đường thẳng đứng (Vertical Line)', icon: <Minus size={16} style={{ transform: 'rotate(90deg)' }} /> },
      { id: 'priceChannelLine', name: 'Kênh giá song song (Parallel Channel)', icon: <Maximize2 size={16} /> },
    ],
  },
  // 5. Fibonacci
  {
    category: 'FIBONACCI',
    title: 'Fibonacci',
    tools: [
      { id: 'fibonacciLine', name: 'Fibonacci thoái lui 7 mức (Fib Retracement)', icon: <Hash size={16} /> },
    ],
  },
  // 6. Shapes
  {
    category: 'SHAPES',
    title: 'Hình khối',
    tools: [
      { id: 'rect', name: 'Hình chữ nhật / Hộp Darvas (Rectangle)', icon: <Square size={16} /> },
      { id: 'circle', name: 'Hình tròn (Circle)', icon: <Circle size={16} /> },
      { id: 'triangle', name: 'Hình tam giác (Triangle)', icon: <Triangle size={16} /> },
    ],
  },
  // 7. Text Annotation
  {
    category: 'TEXT',
    title: 'Ghi chú & Chú thích',
    tools: [
      { id: 'simpleAnnotation', name: 'Ghi chú văn bản (Text Annotation)', icon: <Type size={16} /> },
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
