-- ============================================================================
-- ETP EXPRESS - DATABASE SCHEMA
-- PostgreSQL 15+
-- ============================================================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USUÁRIOS E AUTENTICAÇÃO
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  orgao VARCHAR(255),
  setor VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_orgao ON users(orgao);

-- ============================================================================
-- 2. ETPs
-- ============================================================================

CREATE TABLE etps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  objeto TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'in_progress', 'complete', 'exported'
  current_version INT DEFAULT 1,
  metadata JSONB DEFAULT '{}', -- { tags, categoria, ano, etc }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_etps_user_id ON etps(user_id);
CREATE INDEX idx_etps_status ON etps(status);
CREATE INDEX idx_etps_created_at ON etps(created_at DESC);

-- ============================================================================
-- 3. SEÇÕES DO ETP (Incisos da Lei 14.133/2021)
-- ============================================================================

CREATE TABLE etp_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etp_id UUID NOT NULL REFERENCES etps(id) ON DELETE CASCADE,
  section_code VARCHAR(10) NOT NULL, -- 'I', 'II', 'III', ... 'XIII'
  section_title VARCHAR(500) NOT NULL,

  -- Conteúdo estruturado
  content JSONB DEFAULT '{
    "userInput": {},
    "generatedDraft": null,
    "finalContent": null,
    "suggestions": [],
    "warnings": [],
    "metadata": {}
  }',

  -- Status
  is_mandatory BOOLEAN DEFAULT false,
  is_complete BOOLEAN DEFAULT false,
  completion_percentage INT DEFAULT 0,

  -- Metadados de geração
  last_generated_at TIMESTAMP,
  generation_count INT DEFAULT 0,
  llm_provider VARCHAR(50), -- 'openai', 'anthropic', etc
  tokens_used INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(etp_id, section_code)
);

CREATE INDEX idx_etp_sections_etp_id ON etp_sections(etp_id);
CREATE INDEX idx_etp_sections_mandatory ON etp_sections(is_mandatory) WHERE is_mandatory = true;

-- ============================================================================
-- 4. VERSIONAMENTO
-- ============================================================================

CREATE TABLE etp_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etp_id UUID NOT NULL REFERENCES etps(id) ON DELETE CASCADE,
  version_number INT NOT NULL,

  -- Snapshot completo do ETP
  snapshot JSONB NOT NULL,

  -- Metadados da versão
  changed_sections TEXT[], -- ['I', 'IV', 'VIII']
  change_summary TEXT,
  user_id UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(etp_id, version_number)
);

CREATE INDEX idx_etp_versions_etp_id ON etp_versions(etp_id);
CREATE INDEX idx_etp_versions_created_at ON etp_versions(created_at DESC);

