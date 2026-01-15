/**
 * MSW handlers for CI environment (Lighthouse CI)
 * Mocks authentication and critical API endpoints to enable testing without backend
 * @see #1488 - Lighthouse CI with MSW mocking
 */
import { http, HttpResponse } from 'msw';
import type { User, AuthResponse } from '../types/user';
import type { ETP } from '../types/etp';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

/**
 * Mock user for CI testing
 */
const mockUser: User = {
  id: 'ci-user-123',
  email: 'ci-test@example.com',
  name: 'CI Test User',
  role: 'user',
  organization: {
    id: 'ci-org-123',
    name: 'CI Test Organization',
  },
  organizationId: 'ci-org-123',
  mustChangePassword: false,
  isDemoBlocked: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Mock ETPs for CI testing
 */
const mockETPs: ETP[] = [
  {
    id: 'etp-1',
    title: 'Mock ETP para Testes CI - Aquisição de Equipamentos',
    description: 'ETP de exemplo para testes de acessibilidade',
    status: 'in_progress',
    progress: 45,
    userId: 'ci-user-123',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    sections: [],
    currentVersion: 1,
    createdBy: {
      id: 'ci-user-123',
      name: 'CI Test User',
    },
  },
  {
    id: 'etp-2',
    title: 'Mock ETP - Contratação de Serviços de TI',
    description: 'Segundo ETP de exemplo',
    status: 'draft',
    progress: 15,
    userId: 'ci-user-123',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    sections: [],
    currentVersion: 1,
    createdBy: {
      id: 'ci-user-123',
      name: 'CI Test User',
    },
  },
  {
    id: 'etp-3',
    title: 'Mock ETP - Reforma de Infraestrutura',
    description: 'Terceiro ETP de exemplo',
    status: 'completed',
    progress: 100,
    userId: 'ci-user-123',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    sections: [],
    currentVersion: 2,
    createdBy: {
      id: 'ci-user-123',
      name: 'CI Test User',
    },
  },
];

/**
 * CI handlers for MSW
 */
export const ciHandlers = [
  // ==================== Auth Endpoints ====================

  /**
   * POST /auth/login
   * Mock successful login
   */
  http.post(`${API_URL}/auth/login`, () => {
    return HttpResponse.json<AuthResponse>(
      {
        token: 'mock-ci-token-12345',
        user: mockUser,
      },
      { status: 200 }
    );
  }),

  /**
   * GET /auth/me
   * Mock current user info
   */
  http.get(`${API_URL}/auth/me`, () => {
    return HttpResponse.json<User>(mockUser, { status: 200 });
  }),

  /**
   * POST /auth/register
   * Mock successful registration
   */
  http.post(`${API_URL}/auth/register`, () => {
    return HttpResponse.json<AuthResponse>(
      {
        token: 'mock-ci-token-12345',
        user: mockUser,
      },
      { status: 201 }
    );
  }),

  /**
   * POST /auth/logout
   * Mock logout
   */
  http.post(`${API_URL}/auth/logout`, () => {
    return HttpResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  }),

  // ==================== ETP Endpoints ====================

  /**
   * GET /etps
   * Mock ETPs list
   */
  http.get(`${API_URL}/etps`, () => {
    return HttpResponse.json<ETP[]>(mockETPs, { status: 200 });
  }),

  /**
   * GET /etps/:id
   * Mock single ETP details
   */
  http.get(`${API_URL}/etps/:id`, ({ params }) => {
    const { id } = params;
    const etp = mockETPs.find((e) => e.id === id);

    if (!etp) {
      return HttpResponse.json(
        { message: 'ETP not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json<ETP>(etp, { status: 200 });
  }),

  /**
   * POST /etps
   * Mock ETP creation
   */
  http.post(`${API_URL}/etps`, async ({ request }) => {
    const body = await request.json();
    const newETP: ETP = {
      id: `etp-${Date.now()}`,
      title: (body as { title?: string }).title || 'Novo ETP Mock',
      description: (body as { description?: string }).description,
      status: 'draft',
      progress: 0,
      userId: 'ci-user-123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: [],
      currentVersion: 1,
      createdBy: {
        id: 'ci-user-123',
        name: 'CI Test User',
      },
    };

    return HttpResponse.json<ETP>(newETP, { status: 201 });
  }),

  // ==================== Templates Endpoints ====================

  /**
   * GET /templates
   * Mock ETP templates
   */
  http.get(`${API_URL}/templates`, () => {
    return HttpResponse.json(
      [
        {
          id: 'template-1',
          name: 'Obras e Serviços de Engenharia',
          category: 'obras',
          description: 'Template para obras e serviços de engenharia',
        },
        {
          id: 'template-2',
          name: 'Tecnologia da Informação',
          category: 'ti',
          description: 'Template para contratação de TI',
        },
        {
          id: 'template-3',
          name: 'Serviços Gerais',
          category: 'servicos',
          description: 'Template para serviços gerais',
        },
        {
          id: 'template-4',
          name: 'Materiais e Equipamentos',
          category: 'materiais',
          description: 'Template para aquisição de materiais',
        },
      ],
      { status: 200 }
    );
  }),

  // ==================== Dashboard/Stats Endpoints ====================

  /**
   * GET /etps/stats
   * Mock dashboard statistics
   */
  http.get(`${API_URL}/etps/stats`, () => {
    return HttpResponse.json(
      {
        total: 3,
        draft: 1,
        inProgress: 1,
        review: 0,
        completed: 1,
        successRate: 0.67,
        avgCompletionTime: 14,
      },
      { status: 200 }
    );
  }),

  // ==================== Organizations Endpoints ====================

  /**
   * GET /organizations/current
   * Mock current organization
   */
  http.get(`${API_URL}/organizations/current`, () => {
    return HttpResponse.json(
      {
        id: 'ci-org-123',
        name: 'CI Test Organization',
        cnpj: '00.000.000/0001-00',
        type: 'MUNICIPAL',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }),

  // ==================== Catch-all for unhandled requests ====================

  /**
   * Catch-all handler for other endpoints
   * Returns empty success responses to prevent network errors
   */
];

/**
 * Export handlers for use in browser.ts
 */
export default ciHandlers;
