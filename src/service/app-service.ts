import { ApiResponseDTO, HealthCheckDTO } from "@/dto/CommonDTO";

export const appService = {
  async getHealth(): Promise<ApiResponseDTO<HealthCheckDTO>> {
    try {
      const response = await fetch("/api/health", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
        };
      }

      const data: HealthCheckDTO = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Không thể kết nối tới API",
      };
    }
  },
};

export default appService;
