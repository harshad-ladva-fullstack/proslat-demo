import { FloorSideBarSettings } from '../../../../components/FloorSideBarSettings'
import { useParams } from 'react-router-dom'
import { useTilesRouteSync } from '@/hooks/useTilesRouteSync'
import { useEffect } from 'react'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'

export default function RampsPage() {
	useParams<{ id: string; category: string; step: string }>()

	const { toggleFloorTilesEnabled } = useRoomBuilderStore()

	useTilesRouteSync()

	useEffect(() => {
		toggleFloorTilesEnabled()

		return () => {
			toggleFloorTilesEnabled()
		}
	}, [])

	return <FloorSideBarSettings />
}
