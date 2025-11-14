#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Backlog Audit & Prioritization Script
Analyzes GitHub issues for quality, dependencies, duplicates, and priority
"""

import json
import re
import sys
import io
from datetime import datetime
from typing import List, Dict, Any, Tuple
from difflib import SequenceMatcher
import subprocess

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class BacklogAuditor:
    def __init__(self):
        self.issues = []
        self.prs = []
        self.quality_report = []
        self.duplicates = []
        self.dependencies = {}
        self.risk_scores = {}
        self.wsjf_scores = {}
        self.rice_scores = {}

    def fetch_issues(self) -> List[Dict]:
        """Fetch all issues from GitHub"""
        cmd = [
            'gh', 'issue', 'list',
            '--limit', '1000',
            '--state', 'all',
            '--json', 'number,title,body,state,labels,assignees,milestone,createdAt,updatedAt,url'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        if result.stdout:
            self.issues = json.loads(result.stdout)
        return self.issues

    def fetch_prs(self) -> List[Dict]:
        """Fetch all PRs from GitHub"""
        cmd = [
            'gh', 'pr', 'list',
            '--state', 'all',
            '--json', 'number,title,body,state,labels,createdAt,updatedAt,url,mergedAt,baseRefName,headRefName'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        if result.stdout:
            self.prs = json.loads(result.stdout)
        return self.prs

    def extract_type_from_title(self, title: str) -> str:
        """Extract type from conventional commit title"""
        match = re.match(r'^(feat|fix|docs|test|refactor|chore|perf|style|ci)(\([^)]+\))?:', title)
        if match:
            return match.group(1)
        return 'unknown'

    def extract_area_from_title(self, title: str) -> str:
        """Extract area/scope from conventional commit title"""
        match = re.match(r'^[^(]+\(([^)]+)\):', title)
        if match:
            return match.group(1)
        return 'unknown'

    def validate_issue_quality(self, issue: Dict) -> Dict:
        """Validate issue against quality checklist"""
        validation = {
            'issue_number': issue['number'],
            'url': issue['url'],
            'title': issue['title'],
            'issues': [],
            'warnings': [],
            'score': 100
        }

        # Check title
        if not re.match(r'^(feat|fix|docs|test|refactor|chore|perf|style|ci)(\([^)]+\))?:', issue['title']):
            validation['issues'].append('Título não segue Conventional Commits')
            validation['score'] -= 10

        if len(issue['title']) > 100:
            validation['warnings'].append('Título muito longo (> 100 caracteres)')
            validation['score'] -= 5

        # Check body
        body = issue.get('body', '')
        if not body or len(body) < 100:
            validation['issues'].append('Descrição ausente ou muito curta (<100 caracteres)')
            validation['score'] -= 20

        # Check for criteria
        if not re.search(r'(acceptance criteria|critérios de aceitação|definition of done|dod)', body, re.IGNORECASE):
            validation['issues'].append('Faltam critérios de aceitação explícitos')
            validation['score'] -= 15

        # Check for estimate
        if not re.search(r'(estimat|hour|ponto|esforço)', body, re.IGNORECASE):
            validation['warnings'].append('Falta estimativa de esforço')
            validation['score'] -= 10

        # Check labels
        labels = [l['name'] for l in issue.get('labels', [])]

        has_type = any(l.startswith('type/') for l in labels)
        has_area = any(l.startswith('area/') for l in labels)
        has_priority = any(l.startswith('priority/') for l in labels)
        has_risk = any(l.startswith('risk/') for l in labels)

        if not has_type:
            validation['issues'].append('Falta label type/*')
            validation['score'] -= 10

        if not has_area:
            validation['warnings'].append('Falta label area/*')
            validation['score'] -= 5

        if not has_priority:
            validation['issues'].append('Falta label priority/P0..P3')
            validation['score'] -= 15

        if not has_risk:
            validation['warnings'].append('Falta label risk/*')
            validation['score'] -= 5

        # Check for dependencies
        if 'blocked by' in body.lower() or 'blocks' in body.lower() or re.search(r'#\d+', body):
            validation['has_dependencies'] = True
        else:
            validation['has_dependencies'] = False

        # Check milestone
        if not issue.get('milestone'):
            validation['warnings'].append('Sem milestone atribuída')
            validation['score'] -= 5

        return validation

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts"""
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()

    def find_duplicates(self) -> List[Dict]:
        """Find potential duplicate issues"""
        duplicates = []

        for i, issue1 in enumerate(self.issues):
            if issue1['state'] == 'CLOSED':
                continue

            for issue2 in self.issues[i+1:]:
                if issue2['state'] == 'CLOSED':
                    continue

                title_sim = self.calculate_similarity(issue1['title'], issue2['title'])
                body_sim = self.calculate_similarity(
                    issue1.get('body', ''),
                    issue2.get('body', '')
                )

                avg_sim = (title_sim + body_sim) / 2

                if avg_sim >= 0.85:
                    duplicates.append({
                        'issue1': issue1['number'],
                        'issue2': issue2['number'],
                        'similarity': avg_sim,
                        'title1': issue1['title'],
                        'title2': issue2['title'],
                        'canonical': min(issue1['number'], issue2['number'])
                    })

        self.duplicates = duplicates
        return duplicates

    def extract_dependencies(self) -> Dict:
        """Extract dependency graph from issues"""
        deps = {}

        for issue in self.issues:
            if issue['state'] == 'CLOSED':
                continue

            body = issue.get('body', '')
            number = issue['number']

            deps[number] = {
                'blocks': [],
                'blocked_by': []
            }

            # Find "blocked by" references
            blocked_by_match = re.findall(r'blocked by.*?#(\d+)', body, re.IGNORECASE)
            for ref in blocked_by_match:
                deps[number]['blocked_by'].append(int(ref))

            # Find "blocks" references
            blocks_match = re.findall(r'blocks.*?#(\d+)', body, re.IGNORECASE)
            for ref in blocks_match:
                deps[number]['blocks'].append(int(ref))

            # Find general issue references
            issue_refs = re.findall(r'#(\d+)', body)
            for ref in issue_refs:
                ref_num = int(ref)
                if ref_num != number and ref_num not in deps[number]['blocked_by']:
                    # Heuristic: if mentioned, likely a dependency
                    if 'depend' in body.lower() or 'prerequis' in body.lower():
                        deps[number]['blocked_by'].append(ref_num)

        self.dependencies = deps
        return deps

    def classify_risk(self, issue: Dict) -> Dict:
        """Classify risk level for an issue"""
        body = issue.get('body', '').lower()
        title = issue.get('title', '').lower()

        severity = 1  # S1-S4
        probability = 1  # P1-P4

        # Severity indicators
        if any(word in title or word in body for word in ['security', 'vulnerabilit', 'exploit', 'breach']):
            severity = 4
        elif any(word in title or word in body for word in ['data loss', 'corruption', 'crash', 'critical']):
            severity = 4
        elif any(word in title or word in body for word in ['auth', 'payment', 'billing']):
            severity = 3
        elif any(word in title or word in body for word in ['bug', 'error', 'broken']):
            severity = 2

        # Probability indicators (based on complexity, unknowns)
        if any(word in title or word in body for word in ['complex', 'difficult', 'unclear']):
            probability = 3
        elif any(word in title or word in body for word in ['new', 'experimental', 'prototype']):
            probability = 2

        risk_score = severity * probability

        if risk_score >= 12:
            risk_level = 'high'
        elif risk_score >= 6:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        self.risk_scores[issue['number']] = {
            'severity': severity,
            'probability': probability,
            'score': risk_score,
            'level': risk_level
        }

        return self.risk_scores[issue['number']]

    def calculate_wsjf(self, issue: Dict) -> float:
        """Calculate WSJF (Weighted Shortest Job First) score"""
        body = issue.get('body', '').lower()
        title = issue.get('title', '').lower()

        # User value (1-10)
        user_value = 5  # default
        if any(word in title or word in body for word in ['critical', 'blocker', 'user', 'customer']):
            user_value = 9
        elif 'feature' in title or 'feat' in title:
            user_value = 7

        # Business value (1-10)
        business_value = 5
        if any(word in title or word in body for word in ['revenue', 'conversion', 'retention']):
            business_value = 9
        elif any(word in title or word in body for word in ['security', 'compliance']):
            business_value = 8

        # Risk reduction (1-10)
        risk_reduction = self.risk_scores.get(issue['number'], {}).get('score', 5)

        # Time criticality (1-10)
        time_criticality = 5
        if any(word in title or word in body for word in ['urgent', 'asap', 'deadline']):
            time_criticality = 9
        elif issue.get('milestone'):
            time_criticality = 7

        # Size (estimated hours)
        size_match = re.search(r'(\d+)\s*(hour|hora)', body)
        if size_match:
            size = int(size_match.group(1))
        else:
            # Estimate based on type
            if 'test' in title:
                size = 8
            elif 'docs' in title:
                size = 4
            elif 'feat' in title:
                size = 16
            else:
                size = 8

        wsjf = (user_value + business_value + risk_reduction + time_criticality) / max(size, 1)

        self.wsjf_scores[issue['number']] = {
            'user_value': user_value,
            'business_value': business_value,
            'risk_reduction': risk_reduction,
            'time_criticality': time_criticality,
            'size': size,
            'wsjf': wsjf
        }

        return wsjf

    def calculate_rice(self, issue: Dict) -> float:
        """Calculate RICE (Reach × Impact × Confidence / Effort) score"""
        body = issue.get('body', '').lower()
        title = issue.get('title', '').lower()

        # Reach (1-10: how many users affected)
        reach = 5
        if 'all users' in body or 'everyone' in body:
            reach = 10
        elif any(word in title or word in body for word in ['core', 'critical', 'main']):
            reach = 8

        # Impact (1-10)
        impact = 5
        if any(word in title or word in body for word in ['major', 'significant', 'high impact']):
            impact = 9
        elif 'bug' in title or 'fix' in title:
            impact = 6

        # Confidence (0.0-1.0)
        confidence = 0.8
        if 'unclear' in body or 'uncertain' in body:
            confidence = 0.5
        elif 'prototype' in body or 'experiment' in body:
            confidence = 0.6

        # Effort (hours)
        size_match = re.search(r'(\d+)\s*(hour|hora)', body)
        if size_match:
            effort = int(size_match.group(1))
        else:
            effort = 8

        rice = (reach * impact * confidence) / max(effort, 1)

        self.rice_scores[issue['number']] = {
            'reach': reach,
            'impact': impact,
            'confidence': confidence,
            'effort': effort,
            'rice': rice
        }

        return rice

    def assign_priority(self, issue: Dict) -> str:
        """Assign priority level P0-P3 based on rules"""
        body = issue.get('body', '').lower()
        title = issue.get('title', '').lower()
        risk = self.risk_scores.get(issue['number'], {})

        # P0: Service interruption, data loss, security, release blocker
        if any(word in title or word in body for word in
               ['blocker', 'critical', 'security', 'data loss', 'service down', 'vulnerability']):
            if risk.get('level') == 'high':
                return 'P0'

        # P1: High impact on quarterly goals
        if any(word in title or word in body for word in ['milestone', 'goal', 'okr']):
            return 'P1'

        # P2: Relevant improvement
        if 'feat' in title or 'feature' in title:
            return 'P2'

        # P3: Nice-to-have
        return 'P3'

    def generate_fixup_suggestions(self, validation: Dict, issue: Dict) -> Dict:
        """Generate concrete fix suggestions for an issue"""
        suggestions = {
            'issue_number': issue['number'],
            'url': issue['url'],
            'current_title': issue['title'],
            'suggested_title': None,
            'suggested_body': None,
            'labels_to_add': [],
            'labels_to_remove': [],
            'comment': ''
        }

        # Fix title if needed
        if 'Título não segue Conventional Commits' in str(validation.get('issues', [])):
            type_map = {
                'test': 'test',
                'doc': 'docs',
                'security': 'fix',
                'bug': 'fix',
                'feature': 'feat'
            }

            title_lower = issue['title'].lower()
            for keyword, conv_type in type_map.items():
                if keyword in title_lower:
                    area = self.extract_area_from_title(issue['title']) or 'backend'
                    clean_title = re.sub(r'^[^\:]+:\s*', '', issue['title'])
                    suggestions['suggested_title'] = f"{conv_type}({area}): {clean_title}"
                    break

        # Suggest labels
        issue_type = self.extract_type_from_title(suggestions.get('suggested_title') or issue['title'])
        issue_area = self.extract_area_from_title(suggestions.get('suggested_title') or issue['title'])
        risk = self.risk_scores.get(issue['number'], {})
        priority = self.assign_priority(issue)

        suggestions['labels_to_add'].append(f'type/{issue_type}')
        suggestions['labels_to_add'].append(f'area/{issue_area}')
        suggestions['labels_to_add'].append(f'priority/{priority}')
        suggestions['labels_to_add'].append(f'risk/{risk.get("level", "low")}')

        # Generate comment
        if validation.get('score', 100) < 70:
            suggestions['comment'] = f"""## 🔍 Issue Quality Audit

**Quality Score:** {validation.get('score')}/100

**Issues Found:**
{chr(10).join(f'- ❌ {issue}' for issue in validation.get('issues', []))}

**Warnings:**
{chr(10).join(f'- ⚠️ {warning}' for warning in validation.get('warnings', []))}

**Recommended Actions:**
- Update title to follow Conventional Commits
- Add missing labels: {', '.join(suggestions['labels_to_add'])}
- Ensure description includes acceptance criteria
- Add effort estimate

**Priority:** {priority}
**Risk Level:** {risk.get('level', 'unknown')}
**WSJF Score:** {self.wsjf_scores.get(issue['number'], {}).get('wsjf', 0):.2f}
**RICE Score:** {self.rice_scores.get(issue['number'], {}).get('rice', 0):.2f}

---
🤖 Auto-generated by backlog audit
"""

        return suggestions

    def run_audit(self):
        """Run complete audit process"""
        print("🔍 Starting backlog audit...")

        print("📥 Fetching issues...")
        self.fetch_issues()

        print("📥 Fetching PRs...")
        self.fetch_prs()

        print(f"✅ Collected {len(self.issues)} issues and {len(self.prs)} PRs")

        print("\n🔎 Validating issue quality...")
        for issue in self.issues:
            if issue['state'] == 'OPEN':
                validation = self.validate_issue_quality(issue)
                self.quality_report.append(validation)

        print(f"✅ Validated {len(self.quality_report)} issues")

        print("\n🔎 Detecting duplicates...")
        self.find_duplicates()
        print(f"✅ Found {len(self.duplicates)} potential duplicates")

        print("\n🔎 Extracting dependencies...")
        self.extract_dependencies()
        print(f"✅ Mapped dependencies for {len(self.dependencies)} issues")

        print("\n🔎 Classifying risks...")
        for issue in self.issues:
            if issue['state'] == 'OPEN':
                self.classify_risk(issue)
        print(f"✅ Classified {len(self.risk_scores)} issues")

        print("\n🔎 Calculating WSJF scores...")
        for issue in self.issues:
            if issue['state'] == 'OPEN':
                self.calculate_wsjf(issue)
        print(f"✅ Calculated WSJF for {len(self.wsjf_scores)} issues")

        print("\n🔎 Calculating RICE scores...")
        for issue in self.issues:
            if issue['state'] == 'OPEN':
                self.calculate_rice(issue)
        print(f"✅ Calculated RICE for {len(self.rice_scores)} issues")

        print("\n✅ Audit complete!")

        return {
            'quality_report': self.quality_report,
            'duplicates': self.duplicates,
            'dependencies': self.dependencies,
            'risks': self.risk_scores,
            'wsjf': self.wsjf_scores,
            'rice': self.rice_scores
        }

if __name__ == '__main__':
    auditor = BacklogAuditor()
    results = auditor.run_audit()

    # Save results
    with open('ops/issue-audit/audit_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Results saved to ops/issue-audit/audit_results.json")
