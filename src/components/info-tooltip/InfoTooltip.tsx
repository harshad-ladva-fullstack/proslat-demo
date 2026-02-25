import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
	text: string
}

export const InfoTooltip = ({ text }: InfoTooltipProps) => {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Info size={16} />
			</TooltipTrigger>
			<TooltipContent>
				<p className='text-sm text-white'>{text}</p>
			</TooltipContent>
		</Tooltip>
	)
}
