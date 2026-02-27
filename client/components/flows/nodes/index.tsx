import type { BuiltInNode, NodeTypes } from '@xyflow/react'

import {
  POSITION_LOGGER_NAME,
  PositionLoggerNode,
  type PositionLoggerNode as PositionLoggerNodeType,
} from './PositionLoggerNode'
import { DEFAULT_NODE_NAME, DefaultNode, type DefaultNode as DefaultNodeType } from './DefaultNode'
import { ISSUE_NODE_NAME, IssueNode, type IssueNode as IssueNodeType } from './IssueNode'

export * from './PositionLoggerNode'
export * from './DefaultNode'
export * from './IssueNode'

export const nodeTypes = {
  [POSITION_LOGGER_NAME]: PositionLoggerNode,
  [DEFAULT_NODE_NAME]: DefaultNode,
  [ISSUE_NODE_NAME]: IssueNode,
} satisfies NodeTypes

// Append the types of you custom edges to the BuiltInNode type
export type CustomNodeType = BuiltInNode | PositionLoggerNodeType | DefaultNodeType | IssueNodeType
