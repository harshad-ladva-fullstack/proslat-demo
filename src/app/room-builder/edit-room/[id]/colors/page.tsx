import { ColorSideBar } from '@/modules/color-bar/ColorSideBar'
import { useRouteSync } from '@/hooks/useRouteSync'
import { SideBar } from '@/components/ui/sideBar'

export default function ColorsPage() {
	useRouteSync()

	return (
		<SideBar>
			<ColorSideBar />
		</SideBar>
	)
}
