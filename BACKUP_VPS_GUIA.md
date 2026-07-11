# Backup da VPS L2J — guia de 5 minutos

> CHECKLIST_JOS item 3 — risco FATAL. Perda de char = rage-quit coletivo.
> O site promete "backup a cada 4h" em /sobre. Este guia torna isso real.
> O Fable não tem SSH na VPS (76.13.170.153) — só você. Por isso o
> script está pronto e o seu trabalho é colar 2 comandos.

## Instalação (2 comandos, ~1 minuto)

Do WSL/notebook, na raiz do repo `l2impure-arq`:

```bash
scp scripts/setup-backup-vps.sh root@76.13.170.153:/root/
ssh root@76.13.170.153 "MYSQL_PWD='SENHA_DO_MYSQL_AQUI' bash /root/setup-backup-vps.sh"
```

O script é idempotente (rodar 2x não duplica nada) e já dispara um
backup de teste no final — a saída mostra o arquivo `.sql.gz` criado.

## O que fica instalado

| Item | Onde |
|---|---|
| Script de dump | `/usr/local/bin/l2impure-backup.sh` |
| Cron a cada 4h | `/etc/cron.d/l2impure-backup` (00h, 04h, 08h, 12h, 16h, 20h) |
| Backups | `/var/backups/l2impure/l2jdb-<data>.sql.gz` (retenção 7 dias) |
| Credencial | `/root/.my.cnf-l2backup` (chmod 600) |
| Log | `/var/log/l2impure-backup.log` |

Dump com `--single-transaction --quick`: NÃO trava as tabelas, pode
rodar com o servidor cheio de gente.

## Off-site (fase 2 — fazer até 25/ago, antes do beta)

Backup só na própria VPS não sobrevive a disco morto/provider sumindo.
Melhor destino: **Cloudflare R2** (você já tem a zona; egress grátis).

```bash
# Na VPS:
apt install -y rclone       # ou: curl https://rclone.org/install.sh | bash
rclone config               # new remote → nome "r2" → tipo "s3" → provider "Cloudflare"
                            # (crie o bucket "l2impure-backups" + API token no dash do R2)
# Depois descomente a linha rclone em /usr/local/bin/l2impure-backup.sh
```

Alternativa zero-conta: `scp` pro seu desktop GPU (F: tem 570GB livres) —
mas R2 é mais confiável que máquina doméstica ligada.

## Teste de restore (1x/mês — backup não testado não é backup)

```bash
ssh root@76.13.170.153
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS l2jdb_restore_test"
zcat /var/backups/l2impure/l2jdb-<mais-recente>.sql.gz | mysql -u root -p l2jdb_restore_test
mysql -u root -p -e "SELECT COUNT(*) AS chars FROM l2jdb_restore_test.characters"
mysql -u root -p -e "DROP DATABASE l2jdb_restore_test"
```

Se o COUNT bate com a realidade, o backup é bom.

## Verificação rápida (rodar amanhã)

```bash
ssh root@76.13.170.153 "ls -lh /var/backups/l2impure/ && tail -5 /var/log/l2impure-backup.log"
```

Esperado: 6 arquivos por dia, tamanhos parecidos, `[OK]` no log.
