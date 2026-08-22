# 수학 과제 앱 공간 — 설치와 배포

파일은 세 개입니다. 실제로 올라가는 것은 `index.html` 하나뿐이고, `schema.sql`은 Supabase에 한 번 붙여넣는 용도, 이 문서는 순서표입니다.

---

## 1. Supabase 프로젝트 만들기

1. supabase.com에서 새 프로젝트를 만듭니다. 지역은 **Northeast Asia (Seoul)**을 고르면 학교에서 빠릅니다.
2. 데이터베이스 비밀번호는 따로 적어 두세요. 앱에서는 쓰지 않지만 나중에 필요할 수 있습니다.

## 2. 표와 규칙 만들기

1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. `schema.sql` 전체를 붙여넣고 **Run**
3. **Table Editor**에 `spaces`, `apps`, `visits`, `submissions` 네 개가 보이면 성공입니다.
4. **Storage**에 `submissions` 버킷도 함께 생겼는지 확인하세요.

## 3. 구글 로그인 켜기

1. Google Cloud Console → **API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 ID 만들기**
   - 유형: **웹 애플리케이션**
   - 승인된 리디렉션 URI: `https://<프로젝트id>.supabase.co/auth/v1/callback`
2. 나온 **클라이언트 ID**와 **보안 비밀**을 Supabase → **Authentication → Sign In / Providers → Google**에 넣고 켭니다.
3. Supabase → **Authentication → URL Configuration**
   - Site URL: `https://mumaroma.github.io/<저장소이름>/`
   - Redirect URLs에 같은 주소를 추가합니다. 이 줄이 빠지면 로그인 후 되돌아오지 못합니다.

## 4. 열쇠 두 개 넣기

Supabase → **Project Settings → API**에서 값을 복사해 `index.html` 위쪽을 고칩니다.

```js
var SUPABASE_URL = "https://xxxxxxxx.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

`anon public` 키는 브라우저에 드러나도 되는 키입니다. 접근 제한은 이 키가 아니라 `schema.sql`의 RLS 정책이 맡습니다. **`service_role` 키는 절대 넣지 마세요.**

## 5. 깃허브에 올리기

1. 새 저장소를 만들고 `index.html`을 루트에 올립니다.
2. **Settings → Pages → Source: Deploy from a branch → main / (root)**
3. 1~2분 뒤 `https://mumaroma.github.io/<저장소이름>/`에서 열립니다.
4. 3번의 Site URL과 이 주소가 정확히 같아야 합니다. 다르면 고쳐 주세요.

---

## 확인해 볼 것

- 구글 계정으로 들어와 공간을 하나 만든다
- 과제를 하나 올리고 미리보기가 뜨는지 본다
- **링크 복사**를 눌러 시크릿 창에 붙여넣는다 → 이름 입력 화면이 바로 나오면 성공
- 학생인 척 이름을 넣고 캡처를 하나 보낸다 → 교사 화면 **제출 결과**에 뜨는지 본다

## 알아 두실 점

- **캡처 이미지 버킷은 공개입니다.** 파일 이름이 무작위라 주소를 모르면 찾을 수 없지만, 주소를 아는 사람은 로그인 없이 볼 수 있습니다. 학생 얼굴이나 개인정보가 담긴 캡처가 오갈 수 있다면 비공개 버킷과 서명 URL 방식으로 바꾸는 편이 낫습니다.
- **과제 HTML은 누구나 읽을 수 있습니다.** 학생이 로그인하지 않고 과제를 열어야 해서 생기는 구조입니다. 답이 코드 안에 그대로 들어 있으면 볼 수 있다고 생각하세요.
- **학생 이름은 자기 신고입니다.** 남의 이름을 넣는 것을 막지 못합니다. 필요하면 학번 확인 절차를 따로 붙여야 합니다.
- 무료 요금제 기준으로 저장 공간은 1GB입니다. 캡처는 긴 변 1400px, 품질 82%로 줄여 올리므로 한 장에 대략 200~400KB입니다.
