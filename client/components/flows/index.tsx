import { useState, useCallback } from 'react'
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
  useReactFlow,
  Position,
  Panel,
  Connection,
  type OnConnect,
} from '@xyflow/react'
import { RightSheet } from '../RightSheet'

import { POSITION_LOGGER_NAME, DEFAULT_NODE_NAME, nodeTypes, type CustomNodeType } from './nodes'
import { edgeTypes, type CustomEdgeType } from './edges'

import '@xyflow/react/dist/style.css'
import styles from '../../styles/flows.module.scss'

const flowKey = 'example-flow'

const getNodeId = () => `randomnode_${+new Date()}`

export function Flow() {
  const [rfInstance, setRfInstance] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeType>([])
  const { setViewport } = useReactFlow()
  const onConnect: OnConnect = useCallback(
    (connection: Connection<CustomNodeType, CustomEdgeType>) =>
      setEdges((edges: Edge<CustomEdgeType>[]) => addEdge(connection, edges)),
    [setEdges]
  )

  const onSave = useCallback(() => {
    if (rfInstance) {
      const flow = rfInstance.toObject()
      localStorage.setItem(flowKey, JSON.stringify(flow))
    }
  }, [rfInstance])

  const onRestore = useCallback(() => {
    const restoreFlow = async () => {
      const data = localStorage.getItem(flowKey)
      const flow = JSON.parse(data || '{}')

      if (flow) {
        const { x = 0, y = 0, zoom = 1 } = flow.viewport
        setNodes(flow.nodes || [])
        setEdges(flow.edges || [])
        setViewport({ x, y, zoom })
      }
    }

    restoreFlow()
  }, [setNodes, setViewport])

  const onAdd = useCallback(() => {
    const newNode = {
      id: getNodeId(),
      type: DEFAULT_NODE_NAME,
      data: { label: 'add' },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      toolbarVisible: true,
      toolbarPosition: Position.Bottom,
      position: {
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
      },
    }
    setNodes((nds) => nds.concat(newNode))
  }, [setNodes])

  const onAddLoggerNode = useCallback(() => {
    const newNode: Node = {
      id: getNodeId(),
      type: POSITION_LOGGER_NAME,
      data: { label: 'logger' },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      toolbarVisible: true,
      toolbarPosition: Position.Bottom,
      position: {
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
      },
    }
    setNodes((nds) => nds.concat(newNode))
  }, [setNodes])

  return (
    <>
      <ReactFlow<CustomNodeType, CustomEdgeType>
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        edges={edges}
        edgeTypes={edgeTypes}
        onEdgesChange={onEdgesChange}
        onInit={setRfInstance}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <MiniMap />
        <Controls />
        <Panel className={styles.panel}>
          <button className={styles.button} onClick={onSave}>
            save
          </button>
          <button className={styles.button} onClick={onRestore}>
            restore
          </button>
          <button className={styles.button} onClick={onAdd}>
            add node
          </button>
          <button className={styles.button} onClick={onAddLoggerNode}>
            add logger node
          </button>
        </Panel>
        <RightSheet />
      </ReactFlow>
    </>
  )
}
