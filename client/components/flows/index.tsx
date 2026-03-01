import React, { useState, useCallback } from 'react'
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
import { createLogger } from '@/lib/logger'
import type { IssueNodeData } from './nodes/IssueNode'

const logger = createLogger('component:flows')

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

interface IssueData {
  number: number
  title: string
  state: 'open' | 'closed'
  labels: Array<{ name: string }>
  html_url: string
  assignees: Array<{ login: string }>
  created_at: string
}

type LayoutDirection = 'TB' | 'LR'

/**
 * Compute hierarchical layout positions for issue nodes.
 * Children are placed directly below (TB) or to the right of (LR) their parent
 * using a recursive subtree-size algorithm.
 * Returns a Map from issue number to {x, y} position.
 */
function layoutIssueNodes(
  issueNumbers: number[],
  relationships: Relationship[],
  direction: LayoutDirection
): Map<number, { x: number; y: number }> {
  const childrenOf = new Map<number, number[]>()
  const parentsOf = new Map<number, Set<number>>()

  for (const num of issueNumbers) {
    childrenOf.set(num, [])
    parentsOf.set(num, new Set())
  }

  for (const { source, target } of relationships) {
    if (childrenOf.has(source) && childrenOf.has(target)) {
      childrenOf.get(source)!.push(target)
      parentsOf.get(target)!.add(source)
    }
  }

  // Sort children by issue number for consistent ordering
  for (const children of childrenOf.values()) {
    children.sort((a, b) => a - b)
  }

  // BFS from root nodes to assign levels
  const levelOf = new Map<number, number>()
  const visited = new Set<number>()
  const roots = issueNumbers.filter((n) => parentsOf.get(n)!.size === 0).sort((a, b) => a - b)

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

  // Handle unvisited nodes (isolated or cyclic)
  const maxLevel = levelOf.size > 0 ? Math.max(...Array.from(levelOf.values())) : 0
  let extraLevel = maxLevel + 1
  for (const num of issueNumbers) {
    if (!levelOf.has(num)) {
      levelOf.set(num, extraLevel++)
    }
  }

  // Direction-dependent dimension helpers
  // TB: cross axis = X (width), main axis = Y (depth)
  // LR: cross axis = Y (height), main axis = X (depth)
  const nodeCrossSize = direction === 'TB' ? ISSUE_NODE_WIDTH : ISSUE_NODE_HEIGHT
  const nodeMainSize = direction === 'TB' ? ISSUE_NODE_HEIGHT : ISSUE_NODE_WIDTH
  const crossGap = direction === 'TB' ? H_GAP : V_GAP
  const mainGap = direction === 'TB' ? V_GAP : H_GAP

  // Compute subtree span along the cross axis recursively
  const subtreeSizeOf = new Map<number, number>()

  function computeSubtreeSize(node: number): number {
    const children = (childrenOf.get(node) || []).filter((c) => (levelOf.get(c) ?? 0) > (levelOf.get(node) ?? 0))
    if (children.length === 0) {
      subtreeSizeOf.set(node, nodeCrossSize)
      return nodeCrossSize
    }
    const total = children.reduce((sum, c) => sum + computeSubtreeSize(c) + crossGap, 0) - crossGap
    const size = Math.max(nodeCrossSize, total)
    subtreeSizeOf.set(node, size)
    return size
  }

  for (const root of roots) {
    computeSubtreeSize(root)
  }

  // Place nodes: parent is centered above (TB) or to the left of (LR) its children
  const positions = new Map<number, { x: number; y: number }>()
  const placedNodes = new Set<number>()

  function placeSubtree(node: number, centerCross: number, level: number) {
    if (placedNodes.has(node)) return
    placedNodes.add(node)
    if (direction === 'TB') {
      positions.set(node, {
        x: centerCross - nodeCrossSize / 2,
        y: level * (nodeMainSize + mainGap),
      })
    } else {
      positions.set(node, {
        x: level * (nodeMainSize + mainGap),
        y: centerCross - nodeCrossSize / 2,
      })
    }

    const children = (childrenOf.get(node) || []).filter((c) => (levelOf.get(c) ?? 0) > (levelOf.get(node) ?? 0))
    if (children.length === 0) return

    const totalChildSize =
      children.reduce((sum, c) => sum + (subtreeSizeOf.get(c) ?? nodeCrossSize) + crossGap, 0) - crossGap
    let childCross = centerCross - totalChildSize / 2

    for (const child of children) {
      const cs = subtreeSizeOf.get(child) ?? nodeCrossSize
      placeSubtree(child, childCross + cs / 2, level + 1)
      childCross += cs + crossGap
    }
  }

  // Lay out root subtrees side by side along the cross axis, centered at 0
  const totalRootsSize =
    roots.reduce((sum, r) => sum + (subtreeSizeOf.get(r) ?? nodeCrossSize) + crossGap, 0) - crossGap
  let rootCross = -totalRootsSize / 2
  for (const root of roots) {
    const rs = subtreeSizeOf.get(root) ?? nodeCrossSize
    placeSubtree(root, rootCross + rs / 2, 0)
    rootCross += rs + crossGap
  }

  // Place any remaining unplaced nodes (isolated/cyclic)
  let extraCross = 0
  const extraMainPos = extraLevel * (nodeMainSize + mainGap)
  for (const num of issueNumbers) {
    if (!placedNodes.has(num)) {
      if (direction === 'TB') {
        positions.set(num, { x: extraCross, y: extraMainPos })
      } else {
        positions.set(num, { x: extraMainPos, y: extraCross })
      }
      extraCross += nodeCrossSize + crossGap
    }
  }

  return positions
}

