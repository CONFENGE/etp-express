import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ImprovementList } from './ImprovementList';
import type { ReportIssue } from '@/types/analysis';

describe('ImprovementList', () => {
 const mockIssues: ReportIssue[] = [
 {
 dimension: 'legal',
 severity: 'critical',
 title: 'Referência legal ausente',
 description: 'O documento não menciona a Lei 14.133/2021',
 recommendation:
 'Adicione referência explícita ao artigo 6º da Lei 14.133/2021',
 },
 {
 dimension: 'clareza',
 severity: 'important',
 title: 'Texto muito técnico',
 description: 'Algumas seções contêm jargão excessivo',
 recommendation: 'Simplifique a linguagem para maior acessibilidade',
 },
 {
 dimension: 'fundamentacao',
 severity: 'suggestion',
 title: 'Justificativa pode ser melhorada',
 description: 'A justificativa técnica poderia ser mais detalhada',
 recommendation:
 'Adicione dados quantitativos para embasar a justificativa',
 },
 ];

 describe('Rendering', () => {
 it('renders all issues', () => {
 render(<ImprovementList issues={mockIssues} />);

 expect(screen.getByText('Referência legal ausente')).toBeInTheDocument();
 expect(screen.getByText('Texto muito técnico')).toBeInTheDocument();
 expect(
 screen.getByText('Justificativa pode ser melhorada'),
 ).toBeInTheDocument();
 });

 it('renders severity badges', () => {
 render(<ImprovementList issues={mockIssues} />);

 expect(screen.getByText('Crítico')).toBeInTheDocument();
 expect(screen.getByText('Importante')).toBeInTheDocument();
 expect(screen.getByText('Sugestão')).toBeInTheDocument();
 });

 it('renders tab for all issues', () => {
 render(<ImprovementList issues={mockIssues} />);

 expect(
 screen.getByRole('tab', { name: /todos \(3\)/i }),
 ).toBeInTheDocument();
 });

 it('renders tabs for dimensions with issues', () => {
 render(<ImprovementList issues={mockIssues} />);

 expect(
 screen.getByRole('tab', { name: /conformidade legal \(1\)/i }),
 ).toBeInTheDocument();
 expect(
 screen.getByRole('tab', { name: /clareza e legibilidade \(1\)/i }),
 ).toBeInTheDocument();
 expect(
 screen.getByRole('tab', { name: /qualidade da fundamentação \(1\)/i }),
 ).toBeInTheDocument();
 });
 });

 describe('Empty State', () => {
 it('shows empty state when no issues', () => {
 render(<ImprovementList issues={[]} />);

 expect(
 screen.getByText('Nenhum problema encontrado'),
 ).toBeInTheDocument();
 expect(
 screen.getByText(/o documento atende aos critérios de qualidade/i),
 ).toBeInTheDocument();
 });
 });

 describe('Expandable Recommendations', () => {
 it('hides recommendation by default', () => {
 render(<ImprovementList issues={mockIssues} />);

 // Recommendation text should not be visible initially
 expect(
 screen.queryByText(
 'Adicione referência explícita ao artigo 6º da Lei 14.133/2021',
 ),
 ).not.toBeInTheDocument();
 });

 it('shows recommendation when expanded', async () => {
 const user = userEvent.setup();
 render(<ImprovementList issues={mockIssues} />);

 const expandButtons = screen.getAllByRole('button', {
 name: /ver recomendação/i,
 });
 await user.click(expandButtons[0]);

 expect(
 screen.getByText(
 'Adicione referência explícita ao artigo 6º da Lei 14.133/2021',
 ),
 ).toBeInTheDocument();
 });

 it('hides recommendation when collapsed', async () => {
 const user = userEvent.setup();
 render(<ImprovementList issues={mockIssues} />);

 const expandButton = screen.getAllByRole('button', {
 name: /ver recomendação/i,
 })[0];
 await user.click(expandButton);

 const collapseButton = screen.getByRole('button', {
 name: /ocultar recomendação/i,
 });
 await user.click(collapseButton);

 expect(
 screen.queryByText(
 'Adicione referência explícita ao artigo 6º da Lei 14.133/2021',
 ),
 ).not.toBeInTheDocument();
 });
 });

 describe('Tab Navigation', () => {
 it('switches to dimension tab and shows filtered issues', async () => {
 const user = userEvent.setup();
 render(<ImprovementList issues={mockIssues} />);

 const legalTab = screen.getByRole('tab', { name: /conformidade legal/i });
 await user.click(legalTab);

 // Should show only legal issues
 expect(screen.getByText('Referência legal ausente')).toBeInTheDocument();
 // Other issues should not be visible in the active tab content
 // (they're hidden by tab content visibility, not removed from DOM)
 });
 });

 describe('Show More/Less', () => {
 it('shows "show more" button when issues exceed maxInitialItems', () => {
 const manyIssues: ReportIssue[] = Array.from({ length: 10 }, (_, i) => ({
 dimension: 'legal',
 severity: 'suggestion',
 title: `Issue ${i + 1}`,
 description: `Description ${i + 1}`,
 recommendation: `Recommendation ${i + 1}`,
 }));

 render(<ImprovementList issues={manyIssues} maxInitialItems={5} />);

 expect(
 screen.getByRole('button', { name: /ver mais 5 itens/i }),
 ).toBeInTheDocument();
 });

 it('shows all items when "show more" is clicked', async () => {
 const user = userEvent.setup();
 const manyIssues: ReportIssue[] = Array.from({ length: 10 }, (_, i) => ({
 dimension: 'legal',
 severity: 'suggestion',
 title: `Issue ${i + 1}`,
 description: `Description ${i + 1}`,
 recommendation: `Recommendation ${i + 1}`,
 }));

 render(<ImprovementList issues={manyIssues} maxInitialItems={5} />);

 const showMoreButton = screen.getByRole('button', {
 name: /ver mais 5 itens/i,
 });
 await user.click(showMoreButton);

 // All 10 issues should be visible
 for (let i = 1; i <= 10; i++) {
 expect(screen.getByText(`Issue ${i}`)).toBeInTheDocument();
 }
 });

 it('shows "show less" button after expanding', async () => {
 const user = userEvent.setup();
 const manyIssues: ReportIssue[] = Array.from({ length: 10 }, (_, i) => ({
 dimension: 'legal',
 severity: 'suggestion',
 title: `Issue ${i + 1}`,
 description: `Description ${i + 1}`,
 recommendation: `Recommendation ${i + 1}`,
 }));

 render(<ImprovementList issues={manyIssues} maxInitialItems={5} />);

 const showMoreButton = screen.getByRole('button', { name: /ver mais/i });
 await user.click(showMoreButton);

 expect(
 screen.getByRole('button', { name: /mostrar menos/i }),
 ).toBeInTheDocument();
 });
 });

 describe('Severity Sorting', () => {
 it('sorts issues by severity (critical first)', () => {
 const unsortedIssues: ReportIssue[] = [
 {
 dimension: 'legal',
 severity: 'suggestion',
 title: 'Suggestion Issue',
 description: 'Description',
 recommendation: 'Rec',
 },
 {
 dimension: 'legal',
 severity: 'critical',
 title: 'Critical Issue',
 description: 'Description',
 recommendation: 'Rec',
 },
 {
 dimension: 'legal',
 severity: 'important',
 title: 'Important Issue',
 description: 'Description',
 recommendation: 'Rec',
 },
 ];

 render(<ImprovementList issues={unsortedIssues} />);

 const items = screen.getAllByText(/issue/i);
 // First item should be Critical (index 0)
 expect(items[0]).toHaveTextContent('Critical Issue');
 });
 });

 describe('Severity Counts', () => {
 it('shows critical count badge', () => {
 const issuesWithCriticals: ReportIssue[] = [
 {
 dimension: 'legal',
 severity: 'critical',
 title: 'Critical 1',
 description: 'Desc',
 recommendation: 'Rec',
 },
 {
 dimension: 'legal',
 severity: 'critical',
 title: 'Critical 2',
 description: 'Desc',
 recommendation: 'Rec',
 },
 ];

 render(<ImprovementList issues={issuesWithCriticals} />);

 expect(screen.getByText('2 críticos')).toBeInTheDocument();
 });

 it('shows important count badge', () => {
 const issuesWithImportant: ReportIssue[] = [
 {
 dimension: 'legal',
 severity: 'important',
 title: 'Important 1',
 description: 'Desc',
 recommendation: 'Rec',
 },
 ];

 render(<ImprovementList issues={issuesWithImportant} />);

 expect(screen.getByText('1 importante')).toBeInTheDocument();
 });
 });

 describe('Default Expanded', () => {
 it('shows all items when defaultExpanded is true', () => {
 const manyIssues: ReportIssue[] = Array.from({ length: 10 }, (_, i) => ({
 dimension: 'legal',
 severity: 'suggestion',
 title: `Issue ${i + 1}`,
 description: `Description ${i + 1}`,
 recommendation: `Recommendation ${i + 1}`,
 }));

 render(
 <ImprovementList
 issues={manyIssues}
 maxInitialItems={5}
 defaultExpanded={true}
 />,
 );

 // All issues should be visible
 for (let i = 1; i <= 10; i++) {
 expect(screen.getByText(`Issue ${i}`)).toBeInTheDocument();
 }
 });
 });
});
