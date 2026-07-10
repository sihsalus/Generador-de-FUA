#!/usr/bin/env bash
set -Eeuo pipefail

project_name="fua-smoke-${GITHUB_RUN_ID:-$$}-${GITHUB_RUN_ATTEMPT:-0}"
temporary_directory="$(mktemp -d)"
headers_path="${temporary_directory}/headers.txt"
pdf_path="${temporary_directory}/fua-smoke.pdf"
smoke_token="ci-smoke-token-not-secret"
export FUA_SMOKE_TOKEN="${smoke_token}"
export FUA_SMOKE_SECRET_KEY="ci-smoke-pdf-hmac-not-secret"
export FUA_SMOKE_HMAC_SECRET="ci-smoke-version-hmac"
export FUA_SMOKE_ENCRYPTION_KEY="ci-smoke-key"
compose=(
  docker compose
  --project-name "${project_name}"
  --file docker-compose.yml
  --file docker-compose.smoke.yml
)

cleanup() {
  exit_code=$?
  trap - EXIT

  if (( exit_code != 0 )); then
    "${compose[@]}" ps || true
    "${compose[@]}" logs --no-color || true
  fi

  "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  rm -rf "${temporary_directory}"
  exit "${exit_code}"
}
trap cleanup EXIT

if [[ -n "${FUA_SMOKE_IMAGE:-}" ]]; then
  docker image inspect "${FUA_SMOKE_IMAGE}" >/dev/null 2>&1 || docker pull "${FUA_SMOKE_IMAGE}"
  docker tag "${FUA_SMOKE_IMAGE}" "${project_name}-app:latest"
  "${compose[@]}" up --no-build --wait --wait-timeout 240
else
  "${compose[@]}" up --build --wait --wait-timeout 240
fi

database_table_oids() {
  "${compose[@]}" exec -T db \
    psql --username fuagenerator --dbname fuagenerator --tuples-only --no-align \
    --command "SELECT c.relname || ':' || c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname;"
}

wait_for_health() {
  for _attempt in $(seq 1 60); do
    if curl --fail --silent http://localhost:3000/health >/dev/null; then
      return 0
    fi
    sleep 2
  done

  echo "The FUA service did not become healthy after restart." >&2
  return 1
}

table_oids_before_restart="$(database_table_oids)"
if [[ -z "${table_oids_before_restart}" ]]; then
  echo "The startup sync did not create any application tables." >&2
  exit 1
fi

"${compose[@]}" restart app
wait_for_health

table_oids_after_restart="$(database_table_oids)"
if [[ "${table_oids_before_restart}" != "${table_oids_after_restart}" ]]; then
  echo "Database table identities changed after application restart." >&2
  exit 1
fi

"${compose[@]}" exec -T app node -e '
  const express = require("express");
  if (process.env.NODE_ENV !== "production" || express().get("env") !== "production") {
    throw new Error(`Expected production runtime, got NODE_ENV=${process.env.NODE_ENV}`);
  }
'

format_response_path="${temporary_directory}/format-response.json"
format_status="$(curl \
  --silent \
  --show-error \
  --max-time 60 \
  --output "${format_response_path}" \
  --write-out '%{http_code}' \
  --header "fuagentoken: ${smoke_token}" \
  --form 'formatPayload=@src/utils/FUA_Schema_Examples/FUA_1.0.jsonc;type=application/json' \
  --form 'name=CI Smoke FUA' \
  --form 'createdBy=ci-smoke' \
  http://localhost:3000/ws/FUAFormat/)"

if [[ "${format_status}" != '201' ]]; then
  echo "Creating the FUA format returned HTTP ${format_status}." >&2
  cat "${format_response_path}" >&2
  exit 1
fi

format_uuid="$(jq --exit-status --raw-output '.uuid' "${format_response_path}")"
create_fua_path="${temporary_directory}/create-fua.json"
jq --null-input \
  --arg format_uuid "${format_uuid}" \
  '{
    payload: {
      uuid: "11111111-1111-4111-8111-111111111111",
      startDatetime: "2026-01-02T03:04:05.000+0000",
      visitType: {
        name: "Consulta Ambulatoria",
        display: "Consulta Ambulatoria"
      },
      patient: {
        identifiers: [{display: "DNI = 00000000"}],
        person: {gender: "F"}
      },
      encounters: []
    },
    schemaType: "openmrs-visit-v1",
    outputType: "application/pdf",
    FUAFormatFromSchemaId: $format_uuid,
    createdBy: "ci-smoke"
  }' > "${create_fua_path}"

