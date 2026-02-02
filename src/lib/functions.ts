export const METER_TO_INCH = 39.3701

export const transformToInches = (value: number) => {
	return (value * METER_TO_INCH).toFixed(2)
}
