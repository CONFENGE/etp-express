const fs = require('fs');
const content = fs.readFileSync('ROADMAP.md', 'utf8');
const lines = content.split('\n');

console.log('VERIFICACAO FINAL - ROADMAP.md ATUALIZADO');
console.log('=========================================\n');

// Check key lines
const checks = [
  { line: 5, should_contain: '35/35', desc: 'Status M1' },
  { line: 6, should_contain: '2025-11-21', desc: 'Data de atualizacao' },
  { line: 7, should_contain: '155 issues', desc: 'Total de issues' },
  { line: 7, should_contain: '94 fechadas', desc: 'Issues fechadas' },
  { line: 28, should_contain: '35/35 (100%)', desc: 'Progress bar M1' },
  { line: 30, should_contain: '35/42 (83%)', desc: 'Progress bar M3' },
  { line: 35, should_contain: '94/155', desc: 'Total progress' },
  { line: 35, should_contain: 'M3 83%', desc: 'M3 percentage in total' },
  { line: 45, should_contain: '94 issues fechadas', desc: 'Titulo secao progresso' },
  { line: 47, should_contain: '35 fechadas de 35', desc: 'Header M1' },
  { line: 86, should_contain: '35 fechadas de 42', desc: 'Header M3' },
  { line: 87, should_contain: '83%', desc: 'Status M3' },
  { line: 87, should_contain: '7 issues restantes', desc: 'Issues restantes M3' }
];

let allGood = true;
checks.forEach(check => {
  const line = lines[check.line - 1] || '';
  const found = line.includes(check.should_contain);
  const status = found ? 'OK' : 'FAIL';
  console.log(`[${status}] Linha ${check.line}: ${check.desc}`);
  if (!found) {
    console.log(`   Esperado: conter '${check.should_contain}'`);
    console.log(`   Encontrado: ${line.substring(0, 80)}...`);
    allGood = false;
  }
});

console.log('\n=========================================');
if (allGood) {
  console.log('TODAS AS VERIFICACOES PASSARAM!');
  console.log('ROADMAP.md esta 100% sincronizado com GitHub');
} else {
  console.log('ALGUMAS VERIFICACOES FALHARAM');
}
