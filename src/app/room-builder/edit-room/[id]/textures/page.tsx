import { Textures } from '@/components/textures/Textures'
import { SideBar } from '@/components/ui/sideBar'
import { useRouteSync } from '@/hooks/useRouteSync'

export default function TexturesPage() {
	useRouteSync()

	return (
		<div className='room-builder-page'>
			<SideBar>
				<Textures />
			</SideBar>
		</div>
	)
}
