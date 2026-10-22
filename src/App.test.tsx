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

    const navItems = await screen.findAllByText(/编码工作台/);
    expect(navItems.length).toBeGreaterThan(0);
    expect((await screen.findAllByText('参考文献库')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('专业术语设置')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('API 配置')).length).toBeGreaterThan(0);
  });

  it('labels the legacy coding module as a legacy snapshot', async () => {
    render(<App />);

    // The banner <strong> carries the label; verify the surrounding banner text.
    const strong = await screen.findByText('旧版快照');
    const container = strong.closest('div');
    expect(container?.textContent).toContain('仅供回看历史编码结果');
    expect(container?.textContent).toContain('旧版快照');
  });

  it('offers the researcher workbench as the primary module in navigation', async () => {
    render(<App />);

    const navItems = await screen.findAllByText('研究工作台');
    expect(navItems.length).toBeGreaterThan(0);
    expect((await screen.findAllByText('编码工作台（旧版快照）')).length).toBeGreaterThan(0);
  });
});
