import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import api from '../api';
import Categories from '../src/Screens/Categories';

jest.mock('../api', () => ({
  __esModule: true,
  API_BASE_URL: 'https://restaurant.qtechx.com/api',
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mountedRenderers: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(() => {
  ReactTestRenderer.act(() => {
    mountedRenderers.forEach(renderer => renderer.unmount());
    mountedRenderers.length = 0;
  });
});

function hasText(renderer: ReactTestRenderer.ReactTestRenderer, text: string) {
  return renderer.root.findAllByType(Text).some(node => {
    const value = node.props.children;
    return value === text || (Array.isArray(value) && value.join('') === text);
  });
}

async function flush() {
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );
}

async function renderCategories() {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/categories') {
      return Promise.resolve({
        data: {
          success: true,
          data: [
            {
              category_id: 'CAT001',
              category_name: 'Breakfast',
              description: 'Morning meals',
              sub_categories: ['Idli', 'Dosa'],
              category_image: '/uploads/categories/breakfast.webp',
              status: 'Active',
            },
          ],
        },
      });
    }
    if (path === '/foods') {
      return Promise.resolve({
        data: {
          success: true,
          data: [
            {
              food_id: 'FOOD001',
              category_id: 'CAT001',
              category_name: 'Breakfast',
            },
            { food_id: 'FOOD002', category_id: '', category_name: 'Breakfast' },
          ],
        },
      });
    }
    if (path === '/categories/next-id') {
      return Promise.resolve({ data: { success: true, data: 'CAT002' } });
    }
    return Promise.reject(new Error(`Unexpected GET ${path}`));
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Categories onAddCategory={jest.fn()} onBack={jest.fn()} />,
    );
    await Promise.resolve();
  });
  mountedRenderers.push(renderer!);
  await flush();
  return renderer!;
}

test('loads category cards and calculates product counts from ID then name', async () => {
  const renderer = await renderCategories();

  expect(hasText(renderer, 'Categories')).toBe(true);
  expect(hasText(renderer, 'Breakfast')).toBe(true);
  expect(hasText(renderer, '2 products')).toBe(true);
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Breakfast category image',
    }).props.source,
  ).toEqual({
    uri: 'https://restaurant.qtechx.com/uploads/categories/breakfast.webp',
  });
});

test('opens the dedicated Add Category screen from the category list', async () => {
  const onAddCategory = jest.fn();
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) =>
    Promise.resolve({
      data: { success: true, data: path === '/categories' ? [] : [] },
    }),
  );
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <Categories onAddCategory={onAddCategory} onBack={jest.fn()} />,
    );
    await Promise.resolve();
  });
  mountedRenderers.push(renderer!);
  await flush();
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Add category' })
      .props.onPress();
  });
  expect(onAddCategory).toHaveBeenCalledTimes(1);
});

test('edits existing categories and reports protected category deletion', async () => {
  const get = api.get as jest.Mock;
  const put = api.put as jest.Mock;
  const remove = api.delete as jest.Mock;
  const renderer = await renderCategories();

  get.mockImplementation((path: string) => {
    if (path === '/categories/CAT001') {
      return Promise.resolve({
        data: {
          success: true,
          data: {
            category_id: 'CAT001',
            category_name: 'Breakfast',
            description: 'Morning meals',
            sub_categories: ['Idli', 'Dosa'],
            category_image: '/uploads/categories/breakfast.webp',
            status: 'Active',
          },
        },
      });
    }
    if (path === '/categories') {
      return Promise.resolve({
        data: {
          success: true,
          data: [
            {
              category_id: 'CAT001',
              category_name: 'Breakfast',
              description: 'Updated description',
              sub_categories: ['Idli', 'Dosa'],
              category_image: '/uploads/categories/breakfast.webp',
              status: 'Inactive',
            },
          ],
        },
      });
    }
    if (path === '/foods') {
      return Promise.resolve({ data: { success: true, data: [] } });
    }
    return Promise.reject(new Error(`Unexpected GET ${path}`));
  });
  put.mockResolvedValue({ data: { success: true } });
  remove.mockRejectedValue(
    Object.assign(
      new Error('This category cannot be deleted while products still use it.'),
      {
        status: 409,
      },
    ),
  );

  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Edit Breakfast' })
      .props.onPress();
    await Promise.resolve();
  });
  await flush();
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Category description' })
      .props.onChangeText('Updated description');
    renderer.root
      .findByProps({ accessibilityLabel: 'Set category inactive' })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Save category changes' })
      .props.onPress();
    await Promise.resolve();
  });
  expect(put).toHaveBeenCalledWith(
    '/categories/CAT001',
    expect.objectContaining({
      categoryId: 'CAT001',
      description: 'Updated description',
      status: 'Inactive',
    }),
  );

  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Delete Breakfast' })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Confirm category deletion' })
      .props.onPress();
    await Promise.resolve();
  });
  expect(
    hasText(
      renderer,
      'This category cannot be deleted while products still use it.',
    ),
  ).toBe(true);
});
