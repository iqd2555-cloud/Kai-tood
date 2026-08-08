# KPI -> Content Automation integration

## Safety boundary

Do not modify `app/api/line/webhook` or `lib/line-webhook.ts` for employee footage. Those files are the production Cash Flow LINE webhook.

Employee footage must enter through the separate KPI/employee-work ingestion path. After KPI validation passes, that ingestion path should upsert one row into `content_automation_queue` using the Supabase service-role client.

## Queue contract

Required fields:

- `media_id`: id of the accepted employee media row
- `source_type`: `image` or `video`
- `aspect_ratio`: normally `9:16` for employee footage
- `source_work_date`: employee work date

Initial states:

- `selection_status = candidate`
- `owner_status = pending`
- `caption_status = not_started`

Use `media_id` as the idempotency key. Duplicate LINE delivery must not create duplicate queue items.

Example server-side upsert after KPI passes:

```ts
await supabaseAdmin
  .from('content_automation_queue')
  .upsert({
    media_id: media.id,
    source_type: mediaType,
    aspect_ratio: media.aspect_ratio ?? null,
    source_work_date: submission.work_date,
    selection_status: 'candidate',
    owner_status: 'pending',
    caption_status: 'not_started',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'media_id', ignoreDuplicates: true });
```

## Owner flow

`/content-pool` reads only `owner_status = pending`.

- Owner presses `ผ่าน`: `owner_status=approved`, `selection_status=selected`, `caption_status=pending`.
- Owner presses `ไม่ใช้`: `owner_status=rejected`, `selection_status=rejected`.

A later caption/posting worker should consume only `owner_status=approved AND caption_status=pending`.

## Deployment prerequisite

The queue migration must be applied to the Supabase project before `/content-pool` can read it. The employee KPI tables/media relation must already exist in the deployed database. This change deliberately does not invent or replace that existing KPI schema.
