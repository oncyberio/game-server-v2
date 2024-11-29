export interface SystemMessage {
  role: "system";
  content: string;
}

export interface UserMessage {
  role: "user";
  content: string;
}

interface AssistantMessage {
  role: "assistant";
  content: string;
}

export type AiMessage = UserMessage | AssistantMessage;

export interface AITool<P = any, T = any> {
  description: string;
  parameters: Record<string, any>;
  execute?: (params: P) => T | Promise<T>;
}
