import { useLocation, useNavigate, Link } from 'react-router-dom'
// import { Container } from './components/ui/container'
import AppRoutes from './routes'
import { useRoomBuilderStore } from './store/useRoomBuilderStore'
import { useQuery } from '@tanstack/react-query'
import { fetchGetModelsCatalog } from '@/api/model'
import { QUERY_KEYS } from '@/constants/query-keys'
import { PAGES_PATHS } from '@/constants/page'

import { useEffect } from 'react'
import { HeaderNav } from './components/header-nav/HeaderNav'
// CeilingHeader removed - simplified header

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

	const isCeilingPage = location.pathname === PAGES_PATHS.ceiling
	const isEditRoomPage = location.pathname.includes('/room-builder/edit-room')

	return (
		<>
			<header className='px-4 py-2.5 bg-black/80 backdrop-blur-sm min-h-[64px] flex justify-between items-center border-b border-white/10'>
				<div className='flex items-center gap-4'>
					<button onClick={handleHomePage} className='flex items-center gap-2'>
						<img src='/img/logo.svg' alt='Logo' className='h-8' />
					</button>
				</div>
				
				{/* Navigation */}
				{isEditRoomPage && <HeaderNav />}
			</header>
			<AppRoutes />
		</>
	)
}

export default App
