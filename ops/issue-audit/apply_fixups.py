#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Apply fixups to issues in batches
Executes gh commands to update labels and comments
"""

import json
import subprocess
import sys
import io

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def load_results():
    """Load audit results"""
    with open('ops/issue-audit/audit_results.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_issues():
    """Load issues data"""
    cmd = [
        'gh', 'issue', 'list',
        '--limit', '1000',
        '--state', 'all',
        '--json', 'number,title,body,state,labels,assignees,milestone,createdAt,updatedAt,url'
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    return json.loads(result.stdout) if result.stdout else []

def apply_labels_batch(updates, dry_run=True):
    """Apply label updates in batch"""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Aplicando labels em lote...\n")

    success_count = 0
    error_count = 0

    for update in updates:
        issue_num = update['issue_number']
        labels = update['labels']

        cmd = ['gh', 'issue', 'edit', str(issue_num)]
        for label in labels:
            cmd.extend(['--add-label', label])

        print(f"Issue #{issue_num}: {', '.join(labels)}")

        if not dry_run:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
            if result.returncode == 0:
                print(f"  ✅ Success")
                success_count += 1
            else:
                print(f"  ❌ Error: {result.stderr}")
                error_count += 1
        else:
            print(f"  [DRY RUN] Would execute: {' '.join(cmd)}")
            success_count += 1

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Resumo:")
    print(f"  ✅ Sucesso: {success_count}")
    print(f"  ❌ Erros: {error_count}")

    return success_count, error_count

def add_audit_comments(updates, dry_run=True):
    """Add audit comments to issues"""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Adicionando comentários de auditoria...\n")

    success_count = 0
    error_count = 0

    for update in updates:
        issue_num = update['issue_number']
        comment = update['comment']

        print(f"Issue #{issue_num}: Adicionando comentário de auditoria")

        if not dry_run:
            cmd = ['gh', 'issue', 'comment', str(issue_num), '--body', comment]
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
            if result.returncode == 0:
                print(f"  ✅ Success")
                success_count += 1
            else:
                print(f"  ❌ Error: {result.stderr}")
                error_count += 1
        else:
            print(f"  [DRY RUN] Would add comment ({len(comment)} chars)")
            success_count += 1

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Resumo:")
    print(f"  ✅ Sucesso: {success_count}")
    print(f"  ❌ Erros: {error_count}")

    return success_count, error_count

def prepare_updates(results, issues):
    """Prepare updates for all issues"""
    import re

    quality_report = results.get('quality_report', [])
    wsjf_scores = results.get('wsjf', {})
    rice_scores = results.get('rice', {})
    risk_scores = results.get('risks', {})

    updates = []

    for item in quality_report:
        if item['score'] >= 70:
            continue  # Skip adequate issues

        issue_num = item['issue_number']
        issue = next((i for i in issues if i['number'] == issue_num), None)
        if not issue:
            continue

        # Extract type and area
        title = item['title']
        type_match = re.match(r'^(feat|fix|docs|test|refactor|chore)(\([^)]+\))?:', title)
        area_match = re.match(r'^[^(]+\(([^)]+)\):', title)

        issue_type = type_match.group(1) if type_match else 'feat'
        area = area_match.group(1) if area_match else 'backend'
        risk = risk_scores.get(str(issue_num), {}).get('level', 'low')

        # Determine priority
        wsjf = wsjf_scores.get(str(issue_num), {}).get('wsjf', 0)
        rice = rice_scores.get(str(issue_num), {}).get('rice', 0)
        combined = (wsjf + rice) / 2

        if risk == 'high' and any(word in title.lower() for word in ['security', 'critical', 'blocker']):
            priority = 'P0'
        elif combined > 5:
            priority = 'P1'
        elif combined > 2:
            priority = 'P2'
        else:
            priority = 'P3'

        labels = [
            f'type/{issue_type}',
            f'area/{area}',
            f'priority/{priority}',
            f'risk/{risk}'
        ]

        # Generate comment
        comment = f"""## 🔍 Issue Quality Audit