function buildMarkdown(
  nodeId: string,
  childrenOf: Map<string, string[]>,
  nodeMap: Map<string, IssueNodeData>,
  depth: number
): string {
  const data = nodeMap.get(nodeId)
  if (!data) return ''
  const indent = '  '.repeat(depth)
  const status = data.state === 'open' ? '🔵' : '✅'
  let md = `${indent}- ${status} [#${data.number} ${data.title}](${data.url})\n`
  for (const childId of childrenOf.get(nodeId) ?? []) {
    md += buildMarkdown(childId, childrenOf, nodeMap, depth + 1)
  }
  return md
}

export function Flow() {
  const [rfInstance, setRfInstance] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeType>([])
  const [isLoadingIssues, setIsLoadingIssues] = useState(false)
  const [direction, setDirection] = useState<LayoutDirection>('TB')
  const [loadedData, setLoadedData] = useState<{ issues: IssueData[]; relationships: Relationship[] } | null>(null)
  const [selectedIssueNumber, setSelectedIssueNumber] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
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
  }, [setNodes, setEdges, setViewport])

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
    logger.info('Loading GitHub issues from API')
    setIsLoadingIssues(true)
    try {
      const response = await fetch('/api/github/issues')
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      const { issues, relationships } = await response.json()

      if (!Array.isArray(issues) || issues.length === 0) {
        logger.warn('No issues found')
        return
      }

      logger.info({ issueCount: issues.length, relationshipCount: relationships.length }, 'Issues fetched successfully')

      setLoadedData({ issues, relationships })

      const issueNumbers = issues.map((i: { number: number }) => i.number)
      const positions = layoutIssueNodes(issueNumbers, relationships, direction)

      const srcPos = direction === 'TB' ? Position.Bottom : Position.Right
      const tgtPos = direction === 'TB' ? Position.Top : Position.Left

      const newNodes = issues.map((issue: IssueData) => ({
        id: `issue-${issue.number}`,
        type: ISSUE_NODE_NAME,
        position: positions.get(issue.number) ?? { x: 0, y: 0 },
        sourcePosition: srcPos,
        targetPosition: tgtPos,
        data: {
          label: `#${issue.number} ${issue.title}`,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          labels: issue.labels.map((l: { name: string }) => l.name),
          url: issue.html_url,
          assignees: issue.assignees.map((a: { login: string }) => a.login),
          createdAt: issue.created_at,
        },
      }))

      const newEdges = relationships.map((rel: Relationship, i: number) => ({
        id: `issue-edge-${i}`,
        source: `issue-${rel.source}`,
        target: `issue-${rel.target}`,
        animated: true,
        style: { stroke: '#0969da', strokeWidth: 2 },
      }))

      setNodes(newNodes)
      setEdges(newEdges)
      logger.info({ nodeCount: newNodes.length, edgeCount: newEdges.length }, 'Nodes and edges set')
      logger.debug({ nodes: newNodes, edges: newEdges }, 'Node/edge details')

      // Fit the view after nodes are set
      setTimeout(() => fitView({ padding: 0.2 }), 100)
    } catch (error) {
      logger.error({ err: error }, 'Failed to load GitHub issues')
    } finally {
      setIsLoadingIssues(false)
    }
  }, [setNodes, setEdges, fitView, direction])

  const onToggleDirection = useCallback(() => {
    const newDir: LayoutDirection = direction === 'TB' ? 'LR' : 'TB'
    setDirection(newDir)
    if (!loadedData) return
    const { issues, relationships } = loadedData
    const issueNumbers = issues.map((i: IssueData) => i.number)
    const positions = layoutIssueNodes(issueNumbers, relationships, newDir)
    const newSrcPos = newDir === 'TB' ? Position.Bottom : Position.Right
    const newTgtPos = newDir === 'TB' ? Position.Top : Position.Left
    setNodes((nds: CustomNodeType[]) =>
      nds.map((node: CustomNodeType) => {
        const num = parseInt(node.id.replace('issue-', ''), 10)
        const pos = positions.get(num)
        return pos ? { ...node, position: pos, sourcePosition: newSrcPos, targetPosition: newTgtPos } : node
      })
    )
    setTimeout(() => fitView({ padding: 0.2 }), 100)
  }, [direction, loadedData, setNodes, fitView])

  const onNodeClick = useCallback((_evt: React.MouseEvent, node: Node) => {
    if (node.type === ISSUE_NODE_NAME) {
      setSelectedIssueNumber((node.data as IssueNodeData).number)
    }
  }, [])

  const onCopyMarkdown = useCallback(async () => {
    const issueNodes = nodes.filter((n) => n.type === ISSUE_NODE_NAME)
    const issueNodeIds = new Set(issueNodes.map((n) => n.id))
    const nodeMap = new Map<string, IssueNodeData>(issueNodes.map((n) => [n.id, n.data as IssueNodeData]))
    const childrenOf = new Map<string, string[]>()
    const hasParent = new Set<string>()
    for (const edge of edges) {
      if (issueNodeIds.has(edge.source) && issueNodeIds.has(edge.target)) {
        if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, [])
        childrenOf.get(edge.source)!.push(edge.target)
        hasParent.add(edge.target)
      }
    }
    const roots = issueNodes
      .filter((n) => !hasParent.has(n.id))
      .sort((a, b) => (a.data as IssueNodeData).number - (b.data as IssueNodeData).number)
    const markdown = roots.map((root) => buildMarkdown(root.id, childrenOf, nodeMap, 0)).join('')
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      logger.error({ err }, 'Failed to copy markdown')
    }
  }, [nodes, edges])

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
        onNodeClick={onNodeClick}
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
          <button className={styles.button} onClick={onToggleDirection}>
            {direction === 'TB' ? '⇄ 左→右' : '⇅ 上→下'}
          </button>
          <button
            className={styles.button}
            onClick={onCopyMarkdown}
            disabled={nodes.filter((n) => n.type === ISSUE_NODE_NAME).length === 0}
          >
            {copied ? 'Copied ✓' : 'Markdown コピー'}
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
        <RightSheet selectedIssueNumber={selectedIssueNumber} onClose={() => setSelectedIssueNumber(null)} />
      </ReactFlow>
    </>
  )
}
