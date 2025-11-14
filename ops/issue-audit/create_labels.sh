#!/bin/bash
# Create all necessary labels for issue categorization

echo "Criando labels do tipo TYPE..."
gh label create "type/feat" --description "New feature" --color "0052CC" --force
gh label create "type/fix" --description "Bug fix" --color "d73a4a" --force
gh label create "type/docs" --description "Documentation" --color "0075ca" --force
gh label create "type/test" --description "Testing" --color "d4c5f9" --force
gh label create "type/refactor" --description "Code refactoring" --color "fbca04" --force
gh label create "type/chore" --description "Maintenance tasks" --color "fef2c0" --force
gh label create "type/perf" --description "Performance improvement" --color "c2e0c6" --force
gh label create "type/ci" --description "CI/CD changes" --color "e99695" --force

echo "Criando labels de AREA..."
gh label create "area/backend" --description "Backend (NestJS)" --color "0052CC" --force
gh label create "area/frontend" --description "Frontend (React)" --color "1d76db" --force
gh label create "area/infra" --description "Infrastructure" --color "5319e7" --force
gh label create "area/security" --description "Security" --color "d73a4a" --force
gh label create "area/docs" --description "Documentation" --color "0075ca" --force
gh label create "area/auth" --description "Authentication/Authorization" --color "1d76db" --force
gh label create "area/etps" --description "ETPs module" --color "0052CC" --force
gh label create "area/sections" --description "Sections module" --color "0052CC" --force
gh label create "area/services" --description "Services layer" --color "0052CC" --force
gh label create "area/controllers" --description "Controllers layer" --color "0052CC" --force
gh label create "area/typescript" --description "TypeScript related" --color "3178c6" --force

echo "Criando labels de PRIORITY..."
gh label create "priority/P0" --description "Critical - Blocker" --color "d73a4a" --force
gh label create "priority/P1" --description "High priority" --color "ff6b6b" --force
gh label create "priority/P2" --description "Medium priority" --color "fbca04" --force
gh label create "priority/P3" --description "Low priority - Nice to have" --color "c2e0c6" --force

echo "Criando labels de RISK..."
gh label create "risk/high" --description "High risk" --color "d73a4a" --force
gh label create "risk/medium" --description "Medium risk" --color "fbca04" --force
gh label create "risk/low" --description "Low risk" --color "c2e0c6" --force

echo "Criando labels de SIZE/TIME..."
gh label create "time/S" --description "Small (1-4h)" --color "c2e0c6" --force
gh label create "time/M" --description "Medium (4-16h)" --color "fbca04" --force
gh label create "time/L" --description "Large (16h+)" --color "d73a4a" --force

echo "Criando labels de STATUS..."
gh label create "status/ready" --description "Ready to start" --color "0e8a16" --force
gh label create "status/blocked" --description "Blocked by dependencies" --color "d73a4a" --force
gh label create "status/in-progress" --description "Work in progress" --color "fbca04" --force

echo "✅ Todas as labels criadas!"
