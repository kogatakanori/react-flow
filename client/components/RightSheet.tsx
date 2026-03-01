'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from '../styles/rightsheet.module.scss'
import { createLogger } from '@/lib/logger'

const logger = createLogger('component:RightSheet')

const MIN_WIDTH = 260
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 360

interface GitHubComment {
  id: number
  user: { login: string; avatar_url: string }
  body: string
  created_at: string
}

interface GitHubIssueDetail {
  number: number
  title: string
  state: 'open' | 'closed'
  body: string | null
  html_url: string
  labels: Array<{ name: string; color: string }>
  assignees: Array<{ login: string; avatar_url: string }>
  user: { login: string; avatar_url: string }
  created_at: string
  updated_at: string
}

interface Props {
  selectedIssueNumber: number | null
  onClose: () => void
}

export function RightSheet({ selectedIssueNumber, onClose }: Props) {
  const [issue, setIssue] = useState<GitHubIssueDetail | null>(null)
  const [comments, setComments] = useState<GitHubComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(DEFAULT_WIDTH)

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      startX.current = e.clientX
      startWidth.current = width

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        const delta = startX.current - ev.clientX
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
        setWidth(newWidth)
      }

      const onMouseUp = () => {
        dragging.current = false
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [width]
  )

  useEffect(() => {
    if (selectedIssueNumber == null) {
      setIssue(null)
      setComments([])
      return
    }
    setLoading(true)
    setError(null)
    setIssue(null)
    setComments([])

    fetch(`/api/github/issues/${selectedIssueNumber}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then(({ issue, comments }: { issue: GitHubIssueDetail; comments: GitHubComment[] }) => {
        setIssue(issue)
        setComments(Array.isArray(comments) ? comments : [])
      })
      .catch((err) => {
        logger.error({ err }, 'Failed to fetch issue detail')
        setError(String(err))
      })
      .finally(() => setLoading(false))
  }, [selectedIssueNumber])

  if (selectedIssueNumber == null) return null

  return (
    <div className={styles.rightsheet} style={{ width }}>
      <div className={styles.resizeHandle} onMouseDown={onResizeMouseDown} />
      <div className={styles.sheetHeader}>
        <span className={styles.issueNumber}>#{selectedIssueNumber}</span>
        <button className={styles.closeButton} onClick={onClose} aria-label="閉じる">
          ✕
        </button>
      </div>

      <div className={styles.scrollArea}>
        {loading && <p className={styles.empty}>読み込み中...</p>}
        {error && <p className={styles.errorText}>{error}</p>}

        {issue && (
          <>
            <div className={styles.issueTitle}>
              <span
                className={`${styles.stateBadge} ${issue.state === 'open' ? styles.badgeOpen : styles.badgeClosed}`}
              >
                {issue.state === 'open' ? '● Open' : '✓ Closed'}
              </span>
              <h2 className={styles.titleText}>
                <a href={issue.html_url} target="_blank" rel="noopener noreferrer" className={styles.titleLink}>
                  {issue.title}
                </a>
              </h2>
            </div>

            {issue.labels.length > 0 && (
              <div className={styles.labels}>
                {issue.labels.map((l) => (
                  <span
                    key={l.name}
                    className={styles.label}
                    style={{
                      backgroundColor: `#${l.color}33`,
                      borderColor: `#${l.color}`,
                      color: `#${l.color === 'ffffff' ? '57606a' : l.color}`,
                    }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.metaRow}>
              <span>作成者: {issue.user.login}</span>
              <span>{new Date(issue.created_at).toLocaleDateString('ja-JP')}</span>
            </div>

            {issue.assignees.length > 0 && (
              <div className={styles.metaRow}>
                <span>担当: {issue.assignees.map((a) => a.login).join(', ')}</span>
              </div>
            )}

            <div className={styles.bodySection}>
              <div className={`${styles.bodyText} ${styles.markdown}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{issue.body?.trim() || '（本文なし）'}</ReactMarkdown>
              </div>
            </div>

            <div className={styles.commentsSection}>
              <h3 className={styles.commentsHeader}>コメント ({comments.length})</h3>
              {comments.length === 0 && !loading && <p className={styles.empty}>コメントはありません</p>}
              {comments.map((c) => (
                <div key={c.id} className={styles.comment}>
                  <div className={styles.commentMeta}>
                    <strong>{c.user.login}</strong>
                    <span>{new Date(c.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <div className={`${styles.commentBody} ${styles.markdown}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.body}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
