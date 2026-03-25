---
description: How to manage and render Solennix videos
---

1. Go to the video directory: `cd video`
2. Install dependencies (if first time): `npm install`
3. Launch the studio to preview/edit: `npm run studio`
4. Render a specific video: `npm run render <composition-id> out/<filename>.mp4`
5. For GIFs (useful for READMEs): `npm run render <composition-id> out/<filename>.gif --image-format=png`
