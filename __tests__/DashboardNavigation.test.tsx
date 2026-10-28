import React from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  type AlertButton,
} from 'react-native';
import { Path } from 'react-native-svg';
import ReactTestRenderer from 'react-test-renderer';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DashboardScreen from '../src/Admin/Navigation/DashboardScreen';
import { PlusIcon } from '../src/Admin/Navigation/NavigationIcons';
import api from '../api';

jest.mock('../api', () => ({
  __esModule: true,
  API_BASE_URL: 'https://restaurant.qtechx.com/api',
  default: {
    get: jest.fn(() => Promise.resolve({ data: { data: [] } })),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

const mountedDashboards: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(() => {
  ReactTestRenderer.act(() => {
    mountedDashboards.forEach(renderer => renderer.unmount());
    mountedDashboards.length = 0;
  });
});

async function renderDashboard() {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 400, height: 800 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <DashboardScreen
          user={{
            name: 'Maya Rivera',
            email: 'maya@example.com',
            user_id: 'user-123',
          }}
          onLogout={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });
  mountedDashboards.push(renderer!);
  return renderer!;
}

async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  accessibilityLabel: string,
) {
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ accessibilityLabel }).props.onPress();
  });
}

function hasText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  expectedText: string,
) {
  return renderer.root.findAllByType(Text).some(node => {
    const children = Array.isArray(node.props.children)
      ? node.props.children.join('')
      : node.props.children;
    return children === expectedText;
  });
}

async function openEmployeeManagement(
  renderer: ReactTestRenderer.ReactTestRenderer,
) {
  await press(renderer, 'More');
  await press(renderer, 'Open Staff & Employees');
}

test('navigates tabs and creates a session invoice from billing', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'Toggle sidebar');
  await press(renderer, 'Billing');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('WORKSPACE');
  expect(JSON.stringify(renderer.toJSON())).toContain('Invoice history');
  expect(JSON.stringify(renderer.toJSON())).toContain('No invoices yet');

  await press(renderer, 'New invoice');
  const nameField = renderer.root.findByProps({
    placeholder: 'Customer or invoice name',
  });
  const amountField = renderer.root.findByProps({ placeholder: '0.00' });

  await ReactTestRenderer.act(() => {
    nameField.props.onChangeText('Table 4');
    amountField.props.onChangeText('1250');
  });
  await press(renderer, 'Save Create Invoice');

  expect(JSON.stringify(renderer.toJSON())).toContain('Invoice history');
  expect(JSON.stringify(renderer.toJSON())).toContain('Table 4');
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test('opens the items screen from the bottom navigation', async () => {
  const renderer = await renderDashboard();

  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Items' }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 60));
  });

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Search items' }),
  ).toBeTruthy();
  await press(renderer, 'Open quick actions');
  await press(renderer, 'Add Product');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 60)),
  );
  expect(JSON.stringify(renderer.toJSON())).toContain('Add Food');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Food name' }),
  ).toBeTruthy();
});

test('navigates to Profile from the native account actions', async () => {
  const renderer = await renderDashboard();
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  await press(renderer, 'Open account actions for Maya Rivera');
  const accountButtons = alertSpy.mock.calls[0][2];
  await ReactTestRenderer.act(() => {
    accountButtons?.find(button => button.text === 'Profile')?.onPress?.();
  });

  expect(JSON.stringify(renderer.toJSON())).toContain('Your account details');
  alertSpy.mockRestore();
});

test('opens category management from the More tab', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'More');
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Open Categories',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 60)),
  );
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Search categories' }),
  ).toBeTruthy();
  expect(renderer.root.findByType(SafeAreaView).props.edges).toEqual([
    'bottom',
  ]);

  await press(renderer, 'Back to More');

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Open Categories' }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Toggle sidebar' }),
  ).toBeTruthy();
});

test('opens the cuisines list from the More tab', async () => {
  const renderer = await renderDashboard();
  await press(renderer, 'More');
  await press(renderer, 'Open Cuisines');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Search cuisines' }),
  ).toBeTruthy();
  expect(JSON.stringify(renderer.toJSON())).toContain('All Cuisines');
  await press(renderer, 'Add cuisine');

  expect(JSON.stringify(renderer.toJSON())).toContain('Add Cuisine');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Cuisine name' }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Cuisine ID' }),
  ).toBeTruthy();
}, 15000);

test('opens the Tables card from the More tab', async () => {
  const renderer = await renderDashboard();

  (api.get as jest.Mock).mockImplementationOnce(() =>
    Promise.resolve({
      data: {
        data: [
          {
            table_id: 'table-7',
            table_number: 't7',
            no_of_seats: 6,
            status: 'Available',
          },
        ],
      },
    }),
  );
  await press(renderer, 'Toggle sidebar');
  const sidebarMore = renderer.root
    .findAllByProps({ accessibilityLabel: 'More' })
    .find(item => item.props.accessibilityRole === 'button');
  expect(sidebarMore).toBeTruthy();
  await ReactTestRenderer.act(() => sidebarMore!.props.onPress());
  await press(renderer, 'Open Tables');

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Search tables' }),
  ).toBeTruthy();
  expect(JSON.stringify(renderer.toJSON())).not.toContain('WORKSPACE');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Add table' }),
  ).toBeTruthy();
  expect(api.get).toHaveBeenCalledWith(
    '/server-tables',
    expect.objectContaining({ headers: expect.any(Object) }),
  );
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );
  expect(hasText(renderer, 'Table t7')).toBe(true);
});

test('adds a table from the Tables screen', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'More');
  await press(renderer, 'Open Tables');
  await press(renderer, 'Add table');

  expect(hasText(renderer, 'Add new table')).toBe(true);
  expect(renderer.root.findByType(KeyboardAvoidingView).props.behavior).toBe(
    Platform.OS === 'ios' ? 'padding' : 'height',
  );
  expect(
    renderer.root
      .findAllByType(ScrollView)
      .some(scrollView => scrollView.props.keyboardDismissMode === 'on-drag'),
  ).toBe(true);
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Table number' })
      .props.onChangeText('t7');
    renderer.root
      .findByProps({ accessibilityLabel: 'Number of seats' })
      .props.onChangeText('6');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Save table' })
      .props.onPress();
  });

  expect(api.post).toHaveBeenCalledWith('/server-tables', {
    table_number: 't7',
    no_of_seats: 6,
    image_url: null,
    status: 'Available',
    user_id: 'user-123',
  });
});

