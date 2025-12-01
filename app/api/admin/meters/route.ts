import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const adminToken = await getAdminToken();

    // First get all projects
    const projectsResponse = await iotClient.getProjectList('', 100, 1, adminToken);

    if (projectsResponse.code !== 200 && projectsResponse.code !== 0) {
      return NextResponse.json(
        { error: projectsResponse.msg || 'Failed to fetch projects' },
        { status: 400 }
      );
    }

    const projects = projectsResponse.data?.list || [];
    
    // Fetch meters for each project in parallel
    const allMeters: any[] = [];
    
    await Promise.all(
      projects.map(async (project: any) => {
        try {
          const roomsResponse = await iotClient.getProjectRoomInfo(
            project.projectId,
            adminToken
          );
          
          if (roomsResponse.code === 200 || roomsResponse.code === 0) {
            const rooms = roomsResponse.data || [];
            rooms.forEach((room: any) => {
              allMeters.push({
                ...room,
                projectId: project.projectId,
                projectName: project.projectName,
              });
            });
          }
        } catch (err) {
          console.error(`Error fetching meters for project ${project.projectId}:`, err);
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: allMeters,
      total: allMeters.length,
    });
  } catch (error: any) {
    console.error('Get all meters error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch meters' },
      { status: 500 }
    );
  }
}
