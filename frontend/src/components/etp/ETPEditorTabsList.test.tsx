import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ETPEditorTabsList } from './ETPEditorTabsList';
import { Tabs } from '@/components/ui/tabs';

describe('ETPEditorTabsList', () => {
 const mockSections = [
 { id: '1', title: 'Seção 1', completed: false },
 { id: '2', title: 'Seção 2', completed: true },
 { id: '3', title: 'Seção 3', completed: false },
 ];

 it('should render all section tabs', () => {
 render(
 <Tabs defaultValue="1">
 <ETPEditorTabsList sections={mockSections} />
 </Tabs>,
 );

 expect(screen.getByRole('tab', { name: /seção 1/i })).toBeInTheDocument();
 expect(screen.getByRole('tab', { name: /seção 2/i })).toBeInTheDocument();
 expect(screen.getByRole('tab', { name: /seção 3/i })).toBeInTheDocument();
 });

 it('should show completed indicator () for completed sections', () => {
 render(
 <Tabs defaultValue="1">
 <ETPEditorTabsList sections={mockSections} />
 </Tabs>,
 );

 const completedTab = screen.getByRole('tab', { name: / seção 2/i });
 expect(completedTab).toBeInTheDocument();
 });

 it('should not show completed indicator for incomplete sections', () => {
 render(
 <Tabs defaultValue="1">
 <ETPEditorTabsList sections={mockSections} />
 </Tabs>,
 );

 const tab1 = screen.getByRole('tab', { name: /seção 1/i });
 const tab3 = screen.getByRole('tab', { name: /seção 3/i });

 expect(tab1.textContent).not.toContain('');
 expect(tab3.textContent).not.toContain('');
 });

 it('should render correct number of tabs', () => {
 render(
 <Tabs defaultValue="1">
 <ETPEditorTabsList sections={mockSections} />
 </Tabs>,
 );

 const tabs = screen.getAllByRole('tab');
 expect(tabs).toHaveLength(3);
 });

 it('should handle empty sections array', () => {
 render(
 <Tabs defaultValue="1">
 <ETPEditorTabsList sections={[]} />
 </Tabs>,
 );

 const tabs = screen.queryAllByRole('tab');
 expect(tabs).toHaveLength(0);
 });
});
