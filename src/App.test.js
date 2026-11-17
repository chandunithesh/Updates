import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { Login } from './Login';
import { Dashboard } from './admin/SuperAdminDashboard';
import MyTask from './technician/MyTask';
import CustomerFeedback from './technician/CustomerFeedback';
import MyRequests from './MyRequests';

jest.mock('./ServiceAgent/ServiceAgent', () => ({ user }) => (
  <div data-organization-id={user?.organizationId}>Service agent dashboard</div>
));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  jest.clearAllMocks();
});

test('landing page is the initial screen and opens login', () => {
  localStorage.removeItem('servicedesk-demo-user');
  localStorage.removeItem('servicedesk-auth-screen');

  render(<App />);

  expect(screen.getByRole('heading', { name: /manage every service/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Login' }));
  expect(screen.getByText('Welcome back')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /back to landing page/i }));
  expect(screen.getByRole('heading', { name: /manage every service/i })).toBeInTheDocument();
});

test('login screen remains open after reloading before sign-in', () => {
  const view = render(<App />);
  fireEvent.click(screen.getByRole('link', { name: 'Login' }));
  view.unmount();

  render(<App />);

  expect(screen.getByText('Welcome back')).toBeInTheDocument();
});

test('a fresh app session starts at landing instead of restoring a saved login', () => {
  localStorage.setItem('servicedesk-demo-user', JSON.stringify({
    name: 'Previous User',
    email: 'previous@example.com',
    role: 'Super Admin',
    password: 'should-not-be-persisted',
  }));

  render(<App />);

  expect(screen.getByRole('heading', { name: /manage every service/i })).toBeInTheDocument();
  expect(localStorage.getItem('servicedesk-demo-user')).toBeNull();
});

test('profile button opens its menu and signs out', () => {
  const onLogout = jest.fn();
  render(<Dashboard user={{ name: 'Test Admin', email: 'admin@example.com', role: 'Super Admin' }} onLogout={onLogout} />);

  fireEvent.click(screen.getByRole('button', { name: /test admin/i }));

  expect(screen.getByRole('menu')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }));
  expect(onLogout).toHaveBeenCalledTimes(1);
});

test('organisation form includes subscription details', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify({}),
  });

  try {
    render(<Dashboard user={{ name: 'Test Admin', email: 'admin@example.com', role: 'Super Admin' }} onLogout={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /add organisation/i }));

    expect(await screen.findByText('Subscription Plan *')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Billing Cycle')).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});

test('successful subscription assignment increases the dashboard total', async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = 'test-api-key';
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify({}),
  });

  try {
    const view = render(<Dashboard user={{ name: 'Test Admin', email: 'admin@example.com', role: 'Super Admin' }} onLogout={jest.fn()} />);

    expect(await screen.findByText('99')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add subscription/i }));
    fireEvent.change(screen.getByLabelText('Plan Name *'), { target: { value: 'Test Plan' } });
    fireEvent.change(screen.getByLabelText('Monthly Price *'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Maximum Users *'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Maximum Assets *'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Plan' }));

    expect(await screen.findByText('Subscription assigned successfully.')).toBeInTheDocument();
    expect(await screen.findByText('100')).toBeInTheDocument();

    view.unmount();
    render(<Dashboard user={{ name: 'Test Admin', email: 'admin@example.com', role: 'Super Admin' }} onLogout={jest.fn()} />);
    expect(await screen.findByText('100')).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test('creating an organisation with a subscription plan increases the dashboard total', async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = 'test-api-key';
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify({}),
  });

  try {
    render(<Dashboard user={{ name: 'Test Admin', email: 'admin@example.com', role: 'Super Admin' }} onLogout={jest.fn()} />);

    expect(await screen.findByText('99')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add organisation/i }));
    fireEvent.change(screen.getByLabelText('Subscription Plan *'), { target: { value: 'Professional' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Org' }));

    expect(await screen.findByText('Organisation created successfully.')).toBeInTheDocument();
    expect(await screen.findByText('100')).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test('service agent login opens the service request dashboard', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ([{
      success: true,
      userId: 'agent-123',
      userRole: ['Service Agent'],
      Organization_ID: 2,
    }]),
  });

  try {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Login' }));
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'agent@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /operations sign in/i }));
    fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    expect(await screen.findByText('Service agent dashboard')).toBeInTheDocument();
    expect(screen.getByText('Service agent dashboard')).toHaveAttribute('data-organization-id', '2');
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});

test('customer stays on the current page after reloading', async () => {
  localStorage.setItem('customerId', 'customer-123');
  localStorage.setItem('servicedesk-customer-requests:customer-123', JSON.stringify([{
    id: 'SR-123',
    title: 'Persistent request',
    category: 'Repair',
    location: 'Test City',
    status: 'Under Review',
    priority: 'Normal',
    created: '2026-10-29',
    scheduled: null,
    updated: '2026-10-29',
  }]));
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ customerId: 'customer-123' }),
  });

  const signIn = async () => {
    fireEvent.click(screen.getByRole('link', { name: 'Login' }));
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'customer@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in to customer portal/i }));
    expect(await screen.findByText('Persistent request')).toBeInTheDocument();
  };

  try {
    const view = render(<App />);
    await signIn();
    fireEvent.click(screen.getByRole('button', { name: 'My Requests' }));
    expect(await screen.findByText('Persistent request')).toBeInTheDocument();
    view.unmount();

    render(<App />);
    expect(await screen.findByText('Persistent request')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Requests' })).toHaveAttribute('aria-current', 'page');
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});

