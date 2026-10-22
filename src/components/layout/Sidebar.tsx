import React from 'react';
import { cn } from '@/utils/cn';
import { ActiveModule } from '@/types';
import { useAuthStore } from '../../store/useAuthStore';

interface NavItem {
  id: ActiveModule;
  label: string;
  icon: React.ReactNode;
  section?: string;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

const IconBook = () => (
  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
    <path d="M2 2.5A1.5 1.5 0 013.5 1H12v11H3.5A1.5 1.5 0 012 10.5V2.5z" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5 4h4M5 6.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M2 10.5A1.5 1.5 0 003.5 12H12" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const IconTag = () => (
  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
    <path d="M1.5 1.5h5l6 6a1 1 0 010 1.414l-3.086 3.086a1 1 0 01-1.414 0l-6-6V1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="4.5" cy="4.5" r="1" fill="currentColor" />
  </svg>
);

const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.9 2.9l1.4 1.4M9.7 9.7l1.4 1.4M2.9 11.1l1.4-1.4M9.7 4.3l1.4-1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconDoc = () => (
  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.5 5h5M4.5 7.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconUser = () => (
  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2 12c0-2.5 2.5-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconAdmin = () => (
  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
    <path d="M7 1l1.5 3.5L12 5.5 9 8l.5 4L7 10l-2.5 2 .5-4-3-2.5 3.5-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
    <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M6 4.5v3M4.5 6h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { id: 'workbench', label: '研究工作台', icon: <IconSearch />, section: '核心工作流' },
  // Hidden until the new workbench is confirmed stable; the legacy module
  // code stays in the codebase and the app module can still be activated
  // programmatically via localStorage-persisted state.
  // { id: 'coding', label: '编码工作台（旧版快照）', icon: <IconGrid />, section: '核心工作流' },
  { id: 'library', label: '参考文献库', icon: <IconBook /> },
  { id: 'terminology', label: '专业术语设置', icon: <IconTag /> },
  { id: 'settings', label: 'API 配置', icon: <IconSettings /> },
  { id: 'user-center', label: '用户中心', icon: <IconUser />, section: '账户管理', requireAuth: true },
  { id: 'admin', label: '管理后台', icon: <IconAdmin />, adminOnly: true },
  { id: 'guide', label: '方法论说明', icon: <IconDoc />, section: '理论参考' },
];

interface SidebarProps {
  active: ActiveModule;
  onNavigate: (m: ActiveModule) => void;
  onLogin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ active, onNavigate, onLogin }) => {
  const { isAuthenticated } = useAuthStore();
  let lastSection = '';

  // Filter nav items based on auth status
  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return false; // Admin panel is accessed through separate login
    if (item.requireAuth && !isAuthenticated) return false;
    return true;
  });

  return (
    <aside className="w-52 shrink-0 bg-gray-950 text-gray-300 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="text-base font-bold text-white tracking-tight">
          扎根<span className="text-indigo-400">理论</span>编码
        </div>
        <div className="text-xs text-gray-500 mt-0.5">Grounded Theory Tool</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {filteredItems.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;

          return (
            <React.Fragment key={item.id}>
              {showSection && (
                <div className="px-4 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  {item.section}
                </div>
              )}
              <button
                onClick={() => {
                  if (item.requireAuth && !isAuthenticated) {
                    onLogin?.();
                  } else {
                    onNavigate(item.id);
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors duration-150 text-left',
                  active === item.id
                    ? 'bg-indigo-600/20 text-indigo-300 border-r-2 border-indigo-400'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                )}
              >
                <span className={active === item.id ? 'text-indigo-400' : 'text-gray-500'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Login prompt for unauthenticated users */}
      {!isAuthenticated && (
        <div className="px-4 py-3 border-t border-gray-800">
          <button
            onClick={onLogin}
            className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            登录 / 注册
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800 text-[10px] text-gray-600">
        <div>开源项目 · MIT License</div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-300 transition-colors mt-0.5 block"
        >
          GitHub · Vercel 部署
        </a>
      </div>
    </aside>
  );
};
