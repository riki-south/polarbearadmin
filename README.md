# SPB Fan Growth Archive

Two monthly fan-growth dashboards for the South and North circles, with a shared home page and password-protected JSON uploads. The production target is Vercel Functions plus Vercel Blob; no AWS service is required at runtime.

## Local development

```powershell
npm ci
npm run dev
```

Without `VITE_API_BASE_URL`, the app loads the bundled local snapshot and stores local edits in the browser. Set `VITE_API_BASE_URL=/api` to use the Vercel Function API locally; that also requires a connected Vercel Blob store and an administrator password.

## Vercel project

- Root directory: `fan-management`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Add a Vercel Blob store and connect it to this project.
- Set `VITE_API_BASE_URL` to `/api` in Preview and Production.
- Set `ADMIN_PASSWORD` as a server-only Vercel environment variable. Never use the `VITE_` prefix for this secret.

The Vercel Function reads and writes fan JSON through Blob. The `api/[...path].mjs` handler reuses the existing validation and upload logic. `vercel.json` enables direct links to the four SPA pages.

## Seed the local data into Vercel Blob

The canonical fan data and member registry are stored in `data-source/fan-growth/`. The build regenerates the public snapshot from those source files. Once the Vercel Blob store and environment variables are configured, seed the monthly datasets and registry with:

```powershell
npm run seed:vercel
```

The seed script reads `public/data/fan-growth/` and uploads South/North monthly datasets. North weekly source files remain archived locally and are not uploaded to the monthly dashboard.

## Admin JSON shape

Upload one JSON object per circle and month:

```json
{
  "periodId": "2026-09",
  "records": [
    { "memberId": "S001", "name": "nickname", "currentFans": 123456 }
  ]
}
```

`memberId` stays as the identity key across nickname changes and is not rendered in the public UI. `previousFans` is optional; if omitted, the API reads it from the prior month.

## Home image

Replace `src/assets/home-hero.svg` with the generated cover art. If you use PNG or WebP, update the import in `src/features/home/HomeView.tsx` to match the new extension.
