#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador de Relatórios de Auditoria
Cria relatórios markdown a partir dos resultados da auditoria
"""

import json
import sys
from collections import defaultdict

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


def load_results():
    """Carrega resultados da auditoria"""
    with open('audit_results.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def generate_compliance_report(results: dict):
    """Gera relatório principal de conformidade"""
    content = []
    content.append("# 📊 ETP EXPRESS - RELATÓRIO DE CONFORMIDADE DO BACKLOG\n")
    content.append(f"**Data da Auditoria:** {results['metadata']['audit_date']}\n")
    content.append(f"**Issues Analisadas:** {results['metadata']['total_issues']}\n")
    content.append(f"**Range:** {results['metadata']['issue_range']}\n\n")

    # Executive Summary
    content.append("## 🎯 EXECUTIVE SUMMARY\n\n")
    summary = results['summary']
    content.append(f"- **Score Médio Geral:** {summary['avg_score']}%\n")
    content.append(f"- **Issues 100% Conformes:** {summary['compliant_100']} ({round(summary['compliant_100']/results['metadata']['total_issues']*100, 1)}%)\n")
    content.append(f"- **Issues ≥80% Conformes:** {summary['compliant_80_plus']} ({round(summary['compliant_80_plus']/results['metadata']['total_issues']*100, 1)}%)\n")
    content.append(f"- **Issues <80% (Não Conformes):** {summary['non_compliant']} ({round(summary['non_compliant']/results['metadata']['total_issues']*100, 1)}%)\n")
    content.append(f"- **Duplicatas Detectadas:** {len(results['duplicates'])}\n\n")

    # Análise de severidade
    content.append("### 🚨 Status de Conformidade\n\n")
    if summary['avg_score'] < 60:
        content.append("**🔴 CRÍTICO** - Score médio abaixo de 60%. Backlog requer intervenção imediata.\n\n")
    elif summary['avg_score'] < 80:
        content.append("**🟡 ATENÇÃO** - Score médio entre 60-80%. Melhorias significativas necessárias.\n\n")
    else:
        content.append("**🟢 BOM** - Score médio acima de 80%. Manutenção contínua recomendada.\n\n")

    # Top 10 Issues Mais Conformes
    content.append("## ✅ TOP 10 ISSUES MAIS CONFORMES\n\n")
    sorted_issues = sorted(results['issues'], key=lambda x: x['compliance_score'], reverse=True)[:10]
    content.append("| # | Título | Score | Milestone | Status |\n")
    content.append("|---|--------|-------|-----------|--------|\n")
    for issue in sorted_issues:
        status = "✅ Pronta" if issue['compliance_score'] >= 80 else "⚠️ Revisar"
        milestone = issue['milestone'] or 'Sem milestone'
        content.append(f"| #{issue['number']} | {issue['title'][:50]}... | {issue['compliance_score']}% | {milestone} | {status} |\n")
    content.append("\n")

    # Top 10 Issues Menos Conformes
    content.append("## ⚠️ TOP 10 ISSUES MENOS CONFORMES (PRIORIDADE DE CORREÇÃO)\n\n")
    bottom_issues = sorted(results['issues'], key=lambda x: x['compliance_score'])[:10]
    content.append("| # | Título | Score | Problemas Principais |\n")
    content.append("|---|--------|-------|---------------------|\n")
    for issue in bottom_issues:
        problems = []
        if issue['scores']['atomicity']['score'] < 60:
            problems.append("Atomicidade")
        if issue['scores']['completeness']['score'] < 60:
            problems.append("Completude")
        if issue['scores']['executability']['score'] < 60:
            problems.append("Executabilidade")
        problem_str = ", ".join(problems) if problems else "Múltiplos"
        content.append(f"| #{issue['number']} | {issue['title'][:50]}... | {issue['compliance_score']}% | {problem_str} |\n")
    content.append("\n")

    # Análise por Critério
    content.append("## 📈 ANÁLISE POR CRITÉRIO\n\n")

    criteria_avg = defaultdict(float)
    for issue in results['issues']:
        for criterion, data in issue['scores'].items():
            criteria_avg[criterion] += data['score']

    for criterion in criteria_avg:
        criteria_avg[criterion] /= len(results['issues'])

    content.append("| Critério | Score Médio | Status |\n")
    content.append("|----------|-------------|--------|\n")
    criterion_names = {
        'atomicity': '1. Atomicidade (2-8h)',
        'prioritization': '2. Priorização',
        'completeness': '3. Completude',
        'executability': '4. Executabilidade',
        'traceability': '5. Rastreabilidade'
    }
    for criterion, avg_score in sorted(criteria_avg.items(), key=lambda x: x[1]):
        status = "🟢 Bom" if avg_score >= 80 else "🟡 Regular" if avg_score >= 60 else "🔴 Crítico"
        content.append(f"| {criterion_names[criterion]} | {round(avg_score, 1)}% | {status} |\n")
    content.append("\n")

    # Análise por Milestone
    content.append("## 🎯 ANÁLISE POR MILESTONE\n\n")
    milestone_stats = defaultdict(lambda: {'count': 0, 'total_score': 0, 'issues': []})

    for issue in results['issues']:
        m = issue['milestone'] or 'Sem Milestone'
        milestone_stats[m]['count'] += 1
        milestone_stats[m]['total_score'] += issue['compliance_score']
        milestone_stats[m]['issues'].append(issue['number'])

    content.append("| Milestone | Issues | Score Médio | Horas Estimadas | Status |\n")
    content.append("|-----------|--------|-------------|-----------------|--------|\n")

    for milestone, stats in sorted(milestone_stats.items()):
        avg_score = stats['total_score'] / stats['count']

        # Calcular horas totais
        total_hours = 0
        for issue in results['issues']:
            if (issue['milestone'] or 'Sem Milestone') == milestone:
                total_hours += issue['scores']['atomicity']['estimated_hours']

        status = "✅" if avg_score >= 80 else "⚠️" if avg_score >= 60 else "🔴"
        milestone_analysis = results['milestone_analysis'].get(milestone, {})
        content.append(f"| {milestone} | {stats['count']} | {round(avg_score, 1)}% | {round(total_hours, 1)}h | {status} |\n")
    content.append("\n")

    # Salvar relatório
    with open('COMPLIANCE_REPORT.md', 'w', encoding='utf-8') as f:
        f.write(''.join(content))

    print("✅ COMPLIANCE_REPORT.md gerado")


def generate_recommendations(results: dict):
    """Gera relatório de recomendações"""
    content = []
    content.append("# 🔧 RECOMENDAÇÕES DE CORREÇÃO DO BACKLOG\n\n")
    content.append("Este documento contém ações específicas para elevar a conformidade do backlog.\n\n")

    # 1. Duplicatas
    content.append("## 1️⃣ DUPLICATAS DETECTADAS\n\n")
    content.append(f"**Total:** {len(results['duplicates'])} pares de issues similares\n\n")

    if results['duplicates']:
        # Agrupar duplicatas por similaridade
        high_similarity = [d for d in results['duplicates'] if d['similarity'] >= 0.85]
        medium_similarity = [d for d in results['duplicates'] if 0.75 <= d['similarity'] < 0.85]

        if high_similarity:
            content.append("### ⚠️ Alta Prioridade (≥85% similaridade)\n\n")
            content.append("Estas são provavelmente duplicatas verdadeiras:\n\n")
            content.append("| Issue 1 | Issue 2 | Similaridade | Ação Recomendada |\n")
            content.append("|---------|---------|--------------|------------------|\n")

            for dup in high_similarity[:10]:  # Top 10
                # Determinar qual manter baseado em score
                issue1 = next(i for i in results['issues'] if i['number'] == dup['issue1'])
                issue2 = next(i for i in results['issues'] if i['number'] == dup['issue2'])

                if issue1['compliance_score'] >= issue2['compliance_score']:
                    action = f"Manter #{dup['issue1']}, fechar #{dup['issue2']}"
                else:
                    action = f"Manter #{dup['issue2']}, fechar #{dup['issue1']}"

                content.append(f"| #{dup['issue1']} | #{dup['issue2']} | {dup['similarity']*100:.0f}% | {action} |\n")
            content.append("\n")

        if medium_similarity:
            content.append("### 📋 Média Prioridade (75-85% similaridade)\n\n")
            content.append("Revisar manualmente - podem ser relacionadas mas não duplicatas:\n\n")
            for dup in medium_similarity[:5]:
                content.append(f"- #{dup['issue1']} ↔ #{dup['issue2']} ({dup['similarity']*100:.0f}% similar)\n")
            content.append("\n")

    # 2. Issues sem Milestone
    content.append("## 2️⃣ ISSUES SEM MILESTONE\n\n")
    no_milestone = [i for i in results['issues'] if not i['milestone']]
    content.append(f"**Total:** {len(no_milestone)} issues\n\n")

    if no_milestone:
        content.append("**Ação:** Atribuir milestone apropriado conforme ROADMAP.md\n\n")
        content.append("| Issue | Título | Sugestão |\n")
        content.append("|-------|--------|----------|\n")
        for issue in no_milestone[:10]:
            # Sugerir milestone baseado em labels
            suggestion = "M1 - Foundation" if any('test' in l for l in issue['labels']) else "Definir manualmente"
            content.append(f"| #{issue['number']} | {issue['title'][:40]}... | {suggestion} |\n")
        content.append("\n")

    # 3. Issues sem Estimativas Explícitas
    content.append("## 3️⃣ ISSUES SEM ESTIMATIVA EXPLÍCITA\n\n")
    inferred_estimates = [i for i in results['issues']
                         if i['scores']['atomicity']['estimation_method'] == 'inferred']
    content.append(f"**Total:** {len(inferred_estimates)} issues\n\n")
    content.append("**Ação:** Adicionar estimativa explícita no corpo da issue (formato: `Estimativa: Xh`)\n\n")
    content.append("| Issue | Estimativa Inferida | Recomendação |\n")
    content.append("|-------|---------------------|---------------|\n")

    for issue in inferred_estimates[:15]:
        hours = issue['scores']['atomicity']['estimated_hours']
        if hours > 8:
            rec = f"Decompor em issues menores ({hours:.1f}h > 8h)"
        else:
            rec = f"Adicionar `Estimativa: {hours:.1f}h` ao corpo"
        content.append(f"| #{issue['number']} | {hours:.1f}h | {rec} |\n")
    content.append("\n")

    # 4. Issues sem Detalhes Técnicos
    content.append("## 4️⃣ ISSUES SEM DETALHES TÉCNICOS SUFICIENTES\n\n")
    low_executability = [i for i in results['issues']
                        if i['scores']['executability']['score'] < 60]
    content.append(f"**Total:** {len(low_executability)} issues\n\n")
    content.append("**Ação:** Adicionar:\n")
    content.append("- Paths de arquivos a modificar (ex: `src/services/auth.ts`)\n")
    content.append("- Exemplos de código\n")
    content.append("- Steps de implementação\n\n")
    content.append("| Issue | Score Exec | O que falta |\n")
    content.append("|-------|------------|-------------|\n")

    for issue in low_executability[:15]:
        exec_data = issue['scores']['executability']
        missing = []
        if not exec_data['has_file_paths']:
            missing.append("file paths")
        if not exec_data['has_code_examples']:
            missing.append("exemplos código")
        if not exec_data['has_step_by_step']:
            missing.append("steps")

        content.append(f"| #{issue['number']} | {exec_data['score']}% | {', '.join(missing)} |\n")
    content.append("\n")

    # 5. Issues sem Dependências Mapeadas
    content.append("## 5️⃣ ISSUES SEM DEPENDÊNCIAS MAPEADAS\n\n")
    no_deps = [i for i in results['issues']
              if not i['scores']['traceability']['has_dependencies_mapped']]
    content.append(f"**Total:** {len(no_deps)} issues\n\n")
    content.append("**Ação:** Adicionar seção de dependências:\n")
    content.append("```\n")
    content.append("## Dependências\n")
    content.append("**Bloqueada por:** #X, #Y\n")
    content.append("**Bloqueia:** #Z\n")
    content.append("```\n\n")

    # 6. Roadmap para Produção
    content.append("## 6️⃣ ROADMAP PARA PRODUÇÃO NA RAILWAY\n\n")
    content.append("### Critical Path Identificado:\n\n")
    content.append("```mermaid\n")
    content.append("graph TD\n")
    content.append("    M1[M1: Foundation - Testes]\n")
    content.append("    M2[M2: CI/CD Pipeline]\n")
    content.append("    M3[M3: Quality & Security]\n")
    content.append("    M4[M4: Refactoring]\n")
    content.append("    M5[M5: E2E Testing]\n")
    content.append("    PROD[🚀 Deploy Railway]\n")
    content.append("    \n")
    content.append("    M1 --> M2\n")
    content.append("    M2 --> M3\n")
    content.append("    M1 --> M4\n")
    content.append("    M3 --> M5\n")
    content.append("    M4 --> M5\n")
    content.append("    M5 --> PROD\n")
    content.append("```\n\n")

    content.append("### Issues Bloqueadoras para Produção:\n\n")
    # Identificar issues de deploy
    deploy_issues = [i for i in results['issues'] if 'railway' in i['title'].lower() or 'deploy' in i['title'].lower()]
    if deploy_issues:
        for issue in deploy_issues:
            content.append(f"- **#{issue['number']}**: {issue['title']} (Score: {issue['compliance_score']}%)\n")
    else:
        content.append("⚠️ **CRÍTICO:** Nenhuma issue explícita sobre deploy na Railway encontrada!\n")
        content.append("\n**Recomendação:** Criar issue detalhada:\n")
        content.append("- Configurar Railway project\n")
        content.append("- Configurar variáveis de ambiente\n")
        content.append("- Setup banco de dados produção\n")
        content.append("- Configurar domínio\n")
        content.append("- Healthcheck endpoints\n")
    content.append("\n")

    # 7. Ações Prioritárias
    content.append("## 🎯 PLANO DE AÇÃO PRIORITÁRIO\n\n")
    content.append("### Fase 1: Limpeza (Esta Semana)\n")
    content.append(f"1. ✅ Resolver {len([d for d in results['duplicates'] if d['similarity'] >= 0.85])} duplicatas de alta confiança\n")
    content.append(f"2. ✅ Atribuir milestones às {len(no_milestone)} issues órfãs\n")
    content.append(f"3. ✅ Adicionar estimativas explícitas às top 20 issues\n\n")

    content.append("### Fase 2: Enriquecimento (Próxima Semana)\n")
    content.append(f"4. 📝 Adicionar detalhes técnicos às {len(low_executability)} issues não executáveis\n")
    content.append("5. 📝 Mapear dependências críticas do M1\n")
    content.append("6. 📝 Criar issue de deploy Railway se não existir\n\n")

    content.append("### Fase 3: Validação (Antes do M1)\n")
    content.append("7. ✔️ Re-auditar issues do M1\n")
    content.append("8. ✔️ Garantir score médio ≥80% para issues M1\n")
    content.append("9. ✔️ Documentar critical path completo\n\n")

    # Salvar relatório
    with open('RECOMMENDATIONS.md', 'w', encoding='utf-8') as f:
        f.write(''.join(content))

    print("✅ RECOMMENDATIONS.md gerado")


def generate_dashboard(results: dict):
    """Gera dashboard visual"""
    content = []
    content.append("# 📊 DASHBOARD DE CONFORMIDADE\n\n")

    # Scorecard geral
    avg_score = results['summary']['avg_score']
    content.append("## 🎯 SCORECARD GERAL\n\n")
    content.append("```\n")
    content.append("┌─────────────────────────────────────────┐\n")
    content.append("│     CONFORMIDADE DO BACKLOG ETP         │\n")
    content.append("├─────────────────────────────────────────┤\n")
    content.append(f"│  Score Geral:        {avg_score:5.1f}%       │\n")

    bar_length = int(avg_score / 2.5)
    bar = "█" * bar_length + "░" * (40 - bar_length)
    content.append(f"│  [{bar}]  │\n")
    content.append("│                                         │\n")
    content.append(f"│  ✅ Conformes (≥80%):  {results['summary']['compliant_80_plus']:3d} ({round(results['summary']['compliant_80_plus']/results['metadata']['total_issues']*100):3d}%)   │\n")
    content.append(f"│  ⚠️  Não Conformes:    {results['summary']['non_compliant']:3d} ({round(results['summary']['non_compliant']/results['metadata']['total_issues']*100):3d}%)   │\n")
    content.append(f"│  🔄 Duplicatas:        {len(results['duplicates']):3d}             │\n")
    content.append("└─────────────────────────────────────────┘\n")
    content.append("```\n\n")

    # Breakdown por critério
    content.append("## 📈 BREAKDOWN POR CRITÉRIO\n\n")

    criteria_avg = defaultdict(float)
    for issue in results['issues']:
        for criterion, data in issue['scores'].items():
            criteria_avg[criterion] += data['score']

    for criterion in criteria_avg:
        criteria_avg[criterion] /= len(results['issues'])

    content.append("| Critério | Score | Visualização |\n")
    content.append("|----------|-------|-------------|\n")

    criterion_names = {
        'atomicity': 'Atomicidade',
        'prioritization': 'Priorização',
        'completeness': 'Completude',
        'executability': 'Executabilidade',
        'traceability': 'Rastreabilidade'
    }

    for criterion, name in criterion_names.items():
        score = criteria_avg[criterion]
        bar_len = int(score / 5)
        bar = "█" * bar_len + "░" * (20 - bar_len)
        content.append(f"| {name} | {score:.1f}% | {bar} |\n")
    content.append("\n")

    # Distribuição de scores
    content.append("## 📊 DISTRIBUIÇÃO DE SCORES\n\n")
    content.append("```\n")

    # Calcular distribuição
    bins = {'0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0}
    for issue in results['issues']:
        score = issue['compliance_score']
        if score < 20:
            bins['0-20'] += 1
        elif score < 40:
            bins['20-40'] += 1
        elif score < 60:
            bins['40-60'] += 1
        elif score < 80:
            bins['60-80'] += 1
        else:
            bins['80-100'] += 1

    max_count = max(bins.values())
    scale = 40 / max_count if max_count > 0 else 1

    for range_label, count in bins.items():
        bar_len = int(count * scale)
        bar = "█" * bar_len
        content.append(f"{range_label:>8}% │{bar} {count}\n")

    content.append("```\n\n")

    # Status por milestone
    content.append("## 🎯 STATUS POR MILESTONE\n\n")

    milestone_stats = defaultdict(lambda: {'count': 0, 'total_score': 0})
    for issue in results['issues']:
        m = issue['milestone'] or 'Sem Milestone'
        milestone_stats[m]['count'] += 1
        milestone_stats[m]['total_score'] += issue['compliance_score']

    content.append("| Milestone | Issues | Score | Status |\n")
    content.append("|-----------|--------|-------|--------|\n")

    for milestone in sorted(milestone_stats.keys()):
        stats = milestone_stats[milestone]
        avg_score = stats['total_score'] / stats['count']

        if avg_score >= 80:
            status = "🟢 Excelente"
        elif avg_score >= 60:
            status = "🟡 Atenção"
        else:
            status = "🔴 Crítico"

        content.append(f"| {milestone} | {stats['count']} | {avg_score:.1f}% | {status} |\n")

    content.append("\n")

    # Salvar dashboard
    with open('DASHBOARD.md', 'w', encoding='utf-8') as f:
        f.write(''.join(content))

    print("✅ DASHBOARD.md gerado")


def generate_dependency_matrix(results: dict):
    """Gera matriz de dependências"""
    content = []
    content.append("# 🔗 MATRIZ DE DEPENDÊNCIAS\n\n")

    deps = results['dependencies']

    if not deps:
        content.append("⚠️ Nenhuma dependência explícita encontrada nas issues.\n")
    else:
        content.append("## Grafo de Dependências\n\n")
        content.append("```mermaid\n")
        content.append("graph TD\n")

        # Adicionar nós e edges
        for issue_num, dep_data in list(deps.items())[:20]:  # Limitar para legibilidade
            if dep_data['blocked_by']:
                for blocker in dep_data['blocked_by']:
                    content.append(f"    I{blocker}[#{blocker}] --> I{issue_num}[#{issue_num}]\n")

        content.append("```\n\n")

        content.append("## Issues Bloqueadoras (Critical Path)\n\n")
        content.append("Issues que bloqueiam outras:\n\n")

        blocking_count = defaultdict(int)
        for issue_num, dep_data in deps.items():
            for blocker in dep_data['blocked_by']:
                blocking_count[blocker] += 1

        if blocking_count:
            content.append("| Issue | Bloqueia N Issues | Prioridade |\n")
            content.append("|-------|-------------------|------------|\n")
            for issue, count in sorted(blocking_count.items(), key=lambda x: -x[1])[:10]:
                priority = "🔥 CRÍTICA" if count >= 5 else "⚠️ Alta" if count >= 3 else "📌 Média"
                content.append(f"| #{issue} | {count} | {priority} |\n")
        content.append("\n")

    # Salvar matriz
    with open('DEPENDENCY_MATRIX.md', 'w', encoding='utf-8') as f:
        f.write(''.join(content))

    print("✅ DEPENDENCY_MATRIX.md gerado")


def main():
    print("=" * 60)
    print("GERANDO RELATÓRIOS DE AUDITORIA")
    print("=" * 60)

    results = load_results()

    generate_compliance_report(results)
    generate_recommendations(results)
    generate_dashboard(results)
    generate_dependency_matrix(results)

    print("\n" + "=" * 60)
    print("✅ TODOS OS RELATÓRIOS GERADOS")
    print("=" * 60)
    print("\nArquivos criados:")
    print("  - COMPLIANCE_REPORT.md")
    print("  - RECOMMENDATIONS.md")
    print("  - DASHBOARD.md")
    print("  - DEPENDENCY_MATRIX.md")
    print("  - audit_results.json")


if __name__ == '__main__':
    main()
