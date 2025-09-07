import { useCallback } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  type OnConnect,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'

import { nodeTypes, type CustomNodeType } from './nodes'
import { edgeTypes, type CustomEdgeType } from './edges'

type FlowProps = {
  flowData: {
    nodes: Node<CustomNodeType>[]
    edges: Edge<CustomEdgeType>[]
  }
}

export function Flow({ flowData }: FlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>(flowData.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeType>(flowData.edges)
  const onConnect: OnConnect = useCallback(
    (connection: Connection<CustomNodeType, CustomEdgeType>) =>
      setEdges((edges: Edge<CustomEdgeType>[]) => addEdge(connection, edges)),
    [setEdges]
  )

  return (
    <>
      <ReactFlow<CustomNodeType, CustomEdgeType>
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        edges={edges}
        edgeTypes={edgeTypes}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </>
  )
}
