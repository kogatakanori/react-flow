import { NextResponse } from 'next/server'

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

export async function GET() {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    }

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=all&per_page=100`,
      { headers, next: { revalidate: 60 } }
    )

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`)
    }

    const allItems: GitHubIssue[] = await response.json()

    // Filter out pull requests
    const issues = allItems.filter((item) => !item.pull_request)

    const relationships = detectRelationships(issues)

    return NextResponse.json({ issues, relationships })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
