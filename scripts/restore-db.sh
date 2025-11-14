#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "❌ Uso: ./restore-db.sh <backup-file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"

echo "⚠️  ATENÇÃO: Este comando irá SOBRESCREVER o database atual!"
read -p "Confirmar restore de $BACKUP_FILE? (yes/NO): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Restore cancelado"
  exit 1
fi

echo "🔄 Descompactando backup..."
gunzip -c "$BACKUP_FILE" > /tmp/restore_temp.sql

echo "🔄 Restaurando database..."
psql "$DATABASE_URL" < /tmp/restore_temp.sql

rm /tmp/restore_temp.sql

echo "✅ Restore concluído com sucesso"
