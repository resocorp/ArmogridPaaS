import { NextResponse } from 'next/server';
import { iotClient } from '@/lib/iot-client';
import { getAdminToken } from '@/lib/auth';

export async function GET() {
  try {
    const adminToken = await getAdminToken();

    const response = await iotClient.getProjectList('', 100, 1, adminToken);

    // Check for success (API returns success: "1" for success)
    if (response.success !== '1') {
      return NextResponse.json(
        { error: response.errorMsg || 'Failed to fetch projects' },
        { status: 400 }
      );
    }

    // Map projects to simplified format for dropdown
    const projects = (response.data?.list || []).map((project: any) => ({
      id: String(project.id),
      name: project.projectName,
      address: project.address,
    }));

    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error: any) {
    console.error('Get public projects error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
