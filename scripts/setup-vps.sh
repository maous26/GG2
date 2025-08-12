#!/usr/bin/env bash
set -euo pipefail

# Usage: curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/main/scripts/setup-vps.sh | bash -s -- \
#   --email admin@example.com --domain api.example.com --with-dev

EMAIL=""
DOMAIN=""
WITH_DEV=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --email) EMAIL="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; shift 2 ;;
    --with-dev) WITH_DEV=true; shift ;;
    *) shift ;;
  esac
done

echo "[1/6] System update & basic security"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ufw fail2ban unattended-upgrades curl ca-certificates gnupg lsb-release jq

echo "[2/6] Configure UFW"
ufw default deny incoming || true
ufw default allow outgoing || true
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

echo "[3/6] Install Docker Engine"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

echo "[4/6] Create directories for prod/dev data"
mkdir -p /srv/prod/{mongo,postgres,redis}
if $WITH_DEV; then
  mkdir -p /srv/dev/{mongo,postgres,redis}
fi

echo "[5/6] Enable automatic security updates"
cat >/etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Origins-Pattern {
        "origin=Ubuntu,codename=
        ${distro_codename},label=Ubuntu";
        "origin=Ubuntu,codename=
        ${distro_codename},label=Ubuntu,component=main";
};
Unattended-Upgrade::Automatic-Reboot "true";
EOF
systemctl restart unattended-upgrades || true

echo "[6/6] Done. Next steps:"
echo "- Copy your project to /opt/globegenius (or git clone)"
echo "- Create .env.prod with your secrets"
echo "- Run: docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"

