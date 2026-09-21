import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { checkIn, getCheckInStatus } from '../../utils/checkInApi';
import type { CheckInStatus as CheckInStatusType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const CheckInSection: React.FC = () => {
  const { user, refreshUser } = useAuthStore();
  const [status, setStatus] = useState<CheckInStatusType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getCheckInStatus();
      setStatus(data);
    } catch (err) {
      console.error('Load check-in status error:', err);
    }
  };

  const handleCheckIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const result = await checkIn();
      setSuccessMessage(result.message);
      await loadStatus();
      await refreshUser();
    } catch (err: any) {
      setError(err.message || '签到失败');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    if (!status) return [];
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isCheckedIn = status.monthlyHistory.includes(dateStr);
      const isToday = i === today.getDate();
      
      days.push({
        day: i,
        isCheckedIn,
        isToday,
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  const getBonusMilestone = () => {
    if (!status) return null;
    
    const consecutiveDays = status.consecutiveDays;
    
    if (consecutiveDays >= 30) {
      return { next: null, message: '已达到30天连续签到里程碑！' };
    }
    if (consecutiveDays >= 7) {
      return { next: 30, message: `再坚持${30 - consecutiveDays}天获得50积分奖励` };
    }
    if (consecutiveDays >= 3) {
      return { next: 7, message: `再坚持${7 - consecutiveDays}天获得10积分奖励` };
    }
    return { next: 3, message: `再坚持${3 - consecutiveDays}天获得5积分奖励` };
  };

  const milestone = getBonusMilestone();

  if (!status) {
    return <div className="text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Check-in Button */}
      <Card className="p-6 text-center">
        <h3 className="text-lg font-medium text-gray-800 mb-4">每日签到</h3>
        
        {successMessage && (
          <div className="mb-4 text-green-600 text-sm bg-green-50 p-2 rounded">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {status.hasCheckedInToday ? (
          <div>
            <div className="text-green-600 text-4xl mb-2">✓</div>
            <p className="text-gray-600 mb-2">今日已签到</p>
            <p className="text-sm text-gray-500">
              下次签到时间：{status.nextCheckInTime ? new Date(status.nextCheckInTime).toLocaleString('zh-CN') : '明天'}
            </p>
          </div>
        ) : (
          <Button
            variant="primary"
            onClick={handleCheckIn}
            disabled={isLoading}
            className="px-8 py-3 text-lg"
          >
            {isLoading ? '签到中...' : '立即签到'}
          </Button>
        )}

        <div className="mt-4">
          <p className="text-gray-600">
            连续签到：<span className="font-bold text-blue-600">{status.consecutiveDays}</span> 天
          </p>
        </div>
      </Card>

      {/* Bonus Milestones */}
      <Card className="p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-4">连续签到奖励</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className={`text-center p-3 rounded-lg ${status.consecutiveDays >= 3 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-gray-800">3天</div>
            <div className="text-sm text-gray-600">+5积分</div>
            {status.consecutiveDays >= 3 && (
              <div className="text-green-600 text-xs mt-1">已达成</div>
            )}
          </div>
          <div className={`text-center p-3 rounded-lg ${status.consecutiveDays >= 7 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-gray-800">7天</div>
            <div className="text-sm text-gray-600">+10积分</div>
            {status.consecutiveDays >= 7 && (
              <div className="text-green-600 text-xs mt-1">已达成</div>
            )}
          </div>
          <div className={`text-center p-3 rounded-lg ${status.consecutiveDays >= 30 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-gray-800">30天</div>
            <div className="text-sm text-gray-600">+50积分</div>
            {status.consecutiveDays >= 30 && (
              <div className="text-green-600 text-xs mt-1">已达成</div>
            )}
          </div>
        </div>
        {milestone && milestone.message && (
          <p className="text-center text-sm text-gray-600 mt-4">{milestone.message}</p>
        )}
      </Card>

      {/* Monthly Calendar */}
      <Card className="p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-4">本月签到记录</h3>
        <div className="grid grid-cols-7 gap-1">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <div key={day} className="text-center text-xs text-gray-500 py-1">
              {day}
            </div>
          ))}
          {calendarDays.map((day) => (
            <div
              key={day.day}
              className={`text-center py-2 rounded ${
                day.isCheckedIn
                  ? 'bg-green-100 text-green-700'
                  : day.isToday
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600'
              }`}
            >
              {day.day}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