test('uploads an image and saves its URL with a new table', async () => {
  const renderer = await renderDashboard();
  const post = api.post as jest.Mock;
  post.mockReset();
  (launchImageLibrary as jest.Mock).mockResolvedValueOnce({
    assets: [
      {
        uri: 'file:///table.jpg',
        fileName: 'table.jpg',
        type: 'image/jpeg',
      },
    ],
  });
  post.mockResolvedValueOnce({
    data: { url: '/uploads/table.jpg' },
  });

  await press(renderer, 'More');
  await press(renderer, 'Open Tables');
  await press(renderer, 'Add table');
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Table number' })
      .props.onChangeText('t8');
    renderer.root
      .findByProps({ accessibilityLabel: 'Number of seats' })
      .props.onChangeText('4');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({
        accessibilityLabel: 'Upload table image',
      })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Save table' })
      .props.onPress();
  });

  expect(launchImageLibrary).toHaveBeenCalledWith({
    mediaType: 'photo',
    selectionLimit: 1,
  });
  expect(api.post).toHaveBeenNthCalledWith(
    1,
    '/upload',
    expect.any(FormData),
    expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
  expect(api.post).toHaveBeenNthCalledWith(2, '/server-tables', {
    table_number: 't8',
    no_of_seats: 4,
    image_url: '/uploads/table.jpg',
    status: 'Available',
    user_id: 'user-123',
  });
}, 15000);

test('retries table loading when the API responds 304', async () => {
  const renderer = await renderDashboard();
  const get = api.get as jest.Mock;
  get
    .mockImplementationOnce(() =>
      Promise.reject({ status: 304, message: 'Not Modified' }),
    )
    .mockImplementationOnce(() =>
      Promise.resolve({
        data: { data: [{ table_number: 'T-2', no_of_seats: 4 }] },
      }),
    );

  await press(renderer, 'More');
  await press(renderer, 'Open Tables');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );

  expect(get).toHaveBeenCalledWith(
    '/server-tables',
    expect.objectContaining({
      params: expect.objectContaining({ _refresh: expect.any(Number) }),
    }),
  );
  expect(hasText(renderer, 'Table T-2')).toBe(true);
});

test('opens the dedicated Add Category page from the Items FAB', async () => {
  const renderer = await renderDashboard();
  await press(renderer, 'Items');
  await press(renderer, 'Open quick actions');
  await press(renderer, 'Add Category');

  expect(JSON.stringify(renderer.toJSON())).toContain('Add Category');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Category name' }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Back to categories' }),
  ).toBeTruthy();
});

test('opens the dedicated Add Cuisine page from the Items FAB', async () => {
  const renderer = await renderDashboard();
  await press(renderer, 'Items');
  await press(renderer, 'Open quick actions');
  await press(renderer, 'Add Cuisine');

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Cuisine name' }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Cuisine ID' }),
  ).toBeTruthy();
}, 15000);

test('hides the dashboard header on food details and restores it on back', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/foods') {
      return Promise.resolve({
        data: {
          data: [
            {
              food_id: 'FOOD002',
              food_name: 'Idli Sambar',
              final_price: '27.00',
            },
          ],
        },
      });
    }
    if (path === '/foods/FOOD002') {
      return Promise.resolve({
        data: {
          data: {
            food_id: 'FOOD002',
            food_name: 'Idli Sambar',
            final_price: '27.00',
            food_images: [],
          },
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });
  const renderer = await renderDashboard();
  await press(renderer, 'Items');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );
  await press(renderer, 'View details of Idli Sambar');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );

  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Toggle sidebar' }),
  ).toHaveLength(0);
  expect(JSON.stringify(renderer.toJSON())).toContain('Idli Sambar');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Back to items' }),
  ).toBeTruthy();

  await press(renderer, 'Back to items');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Toggle sidebar' }),
  ).toBeTruthy();
});

test('adds an order and updates its status from the order details sheet', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'Orders');
  expect(JSON.stringify(renderer.toJSON())).toContain('No orders');
  await press(renderer, 'Add Order');

  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ placeholder: 'Order or customer name' })
      .props.onChangeText('Order 1001');
    renderer.root
      .findByProps({ placeholder: '0.00' })
      .props.onChangeText('840');
  });
  await press(renderer, 'Save Add Order');
  await press(renderer, 'Orders');
  await press(renderer, 'View order Order 1001');
  await press(renderer, 'Set order status to Completed');
  expect(JSON.stringify(renderer.toJSON())).toContain('Completed');

  await press(renderer, 'Close order details');
  await press(renderer, 'Filter orders by Completed');
  expect(JSON.stringify(renderer.toJSON())).toContain('Order 1001');
});

test('opens the delivery assignment page from the Orders floating action button', async () => {
  jest.setTimeout(15000);
  const get = api.get as jest.Mock;
  const patch = api.patch as jest.Mock;
  let partnerRequestCount = 0;
  get.mockImplementation((path: string, config?: { params?: Record<string, unknown> }) => {
    if (
      path === '/orders/management' &&
      config?.params?.order_type === 'home_delivery'
    ) {
      return Promise.resolve({
        data: {
          orders: [
            {
              order_id: 'ORD020',
              customer_name: 'Nishanth',
              order_type: 'home_delivery',
              order_status: 'Pending',
            },
            {
              order_id: 'ORD018',
              customer_name: 'Dine In Customer',
              order_type: 'dine_in',
            },
            {
              order_id: 'ORD019',
              customer_name: 'Takeaway Customer',
              order_type: 'takeaway',
            },
            {
              order_id: 'ORD017',
              customer_name: 'Unspecified Order Type',
            },
            {
              order_id: 'ORD016',
              customer_name: 'Already Assigned',
              order_type: 'home_delivery',
              delivery_partner_id: 13,
              order_status: 'Confirmed',
            },
            {
              order_id: 'ORD015',
              customer_name: 'Assignment Status',
              order_type: 'home_delivery',
              assignment_status: 'assigned',
            },
          ],
        },
      });
    }
    if (path === '/delivery-partners') {
      partnerRequestCount += 1;
      if (partnerRequestCount === 1) {
        return Promise.reject({ status: 304 });
      }
      return Promise.resolve({
        data: {
          delivery_partners: [
            {
              delivery_partner_id: 12,
              full_name: 'Akshayaa',
              phone_number: '06929592041',
              is_online: false,
              available_for_delivery: true,
              today_shift_state: 'Off Shift',
            },
            {
              delivery_partner_id: 13,
              full_name: 'Thanvika',
              phone_number: '9078438392',
              is_online: true,
              available_for_delivery: true,
              today_shift_state: 'Available',
            },
            {
              delivery_partner_id: 14,
              full_name: 'Offline but available',
              is_online: false,
              available_for_delivery: true,
              today_shift_state: 'Available',
            },
            {
              delivery_partner_id: 17,
              full_name: 'On shift but not online',
              available_for_delivery: true,
              today_shift_state: 'Available',
            },
            {
              delivery_partner_id: 18,
              full_name: 'Online but unavailable',
              available_for_delivery: false,
              today_shift_state: 'Available',
            },
          ],
        },
      });
    }
    if (path === '/attendance/today') {
      return Promise.resolve({
        data: {
          attendance: [
            { employee_id: 12, status: 'offline' },
            { employee_id: 13, status: 'online' },
            { employee_id: 14, status: 'offline' },
            { employee_id: 17, status: 'available' },
            { employee_id: 18, status: 'online' },
          ],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });
  patch.mockResolvedValueOnce({ data: { message: 'Assigned' } });

  const renderer = await renderDashboard();

  await press(renderer, 'Orders');
  await press(renderer, 'Assign order to delivery');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );

  expect(JSON.stringify(renderer.toJSON())).toContain('Assign Delivery Partner');
  expect(JSON.stringify(renderer.toJSON())).toContain('ORD020 · Nishanth');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('ORD018');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('ORD019');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('ORD017');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('ORD016');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('ORD015');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Takeaway Customer');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Unspecified Order Type');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Already Assigned');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Assignment Status');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Akshayaa');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Offline but available');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('On shift but not online');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Online but unavailable');
  expect(JSON.stringify(renderer.toJSON())).toContain('Thanvika');
  expect(get).toHaveBeenCalledWith(
    '/orders/management',
    expect.objectContaining({ params: { order_type: 'home_delivery' } }),
  );
  expect(get).toHaveBeenCalledWith(
    '/delivery-partners',
    expect.objectContaining({ params: { all: true } }),
  );
  expect(get).toHaveBeenCalledWith(
    '/delivery-partners',
    expect.objectContaining({
      params: { all: true, _refresh: expect.any(String) },
    }),
  );

  await press(renderer, 'Select delivery partner Thanvika');
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Assign Delivery Partner' })
      .props.onPress();
  });
  expect(patch).toHaveBeenCalledWith(
    '/orders/management/ORD020/status',
    {
      status: 'assigned',
      delivery_partner_id: '13',
    },
  );
  expect(get).toHaveBeenCalledWith(
    '/delivery-partners',
    expect.objectContaining({
      params: { all: true, _refresh: expect.any(String) },
    }),
  );
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Delivery partner assigned successfully. The order was removed from the assignment list.',
  );
  expect(JSON.stringify(renderer.toJSON())).not.toContain('ORD020 · Nishanth');

  await press(renderer, 'Back to Orders');
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Assign order to delivery',
    }),
  ).toBeTruthy();
});

