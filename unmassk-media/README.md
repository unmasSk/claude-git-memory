# unmassk-media

Media toolkit for Claude Code — 8 skills covering the full media production lifecycle.

## Skills

| Skill | What It Does | Refs | Scripts | Requires |
|-------|-------------|------|---------|----------|
| **media-remotion** | Programmatic video creation with React + Remotion | 37 rules + 3 TSX examples | - | Node.js 18+, React |
| **media-image-gen** | AI image generation via Google Gemini | 1 (prompt crafting) | CLI + MCP bundles | `GEMINI_API_KEY` |
| **media-image-edit** | AI image editing — style transfer, object removal, background replacement, inpainting | 2 (operations, model selection) | `edit-image.sh` | `FAL_KEY` |
| **media-mermaid** | Generate 24+ Mermaid diagram types as PNG/SVG/PDF | 11 (9 diagram types + theme + pitfalls) + render script + 2 examples | - | Node.js (npx) |
| **media-ffmpeg** | Video/audio processing — trim, concat, convert, compress, transcode | 2 (commands, codec guide) | - | `ffmpeg`, `ffprobe` |
| **media-screenshots** | Marketing-quality screenshots with Playwright | 2 (screenshot types, workflow) | `screenshot-script.mjs` | Node.js, Playwright |
| **media-transcribe** | Transcribe audio/video from URLs or local files | 3 (platforms, whisper models, analysis prompt) | `transcribe.sh` | `whisper-cli`, `yt-dlp`, `ffmpeg` |
| **media-pdf** | Professional PDF generation with react-pdf — custom fonts (local only), SVG graphics, emoji, fixed headers/footers, page numbers, page breaks, Canvas drawing, Google Fonts catalog | 2 (components API, Google Fonts catalog) | - | Node.js, `@react-pdf/renderer`, `tsx` |

## Setup

### API Keys (optional — only for image skills)

Copy `.env.example` and fill in the keys you need:

```bash
cp .env.example .env
```

| Key | Skill | Get it at |
|-----|-------|-----------|
| `GEMINI_API_KEY` | media-image-gen | [Google AI Studio](https://aistudio.google.com/apikey) |
| `FAL_KEY` | media-image-edit | [fal.ai Dashboard](https://fal.ai/dashboard/keys) |

### System Dependencies

| Tool | Skills that need it | Install |
|------|-------------------|---------|
| Node.js 18+ | remotion, mermaid, screenshots, image-gen | [nodejs.org](https://nodejs.org) |
| `ffmpeg` + `ffprobe` | ffmpeg, transcribe | `brew install ffmpeg` |
| `whisper-cli` | transcribe | `brew install whisper-cpp` |
| `yt-dlp` | transcribe | `brew install yt-dlp` |
| Playwright | screenshots | `npx playwright install chromium` |

## Sources

| Skill | Source | License |
|-------|--------|---------|
| media-remotion | [remotion-dev/skills](https://github.com/remotion-dev/remotion/tree/main/packages/skills) (official Remotion) | MIT |
| media-image-gen | [guinacio/claude-image-gen](https://github.com/guinacio/claude-image-gen) | MIT |
| media-image-edit | [fal-ai-community/skills](https://github.com/fal-ai-community/skills) (fal-image-edit) | MIT |
| media-mermaid | [mgranberry/mermaid-diagram-skill](https://github.com/mgranberry/mermaid-diagram-skill) | MIT |
| media-ffmpeg | [madappgang/claude-code](https://github.com/madappgang/claude-code) (ffmpeg-core) | MIT |
| media-screenshots | [Shpigford/skills](https://github.com/Shpigford/skills) (screenshots) | MIT |
| media-transcribe | [jftuga/transcript-critic](https://github.com/jftuga/transcript-critic) | MIT |
| media-pdf | [diegomura/react-pdf](https://github.com/diegomura/react-pdf) (official react-pdf) | MIT |

## License

MIT
