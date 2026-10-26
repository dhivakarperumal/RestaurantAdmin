import React from 'react';
import { Alert, TextInput, type AlertButton } from 'react-native';
import { Path } from 'react-native-svg';
import ReactTestRenderer from 'react-test-renderer';
import DashboardScreen from '../src/Navigation/DashboardScreen';
import { PlusIcon } from '../src/Navigation/NavigationIcons';
import api from '../api';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: { data: [] } })),
    post: jest.fn(() => Promise.resolve({ data: { success: true } })),
    put: jest.fn(() => Promise.resolve({ data: { success: true } })),
    delete: jest.fn(() => Promise.resolve({ data: { success: true } })),
  },
  API_BASE_URL: 'https://example.com/api',
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
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

test('navigates tabs and creates a session invoice from billing', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'Billing');
  expect(JSON.stringify(renderer.toJSON())).toContain('Invoice history');
  expect(JSON.stringify(renderer.toJSON())).toContain('No invoices yet');

  await press(renderer, 'New invoice');
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

  const plusStroke = renderer!.root.findByType(Path);
  expect(plusStroke.props.d).toBe('M12 5v14M5 12h14');
  expect(plusStroke.props.stroke).toBe('#FFFFFF');
  expect(plusStroke.props.strokeWidth).toBe('3');
});

test('opens an add-items page from the plus tab without opening a popup', async () => {
  const renderer = await renderDashboard();
  const addTab = renderer.root.findByProps({
    accessibilityLabel: 'Add',
  });
  expect(addTab.props.accessibilityRole).toBe('tab');
  await press(renderer, 'Add');
  expect(JSON.stringify(renderer.toJSON())).toContain('Add items');
  expect(JSON.stringify(renderer.toJSON())).toContain('Create Invoice');
  expect(JSON.stringify(renderer.toJSON())).toContain('Add Product');
  expect(JSON.stringify(renderer.toJSON())).toContain('M12 5v14M5 12h14');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('What would you like to do?');

  await press(renderer, 'Add Product');
  expect(renderer.root.findByProps({ placeholder: 'Product name' })).toBeTruthy();
});

test('opens banner management from the More tab', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'More');

  expect(JSON.stringify(renderer.toJSON())).toContain('Banner Management');
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Customers' })).toHaveLength(0);

  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({
      accessibilityLabel: 'Open Banner Management',
    }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('WEBSITE CONTENT');
  expect(JSON.stringify(renderer.toJSON())).toContain('Create, edit, and publish your website banners.');
  expect(api.get).toHaveBeenCalledWith('/banners');

  await press(renderer, 'Add banner');
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ placeholder: 'Banner title' }).props.onChangeText('Weekend offer');
    renderer.root.findByProps({
      placeholder: 'https://example.com/banner.jpg',
    }).props.onChangeText('https://example.com/weekend.jpg');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Create banner' }).props.onPress();
  });

  expect(api.post).toHaveBeenCalledWith(
    '/banners',
    expect.objectContaining({
      title: 'Weekend offer',
      image: 'https://example.com/weekend.jpg',
      type: 'hero',
      active: true,
    }),
  );
  expect(JSON.stringify(renderer.toJSON())).toContain('Banner added successfully.');

  await press(renderer, 'Back to More');
  expect(renderer.root.findByProps({ accessibilityLabel: 'Open Banner Management' })).toBeTruthy();
});

test('opens Gallery Management below Banner Management and creates an album', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/gallery/next-id') {
      return Promise.resolve({ data: { data: 'GAL004' } });
    }
    if (path === '/gallery') {
      return Promise.resolve({
        data: {
          success: true,
          data: [
            {
              album_id: 'GAL003',
              title: 'Summer collection',
              category: 'Photo Frames',
              status: 'Active',
              cover_image: '/uploads/summer.jpg',
              photos: ['/uploads/photo-one.jpg'],
              photo_count: 1,
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await press(renderer, 'More');

  const moreScreen = JSON.stringify(renderer.toJSON());
  expect(moreScreen.indexOf('Banner Management')).toBeLessThan(
    moreScreen.indexOf('Gallery Management'),
  );
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({
      accessibilityLabel: 'Open Gallery Management',
    }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'View gallery album Summer collection',
    }),
  ).toBeTruthy();
  expect(get).toHaveBeenCalledWith('/gallery');

  await press(renderer, 'Add gallery album');
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ placeholder: 'Album title' }).props.onChangeText('New collection');
    renderer.root
      .findByProps({ placeholder: 'e.g. Photo Frames' })
      .props.onChangeText('Canvas Prints');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Create album' }).props.onPress();
  });

  expect(get).toHaveBeenCalledWith('/gallery/next-id');
  expect(api.post).toHaveBeenCalledWith(
    '/gallery',
    expect.objectContaining({
      album_id: 'GAL004',
      title: 'New collection',
      category: 'Canvas Prints',
    }),
  );
});

