import { useLocation, useNavigate } from 'react-router-dom'
// import { Container } from './components/ui/container'
import AppRoutes from './routes'
import { useRoomBuilderStore } from './store/useRoomBuilderStore'
import { useQuery } from '@tanstack/react-query'
import { fetchGetModelsCatalog } from '@/api/model'
import { QUERY_KEYS } from '@/constants/query-keys'

import { useEffect } from 'react'
import { HeaderNav } from './components/header-nav/HeaderNav'

function App() {
	useQuery({
		queryKey: [QUERY_KEYS.modelCatalog],
		queryFn: fetchGetModelsCatalog,
		staleTime: Infinity,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	})
	const { setSelectedCabinetId, selectSceneSetting } = useRoomBuilderStore()

	const location = useLocation()
	const navigate = useNavigate()

	const handleHomePage = () => {
		navigate('/')
	}

	useEffect(() => {
		setSelectedCabinetId(null)
	}, [selectSceneSetting])

	return (
		<>
			<header className='p-2.5 bg-black min-h-[80px]	flex justify-between items-center'>
				{/* <Container className='flex justify-between items-center'> */}
				<button onClick={handleHomePage}>
					<img src='/img/logo.svg' alt='' />
				</button>
				{location.pathname.includes('/room-builder/edit-room') && <HeaderNav />}
				{/* </Container> */}
			</header>
			<AppRoutes />
		</>
	)
}

export default App
