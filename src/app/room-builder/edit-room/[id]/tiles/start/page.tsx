import { RampSelectScreen } from '../../../../components/RampSelectScreen'
import { useParams } from 'react-router-dom'
import { useTilesRouteSync } from '@/hooks/useTilesRouteSync'

export default function TilesStartPage() {
	useParams<{ id: string; category: string; step: string }>()
	useTilesRouteSync()

	return (
		<>
			<RampSelectScreen />
		</>
	)
}
