import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup após cada teste para evitar memory leaks
afterEach(() => {
  cleanup()
})

// Mock de localStorage (usado pelos stores Zustand)
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

global.localStorage = localStorageMock as Storage

// Mock de fetch para APIs (alternativa ao MSW para casos simples)
global.fetch = vi.fn()

// Configuração global do MSW (opcional - adicionar quando necessário)
// import { server } from './mocks/server'
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
// afterEach(() => server.resetHandlers())
// afterAll(() => server.close())
