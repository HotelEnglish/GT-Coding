import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { ProfileSection } from './ProfileSection';
import { CheckInSection } from './CheckInSection';
import { RechargeSection } from './RechargeSection';
import { CreditHistory } from './CreditHistory';
import { UsageStats } from './UsageStats';
import { Card } from '../ui/Card';

type Tab = 'profile' | 'checkin' | 'recharge' | 'history' | 'stats';

export const UserCenterModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const { user, refreshUser } = useAuthStore();

  useEffect(() => {
    refreshUser();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: '个人资料' },
    { key: 'checkin', label: '每日签到' },
    { key: 'recharge', label: '积分充值' },
    { key: 'history', label: '积分明细' },
    { key: 'stats', label: '使用统计' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSection />;
      case 'checkin':
        return <CheckInSection />;
      case 'recharge':
        return <RechargeSection />;
      case 'history':
        return <CreditHistory />;
      case 'stats':
        return <UsageStats />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Credit Balance Header */}
      <Card className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">当前积分</p>
            <p className="text-3xl font-bold">{user?.creditBalance ?? 0}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">可编码字符</p>
            <p className="text-xl font-semibold">{(user?.creditBalance ?? 0) * 10}</p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>{renderContent()}</div>
    </div>
  );
};
