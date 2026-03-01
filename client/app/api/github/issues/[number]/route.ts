import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api:github/issues/[number]')

const GITHUB_OWNER = process.env.GITHUB_OWNER || 'kogatakanori'
const GITHUB_REPO = process.env.GITHUB_REPO || 'react-flow'

export async function GET(_request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params
  const issueNumber = parseInt(number, 10)
  logger.info({ issueNumber }, 'GET /api/github/issues/[number] - start')

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  }
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
  }

  try {
    const [issueRes, commentsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}/comments`, {
        headers,
        cache: 'no-store',
      }),
    ])

    if (!issueRes.ok) {
      const body = await issueRes.text()
      throw new Error(`GitHub API returned ${issueRes.status}: ${body}`)
    }

    const issue = await issueRes.json()
    const comments = commentsRes.ok ? await commentsRes.json() : []

    logger.info({ issueNumber, commentCount: comments.length }, 'Issue detail fetched')
    return NextResponse.json({ issue, comments })
  } catch (error) {
    logger.error({ err: error, issueNumber }, 'Failed to fetch issue detail')
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
