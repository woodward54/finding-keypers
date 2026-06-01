# Finding Keypers

A gilded, Art Deco photo gallery. Keypers upload a portrait of themselves and
join a scrolling vault of black, bronze, and gold.

- **Framework:** Next.js (App Router, TypeScript, Tailwind v4)
- **Backend:** Convex (file storage + photo records)
- **UI:** shadcn-style components, custom Art Deco theme
- **Auth:** none

## Features

- **Home** (`/`) — a four-column infinite marquee of keyper portraits with
  hover shine, deco frames, and a shimmering gilded title. Seeded with curated
  placeholder portraits so the gallery looks alive before any uploads.
- **Upload** (`/upload`) — reached via the `+ Add Your Portrait` button. Opens
  the camera, captures a center-cropped portrait, and uploads it to Convex
  storage.

## Getting started

```bash
npm install

# 1. Connect the Convex backend (creates a deployment + writes
#    NEXT_PUBLIC_CONVEX_URL into .env.local, regenerates convex/_generated).
npx convex dev

# 2. In another terminal, run the app.
npm run dev
```

Open http://localhost:3000.

> **Preview mode:** without a Convex deployment the app still runs — the home
> gallery shows its placeholder portraits and the upload page works through
> capture, but persisting requires `npx convex dev`.

## Project layout

```
convex/
  schema.ts        photos table (storageId, name, createdAt)
  photos.ts        list query · generateUploadUrl + savePhoto mutations
src/
  app/
    page.tsx       home — hero + scrolling gallery
    upload/        camera capture page
    globals.css    Art Deco theme (tokens, gilded text, marquee keyframes)
  components/
    gallery.tsx    column marquee, merges live + placeholder photos
    photo-tile.tsx framed portrait card
    deco-art.tsx   generated deco portraits + key/lock/box motifs
    site-header.tsx
    convex-provider.tsx
  lib/
    placeholder-photos.ts
```
