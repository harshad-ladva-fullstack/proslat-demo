import { LeftBar } from '../../../components/LeftBar'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { LeftBarEditById } from '../../../components/LeftBarEditById'
import { useParams } from 'react-router-dom'
import { useRouteSync } from '@/hooks/useRouteSync'

export default function EditRoomCategoryPage() {
	const { selectedCabinetId } = useRoomBuilderStore()
	useParams<{ id: string; category: string }>()

	useRouteSync()

	return (
		<div className='room-builder-page'>
			{selectedCabinetId ? <LeftBarEditById /> : <LeftBar />}
		</div>
	)
}
