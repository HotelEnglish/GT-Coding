import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { sendVerification } from '../../utils/authApi';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface RegisterPageProps {
  onLogin: () => void;
  onSuccess: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onLogin, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { register, isLoading, error, clearError } = useAuthStore();
  const { setActiveModule } = useAppStore();

  const handleSendCode = async () => {
    if (!email) {
      setLocalError('请输入邮箱');
      return;
    }

    // Basic email format check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setLocalError('邮箱格式不正确');
      return;
    }

    // Domain check
    const domain = email.split('@')[1]?.toLowerCase();
    const allowedDomains = ['gmail.com', '163.com', '126.com', 'qq.com'];
    if (!allowedDomains.includes(domain)) {
      setLocalError('仅支持 Gmail、163/126网易邮箱、QQ邮箱');
      return;
    }

    try {
      setLocalError(null);
      await sendVerification(email, 'registration');
      setCodeSent(true);
      setCountdown(60);
      
      // Start countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setLocalError(err.message || '发送验证码失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Validation
    if (password.length < 8) {
      setLocalError('密码长度至少为8位');
      return;
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setLocalError('密码必须包含字母和数字');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }

    if (!verificationCode) {
      setLocalError('请输入验证码');
      return;
    }

    try {
      await register(email, password, verificationCode);
      onSuccess();
      setActiveModule('coding');
    } catch (err) {
      // Error is handled by the store
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          注册
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入邮箱"
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSendCode}
                disabled={countdown > 0}
              >
                {countdown > 0 ? `${countdown}s` : '发送验证码'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              支持 Gmail、163/126网易邮箱、QQ邮箱
            </p>
          </div>

          {codeSent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                验证码
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入6位验证码"
                maxLength={6}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="至少8位，包含字母和数字"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请再次输入密码"
              required
            />
          </div>

          {(localError || error) && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {localError || error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? '注册中...' : '注册'}
          </Button>

          <p className="text-center text-sm text-gray-600">
            已有账号？
            <button
              type="button"
              onClick={onLogin}
              className="text-blue-600 hover:underline ml-1"
            >
              立即登录
            </button>
          </p>

          <p className="text-xs text-gray-500 text-center">
            注册即获赠 50 积分，可用于编码分析
          </p>
        </form>
      </Card>
    </div>
  );
};
