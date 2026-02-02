import { type FC } from 'react'
import { useNavigate, useMatch, useParams } from 'react-router-dom'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'

export const RampSelectScreen: FC<{
	setShowMenu?: (show: boolean) => void
}> = ({ setShowMenu }) => {
	// read selected tile type from the shared store (only FloorTileSelector sets it)
	const { selectedTileType, setRampSelectedTileType } = useRoomBuilderStore()
	const navigate = useNavigate()
	const { id: paramId } = useParams<{ id?: string }>()
	const match = useMatch('/room-builder/edit-room/:id/*')
	const routeId = paramId ?? match?.params?.id

	const onPick = (id: string) => {
		// write ramp selection to dedicated store field
		setRampSelectedTileType(id)

		// if parent provided setShowMenu (legacy), call it
		if (setShowMenu) {
			setShowMenu(false)
			return
		}

		// otherwise navigate to create-tiles route (route-driven flow)
		if (routeId) {
			navigate(`/room-builder/edit-room/${routeId}/tiles/create-tiles`)
		}
	}

	return (
		<div className='w-full h-full p-20'>
			<h1 className='text-[34px] font-bold text-center'>
				Start by selecting a tile
			</h1>
			<div className='flex justify-between mt-8'>
				<div>
					<div className='text-center text-primary text-[36px] font-bold mb-10 flex items-center gap-4 justify-center'>
						<span className='text-white aspect-square block w-[45px] h-[45px] bg-primary rounded-full text-[26px] leading-[45px] '>
							1
						</span>{' '}
						Ribtrax Pro Tile
					</div>
					<button
						onClick={() => onPick('ribtrax-pro')}
						aria-pressed={selectedTileType === 'ribtrax-pro'}
					>
						<img
							src='/img/ribtraxProTile.png'
							srcSet='/img/ribtraxProTile@2x.png 2x'
							alt='Ribtrax Pro Tile'
						/>
					</button>
				</div>
				<div>
					<div className='text-center text-primary text-[36px] font-bold mb-10 flex items-center gap-4 justify-center'>
						<span className='text-white aspect-square block w-[45px] h-[45px] bg-primary rounded-full text-[26px] leading-[45px] '>
							2
						</span>{' '}
						Ribtrax Smooth Pro Tile
					</div>
					<button
						onClick={() => onPick('ribtrax-smooth-pro')}
						aria-pressed={selectedTileType === 'ribtrax-smooth-pro'}
					>
						<img
							src='/img/ribtraxSmoothProTile.png'
							srcSet='/img/ribtraxSmoothProTile@2x.png 2x'
							alt='Ribtrax Smooth Pro Tile'
						/>
					</button>
				</div>
			</div>
		</div>
	)
}
