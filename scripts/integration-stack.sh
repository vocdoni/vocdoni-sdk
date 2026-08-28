#!/usr/bin/env bash
# Drives the local docker stack (voconed + blind-csp + vocfaucet) that ALL
# network test suites run against. The suites never talk to a deployed server:
# without the env vars this script exports, they refuse to run.
#
#   scripts/integration-stack.sh up    # start the stack and wait until it is ready
#   scripts/integration-stack.sh run   # up, then run the suites, env pre-wired
#   scripts/integration-stack.sh run test:integration:csp   # …or just the given yarn scripts
#   scripts/integration-stack.sh logs [service]             # show container logs
#   scripts/integration-stack.sh down  # tear the stack down (drops volumes)
#
# Both a laptop and CI call this same script, so the orchestration lives in
# exactly one place. `up` prints the env vars to export; it also appends them
# to $GITHUB_ENV (CI) and to $INTEGRATION_ENV_FILE (used internally by `run`)
# when those are set.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
COMPOSE_FILE="$REPO_ROOT/test/integration/util/docker-compose.yml"
STACK_ENV_FILE="$REPO_ROOT/test/integration/util/.env"

# Host ports the stack publishes on 127.0.0.1. Override them if they clash
# with something already running on your machine.
VOCONED_HOST_PORT="${VOCONED_HOST_PORT:-9095}"
BLINDCSP_HOST_PORT="${BLINDCSP_HOST_PORT:-5000}"
VOCFAUCET_HOST_PORT="${VOCFAUCET_HOST_PORT:-8085}"
export VOCONED_HOST_PORT BLINDCSP_HOST_PORT VOCFAUCET_HOST_PORT

# Reads a variable from the stack's .env file, keeping it the single source
# of truth for anything the containers are configured with.
stack_env() {
  sed -n "s/^$1=//p" "$STACK_ENV_FILE"
}

API_URL="http://127.0.0.1:${VOCONED_HOST_PORT}$(stack_env VOCONED_URLPATH)"
# blind-csp's /v1 API prefix is hardcoded upstream, not configurable via .env.
BLINDCSP_URL="http://127.0.0.1:${BLINDCSP_HOST_PORT}/v1"
FAUCET_URL="http://127.0.0.1:${VOCFAUCET_HOST_PORT}$(stack_env FAUCET_BASEROUTE)"
# The CSP public key is derived from the hardcoded test private key in the
# stack's .env file; tests need it to build CspCensus objects.
BLINDCSP_PUBKEY=$(stack_env BLINDCSP_PUBKEY)

compose() {
  # The compose project directory defaults to the compose file's directory, so
  # interpolation picks up test/integration/util/.env automatically.
  docker compose -f "$COMPOSE_FILE" "$@"
}

stack_is_running() {
  local cid
  cid=$(compose ps -q voconed 2>/dev/null || true)
  [ -n "$cid" ] && [ "$(docker inspect -f '{{.State.Running}}' "$cid" 2>/dev/null)" = "true" ]
}

port_is_free() {
  local port="$1"
  # Bash-native TCP probe: no lsof/nc dependency. Do NOT add an
  # `exec 3>&-`-style cleanup line here — `exec` with redirections and no
  # command applies them to the current shell permanently.
  if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    return 1
  fi
  return 0
}

wait_container_healthy() {
  local service="$1" timeout_s="$2" waited=0
  local cid
  cid=$(compose ps -q "$service")
  if [ -z "$cid" ]; then
    echo "ERROR: service '$service' is not running" >&2
    return 1
  fi
  while true; do
    local status
    status=$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "unknown")
    [ "$status" = "healthy" ] && return 0
    if [ "$waited" -ge "$timeout_s" ]; then
      echo "ERROR: service '$service' did not become healthy within ${timeout_s}s (last status: $status)" >&2
      return 1
    fi
    sleep 3
    waited=$((waited + 3))
  done
}

# Succeeds as soon as the URL answers HTTP at all (any status code): enough to
# know the service is up for images whose readiness endpoint we don't control.
wait_url_answers() {
  local url="$1" label="$2" timeout_s="$3" waited=0
  while true; do
    if curl -s -o /dev/null -m 5 "$url"; then
      return 0
    fi
    if [ "$waited" -ge "$timeout_s" ]; then
      echo "ERROR: $label did not answer at $url within ${timeout_s}s" >&2
      return 1
    fi
    sleep 3
    waited=$((waited + 3))
  done
}

