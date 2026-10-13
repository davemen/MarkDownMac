# MarkDownMac teaser (code-built motion graphics)

A 20 s, 1920x1080, 30 fps cinematic teaser rendered entirely from code: no AI
video model, no stock footage, no credits spent. The look (2.39:1 letterbox,
film grain, chromatic aberration on the cuts, crash zoom, anamorphic flare,
glyph tunnel, glass card with real perspective) is built in a 2D canvas and
captured frame by frame.

- `scene.html`  deterministic scene: `renderFrame(frame)` draws one frame and returns a JPEG
- `render.js`   headless Chromium (Playwright) renders the 600 frames on 4 workers, then ffmpeg muxes
- `audio.js`    procedural soundtrack (sub drone, pad, risers, impacts on the cuts, whoosh, typing, flare)
- `out/markdownmac-teaser.mp4`  the finished video

Render:

```sh
npm i -g playwright   # once; ffmpeg must be on PATH
node motion/render.js            # full render, ~45 s on 4 cores
node motion/render.js --preview  # key frames only, into motion/preview/
```

Timeline: 0-4.2 s "WRITE IN MARKDOWN." resolves from blur, crash zoom to white;
4.2-9.0 s flight through markdown glyphs, "DELIVER IN WORD."; 9-14 s markdown
types itself then a light wipe converts it into a formatted Word page;
14-17.5 s orbiting glass card, "MARKDOWN IN. / WORD OUT."; 17.5-20 s lockup
with a lens-flare sweep and fade.