**Quality Score:** {item['score']}/100

**Problemas Encontrados:**
{chr(10).join(f"- ❌ {issue}" for issue in item.get('issues', []))}

**Avisos:**
{chr(10).join(f"- ⚠️ {warning}" for warning in item.get('warnings', []))}

**Priority:** {priority}
**Risk Level:** {risk}
**WSJF Score:** {wsjf:.2f}
**RICE Score:** {rice:.2f}

---
🤖 Auto-generated by backlog audit"""

        updates.append({
            'issue_number': issue_num,
            'labels': labels,
            'comment': comment,
            'priority': priority,
            'wsjf': wsjf,
            'rice': rice
        })

    return updates

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Apply backlog audit fixups')
    parser.add_argument('--dry-run', action='store_true', default=True,
                        help='Dry run mode (default: True)')
    parser.add_argument('--apply-now', action='store_true',
                        help='Actually apply changes (disables dry-run)')
    parser.add_argument('--yes', action='store_true',
                        help='Skip confirmation prompt (auto-confirm)')
    parser.add_argument('--labels-only', action='store_true',
                        help='Only apply labels, skip comments')
    parser.add_argument('--comments-only', action='store_true',
                        help='Only add comments, skip labels')
    parser.add_argument('--batch-size', type=int, default=20,
                        help='Batch size for processing (default: 20)')

    args = parser.parse_args()

    dry_run = not args.apply_now

    if args.apply_now:
        print("⚠️  MODO DE APLICAÇÃO ATIVADO - As mudanças serão aplicadas no GitHub!")
        if not args.yes:
            response = input("Tem certeza que deseja continuar? (digite 'APLICAR AGORA'): ")
            if response != 'APLICAR AGORA':
                print("❌ Cancelado pelo usuário")
                return
        else:
            print("✅ Auto-confirmado via --yes flag")
    else:
        print("ℹ️  Modo DRY RUN - Nenhuma mudança será aplicada")

    print("\n📥 Carregando dados...")
    results = load_results()
    issues = load_issues()

    print(f"✅ Carregados {len(issues)} issues")

    print("\n🔧 Preparando atualizações...")
    updates = prepare_updates(results, issues)

    print(f"✅ {len(updates)} issues precisam de atualização")

    if not updates:
        print("\n✅ Nenhuma atualização necessária!")
        return

    # Split into batches
    batch_size = args.batch_size
    batches = [updates[i:i+batch_size] for i in range(0, len(updates), batch_size)]

    print(f"\n📦 Processando em {len(batches)} lotes de até {batch_size} issues")

    total_success = 0
    total_errors = 0

    for idx, batch in enumerate(batches, 1):
        print(f"\n{'='*60}")
        print(f"LOTE {idx}/{len(batches)} ({len(batch)} issues)")
        print(f"{'='*60}")

        if not args.comments_only:
            success, errors = apply_labels_batch(batch, dry_run)
            total_success += success
            total_errors += errors

        if not args.labels_only:
            success, errors = add_audit_comments(batch, dry_run)
            total_success += success
            total_errors += errors

        if not dry_run and idx < len(batches) and not args.yes:
            response = input(f"\n✅ Lote {idx} completo. Continuar para próximo lote? (s/n): ")
            if response.lower() != 's':
                print(f"\n⏸️  Pausado após lote {idx}/{len(batches)}")
                break

    print(f"\n{'='*60}")
    print("RESUMO FINAL")
    print(f"{'='*60}")
    print(f"{'[DRY RUN] ' if dry_run else ''}Total de operações bem-sucedidas: {total_success}")
    print(f"{'[DRY RUN] ' if dry_run else ''}Total de erros: {total_errors}")

    if dry_run:
        print("\nℹ️  Para aplicar as mudanças de verdade, execute:")
        print("    python ops/issue-audit/apply_fixups.py --apply-now")

if __name__ == '__main__':
    main()
