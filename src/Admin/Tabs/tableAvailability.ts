export type ReservationAwareTable = {
  status?: unknown;
  reservation_is_active?: unknown;
  next_reservation_status?: unknown;
  next_reservation_date?: unknown;
  next_reservation_start_time?: unknown;
  next_reservation_end_time?: unknown;
  next_reservation_customer_name?: unknown;
  next_reservation_guests?: unknown;
  assigned_server_id?: unknown;
  assigned_server_name?: unknown;
  assigned_employee_id?: unknown;
  assigned_employee_name?: unknown;
  server_id?: unknown;
  server_name?: unknown;
  employee_id?: unknown;
  employee_name?: unknown;
  assigned_server?: unknown;
  assigned_employee?: unknown;
  server?: unknown;
  employee?: unknown;
  assigned_to?: unknown;
  waiter_id?: unknown;
};

export type ActiveBillTableReference = {
  table_id?: unknown;
  table_number?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstName(...values: unknown[]) {
  return (
    values.find(
      (value): value is string =>
        typeof value === 'string' &&
        value.trim().length > 0 &&
        !/^\d+$/.test(value.trim()),
    )?.trim() ?? ''
  );
}

function nestedRecord(value: unknown) {
  return isRecord(value) ? value : null;
}

export function getAssignedServerName(table: ReservationAwareTable) {
  const assignedServer = nestedRecord(table.assigned_server);
  const assignedEmployee = nestedRecord(table.assigned_employee);
  const server = nestedRecord(table.server);
  const employee = nestedRecord(table.employee);
  return firstName(
    table.assigned_server,
    table.assigned_server_name,
    table.server_name,
    table.assigned_employee_name,
    table.employee_name,
    assignedServer?.full_name,
    assignedServer?.employee_name,
    assignedServer?.name,
    assignedEmployee?.full_name,
    assignedEmployee?.employee_name,
    assignedEmployee?.name,
    server?.full_name,
    server?.employee_name,
    server?.name,
    employee?.full_name,
    employee?.employee_name,
    employee?.name,
  );
}

export function hasAssignedServer(table: ReservationAwareTable) {
  return [
    table.assigned_server_id,
    table.assigned_employee_id,
    table.server_id,
    table.employee_id,
    table.assigned_to,
    table.waiter_id,
    nestedRecord(table.assigned_server)?.employee_id,
    nestedRecord(table.assigned_server)?.id,
    nestedRecord(table.assigned_employee)?.employee_id,
    nestedRecord(table.assigned_employee)?.id,
    nestedRecord(table.server)?.employee_id,
    nestedRecord(table.server)?.id,
    nestedRecord(table.employee)?.employee_id,
    nestedRecord(table.employee)?.id,
  ].some(
    value =>
      value !== undefined && value !== null && String(value).trim().length > 0,
  );
}

export function getServerAssignmentLabel(table: ReservationAwareTable) {
  const name = getAssignedServerName(table);
  return name
    ? `Server: ${name}`
    : `Server: ${hasAssignedServer(table) ? 'Assigned' : 'Unassigned'}`;
}

function readBillRows(payload: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 5) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (!isRecord(payload)) {
    return [];
  }
  if (
    ('bill_id' in payload || 'id' in payload) &&
    ('table_id' in payload || 'table_number' in payload)
  ) {
    return [payload];
  }
  for (const key of ['bills', 'table_bills', 'data', 'results']) {
    if (key in payload) {
      const rows = readBillRows(payload[key], depth + 1);
      if (rows.length || Array.isArray(payload[key])) {
        return rows;
      }
    }
  }
  return [];
}

export function readActiveBillTables(payload: unknown) {
  return readBillRows(payload)
    .map(bill => ({
      table_id: bill.table_id,
      table_number: bill.table_number,
    }))
    .filter(bill => bill.table_id != null || bill.table_number != null);
}

export function tableHasActiveBill(
  table: ReservationAwareTable & {
    id?: unknown;
    table_id?: unknown;
    table_number?: unknown;
  },
  activeBills: ActiveBillTableReference[],
) {
  const tableId = table.table_id ?? table.id;
  if (tableId != null) {
    return activeBills.some(
      bill =>
        bill.table_id != null && String(tableId) === String(bill.table_id),
    );
  }
  return activeBills.some(
    bill =>
      table.table_number != null &&
      bill.table_number != null &&
      String(table.table_number) === String(bill.table_number),
  );
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? '';
}

function normalizeTime(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }
  const match = value.trim().match(/^(\d{2}:\d{2})(?::\d{2})?/);
  return match?.[1] ?? '';
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1 ? true : value === 0 ? false : null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no'].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function hasPendingReservationToday(
  table: ReservationAwareTable,
  now: Date,
) {
  const status = String(table.next_reservation_status ?? '').toLowerCase();
  return (
    ['pending', 'confirmed'].includes(status) &&
    normalizeDate(table.next_reservation_date) === localDateString(now)
  );
}

export function isReservationActive(
  table: ReservationAwareTable,
  now = new Date(),
) {
  const activeFlag = parseBoolean(table.reservation_is_active);
  if (activeFlag !== null) {
    return activeFlag;
  }

  if (!hasPendingReservationToday(table, now)) {
    return false;
  }

  const start = normalizeTime(table.next_reservation_start_time);
  const end = normalizeTime(table.next_reservation_end_time);
  if (!start || !end) {
    return false;
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;
  return start <= currentTime && currentTime < end;
}

export function getTableStatus(
  table: ReservationAwareTable,
  hasActiveBill = false,
  now = new Date(),
) {
  const storedStatus = String(table.status ?? 'Available').trim();
  const normalizedStatus = storedStatus.toLowerCase();
  if (
    hasActiveBill ||
    normalizedStatus === 'occupied' ||
    normalizedStatus === 'busy' ||
    normalizedStatus === 'seated'
  ) {
    return 'Occupied';
  }

  if (
    isReservationActive(table, now) ||
    hasPendingReservationToday(table, now)
  ) {
    return 'Reserved';
  }

  if (
    normalizedStatus === 'reserved' ||
    normalizedStatus === 'available' ||
    !normalizedStatus
  ) {
    return 'Available';
  }
  return storedStatus;
}

export function canSelectTableForNewOrder(
  table: ReservationAwareTable,
  hasActiveBill = false,
  now = new Date(),
) {
  if (hasActiveBill || isReservationActive(table, now)) {
    return false;
  }
  const status = getTableStatus(table, false, now);
  return status === 'Available' || status === 'Reserved';
}

export function getReservationSummary(table: ReservationAwareTable) {
  const name =
    typeof table.next_reservation_customer_name === 'string'
      ? table.next_reservation_customer_name.trim()
      : '';
  const date = normalizeDate(table.next_reservation_date);
  const start = normalizeTime(table.next_reservation_start_time);
  const end = normalizeTime(table.next_reservation_end_time);
  const guests = table.next_reservation_guests;

  if (!date && !start && !end && !name) {
    return '';
  }
  return [
    name,
    date,
    start && end ? `${start}–${end}` : start || end,
    typeof guests === 'string' || typeof guests === 'number'
      ? `${guests} guests`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
