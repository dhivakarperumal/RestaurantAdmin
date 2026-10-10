import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import LoginPage from '../src/Auth/LoginPage';

async function renderLoginPage(onLogin: jest.Mock = jest.fn()) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <LoginPage onLogin={onLogin} onShowRegister={jest.fn()} />,
    );
  });
  return { renderer: renderer!, onLogin };
}

test('submits the entered login credentials', async () => {
  const { renderer, onLogin } = await renderLoginPage(
    jest.fn().mockResolvedValue(undefined),
  );

  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ placeholder: 'you@example.com or username' })
      .props.onChangeText('maya@example.com');
    renderer.root.findByProps({ placeholder: 'Enter your password' })
      .props.onChangeText('secret123');
  });

  await ReactTestRenderer.act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Login' }).props.onPress();
  });

  expect(onLogin).toHaveBeenCalledWith({
    identifier: 'maya@example.com',
    password: 'secret123',
  });
});

test('toggles password visibility accessibly', async () => {
  const { renderer } = await renderLoginPage();
  const passwordInput = renderer.root.findByProps({
    placeholder: 'Enter your password',
  });

  expect(passwordInput.props.secureTextEntry).toBe(true);
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ accessibilityLabel: 'Show password' })
      .props.onPress();
  });
  expect(
    renderer.root.findByProps({ placeholder: 'Enter your password' }).props
      .secureTextEntry,
  ).toBe(false);
});

test('rejects an invalid email identifier before calling the auth handler', async () => {
  const { renderer, onLogin } = await renderLoginPage();

  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ placeholder: 'you@example.com or username' })
      .props.onChangeText('invalid@email');
    renderer.root.findByProps({ placeholder: 'Enter your password' })
      .props.onChangeText('secret123');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Login' }).props.onPress();
  });

  expect(onLogin).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain('Enter a valid email address');
});
