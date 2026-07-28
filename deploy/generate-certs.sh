#!/usr/bin/env sh
set -eu

CERT_DIR="${1:-deploy/certs}"
DOMAIN="${2:-routiq.dev}"

mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/CN=*.${DOMAIN}/O=Routiq/C=US" \
  -addext "subjectAltName=DNS:${DOMAIN},DNS:*.${DOMAIN},DNS:relay.${DOMAIN}"

echo "Self-signed certs written to ${CERT_DIR}/"
echo "For production, replace with Let's Encrypt certs from certbot."
