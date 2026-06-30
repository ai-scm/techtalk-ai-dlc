import {
  ApiError,
  TokenResponse,
  UserResponse,
  PetResponse,
  PetDetailResponse,
  PhotoResponse,
  AdoptionRequestResponse,
  AdoptionRequestDetailResponse,
  PaginatedResponse,
  PetFilters,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isFormData = body instanceof FormData;
  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let detail = 'An unexpected error occurred';
    let code = 'UNKNOWN_ERROR';

    try {
      const errorBody = await response.json();
      detail = errorBody.detail || detail;
      code = errorBody.code || code;
    } catch {
      // Response body is not JSON
    }

    throw new ApiError(detail, code, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// --- Auth ---

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  role: string;
  phone?: string;
}

export const auth = {
  login(data: LoginPayload): Promise<TokenResponse> {
    return request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: data,
    });
  },

  register(data: RegisterPayload): Promise<TokenResponse> {
    return request<TokenResponse>('/auth/register', {
      method: 'POST',
      body: data,
    });
  },
};

// --- Pets ---

interface CreatePetPayload {
  name: string;
  species: string;
  size: string;
  age_group: string;
  location: string;
  health_status: string;
  description: string;
}

interface UpdatePetPayload {
  name?: string;
  species?: string;
  size?: string;
  age_group?: string;
  location?: string;
  health_status?: string;
  description?: string;
}

export const pets = {
  list(
    filters: PetFilters = {},
    page: number = 1,
    pageSize: number = 12
  ): Promise<PaginatedResponse<PetResponse>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));

    if (filters.species) params.set('species', filters.species);
    if (filters.location) params.set('location', filters.location);
    if (filters.size) params.set('size', filters.size);
    if (filters.age_group) params.set('age_group', filters.age_group);

    return request<PaginatedResponse<PetResponse>>(`/pets?${params.toString()}`);
  },

  get(petId: string): Promise<PetDetailResponse> {
    return request<PetDetailResponse>(`/pets/${petId}`);
  },

  create(data: CreatePetPayload): Promise<PetResponse> {
    return request<PetResponse>('/pets', {
      method: 'POST',
      body: data,
    });
  },

  update(petId: string, data: UpdatePetPayload): Promise<PetResponse> {
    return request<PetResponse>(`/pets/${petId}`, {
      method: 'PUT',
      body: data,
    });
  },

  updateStatus(petId: string, status: string): Promise<PetResponse> {
    return request<PetResponse>(`/pets/${petId}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },

  getMine(page: number = 1, pageSize: number = 12): Promise<PaginatedResponse<PetResponse>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return request<PaginatedResponse<PetResponse>>(`/pets/mine?${params.toString()}`);
  },
};

// --- Photos ---

export const photos = {
  upload(petId: string, file: File): Promise<PhotoResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return request<PhotoResponse>(`/pets/${petId}/photos`, {
      method: 'POST',
      body: formData,
    });
  },

  delete(petId: string, photoId: string): Promise<void> {
    return request<void>(`/pets/${petId}/photos/${photoId}`, {
      method: 'DELETE',
    });
  },

  getUrl(petId: string, photoId: string): string {
    return `${BASE_URL}/pets/${petId}/photos/${photoId}`;
  },
};

// --- Adoption Requests ---

interface CreateRequestPayload {
  pet_id: string;
  message?: string;
}

export const requests = {
  create(data: CreateRequestPayload): Promise<AdoptionRequestResponse> {
    return request<AdoptionRequestResponse>('/adoption-requests', {
      method: 'POST',
      body: data,
    });
  },

  getMine(
    page: number = 1,
    pageSize: number = 12
  ): Promise<PaginatedResponse<AdoptionRequestResponse>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return request<PaginatedResponse<AdoptionRequestResponse>>(
      `/adoption-requests/mine?${params.toString()}`
    );
  },

  cancel(requestId: string): Promise<AdoptionRequestResponse> {
    return request<AdoptionRequestResponse>(`/adoption-requests/${requestId}/cancel`, {
      method: 'PATCH',
    });
  },

  getForPet(
    petId: string,
    page: number = 1,
    pageSize: number = 12
  ): Promise<PaginatedResponse<AdoptionRequestDetailResponse>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return request<PaginatedResponse<AdoptionRequestDetailResponse>>(
      `/adoption-requests/pet/${petId}?${params.toString()}`
    );
  },

  accept(requestId: string): Promise<AdoptionRequestResponse> {
    return request<AdoptionRequestResponse>(`/adoption-requests/${requestId}/accept`, {
      method: 'PATCH',
    });
  },

  reject(requestId: string): Promise<AdoptionRequestResponse> {
    return request<AdoptionRequestResponse>(`/adoption-requests/${requestId}/reject`, {
      method: 'PATCH',
    });
  },

  review(requestId: string): Promise<AdoptionRequestDetailResponse> {
    return request<AdoptionRequestDetailResponse>(`/adoption-requests/${requestId}`);
  },
};

// --- Users ---

export const users = {
  getMe(): Promise<UserResponse> {
    return request<UserResponse>('/users/me');
  },

  deleteMe(): Promise<void> {
    return request<void>('/users/me', {
      method: 'DELETE',
    });
  },
};

// --- Convenience export for photo URLs ---

export function getPhotoUrl(petId: string, photoId: string): string {
  return photos.getUrl(petId, photoId);
}
