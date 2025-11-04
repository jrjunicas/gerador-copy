export interface Client {
  id: string;
  name: string;
  toneOfVoice: string;
  targetAudience: string;
  market: string;
}

export interface ContentFormatDefinition {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  command: string;
}

export const SOCIAL_NETWORKS = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Outro'] as const;
export type SocialNetwork = typeof SOCIAL_NETWORKS[number];


export interface ContentRequest {
  id: string;
  theme: string;
  format: string;
  networks: SocialNetwork[];
  customNetwork: string;
  ctaObjective: string;
  specificDirections: string;
}

export interface NetworkContent {
  caption: string;
  hashtags: string;
}

export interface GeneratedContent {
  creativeSuggestion: string;
  coverPhrases: string[];
  networkContent: Record<string, NetworkContent>;
}