import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { FLOOR_TILES } from '@/constants/floor-tiles'
import { Button } from '../ui/button'
import { CircleMinus, CirclePlus } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { deleteAllTiles } from '@/api/tiles'
import { useMatch } from 'react-router-dom'

export const FloorTileSelector = () => {
	const {
		setSelectedTileType,
		clearFloorTiles,
		floorTiles,
		setUseEdges,
		useEdges,
	} = useRoomBuilderStore()

	const match = useMatch('/room-builder/edit-room/:id/*')
	const projectId = match?.params?.id

	const deleteMutation = useMutation({
		mutationFn: (projectId: string) => deleteAllTiles(projectId),
		onSuccess: () => {
			if (projectId)
			clearFloorTiles()
		},
	})

	return (
		<div className='floor-tile-selector'>
			<div className='tile-types'>
				<h4 className='text-sm font-bold mb-6 uppercase text-[22px] text-primary'>
					APPLY YOUR RAMPS
				</h4>
				<div className=' mb-4 p-4 rounded-xl border border-gray-300'>
					<div className='text-[22px] font-bold mb-4 uppercase text-primary'>
						RAMP COLORS
					</div>
					<div className='flex flex-wrap gap-4'>
						{FLOOR_TILES.map(tile => (
							<button
								key={tile.id}
								onClick={() => {
									setSelectedTileType(tile.id)
								}}
							>
								<div
									style={{ background: tile.color }}
									className='w-[100px] h-[34px] border border-black rounded-lg'
								></div>
								<span className='font-bold text-xs text-primary'>
									{tile.name}
								</span>
							</button>
						))}
					</div>
				</div>

				<div className='flex flex-col gap-4 mb-4'>
					<Button onClick={() => setUseEdges(false)} disabled={!useEdges}>
						<CircleMinus /> Remove Ramps
					</Button>
					<Button onClick={() => setUseEdges(true)} disabled={useEdges}>
						<CirclePlus /> Add Ramps
					</Button>
				</div>

				{floorTiles.length > 0 && (
					<button
						onClick={() => {
							if (projectId) {
								deleteMutation.mutate(projectId)
							} else {
								clearFloorTiles()
							}
						}}
						className='w-full p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors'
					>
						Clear All Tiles ({floorTiles.length})
					</button>
				)}

				<div className='mt-4 text-xs text-gray-600'>
					<p>• Click to place tiles</p>
					<p>• Hold ALT + Click to remove tiles</p>
					<p>• Click and drag to paint multiple tiles</p>
				</div>
			</div>
		</div>
	)
}
