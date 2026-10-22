import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/authApi', () => ({
  getCurrentUser: vi.fn().mockRejectedValue(new Error('offline')),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

import App from './App';

describe('App shell', () => {
  it('renders the main workbench navigation for an unauthenticated user', async () => {
    render(<App />);

    const navItems = await screen.findAllByText('编码工作台');
    expect(navItems.length).toBeGreaterThan(0);
    expect((await screen.findAllByText('参考文献库')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('专业术语设置')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('API 配置')).length).toBeGreaterThan(0);
  });

  it.todo('labels the legacy coding module as a legacy snapshot (Phase 3 / T3.2)');

  it.todo('rejects approving suggestions with failed evidence validation (Phase 4)');
});
