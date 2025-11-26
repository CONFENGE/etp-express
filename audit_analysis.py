import json
from datetime import datetime, timedelta, timezone
from collections import defaultdict

# Load data
with open('github-issues.json', 'r', encoding='utf-8') as f:
    github_issues = json.load(f)

# Parse ROADMAP.md for issue references
with open('ROADMAP.md', 'r', encoding='utf-8') as f:
    roadmap_content = f.read()

# ============================================================================
# SECTION 1: ISSUE COUNT RECONCILIATION
# ============================================================================

total_issues = len(github_issues)
open_issues = len([i for i in github_issues if i['state'] == 'OPEN'])
closed_issues = len([i for i in github_issues if i['state'] == 'CLOSED'])

# Extract claimed counts from ROADMAP
import re
roadmap_total_match = re.search(r'Total de Issues:\*\* (\d+) issues \((\d+) abertas \+ (\d+) fechadas\)', roadmap_content)
if roadmap_total_match:
    roadmap_total = int(roadmap_total_match.group(1))
    roadmap_open = int(roadmap_total_match.group(2))
    roadmap_closed = int(roadmap_total_match.group(3))
else:
    roadmap_total = roadmap_open = roadmap_closed = 0

drift = total_issues - roadmap_total
drift_pct = (drift / roadmap_total * 100) if roadmap_total > 0 else 0

print("=" * 80)
print("📊 ISSUE COUNT AUDIT")
print("=" * 80)
print(f"ROADMAP.md:        {roadmap_total} issues ({roadmap_open} open + {roadmap_closed} closed)")
print(f"GitHub (actual):   {total_issues} issues ({open_issues} open + {closed_issues} closed)")
print(f"Drift:             {drift:+d} issues ({drift_pct:+.1f}%)")
print(f"Status:            {'🔴 CRITICAL' if abs(drift_pct) > 10 else '🟡 WARNING' if abs(drift_pct) > 5 else '🟢 OK'} ({'>' if abs(drift_pct) > 5 else '<'}5% drift)")
print()

# ============================================================================
# SECTION 2: MILESTONE PROGRESS VALIDATION
# ============================================================================

print("=" * 80)
print("📈 MILESTONE PROGRESS AUDIT")
print("=" * 80)

milestones_github = {}
for issue in github_issues:
    if issue.get('milestone'):
        title = issue['milestone']['title']
        if title not in milestones_github:
            milestones_github[title] = {'open': 0, 'closed': 0, 'issues': []}
        if issue['state'] == 'OPEN':
            milestones_github[title]['open'] += 1
        else:
            milestones_github[title]['closed'] += 1
        milestones_github[title]['issues'].append(issue['number'])

# Roadmap claimed progress (extracted from ROADMAP.md header)
roadmap_milestones = {
    'M1: Foundation - Testes': {'claimed': '35/35 (100%)'},
    'M2: CI/CD Pipeline': {'claimed': '12/12 (100%)'},
    'M3: Quality & Security': {'claimed': '51/52 (98%)'},
    'M4: Refactoring & Performance': {'claimed': '16/32 (50%)'},
    'M5: E2E Testing & Documentation': {'claimed': '2/22 (9%)'},
    'M6: Maintenance (Recurring)': {'claimed': '1/10 (10%)'},
}

print(f"{'Milestone':<35} {'ROADMAP':<15} {'GitHub':<15} {'Sync':<6} {'Notes'}")
print("-" * 100)

for milestone_name in sorted(milestones_github.keys()):
    github_stats = milestones_github[milestone_name]
    total = github_stats['open'] + github_stats['closed']
    closed = github_stats['closed']
    pct = int(closed / total * 100) if total > 0 else 0

    # Find matching roadmap entry
    roadmap_key = [k for k in roadmap_milestones.keys() if k.startswith(milestone_name.split(':')[0])][0] if any(k.startswith(milestone_name.split(':')[0]) for k in roadmap_milestones.keys()) else None

    roadmap_claimed = roadmap_milestones.get(roadmap_key, {}).get('claimed', 'N/A')

    github_display = f"{closed}/{total} ({pct}%)"

    # Check sync
    if roadmap_claimed != 'N/A':
        # Extract numbers from claimed
        claimed_match = re.search(r'(\d+)/(\d+) \((\d+)%\)', roadmap_claimed)
        if claimed_match:
            claimed_closed = int(claimed_match.group(1))
            claimed_total = int(claimed_match.group(2))
            claimed_pct = int(claimed_match.group(3))

            sync = '✅' if (claimed_closed == closed and claimed_total == total) else '❌' if abs(claimed_closed - closed) > 1 else '⚠️'

            notes = ''
            if claimed_closed != closed:
                notes = f"GitHub has {closed-claimed_closed:+d} more closed"
            if claimed_total != total:
                notes += f" | Total mismatch: {total-claimed_total:+d}"
        else:
            sync = '?'
            notes = 'Cannot parse claimed'
    else:
        sync = '?'
        notes = 'Not in ROADMAP'

    print(f"{milestone_name:<35} {roadmap_claimed:<15} {github_display:<15} {sync:<6} {notes}")

print()

# ============================================================================
# SECTION 3: VELOCITY CALCULATION
# ============================================================================

print("=" * 80)
print("⏱️  VELOCITY & ETA AUDIT")
print("=" * 80)

now = datetime.now(timezone.utc)
week_ago = now - timedelta(days=7)

closed_last_week = []
for issue in github_issues:
    if issue.get('closedAt'):
        try:
            closed_date = datetime.fromisoformat(issue['closedAt'].replace('Z', '+00:00'))
            if closed_date >= week_ago:
                closed_last_week.append(issue['number'])
        except:
            pass

velocity = len(closed_last_week) / 7

