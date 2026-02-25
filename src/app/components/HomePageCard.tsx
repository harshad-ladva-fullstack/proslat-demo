import placeholder from '@/app/assets/images/placehold.jpg'
import type { Project } from '@/types/project'
import { Trash } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/query-keys'
import { fetchDeleteProject } from '@/api/project'
import { useNavigate } from 'react-router-dom'
import { PAGES_PATHS } from '@/constants/page'

interface HomePageCardProps {
	project: Project
}

export const HomePageCard = ({ project }: HomePageCardProps) => {
	const navigate = useNavigate()

	const queryClient = useQueryClient()

	const { mutate: handleDelete } = useMutation({
		mutationFn: () => {
			if (typeof project.id === 'undefined') {
				throw new Error('Project ID is undefined')
			}
			return fetchDeleteProject(project.id)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.projectCatalog] })
		},
	})

	return (
		<div
			className='relative overflow-hidden border shadow hover:shadow-lg transition-shadow cursor-pointer'
			onClick={() => navigate(`${PAGES_PATHS.editRoom}/${project.id}`)}
		>
			<button
				type='button'
				className='absolute size-7 top-2 right-2 bg-white rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center'
				aria-label='Delete'
				onClick={e => {
					e.stopPropagation()
					handleDelete()
				}}
			>
				<Trash size={16} />
			</button>
			<img
				src={placeholder}
				alt='Project image'
				width={400}
				className='w-full object-cover'
				height={250}
			/>
			<div className='p-2'>
				<h2 className='text-xl font-semibold'>{project.name}</h2>
			</div>
		</div>
	)
}
