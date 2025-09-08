'use client'

import type { NextPage } from 'next'
import { Flow } from '../../components/flows'

import styles from '../../styles/flows.module.scss'

export default function Flows(): NextPage {
  return (
    <div className={styles.container}>
      <header className={styles.header}>React Flow - Next.js Example</header>
      <Flow />
    </div>
  )
}