test('blocks assignment when a selected partner goes offline', async () => {
  const get = api.get as jest.Mock;
  const patch = api.patch as jest.Mock;
  let attendanceRequestCount = 0;
  get.mockImplementation((path: string) => {
    if (path === '/orders/management') {
      return Promise.resolve({
        data: {
          orders: [
            {
              order_id: 'ORD021',
              customer_name: 'Nishanth',
              order_type: 'home_delivery',
              order_status: 'Pending',
            },
          ],
        },
      });
    }
    if (path === '/delivery-partners') {
      return Promise.resolve({
        data: {
          delivery_partners: [
            {
              delivery_partner_id: 15,
              full_name: 'Thanvika',
              is_online: true,
              available_for_delivery: true,
            },
          ],
        },
      });
    }
    if (path === '/attendance/today') {
      attendanceRequestCount += 1;
      return Promise.resolve({
        data: {
          attendance: [
            {
              employee_id: 15,
              status: attendanceRequestCount === 1 ? 'online' : 'offline',
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });
  patch.mockClear();

  const renderer = await renderDashboard();
  await press(renderer, 'Orders');
  await press(renderer, 'Assign order to delivery');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );
  const assignButton = renderer.root.findByProps({
    accessibilityLabel: 'Assign Delivery Partner',
  });
  expect(assignButton.props.disabled).toBe(true);

  await press(renderer, 'Select delivery partner Thanvika');
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Assign Delivery Partner',
    }).props.disabled,
  ).toBe(false);
  await press(renderer, 'Assign Delivery Partner');

  expect(patch).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'This delivery partner is offline. Please select another online partner.',
  );
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Assign Delivery Partner',
    }).props.disabled,
  ).toBe(true);
}, 15000);

test('shows an empty state and refresh action when all partners are offline', async () => {
  const get = api.get as jest.Mock;
  let partnerRequestCount = 0;
  get.mockImplementation((path: string) => {
    if (path === '/orders/management') {
      return Promise.resolve({
        data: {
          orders: [
            {
              order_id: 'ORD022',
              customer_name: 'Nishanth',
              order_type: 'home_delivery',
              order_status: 'Pending',
            },
          ],
        },
      });
    }
    if (path === '/delivery-partners') {
      partnerRequestCount += 1;
      return Promise.resolve({
        data: {
          delivery_partners: [
            {
              delivery_partner_id: 16,
              full_name: 'Offline partner',
              is_online: false,
              available_for_delivery: true,
              today_shift_state: 'Available',
            },
          ],
        },
      });
    }
    if (path === '/attendance/today') {
      return Promise.resolve({
        data: {
          attendance: [{ employee_id: 16, status: 'offline' }],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await press(renderer, 'Orders');
  await press(renderer, 'Assign order to delivery');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );

  expect(JSON.stringify(renderer.toJSON())).toContain(
    'No delivery partners are currently online.',
  );
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Offline partner');
  const previousRequestCount = partnerRequestCount;
  await press(renderer, 'Refresh delivery partners');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );
  expect(partnerRequestCount).toBeGreaterThan(previousRequestCount);
}, 15000);

test('shows clocked-in delivery partners returned by the employees endpoint', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/orders/management') {
      return Promise.resolve({
        data: {
          orders: [
            {
              order_id: 'ORD023',
              customer_name: 'Nishanth',
              order_type: 'home_delivery',
              order_status: 'Pending',
            },
          ],
        },
      });
    }
    if (path === '/delivery-partners') {
      return Promise.resolve({ data: { delivery_partners: [] } });
    }
    if (path === '/employees') {
      return Promise.resolve({
        data: {
          employees: [
            {
              employee_id: 23,
              employee_type: 'Delivery Partner',
              full_name: 'Clocked In Partner',
              available_for_delivery: true,
              today_attendance_status: 'Clocked In',
            },
            {
              employee_id: 24,
              employee_type: 'Delivery Partner',
              full_name: 'Not Clocked In Partner',
              available_for_delivery: true,
              today_attendance_status: 'Not Clocked In',
            },
          ],
        },
      });
    }
    if (path === '/attendance/today') {
      return Promise.resolve({ data: { attendance: [] } });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await press(renderer, 'Orders');
  await press(renderer, 'Assign order to delivery');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );

  expect(JSON.stringify(renderer.toJSON())).toContain('Clocked In Partner');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Not Clocked In Partner');
}, 15000);

test('renders the plus icon as visible horizontal and vertical strokes', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<PlusIcon color="#FFFFFF" size={27} />);
  });

  const plusStroke = renderer!.root.findByType(Path);
  expect(plusStroke.props.d).toBe('M12 5v14M5 12h14');
  expect(plusStroke.props.stroke).toBe('#FFFFFF');
  expect(plusStroke.props.strokeWidth).toBe('3');
});

