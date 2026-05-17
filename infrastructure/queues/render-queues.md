# Rendering queues

BullMQ queue names:
- `canva-render-video` timeline/video exports (MP4/WebM)
- `canva-render-thumbnail` previews and animated thumbnail snapshots
- `canva-render-transcode` asset transcoding
- `canva-render-image` image optimization jobs
- `canva-render-audio` future dedicated audio mix jobs

All queues use Redis, exponential retries, stalled job recovery, and dead-letter status via `render_jobs.status = dead_letter` after final failure.
