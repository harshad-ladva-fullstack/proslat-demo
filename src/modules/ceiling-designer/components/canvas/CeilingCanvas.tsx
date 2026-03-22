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
		removeComponent,
		getComponentPosition,
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

	// ── Port highlighting during drag ──
	const [draggedPort, setDraggedPort] = useState<{
		componentId: string
		portId: string
		distance: number
	} | null>(null)
	const [highlightedPorts, setHighlightedPorts] = useState<Set<string>>(new Set())
	const [dragMousePos, setDragMousePos] = useState<{ x: number; y: number } | null>(null)

	// ── Center the ceiling rectangle on the canvas on first render ──
	const computeCenteredOffset = useCallback(
		(z: number) => {
			if (!canvasRef.current) return { x: 0, y: 0 }
			const { width, height } = canvasRef.current.getBoundingClientRect()
			return {
				x: (width - ceilingWidth * z) / 2,
				y: (height - ceilingHeight * z) / 2,
			}
		},
		[ceilingWidth, ceilingHeight]
	)

	useEffect(() => {
		// Use rAF so the canvas has been laid out and has real dimensions
		const id = requestAnimationFrame(() => {
			setPanOffset(computeCenteredOffset(1))
		})
		return () => cancelAnimationFrame(id)
	}, [computeCenteredOffset])

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
		setPanOffset(computeCenteredOffset(1))
	}, [computeCenteredOffset])
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
				} else if (hasHub() && draggedPort) {
					// Use draggedPort for placement (only if valid port found)
					const parent = components.find((c) => c.id === draggedPort.componentId)
					const port = parent?.ports.find((p) => p.id === draggedPort.portId)
					if (parent && port) {
						placeComponent(
							dragPayload.type,
							sx,
							sy,
							parent.id,
							port.id,
							'p0', // child component's connecting port (first port)
							dragPayload.length || 36
						)
					}
				}
				setDragPayload(null)
				return
			}

			// Deselect
			setSelectedComponentId(null)
		},
		[dragPayload, draggedPort, placeHub, placeComponent, hasHub, components, setDragPayload, setSelectedComponentId, panMode, panOffset, clientToCanvas]
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
			} else if (hasHub() && draggedPort) {
				// Use draggedPort for placement (only if valid port found)
				const parent = components.find((c) => c.id === draggedPort.componentId)
				const port = parent?.ports.find((p) => p.id === draggedPort.portId)
				if (parent && port) {
					placeComponent(
						dragPayload.type,
						sx,
						sy,
						parent.id,
						port.id,
						'p0', // child component's connecting port
						dragPayload.length
					)
				}
			}
			setDragPayload(null)
		},
		[dragPayload, draggedPort, placeHub, placeComponent, hasHub, components, setDragPayload, clientToCanvas]
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

	// ─── Port highlighting during drag from sidebar ───
	useEffect(() => {
		if (!dragPayload) {
			setHighlightedPorts(new Set())
			setDraggedPort(null)
			setDragMousePos(null)
			return
		}

		const handleMouseMove = (e: MouseEvent) => {
			const pos = clientToCanvas(e.clientX, e.clientY)
			setDragMousePos(pos)

			// Find all empty ports within snap radius (80px)
			const SNAP_RADIUS = 80
			const emptyPorts = new Set<string>()
			let best: { componentId: string; portId: string; distance: number } | null = null

			for (const comp of components) {
				for (const port of comp.ports) {
					if (port.connectedTo !== null) continue

					const portPos = portWorldPosition(comp, port)
					const d = Math.hypot(portPos.x - pos.x, portPos.y - pos.y)

					if (d < SNAP_RADIUS) {
						emptyPorts.add(`${comp.id}-${port.id}`)
						if (!best || d < best.distance) {
							best = { componentId: comp.id, portId: port.id, distance: d }
						}
					}
				}
			}

			setHighlightedPorts(emptyPorts)
			setDraggedPort(best)
		}

		window.addEventListener('mousemove', handleMouseMove)
		return () => {
			window.removeEventListener('mousemove', handleMouseMove)
		}
	}, [dragPayload, components, clientToCanvas])

	// ─── Component mousedown → start drag ───
	const handleComponentMouseDown = useCallback(
		(e: React.MouseEvent, comp: PlacedComponent) => {
			e.stopPropagation()
			if (panMode) return
			setSelectedComponentId(comp.id)
			const { x, y } = clientToCanvas(e.clientX, e.clientY)
			const compPos = getComponentPosition(comp.id) || { x: comp.x, y: comp.y, rotation: comp.rotation }
			setDragging({
				id: comp.id,
				offsetX: x - compPos.x,
				offsetY: y - compPos.y,
			})
		},
		[setSelectedComponentId, getComponentPosition, clientToCanvas, panMode]
	)

	// ─── Drag: global mousemove / mouseup ───
	useEffect(() => {
		if (!dragging) return

		const handleMove = (e: MouseEvent) => {
			const draggedComp = components.find((c) => c.id === dragging.id)
			if (!draggedComp) return

			const pos = clientToCanvas(e.clientX, e.clientY)

			// Hub can move freely within ceiling bounds
			if (draggedComp.type === 'hub') {
				const hubRadius = HUB_RADIUS
				const sx = Math.max(hubRadius, Math.min(ceilingWidth - hubRadius, pos.x))
				const sy = Math.max(hubRadius, Math.min(ceilingHeight - hubRadius, pos.y))
				moveComponent(dragging.id, sx, sy)
				setDraggedPort(null)
			} else {
				// Other components: find empty ports within snap radius (80px)
				const SNAP_RADIUS = 80
				let best: { componentId: string; portId: string; distance: number } | null = null

				for (const comp of components) {
					for (const port of comp.ports) {
						if (port.connectedTo !== null) continue

						const portPos = portWorldPosition(comp, port)
						const d = Math.hypot(portPos.x - pos.x, portPos.y - pos.y)

						if (d < SNAP_RADIUS) {
							if (!best || d < best.distance) {
								best = { componentId: comp.id, portId: port.id, distance: d }
							}
						}
					}
				}

				// Store the nearest port, will use on mouseup to validate placement
				setDraggedPort(best)
			}
		}

		const handleUp = () => {
			const draggedComp = components.find((c) => c.id === dragging.id)
			if (!draggedComp) return

			// Hub: already positioned by moveComponent, nothing to validate
			if (draggedComp.type === 'hub') {
				setDragging(null)
				setDraggedPort(null)
				return
			}

			// Other components: only allow movement if released over a valid empty port
			if (draggedComp.parentId && draggedPort) {
				const parent = components.find((c) => c.id === draggedPort!.componentId)
				const port = parent?.ports.find((p) => p.id === draggedPort!.portId)

				if (parent && port) {
					// Remove component from current parent
					removeComponent(dragging.id)
					// Place it on the new port
					placeComponent(
						draggedComp.type,
						0, 0, // position calculated by store
						parent.id,
						port.id,
						'p0',
						draggedComp.type === 'light-bar' ? (draggedComp as any).length : undefined
					)
				}
			}
			setDragging(null)
			setDraggedPort(null)
		}

		window.addEventListener('mousemove', handleMove)
		window.addEventListener('mouseup', handleUp)
		return () => {
			window.removeEventListener('mousemove', handleMove)
			window.removeEventListener('mouseup', handleUp)
		}
	}, [dragging, draggedPort, components, moveComponent, removeComponent, placeComponent, clientToCanvas, ceilingWidth, ceilingHeight])

	// ─── Connection lines ───
	// ─── Port highlights and snap preview during drag ───
	const portHighlightsAndPreview = () => {
		const items: React.ReactNode[] = []

		if (dragPayload && dragMousePos) {
			// Render highlights for all empty ports
			for (const comp of components) {
				for (const port of comp.ports) {
					if (port.connectedTo !== null) continue

					const portKey = `${comp.id}-${port.id}`
					const isHighlighted = highlightedPorts.has(portKey)
					if (!isHighlighted) continue

					const portPos = portWorldPosition(comp, port)
					const isDragged = draggedPort?.componentId === comp.id && draggedPort?.portId === port.id

					items.push(
						<g key={`port-highlight-${portKey}`}>
							{/* Outer pulsing glow circle - stronger for snap target */}
							<circle
								cx={portPos.x}
								cy={portPos.y}
								r={isDragged ? 32 : 24}
								fill='#ff1493'
								opacity={isDragged ? 0.5 : 0.25}
								filter={isDragged ? 'url(#portGlowStrong)' : 'url(#portGlowMedium)'}
								style={{
									animation: 'pulse 1.5s ease-in-out infinite',
									transition: 'r 0.2s, opacity 0.2s, filter 0.2s',
								}}
							/>
							{/* Middle glow layer */}
							<circle
								cx={portPos.x}
								cy={portPos.y}
								r={isDragged ? 20 : 14}
								fill='#ff69b4'
								opacity={isDragged ? 0.35 : 0.15}
								filter={isDragged ? 'url(#portGlowMedium)' : 'url(#portGlowSubtle)'}
								style={{
									animation: isDragged ? 'pulse 1s ease-in-out infinite' : 'none',
									transition: 'r 0.2s, opacity 0.2s',
								}}
							/>
							{/* Solid core dot - larger for snap target */}
							<circle
								cx={portPos.x}
								cy={portPos.y}
								r={isDragged ? 8 : 5}
								fill={isDragged ? '#ff1493' : '#ff69b4'}
								opacity={isDragged ? 1 : 0.8}
								filter={isDragged ? 'url(#portGlowStrong)' : 'url(#portGlowMedium)'}
								style={{
									transition: 'r 0.2s, fill 0.2s, opacity 0.2s',
								}}
							/>
						</g>
					)
				}
			}

			// Render snap preview if a valid port is selected
			if (draggedPort) {
				const parent = components.find((c) => c.id === draggedPort.componentId)
				const port = parent?.ports.find((p) => p.id === draggedPort.portId)

				if (parent && port && dragPayload.type !== 'hub') {
					const parentPortPos = portWorldPosition(parent, port)

					// Calculate preview position based on component type
					// Match the store's calculateComponentPosition logic
					const totalAngle = parent.rotation + port.angle
					let previewX = parentPortPos.x
					let previewY = parentPortPos.y
					let previewRotation = totalAngle

					if (dragPayload.type === 'light-bar') {
						const barLength = dragPayload.length || 36
						const halfLen = (barLength * INCHES_TO_PX) / 2
						const rad = (totalAngle * Math.PI) / 180
						// Position so light extends forward from port
						previewX = parentPortPos.x + Math.sin(rad) * halfLen
						previewY = parentPortPos.y - Math.cos(rad) * halfLen
					}

					// Draw connection line from parent to port
					items.push(
						<line
							key='snap-connection-line'
							x1={parent.x}
							y1={parent.y}
							x2={parentPortPos.x}
							y2={parentPortPos.y}
							stroke='#ff1493'
							strokeWidth={2}
							strokeDasharray='4,4'
							opacity={0.6}
						/>
					)

					// Draw preview component at snap position
					if (dragPayload.type === 'light-bar') {
						const barLength = dragPayload.length || 36
						const halfLen = (barLength * INCHES_TO_PX) / 2
						const rad = (previewRotation * Math.PI) / 180
						const dx = Math.sin(rad) * halfLen
						const dy = -Math.cos(rad) * halfLen

						items.push(
							<g key='snap-preview' opacity={0.4} style={{ pointerEvents: 'none' }}>
								<line
									x1={previewX - dx}
									y1={previewY - dy}
									x2={previewX + dx}
									y2={previewY + dy}
									stroke='#ff1493'
									strokeWidth={LIGHT_BAR_WIDTH + 2}
									strokeLinecap='round'
									strokeDasharray='4,4'
								/>
								<circle cx={previewX} cy={previewY} r={4} fill='#ff1493' />
							</g>
						)
					} else {
						// Connector preview
						const S = CONNECTOR_SIZE
						const hs = S / 2
						items.push(
							<g key='snap-preview' opacity={0.4} style={{ pointerEvents: 'none' }}>
								<rect
									x={previewX - hs}
									y={previewY - hs}
									width={S}
									height={S}
									rx={4}
									fill='#ff1493'
									stroke='#ff1493'
									strokeWidth={2}
									strokeDasharray='4,4'
									transform={`rotate(${previewRotation}, ${previewX}, ${previewY})`}
								/>
								<circle cx={previewX} cy={previewY} r={4} fill='#ff1493' />
							</g>
						)
					}

					// Draw rotation angle text
					items.push(
						<text
							key='snap-angle-text'
							x={previewX}
							y={previewY - CONNECTOR_SIZE / 2 - 12}
							textAnchor='middle'
							fontSize={12}
							fill='#ff1493'
							fontWeight='bold'
							style={{ pointerEvents: 'none' }}
						>
							{previewRotation}°
						</text>
					)
				}
			}
		}

		// Show highlights when dragging a placed component (must snap to empty port)
		if (dragging && draggedPort) {
			const parent = components.find((c) => c.id === draggedPort!.componentId)
			if (parent) {
				const port = parent.ports.find((p) => p.id === draggedPort!.portId)
				if (port) {
					const portPos = portWorldPosition(parent, port)

					items.push(
						<g key={`port-highlight-dragged-${parent.id}-${port.id}`}>
							{/* Outer pulsing glow circle */}
							<circle
								cx={portPos.x}
								cy={portPos.y}
								r={32}
								fill='#ff1493'
								opacity={0.5}
								filter='url(#portGlowStrong)'
								style={{
									animation: 'pulse 1.5s ease-in-out infinite',
								}}
							/>
							{/* Middle glow layer */}
							<circle
								cx={portPos.x}
								cy={portPos.y}
								r={20}
								fill='#ff69b4'
								opacity={0.35}
								filter='url(#portGlowMedium)'
								style={{
									animation: 'pulse 1s ease-in-out infinite',
								}}
							/>
							{/* Solid core dot */}
							<circle
								cx={portPos.x}
								cy={portPos.y}
								r={8}
								fill='#ff1493'
								opacity={1}
								filter='url(#portGlowStrong)'
							/>
						</g>
					)
				}
			}
		}
	}

	// ─── Render a single component ───
	const renderComponent = (comp: PlacedComponent) => {
		// Get actual position (accounts for parent position if child component)
		const compPos = getComponentPosition(comp.id) || { x: comp.x, y: comp.y, rotation: comp.rotation }

		const isSelected = comp.id === selectedComponentId
		const fill = comp.color === 'black' ? '#1a1a1a' : '#f5f5f5'
		const stroke = isSelected ? '#215296' : comp.color === 'black' ? '#444' : '#bbb'
		const strokeW = isSelected ? 3 : 1.5

		if (comp.type === 'hub') {
			// Octagon hub
			const r = HUB_RADIUS
			const octPts = Array.from({ length: 8 }, (_, i) => {
				const a = ((i * 45 - 90) * Math.PI) / 180
				return `${compPos.x + r * Math.cos(a)},${compPos.y + r * Math.sin(a)}`
			}).join(' ')

			return (
				<g key={comp.id} onMouseDown={(e) => handleComponentMouseDown(e, comp)} style={{ cursor: 'grab' }}>
					<polygon points={octPts} fill={fill} stroke={stroke} strokeWidth={strokeW} />
					{comp.ports.map((port) => {
						const compWithPos = { ...comp, x: compPos.x, y: compPos.y, rotation: compPos.rotation }
						const portPos = portWorldPosition(compWithPos, port)
						const portKey = `${comp.id}-${port.id}`
						const isHighlighted = highlightedPorts.has(portKey)
						const isSnapTarget = draggedPort?.componentId === comp.id && draggedPort?.portId === port.id
						const isEmpty = !port.connectedTo

						// Determine styling based on port state
						let portFill = '#888' // default for empty
						let portRadius = 4
						let filterUrl = 'none'
						let strokeWidth = 1

						if (port.connectedTo) {
							portFill = '#215296'
						} else if (isSnapTarget) {
							// Snap target: strongest highlight
							portFill = '#ff1493'
							portRadius = 6
							filterUrl = 'url(#portGlowStrong)'
							strokeWidth = 2
						} else if (isHighlighted) {
							// Highlighted in drag radius
							portFill = '#ff69b4'
							portRadius = 5
							filterUrl = 'url(#portGlowMedium)'
							strokeWidth = 1.5
						} else if (isEmpty) {
							// Available but not highlighted
							portFill = '#b3b3b3'
							filterUrl = 'url(#portGlowSubtle)'
						}

						return (
							<circle
								key={port.id}
								cx={portPos.x}
								cy={portPos.y}
								r={portRadius}
								fill={portFill}
								stroke='#fff'
								strokeWidth={strokeWidth}
								filter={filterUrl}
								style={{
									transition: 'r 0.15s ease, fill 0.15s ease, filter 0.15s ease',
									pointerEvents: 'none',
								}}
							/>
						)
					})}
					<text x={compPos.x} y={compPos.y + 4} textAnchor='middle' fontSize={10} fill={comp.color === 'black' ? '#aaa' : '#555'} fontWeight='bold'>
						HUB
					</text>
				</g>
			)
		}

		if (comp.type === 'light-bar') {
			const lb = comp as LightBarComponent
			const halfLen = (lb.length * INCHES_TO_PX) / 2
			const rad = (compPos.rotation * Math.PI) / 180
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
					<line x1={compPos.x - dx} y1={compPos.y - dy} x2={compPos.x + dx} y2={compPos.y + dy}
						stroke={barColor} strokeWidth={LIGHT_BAR_WIDTH + 2} strokeLinecap='round' />
					{/* Border */}
					<line x1={compPos.x - dx} y1={compPos.y - dy} x2={compPos.x + dx} y2={compPos.y + dy}
						stroke={stroke} strokeWidth={strokeW} strokeLinecap='round' fill='none' style={{ pointerEvents: 'none' }} />
					{/* Glowing center */}
					<line x1={compPos.x - dx} y1={compPos.y - dy} x2={compPos.x + dx} y2={compPos.y + dy}
						stroke={lb.lightMode === 'rgb' ? 'url(#rgbGradient)' : '#ffffffaa'}
						strokeWidth={2} strokeLinecap='round' style={{ pointerEvents: 'none' }} />
					{/* Port dots */}
					{comp.ports.map((port) => {
						const compWithPos = { ...comp, x: compPos.x, y: compPos.y, rotation: compPos.rotation }
						const portPos = portWorldPosition(compWithPos, port)
						const portKey = `${comp.id}-${port.id}`
						const isHighlighted = highlightedPorts.has(portKey)
						const isSnapTarget = draggedPort?.componentId === comp.id && draggedPort?.portId === port.id
						const isEmpty = !port.connectedTo

						// Determine styling based on port state
						let portFill = '#888'
						let portRadius = 4
						let filterUrl = 'none'
						let strokeWidth = 1

						if (port.connectedTo) {
							portFill = '#215296'
						} else if (isSnapTarget) {
							portFill = '#ff1493'
							portRadius = 6
							filterUrl = 'url(#portGlowStrong)'
							strokeWidth = 2
						} else if (isHighlighted) {
							portFill = '#ff69b4'
							portRadius = 5
							filterUrl = 'url(#portGlowMedium)'
							strokeWidth = 1.5
						} else if (isEmpty) {
							portFill = '#b3b3b3'
							filterUrl = 'url(#portGlowSubtle)'
						}

						return (
							<circle
								key={port.id}
								cx={portPos.x}
								cy={portPos.y}
								r={portRadius}
								fill={portFill}
								stroke='#fff'
								strokeWidth={strokeWidth}
								filter={filterUrl}
								style={{
									transition: 'r 0.15s ease, fill 0.15s ease, filter 0.15s ease',
									pointerEvents: 'none',
								}}
							/>
						)
					})}
					{/* Length label shown on the bar */}
					<rect x={compPos.x - 18} y={compPos.y - 9} width={36} height={18} rx={3}
						fill='rgba(0,0,0,0.75)' style={{ pointerEvents: 'none' }} />
					<text x={compPos.x} y={compPos.y + 4} textAnchor='middle' fontSize={11} fill='#fff' fontWeight='bold'
						style={{ pointerEvents: 'none' }}>
						{lb.length}"
					</text>
				</g>
			)
		}

		// ── Connectors - render proper distinct shapes ──
		return (
			<g key={comp.id} onMouseDown={(e) => handleComponentMouseDown(e, comp)} style={{ cursor: 'grab' }}>
				{renderConnectorShape({ ...comp, x: compPos.x, y: compPos.y, rotation: compPos.rotation }, fill, stroke, strokeW)}
				{comp.ports.map((port) => {
					const compWithPos = { ...comp, x: compPos.x, y: compPos.y, rotation: compPos.rotation }
					const portPos = portWorldPosition(compWithPos, port)
					const portKey = `${comp.id}-${port.id}`
					const isHighlighted = highlightedPorts.has(portKey)
					const isSnapTarget = draggedPort?.componentId === comp.id && draggedPort?.portId === port.id
					const isEmpty = !port.connectedTo

					// Determine styling based on port state
					let portFill = '#888'
					let portRadius = 4
					let filterUrl = 'none'
					let strokeWidth = 1

					if (port.connectedTo) {
						portFill = '#215296'
					} else if (isSnapTarget) {
						portFill = '#ff1493'
						portRadius = 6
						filterUrl = 'url(#portGlowStrong)'
						strokeWidth = 2
					} else if (isHighlighted) {
						portFill = '#ff69b4'
						portRadius = 5
						filterUrl = 'url(#portGlowMedium)'
						strokeWidth = 1.5
					} else if (isEmpty) {
						portFill = '#b3b3b3'
						filterUrl = 'url(#portGlowSubtle)'
					}

					return (
						<circle
							key={port.id}
							cx={portPos.x}
							cy={portPos.y}
							r={portRadius}
							fill={portFill}
							stroke='#fff'
							strokeWidth={strokeWidth}
							filter={filterUrl}
							style={{
								transition: 'r 0.15s ease, fill 0.15s ease, filter 0.15s ease',
								pointerEvents: 'none',
							}}
						/>
					)
				})}
				<text x={compPos.x} y={compPos.y + CONNECTOR_SIZE / 2 + 12} textAnchor='middle' fontSize={8} fill='#555'>
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
			<style>{`
				@keyframes pulse {
					0%, 100% {
						opacity: 0.2;
						filter: drop-shadow(0 0 2px rgba(255, 20, 147, 0.4));
					}
					50% {
						opacity: 0.5;
						filter: drop-shadow(0 0 8px rgba(255, 20, 147, 0.8));
					}
				}
			`}</style>
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

					{/* Glow filters for port highlighting */}
					<filter id='portGlowSubtle'>
						<feGaussianBlur stdDeviation='2' result='coloredBlur' />
						<feMerge>
							<feMergeNode in='coloredBlur' />
							<feMergeNode in='SourceGraphic' />
						</feMerge>
					</filter>

					<filter id='portGlowMedium'>
						<feGaussianBlur stdDeviation='3.5' result='coloredBlur' />
						<feMerge>
							<feMergeNode in='coloredBlur' />
							<feMergeNode in='SourceGraphic' />
						</feMerge>
					</filter>

					<filter id='portGlowStrong'>
						<feGaussianBlur stdDeviation='5' result='coloredBlur' />
						<feComponentTransfer>
							<feFuncA type='linear' slope='0.8' />
						</feComponentTransfer>
						<feMerge>
							<feMergeNode in='coloredBlur' />
							<feMergeNode in='SourceGraphic' />
						</feMerge>
					</filter>
				</defs>

				{/* Transform group for zoom + pan */}
				<g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
					{/* Ceiling boundary */}
					<rect x={0} y={0} width={ceilingWidth} height={ceilingHeight}
						fill='none' stroke='#999' strokeWidth={2 / zoom} strokeDasharray={`${8 / zoom} ${4 / zoom}`} />

					<g style={{ pointerEvents: 'none' }}>{portHighlightsAndPreview()}</g>

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
