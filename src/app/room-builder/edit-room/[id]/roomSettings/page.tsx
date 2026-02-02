import { RoomSettings } from '@/app/room-builder/components/RoomSettings'
import { SideBar } from '@/components/ui/sideBar'
import { useRouteSync } from '@/hooks/useRouteSync'

export default function RoomSettingsPage() {
	useRouteSync()

	return (
		<SideBar>
			<RoomSettings />
		</SideBar>
	)
}
