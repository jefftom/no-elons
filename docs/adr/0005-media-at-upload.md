# ADR 0005: Process media at upload; never-reused keys

- **Status:** accepted
- **Date:** 2026-10-02

## Context

On-the-fly image optimisation (e.g. `next/image`) re-processes at request time, needs cache invalidation, and makes it
easy to accidentally serve originals with GPS metadata.

## Decision

Re-encode every upload once with sharp/libvips: sniff the format, apply orientation, strip all metadata, write a
≤2048 px WebP plus a 640 px square thumbnail, and record the dimensions and dominant colour. Store under a fresh UUIDv7
key, which is never reused, so a key's bytes never change. The origin still checks visibility before serving: photos
on removed or deleted posts, or by suspended authors, return 404. Storage is a small interface (local disk now, S3/R2 +
CDN later, with CDN purge on moderation).

## Consequences

- Serving is static and CDN-friendly, and a privacy guarantee (no EXIF/GPS) is enforced structurally.
- Upload requests take a few hundred ms per photo. Video will need an async job pipeline.
- Changing variant sizes later needs a backfill job (originals aren't kept, by choice: less to leak).
