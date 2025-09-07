'use client'

import { useState } from 'react'
import type { NextPage } from 'next'
import { Node, Edge } from '@xyflow/react'
import styles from '../../styles/flows.module.scss'
import { Flow } from '../../components/flows'

// initial
const initialNodes = [
  { id: 'a', type: 'input', position: { x: 0, y: 0 }, data: { label: 'wire' } },
  {
    id: 'b',
    type: 'position-logger',
    position: { x: -100, y: 100 },
    data: { label: 'drag me!' },
  },
  { id: 'c', position: { x: 100, y: 100 }, data: { label: 'your ideas' } },
  {
    id: 'd',
    type: 'output',
    position: { x: 0, y: 200 },
    data: { label: 'with React Flow' },
  },
] satisfies Node[]

export const initialEdges = [
  { id: 'a->c', source: 'a', target: 'c', animated: true },
  { id: 'b->d', source: 'b', target: 'd', type: 'button-edge' },
  { id: 'c->d', source: 'c', target: 'd', animated: true },
] satisfies Edge[]

export default function Flows(): NextPage {
  const [flowData, setFlowData] = useState({ nodes: initialNodes, edges: initialEdges })
  const saveFlow = () => {
    console.log('saveFlow', flowData)
    localStorage.setItem('reactflow', JSON.stringify(flowData))
  }

  const loadFlow = () => {
    const _flowData = localStorage.getItem('reactflow')
    _flowData && setFlowData(JSON.parse(_flowData))
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>React Flow - Next.js Example</header>
      <Flow flowData={flowData} />
      <button onClick={saveFlow}>Save</button>
      <button onClick={loadFlow}>Load</button>
    </div>
  )
}