test('adds food from the plus tab to billing and creates an invoice', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) =>
    Promise.resolve({
      data:
        path === '/foods'
          ? {
              data: {
                products: [
                  {
                    food_id: 1,
                    food_name: 'Masala Dosa',
                    selling_price: '325.00',
                    description:
                      'Crispy rice and lentil crepe with potato masala',
                    stock_quantity: 8,
                    status: 'Available',
                    size_variants: [
                      { size_name: 'Regular', selling_price: 325 },
                    ],
                    food_images: [{ image_url: '/uploads/masala-dosa.jpg' }],
                  },
                  {
                    food_id: 2,
                    food_name: 'Price Missing Food',
                  },
                  {
                    id: 45,
                    food_id: 'FOOD043',
                    food_name: 'Pineapple Fried Rice',
                    cuisine_id: 'CUS011',
                    cuisine_name: 'Thai',
                    category_name: 'Main Course',
                    subcategory_name: 'Rice',
                    mrp: '324.00',
                    discount: '21.00',
                    final_price: '255.96',
                    image_url: '/uploads/pineapple-fried-rice.jpg',
                  },
                ],
              },
            }
          : { data: [] },
    }),
  );
  const renderer = await renderDashboard();
  const addTab = renderer.root.findByProps({
    accessibilityLabel: 'Add',
  });
  expect(addTab.props.accessibilityRole).toBe('tab');
  await ReactTestRenderer.act(async () => {
    addTab.props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('Add food to billing');
  expect(JSON.stringify(renderer.toJSON())).toContain('Masala Dosa');
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Crispy rice and lentil crepe',
  );
  expect(JSON.stringify(renderer.toJSON())).toContain('Regular · ₹325.00');
  expect(JSON.stringify(renderer.toJSON())).toContain('8 in stock · Available');
  expect(JSON.stringify(renderer.toJSON())).toContain('Pineapple Fried Rice');
  expect(JSON.stringify(renderer.toJSON())).toContain('FOOD043');
  expect(JSON.stringify(renderer.toJSON())).toContain('CUS011');
  expect(get).toHaveBeenCalledWith(
    '/foods',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(
    renderer.root
      .findByProps({ accessibilityLabel: 'Masala Dosa image' })
      .findByType(Image).props.source,
  ).toEqual({
    uri: 'https://restaurant.qtechx.com/uploads/masala-dosa.jpg',
  });

  await press(renderer, 'Add Price Missing Food to billing');
  expect(JSON.stringify(renderer.toJSON())).toContain('Price Missing Food');
  expect(JSON.stringify(renderer.toJSON())).toContain('Price needed');
  await press(renderer, 'Add Pineapple Fried Rice to billing');
  expect(JSON.stringify(renderer.toJSON())).toContain('Pineapple Fried Rice');
  expect(JSON.stringify(renderer.toJSON())).toContain('₹255.96');

  await press(renderer, 'Add Masala Dosa to billing');
  expect(JSON.stringify(renderer.toJSON())).toContain('Bill preview');
  expect(JSON.stringify(renderer.toJSON())).toContain('Masala Dosa');
  expect(JSON.stringify(renderer.toJSON())).toContain('Review bill');
  expect(JSON.stringify(renderer.toJSON())).toContain('₹325.00');
  await press(renderer, 'Review bill');
  expect(JSON.stringify(renderer.toJSON())).toContain('Invoice / Bill');
  expect(JSON.stringify(renderer.toJSON())).toContain('Subtotal');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Send bill' }).props
      .disabled,
  ).toBe(true);
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Back to food items' }),
  ).toHaveLength(0);
  await press(renderer, 'Decrease Price Missing Food quantity');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Send bill' }).props
      .disabled,
  ).toBe(false);
  await press(renderer, 'Decrease Pineapple Fried Rice quantity');
  await press(renderer, 'Increase Masala Dosa quantity');
  expect(JSON.stringify(renderer.toJSON())).toContain('₹650.00');
  await press(renderer, 'Preview Bill');
  expect(JSON.stringify(renderer.toJSON())).toContain('Bill Preview');
  expect(JSON.stringify(renderer.toJSON())).toContain('Subtotal: ₹650.00');
  await press(renderer, 'Close bill preview');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Print Bill' }),
  ).toBeTruthy();
  await press(renderer, 'Send bill');
  expect(JSON.stringify(renderer.toJSON())).toContain('Food billing - 1 item');
  expect(JSON.stringify(renderer.toJSON())).toContain('₹650.00');
});

test('opens banner management from the More tab', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'More');

  expect(JSON.stringify(renderer.toJSON())).toContain('Banner Management');
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Customers' }),
  ).toHaveLength(0);

  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Open Banner Management',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('WEBSITE CONTENT');
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Create, edit, and publish your website banners.',
  );
  expect(api.get).toHaveBeenCalledWith('/banners');

  await press(renderer, 'Add banner');
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ placeholder: 'Banner title' })
      .props.onChangeText('Weekend offer');
    renderer.root
      .findByProps({
        placeholder: 'https://example.com/banner.jpg',
      })
      .props.onChangeText('https://example.com/weekend.jpg');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Create banner' })
      .props.onPress();
  });

  expect(api.post).toHaveBeenCalledWith(
    '/banners',
    expect.objectContaining({
      title: 'Weekend offer',
      image: 'https://example.com/weekend.jpg',
      type: 'hero',
      active: true,
    }),
  );
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Banner added successfully.',
  );

  await press(renderer, 'Back to More');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Open Banner Management' }),
  ).toBeTruthy();
});

test('shows printer, banner, gallery, and review tools in More and opens printer setup', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'More');

  for (const feature of [
    'Printer Setup',
    'Banner Management',
    'Gallery Management',
    'Review Management',
  ]) {
    expect(
      renderer.root.findByProps({ accessibilityLabel: `Open ${feature}` }),
    ).toBeTruthy();
  }

  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Open Printer Setup',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(JSON.stringify(renderer.toJSON())).toContain('Printer Configuration');
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'More' }),
  ).toHaveLength(0);
  await press(renderer, 'Back to More');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'More' }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Open Review Management',
    }),
  ).toBeTruthy();
});

test('opens Gallery Management below Banner Management and creates an album', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/gallery/next-id') {
      return Promise.resolve({ data: { data: 'GAL004' } });
    }
    if (path === '/gallery') {
      return Promise.resolve({
        data: {
          success: true,
          data: [
            {
              album_id: 'GAL003',
              title: 'Summer collection',
              category: 'Photo Frames',
              status: 'Active',
              cover_image: '/uploads/summer.jpg',
              photos: ['/uploads/photo-one.jpg'],
              photo_count: 1,
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await press(renderer, 'More');

  const moreScreen = JSON.stringify(renderer.toJSON());
  expect(moreScreen.indexOf('Banner Management')).toBeLessThan(
    moreScreen.indexOf('Gallery Management'),
  );
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Open Gallery Management',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'View gallery album Summer collection',
    }),
  ).toBeTruthy();
  expect(get).toHaveBeenCalledWith('/gallery');

  await press(renderer, 'Add gallery album');
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ placeholder: 'Album title' })
      .props.onChangeText('New collection');
    renderer.root
      .findByProps({ placeholder: 'e.g. Photo Frames' })
      .props.onChangeText('Canvas Prints');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Create album' })
      .props.onPress();
  });

  expect(get).toHaveBeenCalledWith('/gallery/next-id');
  expect(api.post).toHaveBeenCalledWith(
    '/gallery',
    expect.objectContaining({
      album_id: 'GAL004',
      title: 'New collection',
      category: 'Canvas Prints',
    }),
  );
});

