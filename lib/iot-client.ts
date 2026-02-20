import CryptoJS from 'crypto-js';
import { IOT_BASE_URL } from './constants';
import type * as IoT from '@/types/iot';

/**
 * IoT Platform API Client
 * Handles all communication with the IoT meter platform
 */
class IotClient {
  private baseUrl: string;

  constructor(baseUrl: string = IOT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Hash password using MD5
   */
  private hashPassword(password: string): string {
    return CryptoJS.MD5(password).toString();
  }

  /**
   * Make API request to IoT platform
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit & { token?: string } = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) {
      headers['token'] = token;
    }

    const url = `${this.baseUrl}${endpoint}`;

    // Bypass SSL verification for expired certificates (temporary workaround)
    // @ts-ignore - Node.js specific property
    const agent = typeof window === 'undefined' 
      ? new (await import('https')).Agent({ rejectUnauthorized: false })
      : undefined;

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      // @ts-ignore - Node.js specific property
      agent,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[IoT] ${fetchOptions.method || 'GET'} ${url} failed (${response.status}):`, errorText);
      throw new Error(`IoT API Error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Login to get authentication token
   */
  async login(
    username: string,
    password: string,
    type: 0 | 1 = 1
  ): Promise<IoT.LoginResponse> {
    const hashedPassword = this.hashPassword(password);
    
    return this.request<IoT.LoginResponse>(
      '/basic/prepayment/app/appUserLogin',
      {
        method: 'POST',
        body: JSON.stringify({
          username,
          password: hashedPassword,
          type,
        }),
      }
    );
  }

  /**
   * Get list of meters for authenticated user
   */
  async getUserMeterList(token: string): Promise<IoT.GetUserMeterListResponse> {
    return this.request<IoT.GetUserMeterListResponse>(
      '/basic/prepayment/app/getUserMeterList',
      {
        method: 'GET',
        token,
      }
    );
  }

  /**
   * Get meter information by room number
   */
  async getMeterInfo(
    roomNo: string,
    token: string
  ): Promise<IoT.GetMeterInfoResponse> {
    return this.request<IoT.GetMeterInfoResponse>(
      '/basic/prepayment/app/getMeterInfo',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ roomNo }),
      }
    );
  }

  /**
   * Get detailed meter information by meter ID
   */
  async getMeterInfoById(
    meterId: string,
    token: string
  ): Promise<IoT.GetMeterInfoResponse> {
    console.log(`[IoT Client] Getting meter info for meterId: ${meterId}`);
    const response = await this.request<IoT.GetMeterInfoResponse>(
      '/basic/prepayment/app/MeterInfo',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ meterId }),
      }
    );
    console.log(`[IoT Client] Meter info response code: ${response.code}`);
    return response;
  }

  /**
   * Control meter (On/Off/Prepaid mode)
   */
  async controlMeter(
    meterId: string,
    type: 0 | 1 | 2,
    token: string
  ): Promise<IoT.MeterControlResponse> {
    return this.request<IoT.MeterControlResponse>(
      '/basic/prepayment/app/MeterControl',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ meterId, type }),
      }
    );
  }

  /**
   * Sale power to meter (credit meter with payment)
   */
  async salePower(
    data: IoT.SalePowerRequest,
    token: string
  ): Promise<IoT.SalePowerResponse> {
    console.log(`[IoT Client] Selling power to meter ${data.meterId}, amount: ${data.saleMoney}, buyType: ${data.buyType}, saleId: ${data.saleId}`);
    const response = await this.request<IoT.SalePowerResponse>(
      '/basic/prepayment/app/SalePower',
      {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      }
    );
    console.log(`[IoT Client] Sale power response code: ${response.code}, msg: ${response.msg}`);
    return response;
  }

  /**
   * Get user's sale/purchase history
   */
  async getUserSaleList(
    startTime: string,
    endTime: string,
    token: string
  ): Promise<IoT.GetUserSaleListResponse> {
    return this.request<IoT.GetUserSaleListResponse>(
      '/basic/prepayment/app/getUserSaleList',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ startTime, endTime }),
      }
    );
  }

  /**
   * Get daily energy consumption data
   * Note: API expects datetime format "YYYY-MM-DD HH:mm:ss"
   */
  async getMeterEnergyDay(
    meterId: string,
    startDate: string, // "YYYY-MM-DD HH:mm:ss"
    endDate: string, // "YYYY-MM-DD HH:mm:ss"
    token: string
  ): Promise<IoT.GetMeterEnergyResponse> {
    console.log(`[IoT Client] Getting daily energy for meter ${meterId} from ${startDate} to ${endDate}`);
    return this.request<IoT.GetMeterEnergyResponse>(
      '/basic/prepayment/app/getMeterEnergyDay',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ meterId, startDate, endDate }),
      }
    );
  }

  /**
   * Get monthly energy consumption data
   * Note: API expects datetime format "YYYY-MM-DD HH:mm:ss"
   */
  async getMeterEnergyMonth(
    meterId: string,
    startDate: string, // "YYYY-MM-DD HH:mm:ss"
    endDate: string, // "YYYY-MM-DD HH:mm:ss"
    token: string
  ): Promise<IoT.GetMeterEnergyResponse> {
    console.log(`[IoT Client] Getting monthly energy for meter ${meterId} from ${startDate} to ${endDate}`);
    return this.request<IoT.GetMeterEnergyResponse>(
      '/basic/prepayment/app/getMeterEnergyMonth',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ meterId, startDate, endDate }),
      }
    );
  }

  /**
   * Get sale information by meter ID
   */
  async getSaleInfoByMeterId(
    meterId: string,
    startTime: string,
    endTime: string,
    token: string
  ): Promise<IoT.GetSaleInfoByMeterIdResponse> {
    return this.request<IoT.GetSaleInfoByMeterIdResponse>(
      '/basic/prepayment/app/SaleInfoByMeterId',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ meterId, startTime, endTime }),
      }
    );
  }

  /**
   * Get project list
   */
  async getProjectList(
    keyword: string = '',
    pageSize: number = 20,
    pageIndex: number = 1,
    token: string
  ): Promise<IoT.GetProjectListResponse> {
    return this.request<IoT.GetProjectListResponse>(
      '/basic/prepayment/app/appProjectList',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ keyword, pageSize, pageIndex }),
      }
    );
  }

  /**
   * Get room information for a project
   * Fetches all rooms by handling pagination if present
   */
  async getProjectRoomInfo(
    projectId: string,
    token: string,
    pageSize: number = 100,
    pageIndex: number = 1
  ): Promise<IoT.GetProjectRoomInfoResponse> {
    console.log(`[IoT Client] Getting rooms for project ${projectId}, page ${pageIndex}, pageSize ${pageSize}`);
    
    const response = await this.request<any>(
      '/basic/prepayment/app/ProjectRoomInfo',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ projectId, pageSize, pageIndex }),
      }
    );

    // Check if response has pagination and more pages to fetch
    if (response.success === '1' && response.data) {
      const rooms = Array.isArray(response.data) ? response.data : (response.data.list || []);
      const pagination = response.data?.pagination;
      
      // If there's pagination and more pages, fetch all remaining pages
      if (pagination && pagination.pageCount > pageIndex) {
        console.log(`[IoT Client] Project ${projectId} has ${pagination.pageCount} pages, fetching more...`);
        const allRooms = [...rooms];
        
        for (let page = pageIndex + 1; page <= pagination.pageCount; page++) {
          const nextResponse = await this.request<any>(
            '/basic/prepayment/app/ProjectRoomInfo',
            {
              method: 'POST',
              token,
              body: JSON.stringify({ projectId, pageSize, pageIndex: page }),
            }
          );
          
          if (nextResponse.success === '1' && nextResponse.data) {
            const nextRooms = Array.isArray(nextResponse.data) ? nextResponse.data : (nextResponse.data.list || []);
            allRooms.push(...nextRooms);
          }
        }
        
        console.log(`[IoT Client] Total rooms fetched for project ${projectId}: ${allRooms.length}`);
        return {
          success: '1',
          errorCode: '',
          errorMsg: '',
          data: allRooms,
        };
      }
      
      console.log(`[IoT Client] Rooms returned for project ${projectId}: ${rooms.length}`);
      return {
        success: response.success,
        errorCode: response.errorCode || '',
        errorMsg: response.errorMsg || '',
        data: rooms,
      };
    }

    return response as IoT.GetProjectRoomInfoResponse;
  }

  /**
   * Get all meters for a project with full details using appProjectMeterList
   * This is the preferred method as it returns all meter data in one call
   */
  async getProjectMeterList(
    projectId: string,
    token: string,
    energyId: string = '1',
    pageSize: number = 100,
    pageIndex: number = 1
  ): Promise<{
    success: string;
    errorCode: string;
    errorMsg: string;
    data: {
      pagination?: { current: number; pageSize: number; total: number; pageCount: number };
      list: any[];
    };
  }> {
    console.log(`[IoT Client] Getting meter list for project ${projectId}, page ${pageIndex}, pageSize ${pageSize}`);
    
    const response = await this.request<any>(
      '/basic/prepayment/app/appProjectMeterList',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ 
          keyword: '',
          projectId, 
          energyId,
          pageSize, 
          pageIndex 
        }),
      }
    );

    // Handle pagination - fetch all pages if there are multiple
    if (response.success === '1' && response.data) {
      const pagination = response.data.pagination;
      let allMeters = response.data.list || [];
      
      // If there are more pages, fetch them all
      if (pagination && pagination.pageCount > pageIndex) {
        console.log(`[IoT Client] Project ${projectId} has ${pagination.pageCount} pages (${pagination.total} total meters), fetching all...`);
        
        for (let page = pageIndex + 1; page <= pagination.pageCount; page++) {
          const nextResponse = await this.request<any>(
            '/basic/prepayment/app/appProjectMeterList',
            {
              method: 'POST',
              token,
              body: JSON.stringify({ 
                keyword: '',
                projectId, 
                energyId,
                pageSize, 
                pageIndex: page 
              }),
            }
          );
          
          if (nextResponse.success === '1' && nextResponse.data?.list) {
            allMeters = allMeters.concat(nextResponse.data.list);
          }
        }
        
        console.log(`[IoT Client] Total meters fetched for project ${projectId}: ${allMeters.length}`);
      } else {
        console.log(`[IoT Client] Meters returned for project ${projectId}: ${allMeters.length}`);
      }
      
      return {
        success: '1',
        errorCode: '',
        errorMsg: '',
        data: {
          pagination: pagination || { current: 1, pageSize, total: allMeters.length, pageCount: 1 },
          list: allMeters,
        },
      };
    }

    return response;
  }
}

// Export singleton instance
export const iotClient = new IotClient();

// Export class for custom instances if needed
export default IotClient;
