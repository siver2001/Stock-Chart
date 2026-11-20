import React from 'react'
import { Trash2, Lock, Unlock, Palette } from 'lucide-react'

export default function SelectedOverlayToolbar({
  selectedOverlay,
  onDeleteOverlay,
  onUpdateStyle,
  onToggleLock,
}) {
  if (!selectedOverlay) return null

  const colors = [
    { id: '#2962ff', label: 'Xanh dương' },
    { id: '#089981', label: 'Xanh lá' },
    { id: '#f23645', label: 'Đỏ' },
    { id: '#e3b341', label: 'Vàng' },
    { id: '#ffffff', label: 'Trắng' },
  ]

  const widths = [1, 2, 3, 4]

  return (
    <div className="tv-selected-overlay-bar">
      <div className="tv-overlay-info-tag">
        <span>Đang chọn:</span>
        <b className="tv-overlay-name">{selectedOverlay.name}</b>
      </div>

      <div className="tv-overlay-bar-divider" />

      {/* Colors */}
      <div className="tv-overlay-colors">
        {colors.map((c) => (
          <button
            key={c.id}
            className="tv-color-dot"
            style={{ backgroundColor: c.id }}
            onClick={() => onUpdateStyle({ color: c.id, borderColor: c.id })}
            title={`Đổi màu ${c.label}`}
          />
        ))}
      </div>

      <div className="tv-overlay-bar-divider" />

      {/* Line Width */}
      <div className="tv-overlay-widths">
        {widths.map((w) => (
          <button
            key={w}
            className="tv-width-btn"
            onClick={() => onUpdateStyle({ size: w, borderSize: w })}
            title={`Độ dày ${w}px`}
          >
            <span
              style={{
                display: 'block',
                width: 14,
                height: w,
                backgroundColor: '#d1d4dc',
                borderRadius: 1,
              }}
            />
          </button>
        ))}
      </div>

      <div className="tv-overlay-bar-divider" />

      {/* Lock Toggle */}
      <button
        className="tv-overlay-action-btn"
        onClick={onToggleLock}
        title={selectedOverlay.lock ? 'Mở khóa hình vẽ' : 'Khóa hình vẽ'}
      >
        {selectedOverlay.lock ? <Lock size={13} color="#e3b341" /> : <Unlock size={13} />}
      </button>

      {/* DELETE BUTTON */}
      <button
        className="tv-overlay-action-btn tv-btn-delete-overlay"
        onClick={() => onDeleteOverlay(selectedOverlay.id)}
        title="Xóa hình vẽ này (Nhấn phím Delete hoặc Backspace)"
      >
        <Trash2 size={14} />
        <span>Xóa [Delete]</span>
      </button>
    </div>
  )
}
