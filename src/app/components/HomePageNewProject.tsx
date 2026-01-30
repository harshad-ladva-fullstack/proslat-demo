import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export const HomePageNewProject = () => {
	const navigate = useNavigate()

	return (
		<Button onClick={() => navigate('/room-builder')}>
			Create new project
		</Button>
	)
}
