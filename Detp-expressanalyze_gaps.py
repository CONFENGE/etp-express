import json

# Load issues data
with open('D:/etp-express/github-issues-audit.json', 'r') as f:
    issues = json.load(f)

# Find gaps in issue numbers
issue_numbers = sorted([i['number'] for i in issues])
all_numbers = set(range(1, max(issue_numbers) + 1))
existing = set(issue_numbers)
gaps = sorted(all_numbers - existing)

print(f"Total issues in GitHub: {len(issues)}")
print(f"Open: {len([i for i in issues if i['state'] == 'OPEN'])}")
print(f"Closed: {len([i for i in issues if i['state'] == 'CLOSED'])}")
print(f"Highest issue number: #{max(issue_numbers)}")
print(f"\nGaps in issue numbers: {len(gaps)} missing")
print(f"\nGap ranges:")

# Find continuous gap ranges
if gaps:
    ranges = []
    start = gaps[0]
    end = gaps[0]
    for num in gaps[1:]:
        if num == end + 1:
            end = num
        else:
            if start == end:
                ranges.append(f"#{start}")
            else:
                ranges.append(f"#{start}-#{end} ({end-start+1} issues)")
            start = num
            end = num
    if start == end:
        ranges.append(f"#{start}")
    else:
        ranges.append(f"#{start}-#{end} ({end-start+1} issues)")
    
    for r in ranges:
        print(r)
