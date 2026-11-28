This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deploy the backend on Coolify

Set the base directory to `/backend`, the build command to `npm run build`, and the start command to `npm run start:deploy`. Set the port to `5000` and the health check path to `/api/health`. The start command applies committed Prisma migrations before starting the API. On a release that predates `start:deploy`, the equivalent start command is `npx prisma migrate deploy && npm start`.

### Switch an existing database from `db push` to Prisma Migrate

1. Take a database backup and test the following steps on a restored copy first. Run Prisma commands from `backend` with `DATABASE_URL` set to the database being checked.
2. Run `npx prisma migrate status`. If the database has tables but no migration history, verify that the schema already includes the objects from `prisma/migrations/0_init/migration.sql`, then run `npx prisma migrate resolve --applied 0_init` once. For any later migration, mark it applied only if you have verified that **all** of its schema and data changes are present. Leave the offer usage and notification migration pending when upgrading from a release before `56b1e88`.
3. Before applying the offer usage migration, run the following read-only query. A nonzero result means existing coupon usage pairs need reconciliation before applying the unique constraint. The notification migration handles duplicate notification event IDs while preserving notification rows.

   ```sql
   SELECT COUNT(*) AS duplicate_coupon_pairs
   FROM (
     SELECT "couponId", "orderId"
     FROM "coupon_usages"
     GROUP BY "couponId", "orderId"
     HAVING COUNT(*) > 1
   ) AS duplicates;
   ```

4. Redeploy with the updated start command and verify that the migration succeeds and `/api/health` returns HTTP 200.
