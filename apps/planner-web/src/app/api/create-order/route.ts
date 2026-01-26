import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Order Creation API Route
 *
 * This API endpoint creates orders using Service Role Key to bypass RLS.
 * All validation happens server-side for security.
 *
 * Request body:
 * {
 *   order_id: string,
 *   customer_name: string,
 *   customer_email: string,
 *   customer_phone: string,
 *   student_count: number,
 *   duration_days: number,
 *   total_amount: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const {
      order_id,
      customer_name,
      customer_email,
      customer_phone,
      student_count,
      duration_days,
      total_amount
    } = body;

    // Validate required fields
    if (!order_id || !customer_name || !customer_email || !student_count || !duration_days || !total_amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone format (Korean: 010-XXXX-XXXX)
    if (customer_phone) {
      const phoneRegex = /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/;
      if (!phoneRegex.test(customer_phone.replace(/-/g, ''))) {
        return NextResponse.json(
          { error: 'Invalid phone format' },
          { status: 400 }
        );
      }
    }

    // Validate numeric values
    if (student_count < 1 || duration_days < 1 || total_amount < 1) {
      return NextResponse.json(
        { error: 'Invalid numeric values' },
        { status: 400 }
      );
    }

    // Create Service Role client (bypasses RLS)
    const supabase = createServiceRoleClient();

    // Insert order into database
    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_id,
        customer_name: customer_name.trim(),
        customer_email: customer_email.trim().toLowerCase(),
        customer_phone: customer_phone || null,
        student_count,
        duration_days,
        total_amount,
        payment_status: '입금대기',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create order', details: error.message },
        { status: 500 }
      );
    }

    console.log('Order created successfully:', data);

    // Return success response
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
