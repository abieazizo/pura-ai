/**
 * AssistantConsultation — re-export shim.
 *
 * The chat-first redesign of AI Assist lives in `AssistantChatScreen`.
 * This file remains because the tab navigator and v25 alias import
 * `AssistantConsultation` from here; routing is preserved.
 */
export { AssistantChatScreen as AssistantConsultation } from './AssistantChatScreen';
