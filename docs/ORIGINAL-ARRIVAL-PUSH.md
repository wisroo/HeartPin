# 원본 도착 푸시 알림

Capacitor 앱의 **프로필 → 원본 도착 알림**에서 기기별로 켤 수 있다. 운영체제 권한을 허용한 기기만 등록한다. 새 원본 전송이 생성되면 동일한 Supabase 계정의 상대방 역할로 등록된 기기에 알림을 보낸다. 알림을 탭하면 `받을 원본`으로 이동한다. 알림에는 파일명, 사진, 위치, 서명 URL을 넣지 않는다.

## 앱 설정

- Android는 Firebase의 앱 설정 파일을 `android/app/google-services.json`에 둔다.
- iOS는 앱 ID의 Push Notifications 기능과 해당 프로비저닝 프로파일을 준비한다. Debug는 APNs 개발 환경, Release는 운영 환경을 사용한다.
- 네이티브 설정이 준비된 빌드에 `VITE_HEARTPIN_PUSH_ENABLED=true`를 설정하고 `npm run cap:sync`를 실행한다. Supabase 모드에서 앱 토글이 표시된다.

## 백엔드 설정

1. `supabase/schema.sql`의 기기 등록, 알림 대기열 및 트리거를 적용한다. 이미 생성된 전송에는 알림을 소급하지 않는다.
2. Edge Function 환경에 `ORIGINAL_PUSH_WORKER_TOKEN`을 설정한다. iOS용 `PUSH_APNS_PRIVATE_KEY`, `PUSH_APNS_KEY_ID`, `PUSH_APNS_TEAM_ID`와 Android용 `PUSH_FCM_PROJECT_ID`, `PUSH_FCM_SERVICE_ACCOUNT`를 등록한다. 개발용 iOS 서버에서는 `PUSH_APNS_SANDBOX=true`를 설정한다.
3. `supabase functions deploy original-arrival-push --no-verify-jwt`로 배포한다. 이 함수는 전용 비밀 헤더가 일치하는 POST 요청만 처리한다.
4. Supabase Vault에 대상 HTTPS 프로젝트 주소를 `project_url`, 함수와 같은 비밀을 `original_push_worker_token`으로 저장한다. Cron 및 `pg_net`을 활성화하고 다음 작업을 등록한다.

```sql
select cron.schedule('heartpin-original-arrival-push', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/original-arrival-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-original-push-token',
      (select decrypted_secret from vault.decrypted_secrets where name = 'original_push_worker_token')
    ),
    body := '{}'::jsonb
  );
$$);
```

워커는 한 번에 최대 20건을 처리하고, 실패한 전송은 5분 뒤 재시도한다. 수령됐거나 만료된 전송은 건너뛴다. 제공자가 수신을 승인한 직후 서버가 중단되면 같은 알림이 재시도될 수 있다.