test('opens Review Management below Gallery Management and creates a review', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/foods') {
      return Promise.resolve({
        data: {
          data: [{ food_id: 21, food_name: 'House Blend', food_images: [] }],
        },
      });
    }
    if (path === '/reviews/next-id') {
      return Promise.resolve({ data: { data: 'REV014' } });
    }
    if (path === '/reviews/stats') {
      return Promise.resolve({
        data: {
          data: {
            total_reviews: 0,
            avg_rating: 0,
            five_star_count: 0,
            photo_reviews_count: 0,
            published_count: 0,
          },
        },
      });
    }
    if (path === '/reviews') {
      return Promise.resolve({ data: { data: [] } });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await press(renderer, 'More');
  const moreScreen = JSON.stringify(renderer.toJSON());
  expect(moreScreen.indexOf('Gallery Management')).toBeLessThan(
    moreScreen.indexOf('Review Management'),
  );
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({
      accessibilityLabel: 'Open Review Management',
    }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(JSON.stringify(renderer.toJSON())).toContain('Manage customer ratings, comments, and review photos.');
  expect(get).toHaveBeenCalledWith('/reviews');
  expect(get).toHaveBeenCalledWith('/reviews/stats');

  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Add review' }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await press(renderer, 'Select food for review');
  await press(renderer, 'Select food House Blend');
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ placeholder: 'Customer name' }).props.onChangeText('Maya Rivera');
    renderer.root
      .findByProps({ placeholder: "Write the customer's review..." })
      .props.onChangeText('Excellent coffee and friendly service.');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Create review' }).props.onPress();
  });

  expect(api.post).toHaveBeenCalledWith(
    '/reviews',
    expect.objectContaining({
      review_id: 'REV014',
      product_id: 21,
      product_name: 'House Blend',
      product_type: 'food',
      reviewer_name: 'Maya Rivera',
      rating: 5,
      comment: 'Excellent coffee and friendly service.',
      status: 'Published',
    }),
  );
  expect(JSON.stringify(renderer.toJSON())).toContain('Review added successfully.');
});

test('loads review details, updates a review, and deletes it', async () => {
  const review = {
    id: 73,
    review_id: 'REV073',
    product_id: 21,
    product_code: '21',
    product_name: 'House Blend',
    product_type: 'food',
    reviewer_name: 'Alex Morgan',
    reviewer_email: 'alex@example.com',
    rating: 4,
    title: 'Nice coffee',
    comment: 'A good cup of coffee.',
    review_photo: '',
    status: 'Pending',
    created_by: 'Admin',
  };
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/foods') {
      return Promise.resolve({
        data: { data: [{ food_id: 21, food_name: 'House Blend' }] },
      });
    }
    if (path === '/reviews/stats') {
      return Promise.resolve({ data: { data: { total_reviews: 1, avg_rating: 4 } } });
    }
    if (path === '/reviews/73') {
      return Promise.resolve({ data: { data: review } });
    }
    if (path === '/reviews') {
      return Promise.resolve({ data: { data: [review] } });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await press(renderer, 'More');
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({
      accessibilityLabel: 'Open Review Management',
    }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({
      accessibilityLabel: 'View review REV073',
    }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  expect(get).toHaveBeenCalledWith('/reviews/73');
  expect(JSON.stringify(renderer.toJSON())).toContain('A good cup of coffee.');
  await press(renderer, 'Close review details');
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({
      accessibilityLabel: 'Edit review REV073',
    }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ placeholder: "Write the customer's review..." })
      .props.onChangeText('Updated review after another visit.');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Save review changes' })
      .props.onPress();
  });

  expect(api.put).toHaveBeenCalledWith(
    '/reviews/73',
    expect.objectContaining({
      review_id: 'REV073',
      comment: 'Updated review after another visit.',
      product_id: 21,
    }),
  );

  let confirmDelete: AlertButton | undefined;
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
    confirmDelete = buttons?.find(button => button.text === 'Delete');
  });
  await press(renderer, 'Delete review REV073');
  await ReactTestRenderer.act(async () => {
    await confirmDelete?.onPress?.();
  });
  expect(alert).toHaveBeenCalled();
  expect(api.delete).toHaveBeenCalledWith('/reviews/73');
  alert.mockRestore();
});

