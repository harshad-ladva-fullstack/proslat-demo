import { useTextureChanger } from '@/hooks/useTextureChanger'

export const Textures = () => {
	const { restoreTextureByPartialName, changeTextureByPartialName } =
		useTextureChanger()

	return (
		<>
			<button
				className='p-2 block mb-2'
				onClick={() => changeTextureByPartialName('floor', '/textures/1.jpg')}
			>
				New texture
			</button>
			<button
				className='p-2 block'
				onClick={() => restoreTextureByPartialName()}
			>
				Default model
			</button>
		</>
	)
}
