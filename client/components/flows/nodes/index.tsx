import type { BuiltInNode, Node, NodeTypes } from '@xyflow/react'
import { PositionLoggerNode, type PositionLoggerNode as PositionLoggerNodeType } from './PositionLoggerNode'

export const nodeTypes = {
  'position-logger': PositionLoggerNode,
  // Add any of your custom nodes here!
} satisfies NodeTypes

// Append the types of you custom edges to the BuiltInNode type
export type CustomNodeType = BuiltInNode | PositionLoggerNodeType
