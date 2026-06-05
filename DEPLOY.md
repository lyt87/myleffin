# 배포 안내

이 앱은 Node.js 서버로 실행됩니다. Render, Railway 같은 Node 웹서비스에 배포할 수 있습니다.

## 필수 파일

- `server.js`
- `index.html`
- `app.js`
- `styles.css`
- `package.json`

## Render 배포 설정

1. GitHub에 이 폴더의 파일을 업로드합니다.
2. Render에서 `New +` > `Web Service`를 선택합니다.
3. GitHub 저장소를 연결합니다.
4. 설정값을 입력합니다.

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
```

5. Environment Variables에 아래 값을 추가합니다.

```text
NAVER_CLIENT_ID=네이버_클라이언트_ID
NAVER_CLIENT_SECRET=네이버_클라이언트_SECRET
```

6. 배포가 완료되면 Render가 제공하는 `https://...onrender.com` 주소로 접속합니다.

## 로컬 실행

PowerShell에서 아래처럼 실행합니다.

```powershell
$env:NAVER_CLIENT_ID="네이버_클라이언트_ID"
$env:NAVER_CLIENT_SECRET="네이버_클라이언트_SECRET"
npm start
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:5173
```

## 주의사항

- 네이버 API 키는 코드에 직접 저장하지 말고 배포 서비스의 환경변수에 넣습니다.
- Google Sheets 판매상태는 공개 게시 CSV 링크를 서버에서 읽습니다.
- 엑셀 업로드 데이터는 브라우저에서 처리되며 서버에 저장하지 않습니다.
- 무료 배포 서비스는 일정 시간 접속이 없으면 잠들 수 있어 첫 접속이 느릴 수 있습니다.
