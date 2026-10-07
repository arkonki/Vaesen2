# Vaesen Society Ledger

A signed-in Vaesen character and campaign hub built with Next.js, NextAuth credentials, Prisma, and PostgreSQL.

## Development Setup

Requires Node.js 22 or later and PostgreSQL, or Docker Compose. The app uses Prisma 6.19.3's engine-free PostgreSQL client; Prisma CLI operations still run on macOS/Linux in the FreeBSD deployment workflow.

Create `.env` from `.env.example`, then configure:

- `DATABASE_URL`: PostgreSQL URL. Use `localhost:5432` outside Docker; Compose supplies the internal database URL.
- `NEXTAUTH_SECRET`: a random secret generated with `openssl rand -hex 32`.
- `NEXTAUTH_URL`: `http://localhost:3000` for local development.
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`: initial administrator identity.
- `SEED_ADMIN_PASSWORD`: required only when creating an administrator; at least 12 characters and at most 72 UTF-8 bytes.

```sh
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### Docker Development

```sh
docker compose up --build -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

Open http://localhost:3000. Accounts are admin-created; there is no public signup. Use the configured bootstrap identity, not a built-in password.

The development stack binds app, database, and optional Prisma Studio ports to localhost. It waits for the database health check but does not apply migrations automatically.

## Updating An Existing Installation

Back up the database before applying migrations. This stabilization release adds session versions, invitations, mystery visibility, and HQ ledger entries.

```sh
docker compose build app
docker compose run --rm app npx prisma migrate deploy
docker compose up -d
```

Existing sessions must sign in again. Existing mysteries and their clues/entities/locations default to GM-only. A GM must explicitly reveal them; PREP mysteries remain hidden even when marked published.

Re-running the seed preserves existing accounts and existing named content. Passwords are not printed. An intentional bootstrap reset requires `SEED_RESET_ADMIN_PASSWORD=true` and a new `SEED_ADMIN_PASSWORD`; this also invalidates old sessions. Normal password resets should use Admin > Users.

## Production Docker

Use `docker-compose.prod.yml` as a standalone Compose file, not as an override for the development file. It uses a separate `production_pg_data` volume; development data is not copied automatically.

Set a strong, URL-safe `POSTGRES_PASSWORD` (for example `openssl rand -hex 32`), a separate random `NEXTAUTH_SECRET`, and the deployed HTTPS `NEXTAUTH_URL`. Never commit `.env`.

```sh
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml --profile bootstrap run --rm bootstrap
```

Production applies migrations before starting the app and runs the standalone server as a non-root user. Put an HTTPS reverse proxy in front of localhost:3000. The production database is not exposed to the host. Backups, login-rate limiting at the reverse proxy, and host monitoring remain deployment responsibilities.

## FreeBSD Shared Hosting

This is a portable-build workflow, not a guarantee of FreeBSD support. No root access or Docker is needed on the hosting account. Node.js 22+ (including Node 24) and PostgreSQL access are required. The provider must also allow persistent Node processes and route your HTTPS app domain to the process's listening port. SSH access alone does not supply either capability. Ask the provider before exposing the application.

If you keep a Git checkout on the server, use one canonical directory (for example `apps/Vaesen2`) and place private runtime releases, logs, backups and the `current` symlink under its ignored `.deploy/` directory. Do not create a second application directory differing only by case. `git pull` updates source; the running FreeBSD app is updated by building/uploading a portable release and restarting its process. Middleware uses `NEXTAUTH_URL` as its trusted redirect origin so reverse-proxy requests cannot send users to an internal localhost address.

Do not run `npm ci`, `prisma generate`, or `prisma migrate` on FreeBSD for this workflow. The Prisma CLI still needs a native schema engine. Build and migrate on your Mac or a Linux machine, and upload the finished runtime. An engine-free Prisma runtime uses JavaScript/WebAssembly and the PostgreSQL `pg` adapter; it does not download a FreeBSD query engine.

### 1. Prepare The Hosting Database

Create a PostgreSQL database/account in your hosting panel. Grant the migration account permission to create/alter objects in the target schema. Back up existing data before deploying migrations. Keep database credentials and application files outside the public web document root.

If PostgreSQL is accessible only from the hosting account, open an SSH tunnel from your Mac and leave this terminal open:

```sh
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:15432:DB_HOST:5432 HOST_LOGIN@SSH_HOST
```

`DB_HOST` is the database hostname as seen by the hosting server, often `127.0.0.1`; use the provider's actual value. SSH forwarding must be allowed by the provider. In another local terminal, configure an ignored `.env.migrations` file:

```dotenv
DATABASE_URL="postgresql://DB_USER:URL_ENCODED_PASSWORD@127.0.0.1:15432/DB_NAME?schema=public"
```

If using a directly accessible database instead, use its actual URL. Follow the provider's TLS/CA requirements; do not disable certificate verification just to make a connection work. The tunnel URL is for local migrations only, not for the deployed app.

On your Mac, from the repository:

```sh
npm ci --legacy-peer-deps
node --env-file=.env.migrations node_modules/prisma/build/index.js migrate deploy
npm run build:portable
```

`build:portable` regenerates the engine-free client and builds Next.js with image optimization disabled, avoiding `sharp` native binaries. It fixes the tracing root to this repository and packages static files, public assets, PostgreSQL runtime dependencies, and bootstrap/check/start scripts. The resulting `build/vaesen-portable.tar.gz` excludes local `.env` files, native binaries, and the Prisma CLI. Build-time configuration is baked into Next.js; rebuild the package if it changes. Never use `NEXT_PUBLIC_*` variables for secrets.

### 2. Upload And Configure

Example upload from your Mac:

```sh
ssh HOST_LOGIN@SSH_HOST 'mkdir -p "$HOME/apps"'
scp build/vaesen-portable.tar.gz HOST_LOGIN@SSH_HOST:apps/
```

On the server through SSH:

```sh
cd "$HOME/apps"
tar -xzf vaesen-portable.tar.gz
cd vaesen-portable
cp .env.example .env
chmod 600 .env
```

Edit `.env` on the server using `nano .env`, `vi .env`, or your hosting file manager. Set:

- `DATABASE_URL`: the provider's actual database address as seen from FreeBSD, not your Mac's tunnel address. URL-encode special characters in usernames/passwords.
- `NEXTAUTH_URL`: the public HTTPS app domain.
- `NEXTAUTH_SECRET`: a unique value generated with `openssl rand -hex 32`.
- `APP_HOST`: `127.0.0.1` by default; change only if the provider's routing requires another interface.
- `PORT`: the port assigned/allowed by the provider, default `3000`.
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD`: initial administrator credentials; password at least 12 characters, at most 72 UTF-8 bytes. Remove the password after bootstrap.