test('shows full-width sidebar navigation with icons and labels in the same row', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'Toggle sidebar');
  const homeNavigationItems = renderer.root.findAllByProps({
    accessibilityLabel: 'Home',
  });
  const sidebarHome = homeNavigationItems.find(item =>
    item.props.className?.includes('flex-row'),
  );

  expect(sidebarHome).toBeTruthy();
  expect(sidebarHome!.props.className).toContain('w-full');
  expect(sidebarHome!.props.className).toContain('gap-3');
  expect(JSON.stringify(renderer.toJSON())).toContain('WORKSPACE');
  expect(JSON.stringify(renderer.toJSON())).toContain('Buy Food');
  expect(JSON.stringify(renderer.toJSON())).toContain('h-12 w-12 shrink-0');
  expect(JSON.stringify(renderer.toJSON())).toContain('w-full flex-1 border-r');

  await press(renderer, 'Close sidebar navigation');
  expect(
    renderer.root
      .findAllByProps({ accessibilityLabel: 'Home' })
      .some(item => item.props.className?.includes('flex-row')),
  ).toBe(false);
});

test('sidebar menu items navigate to their page and dismiss the sidebar', async () => {
  const renderer = await renderDashboard();

  await press(renderer, 'Toggle sidebar');
  const ordersMenuItem = renderer.root
    .findAllByProps({ accessibilityLabel: 'Orders' })
    .find(item => item.props.accessibilityRole === 'button');

  expect(ordersMenuItem).toBeTruthy();
  await ReactTestRenderer.act(() => {
    ordersMenuItem!.props.onPress();
  });

  const screen = JSON.stringify(renderer.toJSON());
  expect(screen).toContain('Keep track of every customer order.');
  expect(screen).not.toContain('WORKSPACE');
});

