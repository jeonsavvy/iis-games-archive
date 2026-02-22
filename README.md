# iis-games-archive (Public)

IIS에서 생성된 게임 산출물만 공개 저장하는 아카이브 저장소입니다.

## 허용 콘텐츠 (Allowlist)

- `games/<game_slug>/index.html`
- `manifest/games.json`
- `manifest/schema.json`
- 저장소 정책 문서 / 워크플로우

## 금지 콘텐츠

- 코어 엔진 코드
- 프롬프트 / 비밀키 / 내부 로그
- 배포 스크립트 / 사설 설정 파일

`archive-guard` 워크플로우가 allowlist 밖 파일을 차단합니다.

## Manifest 규약

- `manifest/games.json`는 버전 관리됨 (`schema_version: 1`)
- 루트 구조: `{ schema_version, generated_at, games[] }`
- 파일 스키마 정의: `manifest/schema.json`

## 자동 커밋 메시지 규칙

- 자동 반영 커밋 메시지 형식: `feat: archive <game_slug>`
