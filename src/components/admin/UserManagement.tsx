import React, { useState, useEffect } from 'react';
import { getUsers, toggleUserStatus, addCredits } from '../../utils/adminApi';
import type { PaginatedResponse } from '../../types';
import type { UserListItem } from '../../utils/adminApi';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const UserManagement: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<UserListItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState('');
  const [showCreditsModal, setShowCreditsModal] = useState<UserListItem | null>(null);
  const [creditsAmount, setCreditsAmount] = useState('');
  const [creditsReason, setCreditsReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const result = await getUsers({
        email: emailFilter || undefined,
      });
      setData(result);
    } catch (err) {
      console.error('Load users error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    loadUsers();
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const action = currentStatus === 'active' ? '禁用' : '启用';
    if (!confirm(`确定要${action}该用户吗？`)) return;

    setActionLoading(userId);
    try {
      await toggleUserStatus(userId, currentStatus !== 'active');
      await loadUsers();
    } catch (err: any) {
      alert(err.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddCredits = async () => {
    if (!showCreditsModal) return;
    
    const amount = parseInt(creditsAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效的积分数量');
      return;
    }

    if (!creditsReason.trim()) {
      alert('请填写调整原因');
      return;
    }

    setActionLoading(showCreditsModal.id);
    try {
      await addCredits(showCreditsModal.id, amount, creditsReason);
      setShowCreditsModal(null);
      setCreditsAmount('');
      setCreditsReason('');
      await loadUsers();
    } catch (err: any) {
      alert(err.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusLabel = (status: string) => {
    return status === 'active' ? '正常' : '已禁用';
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户邮箱
            </label>
            <input
              type="text"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入邮箱搜索"
            />
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={handleSearch}>
              搜索
            </Button>
          </div>
        </div>
      </Card>

      {/* Users List */}
      <Card className="p-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无用户</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-600">邮箱</th>
                  <th className="text-left py-2 text-gray-600">注册时间</th>
                  <th className="text-right py-2 text-gray-600">积分余额</th>
                  <th className="text-right py-2 text-gray-600">编码任务</th>
                  <th className="text-left py-2 text-gray-600">状态</th>
                  <th className="text-left py-2 text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100">
                    <td className="py-3">{user.email}</td>
                    <td className="py-3">
                      {new Date(user.registeredAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="py-3 text-right">{user.creditBalance}</td>
                    <td className="py-3 text-right">{user.totalCodingTasks}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(user.status)}`}>
                        {getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button
                          variant={user.status === 'active' ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          disabled={actionLoading === user.id}
                        >
                          {user.status === 'active' ? '禁用' : '启用'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowCreditsModal(user)}
                          disabled={actionLoading === user.id}
                        >
                          加积分
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Credits Modal */}
      {showCreditsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">添加积分</h3>
            <p className="text-sm text-gray-600 mb-4">
              用户：{showCreditsModal.email}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  积分数量
                </label>
                <input
                  type="number"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入积分数量"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  调整原因
                </label>
                <textarea
                  value={creditsReason}
                  onChange={(e) => setCreditsReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="请填写调整原因"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="primary"
                onClick={handleAddCredits}
                disabled={actionLoading === showCreditsModal.id}
              >
                确认添加
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreditsModal(null);
                  setCreditsAmount('');
                  setCreditsReason('');
                }}
              >
                取消
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
