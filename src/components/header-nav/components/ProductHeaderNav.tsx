import { SCENE_CATEGORIES, SCENE_SETTINGS } from '@/constants/constants'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { ChevronDown } from 'lucide-react'
import { useNavigate, useParams, useMatch } from 'react-router-dom'

import { Fragment, useEffect, useMemo } from 'react'
import { camelCaseToNormal } from '@/lib/utils'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/query-keys'
import { fetchGetModelsCatalog } from '@/api/model'
import isEqual from 'lodash.isequal'

export const ProductHeaderNav = () => {
	const navigate = useNavigate()
	const { id: paramId } = useParams<{ id?: string }>()
	const match = useMatch('/room-builder/edit-room/:id/*')
	const id = paramId ?? match?.params?.id
	const categoryMatch = useMatch('/room-builder/edit-room/:id/:category/*')
	const routeCategory = categoryMatch?.params?.category
	const {
		setSelectSceneSetting,
		selectSceneSetting,
		modelCategories,
		setModelCategories,
	} = useRoomBuilderStore()

	const { data } = useQuery({
		queryKey: [QUERY_KEYS.modelCatalog],
		queryFn: fetchGetModelsCatalog,
	})

	const categories = useMemo(() => {
		return (
			[...new Set(data?.map(model => model.category))].filter(
				(cat): cat is string => cat !== undefined
			) || []
		)
	}, [data])

	useEffect(() => {
		if (!isEqual(modelCategories, categories)) {
			setModelCategories(categories)
		}
	}, [categories, modelCategories, setModelCategories])

	const handleModelTypeSelect = (type: string) => {
		setSelectSceneSetting('models')
		navigate(`/room-builder/edit-room/${id}/${type}`)
	}

	const handleTilesSelect = () => {
		setSelectSceneSetting('models')
		navigate(`/room-builder/edit-room/${id}/tiles/start`)
	}

	return (
		<>
			{SCENE_SETTINGS.map(setting =>
				setting.isCategories ? (
					<Fragment key={setting.value}>
						<Popover>
							<PopoverTrigger
								className={`text-[18px] border-b border-transparent uppercase transition-colors flex gap-2.5 items-center [&[aria-expanded='true']_svg]:rotate-0`}
							>
								{setting.label}
								<ChevronDown className='rotate-180 transition-transform' />
							</PopoverTrigger>
							<PopoverContent className='bg-[#9F9F9F] mt-[30px] rounded-none max-w-[190px] p-0'>
								<div className='flex flex-col'>
									{modelCategories &&
										modelCategories
											.filter(category => !SCENE_CATEGORIES.includes(category))
											.map(category => (
												<button
													className='text-white p-3 leading-[100%] text-left text-[22px] transition-all  hover:bg-[#616365]'
													key={category}
													onClick={() => handleModelTypeSelect(category)}
												>
													{camelCaseToNormal(category)}
												</button>
											))}
									<button
										className='text-white p-3 leading-[100%] text-left text-[22px] transition-all  hover:bg-[#616365]'
										onClick={handleTilesSelect}
									>
										Tiles
									</button>
								</div>
							</PopoverContent>
						</Popover>
					</Fragment>
				) : (
					<Fragment key={setting.value}>
						<button
							className={`text-[18px] border-b border-transparent uppercase ${
								setting.value === selectSceneSetting ||
								routeCategory === setting.value
									? 'font-bold border-[#939393] text-[#939393]'
									: ''
							}`}
							onClick={() => {
								setSelectSceneSetting(setting.value)
								navigate(`/room-builder/edit-room/${id}/${setting.value}`)
							}}
						>
							{setting.label}
						</button>
					</Fragment>
				)
			)}
		</>
	)
}
