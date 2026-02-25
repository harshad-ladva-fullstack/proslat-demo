import { useVisualizeModelColors } from '@/hooks/useVisualizeModelColors'
import { COLORS } from '@/constants/constants'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { camelCaseToNormal } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

interface ColorChangeProps {
	isLux?: boolean
}

export const ColorChange = ({ isLux }: ColorChangeProps) => {
	const {
		resetColorsToDefault,
		changeColor,
		changeColorOnLuxModels,
		changeColorOnRegularModels,
	} = useVisualizeModelColors()
	const { selectedCabinetId, cabinets, currentColors, setCurrentColors } =
		useRoomBuilderStore()

	const navigate = useNavigate()

	const getCurrentColor = (type: string): string | undefined => {
		if (selectedCabinetId) {
			const cabinet = cabinets.find(c => c.id === selectedCabinetId)
			return type === 'doors' ? cabinet?.color?.door : cabinet?.color?.handle
		}

		if (isLux) {
			return type === 'doors' ? currentColors?.lux?.door : undefined
		} else {
			return type === 'doors'
				? currentColors?.regular?.door
				: currentColors?.regular?.handle
		}
	}
	const renderColorGroup = (
		groupName: string,
		colors: Record<string, string>,
		allStandard = false
	) => (
		<div className='mb-6'>
			<h4 className='font-semibold text-[22px] text-primary uppercase mb-2'>
				{groupName}
			</h4>
			<div className=' bg-white border border-gray-300 p-4 rounded-xl'>
				{(() => {
					const entries = Object.entries(colors)
					const standardCount = allStandard
						? entries.length
						: groupName.toLowerCase() === 'handles'
						? 2
						: 3
					const standard = entries.slice(0, standardCount)
					const premium = allStandard ? [] : entries.slice(standardCount)
					return (
						<>
							<div className='text-xl text-primary mb-2.5'>
								Standard colors:
							</div>
							<div className='grid grid-cols-3 gap-3  mb-4'>
								{standard.map(([label, color]) => {
									const isSelected =
										getCurrentColor(groupName.toLowerCase()) === color
									return (
										<button
											key={label}
											onClick={() => {
												if (selectedCabinetId) {
													changeColor(groupName.toLowerCase(), color)
												} else {
													if (isLux) {
														if (groupName.toLowerCase() === 'doors') {
															setCurrentColors({
																lux: {
																	door: color,
																},
															})
														}
														changeColorOnLuxModels(
															groupName.toLowerCase(),
															color
														)
													} else {
														const colorType =
															groupName.toLowerCase() === 'doors'
																? 'door'
																: 'handle'
														setCurrentColors({
															regular: {
																...currentColors?.regular,
																[colorType]: color,
															},
														})
														changeColorOnRegularModels(
															groupName.toLowerCase(),
															color
														)
													}
												}
											}}
											className={`group flex flex-col justify-center rounded-lg items-center ${
												isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
											}`}
										>
											<span
												style={{ backgroundColor: color }}
												className={`block w-[65px] h-[22px] rounded-full mb-1 border transition ${
													isSelected
														? 'border-primary border-2'
														: 'border-[#000000] group-hover:border-primary'
												}`}
											></span>
											<span className='text-xs text-gray-700 block w-full text-center'>
												{camelCaseToNormal(label)}
											</span>
										</button>
									)
								})}
							</div>
							{premium.length > 0 && (
								<>
									<div className='text-xl text-primary mb-2.5'>
										Premium colors:
									</div>
									<div className='grid grid-cols-3 gap-3 '>
										{premium.map(([label, color]) => {
											const isSelected =
												getCurrentColor(groupName.toLowerCase()) === color
											return (
												<button
													key={label}
													onClick={() => {
														if (selectedCabinetId) {
															changeColor(groupName.toLowerCase(), color)
														} else {
															if (isLux) {
																// Lux моделі - тільки двері
																if (groupName.toLowerCase() === 'doors') {
																	setCurrentColors({
																		lux: {
																			door: color,
																		},
																	})
																}
																changeColorOnLuxModels(
																	groupName.toLowerCase(),
																	color
																)
															} else {
																// Regular моделі - двері та ручки
																const colorType =
																	groupName.toLowerCase() === 'doors'
																		? 'door'
																		: 'handle'
																setCurrentColors({
																	regular: {
																		...currentColors?.regular,
																		[colorType]: color,
																	},
																})
																changeColorOnRegularModels(
																	groupName.toLowerCase(),
																	color
																)
															}
														}
													}}
													className={`group flex flex-col justify-center rounded-lg items-center ${
														isSelected
															? 'ring-2 ring-primary ring-offset-2'
															: ''
													}`}
												>
													<span
														style={{ backgroundColor: color }}
														className={`block w-[65px] h-[22px] rounded-full mb-1 border transition ${
															isSelected
																? 'border-primary border-2'
																: 'border-[#000000] group-hover:border-primary'
														}`}
													></span>
													<span className='text-xs text-gray-700 block w-full text-center'>
														{camelCaseToNormal(label)}
													</span>
												</button>
											)
										})}
									</div>
								</>
							)}
						</>
					)
				})()}
			</div>
		</div>
	)

	return (
		<>
			{isLux ? (
				<section className='mb-8'>
					{renderColorGroup('Doors', COLORS.luxCabinet.doors, true)}
				</section>
			) : (
				<section className='mb-8'>
					{renderColorGroup('Doors', COLORS.fusionCabinet.doors, false)}
					{renderColorGroup('Handles', COLORS.fusionCabinet.handles)}
				</section>
			)}
			<div className='flex justify-between'>
				<Button
					className='bg-red-500'
					onClick={() => resetColorsToDefault()}
					title='Reset Colors'
				>
					Reset
				</Button>
				<Button onClick={() => navigate(-1)}>Next</Button>
			</div>
		</>
	)
}
