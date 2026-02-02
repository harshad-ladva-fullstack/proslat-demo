import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { DefaultHeaderNav } from './components/DefaultHeaderNav'
import { ProductHeaderNav } from './components/ProductHeaderNav'

export const HeaderNav = () => {
	const { selectSceneSetting } = useRoomBuilderStore()

	return (
		<div className='text-white flex items-center gap-7 z-2'>
			{selectSceneSetting === 'models' ? (
				<DefaultHeaderNav />
			) : (
				<ProductHeaderNav />
			)}
		</div>
	)
}
