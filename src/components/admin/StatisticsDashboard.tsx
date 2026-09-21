import React, { useState, useEffect } from 'react';
import { getStatistics } from '../../utils/adminApi';
import type { AdminStatistics } from '../../utils/adminApi';
import { Card } from '../ui/Card';

export const StatisticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setIsLoading(true);
    try {
      const result = await getStatistics();
      setStats(result);
    } catch (err) {
      console.error('Load statistics error:', err);
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
          <div className="text-sm text-gray-600 mt-1">注册用户</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{stats.totalTasks}</div>
          <div className="text-sm text-gray-600 mt-1">编码任务</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">
            {stats.totalCreditsConsumed.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">消耗积分</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">
            ¥{(stats.totalRevenue / 10).toFixed(0)}
          </div>
          <div className="text-sm text-gray-600 mt-1">预估收入</div>
        </Card>
      </div>

      {/* Daily Stats Chart */}
      <Card className="p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-4">近30天数据趋势</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* New Users */}
          <div>
            <div className="text-sm font-medium text-gray-600 mb-2">新增用户</div>
            <div className="h-32 flex items-end gap-1">
              {stats.dailyStats.users.map((item: any, index: number) => {
                const max = Math.max(...stats.dailyStats.users.map((u: any) => u._count || 0), 1);
                const height = ((item._count || 0) / max) * 100;
                return (
                  <div
                    key={index}
                    className="flex-1 bg-blue-400 rounded-t transition-all hover:bg-blue-500"
                    style={{ height: `${height}%`, minHeight: item._count > 0 ? '4px' : '0' }}
                    title={`${item.registeredAt}: ${item._count} 人`}
                  />
                );
              })}
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div className="text-sm font-medium text-gray-600 mb-2">编码任务</div>
            <div className="h-32 flex items-end gap-1">
              {stats.dailyStats.tasks.map((item: any, index: number) => {
                const max = Math.max(...stats.dailyStats.tasks.map((t: any) => t._count || 0), 1);
                const height = ((item._count || 0) / max) * 100;
                return (
                  <div
                    key={index}
                    className="flex-1 bg-green-400 rounded-t transition-all hover:bg-green-500"
                    style={{ height: `${height}%`, minHeight: item._count > 0 ? '4px' : '0' }}
                    title={`${item.completedAt}: ${item._count} 次`}
                  />
                );
              })}
            </div>
          </div>

          {/* Revenue */}
          <div>
            <div className="text-sm font-medium text-gray-600 mb-2">充值积分</div>
            <div className="h-32 flex items-end gap-1">
              {stats.dailyStats.revenue.map((item: any, index: number) => {
                const max = Math.max(...stats.dailyStats.revenue.map((r: any) => r._sum?.credits || 0), 1);
                const height = ((item._sum?.credits || 0) / max) * 100;
                return (
                  <div
                    key={index}
                    className="flex-1 bg-yellow-400 rounded-t transition-all hover:bg-yellow-500"
                    style={{ height: `${height}%`, minHeight: item._sum?.credits > 0 ? '4px' : '0' }}
                    title={`${item.processedAt}: ${item._sum?.credits || 0} 积分`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-sm text-gray-500 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-400 rounded" />
            <span>新增用户</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded" />
            <span>编码任务</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded" />
            <span>充值积分</span>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-3">积分消费排行</h3>
          <p className="text-sm text-gray-500">暂无数据</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-3">活跃用户排行</h3>
          <p className="text-sm text-gray-500">暂无数据</p>
        </Card>
      </div>
    </div>
  );
};
