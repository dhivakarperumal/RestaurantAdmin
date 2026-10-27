import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../api';
import AddCuisine from '../src/Screens/AddCuisine';

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

test('generates cuisine ID and posts the full cuisine form payload', async () => {
  const get = api.get as jest.Mock;
  const post = api.post as jest.Mock;
  const onBack = jest.fn();
  get.mockResolvedValue({ data: { success: true, data: 'CUS014' } });
  post.mockResolvedValue({ data: { success: true } });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AddCuisine onBack={onBack} />);
    await Promise.resolve();
  });
  await flush();

  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Cuisine ID' }).props
      .value,
  ).toBe('CUS014');

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Cuisine name' })
      .props.onChangeText('Thai');
    renderer!.root
      .findByProps({ accessibilityLabel: 'Cuisine description' })
      .props.onChangeText('Regional dishes');
    renderer!.root
      .findByProps({ accessibilityLabel: 'Toggle featured cuisine' })
      .props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Save cuisine' })
      .props.onPress();
    await Promise.resolve();
  });

  expect(post).toHaveBeenCalledWith('/cuisines', {
    cuisine_id: 'CUS014',
    cuisine_name: 'Thai',
    description: 'Regional dishes',
    image: '',
    status: 'Active',
    featured: true,
  });
  expect(onBack).toHaveBeenCalledTimes(1);
  ReactTestRenderer.act(() => renderer!.unmount());
});

test('uploads and previews cuisine images', async () => {
  (api.get as jest.Mock).mockResolvedValue({
    data: { success: true, data: 'CUS015' },
  });
  (api.post as jest.Mock).mockResolvedValue({
    data: { success: true, url: '/uploads/cuisines/thai.jpg' },
  });
  (launchImageLibrary as jest.Mock).mockResolvedValue({
    assets: [
      {
        uri: 'file:///thai.jpg',
        fileName: 'thai.jpg',
        fileSize: 1024,
        type: 'image/jpeg',
      },
    ],
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AddCuisine onBack={jest.fn()} />);
    await Promise.resolve();
  });
  await flush();
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Choose cuisine image' })
      .props.onPress();
    await Promise.resolve();
  });

  expect(api.post).toHaveBeenCalledWith('/upload', expect.any(FormData), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Cuisine image preview',
    }).props.source,
  ).toEqual({ uri: 'https://restaurant.qtechx.com/uploads/cuisines/thai.jpg' });
  ReactTestRenderer.act(() => renderer!.unmount());
});
