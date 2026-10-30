import {
  canSelectTableForNewOrder,
  getAssignedServerName,
  getServerAssignmentLabel,
  getTableStatus,
  isReservationActive,
  readActiveBillTables,
  tableHasActiveBill,
} from './tableAvailability';

describe('table availability', () => {
  const now = new Date(2026, 9, 30, 12, 0);

  it('blocks a table during an active reservation', () => {
    const table = {
      status: 'Available',
      reservation_is_active: 1,
      next_reservation_status: 'Confirmed',
      next_reservation_date: '2026-10-30',
    };

    expect(isReservationActive(table, now)).toBe(true);
    expect(getTableStatus(table, false, now)).toBe('Reserved');
    expect(canSelectTableForNewOrder(table, false, now)).toBe(false);
  });

  it('allows selection before a later reservation today', () => {
    const table = {
      status: 'Reserved',
      reservation_is_active: 0,
      next_reservation_status: 'Pending',
      next_reservation_date: '2026-10-30',
      next_reservation_start_time: '14:00:00',
      next_reservation_end_time: '16:00:00',
    };

    expect(getTableStatus(table, false, now)).toBe('Reserved');
    expect(canSelectTableForNewOrder(table, false, now)).toBe(true);
  });

  it('treats a stale Reserved status without an active reservation as Available', () => {
    const table = { status: 'Reserved', reservation_is_active: 0 };

    expect(getTableStatus(table, false, now)).toBe('Available');
    expect(canSelectTableForNewOrder(table, false, now)).toBe(true);
  });

  it('keeps an occupied table occupied even when reservation data is present', () => {
    const table = {
      status: 'Occupied',
      reservation_is_active: 1,
      next_reservation_status: 'Confirmed',
      next_reservation_date: '2026-10-30',
    };

    expect(getTableStatus(table, false, now)).toBe('Occupied');
    expect(canSelectTableForNewOrder(table, false, now)).toBe(false);
  });

  it('uses table IDs to detect active bills instead of matching duplicate numbers', () => {
    const activeBills = readActiveBillTables({
      success: true,
      bills: [{ bill_id: 7, table_id: 42, table_number: '5' }],
    });

    expect(
      tableHasActiveBill(
        { id: 43, table_number: '5' },
        activeBills,
      ),
    ).toBe(false);
    expect(
      tableHasActiveBill(
        { id: 42, table_number: '5' },
        activeBills,
      ),
    ).toBe(true);
  });

  it('reads the assigned server name from direct or nested table API fields', () => {
    expect(
      getAssignedServerName({
        assigned_server_name: 'Somwya T',
        assigned_server_id: 17,
      }),
    ).toBe('Somwya T');
    expect(
      getServerAssignmentLabel({
        assigned_server: { employee_id: 17, full_name: 'Somwya T' },
      }),
    ).toBe('Server: Somwya T');
    expect(
      getServerAssignmentLabel({ assigned_server_id: 17 }),
    ).toBe('Server: Assigned');
    expect(getServerAssignmentLabel({})).toBe('Server: Unassigned');
  });
});