test('operations admin remains in the operations portal after reloading', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      userRole: [{ name: 'Operations Admin' }],
      userId: 'operations-123',
    }),
  });

  try {
    const view = render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Login' }));
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'operations@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /operations sign in/i }));
    fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    expect(await screen.findByText('Super Admin Console')).toBeInTheDocument();
    view.unmount();

    render(<App />);

    expect(screen.getByText('Super Admin Console')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /manage every service/i })).not.toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});

test('organization admins must use operations sign in instead of customer sign in', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn((url) => {
    if (
      String(url).includes('userLogin') ||
      String(url).includes('LoginPage')
    ) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          userRole: [{ name: 'Organization Admin' }],
          userId: 'organization-123',
          organizationId: 2,
        }),
      });
    }

    return Promise.resolve({ ok: true, text: async () => JSON.stringify([]) });
  });

  try {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Login' }));
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'organization@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /sign in to customer portal/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /use operations sign in/i,
    );
    expect(
      screen.queryByRole('heading', { name: 'Overview' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /operations sign in/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /sign in to workspace/i }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Overview' }),
    ).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});

test('customer restores the saved page and session within the current browser session', async () => {
  const user = { name: 'Customer', email: 'customer@example.com', role: 'Customer', isDemo: true };
  sessionStorage.setItem('servicedesk-demo-user', JSON.stringify(user));
  localStorage.setItem('servicedesk-page:customer@example.com', 'requests');
  localStorage.setItem('servicedesk-customer-requests:demo', JSON.stringify([{
    id: 'SR-999',
    title: 'Saved request',
    status: 'Under Review',
    priority: 'Normal',
    created: '2026-10-31',
    updated: '2026-10-31',
  }]));
  render(<App />);

  expect(screen.getByText('Saved request')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'My Requests' })).toHaveAttribute('aria-current', 'page');
});

test('password toggle is rendered once in the login form', () => {
  render(<Login onLogin={jest.fn()} />);

  expect(screen.getAllByRole('button', { name: /show|hide/i })).toHaveLength(1);
});

