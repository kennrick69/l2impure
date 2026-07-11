#!/usr/bin/env bash
#
# setup-backup-vps.sh — instala a rotina de backup do MySQL l2jdb na VPS
# de jogo (76.13.170.153). CHECKLIST_JOS item 3 — o ÚNICO risco fatal do
# projeto. O site promete "backup a cada 4h" na página /sobre: este
# script torna isso verdade.
#
# USO (rodar NA VPS, como root — 1 minuto):
#   scp scripts/setup-backup-vps.sh root@76.13.170.153:/root/
#   ssh root@76.13.170.153 "MYSQL_PWD='SENHA_DO_MYSQL' bash /root/setup-backup-vps.sh"
#
# IDEMPOTENTE: rodar 2x sobrescreve os mesmos arquivos, não duplica cron.
#
# O que instala:
#   - /usr/local/bin/l2impure-backup.sh  (dump + gzip + retenção 7 dias)
#   - /etc/cron.d/l2impure-backup        (a cada 4h: 00:00, 04, 08, 12, 16, 20)
#   - /var/backups/l2impure/             (destino local)
#   - Off-site opcional via rclone (ver GUIA — configure depois, o local
#     já vale mais que nada HOJE)

set -euo pipefail

DB_NAME="${DB_NAME:-l2jdb}"
DB_USER="${DB_USER:-root}"
BACKUP_DIR="/var/backups/l2impure"
RETENTION_DAYS=7

if [ -z "${MYSQL_PWD:-}" ]; then
  echo "[ERRO] Exporte MYSQL_PWD com a senha do MySQL antes de rodar:"
  echo "       MYSQL_PWD='senha' bash $0"
  exit 1
fi

echo "[1/4] Validando acesso ao MySQL..."
if ! mysql -u"$DB_USER" -e "USE $DB_NAME; SELECT 1;" >/dev/null 2>&1; then
  echo "[ERRO] Não conectou no MySQL como $DB_USER / DB $DB_NAME. Confira usuário/senha."
  exit 1
fi
echo "[OK] MySQL acessível."

echo "[2/4] Gravando credencial protegida em /root/.my.cnf-l2backup..."
cat > /root/.my.cnf-l2backup <<CNF
[client]
user=$DB_USER
password=$MYSQL_PWD
CNF
chmod 600 /root/.my.cnf-l2backup

echo "[3/4] Instalando script de backup..."
mkdir -p "$BACKUP_DIR"
cat > /usr/local/bin/l2impure-backup.sh <<'BACKUP'
#!/usr/bin/env bash
# Backup do l2jdb — chamado pelo cron a cada 4h. Log: /var/log/l2impure-backup.log
set -uo pipefail
DB_NAME="l2jdb"
BACKUP_DIR="/var/backups/l2impure"
RETENTION_DAYS=7
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/l2jdb-$STAMP.sql.gz"
LOG="/var/log/l2impure-backup.log"

echo "[$(date '+%F %T')] iniciando dump -> $OUT" >> "$LOG"
if mysqldump --defaults-extra-file=/root/.my.cnf-l2backup \
    --single-transaction --quick --routines --triggers \
    "$DB_NAME" | gzip > "$OUT.tmp"; then
  mv "$OUT.tmp" "$OUT"
  SIZE=$(du -h "$OUT" | cut -f1)
  echo "[$(date '+%F %T')] [OK] $OUT ($SIZE)" >> "$LOG"
else
  rm -f "$OUT.tmp"
  echo "[$(date '+%F %T')] [ERRO] mysqldump falhou" >> "$LOG"
  exit 1
fi

# Retenção local: 7 dias
find "$BACKUP_DIR" -name "l2jdb-*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Off-site (opcional): descomente depois de configurar `rclone config`
# com um remote "r2" (Cloudflare R2 — egress zero) ou "gdrive".
# rclone copy "$OUT" r2:l2impure-backups/ --no-traverse >> "$LOG" 2>&1 \
#   && echo "[$(date '+%F %T')] [OK] off-site r2" >> "$LOG" \
#   || echo "[$(date '+%F %T')] [ERRO] off-site falhou (backup local existe)" >> "$LOG"
BACKUP
chmod 755 /usr/local/bin/l2impure-backup.sh

echo "[4/4] Instalando cron (a cada 4h)..."
cat > /etc/cron.d/l2impure-backup <<'CRON'
# Backup l2jdb a cada 4h — instalado por setup-backup-vps.sh
0 */4 * * * root /usr/local/bin/l2impure-backup.sh
CRON
chmod 644 /etc/cron.d/l2impure-backup

echo ""
echo "== Teste imediato (não espera o cron): =="
/usr/local/bin/l2impure-backup.sh
ls -lh "$BACKUP_DIR" | tail -3
echo ""
echo "[OK] Backup instalado. Confira /var/log/l2impure-backup.log amanhã."
echo "[PRÓXIMO PASSO] Off-site: 'rclone config' (remote r2) e descomente a"
echo "                linha rclone em /usr/local/bin/l2impure-backup.sh."
echo "[LEMBRETE] Teste de RESTORE 1x/mês:"
echo "  zcat $BACKUP_DIR/l2jdb-<data>.sql.gz | mysql -u root -p l2jdb_restore_test"
