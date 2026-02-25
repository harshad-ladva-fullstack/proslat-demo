import { WALL_COLORS } from '@/constants/constants'
import { useRoomSettings } from '@/hooks/useRoomSettings'

export const RoomSettings = () => {
	const { setWallColor } = useRoomSettings()
	return (
		<div className='p-2'>
			<h4 className='font-semibold mb-2'>Change Wall Color</h4>

			<div className='flex flex-wrap gap-2'>
				{WALL_COLORS.map(color => (
					<button
						key={color}
						onClick={() => setWallColor(color)}
						className='w-7 h-7 rounded-sm border border-gray-300 hover:border-gray-600 transition'
						style={{ backgroundColor: color }}
					/>
				))}
			</div>
		</div>
	)
}
