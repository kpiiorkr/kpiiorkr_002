export type MenuType =
  | '협회소개'
  | '공지사항'
  | '사회공헌활동'
  | '자료실'
  | '회장사소개'
  | '회원사소개'
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
  displayOrder?: number; // 추가
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