test('loads the restaurant POS dashboard snapshot and revenue reports', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    const today = new Date().toISOString();
    const dataByPath: Record<string, unknown> = {
      '/orders/management': { data: [
        {
          order_id: 'ORD-12',
          customer_name: 'Alex Morgan',
          order_status: 'Processing',
          total_amount: 1450,
          order_date: today,
        },
      ] },
      '/table-bills': { bills: [{ bill_id: 4, status: 'active' }] },
      '/kitchen-orders': { orders: [] },
      '/users': { data: [{ role: 'customer' }, { role: 'admin' }] },
      '/foods': { data: [
        {
          food_name: 'House Blend',
          size_variants: [{ stock: 4 }],
        },
      ] },
      '/inventory/dashboard': { data: { lowStock: 1, pendingKitchenRequests: 2 } },
      '/inventory/kitchen-requests': { data: [] },
      '/categories': { data: [{ category_name: 'Coffee', status: 'Active' }] },
      '/revenue/summary': { data: { totalRevenue: 1450 } },
      '/revenue/trend': { data: [{ date: today, revenue: 1450 }] },
      '/revenue/status': { data: [{ status: 'Delivered', count: 1 }] },
    };
    return Promise.resolve({
      data: dataByPath[path] ?? { data: [] },
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
  expect(get).toHaveBeenCalledWith(
    '/orders/management',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(get).toHaveBeenCalledWith(
    '/table-bills',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(get).toHaveBeenCalledWith(
    '/users',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(get).toHaveBeenCalledWith('/foods', expect.any(Object));
  expect(get).toHaveBeenCalledWith('/inventory/dashboard', expect.any(Object));
  expect(get).toHaveBeenCalledWith('/inventory/kitchen-requests', expect.any(Object));
  expect(get).toHaveBeenCalledWith('/categories', expect.any(Object));
  expect(get).toHaveBeenCalledWith(
    '/revenue/summary',
    expect.objectContaining({ params: { range: 'year' } }),
  );
  expect(get).toHaveBeenCalledWith(
    '/revenue/trend',
    expect.objectContaining({
      params: { range: 'year', trend: 'year', dateBasis: 'delivered' },
    }),
  );
  expect(output).toContain('Alex Morgan');
  expect(output).toContain('House Blend');
  expect(output).toContain('Low stock');
  expect(output).toContain('1,450');
  expect(output).toContain('Total Customers');
  expect(output).toContain('Today’s Revenue');
});

test('keeps available dashboard sections visible when one POS endpoint fails', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/foods') {
      return Promise.reject(new Error('Food service unavailable'));
    }
    if (path === '/orders/management') {
      return Promise.resolve({
        data: {
          data: [
            {
              order_id: 'ORD-15',
              customer_name: 'Sam Lee',
              order_status: 'Delivered',
              total_amount: 725,
              order_date: new Date().toISOString(),
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
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
  expect(output).toContain('Sam Lee');
  expect(output).toContain('Could not load /foods');
  expect(output).toContain('Retry dashboard loading');
});

test('requests reports for a selected custom date range', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation(() => Promise.resolve({ data: { data: [] } }));
  const renderer = await renderDashboard();

  await press(renderer, 'Show custom dashboard data');
  await ReactTestRenderer.act(() => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Custom range start date' })
      .props.onChangeText('2025-01-01');
    renderer.root
      .findByProps({ accessibilityLabel: 'Custom range end date' })
      .props.onChangeText('2025-01-31');
  });

  expect(get).toHaveBeenCalledWith(
    '/revenue/summary',
    expect.objectContaining({
      params: {
        range: 'custom',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      },
    }),
  );
});

test('shows employees returned in the backend employees response property', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation((path: string) => {
    if (path === '/employees') {
      return Promise.resolve({
        data: {
          success: true,
          employees: [
            {
              employee_id: 12,
              full_name: 'Jordan Lee',
              employee_type: 'Server',
              email: 'jordan@example.com',
              status: 'Active',
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });

  const renderer = await renderDashboard();
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Employees' }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('Jordan Lee');
  expect(output).toContain('Server');
}, 15000);

test('creates an employee from the employee form', async () => {
  const get = api.get as jest.Mock;
  get.mockImplementation(() => Promise.resolve({ data: { employees: [] } }));
  const post = api.post as jest.Mock;
  const renderer = await renderDashboard();

  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Employees' }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await press(renderer, 'Add new employee');
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ accessibilityLabel: 'Full name' }).props.onChangeText('Taylor Morgan');
    renderer.root.findByProps({ accessibilityLabel: 'Phone number' }).props.onChangeText('9876543210');
    renderer.root.findByProps({ accessibilityLabel: 'Email' }).props.onChangeText('taylor@example.com');
    renderer.root.findByProps({ accessibilityLabel: 'Street address' }).props.onChangeText('10 Main Street');
    renderer.root.findByProps({ accessibilityLabel: 'Area / locality' }).props.onChangeText('Anna Nagar');
    renderer.root.findByProps({ accessibilityLabel: 'City' }).props.onChangeText('Chennai');
    renderer.root.findByProps({ accessibilityLabel: 'District' }).props.onChangeText('Chennai');
    renderer.root.findByProps({ accessibilityLabel: 'State' }).props.onChangeText('Tamil Nadu');
    renderer.root.findByProps({ accessibilityLabel: 'Pincode' }).props.onChangeText('600001');
    renderer.root.findByProps({ accessibilityLabel: 'Basic salary' }).props.onChangeText('25000');
    renderer.root.findByProps({ accessibilityLabel: 'Password' }).props.onChangeText('secure-pass');
    renderer.root.findByProps({ accessibilityLabel: 'Confirm password' }).props.onChangeText('secure-pass');
  });
  await press(renderer, 'Cuisine type: South Indian');
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Create employee' }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(post).toHaveBeenCalledWith(
    '/employees',
    expect.anything(),
    expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}, 15000);

test('loads employee details and submits edits to the employee endpoint', async () => {
  const get = api.get as jest.Mock;
  const employee = {
    employee_id: 37,
    full_name: 'Casey Rivers',
    employee_type: 'Server',
    email: 'casey@example.com',
    phone_number: '9876543210',
    status: 'Active',
    address: '10 Main Street',
    area_locality: 'Anna Nagar',
    city: 'Chennai',
    district: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    basic_salary: 25000,
  };
  get.mockImplementation((path: string) => {
    if (path === '/employees') {
      return Promise.resolve({ data: { employees: [employee] } });
    }
    if (path === '/employees/37') {
      return Promise.resolve({ data: { employee } });
    }
    return Promise.resolve({ data: { data: [] } });
  });
  const put = api.put as jest.Mock;
  const renderer = await renderDashboard();
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Employees' }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Edit employee Casey Rivers' })
      .props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Full name' }).props.value,
  ).toBe('Casey Rivers');
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Save employee changes' }).props.onPress();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });

  expect(put).toHaveBeenCalledWith(
    '/employees/37',
    expect.anything(),
    expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}, 15000);

test('shows and hides employee passwords independently', async () => {
  const renderer = await renderDashboard();
  await press(renderer, 'Employees');
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  await press(renderer, 'Add new employee');

  const passwordField = renderer.root.findByProps({ accessibilityLabel: 'Password' });
  const confirmPasswordField = renderer.root.findByProps({
    accessibilityLabel: 'Confirm password',
  });
  expect(passwordField.props.secureTextEntry).toBe(true);
  expect(confirmPasswordField.props.secureTextEntry).toBe(true);

  await press(renderer, 'Show password');
  expect(passwordField.props.secureTextEntry).toBe(false);
  expect(confirmPasswordField.props.secureTextEntry).toBe(true);

  await press(renderer, 'Show confirm password');
  expect(passwordField.props.secureTextEntry).toBe(false);
  expect(confirmPasswordField.props.secureTextEntry).toBe(false);

  await press(renderer, 'Hide password');
  await press(renderer, 'Hide confirm password');
  expect(passwordField.props.secureTextEntry).toBe(true);
  expect(confirmPasswordField.props.secureTextEntry).toBe(true);
}, 15000);
