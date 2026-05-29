---
name: file-issue
description: File a GitHub issue against Doenet/DoenetApps using the project's official issue templates (bug, feature, docs). Use when the user asks to "open an issue", "file a bug", "report a feature request", or "track this as an issue" against the upstream repo.
---

# file-issue

Use this skill when the user asks you to file a GitHub issue against `Doenet/DoenetApps`. It enforces the project's issue-template conventions defined in `.github/ISSUE_TEMPLATE/`.

## When to invoke

Trigger phrases:

- "open an issue", "file an issue", "create a GitHub issue"
- "report this bug", "track this as a bug"
- "feature request for ...", "request a feature"
- "file a docs issue", "the docs say ... but ..."

Do **not** invoke for: questions ("how does X work?"), TODOs that belong inline in code, or unfinished work in the current PR. If the user is still mid-task on something doable now, finish the work — don't farm it out to an issue.

## Pick the right template

Read the matching file under `.github/ISSUE_TEMPLATE/` _before_ drafting — the exact fields may have changed since this skill was written. Then map the user's intent:

| User intent                                  | Template file         | Issue type / label set |
| -------------------------------------------- | --------------------- | ---------------------- |
| Defect, crash, regression, wrong behavior    | `bug_report.yml`      | type: Bug              |
| New capability, UX improvement, API addition | `feature_request.yml` | type: Feature          |
| Wrong / missing / unclear documentation      | `documentation.yml`   | label: `layer:docs`    |

The repo uses **GitHub issue types** (not labels) for Bug/Feature/Project categorization. The templates set the type via the YAML `type:` field — don't add `bug` / `enhancement` / `triage` labels; those don't exist in this repo.

If the user's request doesn't cleanly fit one of these, ask before guessing. Important reroutes:

- **Instructor- or author-style bug reports without a developer-grade repro** go to the **Get Help** category on the [Doenet community forum](https://community.doenet.org), not Issues. Maintainers actively monitor Get Help and promote confirmed bugs into issues themselves. Most of Doenet's user base is instructors using the forum, not developers using GitHub.
- **Unshaped ideas or pain points without a proposed fix** go to the [Discussion category](https://community.doenet.org/c/discussion/15) on the forum.
- **DoenetML language bugs** belong in `Doenet/doenetml`, not this repo.

File a GitHub issue here only when (a) the user has a concrete reproduction (for bugs) or a shaped proposal (for features), and (b) wants the work tracked as developer work. When in doubt, point at the forum and let a maintainer promote.

Blank issues are enabled for cases that don't fit any template — tracking issues, RFCs, dependency bumps, postmortems, meta-issues. Prefer a template when one fits; reach for blank only when forcing the fit would distort the issue.

## Fill the template properly

Each YAML template defines required fields (`validations.required: true`). The CLI must satisfy all of them.

Before filing:

1. **Search for duplicates.** Run `gh issue list --repo Doenet/DoenetApps --search "<key terms>" --state all` and surface anything that looks related. Ask the user whether to file new, comment on existing, or skip.
2. **Pin down area and layer.** The repo uses two label families:
   - `area:*` — user-facing surface: `area:editor`, `area:assignments`, `area:browsing`, `area:folder-view`, `area:library`, `area:blog`, `area:discussions`. Pick exactly one if applicable.
   - `layer:*` — codebase layer: `layer:frontend`, `layer:api`, `layer:database`, `layer:infra`, `layer:docs`. Pick all that apply.

   Infer from context (recent files edited, error origin, the directory the user is in). The template dropdowns guide the user's selection; when filing via CLI, **pass these as `--label` flags directly** so the issue arrives already labeled — saves the maintainer a triage step.

3. **For bugs:** capture concrete repro steps, expected vs actual, the commit SHA (`git rev-parse --short HEAD`), and browser/OS or Node version where relevant. Don't paste secrets, tokens, or private URLs into logs.
4. **For features:** lead with the _problem_ (who hurts, when, why) before the proposed solution. A feature request that's only a solution gets bounced.
5. **For docs:** include the exact file path or URL and quote the confusing passage.

## File it

Use `gh issue create` against the upstream repo, passing the inferred area/layer labels directly:

```bash
gh issue create \
  --repo Doenet/DoenetApps \
  --template bug_report.yml \
  --title "[Bug]: <short summary>" \
  --label "area:editor" \
  --label "layer:frontend" \
  --body "$(cat <<'EOF'
<filled-in template body in markdown — match the template's section headings>
EOF
)"
```

Notes:

- `--template` selects the template; `--title` overrides the template's default prefix — keep the `[Bug]:` / `[Feature]:` / `[Docs]:` prefix.
- The issue **type** (Bug / Feature) is set by the template's `type:` field — don't try to pass it via flag.
- Pass one `--label area:*` and one or more `--label layer:*` matching what you inferred. For docs issues, `layer:docs` is auto-applied by the template.
- After creating, print the returned URL so the user can review.

## Confirm before filing

Always show the user the drafted title and body and get explicit confirmation before calling `gh issue create`. Filing a public issue is visible to the world and not easily reversible — match the scope of action to what was requested.
