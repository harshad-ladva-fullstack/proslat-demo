import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useRoomBuilderStore } from '@/store/useRoomBuilderStore'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchDeleteProjectModel } from '@/api/project'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useParams } from 'react-router-dom'
import { useEditCurrentModel } from '@/hooks/useEditCurrentModel'
import { useEffect, useCallback } from 'react'
import { SideBar } from '@/components/ui/sideBar'
import { ColorChange } from '@/modules/color-bar/ColorChange'

export const LeftBarEditById = () => {
	const {
		setSelectedCabinetId,
		selectedCabinetId,
		modelType,
		setSelectedModelRef,
	} = useRoomBuilderStore()
	const { deleteModel } = useEditCurrentModel()

	const queryClient = useQueryClient()
	const { id } = useParams<{ id: string }>()

	const deleteModelMutation = useMutation({
		mutationFn: async (modelId: number) => {
			await fetchDeleteProjectModel(Number(id), modelId)
			deleteModel()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [QUERY_KEYS.project, id],
			})
		},
	})

	const handleClose = useCallback(() => {
		setSelectedCabinetId(null)
		setSelectedModelRef(null)
	}, [setSelectedCabinetId, setSelectedModelRef])

	const handleCanvasClick = useCallback(
		(e: MouseEvent) => {
			const canvas = document.querySelector('canvas')
			if (!canvas || !canvas.contains(e.target as Node)) {
				return
			}

			if (selectedCabinetId) {
				setTimeout(() => {
					handleClose()
				}, 10)
			}
		},
		[selectedCabinetId, handleClose]
	)

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				handleClose()
			}
		}

		document
			.querySelector('canvas')
			?.addEventListener('click', handleCanvasClick)
		document.addEventListener('keydown', handleKeyDown)

		return () => {
			document
				.querySelector('canvas')
				?.removeEventListener('click', handleCanvasClick)
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [handleClose, handleCanvasClick])

	return (
		<SideBar>
			<div className=' relative'>
				<button onClick={handleClose} className='absolute -top-2 -right-2'>
					<X />
				</button>
				<h3 className='text-[22px] font-medium mb-4'>Select your colors</h3>

				<ColorChange isLux={modelType?.category === 'lux-cabinet'} />

				<Button
					className='bg-red-600 mt-4 text-white w-full'
					onClick={() => {
						deleteModelMutation.mutate(Number(selectedCabinetId))
					}}
				>
					Delete
				</Button>
			</div>
		</SideBar>
	)
}
