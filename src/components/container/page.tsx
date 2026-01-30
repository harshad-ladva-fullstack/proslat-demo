import { fetchGetAllProjects } from '@/api/project'
import { HomePageCard } from '@/app/components/HomePageCard'
import { HomePageNewProject } from '@/app/components/HomePageNewProject'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useQuery } from '@tanstack/react-query'
import { Container } from '../ui/container'
import { Button } from '../ui/button'
import { useNavigate } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'

export default function Home() {
	const navigate = useNavigate()
	const { data } = useQuery({
		queryKey: [QUERY_KEYS.projectCatalog],
		queryFn: fetchGetAllProjects,
	})
	return (
		<Container className='py-4'>
			<div className='flex items-center justify-between mb-4'>
				<div className='flex items-center gap-3'>
					<HomePageNewProject />
					<Button 
						onClick={() => navigate('/design/ceiling')}
						className='flex items-center gap-2'
					>
						<Lightbulb className='size-4' />
						Ceiling Designer
					</Button>
				</div>
				<h1>List of projects</h1>
			</div>
			<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
				{data?.map(project => (
					<HomePageCard key={project.id} project={project} />
				))}
			</div>
		</Container>
	)
}
