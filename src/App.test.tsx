import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/authApi', () => ({
  getCurrentUser: vi.fn().mockRejectedValue(new Error('offline')),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@/utils/workbenchApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/workbenchApi')>();
  return {
    ...actual,
    fetchProjects: vi.fn().mockResolvedValue([]),
  };
});

import App from './App';

describe('App shell', () => {
  it('opens on the researcher workbench by default', async () => {
    render(<App />);

    expect((await screen.findAllByText('研究工作台')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/编码工作台（旧版快照）/)).toBeNull();
  });

  it('keeps the legacy coding module out of navigation', async () => {
    render(<App />);
    await screen.findAllByText('研究工作台');

    const nav = document.querySelector('nav');
    expect(nav?.textContent).not.toContain('编码工作台（旧版快照）');
    expect(nav?.textContent).toContain('参考文献库');
  });
});
