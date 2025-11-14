#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aplica correções automatizadas baseadas nas recomendações da auditoria
"""

import json
import sys
import subprocess
from typing import List, Dict

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


def load_results():
    """Carrega resultados da auditoria"""
    with open('audit_results.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def run_gh_command(command: List[str]) -> tuple:
    """Executa comando gh CLI e retorna stdout, stderr, returncode"""
    try:
        result = subprocess.run(
            ['gh'] + command,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        return result.stdout, result.stderr, result.returncode
    except Exception as e:
        return '', str(e), 1


def close_duplicates(dry_run: bool = True):
    """Fecha duplicatas de alta confiança (≥85% similaridade)"""
    print("\n" + "="*60)
    print("🔄 FECHANDO DUPLICATAS DE ALTA CONFIANÇA")
    print("="*60)

    results = load_results()
    high_conf_dups = [d for d in results['duplicates'] if d['similarity'] >= 0.85]

    print(f"\nEncontradas {len(high_conf_dups)} duplicatas com ≥85% similaridade\n")

    # Determinar qual issue manter (maior score)
    close_actions = []
    for dup in high_conf_dups:
        issue1 = next(i for i in results['issues'] if i['number'] == dup['issue1'])
        issue2 = next(i for i in results['issues'] if i['number'] == dup['issue2'])

        if issue1['compliance_score'] >= issue2['compliance_score']:
            keep, close = dup['issue1'], dup['issue2']
            keep_score, close_score = issue1['compliance_score'], issue2['compliance_score']
        else:
            keep, close = dup['issue2'], dup['issue1']
            keep_score, close_score = issue2['compliance_score'], issue1['compliance_score']

        close_actions.append({
            'close': close,
            'keep': keep,
            'similarity': dup['similarity'],
            'keep_score': keep_score,
            'close_score': close_score,
            'title': dup['title1']
        })

    # Remover duplicatas de fechamento (se A fecha B e B fecha A, manter apenas uma ação)
    unique_closes = {}
    for action in close_actions:
        if action['close'] not in unique_closes:
            unique_closes[action['close']] = action

    print(f"Ações de fechamento únicas: {len(unique_closes)}\n")

    for i, action in enumerate(unique_closes.values(), 1):
        print(f"{i}. Fechar #{action['close']} (score: {action['close_score']}%)")
        print(f"   Manter #{action['keep']} (score: {action['keep_score']}%)")
        print(f"   Similaridade: {action['similarity']*100:.0f}%")
        print(f"   Título: {action['title'][:60]}...")

        if not dry_run:
            comment = (
                f"Duplicata de #{action['keep']} (similaridade {action['similarity']*100:.0f}%). "
                f"Consolidando esforços na issue principal.\n\n"
                f"🤖 Fechamento automático via auditoria de backlog"
            )

            stdout, stderr, code = run_gh_command([
                'issue', 'close', str(action['close']),
                '-c', comment
            ])

            if code == 0:
                print(f"   ✅ Fechada com sucesso")
            else:
                print(f"   ❌ Erro: {stderr}")
        else:
            print(f"   [DRY RUN] Seria fechada")

        print()

    if dry_run:
        print("\n⚠️  DRY RUN MODE - Nenhuma issue foi realmente fechada")
        print("Execute com --apply para aplicar as mudanças")
    else:
        print(f"\n✅ {len(unique_closes)} duplicatas fechadas com sucesso")


def assign_milestones(dry_run: bool = True):
    """Atribui milestones às issues órfãs"""
    print("\n" + "="*60)
    print("📍 ATRIBUINDO MILESTONES ÀS ISSUES ÓRFÃS")
    print("="*60)

    results = load_results()
    no_milestone = [i for i in results['issues'] if not i['milestone']]

    print(f"\nEncontradas {len(no_milestone)} issues sem milestone\n")

    # Sugestões baseadas em labels
    for issue in no_milestone:
        labels = issue['labels']

        # Heurística de sugestão
        if any('test' in l for l in labels):
            suggested_milestone = "M1: Foundation - Testes"
        elif any('security' in l or 'fix' in l for l in labels):
            suggested_milestone = "M1: Foundation - Testes"  # Blocker issues
        elif any('docs' in l for l in labels):
            suggested_milestone = "M5: E2E Testing & Documentation"
        elif any('ci' in l or 'pipeline' in l for l in labels):
            suggested_milestone = "M2: CI/CD Pipeline"
        else:
            suggested_milestone = "M1: Foundation - Testes"  # Default

        print(f"Issue #{issue['number']}: {issue['title'][:50]}...")
        print(f"  Labels: {', '.join(labels[:3])}")
        print(f"  Sugestão: {suggested_milestone}")

        if not dry_run:
            stdout, stderr, code = run_gh_command([
                'issue', 'edit', str(issue['number']),
                '--milestone', suggested_milestone
            ])

            if code == 0:
                print(f"  ✅ Milestone atribuído")
            else:
                print(f"  ❌ Erro: {stderr}")
        else:
            print(f"  [DRY RUN] Seria atribuído")

        print()

    if dry_run:
        print("\n⚠️  DRY RUN MODE - Nenhum milestone foi atribuído")
        print("Execute com --apply para aplicar as mudanças")
    else:
        print(f"\n✅ {len(no_milestone)} milestones atribuídos")


def add_estimates(dry_run: bool = True):
    """Adiciona estimativas inferidas às issues"""
    print("\n" + "="*60)
    print("⏱️  ADICIONANDO ESTIMATIVAS ÀS ISSUES")
    print("="*60)

    results = load_results()

    # Issues com estimativa inferida e score de atomicidade < 80
    inferred = [i for i in results['issues']
                if i['scores']['atomicity']['estimation_method'] == 'inferred'
                and i['scores']['atomicity']['score'] < 80]

    print(f"\nEncontradas {len(inferred)} issues com estimativas inferidas\n")

    # Limitar aos top 20 para não sobrecarregar
    for issue in inferred[:20]:
        hours = issue['scores']['atomicity']['estimated_hours']

        print(f"Issue #{issue['number']}: {issue['title'][:50]}...")
        print(f"  Estimativa inferida: {hours}h")

        if hours > 8:
            print(f"  ⚠️  Estimativa alta (>{hours}h) - considere decompor")
            estimate_comment = (
                f"## ⏱️ Estimativa de Tempo\n\n"
                f"**Duração estimada:** {hours}h\n\n"
                f"⚠️ **Nota:** Esta issue aparenta ser grande demais para uma unidade atômica (>8h). "
                f"Considere decompor em sub-issues menores de 2-8h cada.\n\n"
                f"🤖 Estimativa gerada automaticamente pela auditoria de backlog"
            )
        else:
            estimate_comment = (
                f"## ⏱️ Estimativa de Tempo\n\n"
                f"**Duração estimada:** {hours}h ({max(2, hours-2)}-{min(8, hours+2)}h)\n\n"
                f"Esta estimativa foi calculada baseada em:\n"
                f"- Complexidade das tarefas listadas\n"
                f"- Número de arquivos mencionados\n"
                f"- Tipo de trabalho (test/fix/feature)\n\n"
                f"🤖 Estimativa gerada automaticamente pela auditoria de backlog\n\n"
                f"_Por favor, ajuste se necessário baseado no seu conhecimento do domínio._"
            )

        if not dry_run:
            stdout, stderr, code = run_gh_command([
                'issue', 'comment', str(issue['number']),
                '--body', estimate_comment
            ])

            if code == 0:
                print(f"  ✅ Estimativa adicionada como comentário")
            else:
                print(f"  ❌ Erro: {stderr}")
        else:
            print(f"  [DRY RUN] Comentário com estimativa seria adicionado")

        print()

    if dry_run:
        print("\n⚠️  DRY RUN MODE - Nenhuma estimativa foi adicionada")
        print("Execute com --apply para aplicar as mudanças")
    else:
        print(f"\n✅ Estimativas adicionadas a {min(20, len(inferred))} issues")


def generate_improvement_templates(output_file: str = 'issue_improvements.md'):
    """Gera templates de melhoria para issues não conformes"""
    print("\n" + "="*60)
    print("📝 GERANDO TEMPLATES DE MELHORIA")
    print("="*60)

    results = load_results()

    # Issues com score < 60% ordenadas por milestone
    non_compliant = sorted(
        [i for i in results['issues'] if i['compliance_score'] < 60],
        key=lambda x: (x['milestone'] or 'ZZZ', -x['compliance_score'])
    )

    print(f"\nGerando templates para {len(non_compliant)} issues não conformes\n")

    content = []
    content.append("# 🔧 TEMPLATES DE MELHORIA PARA ISSUES NÃO CONFORMES\n\n")
    content.append(f"**Total de issues:** {len(non_compliant)}\n")
    content.append(f"**Score mínimo:** {min(i['compliance_score'] for i in non_compliant)}%\n")
    content.append(f"**Score máximo:** {max(i['compliance_score'] for i in non_compliant)}%\n\n")

    current_milestone = None
    for issue in non_compliant:
        milestone = issue['milestone'] or 'Sem Milestone'

        if milestone != current_milestone:
            content.append(f"\n## {milestone}\n\n")
            current_milestone = milestone

        content.append(f"### Issue #{issue['number']}: {issue['title']}\n\n")
        content.append(f"**Score atual:** {issue['compliance_score']}%\n")
        content.append(f"**URL:** {issue['url']}\n\n")

        content.append("**O que precisa ser melhorado:**\n\n")

        scores = issue['scores']

        # Atomicidade
        if scores['atomicity']['score'] < 80:
            content.append(f"- **Atomicidade ({scores['atomicity']['score']}%):**\n")
            content.append(f"  - Adicionar estimativa explícita: `{scores['atomicity']['estimated_hours']}h`\n")
            if scores['atomicity']['estimated_hours'] > 8:
                content.append(f"  - ⚠️ Decompor em issues menores (<8h cada)\n")
            content.append("\n")

        # Completude
        if scores['completeness']['score'] < 80:
            content.append(f"- **Completude ({scores['completeness']['score']}%):**\n")
            if not scores['completeness']['has_context']:
                content.append(f"  - Adicionar contexto (atual: {scores['completeness']['body_length']} chars, min: 200)\n")
            if not scores['completeness']['has_objectives']:
                content.append(f"  - Adicionar seção de objetivos\n")
            if not scores['completeness']['has_technical_details']:
                content.append(f"  - Adicionar specs técnicas (arquivos, código exemplo)\n")
            content.append("\n")

        # Executabilidade
        if scores['executability']['score'] < 80:
            content.append(f"- **Executabilidade ({scores['executability']['score']}%):**\n")
            if not scores['executability']['has_file_paths']:
                content.append(f"  - Adicionar file paths específicos (ex: `src/services/auth.ts`)\n")
            if not scores['executability']['has_code_examples']:
                content.append(f"  - Adicionar exemplos de código em \`\`\`blocos\`\`\`\n")
            if not scores['executability']['has_step_by_step']:
                content.append(f"  - Adicionar steps numerados de implementação\n")
            content.append("\n")

        # Rastreabilidade
        if scores['traceability']['score'] < 60:
            content.append(f"- **Rastreabilidade ({scores['traceability']['score']}%):**\n")
            if not scores['traceability']['has_milestone']:
                content.append(f"  - Atribuir milestone apropriado\n")
            if not scores['traceability']['has_dependencies_mapped']:
                content.append(f"  - Mapear dependências (Bloqueada por: #X, Bloqueia: #Y)\n")
            if not scores['traceability']['has_sufficient_labels']:
                content.append(f"  - Adicionar labels (atual: {scores['traceability']['label_count']}, min: 3)\n")
            content.append("\n")

        content.append("**Template sugerido para adicionar:**\n\n")
        content.append("```markdown\n")
        content.append("## Estimativa\n")
        content.append(f"**Duração:** {scores['atomicity']['estimated_hours']}h\n\n")
        content.append("## Arquivos a Modificar\n")
        content.append("- [ ] `src/path/to/file1.ts`\n")
        content.append("- [ ] `src/path/to/file2.ts`\n\n")
        content.append("## Steps de Implementação\n")
        content.append("1. [ ] Step 1\n")
        content.append("2. [ ] Step 2\n")
        content.append("3. [ ] Step 3\n\n")
        content.append("## Dependências\n")
        content.append("**Bloqueada por:** #X, #Y\n")
        content.append("**Bloqueia:** #Z\n")
        content.append("```\n\n")
        content.append("---\n\n")

    # Salvar templates
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(''.join(content))

    print(f"✅ Templates salvos em {output_file}")
    print(f"   Use este arquivo para copiar/colar melhorias nas issues")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Aplica correções automatizadas')
    parser.add_argument('--close-duplicates', action='store_true',
                       help='Fecha duplicatas de alta confiança')
    parser.add_argument('--assign-milestones', action='store_true',
                       help='Atribui milestones às issues órfãs')
    parser.add_argument('--add-estimates', action='store_true',
                       help='Adiciona estimativas inferidas')
    parser.add_argument('--generate-templates', action='store_true',
                       help='Gera templates de melhoria')
    parser.add_argument('--all', action='store_true',
                       help='Executa todas as correções')
    parser.add_argument('--apply', action='store_true',
                       help='Aplica mudanças (sem isso, apenas dry-run)')

    args = parser.parse_args()

    dry_run = not args.apply

    if dry_run:
        print("\n" + "="*60)
        print("⚠️  DRY RUN MODE ATIVADO")
        print("="*60)
        print("Nenhuma mudança será aplicada ao GitHub.")
        print("Use --apply para aplicar as mudanças realmente.\n")

    if args.all or args.close_duplicates:
        close_duplicates(dry_run)

    if args.all or args.assign_milestones:
        assign_milestones(dry_run)

    if args.all or args.add_estimates:
        add_estimates(dry_run)

    if args.all or args.generate_templates:
        generate_improvement_templates()

    if not any([args.close_duplicates, args.assign_milestones,
                args.add_estimates, args.generate_templates, args.all]):
        parser.print_help()


if __name__ == '__main__':
    main()
