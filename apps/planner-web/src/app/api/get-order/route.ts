import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Get Order API Route
 *
 * This API endpoint retrieves order information using Service Role Key to bypass RLS.
 * Provides secure server-side order retrieval for the pending page.
 *
 * Query parameters:
 * - orderId: string (required) - The order ID to retrieve
 */
export async function GET(req: NextRequest) {
  try {
    // Get orderId from query parameters
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    // Validate orderId
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId parameter' },
        { status: 400 }
      );
    }

    // Create Service Role client (bypasses RLS)
    const supabase = createServiceRoleClient();

    // Fetch order from database
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch order', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log('Order retrieved successfully:', {
      order_id: data.order_id,
      payment_status: data.payment_status
    });

    // Return order data
    return NextResponse.json({
      success: true,
      order: data
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