test('opens Review Management below Gallery Management and creates a review', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/foods') {
      return Promise.resolve({
        data: {
          data: [{ food_id: 21, food_name: 'House Blend', food_images: [] }],
        },
      });
    }
    if (path === '/reviews/next-id') {
      return Promise.resolve({ data: { data: 'REV014' } });
    }
    if (path === '/reviews/stats') {
      return Promise.resolve({
        data: {
          data: {
            total_reviews: 0,
            avg_rating: 0,
            five_star_count: 0,
            photo_reviews_count: 0,
            published_count: 0,
          },
        },
      });
    }
    if (path === '/reviews') {
      return Promise.resolve({ data: { data: [] } });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await press(renderer, 'More');
  const moreScreen = JSON.stringify(renderer.toJSON());
  expect(moreScreen.indexOf('Gallery Management')).toBeLessThan(
    moreScreen.indexOf('Review Management'),
  );
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Open Review Management',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Manage customer ratings, comments, and review photos.',
  );
  expect(get).toHaveBeenCalledWith('/reviews');
  expect(get).toHaveBeenCalledWith('/reviews/stats');

  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Add review' })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await press(renderer, 'Select food for review');
  await press(renderer, 'Select food House Blend');
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ placeholder: 'Customer name' })
      .props.onChangeText('Maya Rivera');
    renderer.root
      .findByProps({ placeholder: "Write the customer's review..." })
      .props.onChangeText('Excellent coffee and friendly service.');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Create review' })
      .props.onPress();
  });

  expect(api.post).toHaveBeenCalledWith(
    '/reviews',
    expect.objectContaining({
      review_id: 'REV014',
      product_id: 21,
      product_name: 'House Blend',
      product_type: 'food',
      reviewer_name: 'Maya Rivera',
      rating: 5,
      comment: 'Excellent coffee and friendly service.',
      status: 'Published',
    }),
  );
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Review added successfully.',
  );
});

test('loads review details, updates a review, and deletes it', async () => {
  const review = {
    id: 73,
    review_id: 'REV073',
    product_id: 21,
    product_code: '21',
    product_name: 'House Blend',
    product_type: 'food',
    reviewer_name: 'Alex Morgan',
    reviewer_email: 'alex@example.com',
    rating: 4,
    title: 'Nice coffee',
    comment: 'A good cup of coffee.',
    review_photo: '',
    status: 'Pending',
    created_by: 'Admin',
  };
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/foods') {
      return Promise.resolve({
        data: { data: [{ food_id: 21, food_name: 'House Blend' }] },
      });
    }
    if (path === '/reviews/stats') {
      return Promise.resolve({
        data: { data: { total_reviews: 1, avg_rating: 4 } },
      });
    }
    if (path === '/reviews/73') {
      return Promise.resolve({ data: { data: review } });
    }
    if (path === '/reviews') {
      return Promise.resolve({ data: { data: [review] } });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await press(renderer, 'More');
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Open Review Management',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'View review REV073',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(get).toHaveBeenCalledWith('/reviews/73');
  expect(JSON.stringify(renderer.toJSON())).toContain('A good cup of coffee.');
  await press(renderer, 'Close review details');
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Edit review REV073',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ placeholder: "Write the customer's review..." })
      .props.onChangeText('Updated review after another visit.');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Save review changes' })
      .props.onPress();
  });

  expect(api.put).toHaveBeenCalledWith(
    '/reviews/73',
    expect.objectContaining({
      review_id: 'REV073',
      comment: 'Updated review after another visit.',
      product_id: 21,
    }),
  );

  let confirmDelete: AlertButton | undefined;
  const alert = jest
    .spyOn(Alert, 'alert')
    .mockImplementation((title, message, buttons) => {
      confirmDelete = buttons?.find(button => button.text === 'Delete');
    });
  await press(renderer, 'Delete review REV073');
  await ReactTestRenderer.act(async () => {
    await confirmDelete?.onPress?.();
  });
  expect(alert).toHaveBeenCalled();
  expect(api.delete).toHaveBeenCalledWith('/reviews/73');
  alert.mockRestore();
});

test('opens banner management from the More tab', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'More');

  expect(JSON.stringify(renderer.toJSON())).toContain('Banner Management');
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Customers' }),
  ).toHaveLength(0);

  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Open Banner Management',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('WEBSITE CONTENT');
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Create, edit, and publish your website banners.',
  );
  expect(api.get).toHaveBeenCalledWith('/banners');

  await press(renderer, 'Add banner');
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ placeholder: 'Banner title' })
      .props.onChangeText('Weekend offer');
    renderer.root
      .findByProps({
        placeholder: 'https://example.com/banner.jpg',
      })
      .props.onChangeText('https://example.com/weekend.jpg');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Create banner' })
      .props.onPress();
  });

  expect(api.post).toHaveBeenCalledWith(
    '/banners',
    expect.objectContaining({
      title: 'Weekend offer',
      image: 'https://example.com/weekend.jpg',
      type: 'hero',
      active: true,
    }),
  );
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Banner added successfully.',
  );

  await press(renderer, 'Back to More');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Open Banner Management' }),
  ).toBeTruthy();
});

test('opens Gallery Management below Banner Management and creates an album', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/gallery/next-id') {
      return Promise.resolve({ data: { data: 'GAL004' } });
    }
    if (path === '/gallery') {
      return Promise.resolve({
        data: {
          success: true,
          data: [
            {
              album_id: 'GAL003',
              title: 'Summer collection',
              category: 'Photo Frames',
              status: 'Active',
              cover_image: '/uploads/summer.jpg',
              photos: ['/uploads/photo-one.jpg'],
              photo_count: 1,
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await press(renderer, 'More');

  const moreScreen = JSON.stringify(renderer.toJSON());
  expect(moreScreen.indexOf('Banner Management')).toBeLessThan(
    moreScreen.indexOf('Gallery Management'),
  );
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Open Gallery Management',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'View gallery album Summer collection',
    }),
  ).toBeTruthy();
  expect(get).toHaveBeenCalledWith('/gallery');

  await press(renderer, 'Add gallery album');
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ placeholder: 'Album title' })
      .props.onChangeText('New collection');
    renderer.root
      .findByProps({ placeholder: 'e.g. Photo Frames' })
      .props.onChangeText('Canvas Prints');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Create album' })
      .props.onPress();
  });

  expect(get).toHaveBeenCalledWith('/gallery/next-id');
  expect(api.post).toHaveBeenCalledWith(
    '/gallery',
    expect.objectContaining({
      album_id: 'GAL004',
      title: 'New collection',
      category: 'Canvas Prints',
    }),
  );
});

