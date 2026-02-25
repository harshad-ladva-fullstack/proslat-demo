import { useCallback, useEffect, useRef, useState } from 'react'
import { useCeilingDesignerStore } from '../../store'
import {
	GRID_SIZE,
	HUB_RADIUS,
	LIGHT_BAR_WIDTH,
	CONNECTOR_SIZE,
	INCHES_TO_PX,
	COMPONENT_LABELS,
} from '../../constants'
import type {
	CeilingComponent,
	CeilingComponentType,
	LightBarComponent,
	PlacedComponent,
	Port,
} from '../../types'

// ── Snap to grid helper ──
function snap(v: number): number {
	return Math.round(v / GRID_SIZE) * GRID_SIZE
}

// ── Port world position helper ──
function portWorldPosition(
	comp: CeilingComponent,
	port: Port
): { x: number; y: number } {
	const totalAngle = comp.rotation + port.angle
	const rad = (totalAngle * Math.PI) / 180
	const dist =
		comp.type === 'hub'
			? HUB_RADIUS + 4
			: comp.type === 'light-bar'
				? ((comp as LightBarComponent).length * INCHES_TO_PX) / 2
				: CONNECTOR_SIZE / 2 + 4
	return {
		x: comp.x + Math.sin(rad) * dist,
		y: comp.y - Math.cos(rad) * dist,
	}
}

// ── Draw proper connector SVG shapes (not plain squares) ──
function renderConnectorShape(
	comp: PlacedComponent,
	fill: string,
	stroke: string,
	strokeW: number
) {
	const cx = comp.x
	const cy = comp.y
	const S = CONNECTOR_SIZE
	const hs = S / 2

	switch (comp.type as CeilingComponentType) {
		case 't-connector': {
			// T shape: horizontal bar at top + vertical stem down
			const w = hs * 0.35
			const d = `M${cx - hs} ${cy - w} L${cx + hs} ${cy - w} L${cx + hs} ${cy + w} L${cx + w} ${cy + w} L${cx + w} ${cy + hs} L${cx - w} ${cy + hs} L${cx - w} ${cy + w} L${cx - hs} ${cy + w} Z`
			return <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeW} transform={`rotate(${comp.rotation}, ${cx}, ${cy})`} />
		}
		case '45-left-elbow': {
			// Elbow with a 45° left branch
			const w = hs * 0.35
			const d = `M${cx - w} ${cy - hs} L${cx + w} ${cy - hs} L${cx + w} ${cy - w} L${cx - hs * 0.5} ${cy + hs * 0.5} L${cx - hs * 0.85} ${cy + hs * 0.15} L${cx - w} ${cy} Z`
			return <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeW} transform={`rotate(${comp.rotation}, ${cx}, ${cy})`} />
		}
		case '45-right-elbow': {
			// Elbow with a 45° right branch
			const w = hs * 0.35
			const d = `M${cx - w} ${cy - hs} L${cx + w} ${cy - hs} L${cx + w} ${cy} L${cx + hs * 0.85} ${cy + hs * 0.15} L${cx + hs * 0.5} ${cy + hs * 0.5} L${cx - w} ${cy - w} Z`
			return <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeW} transform={`rotate(${comp.rotation}, ${cx}, ${cy})`} />
		}
		case '90-connector-left': {
			// L shape going up and left
			const w = hs * 0.35
			const d = `M${cx - w} ${cy - hs} L${cx + w} ${cy - hs} L${cx + w} ${cy - w} L${cx + w} ${cy + w} L${cx - hs} ${cy + w} L${cx - hs} ${cy - w} L${cx - w} ${cy - w} Z`
			return <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeW} transform={`rotate(${comp.rotation}, ${cx}, ${cy})`} />
		}
		case '90-connector-right': {
			// L shape going up and right
			const w = hs * 0.35
			const d = `M${cx - w} ${cy - hs} L${cx + w} ${cy - hs} L${cx + w} ${cy - w} L${cx + hs} ${cy - w} L${cx + hs} ${cy + w} L${cx - w} ${cy + w} Z`
			return <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeW} transform={`rotate(${comp.rotation}, ${cx}, ${cy})`} />
		}
		case 'cross-connector': {
			// + (plus / cross) shape
			const w = hs * 0.35
			const d = `M${cx - w} ${cy - hs} L${cx + w} ${cy - hs} L${cx + w} ${cy - w} L${cx + hs} ${cy - w} L${cx + hs} ${cy + w} L${cx + w} ${cy + w} L${cx + w} ${cy + hs} L${cx - w} ${cy + hs} L${cx - w} ${cy + w} L${cx - hs} ${cy + w} L${cx - hs} ${cy - w} L${cx - w} ${cy - w} Z`
			return <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeW} transform={`rotate(${comp.rotation}, ${cx}, ${cy})`} />
		}
		case 'y-connector': {
			// Y shape: two diagonal branches up + stem down
			const w = hs * 0.3
			const d = `M${cx} ${cy - hs} L${cx + hs * 0.65} ${cy - hs * 0.2} L${cx + hs * 0.35} ${cy + w * 0.3} L${cx + w} ${cy + w * 0.3} L${cx + w} ${cy + hs} L${cx - w} ${cy + hs} L${cx - w} ${cy + w * 0.3} L${cx - hs * 0.35} ${cy + w * 0.3} L${cx - hs * 0.65} ${cy - hs * 0.2} Z`
			return <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeW} transform={`rotate(${comp.rotation}, ${cx}, ${cy})`} />
		}
		default:
			return (
				<rect
					x={cx - hs}
					y={cy - hs}
					width={S}
					height={S}
					rx={4}
					fill={fill}
					stroke={stroke}
					strokeWidth={strokeW}
					transform={`rotate(${comp.rotation}, ${cx}, ${cy})`}
				/>
			)
	}
}

