import { useState, useCallback } from 'react'
import { useCeilingDesignerStore } from '../../store'
import {
	Download,
	RotateCcw,
	Trash2,
	ZoomIn,
	ZoomOut,
	Move,
	Maximize,
} from 'lucide-react'

function getCanvasApi(): any {
	return (window as any).__ceilingCanvas
}

export function CeilingToolbar() {
	const {
		selectedComponentId,
		removeComponent,
		setSelectedComponentId,
	} = useCeilingDesignerStore()

	const [panActive, setPanActive] = useState(false)

	const handleDelete = () => {
		if (selectedComponentId) {
			removeComponent(selectedComponentId)
			setSelectedComponentId(null)
		}
	}

	const handleZoomIn = useCallback(() => getCanvasApi()?.zoomIn?.(), [])
	const handleZoomOut = useCallback(() => getCanvasApi()?.zoomOut?.(), [])

	const handlePanToggle = useCallback(() => {
		const api = getCanvasApi()
		if (!api) return
		const next = !panActive
		setPanActive(next)
		api.setPanMode?.(next)
	}, [panActive])

	const handleResetView = useCallback(() => {
		getCanvasApi()?.resetView?.()
		setPanActive(false)
		getCanvasApi()?.setPanMode?.(false)
	}, [])

	const handleFullscreen = useCallback(() => {
		getCanvasApi()?.toggleFullscreen?.()
	}, [])

	const handleDownload = useCallback(() => {
		// Export the SVG as a downloadable file
		const container = document.querySelector('[class*="flex-1"][class*="overflow-hidden"]') as HTMLDivElement | null
		if (!container) return

		const svg = container.querySelector('svg')
		if (!svg) return

		const clone = svg.cloneNode(true) as SVGSVGElement
		const rect = container.getBoundingClientRect()
		clone.setAttribute('width', String(rect.width))
		clone.setAttribute('height', String(rect.height))

		const data = new XMLSerializer().serializeToString(clone)
		const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'ceiling-layout.svg'
		a.click()
		URL.revokeObjectURL(url)
	}, [])

	const btnBase = 'p-2 rounded-lg transition-colors'

	return (
		<div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-white rounded-xl shadow-lg px-3 py-2 border border-gray-200'>
			<button className={`${btnBase} hover:bg-gray-100`} title='Download SVG' onClick={handleDownload}>
				<Download className='w-5 h-5 text-gray-600' />
			</button>
			<button className={`${btnBase} hover:bg-gray-100`} title='Reset view' onClick={handleResetView}>
				<RotateCcw className='w-5 h-5 text-gray-600' />
			</button>
			<button
				className={`${btnBase} ${selectedComponentId ? 'hover:bg-red-50 text-red-500' : 'text-gray-300 cursor-not-allowed'}`}
				title='Delete selected'
				onClick={handleDelete}
				disabled={!selectedComponentId}
			>
				<Trash2 className='w-5 h-5' />
			</button>
			<div className='w-px bg-gray-200 mx-1' />
			<button className={`${btnBase} hover:bg-gray-100`} title='Zoom in (+)' onClick={handleZoomIn}>
				<ZoomIn className='w-5 h-5 text-gray-600' />
			</button>
			<button className={`${btnBase} hover:bg-gray-100`} title='Zoom out (-)' onClick={handleZoomOut}>
				<ZoomOut className='w-5 h-5 text-gray-600' />
			</button>
			<button
				className={`${btnBase} ${panActive ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
				title='Pan / Move canvas'
				onClick={handlePanToggle}
			>
				<Move className='w-5 h-5' />
			</button>
			<button className={`${btnBase} hover:bg-gray-100`} title='Fullscreen' onClick={handleFullscreen}>
				<Maximize className='w-5 h-5 text-gray-600' />
			</button>
		</div>
	)
}
