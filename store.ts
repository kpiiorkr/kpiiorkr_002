import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BBSEntry, RollingImage, AppSettings, MenuType, Inquiry } from './types.ts';
import { INITIAL_BBS_DATA, INITIAL_ROLLING_IMAGES } from './constants.tsx';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabaseClient.ts';

interface AppContextType {
  bbsData: BBSEntry[];
  inquiries: Inquiry[];
  settings: AppSettings;
  isAdmin: boolean;
  isSyncing: boolean;
  isLoading: boolean;
  setBbsData: React.Dispatch<React.SetStateAction<BBSEntry[]>>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setIsAdmin: (val: boolean) => void;
  addBBSEntry: (entry: BBSEntry) => Promise<void>;
  updateBBSEntry: (entry: BBSEntry) => Promise<void>;
  deleteBBSEntry: (id: string) => Promise<void>;
  addInquiry: (inquiry: Inquiry) => Promise<void>;
  deleteInquiry: (id: string) => Promise<void>;
  updateRollingImage: (id: number, url: string, link: string) => Promise<void>;
  updateProfileImage: (type: 'founder' | 'chairman' | 'logo', file: File | null, url?: string) => Promise<void>;
  updateAdminPassword: (newPass: string) => Promise<void>;
  toggleSidebar: () => Promise<void>;
  syncExternalData: (category: 'ê³µì§€ì‚¬í•­' | 'ì‚¬íšŒê³µí—Œí™œë™' | 'ìžë£Œì‹¤') => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [bbsData, setBbsData] = useState<BBSEntry[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    showSidebar: true,
    rollingImages: INITIAL_ROLLING_IMAGES,
    founderImageUrl: '',
    chairmanImageUrl: '',
    logoImageUrl: '',
    adminPassword: 'password'
  });
  const [isAdmin, setIsAdminState] = useState(false);

  // Supabase에서 데이터 로드
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // BBS 데이터 로드
      const { data: bbsEntries, error: bbsError } = await supabase
        .from('bbs_entries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (bbsError) {
        console.error('BBS 로드 실패:', bbsError);
        setBbsData(INITIAL_BBS_DATA);
      } else if (bbsEntries && bbsEntries.length > 0) {
        setBbsData(bbsEntries.map(entry => ({
          id: entry.id,
          category: entry.category as MenuType,
          title: entry.title,
          content: entry.content,
          author: entry.author,
          date: entry.date,
          imageUrl: entry.image_url || undefined,
          fileName: entry.file_name || undefined,
          fileSize: entry.file_size || undefined
        })));
      } else {
        // 초기 데이터 삽입
        await initializeData();
      }

      // 문의사항 로드
      const { data: inquiryData, error: inquiryError } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!inquiryError && inquiryData) {
        setInquiries(inquiryData);
      }

      // 설정 로드
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*');
      
      if (!settingsError && settingsData) {
        const settingsObj: any = {};
        settingsData.forEach(item => {
          if (item.key === 'rolling_images') {
            settingsObj.rollingImages = JSON.parse(item.value);
          } else if (item.key === 'show_sidebar') {
            settingsObj.showSidebar = item.value === 'true';
          } else if (item.key === 'founder_image_url') {
            settingsObj.founderImageUrl = item.value;
          } else if (item.key === 'chairman_image_url') {
            settingsObj.chairmanImageUrl = item.value;
          } else if (item.key === 'logo_image_url') {
            settingsObj.logoImageUrl = item.value;
          } else if (item.key === 'admin_password') {
            settingsObj.adminPassword = item.value;
          }
        });
        setSettings(prev => ({ ...prev, ...settingsObj }));
      }

      // 관리자 상태는 sessionStorage에서 로드
      const savedAdmin = sessionStorage.getItem('kpii_is_admin');
      if (savedAdmin) setIsAdminState(savedAdmin === 'true');

    } catch (e) {
      console.error("데이터 로드 실패:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeData = async () => {
    try {
      // 초기 BBS 데이터 삽입
      const { error } = await supabase
        .from('bbs_entries')
        .insert(INITIAL_BBS_DATA.map(entry => ({
          id: entry.id,
          category: entry.category,
          title: entry.title,
          content: entry.content,
          author: entry.author,
          date: entry.date,
          image_url: entry.imageUrl || null,
          file_name: entry.fileName || null,
          file_size: entry.fileSize || null
        })));
      
      if (!error) {
        setBbsData(INITIAL_BBS_DATA);
      }
    } catch (e) {
      console.error("초기 데이터 삽입 실패:", e);
    }
  };

  const setIsAdmin = useCallback((val: boolean) => {
    setIsAdminState(val);
    sessionStorage.setItem('kpii_is_admin', String(val));
  }, []);

  const addBBSEntry = useCallback(async (entry: BBSEntry) => {
    const { error } = await supabase
      .from('bbs_entries')
      .insert({
        id: entry.id,
        category: entry.category,
        title: entry.title,
        content: entry.content,
        author: entry.author,
        date: entry.date,
        image_url: entry.imageUrl || null,
        file_name: entry.fileName || null,
        file_size: entry.fileSize || null
      });
    
    if (!error) {
      setBbsData(prev => [entry, ...prev]);
    } else {
      console.error('게시물 추가 실패:', error);
      alert('게시물 추가에 실패했습니다.');
    }
  }, []);

  const updateBBSEntry = useCallback(async (updated: BBSEntry) => {
    const { error } = await supabase
      .from('bbs_entries')
      .update({
        category: updated.category,
        title: updated.title,
        content: updated.content,
        author: updated.author,
        date: updated.date,
        image_url: updated.imageUrl || null,
        file_name: updated.fileName || null,
        file_size: updated.fileSize || null
      })
      .eq('id', updated.id);
    
    if (!error) {
      setBbsData(prev => prev.map(e => e.id === updated.id ? updated : e));
    } else {
      console.error('게시물 수정 실패:', error);
      alert('게시물 수정에 실패했습니다.');
    }
  }, []);

  const deleteBBSEntry = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('bbs_entries')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setBbsData(prev => prev.filter(e => e.id !== id));
    } else {
      console.error('게시물 삭제 실패:', error);
      alert('게시물 삭제에 실패했습니다.');
    }
  }, []);

  const addInquiry = useCallback(async (inquiry: Inquiry) => {
    const { error } = await supabase
      .from('inquiries')
      .insert(inquiry);
    
    if (!error) {
      setInquiries(prev => [inquiry, ...prev]);
    } else {
      console.error('문의 추가 실패:', error);
    }
  }, []);

  const deleteInquiry = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('inquiries')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setInquiries(prev => prev.filter(i => i.id !== id));
    }
  }, []);

  const updateRollingImage = useCallback(async (id: number, url: string, link: string) => {
    const updatedImages = settings.rollingImages.map(img => 
      img.id === id ? { ...img, url, link } : img
    );
    
    const { error } = await supabase
      .from('settings')
      .update({ value: JSON.stringify(updatedImages) })
      .eq('key', 'rolling_images');
    
    if (!error) {
      setSettings(prev => ({ ...prev, rollingImages: updatedImages }));
    }
  }, [settings.rollingImages]);

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileName = `${folder}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('이미지 업로드 실패:', error);
        return null;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (e) {
      console.error('이미지 업로드 예외:', e);
      return null;
    }
  };

  const updateProfileImage = useCallback(async (type: 'founder' | 'chairman' | 'logo', file: File | null, url?: string) => {
    let imageUrl = url;
    
    if (file) {
      imageUrl = await uploadImage(file, type);
      if (!imageUrl) {
        alert('이미지 업로드에 실패했습니다.');
        return;
      }
    }
    
    if (!imageUrl) return;
    
    const key = `${type}_image_url`;
    const { error } = await supabase
      .from('settings')
      .update({ value: imageUrl })
      .eq('key', key);
    
    if (!error) {
      setSettings(prev => ({ ...prev, [`${type}ImageUrl`]: imageUrl }));
    }
  }, []);

  const updateAdminPassword = useCallback(async (newPass: string) => {
    const { error } = await supabase
      .from('settings')
      .update({ value: newPass })
      .eq('key', 'admin_password');
    
    if (!error) {
      setSettings(prev => ({ ...prev, adminPassword: newPass }));
      alert('비밀번호가 변경되었습니다.');
    } else {
      alert('비밀번호 변경에 실패했습니다.');
    }
  }, []);

  const toggleSidebar = useCallback(async () => {
    const newValue = !settings.showSidebar;
    const { error } = await supabase
      .from('settings')
      .update({ value: String(newValue) })
      .eq('key', 'show_sidebar');
    
    if (!error) {
      setSettings(prev => ({ ...prev, showSidebar: newValue }));
    }
  }, [settings.showSidebar]);

  const syncExternalData = async (category: 'ê³µì§€ì‚¬í•­' | 'ì‚¬íšŒê³µí—Œí™œë™' | 'ìžë£Œì‹¤') => {
    let apiKey = '';
    try { apiKey = (process.env as any).API_KEY; } catch (e) {}
    if (!apiKey) return alert("API_KEYê°€ ì„¤ì •ë˜ì§€ ì•Šì•˜ìŠµë‹ˆë‹¤.");
    
    const urlMap = {
      'ê³µì§€ì‚¬í•­': 'https://kpii.cafe24.com/board/%EA%B3%B5%EC%A7%80%EC%82%AC%ED%95%AD/1/',
      'ì‚¬íšŒê³µí—Œí™œë™': 'https://kpii.cafe24.com/board/%EC%82%AC%ED%9A%8C%EA%B3%B5%ED%97%8C%ED%99%9C%EB%8F%99/4/',
      'ìžë£Œì‹¤': 'https://kpii.cafe24.com/board/%EC%9E%90%EB%A3%8C%EC%8B%A4/7/'
    };

    setIsSyncing(true);
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(urlMap[category])}`;
      const fetchRes = await fetch(proxyUrl);
      const jsonRes = await fetchRes.json();
      const htmlContent = jsonRes.contents;

      const ai = new GoogleGenAI({ apiKey: apiKey });
      const prompt = `HTML ì†ŒìŠ¤ì—ì„œ ìµœì‹  ê²Œì‹œë¬¼ 5ê°œì˜ ì œëª©ê³¼ ìž'ì„± ë‚ ì§œë¥¼ JSON ë°°ì—´ë¡œ ì¶"ì¶œí•˜ì„¸ìš". ì¹´í…Œê³ ë¦¬ëŠ" ${category}ìž…ë‹ˆë‹¤. ë§ˆí¬ë‹¤ìš´ ì—†ì´ ìˆœìˆ˜ JSONë§Œ ë°˜í™˜í•˜ì„¸ìš".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt + "\n\n" + htmlContent.substring(0, 10000) }] }],
        config: { responseMimeType: "application/json" }
      });

      const text = response.text;
      if (!text) throw new Error("AI ì'ë‹µì´ ë¹„ì–´ìžˆìŠµë‹ˆë‹¤.");
      
      const parsedData = JSON.parse(text.replace(/```json|```/g, "").trim());
      
      // 기존 카테고리 데이터 삭제
      await supabase
        .from('bbs_entries')
        .delete()
        .eq('category', category);
      
      // 새 데이터 삽입
      const newEntries = parsedData.map((item: any, idx: number) => ({
        id: `ext-${category}-${idx}-${Date.now()}`,
        category: category,
        title: item.title,
        content: item.content || item.title,
        author: 'ê´€ë¦¬ìž',
        date: item.date || new Date().toISOString().split('T')[0],
        image_url: null,
        file_name: null,
        file_size: null
      }));
      
      const { error } = await supabase
        .from('bbs_entries')
        .insert(newEntries);
      
      if (!error) {
        await loadAllData();
        alert(`${category} ë°ì´í„°ê°€ ì„±ê³µì ìœ¼ë¡œ ë™ê¸°í™"ë˜ì—ˆìŠµë‹ˆë‹¤.`);
      }
    } catch (err) {
      console.error(err);
      alert("ë™ê¸°í™" ì¤' ì˜¤ë¥˜ê°€ ë°œìƒí–ˆìŠµë‹ˆë‹¤.");
    } finally {
      setIsSyncing(false);
    }
  };

  return React.createElement(AppContext.Provider, {
    value: { 
      bbsData, inquiries, settings, isAdmin, isSyncing, isLoading,
      setBbsData, setSettings, setIsAdmin, 
      addBBSEntry, updateBBSEntry, deleteBBSEntry, 
      addInquiry, deleteInquiry,
      updateRollingImage, updateProfileImage, updateAdminPassword, toggleSidebar,
      syncExternalData
    }
  }, children);
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};