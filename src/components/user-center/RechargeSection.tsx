import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { getPlans, createOrder, getOrders } from '../../utils/rechargeApi';
import type { RechargePlan, RechargeOrder } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const RechargeSection: React.FC = () => {
  const { refreshUser } = useAuthStore();
  const [plans, setPlans] = useState<RechargePlan[]>([]);
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [paymentTime, setPaymentTime] = useState('');
  const [transactionLast4, setTransactionLast4] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansData, ordersData] = await Promise.all([
        getPlans(),
        getOrders(),
      ]);
      setPlans(plansData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Load data error:', err);
    }
  };

  const handleSelectPlan = (plan: RechargePlan) => {
    setSelectedPlan(plan);
    setShowOrderForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPlan) return;

    if (!paymentTime) {
      setError('请选择支付时间');
      return;
    }

    if (!/^\d{4}$/.test(transactionLast4)) {
      setError('请输入正确的交易号后4位');
      return;
    }

    setIsLoading(true);

    try {
      await createOrder(selectedPlan.id, paymentTime, transactionLast4);
      setSuccess('订单已提交，等待审核');
      setShowOrderForm(false);
      setPaymentTime('');
      setTransactionLast4('');
      await loadData();
      await refreshUser();
    } catch (err: any) {
      setError(err.message || '提交订单失败');
    } finally {
      setIsLoading(false);
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
    <div className="space-y-6">
      {/* Plans */}
      <Card className="p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-4">选择套餐</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedPlan?.id === plan.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => handleSelectPlan(plan)}
            >
              <div className="text-center">
                <div className="text-lg font-bold text-gray-800">{plan.name}</div>
                <div className="text-3xl font-bold text-blue-600 my-2">
                  ¥{plan.price}
                </div>
                <div className="text-sm text-gray-600">
                  {plan.credits} 积分
                </div>
                <div className="text-xs text-gray-500">
                  约 {plan.characters.toLocaleString()} 字符
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Order Form */}
      {showOrderForm && selectedPlan && (
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">提交订单</h3>
          
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">套餐</span>
              <span className="font-medium">{selectedPlan.name}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">金额</span>
              <span className="font-medium">¥{selectedPlan.price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">积分</span>
              <span className="font-medium">{selectedPlan.credits}</span>
            </div>
          </div>

          {/* QR Code placeholder */}
          <div className="mb-4 p-4 border rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-2">请扫描二维码支付</p>
            <div className="w-32 h-32 mx-auto bg-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-500">微信支付二维码</span>
            </div>
          </div>

          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支付时间
              </label>
              <input
                type="datetime-local"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                交易号后4位
              </label>
              <input
                type="text"
                value={transactionLast4}
                onChange={(e) => setTransactionLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入微信支付交易号后4位"
                maxLength={4}
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? '提交中...' : '提交订单'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowOrderForm(false)}
              >
                取消
              </Button>
            </div>
          </form>
        </Card>
      )}

      {success && (
        <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
          {success}
        </div>
      )}

      {/* Orders */}
      <Card className="p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-4">我的订单</h3>
        
        {orders.length === 0 ? (
          <p className="text-center text-gray-500 py-4">暂无订单记录</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">{order.orderNumber}</span>
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <span className="text-blue-600 font-medium">
                    {order.credits} 积分
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  提交时间：{new Date(order.submittedAt).toLocaleString('zh-CN')}
                </div>
                {order.rejectionReason && (
                  <div className="text-sm text-red-600 mt-1">
                    拒绝原因：{order.rejectionReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
