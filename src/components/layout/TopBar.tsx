import React from 'react';
import { ActiveModule } from '@/types';
import { useAuthStore } from '../../store/useAuthStore';

const MODULE_TITLES: Record<ActiveModule, { title: string; subtitle: string }> = {
  coding: { title: '编码工作台', subtitle: '选择理论范式，上传或粘贴访谈数据，开始智能编码' },
  library: { title: '参考文献库', subtitle: 'AI 学习领域论文，编码时自动注入专业背景知识' },
  terminology: { title: '专业术语设置', subtitle: '定义语言风格与术语对照，规范编码词汇' },
  settings: { title: 'API 配置', subtitle: '配置大模型 API，支持 Anthropic / OpenAI 兼容接口' },
  guide: { title: '方法论说明', subtitle: '经典、程序化、建构式三种扎根理论范式的详细介绍' },
  'user-center': { title: '用户中心', subtitle: '管理账户、签到、充值和查看使用记录' },
  admin: { title: '管理后台', subtitle: '订单审核、用户管理和数据统计' },
};

interface TopBarProps {
  activeModule: ActiveModule;
  onClearAll?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ activeModule, onClearAll, onLogin, onRegister }) => {
  const { title, subtitle } = MODULE_TITLES[activeModule];
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
      <div>
        <h1 className="text-base font-semibold text-gray-900 leading-tight">{title}</h1>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      
      <div className="flex items-center gap-4">
        {activeModule === 'coding' && onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200"
          >
            清除全部
          </button>
        )}
        
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-700">{user.email}</div>
              <div className="text-xs text-blue-600">积分: {user.creditBalance}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              退出
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {onLogin && (
              <button
                onClick={onLogin}
                className="text-xs text-gray-600 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                登录
              </button>
            )}
            {onRegister && (
              <button
                onClick={onRegister}
                className="text-xs text-white bg-blue-500 hover:bg-blue-600 transition-colors px-3 py-1.5 rounded-lg"
              >
                注册
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
