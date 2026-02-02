import { useParams, useNavigate } from 'react-router-dom'
import { useRouteSync } from '@/hooks/useRouteSync'
import { SideBar } from '@/components/ui/sideBar'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/query-keys'
import { fetchGetModelsCatalog } from '@/api/model'
import { getModelImagePath, camelCaseToNormal } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function BacksplashesPage() {
	const { id, category } = useParams<{
		id: string
		category: string
		step: string
	}>()
	const navigate = useNavigate()

	useRouteSync()

	const { setModelType } = useRoomBuilderStore()

	const { data } = useQuery({
		queryKey: [QUERY_KEYS.modelCatalog],
		queryFn: fetchGetModelsCatalog,
	})

	return (
		<div className='room-builder-page'>
			<SideBar>
				<div className='p-2'>
					<div className='text-[24px] font-medium mb-6'>
						Optional Backsplashes
					</div>
					<div className='grid grid-cols-3 gap-2'>
						{data
							?.filter(model => model.type === 'surface-wall')
							.map((model, modelIndex) => (
								<button
									key={modelIndex}
									className='p-2 flex flex-col  justify-start border-gray-100 rounded hover:border-gray-200 transition-colors'
									draggable
									onDragStart={() => {
										setModelType(model)
									}}
									onDragEnd={() => {
										setModelType(null)
									}}
								>
									<div className='flex items-center justify-center mb-2 overflow-hidden rounded-sm bg-white border border-primary p-4 aspect-square'>
										<img
											src={getModelImagePath(model.name)}
											className='mixed-blend-multiply h-full'
											alt=''
										/>
									</div>
									<span className='text-sm text-primary underline underline-offset-4 hover:no-underline text-left'>
										{camelCaseToNormal(model.name)}
									</span>
								</button>
							))}
					</div>
				</div>

				<div className='side-bar-nav-btn'>
					<Button
						className='m-4 w-auto'
						onClick={() =>
							id &&
							category &&
							navigate(`/room-builder/edit-room/${id}/${category}/worksurfaces`)
						}
					>
						<ChevronLeft /> Back
					</Button>
				</div>
			</SideBar>
		</div>
	)
}
