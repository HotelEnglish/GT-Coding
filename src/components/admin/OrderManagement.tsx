import React, { useState, useEffect } from 'react';
import { getOrders, approveOrder, rejectOrder } from '../../utils/adminApi';
import type { RechargeOrder, OrderStatus, PaginatedResponse } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const OrderManagement: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<RechargeOrder> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [userEmailFilter, setUserEmailFilter] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const result = await getOrders({
        status: statusFilter || undefined,
        userEmail: userEmailFilter || undefined,
      });
      setData(result);
    } catch (err) {
      console.error('Load orders error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    loadOrders();
  };

  const handleApprove = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await approveOrder(orderId);
      await loadOrders();
    } catch (err: any) {
      alert(err.message || '审批失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    
    if (!rejectReason.trim()) {
      alert('请输入拒绝原因');
      return;
    }

    setActionLoading(showRejectModal);
    try {
      await rejectOrder(showRejectModal, rejectReason);
      setShowRejectModal(null);
      setRejectReason('');
      await loadOrders();
    } catch (err: any) {
      alert(err.message || '拒绝失败');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待审核';
      case 'approved':
        return '已通过';
      case 'rejected':
        return '已拒绝';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              订单状态
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户邮箱
            </label>
            <input
              type="text"
              value={userEmailFilter}
              onChange={(e) => setUserEmailFilter(e.target.value)}
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

      {/* Orders List */}
      <Card className="p-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无订单</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-600">订单号</th>
                  <th className="text-left py-2 text-gray-600">用户</th>
                  <th className="text-left py-2 text-gray-600">套餐</th>
                  <th className="text-right py-2 text-gray-600">积分</th>
                  <th className="text-left py-2 text-gray-600">支付时间</th>
                  <th className="text-left py-2 text-gray-600">交易号后4位</th>
                  <th className="text-left py-2 text-gray-600">状态</th>
                  <th className="text-left py-2 text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100">
                    <td className="py-3">{order.orderNumber}</td>
                    <td className="py-3">{(order as any).user?.email || '-'}</td>
                    <td className="py-3">{order.planId}</td>
                    <td className="py-3 text-right">{order.credits}</td>
                    <td className="py-3">
                      {new Date(order.paymentTime).toLocaleString('zh-CN')}
                    </td>
                    <td className="py-3">{order.transactionLast4}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="py-3">
                      {order.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(order.id)}
                            disabled={actionLoading === order.id}
                          >
                            通过
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowRejectModal(order.id)}
                            disabled={actionLoading === order.id}
                          >
                            拒绝
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">拒绝订单</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                拒绝原因
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="请输入拒绝原因"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={handleReject}
                disabled={actionLoading === showRejectModal}
              >
                确认拒绝
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
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
