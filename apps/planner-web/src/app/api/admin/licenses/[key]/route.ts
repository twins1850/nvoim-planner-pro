import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabase Service Role client (RLS bypass)
const createServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// Admin password verification middleware
function verifyAdminPassword(req: NextRequest): boolean {
  const adminPassword = req.headers.get('X-Admin-Password');
  return adminPassword === process.env.ADMIN_PASSWORD;
}

// GET - Single license details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    if (!verifyAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await params;
    const licenseKey = key;
    const supabaseAdmin = createServiceRoleClient();

    const { data: license, error } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single();

    if (error || !license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      );
    }

    // Add device count
    const licenseWithDeviceCount = {
      ...license,
      device_count: Array.isArray(license.device_tokens)
        ? license.device_tokens.length
        : 0
    };

    return NextResponse.json({
      success: true,
      license: licenseWithDeviceCount
    });

  } catch (error: any) {
    console.error('Get license error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update license (extend, suspend, reactivate, update_students)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    if (!verifyAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await params;
    const licenseKey = key;
    const body = await req.json();
    const { operation, reason, additional_days, new_max_students } = body;

    if (!operation || !reason) {
      return NextResponse.json(
        { error: 'Operation and reason are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createServiceRoleClient();

    // Get current license
    const { data: license, error: fetchError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single();

    if (fetchError || !license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      );
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };
    let message = '';

    switch (operation) {
      case 'extend':
        if (!additional_days || additional_days <= 0) {
          return NextResponse.json(
            { error: 'Invalid additional_days value' },
            { status: 400 }
          );
        }

        // Calculate new expiry date
        const currentExpiry = license.expires_at
          ? new Date(license.expires_at)
          : new Date();
        currentExpiry.setDate(currentExpiry.getDate() + additional_days);

        updateData = {
          ...updateData,
          expires_at: currentExpiry.toISOString(),
          duration_days: (license.duration_days || 0) + additional_days
        };
        message = `License extended by ${additional_days} days`;
        break;

      case 'suspend':
        updateData = {
          ...updateData,
          status: 'pending'
        };
        message = 'License suspended';
        break;

      case 'reactivate':
        updateData = {
          ...updateData,
          status: 'active'
        };
        message = 'License reactivated';
        break;

      case 'update_students':
        if (!new_max_students || new_max_students <= 0) {
          return NextResponse.json(
            { error: 'Invalid new_max_students value' },
            { status: 400 }
          );
        }

        updateData = {
          ...updateData,
          max_students: new_max_students
        };
        message = `Maximum students updated to ${new_max_students}`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid operation. Must be: extend, suspend, reactivate, or update_students' },
          { status: 400 }
        );
    }

    // Update license
    const { data: updatedLicense, error: updateError } = await supabaseAdmin
      .from('licenses')
      .update(updateData)
      .eq('license_key', licenseKey)
      .select()
      .single();

    if (updateError) {
      console.error('License update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update license', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      license: updatedLicense,
      message: `${message}. Reason: ${reason}`
    });

  } catch (error: any) {
    console.error('Patch license error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove license
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    if (!verifyAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await params;
    const licenseKey = key;
    const body = await req.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Deletion reason is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createServiceRoleClient();

    // Check if license exists
    const { data: license, error: fetchError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single();

    if (fetchError || !license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      );
    }

    // Delete license
    const { error: deleteError } = await supabaseAdmin
      .from('licenses')
      .delete()
      .eq('license_key', licenseKey);

    if (deleteError) {
      console.error('License deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete license', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log(`License deleted: ${licenseKey}. Reason: ${reason}`);

    return NextResponse.json({
      success: true,
      message: `License ${licenseKey} deleted successfully. Reason: ${reason}`
    });

  } catch (error: any) {
    console.error('Delete license error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
