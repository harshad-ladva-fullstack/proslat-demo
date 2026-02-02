import { TilePreviewSideBar } from '../../../../components/TilePreviewSideBar'
import { useParams } from 'react-router-dom'
import { useTilesRouteSync } from '@/hooks/useTilesRouteSync'

export default function CreateTilesPage() {
	useParams<{ id: string; category: string; step: string }>()
	useTilesRouteSync()

	return <TilePreviewSideBar />
}
