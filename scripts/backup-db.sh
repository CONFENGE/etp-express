#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"

mkdir -p "$BACKUP_DIR"

echo "🔄 Iniciando backup manual..."
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/etp_express_$DATE.sql"
gzip "$BACKUP_DIR/etp_express_$DATE.sql"

echo "✅ Backup criado: $BACKUP_DIR/etp_express_$DATE.sql.gz"
