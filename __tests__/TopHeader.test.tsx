import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { Path } from 'react-native-svg';
import { HamburgerIcon } from '../src/Admin/Navigation/NavigationIcons';
import TopHeader from '../src/Admin/Navigation/TopHeader';

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
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 400, height: 800 },
          insets: { top: 24, right: 0, bottom: 0, left: 0 },
        }}
      >
        <TopHeader
          user={{ name: 'Maya Rivera', email: 'maya@example.com' }}
          activeTab="home"
          unreadNotifications={4}
          onToggleSidebar={onToggleSidebar}
          onOpenNotifications={onOpenNotifications}
          onOpenProfile={onOpenProfile}
          onLogout={onLogout}
        />
      </SafeAreaProvider>,
    );
  });

  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Toggle sidebar' }),
  ).toBeTruthy();
  expect(renderer!.root.findByType(SafeAreaView).props.edges).toEqual(['top']);
  expect(JSON.stringify(renderer!.toJSON())).toContain('#052E10');
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
    renderer!.root
      .findByProps({ accessibilityLabel: 'Open profile menu for Maya Rivera' })
      .props.onPress();
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
  expect(alertSpy).toHaveBeenCalledWith(
    'Log out?',
    'Are you sure you want to log out of your account?',
    expect.arrayContaining([
      expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
      expect.objectContaining({ text: 'Log out', style: 'destructive' }),
    ]),
    { cancelable: true },
  );
  expect(onLogout).not.toHaveBeenCalled();
  const alertButtons = alertSpy.mock.calls[0][2];
  const confirmLogout = alertButtons?.find(button => button.text === 'Log out');
  await ReactTestRenderer.act(() => {
    confirmLogout?.onPress?.();
  });
  expect(onLogout).toHaveBeenCalledTimes(1);
  alertSpy.mockRestore();
});

test('uses a fallback avatar initial when user details are missing', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 400, height: 800 },
          insets: { top: 24, right: 0, bottom: 0, left: 0 },
        }}
      >
        <TopHeader
          user={null}
          activeTab="home"
          unreadNotifications={0}
          onToggleSidebar={jest.fn()}
          onOpenNotifications={jest.fn()}
          onOpenProfile={jest.fn()}
          onLogout={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });

  expect(JSON.stringify(renderer!.toJSON())).toContain('"children":["U"]');
});
