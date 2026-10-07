# Vaesen Society Ledger

A signed-in Vaesen character and campaign hub built with Next.js, NextAuth credentials, Prisma, and PostgreSQL.

## Development Setup

Requires Node.js 22 and PostgreSQL, or Docker Compose.

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
