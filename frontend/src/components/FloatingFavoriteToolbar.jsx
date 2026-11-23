import React, { useState, useEffect, useRef } from 'react'
import { GripVertical, X, Star } from 'lucide-react'

export default function FloatingFavoriteToolbar({
  activeTool,
  onSelectTool,
  onSelectOverlay,
  favorites = [],
  onToggleFavorite,
  isOpen = true,
  onClose,
  allToolsMap = {},
}) {
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('vn_fav_toolbar_pos')
      if (saved) return JSON.parse(saved)
    } catch {}
    return { x: 90, y: 55 } // Default position near top-left of chart
  })

  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 })

  const handlePointerDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: pos.x,
      posY: pos.y,
    }
  }

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging) return
      const dx = e.clientX - dragStartRef.current.mouseX
      const dy = e.clientY - dragStartRef.current.mouseY
      const newX = Math.max(10, Math.min(window.innerWidth - 150, dragStartRef.current.posX + dx))
      const newY = Math.max(45, Math.min(window.innerHeight - 80, dragStartRef.current.posY + dy))
      setPos({ x: newX, y: newY })
    }

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false)
        try {
          localStorage.setItem('vn_fav_toolbar_pos', JSON.stringify(pos))
        } catch {}
      }
    }

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, pos])

  if (!isOpen || !favorites || favorites.length === 0) return null

  return (
    <div
      className="tv-fav-toolbar"
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Drag Handle */}
      <div
        className="tv-fav-drag-handle"
        onPointerDown={handlePointerDown}
        title="Kéo thả để di chuyển thanh công cụ yêu thích"
      >
        <GripVertical size={14} />
      </div>

      {/* Favorite Tools */}
      <div className="tv-fav-items">
        {favorites.map((toolId) => {
          const tool = allToolsMap[toolId]
          if (!tool) return null
          const isActive = activeTool === toolId

          return (
            <button
              key={toolId}
              className={`tv-fav-btn ${isActive ? 'active' : ''}`}
              onClick={() => {
                onSelectTool(toolId)
                if (toolId === 'crosshair') {
                  onSelectOverlay(null)
                } else {
                  onSelectOverlay(toolId)
                }
              }}
              title={`${tool.name}${tool.hotkey ? ` (${tool.hotkey})` : ''}`}
            >
              {tool.icon}
            </button>
          )
        })}
      </div>

      {/* Close button */}
      {onClose && (
        <button
          className="tv-fav-close-btn"
          onClick={onClose}
          title="Ẩn thanh công cụ yêu thích (Mở lại ở thanh bên trái)"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
