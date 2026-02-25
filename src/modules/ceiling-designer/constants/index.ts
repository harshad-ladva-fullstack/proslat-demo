import type { CeilingComponentType, ConnectorType, Port } from '../types'

// ── Maximum total linear feet of light bars from one hub ──
export const MAX_LIGHT_BAR_FEET = 36

// ── Grid snap size on the canvas (px) ──
export const GRID_SIZE = 20

// ── Component dimensions on the 2D canvas (px) ──
export const HUB_RADIUS = 24
export const LIGHT_BAR_WIDTH = 8
export const CONNECTOR_SIZE = 28

// ── Inches → pixel conversion for the 2D canvas ──
export const INCHES_TO_PX = 4 // 1 inch = 4px on canvas

// ── Pricing (USD) per component ──
export const COMPONENT_PRICES: Record<CeilingComponentType, number> = {
	hub: 49.99,
	'light-bar': 29.99, // base – adjusted per length below
	't-connector': 9.99,
	'45-left-elbow': 9.99,
	'45-right-elbow': 9.99,
	'90-connector-left': 9.99,
	'90-connector-right': 9.99,
	'cross-connector': 12.99,
	'y-connector': 12.99,
}

export const LIGHT_BAR_PRICE_18 = 24.99
export const LIGHT_BAR_PRICE_36 = 39.99

// ── Wattage per light bar length ──
export const WATTS_PER_18 = 8
export const WATTS_PER_36 = 15

// ── Port templates for each component type ──
// Angles: 0 = North, 90 = East, 180 = South, 270 = West

function makePorts(angles: number[]): Port[] {
	return angles.map((angle, i) => ({
		id: `p${i}`,
		angle,
		connectedTo: null,
	}))
}

export const PORT_TEMPLATES: Record<CeilingComponentType, number[]> = {
	hub: [0, 45, 90, 135, 180, 225, 270, 315], // 8 ports
	'light-bar': [0, 180], // in-line: both ends
	't-connector': [0, 90, 270], // T shape
	'45-left-elbow': [0, 315], // 45° left
	'45-right-elbow': [0, 45], // 45° right
	'90-connector-left': [0, 270], // 90° left
	'90-connector-right': [0, 90], // 90° right
	'cross-connector': [0, 90, 180, 270], // +
	'y-connector': [0, 120, 240], // Y
}

export function createPorts(type: CeilingComponentType): Port[] {
	return makePorts(PORT_TEMPLATES[type] || [0])
}

// ── Display labels ──
export const COMPONENT_LABELS: Record<CeilingComponentType, string> = {
	hub: 'Hub',
	'light-bar': 'Light Bar',
	't-connector': 'T Connector',
	'45-left-elbow': '45° Left Elbow',
	'45-right-elbow': '45° Right Elbow',
	'90-connector-left': '90° Connector Left',
	'90-connector-right': '90° Connector Right',
	'cross-connector': 'Cross Connector',
	'y-connector': 'Y Connector',
}

// ── Connector types for the palette ──
export const CONNECTOR_TYPES: ConnectorType[] = [
	't-connector',
	'45-left-elbow',
	'45-right-elbow',
	'90-connector-left',
	'90-connector-right',
	'cross-connector',
	'y-connector',
]

// ── SVG path data for drawing connector shapes ──
export const CONNECTOR_SHAPES: Record<ConnectorType | 'hub', string> = {
	hub: 'M12 2 L22 12 L12 22 L2 12 Z', // octagon-ish
	't-connector':
		'M4 4 H20 V10 H14 V20 H10 V10 H4 Z',
	'45-left-elbow':
		'M12 2 L4 10 L10 10 L10 22 H14 V10 L20 10 Z',
	'45-right-elbow':
		'M12 2 L20 10 L14 10 L14 22 H10 V10 L4 10 Z',
	'90-connector-left':
		'M4 4 H14 V10 H20 V14 H14 V20 H10 V4 H4 Z',
	'90-connector-right':
		'M10 4 H20 V20 H14 V14 H4 V10 H10 Z',
	'cross-connector':
		'M9 2 H15 V9 H22 V15 H15 V22 H9 V15 H2 V9 H9 Z',
	'y-connector':
		'M12 2 L18 10 H14 V22 H10 V10 H6 Z',
}
