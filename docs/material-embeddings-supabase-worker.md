# Фоновая подготовка AI-поиска материалов через Supabase

Этот вариант не использует Vercel Cron. Сайт не участвует в массовой подготовке AI-поиска.

## Как работает

1. Материалы импортируются быстро.
2. Записи для AI-поиска лежат в `directory_material_embeddings` со статусом `pending` или `failed`.
3. Supabase Edge Function `material-embeddings-worker` берёт маленькую порцию записей.
4. Для каждой записи вызывает OpenAI embeddings API.
5. Сохраняет результат и переводит запись в `ready`.
6. Если OpenAI недоступен, запись остаётся `failed` и будет попробована позже.

## Почему маленькие порции

Проект сейчас на бесплатном тарифе Supabase. Для бесплатного тарифа нельзя запускать тяжёлую обработку большим объёмом. Рекомендуемая настройка:

- `limit=10`
- запуск раз в 15 минут

Для 35 000 материалов это медленно, но безопасно для бесплатного тарифа.

## Нужные секреты Supabase Function

В Supabase надо добавить секреты:

```text
OPENAI_API_KEY=<ключ OpenAI>
MATERIAL_EMBEDDINGS_WORKER_SECRET=<любой длинный случайный секрет>
```

Если `OPENAI_API_KEY` отсутствует, worker ничего не считает и возвращает `enabled: false`.

## Deploy Edge Function

```bash
supabase functions deploy material-embeddings-worker --project-ref dzfrwullsjmeblcnnpoi --no-verify-jwt
```

JWT отключён только потому, что запуск идёт по внутреннему секрету `x-smetalabs-worker-secret`. Без этого секрета функция вернёт `401`.

## Проверка вручную

```bash
curl -X POST \
  'https://dzfrwullsjmeblcnnpoi.supabase.co/functions/v1/material-embeddings-worker?limit=10' \
  -H 'x-smetalabs-worker-secret: <MATERIAL_EMBEDDINGS_WORKER_SECRET>'
```

## Supabase Cron

После проверки можно включить cron в Supabase SQL Editor.

```sql
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'material-embeddings-worker-every-15-minutes',
  '*/15 * * * *',
  $$
  select extensions.net.http_post(
    url := 'https://dzfrwullsjmeblcnnpoi.supabase.co/functions/v1/material-embeddings-worker?limit=10',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-smetalabs-worker-secret', '<MATERIAL_EMBEDDINGS_WORKER_SECRET>'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
```

## Проверка cron

```sql
select jobid, schedule, jobname, active
from cron.job
where jobname = 'material-embeddings-worker-every-15-minutes';
```

```sql
select *
from cron.job_run_details
where jobid = (
  select jobid from cron.job where jobname = 'material-embeddings-worker-every-15-minutes'
)
order by start_time desc
limit 10;
```

## Отключение cron

```sql
select cron.unschedule('material-embeddings-worker-every-15-minutes');
```
