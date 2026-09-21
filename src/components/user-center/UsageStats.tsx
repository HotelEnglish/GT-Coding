import React, { useState, useEffect } from 'react';
import { getUsageStats } from '../../utils/userApi';
import type { UsageStats as UsageStatsType } from '../../utils/userApi';
import { Card } from '../ui/Card';

export const UsageStats: React.FC = () => {
  const [stats, setStats] = useState<UsageStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const result = await getUsageStats();
      setStats(result);
    } catch (err) {
      console.error('Load stats error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8 text-gray-500">暂无数据</div>;
  }

  // Find max value for chart scaling
  const maxDailyTasks = Math.max(...stats.dailyUsage.map((d) => d.tasks), 1);
  const maxDailyCredits = Math.max(...stats.dailyUsage.map((d) => d.credits), 1);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.totalTasks}</div>
          <div className="text-sm text-gray-600 mt-1">编码任务总数</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600">
            {stats.totalCharacters.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">处理字符总数</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{stats.totalCreditsConsumed}</div>
          <div className="text-sm text-gray-600 mt-1">消耗积分总数</div>
        </Card>
      </div>

      {/* Daily Usage Chart */}
      <Card className="p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-4">近30天使用情况</h3>
        
        {stats.dailyUsage.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无使用记录</div>
        ) : (
          <div className="space-y-4">
            {/* Tasks Chart */}
            <div>
              <div className="text-sm text-gray-600 mb-2">每日编码任务</div>
              <div className="h-24 flex items-end gap-1">
                {stats.dailyUsage.map((day, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-blue-400 rounded-t transition-all hover:bg-blue-500"
                    style={{
                      height: `${(day.tasks / maxDailyTasks) * 100}%`,
                      minHeight: day.tasks > 0 ? '4px' : '0',
                    }}
                    title={`${day.date}: ${day.tasks} 次`}
                  />
                ))}
              </div>
            </div>

            {/* Credits Chart */}
            <div>
              <div className="text-sm text-gray-600 mb-2">每日消耗积分</div>
              <div className="h-24 flex items-end gap-1">
                {stats.dailyUsage.map((day, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-purple-400 rounded-t transition-all hover:bg-purple-500"
                    style={{
                      height: `${(day.credits / maxDailyCredits) * 100}%`,
                      minHeight: day.credits > 0 ? '4px' : '0',
                    }}
                    title={`${day.date}: ${day.credits} 积分`}
                  />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-400 rounded" />
                <span>编码任务</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-400 rounded" />
                <span>消耗积分</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Daily Usage Table */}
      <Card className="p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-4">每日明细</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-gray-600">日期</th>
                <th className="text-right py-2 text-gray-600">任务数</th>
                <th className="text-right py-2 text-gray-600">字符数</th>
                <th className="text-right py-2 text-gray-600">消耗积分</th>
              </tr>
            </thead>
            <tbody>
              {stats.dailyUsage.slice().reverse().map((day, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2">{day.date}</td>
                  <td className="text-right py-2">{day.tasks}</td>
                  <td className="text-right py-2">{day.characters.toLocaleString()}</td>
                  <td className="text-right py-2">{day.credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
