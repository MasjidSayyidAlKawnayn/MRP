# Data layer

The frontend talks directly to Neon Auth and the Neon Data API. Database RLS is the authorization boundary, so browser code must never contain service-role keys or private connection strings.

## Where to edit

- `src/data/neon.ts` owns public Neon configuration, config validation, Auth client creation, and schema-scoped Data API clients.
- `src/crud/entities.ts` describes editable tables, fields, labels, relation targets, and list/display fields.
- `src/crud/*Repository.ts` files contain database operations grouped by responsibility.
- `src/crud/dataMappers.ts` converts between database column names and UI field keys.
- `src/crud/data.ts` is a compatibility barrel. Prefer adding real logic to the focused modules above.

## Schema notes

`VITE_NEON_APP_SCHEMA` defaults to `mqs`. The SQL files in `sql/` currently target the `mqs` schema directly, so update both the env value and SQL schema references if a future Neon branch uses a different app schema.

## Adding a table

1. Add or update the SQL migration in `sql/`.
2. Add the entity and fields in `src/crud/entities.ts`.
3. Add custom repository functions only if generic row CRUD is not enough.
4. Run `npm run db:migrate` against a Neon branch.
5. Run `npm run typecheck` and `npm run test`.
