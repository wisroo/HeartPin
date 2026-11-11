# 임시 원본 자동 정리

`relay-cleanup`은 만료된 `uploaded` 전송을 먼저 `expired`로 바꾼 뒤 임시 원본을 삭제한다. 수령 확인이 끝난 `landed` 전송도 다시 시도한다. Storage 삭제가 성공하면 경로를 비우고, 수령이 확인된 전송은 `deleted`로 바꾼다. 실패 시 경로가 남아 다음 실행에서 다시 처리된다. 기록, 사진 사본 정보, display와 thumb는 변경하지 않는다.

## 배포 및 예약

1. 대상 프로젝트에 `supabase/schema.sql` 변경을 적용한다. 기존 프로젝트에서 이 기능만 추가할 때는 `transfer_queue_status_check` 변경을 적용하면 된다.
2. Edge Function 비밀과 Supabase Vault에 동일한 임의의 고강도 값을 각각 `RELAY_CLEANUP_TOKEN`, `relay_cleanup_token`으로 등록한다. Vault의 `project_url`에는 대상 프로젝트 HTTPS URL을 넣는다.
3. `supabase functions deploy relay-cleanup --no-verify-jwt`로 배포한다. 함수는 POST 요청과 전용 비밀 헤더를 검사한다.
4. 프로젝트에서 Cron과 `pg_net`을 활성화하고 다음 작업을 등록한다. 이 작업은 15분마다 실행한다.

```sql
select cron.schedule('heartpin-relay-cleanup', '*/15 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/relay-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-relay-cleanup-token',
      (select decrypted_secret from vault.decrypted_secrets where name = 'relay_cleanup_token')
    ),
    body := '{}'::jsonb
  );
$$);
```

함수 응답의 `cleaned`와 `failed`로 결과를 확인한다. 일부 정리에 실패하면 성공한 항목을 보존하고 HTTP 500을 반환한다. 영구적으로 잘못된 경로는 자동으로 삭제하지 않으므로 반복 실패를 확인해야 한다.
