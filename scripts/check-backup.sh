#!/bin/bash
set -e

BACKUP_DIR="backups"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Diretório de backups não existe"
  exit 1
fi

LATEST=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
  echo "❌ Nenhum backup encontrado"
  exit 1
fi

AGE=$(($(date +%s) - $(stat -c %Y "$LATEST" 2>/dev/null || stat -f %m "$LATEST")))

if [ $AGE -gt 86400 ]; then
  echo "⚠️  Último backup tem mais de 24h!"
  echo "📁 Arquivo: $LATEST"
  exit 1
fi

echo "✅ Backup recente encontrado"
echo "📁 Arquivo: $LATEST"
echo "🕒 Idade: $((AGE / 3600)) horas"
