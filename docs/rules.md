# Commit Guidelines

## Goal

- Keep commit history clear, searchable, and easy to review.
- Make each commit describe one meaningful change.
- Help teammates understand why a change was made, not only what changed.

## Commit Message Format

Use the following format:

```text
<type>: <short summary>
```

Example:

```text
feat: add user profile page
fix: handle API health check failure
docs: update development setup guide
```

## Commit Types

- `feat`: Add a new feature
- `fix`: Fix a bug
- `docs`: Update documentation only
- `style`: Change formatting, spacing, or styling without logic changes
- `refactor`: Improve code structure without changing behavior
- `test`: Add or update tests
- `chore`: Update tooling, dependencies, config, or maintenance files
- `build`: Change build system or package setup
- `ci`: Change CI/CD configuration
- `perf`: Improve performance

## Summary Rules

- Use lowercase for the type.
- Keep the summary short and clear.
- Use the imperative mood.
- Do not end the summary with a period.

Good:

```text
feat: add login form validation
fix: prevent empty API response crash
```

Avoid:

```text
fixed login bug
feat: Added login form validation.
update stuff
```

## Commit Scope

- Keep commits focused on one topic.
- Do not mix unrelated changes in the same commit.
- Separate formatting-only changes from logic changes when possible.

## Before Committing

Run the required checks:

```bash
npm run typecheck
npm run build
```

Only commit when the project passes the expected checks.

## Do Not Commit

- `node_modules`
- `dist`
- `.env`
- log files
- local editor settings
- temporary test files
- secrets, tokens, passwords, or API keys

## Branch Naming

Use short, descriptive branch names:

```text
feature/user-profile
fix/api-health-check
docs/readme-update
chore/project-setup
```

## Pull Request Notes

- Keep PRs focused and reviewable.
- Explain the purpose of the change.
- Mention important implementation details.
- Include screenshots for UI changes when helpful.
- Mention any known limitations or follow-up work.