test('opens Review Management below Gallery Management and creates a review', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/foods') {
      return Promise.resolve({
        data: {
          data: [{ food_id: 21, food_name: 'House Blend', food_images: [] }],
        },
      });
    }
    if (path === '/reviews/next-id') {
      return Promise.resolve({ data: { data: 'REV014' } });
    }
    if (path === '/reviews/stats') {
      return Promise.resolve({
        data: {
          data: {
            total_reviews: 0,
            avg_rating: 0,
            five_star_count: 0,
            photo_reviews_count: 0,
            published_count: 0,
          },
        },
      });
    }
    if (path === '/reviews') {
      return Promise.resolve({ data: { data: [] } });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await press(renderer, 'More');
  const moreScreen = JSON.stringify(renderer.toJSON());
  expect(moreScreen.indexOf('Gallery Management')).toBeLessThan(
    moreScreen.indexOf('Review Management'),
  );
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Open Review Management',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Manage customer ratings, comments, and review photos.',
  );
  expect(get).toHaveBeenCalledWith('/reviews');
  expect(get).toHaveBeenCalledWith('/reviews/stats');

  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Add review' })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await press(renderer, 'Select food for review');
  await press(renderer, 'Select food House Blend');
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ placeholder: 'Customer name' })
      .props.onChangeText('Maya Rivera');
    renderer.root
      .findByProps({ placeholder: "Write the customer's review..." })
      .props.onChangeText('Excellent coffee and friendly service.');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Create review' })
      .props.onPress();
  });

  expect(api.post).toHaveBeenCalledWith(
    '/reviews',
    expect.objectContaining({
      review_id: 'REV014',
      product_id: 21,
      product_name: 'House Blend',
      product_type: 'food',
      reviewer_name: 'Maya Rivera',
      rating: 5,
      comment: 'Excellent coffee and friendly service.',
      status: 'Published',
    }),
  );
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Review added successfully.',
  );
});

test('loads review details, updates a review, and deletes it', async () => {
  const review = {
    id: 73,
    review_id: 'REV073',
    product_id: 21,
    product_code: '21',
    product_name: 'House Blend',
    product_type: 'food',
    reviewer_name: 'Alex Morgan',
    reviewer_email: 'alex@example.com',
    rating: 4,
    title: 'Nice coffee',
    comment: 'A good cup of coffee.',
    review_photo: '',
    status: 'Pending',
    created_by: 'Admin',
  };
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/foods') {
      return Promise.resolve({
        data: { data: [{ food_id: 21, food_name: 'House Blend' }] },
      });
    }
    if (path === '/reviews/stats') {
      return Promise.resolve({
        data: { data: { total_reviews: 1, avg_rating: 4 } },
      });
    }
    if (path === '/reviews/73') {
      return Promise.resolve({ data: { data: review } });
    }
    if (path === '/reviews') {
      return Promise.resolve({ data: { data: [review] } });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await press(renderer, 'More');
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Open Review Management',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'View review REV073',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(get).toHaveBeenCalledWith('/reviews/73');
  expect(JSON.stringify(renderer.toJSON())).toContain('A good cup of coffee.');
  await press(renderer, 'Close review details');
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({
        accessibilityLabel: 'Edit review REV073',
      })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ placeholder: "Write the customer's review..." })
      .props.onChangeText('Updated review after another visit.');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Save review changes' })
      .props.onPress();
  });

  expect(api.put).toHaveBeenCalledWith(
    '/reviews/73',
    expect.objectContaining({
      review_id: 'REV073',
      comment: 'Updated review after another visit.',
      product_id: 21,
    }),
  );

  let confirmDelete: AlertButton | undefined;
  const alert = jest
    .spyOn(Alert, 'alert')
    .mockImplementation((title, message, buttons) => {
      confirmDelete = buttons?.find(button => button.text === 'Delete');
    });
  await press(renderer, 'Delete review REV073');
  await ReactTestRenderer.act(async () => {
    await confirmDelete?.onPress?.();
  });
  expect(alert).toHaveBeenCalled();
  expect(api.delete).toHaveBeenCalledWith('/reviews/73');
  alert.mockRestore();
});

test('shows full-width sidebar navigation with icons and labels in the same row', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'Toggle sidebar');
  const homeNavigationItems = renderer.root.findAllByProps({
    accessibilityLabel: 'Home',
  });
  const sidebarHome = homeNavigationItems.find(item =>
    item.props.className?.includes('flex-row'),
  );

  expect(sidebarHome).toBeTruthy();
  expect(sidebarHome!.props.className).toContain('w-full');
  expect(sidebarHome!.props.className).toContain('gap-3');
  expect(JSON.stringify(renderer.toJSON())).toContain('WORKSPACE');
  expect(JSON.stringify(renderer.toJSON())).toContain('Buy Food');
  expect(JSON.stringify(renderer.toJSON())).toContain('h-12 w-12 shrink-0');
  expect(JSON.stringify(renderer.toJSON())).toContain('w-full flex-1 border-r');

  await press(renderer, 'Close sidebar navigation');
  expect(
    renderer.root
      .findAllByProps({ accessibilityLabel: 'Home' })
      .some(item => item.props.className?.includes('flex-row')),
  ).toBe(false);
});

test('sidebar menu items navigate to their page and dismiss the sidebar', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'Toggle sidebar');
  const ordersMenuItem = renderer.root
    .findAllByProps({ accessibilityLabel: 'Orders' })
    .find(item => item.props.accessibilityRole === 'button');

  expect(ordersMenuItem).toBeTruthy();
  await ReactTestRenderer.act(() => {
    ordersMenuItem!.props.onPress();
  });

  expect(
    renderer.root.findByProps({
      placeholder: 'Search order #, customer, phone, food...',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'Close sidebar navigation',
    }),
  ).toHaveLength(0);
});

test('sidebar More expands all feature links and opens the selected page', async () => {
  const renderer = await renderDashboard();
  await press(renderer, 'Toggle sidebar');

  const sidebarMore = renderer.root
    .findAllByProps({ accessibilityLabel: 'More' })
    .find(item => item.props.accessibilityRole === 'button');
  expect(sidebarMore).toBeTruthy();
  await ReactTestRenderer.act(() => sidebarMore!.props.onPress());

  const moreCardLabels = new Set(
    renderer.root
      .findAll(node => {
        const label = node.props.accessibilityLabel;
        return typeof label === 'string' && label.startsWith('Open ');
      })
      .map(node => node.props.accessibilityLabel as string),
  );
  expect(moreCardLabels.size).toBe(28);
  for (const feature of [
    'Orders Management',
    'Categories',
    'Cuisines',
    'Tables',
    'Printer Setup',
    'Banner Management',
    'Gallery Management',
    'Review Management',
    'Staff & Employees',
    'Profile',
  ]) {
    expect(moreCardLabels).toContain(`Open ${feature}`);
  }
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Open Categories',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Open Tables' }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Open Banner Management',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Open Printer Setup',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Open Gallery Management',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Open Review Management',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Close sidebar navigation',
    }),
  ).toBeTruthy();

  await press(renderer, 'Open Tables');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Search tables' }),
  ).toBeTruthy();
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'Close sidebar navigation',
    }),
  ).toHaveLength(0);
}, 15000);

test('More cards open Orders Management and Profile', async () => {
  const renderer = await renderDashboard();
  await press(renderer, 'More');
  await press(renderer, 'Open Orders Management');
  expect(
    renderer.root.findByProps({
      placeholder: 'Search order #, customer, phone, food...',
    }),
  ).toBeTruthy();

  await press(renderer, 'Back to More');
  await press(renderer, 'Open Profile');
  expect(JSON.stringify(renderer.toJSON())).toContain('Your account details');
}, 15000);

