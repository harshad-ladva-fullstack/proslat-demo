import { type FC, type ReactNode } from 'react'

interface ContainerProps {
	children: ReactNode
	className?: string
}

export const Container: FC<ContainerProps> = ({ children, className }) => {
	return (
		<div className={`max-w-[1300px] w-full mx-auto px-4 ${className}`}>
			{children}
		</div>
	)
}
