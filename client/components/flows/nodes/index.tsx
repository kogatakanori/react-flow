import type { BuiltInNode, NodeTypes } from '@xyflow/react'

import {
  POSITION_LOGGER_NAME,
  PositionLoggerNode,
  type PositionLoggerNode as PositionLoggerNodeType,
} from './PositionLoggerNode'
import { DEFAULT_NODE_NAME, DefaultNode, type DefaultNode as DefaultNodeType } from './DefaultNode'

export * from './PositionLoggerNode'
export * from './DefaultNode'

export const nodeTypes = {
  [POSITION_LOGGER_NAME]: PositionLoggerNode,
  [DEFAULT_NODE_NAME]: DefaultNode,
} satisfies NodeTypes

// Append the types of you custom edges to the BuiltInNode type
export type CustomNodeType = BuiltInNode | PositionLoggerNodeType | DefaultNodeType