test('Customers card loads customer records from GET /users', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) =>
    Promise.resolve({
      data:
        path === '/users'
          ? {
              data: {
                users: [
                  {
                    user_id: 'customer-1',
                    full_name: 'Jamie Customer',
                    email: 'jamie@example.com',
                    phone_number: '555-0101',
                    role: 'customer',
                  },
                  {
                    user_id: 'admin-1',
                    full_name: 'Restaurant Admin',
                    role: 'admin',
                  },
                ],
              },
            }
          : { data: [] },
    }),
  );

  const renderer = await renderDashboard();
  await press(renderer, 'More');
  await press(renderer, 'Open Customers');
  await ReactTestRenderer.act(
    async () => new Promise<void>(resolve => setTimeout(resolve, 10)),
  );

  expect(get).toHaveBeenCalledWith(
    '/users',
    expect.objectContaining({ signal: expect.anything() }),
  );
  expect(hasText(renderer, 'Jamie Customer')).toBe(true);
  expect(hasText(renderer, 'jamie@example.com')).toBe(true);
  expect(hasText(renderer, '555-0101')).toBe(true);
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Restaurant Admin');
}, 15000);

test('loads the restaurant POS dashboard snapshot and revenue reports', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    const today = new Date().toISOString();
    const dataByPath: Record<string, unknown> = {
      '/orders/management': {
        data: [
          {
            order_id: 'ORD-12',
            customer_name: 'Alex Morgan',
            order_status: 'Processing',
            total_amount: 1450,
            order_date: today,
          },
        ],
      },
      '/table-bills': { bills: [{ bill_id: 4, status: 'active' }] },
      '/kitchen-orders': { orders: [] },
      '/users': { data: [{ role: 'customer' }, { role: 'admin' }] },
      '/foods': {
        data: [
          {
            food_name: 'House Blend',
            size_variants: [{ stock: 4 }],
          },
        ],
      },
      '/inventory/dashboard': {
        data: { lowStock: 1, pendingKitchenRequests: 2 },
      },
      '/inventory/kitchen-requests': { data: [] },
      '/categories': { data: [{ category_name: 'Coffee', status: 'Active' }] },
      '/revenue/summary': { data: { totalRevenue: 1450 } },
      '/revenue/trend': { data: [{ date: today, revenue: 1450 }] },
      '/revenue/status': { data: [{ status: 'Delivered', count: 1 }] },
    };
    return Promise.resolve({
      data: dataByPath[path] ?? { data: [] },
    });
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 400, height: 800 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <DashboardScreen
          user={{ name: 'Maya Rivera', email: 'maya@example.com' }}
          onLogout={jest.fn()}
        />
      </SafeAreaProvider>,
    );
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  const output = JSON.stringify(renderer!.toJSON());
  const summaryCards = renderer!.root
    .findAllByType(View)
    .filter(node => node.props.style?.minHeight === 188);
  expect(summaryCards).toHaveLength(8);
  expect(
    summaryCards[0].props.style.width + summaryCards[1].props.style.width + 12,
  ).toBeLessThanOrEqual(Dimensions.get('window').width - 40);
  expect(get).toHaveBeenCalledWith(
    '/orders/management',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(get).toHaveBeenCalledWith(
    '/table-bills',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(get).toHaveBeenCalledWith(
    '/users',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(get).toHaveBeenCalledWith('/foods', expect.any(Object));
  expect(get).toHaveBeenCalledWith('/inventory/dashboard', expect.any(Object));
  expect(get).toHaveBeenCalledWith(
    '/inventory/kitchen-requests',
    expect.any(Object),
  );
  expect(get).toHaveBeenCalledWith('/categories', expect.any(Object));
  expect(get).toHaveBeenCalledWith(
    '/revenue/summary',
    expect.objectContaining({ params: { range: 'year' } }),
  );
  expect(get).toHaveBeenCalledWith(
    '/revenue/trend',
    expect.objectContaining({
      params: { range: 'year', trend: 'year', dateBasis: 'delivered' },
    }),
  );
  expect(output).toContain('Alex Morgan');
  expect(output).toContain('House Blend');
  expect(output).toContain('Low stock');
  expect(output).toContain('1,450');
  expect(output).toContain('Total Customers');
  expect(output).toContain('Today’s Revenue');
});

test('keeps available dashboard sections visible when one POS endpoint fails', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/foods') {
      return Promise.reject(new Error('Food service unavailable'));
    }
    if (path === '/orders/management') {
      return Promise.resolve({
        data: {
          data: [
            {
              order_id: 'ORD-15',
              customer_name: 'Sam Lee',
              order_status: 'Delivered',
              total_amount: 725,
              order_date: new Date().toISOString(),
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 400, height: 800 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <DashboardScreen
          user={{ name: 'Maya Rivera', email: 'maya@example.com' }}
          onLogout={jest.fn()}
        />
      </SafeAreaProvider>,
    );
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  const output = JSON.stringify(renderer!.toJSON());
  expect(output).toContain('Sam Lee');
  expect(output).toContain('Could not load /foods');
  expect(output).toContain('Retry dashboard loading');
});

test('requests reports for a selected custom date range', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation(() => Promise.resolve({ data: { data: [] } }));
  const renderer = await renderDashboard();

  await press(renderer, 'Show custom dashboard data');
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Custom range start date' })
      .props.onChangeText('2025-01-01');
    renderer.root
      .findByProps({ accessibilityLabel: 'Custom range end date' })
      .props.onChangeText('2025-01-31');
  });

  expect(get).toHaveBeenCalledWith(
    '/revenue/summary',
    expect.objectContaining({
      params: {
        range: 'custom',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      },
    }),
  );
});

test('shows employees returned in the backend employees response property', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/employees') {
      return Promise.resolve({
        data: {
          success: true,
          employees: [
            {
              employee_id: 12,
              full_name: 'Jordan Lee',
              employee_type: 'Server',
              email: 'jordan@example.com',
              status: 'Active',
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Employees' }),
  ).toHaveLength(0);
  await openEmployeeManagement(renderer);

  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('Jordan Lee');
  expect(output).toContain('Server');
}, 15000);

test('loads attendance below the employee directory and marks an employee present', async () => {
  const employee = {
    employee_id: 48,
    full_name: 'Morgan Patel',
    employee_type: 'Cashier',
    email: 'morgan@example.com',
    status: 'Active',
  };
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/employees') {
      return Promise.resolve({ data: { success: true, employees: [employee] } });
    }
    if (path === '/attendance/admin/records') {
      return Promise.resolve({
        data: {
          success: true,
          data: [{
            employee_id: 48,
            full_name: 'Morgan Patel',
            employee_type: 'Cashier',
            attendance_record_id: null,
            attendance_status: 'Absent',
          }],
        },
      });
    }
    if (path === '/attendance/admin/summary') {
      return Promise.resolve({
        data: {
          success: true,
          data: {
            total_active_staff: 1,
            present_count: 0,
            working_now_count: 0,
            completed_count: 0,
            late_count: 0,
            absent_count: 1,
          },
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });
  const post = api.post as jest.Mock;
  post.mockResolvedValue({
    data: { success: true, message: 'Attendance record saved.' },
  });

  const renderer = await renderDashboard();
  await openEmployeeManagement(renderer);
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Attendance date' }),
  ).toBeTruthy();
  expect(get).toHaveBeenCalledWith(
    '/attendance/admin/records',
    expect.objectContaining({
      params: expect.objectContaining({
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
      signal: expect.any(AbortSignal),
    }),
  );
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Attendance summary' }),
  ).toBeTruthy();

  await press(renderer, 'Mark attendance');
  await press(renderer, 'Set attendance status Present');
  await press(renderer, 'Save attendance record');
  expect(post).toHaveBeenCalledWith(
    '/attendance/admin/mark',
    expect.objectContaining({
      employeeId: '48',
      status: 'Present',
      checkIn: null,
      checkOut: null,
    }),
  );
}, 15000);

test('assigns tables to a server with existing assignments and capacity rules', async () => {
  const server = {
    employee_id: 37,
    full_name: 'Casey Rivers',
    employee_type: 'Server',
    status: 'Active',
  };
  const tables = [
    {
      table_id: 101,
      table_number: 'T1',
      no_of_seats: 2,
      status: 'Available',
      assigned_server_id: 37,
      assigned_server_name: 'Casey Rivers',
    },
    {
      table_id: 102,
      table_number: 'T2',
      no_of_seats: 2,
      status: 'Available',
      assigned_server_id: null,
    },
    {
      table_id: 103,
      table_number: 'T3',
      no_of_seats: 6,
      status: 'Available',
      assigned_server_id: null,
    },
    {
      table_id: 104,
      table_number: 'T4',
      no_of_seats: 4,
      status: 'Available',
      assigned_server_id: 82,
      assigned_server_name: 'Jordan Lee',
    },
  ];
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/employees') {
      return Promise.resolve({ data: { success: true, employees: [server] } });
    }
    if (path === '/server-tables') {
      return Promise.resolve({ data: { success: true, tables } });
    }
    return Promise.resolve({ data: { data: [] } });
  });
  const post = api.post as jest.Mock;
  post.mockResolvedValue({ data: { success: true, message: 'Assigned' } });

  const renderer = await renderDashboard();
  await openEmployeeManagement(renderer);
  await press(renderer, 'Assign tables to Casey Rivers');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );

  expect(get).toHaveBeenCalledWith(
    '/server-tables',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Deselect table T1' }).props
      .accessibilityState.checked,
  ).toBe(true);
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Select table T3' }).props
      .accessibilityState.disabled,
  ).toBe(true);
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Select table T4' }).props
      .accessibilityState.disabled,
  ).toBe(true);

  await press(renderer, 'Select table T2');
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Save table assignments' })
      .props.onPress();
    await Promise.resolve();
  });

  expect(post).toHaveBeenCalledWith('/server-tables/assign', {
    employee_id: 37,
    table_ids: ['101', '102'],
  });
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'Save table assignments',
    }),
  ).toHaveLength(0);
}, 15000);