The PostgreSQL pool defaults to five connections. Use `connection_limit=2` (or another permitted limit) in `DATABASE_URL` if the provider imposes a smaller quota. Non-public `schema` values are passed to the adapter. TLS URL options are preserved.

### 3. Check And Start

Run on the FreeBSD server:

```sh
node check.mjs
node --env-file=.env prisma/seed.js
node start.mjs
```

The check validates runtime settings, connects to PostgreSQL, and checks the migrated user table. The seed is safe to repeat without resetting existing users. Starting in the foreground first lets you see runtime compatibility errors. The launcher reads the runtime `.env`, forces production mode, and binds to localhost unless `APP_HOST` overrides it. Environment variables already set in the shell take precedence over `.env`; unset stale values if necessary.

After a successful foreground test, stop it with Ctrl-C, then:

```sh
nohup node start.mjs > app.log 2>&1 < /dev/null &
echo $! > app.pid
sleep 2
tail -n 30 app.log
curl --fail http://127.0.0.1:3000/api/auth/csrf
```

Adjust the curl port to your configured `PORT`. `nohup` survives ordinary SSH logout, but does not restart the app after a reboot/crash and cannot prevent the provider from terminating processes. Use the provider's process supervision if available. Do not add periodic restart jobs unless the hosting provider explicitly permits them.

The provider must configure the HTTPS reverse proxy for your domain to the Node port, forwarding host/protocol correctly and preserving the request origin for Server Actions. Running Node does not automatically connect it to Apache or your website domain. Without a permitted persistent process and reverse proxy, this hosting plan cannot serve the full app. A static export would remove authentication, mutations and database functionality and is not an equivalent deployment.

For updates, use a fresh release directory rather than unpacking over a running app. Apply migrations on your Mac, build/upload the new package, copy the server's runtime `.env` privately to the new release, run the check, and replace the old process. Verify the PID belongs to your app with `ps -p "$(cat app.pid)" -o pid,args` before stopping it with `kill "$(cat app.pid)"`; PID files can become stale. Retain the previous release and a database backup for recovery. Never upload your Mac's development `.env` or overwrite the production runtime configuration.

## Permissions And Campaign Data

- Players edit their own characters and view parties they belong to.
- The owning GM and administrators manage shared party state.
- Recruiting someone else's character sends an invitation. The owner accepts it on Home before the recruiting GM gets character-sheet access. Administrators can enroll directly.
- NPC/Vaesen compendium content is excluded from player queries.
- Mysteries are private until published; clues, entities, and locations have individual reveal controls. HQ threats are GM-only.
- Notes autosave on character sheets. Shared party notes are GM-edited and sanitized.
- HQ prices are server-owned; awards and purchases have a Development Point ledger.
- Dice history is shared across app triggers during the signed-in session, but is not a multiplayer roll feed. Pushing does not automatically apply conditions.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

