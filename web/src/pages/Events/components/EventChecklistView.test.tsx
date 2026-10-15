import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { EventChecklistView, type ChecklistItem } from './EventChecklistView';

const items: ChecklistItem[] = [
  { id: 'a', name: 'Sillas', quantity: 50, unit: 'pza', section: 'equipment' },
  { id: 'b', name: 'Mesas', quantity: 10, unit: 'pza', section: 'equipment' },
];

const renderView = (props?: Partial<React.ComponentProps<typeof EventChecklistView>>) =>
  render(
    <EventChecklistView
      eventId="evt-1"
      event={{} as any}
      checklistItems={items}
      moneyLocale="es-MX"
      {...props}
    />,
  );

beforeEach(() => {
  localStorage.clear();
});

describe('EventChecklistView orphan pruning (P1.4)', () => {
  it('prunes restored ids that no longer exist and caps progress at 100%', async () => {
    localStorage.setItem('event_checklist_evt-1', JSON.stringify(['a', 'b', 'ghost']));
    const onProgressChange = vi.fn();
    renderView({ onProgressChange });

    await waitFor(() => {
      expect(onProgressChange).toHaveBeenCalledWith(2, 2, 1);
    });

    // Orphan is purged from storage too
    expect(JSON.parse(localStorage.getItem('event_checklist_evt-1')!)).toEqual(
      expect.arrayContaining(['a', 'b']),
    );
    expect(JSON.parse(localStorage.getItem('event_checklist_evt-1')!)).not.toContain('ghost');
  });

  it('keeps session toggles across refetch-shaped rerenders', async () => {
    const onProgressChange = vi.fn();
    const { rerender } = renderView({ onProgressChange });

    // Toggle one item on
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    await waitFor(() => {
      expect(onProgressChange).toHaveBeenCalledWith(1, 2, 0.5);
    });

    // Simulate a background refetch: same content, new array identity
    rerender(
      <EventChecklistView
        eventId="evt-1"
        event={{} as any}
        checklistItems={items.map((i) => ({ ...i }))}
        moneyLocale="es-MX"
        onProgressChange={onProgressChange}
      />,
    );

    // Toggle survives; progress unchanged
    await waitFor(() => {
      expect(onProgressChange).toHaveBeenLastCalledWith(1, 2, 0.5);
    });
    expect(JSON.parse(localStorage.getItem('event_checklist_evt-1')!)).toHaveLength(1);
  });
});
