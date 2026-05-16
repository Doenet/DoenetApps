This folder contains the CloudFormation templates we need to run the infrastructure for the Doenet website.

To deploy changes to AWS, run the `aws-deploy` script.

To lint CloudFormation templates without deploying them, use `cfn-lint`.
https://github.com/aws-cloudformation/cfn-lint

## dev3 Umami services

The `dev3` environment now includes two additional ECS service stacks:

- `dev3-doenet-umami-db` - internal Postgres for Umami
- `dev3-doenet-umami` - public Umami app at `umami.dev3.doenet.org`

These stacks are deployed through the existing `infra\dev3.aws` stack order.

The Umami listener rule must have a **higher precedence** than the generic Doenet `/api` listener rule. In the current `dev3` params, that means Umami uses priority `1` and the generic Doenet API service uses priority `10`.

### Required SSM parameters before deploying the services

Create these Parameter Store entries in `us-east-2`:

- `/${EnvironmentName}/umami/DBPassword` - SecureString used by the Postgres container
- `/${EnvironmentName}/umami/DatabaseUrl` - SecureString used by the Umami app container
- `/${EnvironmentName}/umami/AppSecret` - SecureString used by Umami

For `dev3`, that means:

- `/dev3/umami/DBPassword`
- `/dev3/umami/DatabaseUrl`
- `/dev3/umami/AppSecret`

`DatabaseUrl` should point at the internal Postgres service. With the current `dev3` Cloud Map namespace, use:

`postgresql://umami:<password>@umami-db.dev3.doenet.internal:5432/umami`

Do not use the short host `umami-db` here; the Umami task needs the full Cloud Map hostname.

### Frontend analytics config after Umami bootstrap

Frontend Umami settings are committed in `apps/app/.env.dev3`, not stored in SSM.

The committed defaults should look like:

- `VITE_UMAMI_SCRIPT_URL=https://umami.dev3.doenet.org/script.js`
- `VITE_UMAMI_WEBSITE_ID=<website id>`

If `VITE_UMAMI_WEBSITE_ID` is blank, the `dev3` app builds without loading Umami.

### First Umami login and website setup

On a fresh Umami database, the default login is:

- username: `admin`
- password: `umami`

After the first login:

1. Change the default admin password immediately.
2. Create a new website entry for the React app.
3. Set the website domain to the app hostname you want to track in `dev3`.
4. Copy the generated website ID from Umami.
5. Update `apps/app/.env.dev3`:
   - `VITE_UMAMI_SCRIPT_URL=https://umami.dev3.doenet.org/script.js`
   - `VITE_UMAMI_WEBSITE_ID=<copied website id>`
6. Commit that change and redeploy the frontend so the `dev3` app build picks up the website ID.

If the default admin account is not present, Umami may not have completed its first-run database initialization. Check the Umami container logs and the database connectivity/config first.

For additional Umami setup details, see the upstream docs:

- https://umami.is/docs
