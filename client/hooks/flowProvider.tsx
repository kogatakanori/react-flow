'use client'

import React, { createContext, useReducer, useContext } from 'react'
import { Node, Edge } from '@xyflow/react'
import { createLogger } from '@/lib/logger'

const logger = createLogger('hook:flowProvider')

type FlowStateType = {
  nodes: Node[]
  edges: Edge[]
}

type FlowActionType =
  | {
      type: 'LOADED'
      payload: FlowStateType
    }
  | {
      type: 'SAVE'
      payload: FlowStateType
    }

// reducer
// --------------------------------------------------
const flowReducer = (state: FlowStateType, action: FlowActionType): FlowStateType => {
  logger.debug(
    { actionType: action.type, nodeCount: action.payload.nodes.length, edgeCount: action.payload.edges.length },
    'flowReducer action dispatched'
  )
  switch (action.type) {
    case 'LOADED': {
      const next = { nodes: action.payload.nodes, edges: action.payload.edges }
      logger.info({ nodeCount: next.nodes.length, edgeCount: next.edges.length }, 'Flow LOADED')
      return next
    }
    case 'SAVE': {
      const next = { nodes: action.payload.nodes, edges: action.payload.edges }
      logger.info({ nodeCount: next.nodes.length, edgeCount: next.edges.length }, 'Flow SAVE')
      return next
    }
    default:
      return { ...state }
  }
}

// // initial
// const initialNodes = [
//   { id: 'a', type: 'input', position: { x: 0, y: 0 }, data: { label: 'wire' } },
//   {
//     id: 'b',
//     type: 'position-logger',
//     position: { x: -100, y: 100 },
//     data: { label: 'drag me!' },
//   },
//   { id: 'c', position: { x: 100, y: 100 }, data: { label: 'your ideas' } },
//   {
//     id: 'd',
//     type: 'output',
//     position: { x: 0, y: 200 },
//     data: { label: 'with React Flow' },
//   },
// ] satisfies Node[]

// const initialEdges = [
//   { id: 'a->c', source: 'a', target: 'c', animated: true },
//   { id: 'b->d', source: 'b', target: 'd', type: 'button-edge' },
//   { id: 'c->d', source: 'c', target: 'd', animated: true },
// ] satisfies Edge[]

// context
// --------------------------------------------------
const initialState: FlowStateType = {
  nodes: [],
  edges: [],
}
const FlowContext = createContext({ state: initialState } as {
  state: FlowStateType
  dispatch: React.Dispatch<FlowActionType>
})
export const useFlow = () => {
  return useContext(FlowContext)
}

// provider
// --------------------------------------------------
type Props = {
  children: React.ReactNode
}

export function FlowProvider({ children }: Props) {
  const [state, dispatch] = useReducer(flowReducer, initialState)

  return <FlowContext.Provider value={{ state, dispatch }}>{children}</FlowContext.Provider>
}
