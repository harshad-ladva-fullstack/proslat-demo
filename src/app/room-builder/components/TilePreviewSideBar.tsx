import { SideBar } from '@/components/ui/sideBar'
import { Button } from '@/components/ui/button'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { useNavigate, useMatch, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
	RIBTRAX_PRO_TILE,
	RIBTRAX_SMOOTH_PRO_TILE,
} from '@/constants/floor-tiles'

export const TilePreviewSideBar = () => {
	const { rampSelectedTileType, setSelectedEdgesColor } = useRoomBuilderStore()
	const navigate = useNavigate()
	const { id: paramId } = useParams<{ id?: string }>()
	const match = useMatch('/room-builder/edit-room/:id/*')
	const routeId = paramId ?? match?.params?.id

	return (
		<SideBar className='z-2 !bg-white !border-white'>
			<h4 className='font-semibold text-[26px] mb-5'>Design your floor</h4>
			<h4 className='text-sm font-bold mb-6  text-[22px] text-primary'>
				{rampSelectedTileType === 'ribtrax-smooth-pro'
					? 'Ribtrax Smooth Pro'
					: 'Ribtrax Pro'}{' '}
				Colors
			</h4>
			<div>
				<div className='mb-4 grid grid-cols-3 gap-4'>
					{rampSelectedTileType === 'ribtrax-smooth-pro'
						? RIBTRAX_SMOOTH_PRO_TILE.map(tile => (
								<button
									key={tile.id}
									onClick={() => {
										setSelectedEdgesColor(tile.color ?? null)
										navigate(`/room-builder/edit-room/${routeId}/tiles/ramps`)
									}}
								>
									<img src={tile.texture} alt='' />
									<div className='text-left text-primary'>{tile.name}</div>
								</button>
						  ))
						: RIBTRAX_PRO_TILE.map(tile => (
								<button
									key={tile.id}
									onClick={() => {
										setSelectedEdgesColor(tile.color ?? null)
										navigate(`/room-builder/edit-room/${routeId}/tiles/ramps`)
									}}
								>
									<img src={tile.texture} alt='' />
									<div className='text-left text-primary'>{tile.name}</div>
								</button>
						  ))}
				</div>
				<div className='side-bar-nav-btn !bg-white p-10'>
					<Button
						onClick={() =>
							routeId &&
							navigate(`/room-builder/edit-room/${routeId}/tiles/start`)
						}
					>
						<ChevronLeft /> Back
					</Button>
					<Button
						onClick={() =>
							routeId &&
							navigate(`/room-builder/edit-room/${routeId}/tiles/ramps`)
						}
					>
						<ChevronRight /> Next
					</Button>
				</div>
			</div>
		</SideBar>
	)
}
