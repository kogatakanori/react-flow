'use client'

import { useCallback } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'

import { initialNodes, nodeTypes, type CustomNodeType } from './nodes'
import { initialEdges, edgeTypes, type CustomEdgeType } from './edges'

export function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeType>(initialEdges)
  const onConnect: OnConnect = useCallback((connection) => setEdges((edges) => addEdge(connection, edges)), [setEdges])

  const saveFlow = () => {
    const flowData = {
      nodes,
      edges,
    }
    localStorage.setItem('reactflow', JSON.stringify(flowData))
  }

  const loadFlow = () => {
    const flowData = localStorage.getItem('reactflow')
    if (flowData) {
      try {
        const { nodes, edges } = JSON.parse(flowData)
        setNodes(nodes)
        setEdges(edges)
      } catch (error) {
        console.error('Failed to parse flow data:', error)
        // Handle the error, e.g., reset to default values or notify the user
      }
    }
  }

  return (
    <div>
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
      <button onClick={saveFlow}>Save</button>
      <button onClick={loadFlow}>Load</button>
    </div>
  )
}
