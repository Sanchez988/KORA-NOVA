import type { LinearGradientProps } from 'expo-linear-gradient';

/** Colores aceptados por `expo-linear-gradient` (≥ 2 puntos). */
export type LinearGradientColors = NonNullable<LinearGradientProps['colors']>;

// Tipos generales de la aplicación
export interface User {
  id: string;
  email: string;
  dateOfBirth: string;
  verified: boolean;
  createdAt: string;
  /** Coincide con `LEGAL_DOC_VERSION` cuando ya aceptó en el servidor (`/auth/legal-consent`). */
  legalConsentVersion?: string | null;
  profile?: Profile;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  bio?: string;
  gender:
    | 'MALE'
    | 'FEMALE'
    | 'OTHER'
    | 'NON_BINARY'
    | 'GENDERFLUID'
    | 'TRANS_FEMALE'
    | 'TRANS_MALE'
    | 'PREFER_NOT_TO_SAY';
  program: string;
  semester?: number;
  photos: string[];
  interests: string[];
  hobbies: string[];
  relationshipGoal: 'FRIENDSHIP' | 'DATING' | 'SERIOUS_RELATIONSHIP' | 'JUST_MEETING_PEOPLE' | 'STUDY_GROUPS';
  minAge: number;
  maxAge: number;
  maxDistance?: number;
  showMeTo: string;
  showLastSeen: boolean;
  showDistance: boolean;
  incognitoMode: boolean;
  completeness: number;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  matchedAt: string;
  isActive: boolean;
  user1?: User;
  user2?: User;
  lastMessage?: Message | null;
  unreadCount?: number;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  images: string[];
  attachmentNames: string[];
  attachmentTypes: string[];
  isRead: boolean;
  readAt?: string;
  sentAt: string;
  sender?: User;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  dateOfBirth: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}
