import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup após cada teste para evitar memory leaks
afterEach(() => {
  cleanup();
});

// =============================================================================
// Mock do PointerEvent para Radix UI (jsdom não implementa nativamente)
// Necessário para componentes como Dialog, Select, Popover, etc.
// Herda de MouseEvent para compatibilidade com @testing-library/user-event
// =============================================================================
class MockPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly twist: number;
  readonly width: number;
  readonly height: number;
  readonly isPrimary: boolean;
  readonly tangentialPressure: number;

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 1;
    this.pointerType = props.pointerType ?? 'mouse';
    this.pressure = props.pressure ?? 0;
    this.tiltX = props.tiltX ?? 0;
    this.tiltY = props.tiltY ?? 0;
    this.twist = props.twist ?? 0;
    this.width = props.width ?? 1;
    this.height = props.height ?? 1;
    this.isPrimary = props.isPrimary ?? true;
    this.tangentialPressure = props.tangentialPressure ?? 0;
  }

  getCoalescedEvents(): PointerEvent[] {
    return [];
  }

  getPredictedEvents(): PointerEvent[] {
    return [];
  }
}

(global as unknown as { PointerEvent: typeof MockPointerEvent }).PointerEvent =
  MockPointerEvent;

// =============================================================================
// Mock de Pointer Capture API (usado por Radix UI para tracking de interações)
// =============================================================================
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture =
    Element.prototype.hasPointerCapture || (() => false);
  Element.prototype.setPointerCapture =
    Element.prototype.setPointerCapture || (() => {});
  Element.prototype.releasePointerCapture =
    Element.prototype.releasePointerCapture || (() => {});
}

// =============================================================================
// Mock de scrollIntoView (usado por Radix UI Select para navegação de opções)
// =============================================================================
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Mock de localStorage (usado pelos stores Zustand)
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock as Storage;

// Mock de fetch para APIs (alternativa ao MSW para casos simples)
global.fetch = vi.fn();

// Configuração global do MSW (opcional - adicionar quando necessário)
// import { server } from './mocks/server'
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
// afterEach(() => server.resetHandlers())
// afterAll(() => server.close())
