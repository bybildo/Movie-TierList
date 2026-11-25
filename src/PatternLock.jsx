import { useRef, useState } from 'react'

const GRID_SIZE = 3
const BOARD_VIRTUAL_SIZE = 240
const DOT_CENTERS = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
  const row = Math.floor(i / GRID_SIZE)
  const col = i % GRID_SIZE
  return {
    index: i,
    x: col * 80 + 40,
    y: row * 80 + 40,
  }
})

function PatternLock({ value = [], onChange }) {
  const [isDrawing, setIsDrawing] = useState(false)
  const boardRef = useRef(null)

  const getDotFromPointer = (clientX, clientY) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return null
    const x = ((clientX - rect.left) / rect.width) * BOARD_VIRTUAL_SIZE
    const y = ((clientY - rect.top) / rect.height) * BOARD_VIRTUAL_SIZE
    const hit = DOT_CENTERS.find((dot) => Math.hypot(dot.x - x, dot.y - y) <= 26)
    return hit ? hit.index : null
  }

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDrawing(true)
    const dot = getDotFromPointer(e.clientX, e.clientY)
    onChange?.(dot !== null ? [dot] : [])
  }

  const handlePointerMove = (e) => {
    if (!isDrawing) return
    const dot = getDotFromPointer(e.clientX, e.clientY)
    if (dot !== null && !value.includes(dot)) {
      onChange?.([...value, dot])
    }
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
  }

  return (
    <div className="flex justify-center">
      <div
        ref={boardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full max-w-[220px] sm:max-w-[260px] aspect-square bg-neutral-800/60 rounded-xl touch-none select-none cursor-pointer"
      >
        <svg
          viewBox={`0 0 ${BOARD_VIRTUAL_SIZE} ${BOARD_VIRTUAL_SIZE}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {value.length > 1 &&
            value.slice(1).map((dotIdx, i) => {
              const from = DOT_CENTERS[value[i]]
              const to = DOT_CENTERS[dotIdx]
              return (
                <line
                  key={`${from.index}-${to.index}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              )
            })}
        </svg>

        {DOT_CENTERS.map((dot) => {
          const active = value.includes(dot.index)
          return (
            <div
              key={dot.index}
              style={{
                left: `${(dot.x / BOARD_VIRTUAL_SIZE) * 100}%`,
                top: `${(dot.y / BOARD_VIRTUAL_SIZE) * 100}%`,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-colors pointer-events-none ${
                active
                  ? 'bg-blue-500 border-blue-300 scale-110'
                  : 'bg-neutral-700 border-neutral-500'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default PatternLock
