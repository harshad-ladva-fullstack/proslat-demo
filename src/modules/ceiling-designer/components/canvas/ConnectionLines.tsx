/**
 * Connection Lines
 * 
 * Renders visual connections between connected components.
 */

import { memo, useMemo } from 'react'
import { Line } from '@react-three/drei'
import { useConnections, useComponents, useCanvas } from '../../store'
import { VALID_CONNECTION_COLOR, INVALID_CONNECTION_COLOR, CEILING_HEIGHT } from '../../constants'

// ============================================================================
// COMPONENT
// ============================================================================

export const ConnectionLines = memo(function ConnectionLines() {
  const connections = useConnections()
  const components = useComponents()
  const canvas = useCanvas()

  // Don't render if connections are hidden
  if (!canvas.showConnections) {
    return null
  }

  // Calculate line points for each connection
  const lines = useMemo(() => {
    return connections.map((connection) => {
      const source = components.find((c) => c.id === connection.sourceComponentId)
      const target = components.find((c) => c.id === connection.targetComponentId)

      if (!source || !target) return null

      return {
        id: connection.id,
        points: [
          [source.position.x, CEILING_HEIGHT, source.position.z] as [number, number, number],
          [target.position.x, CEILING_HEIGHT, target.position.z] as [number, number, number],
        ],
        isValid: connection.isValid,
      }
    }).filter(Boolean)
  }, [connections, components])

  return (
    <group>
      {lines.map((line) =>
        line ? (
          <Line
            key={line.id}
            points={line.points}
            color={line.isValid ? VALID_CONNECTION_COLOR : INVALID_CONNECTION_COLOR}
            lineWidth={2}
            dashed={!line.isValid}
            dashScale={10}
            dashSize={0.1}
            gapSize={0.05}
          />
        ) : null
      )}
    </group>
  )
})

export default ConnectionLines
