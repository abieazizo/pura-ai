import type { AssistantMessage, Scan } from '@/types';
import { buildAssistantReply } from '@/utils/assistantMock';

export async function askAssistant(args: {
  text: string;
  attachedProductIds?: string[];
  latestScan?: Scan;
  messageId: string;
}): Promise<AssistantMessage> {
  return buildAssistantReply(args);
}
