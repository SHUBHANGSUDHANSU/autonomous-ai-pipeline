#!/bin/sh
set -eu

case "${SERVICE_MODE:-api}" in
  api)
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
    ;;
  worker)
    exec celery -A app.tasks.celery_tasks.celery_app worker \
      --loglevel="${LOG_LEVEL:-INFO}" \
      --concurrency="${CELERY_WORKER_CONCURRENCY:-1}"
    ;;
  beat)
    exec celery -A app.tasks.celery_tasks.celery_app beat \
      --loglevel="${LOG_LEVEL:-INFO}" \
      --schedule=/tmp/celerybeat-schedule
    ;;
  flower)
    exec celery -A app.tasks.celery_tasks.celery_app flower \
      --port="${PORT:-5555}"
    ;;
  *)
    echo "Unsupported SERVICE_MODE: ${SERVICE_MODE}" >&2
    exit 1
    ;;
esac
