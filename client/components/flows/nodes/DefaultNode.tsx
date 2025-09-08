import { useCallback } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Handle, Position, NodeToolbar, useReactFlow, useNodesData } from '@xyflow/react'

export const DEFAULT_NODE_NAME = 'defaultNode'

export type DefaultNodeData = {
  id: string
}

export type DefaultNode = Node<DefaultNodeData>

export function DefaultNode({ id }: NodeProps<DefaultNode>) {
  const { updateNodeData } = useReactFlow()
  const { data } = useNodesData(id)

  const onChange = useCallback(
    (evt) => {
      updateNodeData(id, { label: evt.target.value })
    },
    [id, updateNodeData]
  )

  return (
    <div className={'react-flow__node-default'}>
      <NodeToolbar isVisible={data.toolbarVisible} position={data.toolbarPosition}>
        <button>delete</button>
        <button>copy</button>
        <button>expand</button>
      </NodeToolbar>
      <input name="text" value={data.label} onChange={onChange} className="nodrag" />
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  )
}
