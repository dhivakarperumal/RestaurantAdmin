import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Path } from 'react-native-svg';
import { HamburgerIcon } from '../src/Navigation/NavigationIcons';
import TopHeader from '../src/Navigation/TopHeader';

test('renders the supplied hamburger icon with a shorter middle bar', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <HamburgerIcon color="#000000" size={22} />,
    );
  });

  const bars = renderer!.root.findByType(Path);
  expect(bars.props.d).toBe('M4 5h16M4 12h9M4 19h16');
  expect(bars.props.strokeWidth).toBe('3');
  expect(bars.props.strokeLinecap).toBe('round');
});

test('opens and dismisses the profile menu and connects its actions', async () => {
  const onToggleSidebar = jest.fn();
  const onOpenNotifications = jest.fn();
  const onOpenProfile = jest.fn();
  const onLogout = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <TopHeader
        user={{ name: 'Maya Rivera', email: 'maya@example.com' }}
        unreadNotifications={4}
        onToggleSidebar={onToggleSidebar}
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={onOpenProfile}
        onLogout={onLogout}
      />,
    );
  });

  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Toggle sidebar' }),
  ).toBeTruthy();
  const logo = renderer!.root.findByProps({
    accessibilityLabel: 'Buy Food logo',
  });
  expect(logo.props.source).toBeDefined();
  expect(logo.props.resizeMode).toBe('contain');
  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Notifications, 4 unread' })
      .props.onPress();
  });
  expect(onOpenNotifications).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Open profile menu for Maya Rivera' })
      .props.onPress();
  });
  expect(JSON.stringify(renderer!.toJSON())).toContain('maya@example.com');

  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Profile' }).props.onPress();
  });
  expect(onOpenProfile).toHaveBeenCalledTimes(1);
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Profile' })).toHaveLength(0);

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Open profile menu for Maya Rivera' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Close profile menu' }).props.onPress();
  });
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Logout' })).toHaveLength(0);

  await ReactTestRenderer.act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Open profile menu for Maya Rivera' })
      .props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Logout' }).props.onPress();
  });
  expect(onLogout).toHaveBeenCalledTimes(1);
});

test('uses a fallback avatar initial when user details are missing', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <TopHeader
        user={null}
        unreadNotifications={0}
        onToggleSidebar={jest.fn()}
        onOpenNotifications={jest.fn()}
        onOpenProfile={jest.fn()}
        onLogout={jest.fn()}
      />,
    );
  });

  expect(JSON.stringify(renderer!.toJSON())).toContain('"children":["U"]');
});