Unit tests run without a database. Integration tests run only when `TEST_DATABASE_URL` points to a separate database whose name ends in `_test`; never use your application database.

```sh
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
npm run test:integration
```

For real HTTP login and redaction checks, run the production app against that same test database on port 3001, then run `npm run test:http`. Override `SMOKE_BASE_URL` to check a test Docker container instead. The HTTP checks also verify that role changes invalidate existing cookies.

The integration suite creates and removes its own fixture records and covers cross-party mutations, invitation consent, character validation, session revocation, and concurrent HQ purchases. CI runs migrations, unit/integration tests, and HTTP smoke checks against disposable PostgreSQL.

Five development-only advisories currently remain in ESLint's `braces` dependency chain. The production dependency audit is checked separately; no automatic major-version downgrade is applied to silence development tooling advisories.

## Castle Gyllencreutz

The HQ page now has Castle, Catalogue, Benefits, Development, GM-only Threats, and History sections. The 49 core-book upgrade definitions are versioned in `src/lib/hq-upgrades.ts`, with summarized benefits and printed-page references.

- New castles start with the free Library and Butler Algot Frisk. Existing castles receive missing starting assets during migration without changing their balance.
- Purchases enforce permanent party Resources, archetypes, Inspiration, required upgrades, campaign evidence and maximum levels. Contacts/personnel need names and descriptions. GM prerequisite exceptions require an audited reason; they cannot bypass prices or level limits.
- Introduce a discovered facility to share its clue. Players do not receive its catalogue identity until it is acquired. The GM buys it when the group agrees to spend the points.
- An upgrade occasion remains open until the GM selects **End Upgrade Occasion**. The first purchase rolls its paid DP cost; each subsequent purchase adds one die per earlier purchase. Difference Engine reduces facility costs by one. Successful secret rolls create pending threats for GM selection, with editable countdowns and resolution.
- Development reviews record eight answers after a resolved/archived mystery and award DP once. Manual awards remain available for house rules and corrections.
- Benefits are recorded separately for Function and Asset, per mystery and purchased level. Infirmary/Chapel/Treasure Chamber support the per-investigator exception; Annals XP is once per named gaming session. Duplicate session labels return the same session.
- Record recovery benefits before opening a recovery roller. Recovery ignores conditions; applicable castle bonuses are added and push permission is explicit. Defect/Insight recovery outcomes remain GM/player-adjudicated and recorded in the character journal; permanent affliction management is not automated.
- Healing can update conditions directly. House Physician supports individual treatment choices in a group scene. Caretaker can restore a damaged facility. Narrative clues, travel, free successes and memento recovery require an explicit outcome/confirmation rather than invented automatic results.
- Temporary Resources, Capital and advantages appear separately on the character sheet. Banker bonuses require **End Scene Effect**; mystery-duration bonuses stop being active when a mystery is resolved. Annals awards do not truncate XP above the ten-checkbox tracker.
- Prepared database items are separate from permanent inventory and appear only for preparation/active mysteries. Database names/types/availability must match the supplying upgrade; add missing items through Admin before granting them. Mechanical inventions still require GM confirmation of suitability.
- Equipment has a non-destructive storage-retention review. Cellar Vault/Occult Archive capacity applies to common/magical retained quantities respectively. No character or stash equipment is silently deleted. Personal item exemptions and the one-new-item rule remain a group review, not automatic deletion.
- Personnel statistics are validated against book budgets and toughness. Recruit Motivation/Dark Secret are GM-only; names, descriptions and relationships are shared.
- The migration preserves original JSON for audit and imports recognized upgrades. Unknown legacy names appear as **REVIEW** assets; map them to a canonical upgrade when appropriate. This does not reprice old purchases.

The book leaves narrative decisions to the GM. This implementation counts distinct active facilities for the Fixer's requirement, uses the discounted paid cost for threat dice, and treats repair/status restoration as a GM-controlled workflow. The GM exception audit supports campaign-specific prerequisite rulings.

```sh
# Only against a fresh, disposable database ending in _test:
MIGRATION_TEST_DATABASE_URL="postgresql://.../vaesen_legacy_test" npm run test:migration
```

This additional test applies the earlier migrations, inserts a simulated legacy castle, then verifies that the castle migration preserves balances, accounts, threats, custom assets and original JSON. Never run it against your application database.