test('technician accepts a task and starts it only after OTP verification', async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = 'test-api-key';
  const jsonResponse = (value) => ({
    ok: true,
    text: async () => JSON.stringify(value),
  });
  global.fetch = jest.fn()
    .mockResolvedValueOnce(jsonResponse([{
      serviceTicketId: 51,
      serviceRequestId: 123,
      ticketNumber: 'TKT-51',
      status: 'ASSIGNED',
      serviceRequest: { issueTitle: 'Air conditioner repair' },
    }]))
    .mockResolvedValueOnce(jsonResponse({ success: true }))
    .mockResolvedValueOnce(jsonResponse({ success: true }))
    .mockResolvedValueOnce(jsonResponse({ success: true }))
    .mockResolvedValueOnce(jsonResponse({ success: true }))
    .mockResolvedValueOnce(jsonResponse({ success: true }))
    .mockResolvedValueOnce(jsonResponse({ success: true }))
    .mockResolvedValueOnce(jsonResponse({ success: true }))
    .mockResolvedValueOnce(jsonResponse({ success: true }));

  try {
    render(
      <MyTask
        user={{ email: 'tech@example.com', userId: 11 }}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: /view/i }));
    fireEvent.click(screen.getByRole('button', { name: /accept task/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        'https://techtamminaapps.appiancloud.com/suite/webapi/acceptTask',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ serviceReqId: 123, userId: 11 }),
        }),
      );
    });

    fireEvent.click(await screen.findByRole('button', { name: /start task/i }));
    expect(await screen.findByLabelText(/start-task verification code/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/start-task verification code/i), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('/startOTP-verify?OTP=12345&ticketId=51'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        5,
        'https://techtamminaapps.appiancloud.com/suite/webapi/TgktCg',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ serviceTicketId: 51 }),
        }),
      );
    });
    expect(
      await screen.findByText('In progress', { selector: 'span.tech-status' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /fill repair details/i }));
    fireEvent.change(screen.getByLabelText(/root cause/i), {
      target: { value: 'Blocked component' },
    });
    fireEvent.change(screen.getByLabelText(/repair outcome/i), {
      target: { value: 'Repair Completed' },
    });
    fireEvent.change(screen.getByLabelText(/inspection notes/i), {
      target: { value: 'Inspected the pump.' },
    });
    fireEvent.change(screen.getByLabelText(/diagnosis notes/i), {
      target: { value: 'Debris blocked the pump.' },
    });
    fireEvent.change(screen.getByLabelText(/outcome reason/i), {
      target: { value: 'The blockage was removed.' },
    });
    fireEvent.change(screen.getByLabelText(/testing result/i), {
      target: { value: 'Passed' },
    });
    fireEvent.change(screen.getByLabelText(/work performed/i), {
      target: { value: 'Cleaned the pump.' },
    });
    fireEvent.change(screen.getByLabelText(/testing notes/i), {
      target: { value: 'The drain cycle passed.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save repair details/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        6,
        expect.stringContaining('https://techtamminaapps.appiancloud.com/suite/webapi/repair?data='),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
    const repairUrl = new URL(global.fetch.mock.calls[5][0]);
    const repairPayload = JSON.parse(repairUrl.searchParams.get('data'));
    expect(repairPayload).toEqual(expect.objectContaining({
      serviceTicketId: 51,
      issueCategory: 'Other',
      rootCause: 'Blocked component',
      inspectionNotes: 'Inspected the pump.',
      diagnosisNotes: 'Debris blocked the pump.',
      repairOutcome: 'Repair Completed',
      outcomeReason: 'The blockage was removed.',
      workPerformed: 'Cleaned the pump.',
      testingResult: 'Passed',
      testingNotes: 'The drain cycle passed.',
      repairStatus: 'Completed',
      repairStartedOn: expect.any(String),
      repairSubmittedOn: expect.any(String),
      repairCompletedOn: expect.any(String),
      createdBy: 'tech@example.com',
      createdOn: expect.any(String),
      modifiedBy: 'tech@example.com',
      modifiedOn: expect.any(String),
    }));

    fireEvent.click(await screen.findByRole('button', { name: /complete task/i }));
    expect(await screen.findByLabelText(/end-task verification code/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/end-task verification code/i), {
      target: { value: '54321' },
    });
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(9));
    expect(global.fetch).toHaveBeenNthCalledWith(
      7,
      'https://techtamminaapps.appiancloud.com/suite/webapi/endtaskOTP',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ serviceTicketId: 51 }),
      }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      8,
      expect.stringContaining('/cerifyEndTask?OTP=54321&ticketId=51'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      9,
      'https://techtamminaapps.appiancloud.com/suite/webapi/3Oj3Gg',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ serviceTicketId: 51 }),
      }),
    );
    expect(await screen.findByText(/customer can confirm the service/i)).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test('customer confirms completion and saves feedback in the browser', () => {
  render(
    <CustomerFeedback
      request={{
        id: 'SR-205',
        title: 'Equipment repair',
        status: 'Completed',
        category: 'Repair',
      }}
      user={{ email: 'customer@example.com' }}
      onBack={jest.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: /confirm service completion/i }));
  fireEvent.change(screen.getByLabelText(/overall satisfaction/i), {
    target: { value: '5' },
  });
  fireEvent.change(screen.getByLabelText(/additional comments/i), {
    target: { value: 'Technician was on time.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

  expect(
    JSON.parse(
      localStorage.getItem('servicedesk-customer-feedback:customer@example.com:SR-205'),
    ),
  ).toEqual(expect.objectContaining({
    requestId: 'SR-205',
    confirmed: true,
    rating: '5',
    comments: 'Technician was on time.',
  }));
  expect(
    screen.getByText('Thanks. Your feedback is saved in this browser.'),
  ).toBeInTheDocument();
});

test('completed customer request opens its confirmation and feedback screen', async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = 'test-api-key';
  localStorage.setItem('customerId', 'customer-123');
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ Success: true, response: [] }),
  });

  try {
    render(
      <MyRequests
        onNavigate={jest.fn()}
        user={{ email: 'customer@example.com' }}
        localRequests={[{
          id: 'SR-205',
          title: 'Equipment repair',
          category: 'Repair',
          status: 'Completed',
          priority: 'Normal',
          created: '2026-10-28',
          updated: '2026-10-30',
        }]}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /confirm & leave feedback/i }),
    );
    expect(
      await screen.findByRole('heading', { name: /review your completed service/i }),
    ).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test('wrapped technician login opens the technician portal', async () => {
  localStorage.removeItem('servicedesk-demo-user');
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ([{ success: true, userId: 'technician-123', userRole: ['Technician'] }]),
  });

  try {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Login' }));
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'technician@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /operations sign in/i }));
    fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    expect(await screen.findByRole('button', { name: 'My Jobs' })).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});

