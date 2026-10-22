# 프로젝트 작업 지침

## 팬 수 JSON 산출물 저장

- 사용자가 팬 수 이미지 분석·정규화·월간/주간 결산 JSON 제작을 요청하면, 최종 JSON 파일은 `D:\AIVLE SCHOOL 기간\southPolarbear\fan-management\public\data\fan-growth`에 저장한다.
- 파일 이름은 `south-monthly-YYYY-MM.json`, `north-monthly-YYYY-MM.json`, `north-weekly-YYYY-WNN.json` 형식을 따른다.
- 완료 응답에는 위 경로에 저장한 JSON 파일의 링크를 제공한다. 사용자가 별도 경로를 지정하면 그 요청을 우선한다.
- `public/data/fan-growth`는 데이터 생성 스크립트가 재작성하는 경로다. 산출물을 보존하기 위해 이미 존재하는 `data-source/fan-growth` 원본을 임의로 삭제하거나 이동하지 않는다.
