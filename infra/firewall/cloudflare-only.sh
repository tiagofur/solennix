#!/usr/bin/env bash
# cloudflare-only.sh
# Restringe los puertos 80/443 del host a rangos IP oficiales de Cloudflare.
# Idempotente: se puede ejecutar N veces sin duplicar reglas.
#
# Uso:
#   sudo bash cloudflare-only.sh apply      # aplica reglas
#   sudo bash cloudflare-only.sh status     # muestra estado
#   sudo bash cloudflare-only.sh rollback   # revierte (abre 80/443 al mundo)
#
# Requisitos: iptables, ip6tables, ipset, curl
# Probado en: Ubuntu 22.04 / Debian 12 con Plesk Obsidian
#
# Precondiciones:
#   - SSH (:22) permanece abierto al mundo
#   - Plesk (:8443) permanece abierto al mundo
#   - Solo 80/443 quedan restringidos a Cloudflare
#   - Localhost siempre permitido
#   - ESTABLISHED,RELATED preservado
#
# Rollback rápido manual si SSH sigue vivo pero web se rompe:
#   sudo bash cloudflare-only.sh rollback
#
# Rollback desde consola KVM si SSH se pierde:
#   sudo ipset destroy cf_v4 cf_v6 2>/dev/null
#   sudo iptables -D INPUT -p tcp -m multiport --dports 80,443 -j DROP 2>/dev/null
#   sudo ip6tables -D INPUT -p tcp -m multiport --dports 80,443 -j DROP 2>/dev/null

set -euo pipefail

CF_V4_URL="https://www.cloudflare.com/ips-v4"
CF_V6_URL="https://www.cloudflare.com/ips-v6"
SET_V4="cf_v4"
SET_V6="cf_v6"
CHAIN="CF_WEB"

log()  { printf '\e[1;34m[cf-fw]\e[0m %s\n' "$*"; }
warn() { printf '\e[1;33m[cf-fw]\e[0m %s\n' "$*" >&2; }
die()  { printf '\e[1;31m[cf-fw]\e[0m %s\n' "$*" >&2; exit 1; }

need_root() { [ "$(id -u)" -eq 0 ] || die "Debe ejecutarse como root"; }

check_deps() {
  for bin in iptables ip6tables ipset curl; do
    command -v "$bin" >/dev/null 2>&1 || die "Falta dependencia: $bin (apt-get install -y $bin)"
  done
}

fetch_cf_ranges() {
  log "Descargando rangos IPv4 desde $CF_V4_URL"
  CF_V4_LIST=$(curl -fsSL --max-time 10 "$CF_V4_URL") || die "No se pudo descargar IPv4"
  log "Descargando rangos IPv6 desde $CF_V6_URL"
  CF_V6_LIST=$(curl -fsSL --max-time 10 "$CF_V6_URL") || die "No se pudo descargar IPv6"
  [ -n "$CF_V4_LIST" ] || die "Lista IPv4 vacía"
  [ -n "$CF_V6_LIST" ] || die "Lista IPv6 vacía"
  echo "$CF_V4_LIST" | grep -qE '^[0-9]+\.' || die "IPv4 parse falló"
  echo "$CF_V6_LIST" | grep -qE '^[0-9a-f]+:' || die "IPv6 parse falló"
}

rebuild_ipset() {
  local name="$1" family="$2" list="$3"
  local tmp="${name}_tmp"

  ipset destroy "$tmp" 2>/dev/null || true
  ipset create "$tmp" hash:net family "$family" hashsize 1024 maxelem 65536
  while IFS= read -r cidr; do
    [ -z "$cidr" ] && continue
    ipset add "$tmp" "$cidr"
  done <<< "$list"

  if ipset list -n "$name" >/dev/null 2>&1; then
    ipset swap "$tmp" "$name"
    ipset destroy "$tmp"
  else
    ipset rename "$tmp" "$name"
  fi
  log "ipset $name → $(ipset list "$name" | grep -c '^[0-9]')  entradas"
}

ensure_chain() {
  local table="$1"
  $table -N "$CHAIN" 2>/dev/null || true
  # Purgar cadena (idempotente)
  $table -F "$CHAIN"
}

