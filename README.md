# iis-games-archive (Public)

IIS에서 생성된 게임 산출물만 공개 저장하는 아카이브 저장소입니다.

## 허용 콘텐츠 (Allowlist)

- `games/<game_slug>/**/*` (정적 런타임 자산만 허용)
  - 허용 확장자: `.html`, `.css`, `.js`, `.json`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.svg`, `.gif`, `.mp3`, `.ogg`, `.wav`, `.woff2`
  - 숨김 파일(`.` prefix), 경로 우회(`..`), 중복 슬래시(`//`) 금지
  - 파일당 최대 5MB 제한
- `manifest/games.json`
- `manifest/schema.json`
- `scripts/archive_guard.py`
- `scripts/.gitignore`
- 저장소 정책 문서 / 워크플로우

## 금지 콘텐츠

- 코어 엔진 코드
- 프롬프트 / 비밀키 / 내부 로그
- 배포 스크립트 / 사설 설정 파일

`archive-guard` 워크플로우가 allowlist 밖 파일을 차단합니다.

## 로컬 검증

```bash
# Python 3.11+ 권장
python scripts/archive_guard.py all
PYTHONDONTWRITEBYTECODE=1 python -B -m compileall -q scripts
```

## Manifest 규약

- `manifest/games.json`는 버전 관리됨 (`schema_version: 1`)
- 루트 구조: `{ schema_version, generated_at, games[] }`
- 파일 스키마 정의: `manifest/schema.json`
- 각 `games[].path`는 반드시 `games/<slug>/index.html`과 일치해야 함
- 저장소에 존재하는 모든 `games/*/index.html`은 `manifest/games.json`에 반드시 1회 등록되어야 함

## 자동 커밋 메시지 규칙

- 자동 반영 커밋 메시지 형식: `feat: archive <game_slug>`

## 삭제 실패 대응 정책

- 운영 삭제 요청 시 **DB/Storage 삭제 성공**이 우선 기준입니다.
- 아카이브 저장소 삭제가 실패하면 코어 엔진은 warning(`archive_delete_failed`)을 반환합니다.
- 운영자는 warning 대상 slug를 모아서 재처리 배치(archive cleanup)를 실행합니다.
