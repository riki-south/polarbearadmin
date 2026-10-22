# Image To Normalized JSON Prompt

이미지 정규화는 이름이 아니라 `memberId`로 사람을 구분합니다. `name`은 해당 이미지에 표시된 현재 닉네임이며 식별 키로 사용하지 않습니다.

실제 변환에는 아래 최신 전용 문서를 사용하세요.

- 월간 남극곰·북극곰: `monthly-image-to-normalized-json-prompt.md`
- 주간 북극곰: `weekly-image-to-normalized-json-prompt.md`
- 단일 회원 기준표: `../data-source/fan-growth/member-registry.json`

모든 record는 다음 필드를 사용합니다.

```json
{
  "memberId": "S001 또는 N001",
  "name": "현재 닉네임",
  "currentFans": 1234
}
```

이미지에 이전 기간 값이 명확하면 `previousFans`를 추가할 수 있습니다. 팬 수는 0 이상의 정수여야 하며 월은 `YYYY-MM`, 주는 실제 ISO 주차에 맞는 `YYYY-WNN` 형식이어야 합니다.

관리자 화면에서 프롬프트를 내려받으면 선택한 그룹의 최신 `member-registry.json` 기준표가 자동으로 문서 끝에 붙습니다. 새 인원은 먼저 기준표에 다음 미사용 ID로 등록한 뒤 데이터를 변환하고 배포합니다.
