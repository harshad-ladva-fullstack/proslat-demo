export const MODEL_GAP = 0.0005

// Радіуси злипання
export const SNAP_DISTANCE_WALL = 2 // максимальна відстань для злипання зі стіною
export const SNAP_DISTANCE_MODEL = 1 // максимальна відстань для злипання з моделлю
export const MIN_SNAP_DISTANCE = MODEL_GAP // мінімальна відстань для злипання

export const COLORS = {
	fusionCabinet: {
		doors: {
			black: '#000000',
			trafficRed: '#DC1F26',
			trafficGrey: '#555654',
			pureWhite: '#FFFFFF',
			zincYellow: '#FFD239',
			brightRedOrange: '#F57025',
			pureGreen: '#008C48',
			windowGrey: '#989EA1',
			signalBlue: '#005085',
			skyBlue: '#007BAF',
		},
		handles: {
			black: '#000000',
			silver: '#8A8D8F',
			windowGrey: '#989EA1',
			pureWhite: '#FFFFFF',
			zincYellow: '#FFD239',
			signalBlue: '#005085',
			brightRedOrange: '#F57025',
			skyBlue: '#007BAF',
			pureGreen: '#008C48',
			trafficRed: '#DC1F26',
			trafficGrey: '#555654',
		},
	},
	luxCabinet: {
		doors: {
			stromGray: '#535353',
			pearlWhite: '#FDFDFB',
			midnightBlue: '#1D304E',
			black: '#000000',
		},
	},
	toolbox: {
		drawerColor: {
			black: '#000000',
			trafficRed: '#DC1F26',
			trafficGrey: '#555654',
			pureWhite: '#FFFFFF',
			zincYellow: '#FFD239',
			brightRedOrange: '#F57025',
			pureGreen: '#008C48',
			windowGrey: '#989EA1',
			signalBlue: '#005085',
			skyBlue: '#007BAF',
		},
		handleColor: {
			black: '#000000',
			silver: '#8A8D8F',
		},
	},
	tilesRamp: {
		arcticWhite: '#FFFFFF',
		pearlGray: '#B2B6B8',
		pearlSilver: '#ABAFB1',
		citrusYellow: '#FDDB2C',
		tropicalOrange: '#F97F3A',
		racingRed: '#E93725',
		royalBlue: '#0057C8',
		slateGray: '#666868',
		jetBlack: '#000000',
	},
	lights: {
		black: '#000000',
		white: '#FFFFFF',
	},
}

export const WALL_COLORS = [
	'#FFFFFF',
	'#B2B6B8',
	'#ABAFB1',
	'#FDDB2C',
	'#F97F3A',
	'#E93725',
	'#0057C8',
	'#666868',
	'#000000',
]

export const SCENE_SETTINGS = [
	{
		label: 'products',
		value: 'models',
		isCategories: true,
	},
	{
		label: 'Textures',
		value: 'textures',
	},
	{
		label: 'Colors',
		value: 'colors',
	},
	{
		label: 'Room Settings',
		value: 'roomSettings',
	},
]

export const SCENE_CATEGORIES = ['worksurfaces', 'backSplashes']
