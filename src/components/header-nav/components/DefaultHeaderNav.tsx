import { camelCaseToNormal } from '@/lib/utils'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { ChevronRight } from 'lucide-react'
import { useNavigate, useParams, useLocation, useMatch } from 'react-router-dom'

export const DefaultHeaderNav = () => {
	const navigate = useNavigate()
	const location = useLocation()
	const { category } = useParams<{ category?: string }>()
	// useMatch will extract id and category even if component is not rendered inside a route element
	const matchWithCategory = useMatch('/room-builder/edit-room/:id/:category/*')
	const matchWithoutCategory = useMatch('/room-builder/edit-room/:id/*')
	const match = matchWithCategory ?? matchWithoutCategory
	const routeId = match?.params?.id as string | undefined
	const routeCategory =
		(matchWithCategory?.params?.category as string | undefined) ?? category

	const { setSelectSceneSetting } = useRoomBuilderStore()

	const handleHomeClick = () => {
		setSelectSceneSetting('default')
		if (routeId) navigate(`/room-builder/edit-room/${routeId}`)
		else navigate('/room-builder')
	}

	const handleCategoryConfigureClick = () => {
		if (routeId && routeCategory)
			navigate(`/room-builder/edit-room/${routeId}/${routeCategory}`)
	}

	const handleWorksurfaceClick = () => {
		if (routeId && routeCategory)
			navigate(
				`/room-builder/edit-room/${routeId}/${routeCategory}/worksurfaces`
			)
	}

	const handleBacksplashClick = () => {
		if (routeId && routeCategory)
			navigate(
				`/room-builder/edit-room/${routeId}/${routeCategory}/backsplashes`
			)
	}

	const handleTilesStartClick = () => {
		if (routeId) navigate(`/room-builder/edit-room/${routeId}/tiles/start`)
	}

	const handleTilesCreateClick = () => {
		if (routeId)
			navigate(`/room-builder/edit-room/${routeId}/tiles/create-tiles`)
	}

	const handleTilesRampsClick = () => {
		if (routeId) navigate(`/room-builder/edit-room/${routeId}/tiles/ramps`)
	}

	const isActive = (path: string) => location.pathname === path

	return (
		<div className='flex items-center gap-2'>
			<button
				className='text-[18px] border-b border-transparent '
				onClick={handleHomeClick}
			>
				Home
			</button>
			<ChevronRight />
			{routeCategory && (
				<span className='text-[18px] border-b border-transparent '>
					{camelCaseToNormal(routeCategory!)}
				</span>
			)}
			<ChevronRight />

			{routeCategory === 'tiles' ? (
				<>
					<button
						className={`text-[18px] border-b border-transparent ${
							isActive(`/room-builder/edit-room/${routeId}/tiles/start`)
								? 'font-bold !border-[#939393] text-[#939393]'
								: ''
						}`}
						onClick={handleTilesStartClick}
					>
						Start
					</button>
					<ChevronRight />
					<button
						className={`text-[18px] border-b border-transparent ${
							isActive(`/room-builder/edit-room/${routeId}/tiles/create-tiles`)
								? 'font-bold !border-[#939393] text-[#939393]'
								: ''
						}`}
						onClick={handleTilesCreateClick}
					>
						Create Tiles
					</button>
					<ChevronRight />
					<button
						className={`text-[18px] border-b border-transparent ${
							isActive(`/room-builder/edit-room/${routeId}/tiles/ramps`)
								? 'font-bold !border-[#939393] text-[#939393]'
								: ''
						}`}
						onClick={handleTilesRampsClick}
					>
						Ramps
					</button>
				</>
			) : routeCategory ? (
				<>
					<button
						className={`text-[18px] border-b border-transparent ${
							isActive(`/room-builder/edit-room/${routeId}/${category}`)
								? 'font-bold !border-[#939393] text-[#939393]'
								: ''
						}`}
						onClick={handleCategoryConfigureClick}
					>
						Configure
					</button>
					<ChevronRight />
					<button
						className={`text-[18px] border-b border-transparent ${
							isActive(
								`/room-builder/edit-room/${routeId}/${category}/worksurfaces`
							)
								? 'font-bold !border-[#939393] text-[#939393]'
								: ''
						}`}
						onClick={handleWorksurfaceClick}
					>
						Worksurface
					</button>
					<ChevronRight />

					<button
						className={`text-[18px] border-b border-transparent ${
							isActive(
								`/room-builder/edit-room/${routeId}/${category}/backsplashes`
							)
								? 'font-bold !border-[#939393] text-[#939393]'
								: ''
						}`}
						onClick={handleBacksplashClick}
					>
						Backsplashes
					</button>
				</>
			) : null}
		</div>
	)
}
