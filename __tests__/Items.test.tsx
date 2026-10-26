import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import api from '../api';
import Items from '../src/Tabs/Items';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

function hasText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  expected: string,
) {
  return renderer.root.findAllByType(Text).some(node => {
    const content = node.props.children;
    return (
      content === expected ||
      (Array.isArray(content) && content.join('') === expected)
    );
  });
}

async function flushListUpdates() {
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 60)),
  );
}

test('loads and shows all menu items with category, stock, price, and status', async () => {
  const get = api.get as jest.Mock;
  get.mockResolvedValue({
    data: {
      data: [
        {
          food_id: 1,
          food_name: 'Garden Salad',
          category_name: 'Starters',
          current_stock: 12,
          selling_price: 8.5,
          status: 'Available',
        },
        {
          food_id: 2,
          product_name: 'Mango Juice',
          category: 'Drinks',
          stock_quantity: 6,
          price: 4,
          is_menu_visible: false,
        },
      ],
    },
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Items />);
    await Promise.resolve();
  });
  await flushListUpdates();

  expect(get).toHaveBeenCalledWith('/foods', { signal: expect.any(AbortSignal) });
  expect(hasText(renderer!, 'All items')).toBe(true);
  expect(hasText(renderer!, '2 items in your menu')).toBe(true);
  expect(hasText(renderer!, 'Garden Salad')).toBe(true);
  expect(hasText(renderer!, 'Starters')).toBe(true);
  expect(hasText(renderer!, '12 in stock')).toBe(true);
  expect(hasText(renderer!, '₹8.5')).toBe(true);
  expect(hasText(renderer!, 'Mango Juice')).toBe(true);
  expect(hasText(renderer!, 'Hidden')).toBe(true);
});

test('filters items by item name and category', async () => {
  const get = api.get as jest.Mock;
  get.mockResolvedValue({
    data: [
      { food_id: 1, food_name: 'Garden Salad', category_name: 'Starters' },
      { food_id: 2, food_name: 'Mango Juice', category_name: 'Drinks' },
    ],
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Items />);
    await Promise.resolve();
  });
  await flushListUpdates();

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Search items' })
      .props.onChangeText('drinks');
  });
  await flushListUpdates();

  expect(hasText(renderer!, 'Mango Juice')).toBe(true);
  expect(hasText(renderer!, 'Garden Salad')).toBe(false);
});

test('shows a retry option when the items request fails', async () => {
  const get = api.get as jest.Mock;
  get.mockRejectedValueOnce(new Error('Food service unavailable')).mockResolvedValue({
    data: [{ food_id: 1, food_name: 'Garden Salad' }],
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Items />);
    await Promise.resolve();
  });
  await flushListUpdates();
  expect(hasText(renderer!, 'Food service unavailable')).toBe(true);

  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Retry loading items' })
      .props.onPress();
    await Promise.resolve();
  });
  await flushListUpdates();
  expect(hasText(renderer!, 'Garden Salad')).toBe(true);
});
