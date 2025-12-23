export type MenuType =
  | '협회소개'
  | '공지사항'
  | '사회공헌활동'
  | '자료실'
  | '회장사소개'
  | '회원사소개'
  | '정회원소개'
  | '설립자소개'
  | 'Contact us';

export interface BBSEntry {
  id: string;
  category: MenuType;
  title: string;
  content: string;
  author: string;
  date: string;
  imageUrl?: string;
  fileName?: string;
  fileSize?: number;
  displayOrder?: number;
}

export interface Inquiry {
  id: string;
  title: string;
  content: string;
  date: string;
  status: 'new' | 'read';
}

export interface RollingImage {
  id: number;
  image_url: string;
  subtitle?: string;
  title?: string;
  button_text?: string;
  button_link?: string;
  link_type: 'external' | 'internal';
  display_order: number;
}

export interface AppSettings {
  showSidebar: boolean;
  rollingImages: RollingImage[];
  rollingImageInterval: number;
  founderImageUrl: string;
  chairmanImageUrl: string;
  logoImageUrl: string;
  adminPassword?: string;
}

// 정회원 프로필 인터페이스
export enum MemberRole {
  BOARD = '이사진',
  DIVISION_HEAD = '부분장',
  TEAM_LEADER = '팀장',
  TEAM_MEMBER = '팀원',
  EXECUTIVE = '상임이사'
}

export interface MemberProfile {
  id: string;
  name: string;
  org_position: string;
  company: string;
  company_position: string;
  image_url: string;
  category: MemberRole;
  description: string;
  specialty: string[];
  email: string;
  row_number: number;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}