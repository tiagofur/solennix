---
name: solennix-video-creator
description: Create tutorials and marketing videos for Solennix using Remotion
metadata:
  tags: solennix, remotion, video, marketing, tutorial
---

## Overview

Solennix uses Remotion to generate professional videos and GIFs for tutorials and marketing campaigns. The video project is located in the `/video` directory.

## Project Structure

- `video/src/Root.tsx`: Registration of all compositions.
- `video/src/tutorials/`: High-resolution (1920x1080) walkthroughs.
- `video/src/social/`: Strategic formats for Instagram/TikTok (Reels 9:16, Feed 1:1).
- `video/src/schema.ts`: Zod schemas for parameterizable videos.
- `video/src/styles/`: Shared colors and typography (Matching the Solennix brand).

## How to Create a New Video

1. **Define the Props**: Add a new Zod schema to `src/schema.ts`.
2. **Create the Component**: Add a new React component in `src/tutorials/` or `src/social/`.
3. **Register the Composition**: Open `src/Root.tsx` and add a `<Composition />` with your component, schema, and default props.
4. **Refine Design**: Use the `studio` to preview changes in real-time.

## Commands

Always run these from the `/video` directory:

- `npm run studio`: Open the visual editor (BEST for development).
- `npm run render`: Render the main client tutorial.
- `npm run render:<name>`: Render specific compositions (check `package.json`).

## Best Practices

- **Vibrant Aesthetics**: Use the colors from `src/styles/colors.ts`.
- **Transitions**: Use `@remotion/transitions` for smooth scene changes.
- **GIFs**: For docs, render smaller sequences with `render:gif` scripts.
