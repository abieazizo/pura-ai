/**
 * AssistantV25Screen — v29 private-consultation rebuild.
 *
 * Re-exports the v29 AssistantConsultation screen, which makes the
 * answer become the screen rather than rendering a chat feed. The
 * TabNavigator imports this path so navigation stays stable; the
 * previous v26.4 implementation is preserved in version history.
 */

export { AssistantConsultation as AssistantV25Screen } from '@/screens/assistant/AssistantConsultation';
