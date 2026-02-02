import { useNavigate, useParams } from 'react-router-dom'
import { useRouteSync } from '@/hooks/useRouteSync'
import { SideBar } from '@/components/ui/sideBar'
import { LeftBarTabs } from '@/app/room-builder/components/LeftBarTabs'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function WorksurfacesPage() {
	const { id, category } = useParams<{
		id: string
		category: string
		step: string
	}>()
	const navigate = useNavigate()

	useRouteSync()

	return (
		<div className='room-builder-page'>
			<SideBar>
				<LeftBarTabs showOnlySurfaces />
				<div className='side-bar-nav-btn'>
					<Button
						className='m-4 w-auto'
						onClick={() =>
							id &&
							category &&
							navigate(`/room-builder/edit-room/${id}/${category}`)
						}
					>
						<ChevronLeft /> Back
					</Button>
					<Button
						className='m-4 w-auto'
						onClick={() =>
							id &&
							category &&
							navigate(`/room-builder/edit-room/${id}/${category}/backsplashes`)
						}
					>
						Next <ChevronRight />
					</Button>
				</div>
			</SideBar>
		</div>
	)
}