print_env() {
  echo "API_URL=$API_URL"
  echo "FAUCET_URL=$FAUCET_URL"
  echo "BLINDCSP_URL=$BLINDCSP_URL"
  echo "BLINDCSP_PUBKEY=$BLINDCSP_PUBKEY"
}

cmd_up() {
  if stack_is_running; then
    # `compose up -d` is idempotent: it reconciles the stack, (re)starting any
    # service that exited while leaving the running ones untouched.
    echo "== stack already running, reusing it" >&2
  else
    for port in "$VOCONED_HOST_PORT" "$BLINDCSP_HOST_PORT" "$VOCFAUCET_HOST_PORT"; do
      if ! port_is_free "$port"; then
        echo "ERROR: port $port is already in use on 127.0.0.1 — override VOCONED_HOST_PORT/BLINDCSP_HOST_PORT/VOCFAUCET_HOST_PORT or stop whatever holds it" >&2
        exit 1
      fi
    done
    echo "== starting stack (voconed, blind-csp, vocfaucet)" >&2
  fi
  compose up -d

  # The 450s ceiling covers voconed's first-boot zk circuit download (its own
  # deadline on that download is 300s) plus one restart. Do not tighten it.
  echo "== waiting for voconed to be healthy" >&2
  wait_container_healthy voconed 450
  echo "== waiting for the API, faucet and CSP to answer" >&2
  wait_url_answers "$API_URL/chain/info" "voconed API" 60
  wait_url_answers "$FAUCET_URL" "vocfaucet" 60
  wait_url_answers "$BLINDCSP_URL" "blind-csp" 60

  echo "== stack ready — export this to run suites by hand:" >&2
  print_env
  if [ -n "${INTEGRATION_ENV_FILE:-}" ]; then
    print_env >>"$INTEGRATION_ENV_FILE"
  fi
  if [ -n "${GITHUB_ENV:-}" ]; then
    print_env >>"$GITHUB_ENV"
  fi
}

cmd_down() {
  compose down -v
}

cmd_logs() {
  compose logs "$@"
}

cmd_run() {
  # cmd_up is called DIRECTLY, not as `out=$(cmd_up)`: bash disables errexit
  # inside a command substitution that feeds an assignment, so every failure in
  # cmd_up would be swallowed and we would run the suites against a stack that
  # never came up. The env vars come back via a file instead.
  local envfile
  envfile=$(mktemp)
  # shellcheck disable=SC2064
  trap "rm -f '$envfile'" EXIT
  INTEGRATION_ENV_FILE="$envfile" cmd_up
  set -a
  # shellcheck source=/dev/null
  . "$envfile"
  set +a

  local suites=("$@")
  if [ "${#suites[@]}" -eq 0 ]; then
    suites=(test:integration test:service test:api test:integration:zk)
  fi

  local status=0
  for suite in "${suites[@]}"; do
    echo "== running yarn $suite" >&2
    (cd "$REPO_ROOT" && yarn "$suite") || {
      status=$?
      break
    }
  done

  if [ "$status" -ne 0 ]; then
    echo "== suite FAILED — leaving the stack up so you can inspect it:" >&2
    echo "     logs: scripts/integration-stack.sh logs" >&2
    echo "     stop: scripts/integration-stack.sh down" >&2
  elif [ -n "${INTEGRATION_KEEP_STACK:-}" ]; then
    echo "== INTEGRATION_KEEP_STACK set — leaving the stack up" >&2
  else
    echo "== suites passed — stopping containers (volumes kept for a fast next boot)" >&2
    compose down
  fi
  return "$status"
}

case "${1:-}" in
  up) cmd_up ;;
  down) cmd_down ;;
  logs) shift; cmd_logs "$@" ;;
  run) shift; cmd_run "$@" ;;
  *)
    echo "usage: $0 {up|down|run [yarn scripts…]|logs [service…]}" >&2
    exit 1
    ;;
esac
