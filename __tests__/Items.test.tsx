import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../api';
import Items from '../src/Tabs/Items';

jest.mock('../api', () => ({
  __esModule: true,
  API_BASE_URL: 'https://restaurant.qtechx.com/api',
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
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
          final_price: '8.50',
          selling_price: 10,
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
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Add item' }).props.className,
  ).toContain('absolute bottom-5 right-5');
});

test('floating add item button opens the native Add Food screen', async () => {
  const get = api.get as jest.Mock;
  const postRequest = api.post as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/cuisines') {
      return Promise.resolve({ data: { data: [{ cuisine_id: 'CUS001', cuisine_name: 'Thai' }] } });
    }
    if (path === '/categories') {
      return Promise.resolve({
        data: {
          data: [{
            category_id: 'CAT001',
            category_name: 'Main Course',
            sub_categories: ['Rice'],
          }],
        },
      });
    }
    if (path === '/foods/next-id') {
      return Promise.resolve({ data: { data: 'FOOD001' } });
    }
    return Promise.resolve({ data: { data: [] } });
  });
  (launchImageLibrary as jest.Mock).mockResolvedValue({
    assets: [{
      uri: 'file:///pineapple.jpg',
      fileName: 'pineapple.jpg',
      type: 'image/jpeg',
      fileSize: 1024,
    }],
  });
  postRequest
    .mockResolvedValueOnce({ data: { url: '/uploads/pineapple.jpg' } })
    .mockResolvedValueOnce({ data: { success: true } });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Items />);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await flushListUpdates();

  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Add item' }).props.onPress();
  });
  await flushListUpdates();
  expect(hasText(renderer!, 'Add Food')).toBe(true);
  expect(hasText(renderer!, 'FOOD001')).toBe(true);
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ accessibilityLabel: 'Choose food images' }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(postRequest).toHaveBeenNthCalledWith(
    1,
    '/upload',
    expect.any(FormData),
    expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
  expect(hasText(renderer!, 'Uploaded')).toBe(true);

  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Food name' }).props.onChangeText('Pineapple Fried Rice');
    renderer!.root.findByProps({ accessibilityLabel: 'Cuisine' }).props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Cuisine Thai' }).props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Category' }).props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Category Main Course' }).props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Subcategory' }).props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Subcategory Rice' }).props.onPress();
    renderer!.root.findByProps({ accessibilityLabel: 'Meal time' }).props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Meal time Lunch' }).props.onPress();
    renderer!.root.findByProps({ accessibilityLabel: 'MRP (₹)' }).props.onChangeText('300');
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ accessibilityLabel: 'Save Food' }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(postRequest).toHaveBeenCalledWith(
    '/foods',
    expect.objectContaining({
      food_id: 'FOOD001',
      food_name: 'Pineapple Fried Rice',
      cuisine_id: 'CUS001',
      category_id: 'CAT001',
      subcategory_name: 'Rice',
      meal_type: 'Lunch',
      mrp: 300,
      food_images: ['/uploads/pineapple.jpg'],
    }),
  );
});

test('opens a food details page using the food ID details endpoint', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/foods') {
      return Promise.resolve({
        data: {
          data: [{
            food_id: 'FOOD002',
            food_name: 'Idli Sambar',
            category_name: 'Breakfast',
            final_price: '27.00',
          }],
        },
      });
    }
    if (path === '/foods/FOOD002') {
      return Promise.resolve({
        data: {
          success: true,
          data: {
            id: 4,
            food_id: 'FOOD002',
            food_name: 'Idli Sambar',
            cuisine_id: 'CUS001',
            cuisine_name: 'South Indian',
            category_id: 'CAT001',
            category_name: 'Breakfast',
            meal_type: 'All Day',
            subcategory_name: 'Idli',
            food_images: ['/uploads/idli-sambar.jpg'],
            mrp: '30.00',
            discount: '10.00',
            final_price: '27.00',
            rating: '4.0',
            stock_quantity: 0,
            preparation_time: 30,
            food_type: 'Veg',
            is_spicy: false,
            is_available: true,
            is_menu_visible: true,
            dining_available: true,
            takeaway_available: true,
            delivery_available: true,
            featured: false,
            status: 'Active',
            addons: [{ addon_name: 'Extra chutney', price: '5.00', status: 'Active' }],
            customizations: [{
              name: 'Spice level',
              selection_type: 'Single',
              required: true,
              options: [{ name: 'Mild', price: '0.00' }],
            }],
          },
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Items />);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await flushListUpdates();

  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'View details of Idli Sambar' })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await flushListUpdates();

  expect(get).toHaveBeenCalledWith(
    '/foods/FOOD002',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(hasText(renderer!, 'Food details')).toBe(true);
  expect(hasText(renderer!, 'South Indian')).toBe(true);
  expect(hasText(renderer!, '₹27.00')).toBe(true);
  expect(hasText(renderer!, 'Extra chutney')).toBe(true);
  expect(hasText(renderer!, 'Spice level')).toBe(true);
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Idli Sambar image 1',
    }).props.source,
  ).toEqual({ uri: 'https://restaurant.qtechx.com/uploads/idli-sambar.jpg' });

  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Back to items' }).props.onPress();
  });
  expect(hasText(renderer!, 'All items')).toBe(true);
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