apply_rules() {
  # IPv4
  ensure_chain iptables
  iptables -A "$CHAIN" -m set --match-set "$SET_V4" src -j ACCEPT
  iptables -A "$CHAIN" -j DROP

  # Insertar jump al tope de INPUT para 80/443 si no existe ya
  if ! iptables -C INPUT -p tcp -m multiport --dports 80,443 -j "$CHAIN" 2>/dev/null; then
    # loopback y established primero (ya suelen existir en Plesk, pero aseguramos)
    iptables -C INPUT -i lo -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -i lo -j ACCEPT
    iptables -C INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT 2>/dev/null \
      || iptables -I INPUT 2 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    iptables -I INPUT 3 -p tcp -m multiport --dports 80,443 -j "$CHAIN"
  fi

  # IPv6
  ensure_chain ip6tables
  ip6tables -A "$CHAIN" -m set --match-set "$SET_V6" src -j ACCEPT
  ip6tables -A "$CHAIN" -j DROP

  if ! ip6tables -C INPUT -p tcp -m multiport --dports 80,443 -j "$CHAIN" 2>/dev/null; then
    ip6tables -C INPUT -i lo -j ACCEPT 2>/dev/null || ip6tables -I INPUT 1 -i lo -j ACCEPT
    ip6tables -C INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT 2>/dev/null \
      || ip6tables -I INPUT 2 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    ip6tables -I INPUT 3 -p tcp -m multiport --dports 80,443 -j "$CHAIN"
  fi
}

persist() {
  # Debian/Ubuntu: netfilter-persistent + ipset-persistent
  if command -v netfilter-persistent >/dev/null 2>&1; then
    mkdir -p /etc/iptables
    iptables-save  > /etc/iptables/rules.v4
    ip6tables-save > /etc/iptables/rules.v6
    if [ -d /etc/iptables ]; then
      ipset save > /etc/iptables/ipsets
    fi
    # Systemd unit para restaurar ipset antes de iptables al boot
    if [ ! -f /etc/systemd/system/ipset-restore.service ]; then
      cat > /etc/systemd/system/ipset-restore.service <<'UNIT'
[Unit]
Description=Restore ipset
Before=netfilter-persistent.service
DefaultDependencies=no
After=local-fs.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c '/usr/sbin/ipset restore < /etc/iptables/ipsets'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
UNIT
      systemctl daemon-reload
      systemctl enable ipset-restore.service
    fi
    log "Persistido en /etc/iptables/ (netfilter-persistent)"
  else
    warn "netfilter-persistent no instalado — reglas se pierden al reboot."
    warn "Instalar: apt-get install -y iptables-persistent ipset-persistent"
  fi
}

cmd_apply() {
  need_root
  check_deps
  fetch_cf_ranges
  rebuild_ipset "$SET_V4" inet  "$CF_V4_LIST"
  rebuild_ipset "$SET_V6" inet6 "$CF_V6_LIST"
  apply_rules
  persist
  log "✅ Firewall Cloudflare-only activo en 80/443"
  log "Verifica: curl -sS -H 'Host: solennix.com' https://1.1.1.1  desde otro host debe fallar en :443 directo"
}

cmd_status() {
  echo "── ipset $SET_V4 ──"
  ipset list "$SET_V4" 2>/dev/null | head -20 || echo "no existe"
  echo ""
  echo "── ipset $SET_V6 ──"
  ipset list "$SET_V6" 2>/dev/null | head -20 || echo "no existe"
  echo ""
  echo "── iptables INPUT (80/443) ──"
  iptables -L INPUT -n --line-numbers | grep -E '(multiport|CF_WEB)' || echo "sin reglas"
  echo ""
  echo "── iptables chain $CHAIN ──"
  iptables -L "$CHAIN" -n --line-numbers 2>/dev/null || echo "chain no existe"
  echo ""
  echo "── ip6tables chain $CHAIN ──"
  ip6tables -L "$CHAIN" -n --line-numbers 2>/dev/null || echo "chain no existe"
}

cmd_rollback() {
  need_root
  log "Revirtiendo reglas Cloudflare-only..."
  iptables -D INPUT -p tcp -m multiport --dports 80,443 -j "$CHAIN" 2>/dev/null || true
  ip6tables -D INPUT -p tcp -m multiport --dports 80,443 -j "$CHAIN" 2>/dev/null || true
  iptables  -F "$CHAIN" 2>/dev/null || true
  iptables  -X "$CHAIN" 2>/dev/null || true
  ip6tables -F "$CHAIN" 2>/dev/null || true
  ip6tables -X "$CHAIN" 2>/dev/null || true
  ipset destroy "$SET_V4" 2>/dev/null || true
  ipset destroy "$SET_V6" 2>/dev/null || true
  persist
  log "✅ Rollback completo — 80/443 abiertos al mundo otra vez"
}

case "${1:-apply}" in
  apply)    cmd_apply    ;;
  status)   cmd_status   ;;
  rollback) cmd_rollback ;;
  *) echo "Uso: sudo bash $0 {apply|status|rollback}" ; exit 2 ;;
esac
