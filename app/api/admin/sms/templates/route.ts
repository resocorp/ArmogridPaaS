import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/sms/templates - Get all notification templates
 */
export async function GET() {
  try {
    await requireAdmin();

    const { data, error } = await supabaseAdmin
      .from('notification_templates')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to fetch templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('Get templates error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

/**
 * POST /api/admin/sms/templates - Create new template
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, type, notification_type, template, description, enabled } = body;

    if (!name || !type || !notification_type || !template) {
      return NextResponse.json(
        { error: 'Name, type, notification_type, and template are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('notification_templates')
      .insert({
        name,
        type,
        notification_type,
        template,
        description: description || null,
        enabled: enabled !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create template:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Template name already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Template created successfully',
    });
  } catch (error: any) {
    console.error('Create template error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/sms/templates - Update template
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { id, template, description, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (template !== undefined) updates.template = template;
    if (description !== undefined) updates.description = description;
    if (enabled !== undefined) updates.enabled = enabled;

    const { data, error } = await supabaseAdmin
      .from('notification_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Template updated successfully',
    });
  } catch (error: any) {
    console.error('Update template error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/sms/templates - Delete template
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('notification_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete template error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