test('customer login payload keeps its customer identity', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ CustomerID: 'customer-123' }),
  });
  const onLogin = jest.fn();

  try {
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'customer@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-123',
      role: 'Customer',
      email: 'customer@example.com',
    })));
    expect(localStorage.getItem('customerId')).toBe('customer-123');
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});

test('customer login follows the LoginPage API contract', async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.REACT_APP_APPIAN_API_KEY;
  process.env.REACT_APP_APPIAN_API_KEY = 'test-api-key';
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ customerId: 'customer-456' }),
  });

  try {
    render(<Login onLogin={jest.fn()} initialAudience="customer" />);
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'customer@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /sign in to customer portal/i }),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://techtamminaapps.appiancloud.com/suite/webapi/LoginPage',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'customer@example.com',
            password: 'secret123',
          }),
        }),
      );
    });
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
    if (originalApiKey === undefined) delete process.env.REACT_APP_APPIAN_API_KEY;
    else process.env.REACT_APP_APPIAN_API_KEY = originalApiKey;
  }
});

test('demo customer requests use saved data without attempting the live API', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn();

  try {
    render(
      <MyRequests
        onNavigate={jest.fn()}
        user={{ email: 'priya@example.com', role: 'Customer', isDemo: true }}
        localRequests={[{
          id: 'SR-126',
          title: 'Saved demo request',
          category: 'Repair',
          status: 'Under Review',
          priority: 'Normal',
          created: '2026-10-31',
          updated: '2026-10-31',
        }]}
      />,
    );

    expect(await screen.findByText('Saved demo request')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Saved requests')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});

test('customer login accepts the provided customer credentials', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 401,
  });
  const onLogin = jest.fn();

  try {
    render(<Login onLogin={onLogin} initialAudience="customer" />);
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'priya.sharma@email.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '$2a$10$aB3cD4eF5gH6iJ7kL8mN9o' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in to customer portal/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Priya Sharma',
      email: 'priya.sharma@email.com',
      role: 'Customer',
    })));
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});

test('technician demo credentials open the technician portal when the API is unavailable', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockRejectedValue(new Error('API unavailable'));

  try {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Login' }));
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'lalithya.mullapudi@tammina.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Appian123' } });
    fireEvent.click(screen.getByRole('button', { name: /operations sign in/i }));
    fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    expect(await screen.findByRole('button', { name: 'My Jobs' })).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});

test('super admin demo credentials open the admin dashboard when the API rejects the request', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

  try {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Login' }));
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'manosaisreeharsha@gmail.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Appian123' } });
    fireEvent.click(screen.getByRole('button', { name: /operations sign in/i }));
    fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    expect(await screen.findByText('Super Admin')).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});

test('signing out clears the session and returns to landing', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ([{ success: true, userId: 'technician-123', userRole: ['Technician'] }]),
  });
  localStorage.setItem('customerId', 'customer-123');
  localStorage.setItem('email', 'technician@example.com');
  localStorage.setItem('password', 'secret123');

  try {
    const view = render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Login' }));
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'technician@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /operations sign in/i }));
    fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    fireEvent.click(await screen.findByRole('button', { name: /sign out/i }));

    expect(screen.getByRole('heading', { name: /manage every service/i })).toBeInTheDocument();
    expect(localStorage.getItem('servicedesk-demo-user')).toBeNull();
    expect(sessionStorage.getItem('servicedesk-demo-user')).toBeNull();
    expect(localStorage.getItem('customerId')).toBeNull();
    expect(localStorage.getItem('email')).toBeNull();
    expect(localStorage.getItem('password')).toBeNull();

    view.unmount();
    render(<App />);
    expect(screen.getByRole('heading', { name: /manage every service/i })).toBeInTheDocument();
  } finally {
    if (originalFetch) global.fetch = originalFetch;
    else delete global.fetch;
  }
});
