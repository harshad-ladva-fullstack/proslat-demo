import { fetchGetAllProjects } from '@/api/project'
import { HomePageCard } from '@/app/components/HomePageCard'
import { HomePageNewProject } from '@/app/components/HomePageNewProject'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useQuery } from '@tanstack/react-query'
import { Container } from '../ui/container'

export default function Home() {
	const { data } = useQuery({
		queryKey: [QUERY_KEYS.projectCatalog],
		queryFn: fetchGetAllProjects,
	})
	return (
		<Container className='py-4'>
			<div className='flex items-center justify-between mb-4'>
				<HomePageNewProject />
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
