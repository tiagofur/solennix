---
name: solennix-video-creator
description: Create tutorials and marketing videos for Solennix using Remotion
metadata:
  tags: solennix, remotion, video, marketing, tutorial
---

## Overview

Solennix uses Remotion to generate professional videos and GIFs for tutorials and marketing campaigns. The video project lives in the `/remotion` directory at the repo root (`package.json` name: `solennix-video`).

For generic Remotion know-how (captions, ffmpeg, audio, animations, etc.), load the `remotion-best-practices` skill — this skill only covers Solennix-specific project layout and commands.

## Project Structure

- `remotion/src/Root.tsx`: Registration of all compositions.
- `remotion/src/tutorials/`: High-resolution (1920x1080) walkthroughs.
- `remotion/src/social/`: Strategic formats for Instagram/TikTok (Reels 9:16, Feed 1:1).
- `remotion/src/marketing/`: Marketing-specific scenes.
- `remotion/src/schema.ts`: Zod schemas for parameterizable videos.
- `remotion/src/styles/`: Shared colors and typography (matching the Solennix brand).
- `remotion/public/`: Static assets.

## How to Create a New Video

1. **Define the Props**: Add a new Zod schema to `remotion/src/schema.ts`.
2. **Create the Component**: Add a new React component in `remotion/src/tutorials/`, `social/`, or `marketing/`.
3. **Register the Composition**: Open `remotion/src/Root.tsx` and add a `<Composition />` with your component, schema, and default props.
4. **Refine Design**: Use the studio to preview changes in real-time.

## Commands

Always run these from the `/remotion` directory:

- `npm run studio`: Open the visual editor (best for development).
- `npm run render`: Render the main client tutorial.
- `npm run render:<name>`: Render specific compositions (check `package.json`).

## Best Practices

- **Brand alignment**: Use the colors and typography from `remotion/src/styles/` and follow `PRODUCT.md` (canonical design source). Gold `#C4A265` and navy `#1B2A4A` used with intention.
- **Transitions**: Use `@remotion/transitions` for smooth scene changes.
- **GIFs**: For docs, render smaller sequences with `render:gif` scripts if available.
