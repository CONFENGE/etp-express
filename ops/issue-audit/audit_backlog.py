#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETP Express Backlog Audit Script
Verifica conformidade de issues contra 5 critérios:
1. Atomicidade (2-8h)
2. Priorização (criticidade + dependências)
3. Completude (contexto, AC, specs técnicas)
4. Executabilidade (cold-start ready)
5. Rastreabilidade (milestone, deps, roadmap)
"""

import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Tuple
from difflib import SequenceMatcher

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Constantes
CRITERIA_WEIGHTS = {
    'atomicity': 0.20,
    'prioritization': 0.20,
    'completeness': 0.25,
    'executability': 0.20,
    'traceability': 0.15
}

# Keywords para inferir estimativas
TIME_KEYWORDS = {
    'quick': 2, 'simple': 2, 'basic': 3, 'configure': 3, 'setup': 4,
    'implement': 6, 'create': 6, 'add': 5, 'build': 8, 'refactor': 8,
    'comprehensive': 10, 'complex': 12, 'integrate': 8
}

COMPLEXITY_INDICATORS = {
    'test': 1.0, 'fix': 0.8, 'config': 0.7, 'docs': 0.5,
    'refactor': 1.5, 'feature': 1.2, 'integration': 1.3
}


def load_issues(filepath: str = 'all_issues.json') -> List[Dict]:
    """Carrega issues do arquivo JSON"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def calculate_similarity(text1: str, text2: str) -> float:
    """Calcula similaridade entre dois textos (0-1)"""
    return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()


def extract_time_estimate(body: str, title: str) -> Tuple[float, str]:
    """
    Infere estimativa de tempo a partir do corpo e título
    Retorna (horas, método)
    """
    # Procurar estimativa explícita
    explicit_patterns = [
        r'(?:estimat|time|duration|effort).*?(\d+)\s*(?:h|hour|hora)',
        r'(\d+)\s*(?:h|hour|hora)',
        r'(\d+)-(\d+)\s*(?:h|hour|hora)'
    ]

    for pattern in explicit_patterns:
        match = re.search(pattern, body, re.IGNORECASE)
        if match:
            if len(match.groups()) == 2:  # Range
                return (int(match.group(1)) + int(match.group(2))) / 2, 'explicit_range'
            return float(match.group(1)), 'explicit'

    # Inferir baseado em keywords
    combined_text = f"{title} {body}".lower()
    base_time = 5  # Default

    for keyword, hours in TIME_KEYWORDS.items():
        if keyword in combined_text:
            base_time = max(base_time, hours)

    # Ajustar por complexidade
    for indicator, multiplier in COMPLEXITY_INDICATORS.items():
        if indicator in combined_text:
            base_time *= multiplier
            break

    # Contar tarefas (checkboxes)
    task_count = len(re.findall(r'[-*]\s*\[[ x]\]', body))
    if task_count > 0:
        task_time = min(task_count * 0.5, 4)  # Max 4h de tarefas
        base_time += task_time

    # Contar arquivos mencionados
    file_count = len(re.findall(r'`[\w/.-]+\.(ts|js|tsx|jsx|py|json)`', body))
    if file_count > 3:
        base_time += 1

    return round(min(base_time, 12), 1), 'inferred'


def score_atomicity(issue: Dict) -> Dict:
    """Critério 1: Atomicidade (2-8h cada)"""
    body = issue.get('body', '')
    title = issue.get('title', '')

    hours, method = extract_time_estimate(body, title)

    if method == 'explicit':
        if 2 <= hours <= 8:
            score = 100
        elif 8 < hours <= 12:
            score = 60
        elif hours > 12:
            score = 40
        else:
            score = 80
    else:  # inferred
        if 2 <= hours <= 8:
            score = 80
        elif 8 < hours <= 12:
            score = 60
        elif hours > 12:
            score = 40
        else:
            score = 70

    return {
        'score': score,
        'estimated_hours': hours,
        'estimation_method': method,
        'is_atomic': 2 <= hours <= 8,
        'recommendation': 'OK' if 2 <= hours <= 8 else 'Decompor em issues menores' if hours > 8 else 'Adicionar escopo'
    }


def score_prioritization(issue: Dict) -> Dict:
    """Critério 2: Priorização (criticidade + dependências)"""
    labels = [l['name'] for l in issue.get('labels', [])]
    body = issue.get('body', '')

    has_priority = any(l.startswith('priority/') or l.startswith('priority:') for l in labels)
    has_dependencies = bool(re.search(r'(?:depend|block|requir)', body, re.IGNORECASE))
    has_justification = bool(re.search(r'(?:because|reason|rationale|critical)', body, re.IGNORECASE))

    score = 0
    if has_priority and has_dependencies and has_justification:
        score = 100
    elif has_priority and has_dependencies:
        score = 80
    elif has_priority:
        score = 60
    elif issue.get('milestone'):
        score = 40  # Milestone ordem implícita

    return {
        'score': score,
        'has_priority_label': has_priority,
        'has_dependencies': has_dependencies,
        'has_justification': has_justification,
        'recommendation': 'OK' if score >= 80 else 'Adicionar dependências e justificativa'
    }


