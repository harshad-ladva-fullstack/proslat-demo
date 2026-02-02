import { fetchGetAllProjects } from '@/api/project'
import { HomePageCard } from '@/app/components/HomePageCard'
import { HomePageNewProject } from '@/app/components/HomePageNewProject'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useQuery } from '@tanstack/react-query'
import { Container } from '../ui/container'
import { Button } from '../ui/button'
import { Link, useNavigate } from 'react-router-dom'
import { Lightbulb, Plus, Box, ArrowRight } from 'lucide-react'
import { useSavedProjects, useProjectStore } from '@/store/useProjectStore'
import { PAGES_PATHS, getCeilingDesignPath } from '@/constants/page'

export default function Home() {
	const navigate = useNavigate()
	const { data } = useQuery({
		queryKey: [QUERY_KEYS.projectCatalog],
		queryFn: fetchGetAllProjects,
	})
	
	// Local projects from project store (new flow)
	const savedProjects = useSavedProjects()
	const savedRooms = useProjectStore((state) => state.savedRooms)
	
	return (
		<Container className='py-4'>
			{/* New Ceiling Design Flow Section */}
			<div className='mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100'>
				<div className='flex items-start justify-between'>
					<div>
						<h2 className='text-xl font-bold text-gray-900 mb-2 flex items-center gap-2'>
							<Lightbulb className='size-5 text-blue-500' />
							Ceiling Lighting Designer
						</h2>
						<p className='text-gray-600 mb-4 max-w-md'>
							Design custom ceiling lighting configurations. Create a room first, 
							then design the lighting within the room boundaries.
						</p>
						<Link
							to={PAGES_PATHS.roomCreate}
							className='inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
						>
							<Plus className='size-4' />
							Create New Room
						</Link>
					</div>
					
					{/* Quick access to recent ceiling projects */}
					{savedProjects.length > 0 && (
						<div className='hidden md:block'>
							<p className='text-sm text-gray-500 mb-2'>Recent Ceiling Projects:</p>
							<div className='space-y-2'>
								{savedProjects.slice(0, 3).map((project) => {
									const room = project.roomId ? savedRooms[project.roomId] : null
									return (
										<Link
											key={project.id}
											to={room ? getCeilingDesignPath(room.id) : PAGES_PATHS.roomCreate}
											className='flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm'
										>
											<Box className='size-4 text-gray-400' />
											<span className='text-gray-700'>{project.name}</span>
											{room && (
												<span className='text-xs text-gray-400'>
													({room.dimensions.width}×{room.dimensions.depth} ft)
												</span>
											)}
											<ArrowRight className='size-3 text-gray-400 ml-auto' />
										</Link>
									)
								})}
							</div>
						</div>
					)}
				</div>
			</div>
			
			{/* Legacy Projects Section */}
			<div className='flex items-center justify-between mb-4'>
				<div className='flex items-center gap-3'>
					<HomePageNewProject />
					<Button 
						onClick={() => navigate(PAGES_PATHS.roomCreate)}
						className='flex items-center gap-2'
						variant='outline'
					>
						<Lightbulb className='size-4' />
						New Ceiling Project
					</Button>
				</div>
				<h1 className='text-lg font-semibold'>Legacy Projects</h1>
			</div>
			<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
				{data?.map(project => (
					<HomePageCard key={project.id} project={project} />
				))}
			</div>
		</Container>
	)
}
