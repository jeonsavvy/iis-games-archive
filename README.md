# iis-games-archive (Public)

Public archive repository for generated game deliverables only.

## Allowed content

- `games/<game_slug>/index.html`
- `manifest/games.json`
- `manifest/schema.json`
- repository policy docs/workflows

## Forbidden content

- Core engine code
- Prompts, secrets, internal logs
- Deployment scripts and private configs

`archive-guard` workflow blocks non-allowlisted files.

## Manifest contract

- `manifest/games.json` is versioned (`schema_version: 1`)
- root shape: `{ schema_version, generated_at, games[] }`
- file-level schema lives in `manifest/schema.json`

## Archive commit message rule

- 자동 반영 커밋 메시지 형식: `feat: archive <game_slug>`
