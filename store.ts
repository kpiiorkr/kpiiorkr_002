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
  syncExternalData: (category: MenuType) => Promise<void>;
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

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const { data: bbsEntries, error: bbsError } = await supabase
        .from('bbs_entries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (bbsError) {
        console.error('BBS load failed:', bbsError);
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
        await initializeData();
      }

      const { data: inquiryData, error: inquiryError } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!inquiryError && inquiryData) {
        setInquiries(inquiryData);
      }

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

      const savedAdmin = sessionStorage.getItem('kpii_is_admin');
      if (savedAdmin) setIsAdminState(savedAdmin === 'true');

    } catch (e) {
      console.error("Data load failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeData = async () => {
    try {
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
      console.error("Initial data insert failed:", e);
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
      console.error('Failed to add post:', error);
      alert('Failed to add post.');
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
      console.error('Failed to update post:', error);
      alert('Failed to update post.');
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
      console.error('Failed to delete post:', error);
      alert('Failed to delete post.');
    }
  }, []);

  const addInquiry = useCallback(async (inquiry: Inquiry) => {
    const { error } = await supabase
      .from('inquiries')
      .insert(inquiry);
    
    if (!error) {
      setInquiries(prev => [inquiry, ...prev]);
    } else {
      console.error('Failed to add inquiry:', error);
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
        console.error('Image upload failed:', error);
        return null;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (e) {
      console.error('Image upload exception:', e);
      return null;
    }
  };

  const updateProfileImage = useCallback(async (type: 'founder' | 'chairman' | 'logo', file: File | null, url?: string) => {
    let imageUrl = url;
    
    if (file) {
      imageUrl = await uploadImage(file, type);
      if (!imageUrl) {
        alert('Image upload failed.');
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
      alert('Password changed successfully.');
    } else {
      alert('Failed to change password.');
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

  const syncExternalData = async (category: MenuType) => {
    const CATEGORY_MAP: Record<string, string> = {
      '공지사항': 'notice',
      '사회공헌활동': 'activity',
      '자료실': 'resources'
    };

    const categoryKey = CATEGORY_MAP[category];
    if (!categoryKey) {
      alert('Invalid category');
      return;
    }

    let apiKey = '';
    try { apiKey = (process.env as any).API_KEY; } catch (e) {}
    if (!apiKey) {
      alert("API_KEY is not configured.");
      return;
    }
    
    const urlMap: Record<string, string> = {
      'notice': 'https://kpii.cafe24.com/board/%EA%B3%B5%EC%A7%80%EC%82%AC%ED%95%AD/1/',
      'activity': 'https://kpii.cafe24.com/board/%EC%82%AC%ED%9A%8C%EA%B3%B5%ED%97%8C%ED%99%9C%EB%8F%99/4/',
      'resources': 'https://kpii.cafe24.com/board/%EC%9E%90%EB%A3%8C%EC%8B%A4/7/'
    };

    setIsSyncing(true);
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(urlMap[categoryKey])}`;
      const fetchRes = await fetch(proxyUrl);
      const jsonRes = await fetchRes.json();
      const htmlContent = jsonRes.contents;

      const ai = new GoogleGenAI({ apiKey: apiKey });
      const prompt = `Extract latest 5 posts (title and date) from HTML source as JSON array. Category: ${category}. Return pure JSON only without markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt + "\n\n" + htmlContent.substring(0, 10000) }] }],
        config: { responseMimeType: "application/json" }
      });

      const text = response.text;
      if (!text) throw new Error("AI response is empty.");
      
      const parsedData = JSON.parse(text.replace(/```json|```/g, "").trim());
      
      await supabase
        .from('bbs_entries')
        .delete()
        .eq('category', category);
      
      const newEntries = parsedData.map((item: any, idx: number) => ({
        id: `ext-${category}-${idx}-${Date.now()}`,
        category: category,
        title: item.title,
        content: item.content || item.title,
        author: 'Admin',
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
        alert(`${category} data synchronized successfully.`);
      }
    } catch (err) {
      console.error(err);
      alert("Synchronization failed.");
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