#!/bin/bash
set -e

# Validações de segurança
if [ -z "$TEST_DATABASE_URL" ]; then
  echo "❌ TEST_DATABASE_URL não configurado"
  exit 1
fi

if [[ "$TEST_DATABASE_URL" == "$DATABASE_URL" ]]; then
  echo "❌ ERRO: TEST_DATABASE_URL aponta para PRODUÇÃO!"
  exit 1
fi

# 1. Gerar backup do database de produção
echo "🔄 Step 1: Gerando backup de produção..."
./scripts/backup-db.sh
LATEST_BACKUP=$(ls -t backups/*.sql.gz | head -1)
echo "📁 Backup: $LATEST_BACKUP"

# 2. Restaurar em database de teste
echo "🔄 Step 2: Restaurando em database de teste..."
gunzip -c "$LATEST_BACKUP" > /tmp/test_restore.sql
psql "$TEST_DATABASE_URL" < /tmp/test_restore.sql
rm /tmp/test_restore.sql

# 3. Validar integridade
echo "🔄 Step 3: Validando integridade de dados..."

# 3.1 Contar registros
PROD_ETPS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM etps;")
TEST_ETPS=$(psql "$TEST_DATABASE_URL" -t -c "SELECT COUNT(*) FROM etps;")

PROD_SECTIONS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM sections;")
TEST_SECTIONS=$(psql "$TEST_DATABASE_URL" -t -c "SELECT COUNT(*) FROM sections;")

PROD_USERS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;")
TEST_USERS=$(psql "$TEST_DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;")

# 3.2 Verificar checksum de dados críticos
PROD_CHECKSUM=$(psql "$DATABASE_URL" -t -c "SELECT md5(array_agg(id::text ORDER BY id)::text) FROM etps;")
TEST_CHECKSUM=$(psql "$TEST_DATABASE_URL" -t -c "SELECT md5(array_agg(id::text ORDER BY id)::text) FROM etps;")

# 4. Comparar resultados
echo ""
echo "📊 Resultados da Validação:"
echo "============================"
echo "ETPs:     Prod=$PROD_ETPS | Test=$TEST_ETPS"
echo "Sections: Prod=$PROD_SECTIONS | Test=$TEST_SECTIONS"
echo "Users:    Prod=$PROD_USERS | Test=$TEST_USERS"
echo "Checksum ETPs: Prod=$PROD_CHECKSUM | Test=$TEST_CHECKSUM"
echo ""

# 5. Validar sucesso
if [ "$PROD_ETPS" -eq "$TEST_ETPS" ] && [ "$PROD_CHECKSUM" == "$TEST_CHECKSUM" ]; then
  echo "✅ RESTORE VALIDADO COM SUCESSO"
  echo "✅ Integridade: 100%"
  exit 0
else
  echo "❌ FALHA NA VALIDAÇÃO"
  echo "❌ Dados restaurados não conferem com produção"
  exit 1
fi
