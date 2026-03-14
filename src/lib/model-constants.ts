export const MODEL_URL = '/model/'
export const MODEL_IMG_URL = '/images/'

export const MODEL_TYPES = {
	default: 'default-cabinet',
	tile: 'tile',
	lights: 'lights',
	surface: 'surface',
	surfaceWall: 'surface-wall',
	middleWallCabinet: 'middle-wall-cabinet',
	topWallCabinet: 'top-wall-cabinet',
}
export const MODEL_SLAP_RULES = [
	{
		type: MODEL_TYPES.default,
		slapWall: true,
		allowedTargets: [],
		corner: true,
		rules: [
			{
				plane: 'side',
			},
		],
	},
	{
		type: MODEL_TYPES.surface,
		slapWall: true,
		corner: true,
		allowedTargets: [MODEL_TYPES.surface],
		rules: [
			{
				plane: 'bottom',
			},
			{
				plane: 'side',
			},
		],
	},
	{
		type: MODEL_TYPES.surfaceWall,
		slapWall: true,
		allowedTargets: [MODEL_TYPES.surfaceWall],
		rules: [
			{
				plane: 'side',
			},
		],
	},
	{
		type: MODEL_TYPES.middleWallCabinet,
		slapWall: true,
		allowedTargets: [],
		rules: [
			{
				plane: 'side',
			},
		],
	},
	{
		type: MODEL_TYPES.topWallCabinet,
		slapWall: true,
		allowedTargets: [],
		rules: [
			{
				plane: 'side',
			},
		],
	},
	{
		type: MODEL_TYPES.tile,
		slapWall: false,
		allowedTargets: [],
		rules: [
			{
				plane: 'side',
			},
		],
	},
	{
		type: MODEL_TYPES.lights,
		slapWall: false,
		allowedTargets: [],
		rules: [
			{
				plane: 'bottom',
			},
		],
	},
]

export const COLLISION_RULES = [
	{
		type: MODEL_TYPES.surface,
		ignoreTypes: [MODEL_TYPES.surfaceWall],
		canSnap: [] as string[],
	},
	{
		type: MODEL_TYPES.surfaceWall,
		ignoreTypes: [MODEL_TYPES.surface, MODEL_TYPES.middleWallCabinet],
		canSnap: [] as string[],
	},
	{
		type: MODEL_TYPES.default,
		ignoreTypes: [MODEL_TYPES.middleWallCabinet, MODEL_TYPES.topWallCabinet],
		canSnap: [MODEL_TYPES.default] as string[],
	},
	{
		type: MODEL_TYPES.middleWallCabinet,
		ignoreTypes: [MODEL_TYPES.default],
		canSnap: [MODEL_TYPES.middleWallCabinet, MODEL_TYPES.default] as string[],
	},
	{
		type: MODEL_TYPES.topWallCabinet,
		ignoreTypes: [MODEL_TYPES.default],
		canSnap: [MODEL_TYPES.topWallCabinet, MODEL_TYPES.default] as string[],
	},
	{
		type: MODEL_TYPES.tile,
		ignoreTypes: [],
		canSnap: [MODEL_TYPES.tile] as string[],
	},
	{
		type: MODEL_TYPES.lights,
		ignoreTypes: [],
		canSnap: [] as string[],
	},
]

// Функція для перевірки, чи може елемент прив'язуватися до іншого елемента
export function canSnapToTarget(
	draggingType: string,
	targetType: string
): boolean {
	const rule = COLLISION_RULES.find(rule => rule.type === draggingType)
	if (!rule) return false

	// Якщо canSnap пустий масив, то можна прив'язуватися тільки до елементів свого типу
	if (rule.canSnap.length === 0) {
		return draggingType === targetType
	}

	// Інакше перевіряємо, чи targetType є в списку canSnap
	return rule.canSnap.includes(targetType)
}
