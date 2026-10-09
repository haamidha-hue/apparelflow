# ApparelFlow ERP: Cutting Operations & Gatekeeper Verification Terminal

A full-stack implementation of the production batch verification checkpoint for a garment factory. No cutting batch can reach the Sewing Queue without component-by-component verification by an authorized Cutting Verifier. The rule is enforced on the server, not just in the UI.

**Live demo:** [https://apparelflow-weld.vercel.app]
**Repository:** [https://github.com/haamidha-hue/apparelflow]

## Demo credentials

All accounts use the password `Password123!`

| Role | Email | Can do |
|---|---|---|
| Cutting Supervisor | cutting.supervisor@apparelflow.com | Create orders, submit for verification |
| Cutting Verifier | cutting.verifier@apparelflow.com | Count components, approve or reject |
| Sewing Supervisor | sewing.supervisor@apparelflow.com | View verified batches, start sewing |

The login page has a demo panel, and every screen has a role switcher in the header.

## Tech stack

- Next.js 16 (App Router) + React + TypeScript
- Tailwind CSS 4
- PostgreSQL (Neon) with Prisma 6
- JWT sessions (jose) in an httpOnly cookie, passwords hashed with bcrypt
- Zod for server-side validation
- Vitest for automated tests

## Architecture

app/
  api/auth/*              login, logout, me
  api/orders              create order            (cutting_supervisor)
  api/orders/[id]/submit  submit for verification (cutting_supervisor)
  api/orders/[id]/counts  save component counts   (cutting_verifier)
  api/orders/[id]/approve approve batch           (cutting_verifier)
  api/orders/[id]/reject  reject with reason      (cutting_verifier)
  api/sewing/queue        verified orders only    (sewing_supervisor)
  api/sewing/[id]/start   start sewing            (sewing_supervisor)
  cutting/ verifier/ sewing/   role workspaces
lib/
  domain.ts        business rules: multiplier, traffic light, wastage, approval check
  validation.ts    Zod schemas
  rbac.ts          requireRole() API guard
  auth.ts          JWT sign / verify
  sewing-queue.ts  the single query with WHERE status = 'VERIFIED'
prisma/
  schema.prisma    relational schema
  seed.ts          users and recipes
tests/             Vitest suite


### State machine


CUTTING_IN_PROGRESS --submit--> PENDING_VERIFICATION --approve--> VERIFIED --start--> SEWING_STARTED
                                        |
                                     reject (reason required)
                                        v
                                    REJECTED --resubmit--> PENDING_VERIFICATION


Every transition is an atomic database update with the expected current status in the `WHERE` clause (for example `updateMany where status = PENDING_VERIFICATION`). Two simultaneous requests cannot both succeed, and an order in the wrong state cannot be moved.

## Security model

| Rule | Where it is enforced |
|---|---|
| Role checks | `requireRole()` at the top of every API route: 401 not logged in, 403 wrong role |
| Hard stop | The approve route re-reads counts from the database inside a transaction. Any RED, missing or uncounted component throws 422 and rolls the status change back |
| Query isolation | The sewing queue query has `where: { status: "VERIFIED" }`. The endpoint accepts no parameters |
| Identity | Verifier ID and timestamps come from the signed session and the database, never from the request body |
| Audit trail | `verification_logs` is append-only (only `create` is ever called) and stores verifier, decision, wastage % and timestamp |
| Input validation | Zod on the server: rejects negatives, decimals, text and empty values. The UI mirrors the rules for instant feedback |

Status codes: 400 invalid input, 401 not authenticated, 403 wrong role, 404 not found, 409 wrong order state, 422 business rule violated (shortage).

## Database schema

| Table | Purpose |
|---|---|
| `users` | email, password_hash, role, full_name |
| `recipes` | recipe_code, name, category, std_fabric_yards, wastage_cap |
| `recipe_components` | component name and pieces per garment (belongs to a recipe) |
| `cutting_orders` | order_no, recipe, target_qty, fabric_roll_id, actual_fabric_yds, status, created_by |
| `verification_items` | expected_qty, actual_qty (null = not counted), traffic-light status per component |
| `verification_logs` | append-only audit: verifier_id, decision, rejection_note, wastage_pct, timestamp |

Fabric wastage % = ((actual fabric - expected fabric) / expected fabric) x 100, where expected fabric = std yards per piece x batch quantity.

## Run locally


npm install


Create `.env` in the project root:


DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
JWT_SECRET="a-random-string-of-at-least-32-characters"

npx prisma migrate deploy
npm run db:seed
npm run dev


Open http://localhost:3000.

## Tests


npm test


Nine tests cover: approval of an all-GREEN order, 422 on a RED shortage (and rollback), 422 on uncounted components, YELLOW excess still allowed, 400 on rejection without a reason, 403 for non-verifier roles, 401 when logged out, and sewing queue isolation. The tests call the real route handlers against the real database, with only the session faked. Test data is prefixed `TEST-` and deleted afterwards.

## Design decisions

- Fabric yards allow up to 2 decimals (fabric is measured in fractions of a yard). Piece counts and batch quantity are strictly whole numbers.
- Role is stored in the signed cookie. A role changed in the database applies at next login (sessions last 8 hours).
- The UI is light-only (`color-scheme: light`) with explicit dark text on every input, to avoid low-contrast defects.

## Deployment

Deployed on Vercel with a Neon PostgreSQL database.

Environment variables required:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Random string, at least 32 characters, used to sign session tokens |

The `postinstall` script runs `prisma generate` so the Prisma client is built during deployment. Migrations are applied with `npx prisma migrate deploy` and demo data is loaded with `npm run db:seed`.