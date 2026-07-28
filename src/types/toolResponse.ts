/** Standard shape returned to the voice AI — always includes a speakable message. */
export interface ToolResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  conversationState?: string;
}

export function toolSuccess<T>(message: string, data?: T, conversationState?: string): ToolResult<T> {
  return { success: true, message, data, conversationState };
}

export function toolFailure(message: string, conversationState?: string): ToolResult {
  return { success: false, message, conversationState };
}
