import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api:github/issues')

const GITHUB_OWNER = process.env.GITHUB_OWNER || 'kogatakanori'
const GITHUB_REPO = process.env.GITHUB_REPO || 'react-flow'

interface GitHubLabel {
  name: string
  color: string
}

interface GitHubIssue {
  number: number
  title: string
  state: 'open' | 'closed'
  body: string | null
  html_url: string
  labels: GitHubLabel[]
  created_at: string
  updated_at: string
  user: {
    login: string
    avatar_url: string
  }
  assignees: Array<{
    login: string
    avatar_url: string
  }>
  pull_request?: unknown
}

interface Relationship {
  source: number
  target: number
}

function detectRelationships(issues: GitHubIssue[]): Relationship[] {
  const issueNumbers = new Set(issues.map((i) => i.number))
  const relationships: Relationship[] = []
  const seen = new Set<string>()

  for (const issue of issues) {
    if (!issue.body) continue

    // Match patterns like:
    // - "parent: #123"
    // - "parent issue: #123"
    // - "depends on #123"
    // - "- [ ] #123" or "- [x] #123" (task lists / sub-issues)
    // - "closes #123" / "fixes #123"
    const patterns = [
      /parent\s*(?:issue)?\s*:?\s*#(\d+)/gi,
      /depends?\s+on\s+#(\d+)/gi,
      /blocked?\s+by\s+#(\d+)/gi,
      /-\s+\[[ x]\]\s+#(\d+)/g,
      /closes?\s+#(\d+)/gi,
      /fixes?\s+#(\d+)/gi,
    ]

    for (const pattern of patterns) {
      const matches = [...issue.body.matchAll(pattern)]
      for (const match of matches) {
        const refNum = parseInt(match[1])
        if (issueNumbers.has(refNum) && refNum !== issue.number) {
          const key = `${issue.number}-${refNum}`
          if (!seen.has(key)) {
            seen.add(key)
            relationships.push({ source: issue.number, target: refNum })
          }
        }
      }
    }
  }

  return relationships
}

async function fetchSubIssueRelationships(
  issues: GitHubIssue[],
  headers: Record<string, string>
): Promise<Relationship[]> {
  const issueNumbers = new Set(issues.map((i) => i.number))
  const relationships: Relationship[] = []
  const seen = new Set<string>()

  const results = await Promise.allSettled(
    issues.map(async (issue) => {
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issue.number}/sub_issues`
      const res = await fetch(url, { headers, next: { revalidate: 60 } })
      if (!res.ok) return []
      const subIssues: GitHubIssue[] = await res.json()
      return subIssues
        .filter((sub) => issueNumbers.has(sub.number))
        .map((sub) => ({ source: issue.number, target: sub.number }))
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const rel of result.value) {
        const key = `${rel.source}-${rel.target}`
        if (!seen.has(key)) {
          seen.add(key)
          relationships.push(rel)
        }
      }
    }
  }

  return relationships
}

export async function GET() {
  logger.info('GET /api/github/issues - start')
  logger.debug({ owner: GITHUB_OWNER, repo: GITHUB_REPO, hasToken: !!process.env.GITHUB_TOKEN }, 'GitHub API config')

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
    }

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=all&per_page=100`,
      { headers, next: { revalidate: 60 } }
    )

    if (!response.ok) {
      const body = await response.text()
      logger.error({ status: response.status, body }, 'GitHub API returned error')
      throw new Error(`GitHub API returned ${response.status}: ${body}`)
    }

    const allItems: GitHubIssue[] = await response.json()
    logger.debug({ totalItems: allItems.length }, 'GitHub API response received')

    // Filter out pull requests
    const issues = allItems.filter((item) => !item.pull_request)
    logger.info({ totalItems: allItems.length, issueCount: issues.length }, 'Issues fetched (PRs excluded)')

    if (issues.length === 0) {
      logger.warn('No issues found after filtering')
    }

    // Detect relationships from issue body text patterns
    const textRelationships = detectRelationships(issues)
    logger.info({ relationshipCount: textRelationships.length }, 'Text-based relationships detected')

    // Detect sub-issue relationships via GitHub Sub-issues API
    const subIssueRelationships = await fetchSubIssueRelationships(issues, headers)
    logger.info({ relationshipCount: subIssueRelationships.length }, 'Sub-issue relationships detected')

    // Merge and deduplicate
    const seen = new Set(textRelationships.map((r) => `${r.source}-${r.target}`))
    const relationships = [...textRelationships]
    for (const rel of subIssueRelationships) {
      const key = `${rel.source}-${rel.target}`
      if (!seen.has(key)) {
        seen.add(key)
        relationships.push(rel)
      }
    }

    logger.info({ relationshipCount: relationships.length }, 'Total relationships')
    logger.debug({ relationships }, 'Relationship details')

    return NextResponse.json({ issues, relationships })
  } catch (error) {
    logger.error({ err: error }, 'Failed to handle GET /api/github/issues')
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
