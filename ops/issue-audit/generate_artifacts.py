#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate audit artifacts from analysis results
Creates Markdown reports and CSV files
"""

import json
import csv
import sys
import io
from datetime import datetime

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def load_results():
    """Load audit results"""
    with open('ops/issue-audit/audit_results.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_issues():
    """Load issues data"""
    import subprocess
    cmd = [
        'gh', 'issue', 'list',
        '--limit', '1000',
        '--state', 'all',
        '--json', 'number,title,body,state,labels,assignees,milestone,createdAt,updatedAt,url'
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    return json.loads(result.stdout) if result.stdout else []

def generate_backlog_order_md(results, issues):
    """Generate BACKLOG_ORDER.md"""
    content = "# Backlog Order - Priorização Objetiva\n\n"
    content += f"**Data da auditoria:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    content += "## Metodologia\n\n"
    content += "- **WSJF:** (User Value + Business Value + Risk Reduction + Time Criticality) / Size\n"
    content += "- **RICE:** (Reach × Impact × Confidence) / Effort\n"
    content += "- **Priority:** P0 (critical) → P3 (nice-to-have)\n"
    content += "- **Risk:** Based on Severity × Probability\n\n"
    content += "## Ordem de Execução\n\n"

    # Create table
    content += "| # | Issue | Type | Area | Priority | WSJF | RICE | Risk | Effort | Dependencies | Status | Motivo |\n"
    content += "|---|-------|------|------|----------|------|------|------|--------|--------------|--------|--------|\n"

    # Sort by combined score
    wsjf_scores = results.get('wsjf', {})
    rice_scores = results.get('rice', {})
    risk_scores = results.get('risks', {})
    deps = results.get('dependencies', {})

    issue_scores = []
    for issue in issues:
        if issue['state'] != 'OPEN':
            continue

        num = str(issue['number'])
        wsjf = wsjf_scores.get(num, {}).get('wsjf', 0)
        rice = rice_scores.get(num, {}).get('rice', 0)
        combined = (wsjf + rice) / 2

        issue_scores.append({
            'number': issue['number'],
            'title': issue['title'],
            'wsjf': wsjf,
            'rice': rice,
            'combined': combined,
            'risk': risk_scores.get(num, {}).get('level', 'low'),
            'effort': wsjf_scores.get(num, {}).get('size', 8),
            'deps': deps.get(num, {})
        })

    # Sort by combined score (descending)
    issue_scores.sort(key=lambda x: x['combined'], reverse=True)

    for idx, item in enumerate(issue_scores, 1):
        # Extract type and area from title
        title = item['title']
        import re
        type_match = re.match(r'^(feat|fix|docs|test|refactor|chore)(\([^)]+\))?:', title)
        issue_type = type_match.group(1) if type_match else 'unknown'
        area_match = re.match(r'^[^(]+\(([^)]+)\):', title)
        area = area_match.group(1) if area_match else 'unknown'

        # Determine priority
        if item['risk'] == 'high' and any(word in title.lower() for word in ['security', 'critical', 'blocker']):
            priority = 'P0'
        elif item['combined'] > 5:
            priority = 'P1'
        elif item['combined'] > 2:
            priority = 'P2'
        else:
            priority = 'P3'

        # Dependencies
        blocked_by = item['deps'].get('blocked_by', [])
        blocks = item['deps'].get('blocks', [])
        dep_str = ''
        if blocked_by:
            dep_str = f"Blocked by #{',#'.join(map(str, blocked_by))}"
        if blocks:
            if dep_str:
                dep_str += '; '
            dep_str += f"Blocks #{',#'.join(map(str, blocks))}"

        # Reason
        reasons = []
        if item['wsjf'] > 3:
            reasons.append('Alto WSJF')
        if item['risk'] == 'high':
            reasons.append('Alto risco')
        if priority == 'P0':
            reasons.append('Bloqueador crítico')
        if not reasons:
            reasons.append('Prioridade normal')
        reason = ', '.join(reasons)

        content += f"| {idx} | [#{item['number']}](https://github.com/tjsasakifln/etp-express/issues/{item['number']}) | {issue_type} | {area} | {priority} | {item['wsjf']:.2f} | {item['rice']:.2f} | {item['risk']} | {item['effort']}h | {dep_str} | OPEN | {reason} |\n"

    return content

def generate_issue_fixups_md(results, issues):
    """Generate ISSUE_FIXUPS.md"""
    content = "# Issue Fixups - Correções Propostas\n\n"
    content += f"**Data da auditoria:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    content += "Este documento contém sugestões de correção para issues que não atendem aos padrões de qualidade.\n\n"

    quality_report = results.get('quality_report', [])

    # Group by quality score
    needs_fix = [q for q in quality_report if q['score'] < 70]

    content += f"## Resumo\n\n"
    content += f"- **Total de issues abertas:** {len(quality_report)}\n"
    content += f"- **Issues que precisam de correção:** {len(needs_fix)}\n"
    content += f"- **Porcentagem adequada:** {((len(quality_report) - len(needs_fix)) / len(quality_report) * 100):.1f}%\n\n"

    content += "---\n\n"

    for item in needs_fix:
        issue_num = item['issue_number']
        issue = next((i for i in issues if i['number'] == issue_num), None)
        if not issue:
            continue

        content += f"## Issue #{issue_num}: {item['title']}\n\n"
        content += f"**URL:** {item['url']}\n\n"
        content += f"**Quality Score:** {item['score']}/100\n\n"

        # Current state
        content += "### Estado Atual\n\n"
        content += f"**Título:** {item['title']}\n\n"
        labels = issue.get('labels', [])
        label_names = [l['name'] for l in labels]
        content += f"**Labels:** {', '.join(label_names) if label_names else 'Nenhuma'}\n\n"

        # Issues found
        if item.get('issues'):
            content += "### Problemas Encontrados\n\n"
            for issue_desc in item['issues']:
                content += f"- ❌ {issue_desc}\n"
            content += "\n"

        # Warnings
        if item.get('warnings'):
            content += "### Avisos\n\n"
            for warning in item['warnings']:
                content += f"- ⚠️ {warning}\n"
            content += "\n"

        # Suggested fixes
        content += "### Correções Propostas\n\n"

        # Extract type and area
        import re
        title = item['title']
        type_match = re.match(r'^(feat|fix|docs|test|refactor|chore)(\([^)]+\))?:', title)
        area_match = re.match(r'^[^(]+\(([^)]+)\):', title)

        if not type_match:
            # Suggest title fix
            suggested_type = 'feat'  # default
            if 'test' in title.lower():
                suggested_type = 'test'
            elif 'doc' in title.lower():
                suggested_type = 'docs'
            elif 'fix' in title.lower() or 'bug' in title.lower():
                suggested_type = 'fix'

            suggested_area = 'backend'  # default
            if 'frontend' in title.lower() or 'ui' in title.lower():
                suggested_area = 'frontend'

            clean_title = title.replace(':', '').strip()
            suggested_title = f"{suggested_type}({suggested_area}): {clean_title}"
            content += f"**Título sugerido:** {suggested_title}\n\n"

        # Suggest labels
        wsjf_scores = results.get('wsjf', {})
        risk_scores = results.get('risks', {})

        issue_type = type_match.group(1) if type_match else 'feat'
        area = area_match.group(1) if area_match else 'backend'
        risk = risk_scores.get(str(issue_num), {}).get('level', 'low')

        # Determine priority
        if risk == 'high' and any(word in title.lower() for word in ['security', 'critical', 'blocker']):
            priority = 'P0'
        else:
            wsjf = wsjf_scores.get(str(issue_num), {}).get('wsjf', 0)
            if wsjf > 5:
                priority = 'P1'
            elif wsjf > 2:
                priority = 'P2'
            else:
                priority = 'P3'

        suggested_labels = [
            f'type/{issue_type}',
            f'area/{area}',
            f'priority/{priority}',
            f'risk/{risk}'
        ]

        content += f"**Labels sugeridas:** {', '.join(suggested_labels)}\n\n"

        # Command to apply
        content += "### Comando para aplicar\n\n"
        content += "```bash\n"
        labels_str = ' '.join(f'--add-label "{l}"' for l in suggested_labels)
        content += f"gh issue edit {issue_num} {labels_str}\n"
        content += "```\n\n"

        # Comment to add
        content += "### Comentário para colar na issue\n\n"
        content += "```markdown\n"
        content += f"## 🔍 Issue Quality Audit\n\n"
        content += f"**Quality Score:** {item['score']}/100\n\n"

        if item.get('issues'):
            content += "**Problemas Encontrados:**\n"
            for issue_desc in item['issues']:
                content += f"- ❌ {issue_desc}\n"
            content += "\n"

        if item.get('warnings'):
            content += "**Avisos:**\n"
            for warning in item['warnings']:
                content += f"- ⚠️ {warning}\n"
            content += "\n"

        content += f"**Priority:** {priority}\n"
        content += f"**Risk Level:** {risk}\n"
        content += f"**WSJF Score:** {wsjf_scores.get(str(issue_num), {}).get('wsjf', 0):.2f}\n"
        content += f"**RICE Score:** {results.get('rice', {}).get(str(issue_num), {}).get('rice', 0):.2f}\n\n"
        content += "---\n"
        content += "🤖 Auto-generated by backlog audit\n"
        content += "```\n\n"

        content += "---\n\n"

    return content

def generate_duplicates_md(results):
    """Generate DUPLICATES_AND_MERGES.md"""
    content = "# Duplicatas e Merges\n\n"
    content += f"**Data da auditoria:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    duplicates = results.get('duplicates', [])

    if not duplicates:
        content += "✅ Nenhuma duplicata detectada (similarity ≥ 0.85)\n\n"
        return content

    content += f"## Resumo\n\n"
    content += f"- **Total de duplicatas detectadas:** {len(duplicates)}\n\n"
    content += "---\n\n"

    for dup in duplicates:
        content += f"## Duplicata: #{dup['issue1']} e #{dup['issue2']}\n\n"
        content += f"**Similaridade:** {dup['similarity']*100:.1f}%\n\n"
        content += f"**Issue canônica (mais antiga):** #{dup['canonical']}\n\n"
        content += f"**Títulos:**\n"
        content += f"- #{dup['issue1']}: {dup['title1']}\n"
        content += f"- #{dup['issue2']}: {dup['title2']}\n\n"

        # Determine which to close
        to_close = dup['issue2'] if dup['canonical'] == dup['issue1'] else dup['issue1']

        content += "### Ação Recomendada\n\n"
        content += f"Fechar issue #{to_close} como duplicata de #{dup['canonical']}\n\n"

        content += "### Comentário para colar\n\n"
        content += "```markdown\n"
        content += f"Duplicata de #{dup['canonical']}\n\n"
        content += f"Esta issue está duplicada. Todo o trabalho deve ser feito em #{dup['canonical']}.\n\n"
        content += "🤖 Auto-detected by backlog audit\n"
        content += "```\n\n"

        content += "### Comando para fechar\n\n"
        content += "```bash\n"
        canonical = dup['canonical']
        content += f'gh issue close {to_close} --reason "duplicate" --comment "Duplicata de #{canonical}"\n'
        content += "```\n\n"

        content += "---\n\n"

    return content

def generate_unblocking_plan_md(results):
    """Generate UNBLOCKING_PLAN.md"""
    content = "# Plano de Desbloqueio\n\n"
    content += f"**Data da auditoria:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    deps = results.get('dependencies', {})

    # Find blocked issues
    blocked = []
    for issue_num, dep_info in deps.items():
        if dep_info.get('blocked_by'):
            blocked.append({
                'number': int(issue_num),
                'blocked_by': dep_info['blocked_by']
            })

    if not blocked:
        content += "✅ Nenhuma issue bloqueada detectada\n\n"
        return content

    content += f"## Resumo\n\n"
    content += f"- **Total de issues bloqueadas:** {len(blocked)}\n\n"
    content += "---\n\n"

    for item in blocked:
        content += f"## Issue #{item['number']}\n\n"
        blocked_refs = ', '.join(f"#{b}" for b in item['blocked_by'])
        content += f"**Bloqueada por:** {blocked_refs}\n\n"

        content += "### Plano de Desbloqueio\n\n"
        content += "1. Priorizar conclusão das issues bloqueadoras\n"
        content += "2. Se bloqueio é longo prazo, considerar:\n"
        content += "   - Criar feature flag para desenvolvimento paralelo\n"
        content += "   - Criar stub/mock das dependências\n"
        content += "   - Redefinir escopo para remover dependência\n"
        content += "3. Mover issue bloqueada para backlog até desbloqueio\n\n"

        content += "---\n\n"

    return content

def generate_sprint_plan_md(results, issues):
    """Generate SPRINT_PLAN.md"""
    content = "# Sprint Plan - 1-2 Semanas\n\n"
    content += f"**Data da auditoria:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    # Get top priority issues
    wsjf_scores = results.get('wsjf', {})
    rice_scores = results.get('rice', {})
    risk_scores = results.get('risks', {})

    issue_scores = []
    for issue in issues:
        if issue['state'] != 'OPEN':
            continue

        num = str(issue['number'])
        wsjf = wsjf_scores.get(num, {}).get('wsjf', 0)
        rice = rice_scores.get(num, {}).get('rice', 0)
        combined = (wsjf + rice) / 2
        risk = risk_scores.get(num, {}).get('level', 'low')
        effort = wsjf_scores.get(num, {}).get('size', 8)

        # Priority
        title = issue['title'].lower()
        if risk == 'high' and any(word in title for word in ['security', 'critical', 'blocker']):
            priority = 'P0'
        elif combined > 5:
            priority = 'P1'
        elif combined > 2:
            priority = 'P2'
        else:
            priority = 'P3'

        if priority in ['P0', 'P1']:
            issue_scores.append({
                'number': issue['number'],
                'title': issue['title'],
                'priority': priority,
                'effort': effort,
                'wsjf': wsjf,
                'rice': rice,
                'combined': combined
            })

    # Sort by priority then score
    issue_scores.sort(key=lambda x: (x['priority'], -x['combined']))

    # Calculate capacity (assuming 80h for 2-week sprint, 2 devs)
    capacity = 80
    sprint_issues = []
    total_effort = 0

    for item in issue_scores:
        if total_effort + item['effort'] <= capacity:
            sprint_issues.append(item)
            total_effort += item['effort']

    content += "## Meta da Sprint\n\n"
    content += "Resolver issues críticas de alta prioridade (P0/P1) que desbloqueiam desenvolvimento futuro.\n\n"

    content += "## Escopo Travado\n\n"
    content += f"**Capacity:** {capacity}h\n"
    content += f"**Effort planejado:** {total_effort}h\n"
    content += f"**Buffer:** {capacity - total_effort}h ({(capacity - total_effort)/capacity*100:.1f}%)\n\n"

    content += "### Issues da Sprint\n\n"
    content += "| # | Issue | Priority | Effort | WSJF | RICE |\n"
    content += "|---|-------|----------|--------|------|------|\n"

    for item in sprint_issues:
        content += f"| #{item['number']} | {item['title']} | {item['priority']} | {item['effort']}h | {item['wsjf']:.2f} | {item['rice']:.2f} |\n"

    content += "\n## Riscos da Sprint\n\n"
    content += "- Estimativas podem estar incorretas (buffer de 20%)\n"
    content += "- Dependências externas podem causar bloqueios\n"
    content += "- Issues de segurança podem surgir e ter prioridade\n\n"

    content += "## Critérios de Aceite da Sprint\n\n"
    content += "- ✅ Todas as issues P0 resolvidas\n"
    content += "- ✅ ≥70% das issues P1 resolvidas\n"
    content += "- ✅ Testes passando para todas as issues\n"
    content += "- ✅ Code review completo\n"
    content += "- ✅ Documentação atualizada\n\n"

    content += "## Kill Criteria (Abortar Escopo)\n\n"
    content += "1. **Bloqueio crítico não resolvível em <3 dias**\n"
    content += "   - Ação: Mover issue para próxima sprint, puxar issue de menor prioridade\n"
    content += "2. **Esforço real >150% da estimativa**\n"
    content += "   - Ação: Reavaliar escopo, considerar split da issue\n"
    content += "3. **≥3 issues de produção críticas surgem**\n"
    content += "   - Ação: Abortar sprint, criar sprint de emergência\n\n"

    content += "## Checkpoints Diários\n\n"
    content += "- **Daily standup:** 9:30 AM\n"
    content += "- **Check progress:** Issues em andamento vs completas\n"
    content += "- **Identify blockers:** Escalar imediatamente\n"
    content += "- **Adjust:** Se necessário, trocar issues de mesma prioridade\n\n"

    return content

def generate_csv(results, issues):
    """Generate backlog_order.csv"""
    rows = []

    wsjf_scores = results.get('wsjf', {})
    rice_scores = results.get('rice', {})
    risk_scores = results.get('risks', {})
    deps = results.get('dependencies', {})

    for issue in issues:
        if issue['state'] != 'OPEN':
            continue

        num = str(issue['number'])
        wsjf_data = wsjf_scores.get(num, {})
        rice_data = rice_scores.get(num, {})
        risk_data = risk_scores.get(num, {})
        dep_data = deps.get(num, {})

        import re
        title = issue['title']
        type_match = re.match(r'^(feat|fix|docs|test|refactor|chore)(\([^)]+\))?:', title)
        area_match = re.match(r'^[^(]+\(([^)]+)\):', title)

        issue_type = type_match.group(1) if type_match else 'unknown'
        area = area_match.group(1) if area_match else 'unknown'
        risk = risk_data.get('level', 'low')

        wsjf = wsjf_data.get('wsjf', 0)
        combined = (wsjf + rice_data.get('rice', 0)) / 2

        if risk == 'high' and any(word in title.lower() for word in ['security', 'critical', 'blocker']):
            priority = 'P0'
        elif combined > 5:
            priority = 'P1'
        elif combined > 2:
            priority = 'P2'
        else:
            priority = 'P3'

        blocked_by = ','.join(map(str, dep_data.get('blocked_by', [])))
        blocks = ','.join(map(str, dep_data.get('blocks', [])))

        rows.append({
            'ID': issue['number'],
            'Title': title,
            'Type': issue_type,
            'Area': area,
            'Priority': priority,
            'WSJF': f"{wsjf:.2f}",
            'RICE': f"{rice_data.get('rice', 0):.2f}",
            'Combined': f"{combined:.2f}",
            'Risk': risk,
            'Effort_Hours': wsjf_data.get('size', 8),
            'Blocked_By': blocked_by,
            'Blocks': blocks,
            'State': issue['state'],
            'URL': issue['url']
        })

    # Sort by combined score
    rows.sort(key=lambda x: float(x['Combined']), reverse=True)

    # Write CSV
    with open('ops/issue-audit/backlog_order.csv', 'w', newline='', encoding='utf-8') as f:
        if rows:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)

    return len(rows)

def generate_executive_summary(results, issues):
    """Generate executive summary"""
    quality_report = results.get('quality_report', [])
    duplicates = results.get('duplicates', [])
    deps = results.get('dependencies', {})

    # Calculate stats
    total_open = len([i for i in issues if i['state'] == 'OPEN'])
    adequate = len([q for q in quality_report if q['score'] >= 70])
    needs_fix = len([q for q in quality_report if q['score'] < 70])

    # Blocked issues
    blocked = len([d for d in deps.values() if d.get('blocked_by')])

    # Priority reclassification
    wsjf_scores = results.get('wsjf', {})
    rice_scores = results.get('rice', {})
    risk_scores = results.get('risks', {})

    p0_count = 0
    p1_count = 0

    for issue in issues:
        if issue['state'] != 'OPEN':
            continue

        num = str(issue['number'])
        risk = risk_scores.get(num, {}).get('level', 'low')
        combined = (wsjf_scores.get(num, {}).get('wsjf', 0) + rice_scores.get(num, {}).get('rice', 0)) / 2

        if risk == 'high' and any(word in issue['title'].lower() for word in ['security', 'critical', 'blocker']):
            p0_count += 1
        elif combined > 5:
            p1_count += 1

    # Top 10 by value
    issue_scores = []
    for issue in issues:
        if issue['state'] != 'OPEN':
            continue
        num = str(issue['number'])
        wsjf = wsjf_scores.get(num, {}).get('wsjf', 0)
        rice = rice_scores.get(num, {}).get('rice', 0)
        combined = (wsjf + rice) / 2
        issue_scores.append({'number': issue['number'], 'title': issue['title'], 'combined': combined})

    issue_scores.sort(key=lambda x: x['combined'], reverse=True)
    top10 = issue_scores[:10]

    # Risk residual
    high_risk = len([r for r in risk_scores.values() if r.get('level') == 'high'])

    # ROI calculation
    total_effort = sum(wsjf_scores.get(str(i['number']), {}).get('size', 8) for i in issues if i['state'] == 'OPEN')
    avg_value = sum(s['combined'] for s in issue_scores) / len(issue_scores) if issue_scores else 0

    content = "# 📊 Resumo Executivo - Auditoria de Backlog\n\n"
    content += f"**Data:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    content += "## Métricas Principais\n\n"
    content += f"1. **Issues abertas:** {total_open}\n"
    content += f"2. **Issues adequadas (≥70% quality):** {adequate} ({adequate/total_open*100:.1f}%)\n"
    content += f"3. **Issues que precisam correção:** {needs_fix} ({needs_fix/total_open*100:.1f}%)\n"
    content += f"4. **Duplicatas detectadas:** {len(duplicates)}\n"
    content += f"5. **Issues bloqueadas:** {blocked}\n"
    content += f"6. **Reclassificação de prioridade:**\n"
    content += f"   - P0 (crítico): {p0_count}\n"
    content += f"   - P1 (alto): {p1_count}\n"
    content += f"7. **Risco residual:** {high_risk} issues de alto risco\n"
    content += f"8. **Esforço total estimado:** {total_effort}h\n"
    content += f"9. **ROI médio esperado:** {avg_value:.2f} valor/esforço\n\n"

    content += "## Top 10 Issues por Valor\n\n"
    for idx, item in enumerate(top10, 1):
        content += f"{idx}. #{item['number']}: {item['title']} (score: {item['combined']:.2f})\n"

    content += "\n## Recomendações\n\n"
    content += "1. **Imediato:** Aplicar correções de labels e prioridades nas issues inadequadas\n"
    content += "2. **Esta semana:** Resolver duplicatas identificadas\n"
    content += "3. **Próxima sprint:** Focar em issues P0 e P1 (alto WSJF/RICE)\n"
    content += "4. **Médio prazo:** Desbloquear issues com dependências\n"
    content += "5. **Contínuo:** Manter padrões de qualidade em novas issues\n\n"

    content += "## Próximos Passos\n\n"
    content += "1. Revisar este relatório\n"
    content += "2. Aprovar aplicação das correções (ISSUE_FIXUPS.md)\n"
    content += "3. Executar comandos de atualização em lote\n"
    content += "4. Planejar sprint com base em SPRINT_PLAN.md\n"
    content += "5. Monitorar progresso e reaudit em 2 semanas\n\n"

    return content

def main():
    print("Gerando artefatos de auditoria...")

    results = load_results()
    issues = load_issues()

    print(f"✅ Carregados {len(issues)} issues")

    # Generate artifacts
    print("📝 Gerando BACKLOG_ORDER.md...")
    with open('ops/issue-audit/BACKLOG_ORDER.md', 'w', encoding='utf-8') as f:
        f.write(generate_backlog_order_md(results, issues))

    print("📝 Gerando ISSUE_FIXUPS.md...")
    with open('ops/issue-audit/ISSUE_FIXUPS.md', 'w', encoding='utf-8') as f:
        f.write(generate_issue_fixups_md(results, issues))

    print("📝 Gerando DUPLICATES_AND_MERGES.md...")
    with open('ops/issue-audit/DUPLICATES_AND_MERGES.md', 'w', encoding='utf-8') as f:
        f.write(generate_duplicates_md(results))

    print("📝 Gerando UNBLOCKING_PLAN.md...")
    with open('ops/issue-audit/UNBLOCKING_PLAN.md', 'w', encoding='utf-8') as f:
        f.write(generate_unblocking_plan_md(results))

    print("📝 Gerando SPRINT_PLAN.md...")
    with open('ops/issue-audit/SPRINT_PLAN.md', 'w', encoding='utf-8') as f:
        f.write(generate_sprint_plan_md(results, issues))

    print("📝 Gerando backlog_order.csv...")
    csv_count = generate_csv(results, issues)
    print(f"✅ {csv_count} linhas no CSV")

    print("📝 Gerando EXECUTIVE_SUMMARY.md...")
    with open('ops/issue-audit/EXECUTIVE_SUMMARY.md', 'w', encoding='utf-8') as f:
        f.write(generate_executive_summary(results, issues))

    # Generate audit log
    audit_log = {
        'timestamp': datetime.now().isoformat(),
        'total_issues': len(issues),
        'open_issues': len([i for i in issues if i['state'] == 'OPEN']),
        'quality_scores': {q['issue_number']: q['score'] for q in results.get('quality_report', [])},
        'duplicates_found': len(results.get('duplicates', [])),
        'criteria': 'WSJF + RICE combined score',
        'version': '1.0.0'
    }

    with open('ops/issue-audit/AUDIT_LOG.json', 'w', encoding='utf-8') as f:
        json.dump(audit_log, f, indent=2, ensure_ascii=False)

    print("\n✅ Todos os artefatos gerados com sucesso!")
    print("\nArquivos criados:")
    print("  - ops/issue-audit/BACKLOG_ORDER.md")
    print("  - ops/issue-audit/ISSUE_FIXUPS.md")
    print("  - ops/issue-audit/DUPLICATES_AND_MERGES.md")
    print("  - ops/issue-audit/UNBLOCKING_PLAN.md")
    print("  - ops/issue-audit/SPRINT_PLAN.md")
    print("  - ops/issue-audit/EXECUTIVE_SUMMARY.md")
    print("  - ops/issue-audit/backlog_order.csv")
    print("  - ops/issue-audit/AUDIT_LOG.json")

if __name__ == '__main__':
    main()
