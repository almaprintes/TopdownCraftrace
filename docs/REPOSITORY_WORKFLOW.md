# Repository workflow

## Permanent branches

- `beta-0.0.3`: public tester build. Do not develop directly on this branch.
- `main`: active development branch. `/dev` is always built from this branch.

## Deployment

- Public root `/TopdownCraftrace/` is always built from `beta-0.0.3`.
- Development `/TopdownCraftrace/dev/` is always built from `main`.
- Normal pushes to `main` update only the development build content; testers remain on the beta branch.

## Promoting a new beta

1. Finish and verify a substantial improvement on `main`.
2. Move/create the next beta branch from the approved `main` commit.
3. Update the deployment workflow to point the public root to that beta branch.
4. Deploy once and verify the public build.

Do not add temporary feature, recovery, audio, preview or experiment branches to the production Pages workflow.
