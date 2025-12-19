export interface ApiResponse<T = unknown> {
 success: boolean;
 data?: T;
 error?: ApiError;
 message?: string;
}

export interface ApiError {
 code: string;
 message: string;
 details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
 data: T[];
 pagination: {
 page: number;
 limit: number;
 total: number;
 totalPages: number;
 };
}

export interface QueryParams {
 page?: number;
 limit?: number;
 sort?: string;
 order?: 'asc' | 'desc';
 search?: string;
 filters?: Record<string, unknown>;
}
