import { useCallback } from 'react'

import { useReactFlow } from '@xyflow/react'

import styles from '../styles/rightsheet.module.scss'

export function RightSheet() {
  const nodes = useReactFlow().getNodes()
  console.log('nodes', nodes)

  return (
    <div className={styles.rightsheet}>
      <h2>Right Sheet</h2>
      <div>
        {nodes.map((node) => (
          <div className={styles.label} key={node.id}>
            {node.data.label}
          </div>
        ))}
      </div>
    </div>
  )
}
