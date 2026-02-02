export interface WallTile {
	id: string
	name: string
	texture: string
	color?: string
}

export const WALL_TILES: WallTile[] = [
	{
		id: 'default',
		name: 'Default Wall Tile',
		texture: '/tiles/default.png',
	},
	{
		id: 'brick',
		name: 'Brick',
		texture: '/tiles/plasticTile.png',
	},
]

export const WALL_TILE_SIZE = 0.3