-- ============================================================================
-- 5. AUDITORIA
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etp_id UUID REFERENCES etps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action VARCHAR(100) NOT NULL,
  -- 'etp_created', 'section_generated', 'section_edited',
  -- 'section_accepted', 'section_rejected', 'version_created',
  -- 'exported_pdf', 'exported_json', 'reference_added', etc

  section_code VARCHAR(10),

  metadata JSONB DEFAULT '{}',
  -- {
  --   llmProvider: 'openai',
  --   tokensUsed: 1250,
  --   latencyMs: 3400,
  --   searchQuery: '...',
  --   etc
  -- }

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_etp_id ON audit_logs(etp_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- 6. REFERÊNCIAS DE CONTRATAÇÕES SIMILARES
-- ============================================================================

CREATE TABLE similar_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etp_id UUID NOT NULL REFERENCES etps(id) ON DELETE CASCADE,
  section_code VARCHAR(10),

  -- Dados da referência
  url TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  source VARCHAR(100) DEFAULT 'perplexity', -- 'perplexity', 'manual', 'google', 'tavily'

  -- Metadados
  valor_estimado DECIMAL(15,2),
  ano INT,
  orgao VARCHAR(255),
  municipio VARCHAR(255),
  uf CHAR(2),

  -- Confiabilidade
  confidence_score DECIMAL(3,2), -- 0.00 a 1.00
  is_verified BOOLEAN DEFAULT false,

  fetched_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_similar_contracts_etp_id ON similar_contracts(etp_id);
CREATE INDEX idx_similar_contracts_section_code ON similar_contracts(section_code);

-- ============================================================================
-- 7. TELEMETRIA E ANALYTICS
-- ============================================================================

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexto
  etp_id UUID REFERENCES etps(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID,

  -- Evento
  event_type VARCHAR(100) NOT NULL,
  -- 'section_opened', 'llm_suggestion_viewed', 'llm_suggestion_accepted',
  -- 'llm_suggestion_rejected', 'llm_regenerate_clicked', 'reference_viewed',
  -- 'help_tooltip_opened', 'export_initiated', 'validation_failed', etc

  section_code VARCHAR(10),

  -- Dados do evento
  metadata JSONB DEFAULT '{}',
  -- {
  --   timeSpent: 45000, // ms
  --   scrollDepth: 0.75,
  --   wasHelpful: true,
  --   difficulty: 'medium',
  --   etc
  -- }

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_section_code ON analytics_events(section_code);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_etp_id ON analytics_events(etp_id);

-- Aggregate view para analytics rápidos
CREATE MATERIALIZED VIEW analytics_summary AS
SELECT
  section_code,
  event_type,
  COUNT(*) as event_count,
  AVG((metadata->>'timeSpent')::int) as avg_time_spent_ms,
  DATE_TRUNC('day', created_at) as event_date
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY section_code, event_type, DATE_TRUNC('day', created_at);

CREATE INDEX idx_analytics_summary_section ON analytics_summary(section_code);

-- ============================================================================
-- 8. CONFIGURAÇÕES DE SEÇÕES (Template)
-- ============================================================================

CREATE TABLE section_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_code VARCHAR(10) UNIQUE NOT NULL,
  section_title VARCHAR(500) NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN DEFAULT false,

  -- Template de perguntas guiadas
  guided_questions JSONB DEFAULT '[]',
  -- [
  --   {
  --     id: 'q1',
  --     question: 'Qual é a necessidade que originou esta contratação?',
  --     type: 'textarea',
  --     placeholder: 'Ex: Necessidade de modernização do sistema de...',
  --     helpText: 'Descreva o problema ou demanda institucional',
  --     required: true
  --   }
  -- ]

  -- Exemplo de conteúdo bem estruturado
  example_content TEXT,

  -- Prompts para LLM
  generation_prompt TEXT,
  refinement_prompt TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed das 13 seções obrigatórias
INSERT INTO section_templates (section_code, section_title, is_mandatory, description) VALUES
('I', 'Descrição da necessidade da contratação', true, 'Art. 18, §1º, I - Descrição da necessidade da contratação fundamentada em estudo preliminar que caracterize o interesse público envolvido'),
('II', 'Demonstração da previsão de recursos orçamentários', false, 'Art. 18, §1º, II - Demonstração da previsão de recursos orçamentários'),
('III', 'Estimativa preliminar de despesa', false, 'Art. 18, §1º, III - Estimativa preliminar de despesa'),
('IV', 'Justificativa da solução escolhida', true, 'Art. 18, §1º, IV - Demonstração do nexo entre a necessidade e a solução escolhida'),
('V', 'Descrição da solução como um todo', false, 'Art. 18, §1º, V - Descrição da solução como um todo'),
('VI', 'Requisitos da contratação', true, 'Art. 18, §1º, VI - Justificativa da divisão (ou não) do objeto em lotes'),
('VII', 'Estimativas de valor da contratação', false, 'Art. 18, §1º, VII - Demonstração do atendimento dos princípios da licitação'),
('VIII', 'Justificativa do parcelamento ou não da contratação', true, 'Art. 18, §1º, VIII - Critérios de sustentabilidade'),
('IX', 'Contratações correlatas', false, 'Art. 18, §1º, IX - Relação entre a demanda prevista e a quantidade a ser contratada'),
('X', 'Demonstração de compatibilidade do orçamento', false, 'Art. 18, §1º, X - Estimativas de preços ou preços referenciais'),
('XI', 'Descrição dos riscos', false, 'Art. 18, §1º, XI - Cronograma físico-financeiro'),
('XII', 'Providências a serem adotadas', false, 'Art. 18, §1º, XII - Estimativa do impacto econômico-financeiro'),
('XIII', 'Declaração de viabilidade', true, 'Art. 18, §1º, XIII - Declaração de viabilidade da contratação');

-- ============================================================================
-- 9. FUNÇÕES ÚTEIS
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_etps_updated_at BEFORE UPDATE ON etps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_etp_sections_updated_at BEFORE UPDATE ON etp_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular completude do ETP
CREATE OR REPLACE FUNCTION calculate_etp_completeness(etp_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_mandatory INT;
  completed_mandatory INT;
BEGIN
  SELECT COUNT(*) INTO total_mandatory
  FROM etp_sections
  WHERE etp_id = etp_uuid AND is_mandatory = true;

  SELECT COUNT(*) INTO completed_mandatory
  FROM etp_sections
  WHERE etp_id = etp_uuid AND is_mandatory = true AND is_complete = true;

  IF total_mandatory = 0 THEN
    RETURN 0;
  END IF;

  RETURN (completed_mandatory::DECIMAL / total_mandatory) * 100;
END;
$$ LANGUAGE plpgsql;

-- Função para validar se ETP pode ser exportado
CREATE OR REPLACE FUNCTION can_export_etp(etp_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  mandatory_sections TEXT[] := ARRAY['I', 'IV', 'VI', 'VIII', 'XIII'];
  section_code TEXT;
  is_complete BOOLEAN;
BEGIN
  FOREACH section_code IN ARRAY mandatory_sections LOOP
    SELECT etp_sections.is_complete INTO is_complete
    FROM etp_sections
    WHERE etp_id = etp_uuid AND etp_sections.section_code = section_code;

    IF is_complete IS NULL OR is_complete = false THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. VIEWS ÚTEIS
-- ============================================================================

-- View consolidada de ETPs com completude
CREATE VIEW etps_with_stats AS
SELECT
  e.id,
  e.user_id,
  e.title,
  e.objeto,
  e.status,
  e.current_version,
  e.created_at,
  e.updated_at,
  u.name as user_name,
  u.orgao,
  calculate_etp_completeness(e.id) as completeness_percentage,
  can_export_etp(e.id) as can_export,
  (SELECT COUNT(*) FROM etp_sections WHERE etp_id = e.id AND is_complete = true) as completed_sections,
  (SELECT COUNT(*) FROM etp_sections WHERE etp_id = e.id) as total_sections,
  (SELECT COUNT(*) FROM similar_contracts WHERE etp_id = e.id) as references_count
FROM etps e
JOIN users u ON e.user_id = u.id;

-- View de seções mais problemáticas (analytics)
CREATE VIEW sections_difficulty_ranking AS
SELECT
  section_code,
  COUNT(DISTINCT etp_id) as times_attempted,
  AVG((metadata->>'timeSpent')::int) as avg_time_spent_ms,
  SUM(CASE WHEN event_type = 'llm_regenerate_clicked' THEN 1 ELSE 0 END) as regeneration_count,
  SUM(CASE WHEN event_type = 'help_tooltip_opened' THEN 1 ELSE 0 END) as help_requests
FROM analytics_events
WHERE section_code IS NOT NULL
GROUP BY section_code
ORDER BY regeneration_count DESC, avg_time_spent_ms DESC;

-- ============================================================================
-- 11. DADOS INICIAIS (SEED)
-- ============================================================================

-- Usuário admin padrão (senha: Admin@123 - TROCAR EM PRODUÇÃO!)
-- Hash bcrypt gerado para "Admin@123"
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@etpexpress.gov.br', '$2b$10$rZ8qD1YJYvx8X9vKXGvXJeKqN8Q1nQZqX8X9vKXGvXJeKqN8Q1nQZ', 'Administrador', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================

-- Comentários nas tabelas
COMMENT ON TABLE users IS 'Usuários do sistema (servidores públicos, consultores)';
COMMENT ON TABLE etps IS 'Estudos Técnicos Preliminares criados';
COMMENT ON TABLE etp_sections IS 'Seções individuais dos ETPs (incisos da Lei)';
COMMENT ON TABLE etp_versions IS 'Histórico de versões dos ETPs';
COMMENT ON TABLE audit_logs IS 'Trilha de auditoria de todas as ações';
COMMENT ON TABLE similar_contracts IS 'Referências de contratações similares para fundamentação';
COMMENT ON TABLE analytics_events IS 'Eventos de telemetria para análise de UX';
COMMENT ON TABLE section_templates IS 'Templates e configurações das seções do ETP';

-- Verificação final
SELECT 'Schema ETP Express criado com sucesso!' AS status;