fua_response_path="${temporary_directory}/fua-response.json"
fua_status="$(curl \
  --silent \
  --show-error \
  --max-time 180 \
  --output "${fua_response_path}" \
  --write-out '%{http_code}' \
  --header "fuagentoken: ${smoke_token}" \
  --header 'content-type: application/json' \
  --data-binary "@${create_fua_path}" \
  http://localhost:3000/ws/FUAFromVisit/)"

if [[ "${fua_status}" != '201' ]]; then
  echo "Creating the FUA returned HTTP ${fua_status}." >&2
  cat "${fua_response_path}" >&2
  exit 1
fi

fua_uuid="$(jq --exit-status --raw-output '.uuid' "${fua_response_path}")"
render_path="${temporary_directory}/fua.html"
curl \
  --fail \
  --silent \
  --show-error \
  --max-time 60 \
  --request POST \
  --header "fuagentoken: ${smoke_token}" \
  --output "${render_path}" \
  "http://localhost:3000/ws/FUAFromVisit/${fua_uuid}/render"

grep --fixed-strings --quiet 'FORMATO UNICO DE ATENCIÓN - FUA' "${render_path}"
grep --fixed-strings --quiet '00000066' "${render_path}"
grep --fixed-strings --quiet '7-00000000' "${render_path}"

pdf_status="$(curl \
  --silent \
  --show-error \
  --max-time 180 \
  --request POST \
  --dump-header "${headers_path}" \
  --output "${pdf_path}" \
  --write-out '%{http_code}' \
  --header "fuagentoken: ${smoke_token}" \
  "http://localhost:3000/ws/FUAFromVisit/${fua_uuid}/generatePDF")"

if [[ "${pdf_status}" != '200' ]]; then
  echo "Generating the FUA PDF returned HTTP ${pdf_status}." >&2
  cat "${pdf_path}" >&2
  exit 1
fi

if ! grep -Eiq '^content-type:[[:space:]]*application/pdf' "${headers_path}"; then
  echo "The FUA endpoint did not return application/pdf." >&2
  exit 1
fi

if [[ "$(head -c 5 "${pdf_path}")" != '%PDF-' ]]; then
  echo "The generated artifact does not have a PDF signature." >&2
  exit 1
fi

if (( $(wc -c < "${pdf_path}") <= 10000 )); then
  echo "The generated FUA PDF is unexpectedly small." >&2
  exit 1
fi

app_container_id="$("${compose[@]}" ps --quiet app)"
if [[ -z "${app_container_id}" ]]; then
  echo "The FUA application container is not running." >&2
  exit 1
fi

docker cp "${pdf_path}" "${app_container_id}:/tmp/fua-smoke.pdf"
"${compose[@]}" exec -T app node -e '
  const fs = require("fs");
  const { PDFDocument } = require("pdf-lib");

  void PDFDocument.load(fs.readFileSync("/tmp/fua-smoke.pdf"))
    .then((pdf) => {
      if (pdf.getPageCount() < 1) {
        throw new Error("The generated FUA has no pages.");
      }

      const subject = pdf.getSubject() || "";
      if (!/^SIH\.SALUS - HASH: [a-f0-9]{64}$/.test(subject)) {
        throw new Error(`The generated FUA has invalid signature metadata: ${subject}`);
      }

      console.log(`Validated FUA PDF: ${pdf.getPageCount()} page(s).`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
'

verification_response_path="${temporary_directory}/verification-response.json"
curl \
  --fail \
  --silent \
  --show-error \
  --max-time 60 \
  --header "fuagentoken: ${smoke_token}" \
  --form "pdf=@${pdf_path};type=application/pdf" \
  --output "${verification_response_path}" \
  http://localhost:3000/ws/FUAFromVisit/hashSignatureVerification
jq --exit-status '.result == true' "${verification_response_path}" >/dev/null

echo "Generated FUA size: $(wc -c < "${pdf_path}") bytes"
sha256sum "${pdf_path}"
