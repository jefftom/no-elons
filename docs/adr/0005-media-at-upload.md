# ADR 0005: Process media at upload; immutable keys

- **Status:** accepted
- **Date:** 2026-10-02

## Context

On-the-fly image optimisation (e.g. `next/image`) re-processes at request time, needs cache invalidation, and makes it
easy to accidentally serve originals with GPS metadata.

## Decision

Re-encode every upload once with sharp/libvips: sniff the format, apply orientation, strip all metadata, write a
≤2048 px WebP plus a 640 px square thumbnail, and record the dimensions and dominant colour. Store under a fresh UUIDv7
key and serve with `Cache-Control: immutable`. Storage is a small interface (local disk now, S3/R2 + CDN later).

## Consequences

- Serving is static and CDN-friendly, and a privacy guarantee (no EXIF/GPS) is enforced structurally.
- Upload requests take a few hundred ms per photo. Video will need an async job pipeline.
- Changing variant sizes later needs a backfill job (originals aren't kept, by choice: less to leak).