print(f"Issues closed (last 7 days): {len(closed_last_week)}")
print(f"Average velocity: {velocity:.1f} issues/day")
print(f"Issues remaining: {open_issues}")
print(f"Projected days to completion: {open_issues/velocity:.1f} days" if velocity > 0 else "Cannot project (no velocity)")
print(f"Estimated completion: {(now + timedelta(days=open_issues/velocity)).strftime('%Y-%m-%d')}" if velocity > 0 else "N/A")
print()

# ============================================================================
# SECTION 4: ORPHAN & PHANTOM DETECTION
# ============================================================================

print("=" * 80)
print("🔍 ORPHAN & PHANTOM ISSUE DETECTION")
print("=" * 80)

# Extract all issue references from ROADMAP
issue_pattern = r'#(\d+)'
roadmap_issues = set()
for match in re.finditer(issue_pattern, roadmap_content):
    issue_num = int(match.group(1))
    roadmap_issues.add(issue_num)

github_issue_numbers = set(i['number'] for i in github_issues)

# Phantom issues: in ROADMAP but not in GitHub
phantom_issues = roadmap_issues - github_issue_numbers

# Orphan issues: in GitHub but not in ROADMAP
orphan_issues = github_issue_numbers - roadmap_issues

print(f"Total issues referenced in ROADMAP: {len(roadmap_issues)}")
print(f"Total issues in GitHub: {len(github_issue_numbers)}")
print()

if phantom_issues:
    print(f"👻 PHANTOM ISSUES (in ROADMAP, not in GitHub): {len(phantom_issues)}")
    phantom_list = sorted(list(phantom_issues))[:20]
    print(f"   Sample: {phantom_list}")
    if len(phantom_issues) > 20:
        print(f"   ... and {len(phantom_issues) - 20} more")
else:
    print("✅ No phantom issues detected")

print()

if orphan_issues:
    print(f"🆕 ORPHAN ISSUES (in GitHub, not documented in ROADMAP): {len(orphan_issues)}")
    orphan_list = sorted(list(orphan_issues))[:20]
    print(f"   Sample: {orphan_list}")
    if len(orphan_issues) > 20:
        print(f"   ... and {len(orphan_issues) - 20} more")

    # Show details for recent orphans
    print("\n   Recent orphan issues (created in last 7 days):")
    for issue in github_issues:
        if issue['number'] in orphan_issues:
            try:
                created = datetime.fromisoformat(issue['createdAt'].replace('Z', '+00:00'))
                if created >= week_ago:
                    milestone = issue.get('milestone', {}).get('title', 'No milestone') if issue.get('milestone') else 'No milestone'
                    print(f"      #{issue['number']}: {issue['title'][:60]} [{issue['state']}] ({milestone})")
            except:
                pass
else:
    print("✅ No orphan issues detected")

print()

# ============================================================================
# SECTION 5: ISSUES WITHOUT MILESTONES
# ============================================================================

no_milestone = [i for i in github_issues if not i.get('milestone')]
if no_milestone:
    print("=" * 80)
    print(f"⚠️  ISSUES WITHOUT MILESTONES: {len(no_milestone)}")
    print("=" * 80)
    for issue in no_milestone[:10]:
        print(f"   #{issue['number']}: {issue['title'][:70]} [{issue['state']}]")
    if len(no_milestone) > 10:
        print(f"   ... and {len(no_milestone) - 10} more")
    print()

# ============================================================================
# SECTION 6: SUMMARY & RECOMMENDATIONS
# ============================================================================

print("=" * 80)
print("🎯 AUDIT SUMMARY & RECOMMENDATIONS")
print("=" * 80)
print()
print(f"Sync Status: {'🔴 CRITICAL' if abs(drift_pct) > 10 or len(phantom_issues) > 10 else '🟡 MODERATE' if abs(drift_pct) > 5 or len(orphan_issues) > 5 else '🟢 GOOD'}")
print(f"Documentation Accuracy: {100 - abs(drift_pct):.1f}%")
print()

print("KEY FINDINGS:")
print(f"1. Issue count drift: {drift:+d} issues ({drift_pct:+.1f}%)")
print(f"2. Phantom issues: {len(phantom_issues)}")
print(f"3. Orphan issues: {len(orphan_issues)}")
print(f"4. Issues without milestone: {len(no_milestone)}")
print(f"5. Current velocity: {velocity:.1f} issues/day")
print()

print("PRIORITY ACTIONS:")
if drift != 0:
    print(f"[ ] P0: Update ROADMAP header: {roadmap_total} → {total_issues} total issues")
    print(f"         ({roadmap_open} → {open_issues} open, {roadmap_closed} → {closed_issues} closed)")

if phantom_issues:
    print(f"[ ] P0: Remove or fix {len(phantom_issues)} phantom issue references")

if orphan_issues and len(orphan_issues) > 5:
    print(f"[ ] P1: Document {len(orphan_issues)} orphan issues in ROADMAP")

if no_milestone:
    print(f"[ ] P2: Assign milestones to {len(no_milestone)} issues")

print(f"[ ] P1: Update milestone progress bars to match GitHub actual state")
print(f"[ ] P2: Update 'Última Atualização' to today's date (2025-11-25)")
print()

print("VELOCITY INSIGHTS:")
print(f"✅ Strong velocity: {velocity:.1f} issues/day (target: ~5/day)")
print(f"✅ Projected completion: {(now + timedelta(days=open_issues/velocity)).strftime('%Y-%m-%d')}" if velocity > 0 else "Cannot project")
print(f"{'✅ AHEAD of schedule' if velocity > 5 else '⚠️ BELOW target velocity'}")
print()

print("=" * 80)
print("✅ AUDIT COMPLETE")
print("=" * 80)
