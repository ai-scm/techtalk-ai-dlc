export type UserRole = 'ADOPTER' | 'PUBLISHER' | 'FOUNDATION';

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  redirect_url: string;
}

export interface PetResponse {
  id: string;
  publisher_id: string;
  name: string;
  species: string;
  size: string;
  age_group: string;
  location: string;
  health_status: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoResponse {
  id: string;
  pet_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface PetDetailResponse extends PetResponse {
  photos: PhotoResponse[];
}

export interface AdoptionRequestResponse {
  id: string;
  pet_id: string;
  adopter_id: string;
  publisher_id: string;
  status: string;
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface AdoptionRequestDetailResponse extends AdoptionRequestResponse {
  adopter_email?: string;
  adopter_phone?: string;
  adopter_name?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PetFilters {
  species?: string;
  location?: string;
  size?: string;
  age_group?: string;
}

export class ApiError extends Error {
  public readonly detail: string;
  public readonly code: string;
  public readonly status: number;

  constructor(detail: string, code: string, status: number) {
    super(detail);
    this.name = 'ApiError';
    this.detail = detail;
    this.code = code;
    this.status = status;
  }
}
