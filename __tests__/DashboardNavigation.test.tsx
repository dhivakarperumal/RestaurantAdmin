import React from 'react';
import { TextInput, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import DashboardScreen from '../src/Navigation/DashboardScreen';
import { PlusIcon } from '../src/Navigation/NavigationIcons';
import api from '../api';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: { data: [] } })),
  },
}));

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

test('navigates tabs and creates a session invoice through quick actions', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'Billing');
  expect(JSON.stringify(renderer.toJSON())).toContain('Invoice history');
  expect(JSON.stringify(renderer.toJSON())).toContain('No invoices yet');

  await press(renderer, 'Quick actions');
  await press(renderer, 'Create Invoice');
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

test('adds an order and updates its status from the order details sheet', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'Orders');
  expect(JSON.stringify(renderer.toJSON())).toContain('No orders');
  await press(renderer, 'Quick actions');
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

  const strokes = renderer!.root
    .findAllByType(View)
    .filter(view => view.props.style?.backgroundColor === '#FFFFFF');
  expect(strokes).toHaveLength(2);
  expect(strokes.some(stroke => stroke.props.style.width > stroke.props.style.height)).toBe(true);
  expect(strokes.some(stroke => stroke.props.style.height > stroke.props.style.width)).toBe(true);
});

test('loads live dashboard data from the store endpoints', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    const today = new Date().toISOString();
    const dataByPath: Record<string, unknown[]> = {
      '/orders': [
        {
          order_id: 'ORD-12',
          customer_name: 'Alex Morgan',
          order_status: 'Processing',
          total_amount: 1450,
          order_date: today,
        },
      ],
      '/users': [{ role: 'customer' }, { role: 'admin' }],
      '/products': [
        {
          product_name: 'House Blend',
          size_variants: [{ stock: 4 }],
        },
      ],
      '/albums': [],
      '/gift-boxes': [],
    };
    return Promise.resolve({
      data: { data: dataByPath[path] || [] },
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
  expect(get).toHaveBeenCalledWith('/orders');
  expect(get).toHaveBeenCalledWith('/users');
  expect(get).toHaveBeenCalledWith('/products');
  expect(get).toHaveBeenCalledWith('/albums');
  expect(get).toHaveBeenCalledWith('/gift-boxes');
  expect(output).toContain('Alex Morgan');
  expect(output).toContain('House Blend');
  expect(output).toContain('Low stock');
  expect(output).toContain('1,450');
});