export function CeilingCanvas() {
	const canvasRef = useRef<HTMLDivElement>(null)
	const {
		components,
		selectedComponentId,
		setSelectedComponentId,
		dragPayload,
		setDragPayload,
		placeHub,
		placeComponent,
		moveComponent,
		hasHub,
		ceilingWidth,
		ceilingHeight,
	} = useCeilingDesignerStore()

	// ── Zoom / Pan state ──
	const [zoom, setZoom] = useState(1)
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
	const [isPanning, setIsPanning] = useState(false)
	const panStartRef = useRef({ x: 0, y: 0 })
	const [panMode, setPanMode] = useState(false)

	const [dragging, setDragging] = useState<{
		id: string
		offsetX: number
		offsetY: number
	} | null>(null)

	// ── Expose zoom / pan / fullscreen controls via window for toolbar ──
	const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.15, 3)), [])
	const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.15, 0.3)), [])
	const resetView = useCallback(() => {
		setZoom(1)
		setPanOffset({ x: 0, y: 0 })
	}, [])
	const toggleFullscreen = useCallback(() => {
		const el = canvasRef.current
		if (!el) return
		if (document.fullscreenElement) {
			document.exitFullscreen()
		} else {
			el.requestFullscreen()
		}
	}, [])

	useEffect(() => {
		const api = { zoomIn, zoomOut, resetView, setPanMode, panMode, toggleFullscreen }
		;(window as any).__ceilingCanvas = api
		return () => { delete (window as any).__ceilingCanvas }
	}, [zoomIn, zoomOut, resetView, panMode, toggleFullscreen])

	// ── Mouse-to-canvas coordinate conversion (accounts for zoom + pan) ──
	const clientToCanvas = useCallback(
		(clientX: number, clientY: number) => {
			if (!canvasRef.current) return { x: 0, y: 0 }
			const rect = canvasRef.current.getBoundingClientRect()
			return {
				x: (clientX - rect.left - panOffset.x) / zoom,
				y: (clientY - rect.top - panOffset.y) / zoom,
			}
		},
		[zoom, panOffset]
	)

	// ── Mouse-wheel to zoom ──
	useEffect(() => {
		const el = canvasRef.current
		if (!el) return
		const handleWheel = (e: WheelEvent) => {
			e.preventDefault()
			const delta = e.deltaY > 0 ? -0.08 : 0.08
			setZoom((z) => Math.max(0.3, Math.min(3, z + delta)))
		}
		el.addEventListener('wheel', handleWheel, { passive: false })
		return () => el.removeEventListener('wheel', handleWheel)
	}, [])

	// ─── Find nearest open port ───
	const findNearestPort = useCallback(
		(x: number, y: number, excludeId?: string) => {
			let best: { component: PlacedComponent; port: Port; distance: number } | null = null
			for (const comp of components) {
				if (comp.id === excludeId) continue
				for (const port of comp.ports) {
					if (port.connectedTo !== null) continue
					const pos = portWorldPosition(comp, port)
					const d = Math.hypot(pos.x - x, pos.y - y)
					if (d < 50 && (!best || d < best.distance)) {
						best = { component: comp, port, distance: d }
					}
				}
			}
			return best
		},
		[components]
	)

	// ─── Canvas mousedown → start pan or place component ───
	const handleCanvasMouseDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			// Middle mouse button or pan mode → start panning
			if (e.button === 1 || (e.button === 0 && panMode && !dragPayload)) {
				e.preventDefault()
				setIsPanning(true)
				panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }
				return
			}

			if (e.button !== 0) return
			const { x, y } = clientToCanvas(e.clientX, e.clientY)
			const sx = snap(x)
			const sy = snap(y)

			if (dragPayload) {
				if (dragPayload.type === 'hub') {
					placeHub(sx, sy)
				} else if (hasHub()) {
					const nearest = findNearestPort(sx, sy)
					if (nearest) {
						placeComponent(
							dragPayload.type,
							sx,
							sy,
							nearest.component.id,
							nearest.port.id,
							dragPayload.length
						)
					}
				}
				setDragPayload(null)
				return
			}

			// Deselect
			setSelectedComponentId(null)
		},
		[dragPayload, placeHub, placeComponent, hasHub, findNearestPort, setDragPayload, setSelectedComponentId, panMode, panOffset, clientToCanvas]
	)

	// ─── Canvas mouseup → also place when user releases mouse (true drag from sidebar) ───
	const handleCanvasMouseUp = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!dragPayload || e.button !== 0) return
			const { x, y } = clientToCanvas(e.clientX, e.clientY)
			const sx = snap(x)
			const sy = snap(y)

			if (dragPayload.type === 'hub') {
				placeHub(sx, sy)
			} else if (hasHub()) {
				const nearest = findNearestPort(sx, sy)
				if (nearest) {
					placeComponent(
						dragPayload.type,
						sx,
						sy,
						nearest.component.id,
						nearest.port.id,
						dragPayload.length
					)
				}
			}
			setDragPayload(null)
		},
		[dragPayload, placeHub, placeComponent, hasHub, findNearestPort, setDragPayload, clientToCanvas]
	)

	// ─── Pan: global mousemove / mouseup ───
	useEffect(() => {
		if (!isPanning) return
		const handleMove = (e: MouseEvent) => {
			setPanOffset({
				x: e.clientX - panStartRef.current.x,
				y: e.clientY - panStartRef.current.y,
			})
		}
		const handleUp = () => setIsPanning(false)
		window.addEventListener('mousemove', handleMove)
		window.addEventListener('mouseup', handleUp)
		return () => {
			window.removeEventListener('mousemove', handleMove)
			window.removeEventListener('mouseup', handleUp)
		}
	}, [isPanning])

	// ─── Component mousedown → start drag ───
	const handleComponentMouseDown = useCallback(
		(e: React.MouseEvent, comp: PlacedComponent) => {
			e.stopPropagation()
			if (panMode) return
			setSelectedComponentId(comp.id)
			const { x, y } = clientToCanvas(e.clientX, e.clientY)
			setDragging({
				id: comp.id,
				offsetX: x - comp.x,
				offsetY: y - comp.y,
			})
		},
		[setSelectedComponentId, clientToCanvas, panMode]
	)

	// ─── Drag: global mousemove / mouseup ───
	useEffect(() => {
		if (!dragging) return

		const handleMove = (e: MouseEvent) => {
			const { x, y } = clientToCanvas(e.clientX, e.clientY)
			const sx = snap(x - dragging.offsetX)
			const sy = snap(y - dragging.offsetY)
			const cx = Math.max(0, Math.min(ceilingWidth, sx))
			const cy = Math.max(0, Math.min(ceilingHeight, sy))
			moveComponent(dragging.id, cx, cy)
		}

		const handleUp = () => setDragging(null)
		window.addEventListener('mousemove', handleMove)
		window.addEventListener('mouseup', handleUp)
		return () => {
			window.removeEventListener('mousemove', handleMove)
			window.removeEventListener('mouseup', handleUp)
		}
	}, [dragging, moveComponent, ceilingWidth, ceilingHeight, clientToCanvas])

	// ─── Connection lines ───
	const connectionLines = components
		.filter((c) => c.parentId)
		.map((child) => {
			const parent = components.find((c) => c.id === child.parentId)
			if (!parent) return null

			if (child.type === 'light-bar') {
				const lb = child as LightBarComponent
				const barColor =
					lb.lightMode === 'rgb'
						? 'url(#rgbGradient)'
						: child.color === 'black'
							? '#1a1a1a'
							: '#e0e0e0'
				return (
					<g key={`line-${child.id}`}>
						<line
							x1={parent.x} y1={parent.y} x2={child.x} y2={child.y}
							stroke={barColor} strokeWidth={LIGHT_BAR_WIDTH + 2} strokeLinecap='round'
						/>
						<line
							x1={parent.x} y1={parent.y} x2={child.x} y2={child.y}
							stroke={lb.lightMode === 'rgb' ? 'url(#rgbGradient)' : 'rgba(255,255,255,0.4)'}
							strokeWidth={2} strokeLinecap='round'
						/>
					</g>
				)
			}
			return (
				<line
					key={`line-${child.id}`}
					x1={parent.x} y1={parent.y} x2={child.x} y2={child.y}
					stroke={child.color === 'black' ? '#333' : '#ccc'}
					strokeWidth={LIGHT_BAR_WIDTH} strokeLinecap='round'
				/>
			)
		})

	// ─── Render a single component ───
	const renderComponent = (comp: PlacedComponent) => {
		const isSelected = comp.id === selectedComponentId
		const fill = comp.color === 'black' ? '#1a1a1a' : '#f5f5f5'
		const stroke = isSelected ? '#215296' : comp.color === 'black' ? '#444' : '#bbb'
		const strokeW = isSelected ? 3 : 1.5

		if (comp.type === 'hub') {
			// Octagon hub
			const r = HUB_RADIUS
			const octPts = Array.from({ length: 8 }, (_, i) => {
				const a = ((i * 45 - 90) * Math.PI) / 180
				return `${comp.x + r * Math.cos(a)},${comp.y + r * Math.sin(a)}`
			}).join(' ')

			return (
				<g key={comp.id} onMouseDown={(e) => handleComponentMouseDown(e, comp)} style={{ cursor: 'grab' }}>
					<polygon points={octPts} fill={fill} stroke={stroke} strokeWidth={strokeW} />
					{comp.ports.map((port) => {
						const pos = portWorldPosition(comp, port)
						return (
							<circle key={port.id} cx={pos.x} cy={pos.y} r={4}
								fill={port.connectedTo ? '#215296' : '#888'} stroke='#fff' strokeWidth={1} />
						)
					})}
					<text x={comp.x} y={comp.y + 4} textAnchor='middle' fontSize={10} fill={comp.color === 'black' ? '#aaa' : '#555'} fontWeight='bold'>
						HUB
					</text>
				</g>
			)
		}

		if (comp.type === 'light-bar') {
			const lb = comp as LightBarComponent
			const halfLen = (lb.length * INCHES_TO_PX) / 2
			const rad = (comp.rotation * Math.PI) / 180
			const dx = Math.sin(rad) * halfLen
			const dy = -Math.cos(rad) * halfLen

			const barColor =
				lb.lightMode === 'rgb'
					? 'url(#rgbGradient)'
					: comp.color === 'black'
						? '#1a1a1a'
						: '#f5f5f5'

			return (
				<g key={comp.id} onMouseDown={(e) => handleComponentMouseDown(e, comp)} style={{ cursor: 'grab' }}>
					{/* Main bar */}
					<line x1={comp.x - dx} y1={comp.y - dy} x2={comp.x + dx} y2={comp.y + dy}
						stroke={barColor} strokeWidth={LIGHT_BAR_WIDTH + 2} strokeLinecap='round' />
					{/* Border */}
					<line x1={comp.x - dx} y1={comp.y - dy} x2={comp.x + dx} y2={comp.y + dy}
						stroke={stroke} strokeWidth={strokeW} strokeLinecap='round' fill='none' style={{ pointerEvents: 'none' }} />
					{/* Glowing center */}
					<line x1={comp.x - dx} y1={comp.y - dy} x2={comp.x + dx} y2={comp.y + dy}
						stroke={lb.lightMode === 'rgb' ? 'url(#rgbGradient)' : '#ffffffaa'}
						strokeWidth={2} strokeLinecap='round' style={{ pointerEvents: 'none' }} />
					{/* Port dots */}
					{comp.ports.map((port) => {
						const pos = portWorldPosition(comp, port)
						return (
							<circle key={port.id} cx={pos.x} cy={pos.y} r={4}
								fill={port.connectedTo ? '#215296' : '#888'} stroke='#fff' strokeWidth={1} />
						)
					})}
					{/* Length label shown on the bar */}
					<rect x={comp.x - 18} y={comp.y - 9} width={36} height={18} rx={3}
						fill='rgba(0,0,0,0.75)' style={{ pointerEvents: 'none' }} />
					<text x={comp.x} y={comp.y + 4} textAnchor='middle' fontSize={11} fill='#fff' fontWeight='bold'
						style={{ pointerEvents: 'none' }}>
						{lb.length}"
					</text>
				</g>
			)
		}

		// ── Connectors - render proper distinct shapes ──
		return (
			<g key={comp.id} onMouseDown={(e) => handleComponentMouseDown(e, comp)} style={{ cursor: 'grab' }}>
				{renderConnectorShape(comp, fill, stroke, strokeW)}
				{comp.ports.map((port) => {
					const pos = portWorldPosition(comp, port)
					return (
						<circle key={port.id} cx={pos.x} cy={pos.y} r={4}
							fill={port.connectedTo ? '#215296' : '#888'} stroke='#fff' strokeWidth={1} />
					)
				})}
				<text x={comp.x} y={comp.y + CONNECTOR_SIZE / 2 + 12} textAnchor='middle' fontSize={8} fill='#555'>
					{COMPONENT_LABELS[comp.type]}
				</text>
			</g>
		)
	}

	// ── Dot pattern ──
	const bgSize = GRID_SIZE * zoom
	const bgX = panOffset.x % bgSize
	const bgY = panOffset.y % bgSize

	return (
		<div
			ref={canvasRef}
			className='relative flex-1 overflow-hidden bg-[#e8eaed]'
			style={{
				backgroundImage: 'radial-gradient(circle, #c0c0c0 1px, transparent 1px)',
				backgroundSize: `${bgSize}px ${bgSize}px`,
				backgroundPosition: `${bgX}px ${bgY}px`,
				cursor: isPanning ? 'grabbing' : panMode ? 'grab' : dragPayload ? 'crosshair' : 'default',
			}}
			onMouseDown={handleCanvasMouseDown}
			onMouseUp={handleCanvasMouseUp}
		>
			<svg
				width='100%'
				height='100%'
				className='absolute inset-0'
				style={{ pointerEvents: 'none' }}
			>
				<defs>
					<linearGradient id='rgbGradient' x1='0%' y1='0%' x2='100%' y2='0%'>
						<stop offset='0%' stopColor='#ff0000' />
						<stop offset='25%' stopColor='#ffff00' />
						<stop offset='50%' stopColor='#00ff00' />
						<stop offset='75%' stopColor='#0088ff' />
						<stop offset='100%' stopColor='#ff00ff' />
					</linearGradient>
				</defs>

				{/* Transform group for zoom + pan */}
				<g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
					{/* Ceiling boundary */}
					<rect x={0} y={0} width={ceilingWidth} height={ceilingHeight}
						fill='none' stroke='#999' strokeWidth={2 / zoom} strokeDasharray={`${8 / zoom} ${4 / zoom}`} />

					{/* Connection lines */}
					<g style={{ pointerEvents: 'none' }}>{connectionLines}</g>

					{/* Components */}
					<g style={{ pointerEvents: 'all' }}>
						{components.map(renderComponent)}
					</g>
				</g>
			</svg>

			{/* Zoom indicator */}
			<div className='absolute top-3 left-3 bg-white/80 rounded px-2 py-1 text-xs text-gray-500 select-none'>
				{Math.round(zoom * 100)}%
			</div>

			{/* Hint when empty */}
			{components.length === 0 && (
				<div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
					<p className='text-gray-400 text-lg'>
						Drag a <strong>Hub</strong> from the right panel to start
					</p>
				</div>
			)}
		</div>
	)
}
