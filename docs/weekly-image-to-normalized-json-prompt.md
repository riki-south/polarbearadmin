# Weekly Image To Normalized JSON Prompt

주간 북극곰 팬 수 이미지에서 `memberId` 기반 업로드용 정규화 JSON을 만들 때 사용하는 전용 프롬프트입니다.

## 프롬프트

```md
첨부한 이미지와 함께 제공된 memberId 기준표를 보고 주간 북극곰 팬 수 업로드용 정규화 JSON으로 변환해줘.

반드시 아래 규칙을 지켜:

1. 응답은 JSON 본문만 출력
2. 코드블록, 설명, 주석, 해설 금지
3. 최상위 구조는 다음과 같아
{
  "periodId": "YYYY-WNN",
  "periodLabel": "YYYY년 N주차",
  "records": [
    {
      "memberId": "N001",
      "name": "이번 이미지에 표시된 현재 닉네임",
      "currentFans": 1234
    }
  ]
}
4. `memberId`는 모든 records 항목에 반드시 포함하며 `N001` 형식의 기존 ID를 사용
5. `memberId`가 사람을 식별하는 기준이며 `name`은 변경 가능한 현재 표시 이름일 뿐임
6. 닉네임이 바뀌어도 동일 인물이면 기존 memberId를 그대로 유지
7. 이름이 같더라도 다른 사람이면 서로 다른 memberId를 사용
8. 이름을 가공해서 memberId를 만들거나 이미지 순서만으로 memberId를 새로 추측하지 않음
9. 기준표나 직전 정규화 JSON으로 memberId를 확정할 수 없는 항목은 임의 ID를 발급하지 말고 제외
10. 이미지에 직전 주 팬 수가 같이 있으면 `previousFans`도 넣고, 없으면 생략
11. 팬 수는 쉼표 없는 숫자 정수로 입력
12. 이름이나 숫자가 불명확하면 추측하지 말고 제외
13. records는 이미지에 나온 순서대로 정리
14. 같은 memberId가 중복되면 임의로 합치지 말고 가장 신뢰 가능한 1개만 남김

이번 데이터의 periodId는 `{{WEEK_PERIOD_ID}}`로 넣어.
periodLabel은 `{{WEEK_PERIOD_LABEL}}`로 넣어.
제공된 `{{MEMBER_ID_REFERENCE}}`를 우선 적용해.

숫자, 이름 또는 memberId가 애매하면 틀리게 추정하지 말고 제외하고, 확실한 항목만 JSON에 넣어.
```

## 출력 예시

```json
{
  "periodId": "2026-W28",
  "periodLabel": "2026년 28주차",
  "records": [
    {
      "memberId": "N001",
      "name": "변경된닉네임",
      "currentFans": 1325
    },
    {
      "memberId": "N002",
      "name": "멤버B",
      "previousFans": 1180,
      "currentFans": 1210
    }
  ]
}
```

## 북극곰 기준 memberId

유일한 기준표는 `data-source/fan-growth/member-registry.json`의 `north` 그룹입니다. 관리자 화면에서 이 프롬프트를 내려받으면 최신 북극곰 기준표가 문서 끝에 자동으로 붙습니다. 저장소에서 직접 사용할 때도 같은 기준표를 함께 제공하세요.

## 사용 메모

- `{{WEEK_PERIOD_ID}}` 예시: `2026-W28`
- `{{WEEK_PERIOD_LABEL}}` 예시: `2026년 28주차`
- `{{MEMBER_ID_REFERENCE}}`에는 `member-registry.json`의 `north` 그룹을 제공합니다.
- `previousFans`가 없으면 앱이 이전 주의 같은 `memberId`에 해당하는 `currentFans`를 자동 참조합니다.
- 새 인원에게 ID가 필요하면 JSON 변환 전에 관리자가 다음 미사용 `N` 번호를 발급해야 합니다.
