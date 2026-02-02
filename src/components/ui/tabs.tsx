import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

function Tabs({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			data-slot='tabs'
			className={cn('flex flex-col gap-2', className)}
			{...props}
		/>
	)
}

function TabsList({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
	return (
		<TabsPrimitive.List
			data-slot='tabs-list'
			className={cn(
				'grid gap-0.5 bg-white md:grid-cols-2	grid-cols-1 -m-4 p-0.5',
				className
			)}
			{...props}
		/>
	)
}

function TabsTrigger({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			data-slot='tabs-trigger'
			className={cn(
				'data-[state=active]:[background:radial-gradient(79.77%_79.77%_at_50%_50%,_#FDFDFE_0%,_#D0D7E0_100%)] [background:#215296] text-white data-[state=active]:text-primary p-4 transition-all duration-300 hover:[background:radial-gradient(79.77%_79.77%_at_50%_50%,_#FDFDFE_0%,_#D0D7E0_100%)] hover:text-primary data-[state=active]:hover:[background:#215296] data-[state=active]:hover:text-white',
				className
			)}
			{...props}
		/>
	)
}

function TabsContent({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			data-slot='tabs-content'
			className={cn('flex-1 mt-4  outline-none', className)}
			{...props}
		/>
	)
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
