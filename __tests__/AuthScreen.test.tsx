import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AuthScreen from '../src/Auth/AuthScreen';

test('returns to login after registration instead of signing in to the dashboard', async () => {
  const onRegister = jest.fn().mockResolvedValue(undefined);
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <AuthScreen onLogin={jest.fn()} onRegister={onRegister} />,
    );
  });

  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Register' }).props.onPress();
  });
  expect(JSON.stringify(renderer!.toJSON())).toContain('Create Account');

  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ placeholder: 'Your name' }).props.onChangeText('Maya Rivera');
    renderer!.root.findByProps({ placeholder: 'you@example.com' }).props.onChangeText('maya@example.com');
    renderer!.root.findByProps({ placeholder: 'Your phone number' }).props.onChangeText('5551234567');
    renderer!.root.findByProps({ placeholder: 'Create a password' }).props.onChangeText('secret123');
    renderer!.root.findByProps({ placeholder: 'Enter your password again' }).props.onChangeText('secret123');
    renderer!.root
      .findByProps({ accessibilityLabel: 'Accept Terms and Conditions' })
      .props.onPress();
  });

  await ReactTestRenderer.act(async () => {
    await renderer!.root
      .findByProps({ accessibilityLabel: 'Create account' })
      .props.onPress();
  });

  const screen = JSON.stringify(renderer!.toJSON());
  expect(onRegister).toHaveBeenCalledTimes(1);
  expect(screen).toContain('Welcome Back!');
  expect(screen).toContain('Account created successfully. Please log in to continue.');
  expect(screen).not.toContain('Create Account');
});
