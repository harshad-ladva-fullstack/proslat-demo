// ── Component types for the ceiling lighting designer ──

export type ComponentColor = 'black' | 'white'
export type LightMode = 'white' | 'rgb'

export type ConnectorType =
	| 'hub'
	| 't-connector'
	| '45-left-elbow'
	| '45-right-elbow'
	| '90-connector-left'
	| '90-connector-right'
	| 'cross-connector'
	| 'y-connector'

export type LightBarLength = 18 | 36 // inches

export type CeilingComponentType = 'hub' | 'light-bar' | ConnectorType

/** A single port on a component where another component can attach */
export interface Port {
	id: string
	/** Angle in degrees relative to the component's local north (0 = up/north) */
	angle: number
	/** Whether this port is already occupied */
	connectedTo: string | null
}

/** Base for every component placed on the ceiling */
export interface CeilingComponent {
	id: string
	type: CeilingComponentType
	color: ComponentColor
	/** Position on the 2D ceiling canvas (pixels) */
	x: number
	y: number
	/** Rotation of the whole component in degrees */
	rotation: number
	/** Available connection ports */
	ports: Port[]
	/** ID of the component this one is connected to (null for hub) */
	parentId: string | null
	/** IDs of components connected after this one */
	childIds: string[]
	/** Ceiling surface normal (world space) for proper fixture orientation. Defaults to [0,1,0] for flat ceilings */
	ceilingNormal?: { x: number; y: number; z: number }
}

/** Light bar extends CeilingComponent with length and light mode */
export interface LightBarComponent extends CeilingComponent {
	type: 'light-bar'
	/** Length in inches */
	length: LightBarLength
	lightMode: LightMode
}

/** Hub is the central power unit – always placed first */
export interface HubComponent extends CeilingComponent {
	type: 'hub'
}

/** Union of all concrete component types */
export type PlacedComponent = CeilingComponent | LightBarComponent | HubComponent

/** Summary statistics for the layout */
export interface LayoutSummary {
	totalLengthInches: number
	totalLengthFeet: number
	maxLengthFeet: number
	totalWatts: number
	estimatedPrice: number
	componentCount: number
}

/** What the user is currently dragging from the palette */
export interface DragPayload {
	type: CeilingComponentType
	length?: LightBarLength
}
