# Vercel deployment

## Deploy the app

Import this repository into Vercel and set the project Root Directory to `fan-management`:

- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

Connect a Vercel Blob store to the project. Set `VITE_API_BASE_URL=/api` and `ADMIN_PASSWORD` for both Preview and Production. `ADMIN_PASSWORD` must be server-side only. The Blob SDK uses the connected store credentials; do not put a Blob token in a `VITE_` variable.

## Seed the local data

The canonical datasets and member registry are in `data-source/fan-growth/`. From `fan-management/`, generate the public snapshot and upload the monthly data to the connected Vercel Blob store:

```powershell
npm run generate:data
npm run seed:vercel
```

The seed script reads `public/data/fan-growth/` and uploads the member registry, catalog, and South/North monthly datasets. North weekly files remain in the local archive and are not published to the monthly dashboard.

## Cut over the domain

1. Confirm the Vercel deployment can read both circles' monthly histories and accept a test JSON upload.
2. Add the current site host name to the Vercel project.
3. Change only the website DNS record to the value Vercel provides. Keep other DNS records, such as email records, at the current DNS provider.
4. Verify the domain, HTTPS, all four pages, and an upload using the production hostname.
5. Confirm that the site and uploaded data work from the production domain before closing the previous hosting account.
