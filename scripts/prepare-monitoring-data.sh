#!/usr/bin/env bash
set -Eeuo pipefail

env_file="${1:-.env}"
if [[ ! -f "$env_file" ]]; then
  echo "Missing environment file: $env_file" >&2
  exit 1
fi

monitoring_root="$(awk '/^MONITORING_DATA_ROOT=/ { sub(/^[^=]*=/, ""); print; exit }' "$env_file" | tr -d '\r')"
monitoring_root="${monitoring_root%\"}"
monitoring_root="${monitoring_root#\"}"
monitoring_root="${monitoring_root%\'}"
monitoring_root="${monitoring_root#\'}"
if [[ -z "$monitoring_root" || "$monitoring_root" != /* ]]; then
  echo 'MONITORING_DATA_ROOT must be an absolute Linux path in the environment file.' >&2
  exit 1
fi
if [[ "$EUID" -ne 0 ]]; then
  echo 'Run as root: sudo bash scripts/prepare-monitoring-data.sh' >&2
  exit 1
fi

install -d -m 0750 -o 65534 -g 65534 "$monitoring_root/prometheus"
install -d -m 0750 -o 472 -g 0 "$monitoring_root/grafana"
chown -R 65534:65534 "$monitoring_root/prometheus"
chown -R 472:0 "$monitoring_root/grafana"
chmod -R u+rwX,g+rX,o-rwx "$monitoring_root/prometheus" "$monitoring_root/grafana"
printf 'Prepared private monitoring storage at %s\n' "$monitoring_root"
