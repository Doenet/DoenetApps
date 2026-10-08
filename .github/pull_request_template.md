## Summary

<!-- What changed and why. -->

## Deploy safety

- [ ] Every `/api` route whose inputs or outputs changed is in the API contract (not in `apps/api/contract-uncovered.json`)
- [ ] If labelled `api-breaking` or `db-destructive`: the replacement has been deployed for at least a day, and nothing still uses the old shape
