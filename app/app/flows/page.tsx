import type { NextPage, Metadata } from 'next'

import styles from '../../styles/flows.module.scss'
import { Flow } from '../../components/flows'

export const metadata: Metadata = {
  title: 'React Flow Sample',
  description: 'React Flow Sample',
}

const Flows: NextPage = () => {
  console.log('styles', styles)

  return (
    <div className={styles.container}>
      <header className={styles.header}>React Flow - Next.js Example</header>
      <Flow />
    </div>
  )
}

export default Flows
