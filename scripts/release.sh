#!/usr/bin/env bash
# VPS release tooling. Run on the target host after configuring its private env.
set -Eeuo pipefail
umask 077
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
action="${1:-check}"
case "$action" in check|backup|deploy|smoke) ;; *) echo 'Use check, backup, deploy or smoke.' >&2; exit 2 ;; esac
test -f .env && test -f apps/ai-engine/.env || { echo 'Configure root and backend .env files first.' >&2; exit 1; }
compose=(docker compose --env-file .env -f infra/docker/docker-compose.prod.yml)
"${compose[@]}" config --quiet
"${compose[@]}" config --format json | node scripts/check-compose.mjs prod

backup() {
  local directory="${KODMOD_BACKUP_DIR:-.runtime/backups}" name container
  mkdir -p -- "$directory"
  chmod 700 -- "$directory"
  name="kodmod-$(date -u +%Y%m%dT%H%M%SZ)-${RANDOM}.dump"
  container="$("${compose[@]}" ps -q postgres)"
  test -n "$container" || { echo 'PostgreSQL must be running for backup.' >&2; return 1; }
  "${compose[@]}" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$1"' sh "/tmp/$name"
  "${compose[@]}" exec -T postgres pg_restore --list "/tmp/$name" > "$directory/$name.list"
  docker cp "$container:/tmp/$name" "$directory/$name"
  test -s "$directory/$name"
  (cd -- "$directory" && sha256sum "$name" > "$name.sha256")
  "${compose[@]}" exec -T postgres rm -f "/tmp/$name"
  echo "Verified backup saved: $directory/$name"
}

case "$action" in
  check) echo 'PASS production Compose, worker mounts and private service ports' ;;
  backup) backup ;;
  deploy)
    tag="${2:-}"
    [[ "$tag" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,80}$ ]] || { echo 'Deploy requires a unique image tag.' >&2; exit 2; }
    export KODMOD_TAG="$tag"
    "${compose[@]}" build ai-engine web
    "${compose[@]}" up -d --wait --wait-timeout 120 postgres
    backup
    "${compose[@]}" up -d --no-build --wait --wait-timeout 240
    "${compose[@]}" ps --all
    echo 'Runtime updated. Run smoke and the authenticated acceptance checklist.' ;;
  smoke)
    domain="$(sed -n 's/^APP_DOMAIN=//p' .env | head -n 1 | tr -d '\r')"
    [[ "$domain" =~ ^[a-zA-Z0-9.-]+$ ]] || { echo 'APP_DOMAIN must be a domain without a scheme.' >&2; exit 2; }
    DOCKER_WEB_ORIGIN="https://$domain" DOCKER_API_ORIGIN="https://$domain" DOCKER_API_PREFIX='/api' node scripts/check-docker.mjs ;;
esac
