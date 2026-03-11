import {
	useRef,
	useCallback,
	type DragEvent,
	type ChangeEvent,
} from 'react'

interface ModelLoaderProps {
	/** Must be non-empty before a file can be selected. */
	disabled?: boolean
	/** Called whenever the user selects or drops a GLB file. */
	onFileSelected: (file: File) => void
	/** Currently selected file, used to show its name. */
	selectedFile: File | null
}

/**
 * Pure file-selection drop-zone.
 * All upload / navigation logic lives in the parent (ModelLoadDialog).
 */
export const ModelLoader = ({
	disabled,
	onFileSelected,
	selectedFile,
}: ModelLoaderProps) => {
	const inputRef = useRef<HTMLInputElement>(null)

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault()
			const file = e.dataTransfer.files[0]
			if (file) onFileSelected(file)
		},
		[onFileSelected]
	)

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (file) onFileSelected(file)
		},
		[onFileSelected]
	)

	return (
		<div
			onDrop={handleDrop}
			onDragOver={e => e.preventDefault()}
			className='relative w-full h-[100px] border-2 border-dashed border-gray-400 flex items-center justify-center'
		>
			<input
				type='file'
				accept='.glb'
				ref={inputRef}
				onChange={handleChange}
				style={{ display: 'none' }}
				disabled={disabled}
			/>
			{selectedFile ? (
				<div className='text-center text-gray-700 px-4'>
					<p className='text-sm font-medium truncate'>{selectedFile.name}</p>
					<p
						className='text-xs text-gray-400 cursor-pointer mt-1'
						onClick={() => !disabled && inputRef.current?.click()}
					>
						Click to change file
					</p>
				</div>
			) : (
				<div
					onClick={() => !disabled && inputRef.current?.click()}
					className='text-center text-gray-500 cursor-pointer'
				>
					<p className='text-lg'>Glb model</p>
					<p className='text-xs text-gray-400'>Click or drag &amp; drop a .glb file</p>
				</div>
			)}
		</div>
	)
}
