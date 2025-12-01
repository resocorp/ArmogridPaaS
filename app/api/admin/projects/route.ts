import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const adminToken = await getAdminToken();

    console.log('[Admin Projects] Fetching projects with token:', adminToken ? 'present' : 'missing');

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1');

    const response = await iotClient.getProjectList(keyword, pageSize, pageIndex, adminToken);

    console.log('[Admin Projects] API response:', JSON.stringify(response));

    // Check for success (API returns success: "1" for success)
    if (response.success !== '1') {
      return NextResponse.json(
        { error: response.errorMsg || 'Failed to fetch projects' },
        { status: 400 }
      );
    }

    // Map projects to use projectId instead of id for frontend consistency
    const projects = (response.data?.list || []).map((project: any) => ({
      projectId: String(project.id),
      projectName: project.projectName,
      address: project.address,
    }));

    return NextResponse.json({
      success: true,
      data: projects,
      total: response.data?.pagination?.total || projects.length,
    });
  } catch (error: any) {
    console.error('Get projects error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
