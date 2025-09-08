import type { Node, NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'

export const POSITION_LOGGER_NAME = 'positionLogger'

export type PositionLoggerNodeData = {
  label?: string
}

export type PositionLoggerNode = Node<PositionLoggerNodeData>

export function PositionLoggerNode({ positionAbsoluteX, positionAbsoluteY, data }: NodeProps<PositionLoggerNode>) {
  const x = `${Math.round(positionAbsoluteX)}px`
  const y = `${Math.round(positionAbsoluteY)}px`

  return (
    // We add this class to use the same styles as React Flow's default nodes.
    <div className="react-flow__node-default">
      {data.label && <div>{data.label}</div>}
      <div>
        {x} {y}
      </div>

      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  )
}