def score_completeness(issue: Dict) -> Dict:
    """Critério 3: Completude (contexto, objetivos, AC, specs técnicas)"""
    body = issue.get('body', '')

    has_context = len(body) > 200  # Mínimo 200 chars
    has_objectives = bool(re.search(r'(?:objective|goal|purpose|objetivo)', body, re.IGNORECASE))
    has_ac = bool(re.search(r'(?:acceptance criteria|critérios de aceitação|definition of done|\[x\])', body, re.IGNORECASE))
    has_tech_details = bool(re.search(r'(?:```|technical|implementation|arquivos|files|módulos)', body, re.IGNORECASE))

    score = 0
    if all([has_context, has_objectives, has_ac, has_tech_details]):
        score = 100
    elif has_objectives and has_ac and has_tech_details:
        score = 80
    elif has_ac and has_tech_details:
        score = 60
    elif has_ac:
        score = 40
    elif len(body) > 50:
        score = 20

    return {
        'score': score,
        'has_context': has_context,
        'has_objectives': has_objectives,
        'has_acceptance_criteria': has_ac,
        'has_technical_details': has_tech_details,
        'body_length': len(body),
        'recommendation': 'OK' if score >= 80 else 'Adicionar specs técnicas e contexto'
    }


def score_executability(issue: Dict) -> Dict:
    """Critério 4: Executabilidade (cold-start ready)"""
    body = issue.get('body', '')

    # Indicadores de executabilidade
    has_file_paths = bool(re.findall(r'`[\w/.-]+\.(ts|js|tsx|jsx|py|json)`', body))
    has_code_examples = body.count('```') >= 2
    has_step_by_step = bool(re.search(r'(?:\d+\.|step \d+|passo \d+)', body, re.IGNORECASE))
    has_references = bool(re.search(r'(?:https?://|ver issue|see #\d+)', body, re.IGNORECASE))

    score = 0
    if all([has_file_paths, has_code_examples, has_step_by_step]):
        score = 100
    elif has_file_paths and (has_code_examples or has_step_by_step):
        score = 80
    elif has_file_paths or has_step_by_step:
        score = 60
    elif has_references:
        score = 40

    return {
        'score': score,
        'has_file_paths': has_file_paths,
        'has_code_examples': has_code_examples,
        'has_step_by_step': has_step_by_step,
        'has_references': has_references,
        'cold_start_ready': score >= 80,
        'recommendation': 'OK' if score >= 80 else 'Adicionar file paths e exemplos de código'
    }


def score_traceability(issue: Dict) -> Dict:
    """Critério 5: Rastreabilidade (milestone, deps, roadmap, labels)"""
    labels = [l['name'] for l in issue.get('labels', [])]
    body = issue.get('body', '')
    milestone = issue.get('milestone')

    has_milestone = milestone is not None
    has_dependencies = bool(re.findall(r'#\d+', body))
    has_labels = len(labels) >= 3
    has_roadmap_link = 'roadmap' in body.lower() or 'milestone' in body.lower()

    score = 0
    if all([has_milestone, has_dependencies, has_labels, has_roadmap_link]):
        score = 100
    elif has_milestone and has_dependencies and has_labels:
        score = 80
    elif has_milestone and has_labels:
        score = 60
    elif has_milestone:
        score = 40
    elif has_labels:
        score = 20

    return {
        'score': score,
        'has_milestone': has_milestone,
        'milestone_title': milestone['title'] if milestone else None,
        'has_dependencies_mapped': has_dependencies,
        'dependencies_found': re.findall(r'#(\d+)', body),
        'has_sufficient_labels': has_labels,
        'label_count': len(labels),
        'has_roadmap_reference': has_roadmap_link,
        'recommendation': 'OK' if score >= 60 else 'Adicionar milestone e mapear dependências'
    }


def calculate_overall_score(scores: Dict) -> float:
    """Calcula score geral ponderado"""
    total = sum(
        scores[criterion]['score'] * CRITERIA_WEIGHTS[criterion]
        for criterion in CRITERIA_WEIGHTS.keys()
    )
    return round(total, 1)


def detect_duplicates(issues: List[Dict], threshold: float = 0.75) -> List[Tuple]:
    """Detecta issues duplicadas por similaridade de título"""
    duplicates = []

    for i, issue1 in enumerate(issues):
        for issue2 in issues[i+1:]:
            similarity = calculate_similarity(issue1['title'], issue2['title'])
            if similarity >= threshold:
                duplicates.append({
                    'issue1': issue1['number'],
                    'issue2': issue2['number'],
                    'title1': issue1['title'],
                    'title2': issue2['title'],
                    'similarity': round(similarity, 2)
                })

    return duplicates


