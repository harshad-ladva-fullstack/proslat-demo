import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { camelCaseToNormal, getModelImagePath } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/query-keys'
import { fetchGetModelsCatalog } from '@/api/model'
import { useMemo, useEffect, useState } from 'react'
import isEqual from 'lodash.isequal'
import { Button } from '@/components/ui/button'
import { Palette } from 'lucide-react'
import { useNavigate, useParams, useMatch } from 'react-router-dom'

export const LeftBarTabs = ({
	showOnlySurfaces,
}: {
	showOnlySurfaces?: boolean
}) => {
	const {
		setModelType,
		setModelCategories,
		modelCategories,
		selectedModelCategory,
	} = useRoomBuilderStore()

	const navigate = useNavigate()
	const { id: paramId } = useParams<{ id?: string }>()
	const match = useMatch('/room-builder/edit-room/:id/*')
	const routeId = paramId ?? match?.params?.id

	const { data } = useQuery({
		queryKey: [QUERY_KEYS.modelCatalog],
		queryFn: fetchGetModelsCatalog,
	})

	const categories = useMemo(() => {
		const allCategories =
			([...new Set(data?.map(model => model.category))].filter(
				(cat): cat is string => cat !== undefined
			) as string[]) || []

		if (showOnlySurfaces) {
			return allCategories.filter(c => c === 'worksurfaces')
		}

		return allCategories
	}, [data, showOnlySurfaces])

	const effectiveCategory = showOnlySurfaces
		? 'worksurfaces'
		: selectedModelCategory || ''

	useEffect(() => {
		// Avoid overwriting the global categories when this tab is in
		// "showOnlySurfaces" mode. The header nav also writes categories to
		// the store and when both components set different arrays it can
		// cause an infinite update loop (they keep toggling each other).
		if (!showOnlySurfaces && !isEqual(modelCategories, categories)) {
			setModelCategories(categories)
		}
	}, [categories, modelCategories, setModelCategories, showOnlySurfaces])

	// Sentinel used to group models whose subcategory is null or undefined.
	// Without this, those models render as an invisible blank tab button.
	const FALLBACK_SUBCATEGORY = '__general__'

	const getSubcategories = (category: string) => {
		return [
			...new Set(
				data
					?.filter(model => model.category === category)
					.map(model => model.subcategory || FALLBACK_SUBCATEGORY)
			),
		].filter((sub): sub is string => typeof sub === 'string')
	}

	const [activeSubcategory, setActiveSubcategory] = useState<string>(
		() => getSubcategories(effectiveCategory)[0] || ''
	)

	useEffect(() => {
		const first =
			(
				[
					...new Set(
						data
							?.filter(model => model.category === effectiveCategory)
							.map(model => model.subcategory || FALLBACK_SUBCATEGORY)
					),
				].filter((sub): sub is string => typeof sub === 'string')
			)[0] || ''

		setActiveSubcategory(first)
	}, [effectiveCategory, data])

	return (
		<Tabs
			key={effectiveCategory}
			className='h-full'
			value={activeSubcategory}
			onValueChange={setActiveSubcategory}
		>
			<TabsList className='flex-wrap mb-2'>
				{getSubcategories(effectiveCategory).map((subcategory, subIndex) => (
					<TabsTrigger key={subIndex} value={subcategory}>
						{subcategory === FALLBACK_SUBCATEGORY
							? 'General'
							: camelCaseToNormal(subcategory)}
					</TabsTrigger>
				))}
			</TabsList>
			{!showOnlySurfaces && (
				<div className='flex items-center justify-between mt-4'>
					<div className='text-[22px] font-medium'>Configure your set</div>
					<Button
						onClick={() =>
							routeId && navigate(`/room-builder/edit-room/${routeId}/colors`)
						}
					>
						Edit colors <Palette />
					</Button>
				</div>
			)}

			{getSubcategories(effectiveCategory).map((subcategory, subIndex) => (
				<TabsContent key={subIndex} value={subcategory}>
					<div className='grid grid-cols-3  overflow-auto gap-2 pb-[68px]'>
						{data
							?.filter(
								model =>
									model.category === effectiveCategory &&
									(model.subcategory || FALLBACK_SUBCATEGORY) === subcategory
							)
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
				</TabsContent>
			))}
		</Tabs>

		// <Tabs defaultValue={categories[0] || ''}>
		// 	<TabsList className='flex-wrap mb-2'>
		// 		{categories.map((category, index) => (
		// 			<TabsTrigger key={index} value={category || ''}>
		// 				{camelCaseToNormal(category || '')}
		// 			</TabsTrigger>
		// 		))}
		// 	</TabsList>

		// 	{categories.map((category, index) => (
		// 		<TabsContent key={index} value={category || ''}>
		// 			<div className='h-[calc(100vh-300px)]  overflow-auto p-2'>

		// 			</div>
		// 		</TabsContent>
		// 	))}
		// </Tabs>
	)
}
