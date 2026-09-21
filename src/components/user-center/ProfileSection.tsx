import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const ProfileSection: React.FC = () => {
  const { user } = useAuthStore();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError('密码长度至少为8位');
      return;
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('密码必须包含字母和数字');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    // API call would go here
    // For now, just show success
    setSuccess(true);
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (!user) {
    return <div className="text-center text-gray-500">请先登录</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-4">基本信息</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">邮箱</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">注册时间</span>
            <span className="font-medium">
              {new Date(user.registeredAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">账户状态</span>
            <span className={`font-medium ${user.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
              {user.status === 'active' ? '正常' : '已禁用'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">累计编码任务</span>
            <span className="font-medium">{user.totalCodingTasks} 次</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">累计处理字符</span>
            <span className="font-medium">{user.totalCharactersProcessed.toLocaleString()} 字符</span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-4">密码管理</h3>
        
        {success && (
          <div className="mb-4 text-green-600 text-sm bg-green-50 p-2 rounded">
            密码修改成功
          </div>
        )}

        {!showPasswordForm ? (
          <Button variant="secondary" onClick={() => setShowPasswordForm(true)}>
            修改密码
          </Button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                当前密码
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入当前密码"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新密码
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="至少8位，包含字母和数字"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                确认新密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请再次输入新密码"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" variant="primary">
                确认修改
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowPasswordForm(false);
                  setError(null);
                }}
              >
                取消
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