def extract_dependencies(issues: List[Dict]) -> Dict:
    """Extrai grafo de dependências"""
    dep_graph = defaultdict(lambda: {'blocks': [], 'blocked_by': []})

    for issue in issues:
        issue_num = issue['number']
        body = issue.get('body', '')

        # Encontrar dependências mencionadas
        blocked_by = re.findall(r'(?:blocked by|depends on|requires).*?#(\d+)', body, re.IGNORECASE)
        blocks = re.findall(r'(?:blocks|required by).*?#(\d+)', body, re.IGNORECASE)

        dep_graph[issue_num]['blocked_by'] = [int(n) for n in blocked_by]
        dep_graph[issue_num]['blocks'] = [int(n) for n in blocks]

    return dict(dep_graph)


def analyze_milestone_risk(issues: List[Dict]) -> Dict:
    """Analisa risco de cada milestone"""
    milestone_stats = defaultdict(lambda: {
        'total_issues': 0,
        'total_hours': 0,
        'completed': 0,
        'in_progress': 0,
        'blocked': 0,
        'issues': []
    })

    for issue in issues:
        milestone = issue.get('milestone')
        if not milestone:
            continue

        m_title = milestone['title']
        milestone_stats[m_title]['total_issues'] += 1
        milestone_stats[m_title]['issues'].append(issue['number'])

        # Estimar horas
        hours, _ = extract_time_estimate(issue.get('body', ''), issue.get('title', ''))
        milestone_stats[m_title]['total_hours'] += hours

    return dict(milestone_stats)


def audit_issues(issues: List[Dict]) -> Dict:
    """Executa auditoria completa"""
    print(f"🔍 Auditando {len(issues)} issues...")

    results = {
        'metadata': {
            'audit_date': datetime.now().isoformat(),
            'total_issues': len(issues),
            'issue_range': f"#{issues[-1]['number']} to #{issues[0]['number']}"
        },
        'summary': {
            'compliant_100': 0,
            'compliant_80_plus': 0,
            'non_compliant': 0,
            'avg_score': 0
        },
        'issues': [],
        'duplicates': [],
        'dependencies': {},
        'milestone_analysis': {}
    }

    # Auditar cada issue
    all_scores = []
    for issue in issues:
        atomicity = score_atomicity(issue)
        prioritization = score_prioritization(issue)
        completeness = score_completeness(issue)
        executability = score_executability(issue)
        traceability = score_traceability(issue)

        scores = {
            'atomicity': atomicity,
            'prioritization': prioritization,
            'completeness': completeness,
            'executability': executability,
            'traceability': traceability
        }

        overall_score = calculate_overall_score(scores)
        all_scores.append(overall_score)

        issue_result = {
            'number': issue['number'],
            'title': issue['title'],
            'url': issue['url'],
            'milestone': issue.get('milestone', {}).get('title') if issue.get('milestone') else None,
            'labels': [l['name'] for l in issue.get('labels', [])],
            'compliance_score': overall_score,
            'is_compliant': overall_score >= 80,
            'scores': scores
        }

        results['issues'].append(issue_result)

        # Update summary
        if overall_score == 100:
            results['summary']['compliant_100'] += 1
        elif overall_score >= 80:
            results['summary']['compliant_80_plus'] += 1
        else:
            results['summary']['non_compliant'] += 1

    results['summary']['avg_score'] = round(sum(all_scores) / len(all_scores), 1)

    # Detectar duplicatas
    print("🔍 Detectando duplicatas...")
    results['duplicates'] = detect_duplicates(issues)

    # Extrair dependências
    print("🔍 Mapeando dependências...")
    results['dependencies'] = extract_dependencies(issues)

    # Analisar milestones
    print("🔍 Analisando milestones...")
    results['milestone_analysis'] = analyze_milestone_risk(issues)

    return results


def save_results(results: Dict):
    """Salva resultados em JSON"""
    with open('audit_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print("✅ Resultados salvos em audit_results.json")


def main():
    print("=" * 60)
    print("ETP EXPRESS - BACKLOG AUDIT")
    print("=" * 60)

    # Carregar issues
    issues = load_issues()
    print(f"✅ Carregadas {len(issues)} issues")

    # Executar auditoria
    results = audit_issues(issues)

    # Salvar resultados
    save_results(results)

    # Print summary
    print("\n" + "=" * 60)
    print("📊 RESUMO DA AUDITORIA")
    print("=" * 60)
    print(f"Total de issues: {results['metadata']['total_issues']}")
    print(f"Score médio: {results['summary']['avg_score']}%")
    print(f"Issues 100% conformes: {results['summary']['compliant_100']}")
    print(f"Issues 80%+ conformes: {results['summary']['compliant_80_plus']}")
    print(f"Issues não conformes (<80%): {results['summary']['non_compliant']}")
    print(f"Duplicatas detectadas: {len(results['duplicates'])}")
    print("=" * 60)


if __name__ == '__main__':
    main()
