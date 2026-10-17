# 실시간 수업용(Beta) 적용 안내

## 바뀐 파일
- live.js (새 파일) — 학생 상태 중계 + 교사 '실시간' 탭
- index.html — live.js 로드 한 줄 추가 (student.js 앞)
- core.js — modeLabel()/modeClass() 도우미 추가
- teacher.js — 공간 유형에 live 추가(만들기·바꾸기·이름표), 대시보드 '실시간 Beta' 탭, 도움말
- student.js — 과제를 열 때 liveStudentStart(), 목록으로 돌아갈 때 liveClose(), 안내 배너
- styles.css — 끝에 실시간 모니터 스타일 추가

## Supabase 쪽 확인
1. spaces.mode 에 check 제약이 있으면 'live' 를 허용해야 합니다.
   alter table public.spaces drop constraint if exists spaces_mode_check;
   alter table public.spaces add constraint spaces_mode_check check (mode in ('open','class','live'));
2. Realtime 은 Broadcast/Presence 만 사용하므로 표·RLS 변경이 없습니다. 프로젝트 설정 → Realtime 이 켜져 있으면 됩니다.
3. space_info RPC 가 mode 를 그대로 돌려주면(현재 그렇습니다) 학생 쪽은 추가 작업이 없습니다.

## 과제 HTML 규약
- 조작할 때: parent.postMessage({ type: 'sim:state', state: getState(), mode: window.curMode }, '*')
- 받을 때:  window.addEventListener('message', e => { if (e.data?.type === 'sim:apply') setState(e.data.state); })
- 도전_작도.html, 삼각형_작도_탐구.html 에는 이미 들어 있습니다.

## 되돌리기
유형 live 를 쓰지 않으면 다른 유형 동작은 바뀐 것이 없습니다. 폐기할 때는 live.js 와 index.html 의 한 줄, teacher.js 의 live 분기만 지우면 됩니다 (git apply -R mathtask_live_beta.patch).
