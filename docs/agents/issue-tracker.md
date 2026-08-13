# GitHub Issue Tracker Configuration

This repository uses GitHub Issues as its primary task and issue tracking system.

## Tooling
- Primary CLI: `gh`
- Authentication: Relies on `gh auth status` or environment token.

## Workflow Rules
- Issue Creation: Created via `gh issue create`.
- Issue Retrieval: Filtered via `gh issue list` and `gh issue view`.
- Issue Resolution: Closing issue with `Closes #<ID>` or `gh issue close`.
- Pull Requests: Standard GitHub PR workflow.
