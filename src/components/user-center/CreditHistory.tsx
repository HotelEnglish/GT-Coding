import React, { useState, useEffect } from 'react';
import { getCreditHistory } from '../../utils/userApi';
import type { CreditTransaction, TransactionType, PaginatedResponse } from '../../types';
import { Card } from '../ui/Card';

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  registration_bonus: '注册赠送',
  check_in: '签到奖励',
  check_in_bonus: '连续签到奖励',
  recharge: '充值',
  coding_consumption: '编码消耗',
  admin_adjustment: '管理员调整',
};

const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  registration_bonus: 'text-green-600',
  check_in: 'text-green-600',
  check_in_bonus: 'text-green-600',
  recharge: 'text-green-600',
  coding_consumption: 'text-red-600',
  admin_adjustment: 'text-blue-600',
};

export const CreditHistory: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<CreditTransaction> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadHistory();
  }, [page, filterType, startDate, endDate]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const result = await getCreditHistory(page, 20, {
        types: filterType ? [filterType] : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setData(result);
    } catch (err) {
      console.error('Load history error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const transactionTypes: TransactionType[] = [
    'registration_bonus',
    'check_in',
    'check_in_bonus',
    'recharge',
    'coding_consumption',
    'admin_adjustment',
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              类型筛选
            </label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as TransactionType | '');
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              {transactionTypes.map((type) => (
                <option key={type} value={type}>
                  {TRANSACTION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              开始日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              结束日期
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="p-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无记录</div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {data.items.map((transaction) => (
                <div key={transaction.id} className="py-3 flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-800">
                      {TRANSACTION_TYPE_LABELS[transaction.type]}
                    </div>
                    <div className="text-sm text-gray-500">
                      {transaction.description}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(transaction.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${TRANSACTION_TYPE_COLORS[transaction.type]}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </div>
                    <div className="text-xs text-gray-500">
                      余额: {transaction.balanceAfter}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-4 mt-4 pt-4 border-t">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                第 {page} 页 / 共 {Math.ceil(data.total / data.limit)} 页
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.hasMore}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
