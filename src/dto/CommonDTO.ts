export type AppStatus = "IDLE" | "LOADING" | "READY" | "ERROR";

export interface HealthCheckDTO {
  status: "ok";
  app: string;
  timestamp: string;
}

export interface ApiResponseDTO<T> {
  success: boolean;
  data?: T;
  error?: string;
}
