# Fan Growth Source Data

Put the source JSON files for deployment in this folder.

`member-registry.json` is the single member identity registry. Every dataset `memberId` must exist in the matching `south` or `north` group. Add a new person there with the next unused ID before adding that person to a dataset; nickname changes only update dataset `name` values and do not change the ID.

## File names

- `south-monthly-YYYY-MM.json`
- `north-weekly-YYYY-WNN.json`
- `north-monthly-YYYY-MM.json`

Example:

- `south-monthly-2026-07.json`
- `north-weekly-2026-W27.json`
- `north-monthly-2026-07.json`

기존 파일 이름은 전환 호환을 위해 다음과 같이 읽지만, 내용에는 현재 형식의 `memberId`가 반드시 있어야 합니다.

- `monthly-YYYY-MM.json` → 남극곰 월간
- `weekly-YYYY-WNN.json` → 북극곰 주간

## Supported JSON shape

```json
{
  "periodId": "2026-07",
  "periodLabel": "2026-07",
  "records": [
    {
      "memberId": "S001",
      "name": "player-a",
      "currentFans": 1200000
    }
  ]
}
```

Notes:

- `memberId` is required and is the stable identity key. Use `S001` for south members and `N001` for north members.
- `name` is the current display name and may change without changing `memberId`.
- `previousFans` is optional. If omitted, the build step fills it from the previous period record with the same `memberId`.
- 남극곰 월간, 북극곰 주간, 북극곰 월간은 서로 다른 category와 출력 파일을 사용합니다.
- 북극곰 월간 JSON은 남극곰 월간 JSON과 같은 필드 형식을 사용합니다.
- `name` that contains only spaces is normalized to `_` during upload and static-data generation.
- `uploadedAt` is optional. If omitted, the file's modified time is used.
- Source files can be saved as `UTF-8`, `EUC-KR`, or `Windows-949 (CP949 family)`.
- The generated `public/data/fan-growth.json` is always written as `UTF-8`.
- Running `npm run build` automatically regenerates `public/data/fan-growth.json`.
- Generation also creates `public/data/fan-growth/catalog.json` and `member-registry.json` for API deployment.
- A duplicate category + period source file is rejected instead of being merged silently.
