import { useCeilingDesignerStore } from '../../store'
import {
	COMPONENT_LABELS,
	CONNECTOR_TYPES,
	CONNECTOR_SHAPES,
} from '../../constants'
import type {
	CeilingComponentType,
	ComponentColor,
	ConnectorType,
	LightBarLength,
} from '../../types'

// ── Small SVG icon for each connector shape ──
function ConnectorIcon({
	type,
	color,
	size = 48,
}: {
	type: ConnectorType | 'hub'
	color: ComponentColor
	size?: number
}) {
	const fill = color === 'black' ? '#1a1a1a' : '#f0f0f0'
	const stroke = color === 'black' ? '#444' : '#aaa'
	const path = CONNECTOR_SHAPES[type]

	return (
		<svg
			width={size}
			height={size}
			viewBox='0 0 24 24'
			className='pointer-events-none'
		>
			<path d={path} fill={fill} stroke={stroke} strokeWidth={1} />
		</svg>
	)
}

// ── Light bar icon (simple line) ──
function LightBarIcon({
	length,
	color,
}: {
	length: LightBarLength
	color: ComponentColor
}) {
	const w = length === 36 ? 80 : 48
	const fill = color === 'black' ? '#1a1a1a' : '#f0f0f0'
	const stroke = color === 'black' ? '#444' : '#aaa'

	return (
		<svg width={w} height={20} className='pointer-events-none'>
			<rect
				x={0}
				y={4}
				width={w}
				height={12}
				rx={3}
				fill={fill}
				stroke={stroke}
				strokeWidth={1}
			/>
			<line
				x1={4}
				y1={10}
				x2={w - 4}
				y2={10}
				stroke='rgba(255,255,255,0.6)'
				strokeWidth={2}
				strokeLinecap='round'
			/>
		</svg>
	)
}

