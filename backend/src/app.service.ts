import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      warning:
        "⚠️ O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.",
      message: "ETP Express Backend is running",
    };
  }

  getInfo() {
    return {
      name: "ETP Express",
      version: "1.0.0",
      description:
        "Sistema assistivo para elaboração de Estudos Técnicos Preliminares (Lei 14.133/2021)",
      warning:
        "⚠️ O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.",
      features: [
        "Geração assistida por LLM (OpenAI GPT-4)",
        "Busca de contratações similares (Perplexity API)",
        "Sistema de subagentes especializados",
        "Versionamento e auditoria completos",
        "Export para PDF, JSON e XML",
        "Analytics de UX",
      ],
      disclaimer: [
        "Este sistema NÃO substitui responsabilidade administrativa",
        "Este sistema NÃO é ato conclusivo",
        "Este sistema NÃO exime conferência humana",
        "Toda geração deve ser validada por servidor responsável",
      ],
    };
  }
}
