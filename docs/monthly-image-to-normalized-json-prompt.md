# Monthly Image To Normalized JSON Prompt

월간 팬 수 이미지에서 `memberId` 기반 업로드용 정규화 JSON을 만들 때 사용하는 전용 프롬프트입니다.

## 프롬프트

```md
첨부한 이미지와 함께 제공된 memberId 기준표를 보고 월간 팬 수 업로드용 정규화 JSON으로 변환해줘.

반드시 아래 규칙을 지켜:

1. 응답은 JSON 본문만 출력
2. 코드블록, 설명, 주석, 해설 금지
3. 최상위 구조는 다음과 같아
{
  "periodId": "YYYY-MM",
  "periodLabel": "YYYY년 M월",
  "records": [
    {
      "memberId": "S001 또는 N001",
      "name": "이번 이미지에 표시된 현재 닉네임",
      "currentFans": 1234
    }
  ]
}
4. `memberId`는 모든 records 항목에 반드시 포함
5. 남극곰은 `S001` 형식, 북극곰은 `N001` 형식의 기존 memberId를 사용
6. `memberId`가 사람을 식별하는 기준이며 `name`은 변경 가능한 현재 표시 이름일 뿐임
7. 닉네임이 바뀌어도 동일 인물이면 기존 memberId를 그대로 유지
8. 이름이 같더라도 다른 사람이면 서로 다른 memberId를 사용
9. 이름을 가공해서 memberId를 만들거나 이미지 순서만으로 memberId를 새로 추측하지 않음
10. 기준표나 직전 정규화 JSON으로 memberId를 확정할 수 없는 항목은 임의 ID를 발급하지 말고 제외
11. 이미지에 직전 월 팬 수가 같이 있으면 `previousFans`도 넣고, 없으면 생략
12. 팬 수는 쉼표 없는 숫자 정수로 입력
13. 이름이나 숫자가 불명확하면 추측하지 말고 제외
14. records는 이미지에 나온 순서대로 정리
15. 같은 memberId가 중복되면 임의로 합치지 말고 가장 신뢰 가능한 1개만 남김

이번 데이터의 periodId는 `{{MONTH_PERIOD_ID}}`로 넣어.
periodLabel은 `{{MONTH_PERIOD_LABEL}}`로 넣어.
팬 그룹은 `{{FAN_GROUP}}`이고, 제공된 `{{MEMBER_ID_REFERENCE}}`를 우선 적용해.

숫자, 이름 또는 memberId가 애매하면 틀리게 추정하지 말고 제외하고, 확실한 항목만 JSON에 넣어.
```

## 출력 예시

```json
{
  "periodId": "2026-08",
  "periodLabel": "2026년 8월",
  "records": [
    {
      "memberId": "S001",
      "name": "변경된닉네임",
      "currentFans": 1750
    },
    {
      "memberId": "S002",
      "name": "멤버B",
      "previousFans": 1200,
      "currentFans": 1450
    }
  ]
}
```

## 기준 memberId

유일한 기준표는 `data-source/fan-growth/member-registry.json`입니다. 관리자 화면에서 이 프롬프트를 내려받으면 선택한 그룹의 최신 기준표가 문서 끝에 자동으로 붙습니다. 저장소에서 직접 사용할 때도 같은 파일의 해당 그룹(`south` 또는 `north`)을 함께 제공하세요.

## 사용 메모

- `{{MONTH_PERIOD_ID}}` 예시: `2026-08`
- `{{MONTH_PERIOD_LABEL}}` 예시: `2026년 8월`
- `{{FAN_GROUP}}`에는 `남극곰` 또는 `북극곰`을 넣습니다.
- `{{MEMBER_ID_REFERENCE}}`에는 `member-registry.json`의 해당 그룹을 제공합니다.
- `previousFans`가 없으면 앱이 이전 월의 같은 `memberId`에 해당하는 `currentFans`를 자동 참조합니다.
- 새 인원에게 ID가 필요하면 JSON 변환 전에 관리자가 해당 그룹의 다음 미사용 번호를 발급해야 합니다.