export function CeilingSidebar() {
	const {
		activeColor,
		setActiveColor,
		setDragPayload,
		hasHub,
		getLayoutSummary,
		components,
		selectedComponentId,
		setSelectedComponentId,
		removeComponent,
		setComponentColor,
		setLightMode,
		rotateComponent,
	} = useCeilingDesignerStore()

	const summary = getLayoutSummary()
	const selectedComp = components.find((c) => c.id === selectedComponentId)

	// True drag: set payload on mousedown so user can drag directly to canvas
	const handlePaletteMouseDown = (
		type: CeilingComponentType,
		length?: LightBarLength
	) => {
		setDragPayload({ type, length })
	}

	return (
		<aside className='bg-[#E0E0E0] border-l-2 border-black min-w-[430px] w-[430px] max-w-[430px] overflow-y-auto pb-[68px]'>
			{/* ── PALETTE SECTION ── */}
			<div className='p-4'>
				<h2 className='text-lg font-bold mb-3'>
					Drag your light and connectors
				</h2>

				{/* Light Bars */}
				<div className='grid grid-cols-2 gap-3 mb-4'>
					<button
						className='flex flex-col items-center gap-1 p-3 rounded-lg border border-gray-300 bg-white hover:border-[#215296] transition-colors cursor-grab active:cursor-grabbing select-none'
						onMouseDown={() => handlePaletteMouseDown('light-bar', 18)}
					>
						<LightBarIcon length={18} color={activeColor} />
						<span className='text-xs text-gray-600 font-medium'>
							Light 18"
						</span>
					</button>
					<button
						className='flex flex-col items-center gap-1 p-3 rounded-lg border border-gray-300 bg-white hover:border-[#215296] transition-colors cursor-grab active:cursor-grabbing select-none'
						onMouseDown={() => handlePaletteMouseDown('light-bar', 36)}
					>
						<LightBarIcon length={36} color={activeColor} />
						<span className='text-xs text-gray-600 font-medium'>
							Light 36"
						</span>
					</button>
				</div>

				{/* Connectors grid */}
				<div className='grid grid-cols-4 gap-2 mb-4'>
					{/* Hub first – only if no hub placed yet */}
					{!hasHub() && (
						<button
							className='flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-300 bg-white hover:border-[#215296] transition-colors cursor-grab active:cursor-grabbing select-none'
							onMouseDown={() => handlePaletteMouseDown('hub')}
						>
							<ConnectorIcon type='hub' color={activeColor} />
							<span className='text-[10px] text-gray-600'>Hub</span>
						</button>
					)}

					{CONNECTOR_TYPES.map((ct) => (
						<button
							key={ct}
							className='flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-300 bg-white hover:border-[#215296] transition-colors cursor-grab active:cursor-grabbing select-none'
							disabled={!hasHub()}
							onMouseDown={() => handlePaletteMouseDown(ct)}
						>
							<ConnectorIcon type={ct} color={activeColor} />
							<span className='text-[10px] text-gray-600 leading-tight text-center'>
								{COMPONENT_LABELS[ct]}
							</span>
						</button>
					))}
				</div>

				{/* ── COLOR SELECTOR ── */}
				<div className='mb-4'>
					<h3 className='text-sm font-bold mb-2'>Colors</h3>
					<div className='flex gap-3'>
						<button
							className={`w-10 h-10 rounded-full border-2 bg-black ${
								activeColor === 'black'
									? 'border-[#215296] ring-2 ring-[#215296]'
									: 'border-gray-400'
							}`}
							onClick={() => setActiveColor('black')}
						>
							<span className='sr-only'>Black</span>
						</button>
						<button
							className={`w-10 h-10 rounded-full border-2 bg-white ${
								activeColor === 'white'
									? 'border-[#215296] ring-2 ring-[#215296]'
									: 'border-gray-400'
							}`}
							onClick={() => setActiveColor('white')}
						>
							<span className='sr-only'>White</span>
						</button>
					</div>
					<div className='flex gap-6 mt-1'>
						<span className='text-xs text-gray-500 w-10 text-center'>Black</span>
						<span className='text-xs text-gray-500 w-10 text-center'>White</span>
					</div>
				</div>
			</div>

			{/* ── SELECTED COMPONENT PROPERTIES ── */}
			{selectedComp && (
				<div className='border-t border-gray-400 p-4'>
					<h3 className='text-sm font-bold mb-2'>
						Selected: {COMPONENT_LABELS[selectedComp.type]}
					</h3>

					{/* Color toggle */}
					<div className='flex items-center gap-3 mb-3'>
						<span className='text-xs text-gray-600'>Color:</span>
						<button
							className={`w-7 h-7 rounded-full border-2 bg-black ${
								selectedComp.color === 'black'
									? 'border-[#215296]'
									: 'border-gray-400'
							}`}
							onClick={() =>
								setComponentColor(selectedComp.id, 'black')
							}
						/>
						<button
							className={`w-7 h-7 rounded-full border-2 bg-white ${
								selectedComp.color === 'white'
									? 'border-[#215296]'
									: 'border-gray-400'
							}`}
							onClick={() =>
								setComponentColor(selectedComp.id, 'white')
							}
						/>
					</div>

					{/* Light mode (only for light bars) */}
					{selectedComp.type === 'light-bar' && (
						<div className='flex items-center gap-3 mb-3'>
							<span className='text-xs text-gray-600'>Light:</span>
							<button
								className={`px-3 py-1 text-xs rounded border ${
									(selectedComp as any).lightMode === 'white'
										? 'bg-[#215296] text-white border-[#215296]'
										: 'bg-white text-gray-700 border-gray-300'
								}`}
								onClick={() => setLightMode(selectedComp.id, 'white')}
							>
								White
							</button>
							<button
								className={`px-3 py-1 text-xs rounded border ${
									(selectedComp as any).lightMode === 'rgb'
										? 'bg-[#215296] text-white border-[#215296]'
										: 'bg-white text-gray-700 border-gray-300'
								}`}
								onClick={() => setLightMode(selectedComp.id, 'rgb')}
							>
								RGB
							</button>
						</div>
					)}

					{/* Rotate */}
					{selectedComp.type !== 'hub' && (
						<div className='flex items-center gap-2 mb-3'>
							<span className='text-xs text-gray-600'>Rotate:</span>
							<button
								className='px-2 py-1 text-xs bg-white rounded border border-gray-300 hover:bg-gray-100'
								onClick={() => rotateComponent(selectedComp.id, -45)}
							>
								-45°
							</button>
							<button
								className='px-2 py-1 text-xs bg-white rounded border border-gray-300 hover:bg-gray-100'
								onClick={() => rotateComponent(selectedComp.id, 45)}
							>
								+45°
							</button>
							<button
								className='px-2 py-1 text-xs bg-white rounded border border-gray-300 hover:bg-gray-100'
								onClick={() => rotateComponent(selectedComp.id, 90)}
							>
								+90°
							</button>
						</div>
					)}

					{selectedComp.type === 'light-bar' && (
						<div className='mb-3 p-2 bg-blue-50 rounded border border-blue-200'>
							<p className='text-xs text-gray-600'>
								<strong>Note:</strong> Light orientation is automatically determined by its connection port, but you can customize it with rotation controls above.
							</p>
						</div>
					)}

					{/* Remove */}
					<button
						className='px-4 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition'
						onClick={() => {
							removeComponent(selectedComp.id)
							setSelectedComponentId(null)
						}}
					>
						Remove {selectedComp.type === 'hub' ? '(removes all)' : ''}
					</button>
				</div>
			)}

			{/* ── SUMMARY ── */}
			<div className='border-t border-gray-400 p-4'>
				<h3 className='text-sm font-bold mb-2'>Layout Summary</h3>
				<div className='grid grid-cols-2 gap-y-1.5 text-xs'>
					<span className='text-gray-600'>Components:</span>
					<span className='font-medium'>{summary.componentCount}</span>

					<span className='text-gray-600'>Total Light Length:</span>
					<span className='font-medium'>
						{summary.totalLengthFeet} / {summary.maxLengthFeet} ft
					</span>

					<span className='text-gray-600'>Total Watts:</span>
					<span className='font-medium'>{summary.totalWatts} W</span>

					<span className='text-gray-600'>Estimated Price:</span>
					<span className='font-medium'>${summary.estimatedPrice}</span>
				</div>

				{/* Progress bar for length limit */}
				<div className='mt-3'>
					<div className='w-full bg-gray-300 rounded-full h-2'>
						<div
							className='h-2 rounded-full transition-all'
							style={{
								width: `${Math.min(
									100,
									(summary.totalLengthFeet / summary.maxLengthFeet) * 100
								)}%`,
								backgroundColor:
									summary.totalLengthFeet / summary.maxLengthFeet > 0.9
										? '#ef4444'
										: '#215296',
							}}
						/>
					</div>
					<p className='text-[10px] text-gray-500 mt-1'>
						Max {summary.maxLengthFeet} linear feet per hub
					</p>
				</div>
			</div>
		</aside>
	)
}
