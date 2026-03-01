import type { Node, NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import styles from '../../../styles/issueNode.module.scss'

export const ISSUE_NODE_NAME = 'issueNode'

export type IssueNodeData = {
  label: string
  number: number
  title: string
  state: 'open' | 'closed'
  labels: string[]
  url: string
  assignees: string[]
  createdAt: string
}

export type IssueNode = Node<IssueNodeData>

export function IssueNode({ data, sourcePosition, targetPosition }: NodeProps<IssueNode>) {
  const resolvedTarget = targetPosition ?? Position.Top
  const resolvedSource = sourcePosition ?? Position.Bottom
  return (
    <div className={`${styles.node} ${data.state === 'open' ? styles.open : styles.closed}`}>
      <Handle type="target" position={resolvedTarget} />

      <div className={styles.header}>
        <span className={styles.number}>#{data.number}</span>
        <span className={`${styles.badge} ${data.state === 'open' ? styles.badgeOpen : styles.badgeClosed}`}>
          {data.state === 'open' ? '● Open' : '✓ Closed'}
        </span>
      </div>

      <div className={styles.title}>
        <a href={data.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
          {data.title}
        </a>
      </div>

      {data.labels.length > 0 && (
        <div className={styles.labels}>
          {data.labels.map((label) => (
            <span key={label} className={styles.label}>
              {label}
            </span>
          ))}
        </div>
      )}

      <div className={styles.meta}>
        <span>{data.assignees.length > 0 ? data.assignees.join(', ') : '未アサイン'}</span>
        <span>{new Date(data.createdAt).toLocaleDateString('ja-JP')}</span>
      </div>

      <Handle type="source" position={resolvedSource} />
    </div>
  )
}
