import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ColorChange } from './ColorChange'

export const ColorSideBar = () => {
	return (
		<div>
			<Tabs defaultValue={'fusion'}>
				<TabsList className='flex-wrap mb-2'>
					<TabsTrigger value={'fusion'}>Fusion</TabsTrigger>
					<TabsTrigger value={'lux'}>Lux</TabsTrigger>
				</TabsList>

				<TabsContent value={'fusion'}>
					<ColorChange />
				</TabsContent>
				<TabsContent value={'lux'}>
					<ColorChange isLux />
				</TabsContent>
			</Tabs>
		</div>
	)
}
