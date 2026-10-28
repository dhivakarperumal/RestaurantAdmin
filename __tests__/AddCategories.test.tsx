import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../api';
import AddCategories from '../src/Admin/Screens/AddCategories';

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

afterEach(() => {
  jest.clearAllMocks();
});

async function flush() {
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 0)),
  );
}

test('generates the ID and saves a category from the dedicated page', async () => {
  const get = api.get as jest.Mock;
  const post = api.post as jest.Mock;
  const onBack = jest.fn();
  get.mockResolvedValue({ data: { success: true, data: 'CAT012' } });
  post.mockResolvedValue({ data: { success: true } });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AddCategories onBack={onBack} />);
    await Promise.resolve();
  });
  await flush();

  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Category ID' }).props
      .value,
  ).toBe('CAT012');
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Category name' })
      .props.onChangeText('Lunch');
    renderer!.root
      .findByProps({ accessibilityLabel: 'Category description' })
      .props.onChangeText('Afternoon menu');
    renderer!.root
      .findByProps({ accessibilityLabel: 'Subcategory name' })
      .props.onChangeText('Rice');
  });
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Add subcategory' })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Save category' })
      .props.onPress();
    await Promise.resolve();
  });

  expect(post).toHaveBeenCalledWith('/categories', {
    categoryId: 'CAT012',
    categoryName: 'Lunch',
    description: 'Afternoon menu',
    subcategories: ['Rice'],
    image: '',
    status: 'Active',
  });
  expect(onBack).toHaveBeenCalledTimes(1);
  ReactTestRenderer.act(() => renderer!.unmount());
});

test('uploads and previews a category image on the dedicated page', async () => {
  (api.get as jest.Mock).mockResolvedValue({
    data: { success: true, data: 'CAT013' },
  });
  (api.post as jest.Mock).mockResolvedValue({
    data: { success: true, url: '/uploads/categories/new-image.jpg' },
  });
  (launchImageLibrary as jest.Mock).mockResolvedValue({
    assets: [
      {
        uri: 'file:///new-image.jpg',
        fileName: 'new-image.jpg',
        fileSize: 1024,
        type: 'image/jpeg',
      },
    ],
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AddCategories onBack={jest.fn()} />);
    await Promise.resolve();
  });
  await flush();
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Choose category image' })
      .props.onPress();
    await Promise.resolve();
  });

  expect(api.post).toHaveBeenCalledWith('/upload', expect.any(FormData), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Category image preview',
    }).props.source,
  ).toEqual({
    uri: 'https://restaurant.qtechx.com/uploads/categories/new-image.jpg',
  });
  ReactTestRenderer.act(() => renderer!.unmount());
});