test('creates an employee from the employee form', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation(() => Promise.resolve({ data: { employees: [] } }));
  const post = api.post as jest.Mock;
  const renderer = await renderDashboard();

  await openEmployeeManagement(renderer);
  await press(renderer, 'Add new employee');
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Full name' })
      .props.onChangeText('Taylor Morgan');
    renderer.root
      .findByProps({ accessibilityLabel: 'Phone number' })
      .props.onChangeText('9876543210');
    renderer.root
      .findByProps({ accessibilityLabel: 'Email' })
      .props.onChangeText('taylor@example.com');
    renderer.root
      .findByProps({ accessibilityLabel: 'Street address' })
      .props.onChangeText('10 Main Street');
    renderer.root
      .findByProps({ accessibilityLabel: 'Area / locality' })
      .props.onChangeText('Anna Nagar');
    renderer.root
      .findByProps({ accessibilityLabel: 'City' })
      .props.onChangeText('Chennai');
    renderer.root
      .findByProps({ accessibilityLabel: 'District' })
      .props.onChangeText('Chennai');
    renderer.root
      .findByProps({ accessibilityLabel: 'State' })
      .props.onChangeText('Tamil Nadu');
    renderer.root
      .findByProps({ accessibilityLabel: 'Pincode' })
      .props.onChangeText('600001');
    renderer.root
      .findByProps({ accessibilityLabel: 'Basic salary' })
      .props.onChangeText('25000');
    renderer.root
      .findByProps({ accessibilityLabel: 'Password' })
      .props.onChangeText('secure-pass');
    renderer.root
      .findByProps({ accessibilityLabel: 'Confirm password' })
      .props.onChangeText('secure-pass');
  });
  await press(renderer, 'Cuisine type: South Indian');
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Create employee' })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(post).toHaveBeenCalledWith(
    '/employees',
    expect.anything(),
    expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}, 15000);

test('loads employee details and submits edits to the employee endpoint', async () => {
  const get = api.get as jest.Mock;
  const employee = {
    employee_id: 37,
    full_name: 'Casey Rivers',
    employee_type: 'Server',
    email: 'casey@example.com',
    phone_number: '9876543210',
    status: 'Active',
    address: '10 Main Street',
    area_locality: 'Anna Nagar',
    city: 'Chennai',
    district: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    basic_salary: 25000,
  };
  get.mockImplementation((path: string) => {
    if (path === '/employees') {
      return Promise.resolve({ data: { employees: [employee] } });
    }
    if (path === '/employees/37') {
      return Promise.resolve({ data: { employee } });
    }
    return Promise.resolve({ data: { data: [] } });
  });
  const put = api.put as jest.Mock;
  const renderer = await renderDashboard();
  await openEmployeeManagement(renderer);
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Edit employee Casey Rivers' })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Full name' }).props.value,
  ).toBe('Casey Rivers');
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Save employee changes' })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(put).toHaveBeenCalledWith(
    '/employees/37',
    expect.anything(),
    expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}, 15000);

test('shows and hides employee passwords independently', async () => {
  const renderer = await renderDashboard();
  await openEmployeeManagement(renderer);
  await press(renderer, 'Add new employee');

  const passwordField = renderer.root.findByProps({
    accessibilityLabel: 'Password',
  });
  const confirmPasswordField = renderer.root.findByProps({
    accessibilityLabel: 'Confirm password',
  });
  expect(passwordField.props.secureTextEntry).toBe(true);
  expect(confirmPasswordField.props.secureTextEntry).toBe(true);

  await press(renderer, 'Show password');
  expect(passwordField.props.secureTextEntry).toBe(false);
  expect(confirmPasswordField.props.secureTextEntry).toBe(true);

  await press(renderer, 'Show confirm password');
  expect(passwordField.props.secureTextEntry).toBe(false);
  expect(confirmPasswordField.props.secureTextEntry).toBe(false);

  await press(renderer, 'Hide password');
  await press(renderer, 'Hide confirm password');
  expect(passwordField.props.secureTextEntry).toBe(true);
  expect(confirmPasswordField.props.secureTextEntry).toBe(true);
}, 15000);
