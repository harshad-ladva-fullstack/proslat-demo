import { FLOOR_TILES } from '@/constants/floor-tiles'
import { useTexture } from '@react-three/drei'

export function PreloadAllTileTextures() {
	FLOOR_TILES.forEach(tile => {
		useTexture.preload(tile.texture)
	})

	return null
}
