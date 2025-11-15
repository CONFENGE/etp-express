#!/bin/bash
set -e

BACKUP_DIR="backups"

# 1. Verificar existência de backup recente
LATEST=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
  echo "❌ FALHA: Nenhum backup encontrado"
  exit 1
fi

# 2. Verificar idade do backup
AGE=$(($(date +%s) - $(stat -c %Y "$LATEST" 2>/dev/null || stat -f %m "$LATEST")))
AGE_HOURS=$((AGE / 3600))

if [ $AGE -gt 86400 ]; then
  echo "⚠️  ALERTA: Último backup tem $AGE_HOURS horas (> 24h)"
  exit 1
fi

# 3. Verificar integridade do arquivo
echo "🔄 Validando integridade do arquivo..."
gunzip -t "$LATEST"

if [ $? -eq 0 ]; then
  echo "✅ BACKUP VÁLIDO"
  echo "📁 Arquivo: $LATEST"
  echo "🕒 Idade: $AGE_HOURS horas"
  echo "📦 Tamanho: $(du -h "$LATEST" | cut -f1)"
  exit 0
else
  echo "❌ FALHA: Backup corrompido"
  exit 1
fi
