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

import { POSITION_LOGGER_NAME, DEFAULT_NODE_NAME, ISSUE_NODE_NAME, nodeTypes, type CustomNodeType } from './nodes'
import { edgeTypes, type CustomEdgeType } from './edges'

import '@xyflow/react/dist/style.css'
import styles from '../../styles/flows.module.scss'

const flowKey = 'example-flow'

const getNodeId = () => `randomnode_${+new Date()}`

// Layout constants for issue nodes
const ISSUE_NODE_WIDTH = 280
const ISSUE_NODE_HEIGHT = 140
const H_GAP = 80
const V_GAP = 100

interface Relationship {
  source: number
  target: number
}

/**
 * Compute hierarchical layout positions for issue nodes.
 * Returns a Map from issue number to {x, y} position.
 */
function layoutIssueNodes(
  issueNumbers: number[],
  relationships: Relationship[]
): Map<number, { x: number; y: number }> {
  const childrenOf = new Map<number, Set<number>>()
  const parentsOf = new Map<number, Set<number>>()

  for (const num of issueNumbers) {
    childrenOf.set(num, new Set())
    parentsOf.set(num, new Set())
  }

  for (const { source, target } of relationships) {
    childrenOf.get(source)?.add(target)
    parentsOf.get(target)?.add(source)
  }

  // BFS from root nodes (no incoming edges) to assign levels
  const levelOf = new Map<number, number>()
  const visited = new Set<number>()
  const roots = issueNumbers.filter((n) => parentsOf.get(n)!.size === 0)

  const queue: Array<{ num: number; level: number }> = roots.map((n) => ({ num: n, level: 0 }))

  while (queue.length > 0) {
    const item = queue.shift()!
    if (visited.has(item.num)) continue
    visited.add(item.num)
    levelOf.set(item.num, item.level)

    for (const child of childrenOf.get(item.num) || []) {
      if (!visited.has(child)) {
        queue.push({ num: child, level: item.level + 1 })
      }
    }
  }

  // Place any unvisited (cyclic or isolated) nodes at the bottom
  const maxLevel = levelOf.size > 0 ? Math.max(...Array.from(levelOf.values())) : 0
  let extraLevel = maxLevel + 1
  for (const num of issueNumbers) {
    if (!visited.has(num)) {
      levelOf.set(num, extraLevel++)
    }
  }

  // Group nodes by level
  const nodesByLevel = new Map<number, number[]>()
  for (const [num, level] of levelOf) {
    if (!nodesByLevel.has(level)) nodesByLevel.set(level, [])
    nodesByLevel.get(level)!.push(num)
  }

  // Sort each level by issue number for a consistent layout
  for (const nums of nodesByLevel.values()) {
    nums.sort((a, b) => a - b)
  }

  // Assign x/y positions
  const positions = new Map<number, { x: number; y: number }>()

  for (const [level, nums] of nodesByLevel) {
    const totalWidth = nums.length * ISSUE_NODE_WIDTH + (nums.length - 1) * H_GAP
    const startX = -totalWidth / 2

    nums.forEach((num, i) => {
      positions.set(num, {
        x: startX + i * (ISSUE_NODE_WIDTH + H_GAP),
        y: level * (ISSUE_NODE_HEIGHT + V_GAP),
      })
    })
  }

  return positions
}

export function Flow() {
  const [rfInstance, setRfInstance] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeType>([])
  const [isLoadingIssues, setIsLoadingIssues] = useState(false)
  const { setViewport, fitView } = useReactFlow()
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

  const onLoadIssues = useCallback(async () => {
    setIsLoadingIssues(true)
    try {
      const response = await fetch('/api/github/issues')
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      const { issues, relationships } = await response.json()

      if (!Array.isArray(issues) || issues.length === 0) {
        console.warn('No issues found')
        return
      }

      const issueNumbers = issues.map((i: { number: number }) => i.number)
      const positions = layoutIssueNodes(issueNumbers, relationships)

      const newNodes = issues.map((issue: {
        number: number
        title: string
        state: 'open' | 'closed'
        labels: Array<{ name: string }>
        html_url: string
        user: { login: string }
        created_at: string
      }) => ({
        id: `issue-${issue.number}`,
        type: ISSUE_NODE_NAME,
        position: positions.get(issue.number) ?? { x: 0, y: 0 },
        data: {
          label: `#${issue.number} ${issue.title}`,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          labels: issue.labels.map((l) => l.name),
          url: issue.html_url,
          author: issue.user.login,
          createdAt: issue.created_at,
        },
      }))

      const newEdges = relationships.map(
        (rel: Relationship, i: number) => ({
          id: `issue-edge-${i}`,
          source: `issue-${rel.source}`,
          target: `issue-${rel.target}`,
          animated: true,
          style: { stroke: '#0969da', strokeWidth: 2 },
        })
      )

      setNodes(newNodes)
      setEdges(newEdges)

      // Fit the view after nodes are set
      setTimeout(() => fitView({ padding: 0.2 }), 100)
    } catch (error) {
      console.error('Failed to load GitHub issues:', error)
    } finally {
      setIsLoadingIssues(false)
    }
  }, [setNodes, setEdges, fitView])

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
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={onLoadIssues}
            disabled={isLoadingIssues}
          >
            {isLoadingIssues ? 'Loading...' : 'Load Issues'}
          </button>
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
