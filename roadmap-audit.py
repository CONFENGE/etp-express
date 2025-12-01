#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ROADMAP AUDIT SCRIPT
Cross-reference GitHub issues with ROADMAP.md
"""

import json
import re
from datetime import datetime, timedelta
from collections import defaultdict

# Load GitHub issues
with open('github-issues.json', 'r', encoding='utf-8') as f:
    issues = json.load(f)

# Load ROADMAP
with open('ROADMAP.md', 'r', encoding='utf-8') as f:
    roadmap = f.read()

print("═" * 63)
print("🎯 ROADMAP AUDIT - COMPREHENSIVE ANALYSIS")
print("═" * 63)
print()
print(f"Audit Date: {datetime.now().strftime('%Y-%m-%d')}")
print(f"Scope: {len(issues)} GitHub issues vs ROADMAP.md")
print()

# ============================================================================
# SECTION 1: ISSUE COUNT RECONCILIATION
# ============================================================================
print("📊 SECTION 1: ISSUE COUNT RECONCILIATION")
print("━" * 63)
print()

github_total = len(issues)
github_open = sum(1 for i in issues if i['state'] == 'OPEN')
github_closed = sum(1 for i in issues if i['state'] == 'CLOSED')

# Extract ROADMAP claimed total
roadmap_match = re.search(r'Progresso Global.*?(\d+)/(\d+)', roadmap)
if roadmap_match:
    roadmap_closed = int(roadmap_match.group(1))
    roadmap_total = int(roadmap_match.group(2))
else:
    roadmap_closed = 0
    roadmap_total = 0

drift = github_total - roadmap_total
drift_pct = round((drift / roadmap_total) * 100, 1) if roadmap_total > 0 else 0

print(f"ROADMAP.md:        {roadmap_total} issues ({roadmap_closed} closed)")
print(f"GitHub (actual):   {github_total} issues ({github_closed} closed)")
print(f"Drift:             {'+' if drift > 0 else ''}{drift} issues ({drift_pct}%)")

status = "🔴 CRITICAL" if abs(drift_pct) > 5 else "🟡 WARNING" if abs(drift_pct) > 2 else "🟢 ACCEPTABLE"
print(f"Status:            {status} drift")
print()

print("BREAKDOWN:")
print(f"  ✅ GitHub Total:          {github_total} issues")
print(f"  📝 ROADMAP Documented:    {roadmap_total} issues")
print(f"  ❌ Discrepancy:           {'+' if drift > 0 else ''}{drift} issues")
print()

# ============================================================================
# SECTION 2: MILESTONE PROGRESS VALIDATION
# ============================================================================
print("📈 SECTION 2: MILESTONE PROGRESS VALIDATION")
print("━" * 63)
print()

milestones_data = [
    {"name": "M1", "title": "M1: Foundation - Testes", "roadmap_total": 35, "roadmap_closed": 35},
    {"name": "M2", "title": "M2: CI/CD Pipeline", "roadmap_total": 18, "roadmap_closed": 18},
    {"name": "M3", "title": "M3: Quality & Security", "roadmap_total": 57, "roadmap_closed": 57},
    {"name": "M4", "title": "M4: Refactoring & Performance", "roadmap_total": 44, "roadmap_closed": 44},
    {"name": "M5", "title": "M5: E2E Testing & Documentation", "roadmap_total": 22, "roadmap_closed": 2},
    {"name": "M6", "title": "M6: Maintenance (Recurring)", "roadmap_total": 11, "roadmap_closed": 2},
    {"name": "M7", "title": "M7: Multi-Tenancy B2G", "roadmap_total": 6, "roadmap_closed": 0}
]

print("| Milestone | ROADMAP        | GitHub         | Sync | Notes                   |")
print("|-----------|----------------|----------------|------|-------------------------|")

for ms in milestones_data:
    gh_issues = [i for i in issues if i.get('milestone') and i['milestone']['title'] == ms['title']]
    gh_total = len(gh_issues)
    gh_closed = sum(1 for i in gh_issues if i['state'] == 'CLOSED')
    gh_pct = round((gh_closed / gh_total) * 100) if gh_total > 0 else 0

    roadmap_pct = round((ms['roadmap_closed'] / ms['roadmap_total']) * 100) if ms['roadmap_total'] > 0 else 0

    if gh_total == ms['roadmap_total'] and gh_closed == ms['roadmap_closed']:
        sync = "✅"
    elif abs(gh_closed - ms['roadmap_closed']) <= 2:
        sync = "⚠️"
    else:
        sync = "❌"

    roadmap_str = f"{ms['roadmap_closed']}/{ms['roadmap_total']} {roadmap_pct}%"
    gh_str = f"{gh_closed}/{gh_total} {gh_pct}%"

    if gh_total != ms['roadmap_total']:
        note = f"Count mismatch: {gh_total - ms['roadmap_total']:+d}"
    elif gh_closed != ms['roadmap_closed']:
        note = "Progress mismatch"
    else:
        note = "Perfect sync"

    print(f"| {ms['name']:<9} | {roadmap_str:<14} | {gh_str:<14} | {sync}    | {note:<23} |")

print()

# ============================================================================
# SECTION 3: ISSUE NUMBER ANALYSIS
# ============================================================================
print("🔍 SECTION 3: ISSUE NUMBER ANALYSIS")
print("━" * 63)
print()

all_issue_numbers = sorted([i['number'] for i in issues])
print(f"GitHub Issue Range: #{all_issue_numbers[0]} to #{all_issue_numbers[-1]}")
print(f"Total Issues in GitHub: {len(all_issue_numbers)}")
print()

# Extract all issue references from ROADMAP
issue_pattern = r'#(\d+)'
matches = re.findall(issue_pattern, roadmap)
documented_issues = sorted(list(set([int(m) for m in matches if int(m) <= 400])))

print(f"Issues Referenced in ROADMAP: {len(documented_issues)}")
print()

# Find orphans (in GitHub but not in ROADMAP)
orphans = [n for n in all_issue_numbers if n not in documented_issues]

print(f"🆕 ORPHAN ISSUES (In GitHub, NOT in ROADMAP): {len(orphans)}")
if orphans:
    orphan_details = [i for i in issues if i['number'] in orphans]
    orphan_details.sort(key=lambda x: x['number'])

    for orphan in orphan_details[:20]:
        ms = orphan.get('milestone', {}).get('title', 'No Milestone') if orphan.get('milestone') else 'No Milestone'
        print(f"  #{orphan['number']} - [{orphan['state'].upper()}] {orphan['title']}")
        print(f"    Milestone: {ms}")

    if len(orphans) > 20:
        print(f"  ... and {len(orphans) - 20} more orphan issues")
print()

# Find phantoms (in ROADMAP but not in GitHub)
phantoms = [n for n in documented_issues if n not in all_issue_numbers]

print(f"👻 PHANTOM ISSUES (In ROADMAP, NOT in GitHub): {len(phantoms)}")
if phantoms:
    print(f"  Phantom issue numbers: {', '.join(f'#{n}' for n in phantoms)}")
print()

# ============================================================================
# SECTION 4: VELOCITY & ETA
# ============================================================================
print("⏱️ SECTION 4: VELOCITY & ETA VALIDATION")
print("━" * 63)
print()

from datetime import timezone
seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
closed_last_7 = [i for i in issues if i.get('closedAt') and datetime.fromisoformat(i['closedAt'].replace('Z', '+00:00')) > seven_days_ago]
velocity = round(len(closed_last_7) / 7, 1)

print("ACTUAL VELOCITY (Last 7 days):")
print(f"  Issues closed: {len(closed_last_7)} issues")
print(f"  Average: {velocity} issues/day")
print()

# Extract ROADMAP claimed velocity
velocity_match = re.search(r'Velocidade:\*\*\s*(\d+\.?\d*)\s*issues/dia', roadmap)
if velocity_match:
    roadmap_velocity = float(velocity_match.group(1))
    print(f"ROADMAP Claimed Velocity: {roadmap_velocity} issues/day")
    velocity_diff = velocity - roadmap_velocity
    print(f"Velocity Accuracy: {'+' if velocity_diff > 0 else ''}{velocity_diff} issues/day")
print()

# Remaining work
remaining_open = github_open
days_to_complete = round(remaining_open / velocity, 1) if velocity > 0 else 0
projected_end = (datetime.now() + timedelta(days=days_to_complete)).strftime('%Y-%m-%d')

print("PROJECTION:")
print(f"  Remaining open issues: {remaining_open}")
print(f"  Days to complete: {days_to_complete} days (at current velocity)")
print(f"  Projected completion: {projected_end}")
print()

# ============================================================================
# SECTION 5: SUMMARY
# ============================================================================
print("═" * 63)
print("✅ AUDIT SUMMARY")
print("═" * 63)
print()

print("KEY FINDINGS:")
print(f"  1. Issue Count Drift: {'+' if drift > 0 else ''}{drift} issues ({drift_pct}%)")
print(f"  2. Orphan Issues: {len(orphans)} issues in GitHub not documented")
print(f"  3. Phantom Issues: {len(phantoms)} issues documented but don't exist")
print(f"  4. Velocity: {velocity} issues/day (last 7 days)")
print(f"  5. Projected Completion: {projected_end}")
print()

print("SYNC STATUS: ", end='')
if abs(drift_pct) < 2 and len(orphans) == 0 and len(phantoms) == 0:
    print("🟢 EXCELLENT (< 2% drift, no orphans/phantoms)")
elif abs(drift_pct) < 5 and len(orphans) <= 5 and len(phantoms) == 0:
    print("🟡 ACCEPTABLE (< 5% drift, minor orphans)")
else:
    print("🔴 NEEDS ATTENTION (>5% drift or issues detected)")
print()

print("═" * 63)
print("AUDIT COMPLETE")
print("═" * 63)
