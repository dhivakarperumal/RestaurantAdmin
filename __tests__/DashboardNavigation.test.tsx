import React from 'react';
import { Image, Text, TextInput, View } from 'react-native';
import { Path } from 'react-native-svg';
import ReactTestRenderer from 'react-test-renderer';
import DashboardScreen from '../src/Navigation/DashboardScreen';
import { PlusIcon } from '../src/Navigation/NavigationIcons';
import api from '../api';

jest.mock('../api', () => ({
  __esModule: true,
  API_BASE_URL: 'https://restaurant.qtechx.com/api',
  default: {
    get: jest.fn(() => Promise.resolve({ data: { data: [] } })),
  },
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
      <DashboardScreen
        user={{ name: 'Maya Rivera', email: 'maya@example.com' }}
        onLogout={jest.fn()}
      />,
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
    renderer.root
      .findByProps({ accessibilityLabel })
      .props.onPress();
  });
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
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(
    renderer.root.findAllByType(Text).some(node => node.props.children === 'All items'),
  ).toBe(true);
  expect(renderer.root.findByProps({ accessibilityLabel: 'Search items' })).toBeTruthy();
  await press(renderer, 'Open quick actions');
  await press(renderer, 'Add Product');
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );
  expect(JSON.stringify(renderer.toJSON())).toContain('Add Food');
  expect(renderer.root.findByProps({ accessibilityLabel: 'Food name' })).toBeTruthy();
});

test('opens the existing category and customer forms from the FAB menu', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'Open quick actions');
  await press(renderer, 'Dismiss quick actions');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Open quick actions' }).props
      .accessibilityState.expanded,
  ).toBe(false);

  await press(renderer, 'Open quick actions');
  await press(renderer, 'Add Category');
  expect(renderer.root.findByProps({ accessibilityLabel: 'Category name' })).toBeTruthy();

  await press(renderer, 'Cancel add');
  await press(renderer, 'Open quick actions');
  await press(renderer, 'Add Cusions');
  expect(renderer.root.findByProps({ placeholder: 'Customer name' })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Save Add Customer' })).toBeTruthy();
});

test('hides the dashboard header on food details and restores it on back', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/foods') {
      return Promise.resolve({
        data: {
          data: [{
            food_id: 'FOOD002',
            food_name: 'Idli Sambar',
            final_price: '27.00',
          }],
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

  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Toggle sidebar' })).toHaveLength(0);
  expect(JSON.stringify(renderer.toJSON())).toContain('Idli Sambar');
  expect(renderer.root.findByProps({ accessibilityLabel: 'Back to items' })).toBeTruthy();

  await press(renderer, 'Back to items');
  expect(renderer.root.findByProps({ accessibilityLabel: 'Toggle sidebar' })).toBeTruthy();
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
    renderer.root.findByProps({ placeholder: '0.00' }).props.onChangeText('840');
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

test('renders the plus icon as visible horizontal and vertical strokes', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <PlusIcon color="#FFFFFF" size={27} />,
    );
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
      data: path === '/foods'
        ? {
            data: {
              products: [{
                food_id: 1,
                food_name: 'Masala Dosa',
                selling_price: '325.00',
                description: 'Crispy rice and lentil crepe with potato masala',
                stock_quantity: 8,
                status: 'Available',
                size_variants: [{ size_name: 'Regular', selling_price: 325 }],
                food_images: [{ image_url: '/uploads/masala-dosa.jpg' }],
              }, {
                food_id: 2,
                food_name: 'Price Missing Food',
              }, {
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
              }],
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
  expect(JSON.stringify(renderer.toJSON())).toContain('Crispy rice and lentil crepe');
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
    renderer.root.findByProps({ accessibilityLabel: 'Masala Dosa image' })
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
    renderer.root.findByProps({ accessibilityLabel: 'Send bill' }).props.disabled,
  ).toBe(true);
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Back to food items' }),
  ).toHaveLength(0);
  await press(renderer, 'Decrease Price Missing Food quantity');
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Send bill' }).props.disabled,
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

  const screen = JSON.stringify(renderer.toJSON());
  expect(screen).toContain('Keep track of every customer order.');
  expect(screen).not.toContain('WORKSPACE');
});

test('loads the restaurant POS dashboard snapshot and revenue reports', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    const today = new Date().toISOString();
    const dataByPath: Record<string, unknown> = {
      '/orders/management': { data: [
        {
          order_id: 'ORD-12',
          customer_name: 'Alex Morgan',
          order_status: 'Processing',
          total_amount: 1450,
          order_date: today,
        },
      ] },
      '/table-bills': { bills: [{ bill_id: 4, status: 'active' }] },
      '/kitchen-orders': { orders: [] },
      '/users': { data: [{ role: 'customer' }, { role: 'admin' }] },
      '/foods': { data: [
        {
          food_name: 'House Blend',
          size_variants: [{ stock: 4 }],
        },
      ] },
      '/inventory/dashboard': { data: { lowStock: 1, pendingKitchenRequests: 2 } },
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
      <DashboardScreen
        user={{ name: 'Maya Rivera', email: 'maya@example.com' }}
        onLogout={jest.fn()}
      />,
    );
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  const output = JSON.stringify(renderer!.toJSON());
  const summaryCards = renderer!.root.findAllByType(View).filter(
    node => node.props.style?.height === 168,
  );
  expect(summaryCards).toHaveLength(8);
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
  expect(get).toHaveBeenCalledWith('/inventory/kitchen-requests', expect.any(Object));
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
      <DashboardScreen
        user={{ name: 'Maya Rivera', email: 'maya@example.com' }}
        onLogout={jest.fn()}
      />,
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
