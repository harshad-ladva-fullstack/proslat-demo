import { type ReactNode } from 'react'

interface SideBarProps {
	children: ReactNode
	className?: string
}

export const SideBar = ({ children, className }: SideBarProps) => {
	return (
		<aside
			className={`bg-[#E0E0E0] border-l-2 relative border-black min-w-[430px] w-[430px] max-w-[430px] p-4 ${className} overflow-y-auto pb-[68px]`}
		>
			{children}
		</aside>
	)
}
