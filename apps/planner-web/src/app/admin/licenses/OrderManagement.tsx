'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Order {
  id: string
  order_id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  student_count: number
  duration_days: number
  total_amount: number
  payment_status: string
  license_key: string | null
  created_at: string
}

interface OrderManagementProps {
  orders: Order[]
}

export default function OrderManagement({ orders }: OrderManagementProps) {
  const router = useRouter()
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)

  const handleConfirmPayment = async (orderId: string) => {
    if (!confirm('입금을 확인하셨나요? 상태를 "매칭완료"로 변경합니다.')) {
      return
    }

    setProcessingOrderId(orderId)

    try {
      const response = await fetch('/api/admin/orders/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`오류: ${data.error}`)
        return
      }

      alert('입금이 확인되었습니다.')
      router.refresh()
    } catch (error: any) {
      alert(`오류가 발생했습니다: ${error.message}`)
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handleIssueLicense = async (order: Order) => {
    if (
      !confirm(
        `라이선스를 발급하시겠습니까?\n\n고객: ${order.customer_name}\n이메일: ${order.customer_email}\n내용: ${order.student_count}명 × ${order.duration_days}일`
      )
    ) {
      return
    }

    setProcessingOrderId(order.id)

    try {
      const response = await fetch('/api/admin/orders/issue-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`오류: ${data.error}`)
        return
      }

      alert(
        `라이선스가 발급되었습니다!\n\n라이선스 키: ${data.licenseKey}\n이메일 발송: ${data.emailSent ? '성공' : '실패'}`
      )
      router.refresh()
    } catch (error: any) {
      alert(`오류가 발생했습니다: ${error.message}`)
    } finally {
      setProcessingOrderId(null)
    }
  }

  if (!orders || orders.length === 0) {
    return <div className="text-center py-8 text-gray-500">주문이 없습니다.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
              주문번호
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
              고객 정보
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
              주문 내용
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
              금액
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
              결제 상태
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
              주문일
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
              작업
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs text-gray-700">{order.order_id}</td>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{order.customer_name}</p>
                  <p className="text-xs text-gray-500">{order.customer_email}</p>
                  {order.customer_phone && (
                    <p className="text-xs text-gray-500">{order.customer_phone}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-gray-900">
                  <p>
                    {order.student_count}명 × {order.duration_days}일
                  </p>
                </div>
              </td>
              <td className="px-4 py-3 font-semibold text-gray-900">
                ₩{order.total_amount.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.payment_status === '라이선스발급완료'
                      ? 'bg-green-100 text-green-800'
                      : order.payment_status === '매칭완료'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {order.payment_status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {new Date(order.created_at).toLocaleString('ko-KR')}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-2">
                  {order.payment_status === '입금대기' && (
                    <button
                      disabled={processingOrderId === order.id}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleConfirmPayment(order.id)}
                    >
                      {processingOrderId === order.id ? '처리 중...' : '입금확인'}
                    </button>
                  )}
                  {order.payment_status === '매칭완료' && (
                    <button
                      disabled={processingOrderId === order.id}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleIssueLicense(order)}
                    >
                      {processingOrderId === order.id ? '처리 중...' : '라이선스발급'}
                    </button>
                  )}
                  {order.license_key && (
                    <div className="mt-1">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                        {order.license_key}
                      </code>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
