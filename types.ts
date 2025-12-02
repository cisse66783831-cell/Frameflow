export enum UserRole {
  ADMIN = 'ADMIN',
  CREATOR = 'CREATOR',
  PARTICIPANT = 'PARTICIPANT'
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM'
}

export enum CampaignCategory {
  EVENT = 'Événement',
  POLITICS = 'Politique & Activisme',
  CHARITY = 'Caritatif',
  EDUCATION = 'Éducation',
  ENTERTAINMENT = 'Divertissement',
  RELIGION = 'Religion',
  OTHER = 'Autre'
}

export enum CampaignType {
  PHOTO_FRAME = 'PHOTO_FRAME',
  DOCUMENT = 'DOCUMENT'
}

export interface TextFieldConfig {
  id: string;
  label: string;
  defaultValue: string;
  x: number; // Percentage or px relative to canvas width
  y: number; // Percentage or px relative to canvas height
  fontFamily: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  maxWidth?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subscription: SubscriptionTier; // Définit si l'utilisateur est PRO ou FREE
  avatar?: string;
  bio?: string;
  isBanned?: boolean; // Pour la modération admin
}

export interface Campaign {
  id: string;
  creatorId: string;
  type: CampaignType; // NOUVEAU: Distingue Cadre Photo vs Document
  title: string;
  description: string;
  category: CampaignCategory;
  frameUrl: string; // URL de l'image de fond
  hashtags: string[];
  createdAt: string;
  stats: {
    views: number;
    downloads: number;
    shares: number;
  };
  creatorTier: SubscriptionTier;
  
  // NOUVEAU: Configuration pour les documents dynamiques
  textFieldsConfig?: TextFieldConfig[];
  
  // NOUVEAU: Confidentialité
  isPrivate: boolean; 
}

export interface EditorState {
  image: HTMLImageElement | null;
  scale: number;
  rotation: number;
  position: { x: number; y: number };
}

export interface GeneratedContent {
  description: string;
  hashtags: string[];
}