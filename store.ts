import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  BBSEntry,
  RollingImage,
  AppSettings,
  Inquiry,
  MemberProfile,
  MenuType,
} from './types';

import {
  INITIAL_BBS_DATA,
  INITIAL_ROLLING_IMAGES,
} from './constants';

import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  BBS: 'kpii_bbs_data',
  SETTINGS: 'kpii_settings',
  INQUIRIES: 'kpii_inquiries',
} as const;

interface AppContextType {
  bbsData: BBSEntry[];
  inquiries: Inquiry[];
  memberProfiles: MemberProfile[];
  settings: AppSettings;
  isAdmin: boolean;
  isSyncing: boolean;

  setIsAdmin: (val: boolean) => void;
  toggleSidebar: () => void;

  addBBSEntry: (entry: BBSEntry) => Promise<void>;
  updateBBSEntry: (entry: BBSEntry) => Promise<void>;
  deleteBBSEntry: (id: string) => Promise<void>;
  updateBBSOrder: (category: MenuType, items: BBSEntry[]) => Promise<void>;

  addInquiry: (inquiry: Inquiry) => Promise<void>;
  deleteInquiry: (id: string) => Promise<void>;

  updateSettings: (updates: Partial<AppSettings>) => void;
  updateAdminPassword: (password: string) => Promise<void>;

  addRollingImage: (image: Omit<RollingImage, 'id'>) => Promise<void>;
  updateRollingImage: (image: RollingImage) => Promise<void>;
  deleteRollingImage: (id: number) => Promise<void>;
  loadRollingImages: () => Promise<void>;

  updateProfileImage: (
    type: 'founder' | 'chairman' | 'logo',
    url: string
  ) => Promise<void>;

  // 정회원 프로필 관련 함수
  loadMemberProfiles: () => Promise<void>;
  addMemberProfile: (profile: Omit<MemberProfile, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateMemberProfile: (profile: MemberProfile) => Promise<void>;
  deleteMemberProfile: (id: string) => Promise<void>;
  updateMemberProfileOrder: (profiles: MemberProfile[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(
  undefined
);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [bbsData, setBbsData] = useState<BBSEntry[]>(INITIAL_BBS_DATA);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<MemberProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    showSidebar: true,
    rollingImages: INITIAL_ROLLING_IMAGES,
    rollingImageInterval: 5000,
    founderImageUrl:
      'https://raw.githubusercontent.com/kpiiorkr/img/main/founder.png',
    chairmanImageUrl:
      'https://raw.githubusercontent.com/kpiiorkr/img/main/kwon.png',
    logoImageUrl:
      'https://raw.githubusercontent.com/kpiiorkr/img/main/logo.png',
    adminPassword: 'password',
  });
  const [isAdmin, setIsAdminState] = useState(false);
  const [settingsRowId, setSettingsRowId] = useState<string | null>(null);

  // Supabase에서 rolling images 로드
  const loadRollingImages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('rolling_images')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Failed to load rolling images:', error);
        return;
      }

      if (data && data.length > 0) {
        const transformedData = data.map((item: any) => ({
          id: item.id,
          image_url: item.image_url,
          subtitle: item.subtitle || undefined,
          title: item.title || undefined,
          button_text: item.button_text || undefined,
          button_link: item.button_link || undefined,
          link_type: item.link_type || 'internal',
          display_order: item.display_order || 1,
        }));

        console.log('Loaded rolling images:', transformedData);

        setSettings(prev => ({
          ...prev,
          rollingImages: transformedData,
        }));
      }
    } catch (e) {
      console.error('Error loading rolling images:', e);
    }
  }, []);

  // Supabase에서 BBS 데이터 로드
  const loadBBSData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bbs_entries')
        .select('*')
        .order('display_order', { ascending: true })
        .order('date', { ascending: false });

      if (error) {
        console.error('Failed to load BBS data:', error);
        return;
      }

      if (data && data.length > 0) {
        const transformedData = data.map((item: any) => ({
          id: item.id,
          category: item.category,
          title: item.title,
          content: item.content,
          author: item.author,
          date: item.date,
          imageUrl: item.image_url,
          fileName: item.file_name,
          fileSize: item.file_size,
          displayOrder: item.display_order || 1,
        }));
        setBbsData(transformedData);
        console.log('Loaded BBS data from Supabase:', transformedData.length);
      }
    } catch (e) {
      console.error('Error loading BBS data:', e);
    }
  }, []);

  // Supabase에서 inquiries 로드
  const loadInquiries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load inquiries:', error);
        return;
      }

      if (data && data.length > 0) {
        setInquiries(data);
        console.log('Loaded inquiries from Supabase:', data.length);
      }
    } catch (e) {
      console.error('Error loading inquiries:', e);
    }
  }, []);

  // Supabase에서 admin password 로드
  const loadAdminPassword = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('setting_key', 'admin_password')
        .single();

      if (!error && data) {
        const password = data.setting_value?.password || 'password';
        setSettings(prev => ({ ...prev, adminPassword: password }));
        console.log('Loaded admin password from Supabase');
      }
    } catch (e) {
      console.error('Error loading admin password:', e);
    }
  }, []);

  // 정회원 프로필 로드
  const loadMemberProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('member_profiles')
        .select('*')
        .order('row_number', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Failed to load member profiles:', error);
        return;
      }

      if (data && data.length > 0) {
        const transformedData = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          org_position: item.org_position,
          company: item.company,
          company_position: item.company_position,
          image_url: item.image_url,
          category: item.category,
          description: item.description,
          specialty: item.specialty || [],
          email: item.email,
          row_number: item.row_number || 1,
          display_order: item.display_order || 1,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        setMemberProfiles(transformedData);
        console.log('Loaded member profiles from Supabase:', transformedData.length);
      }
    } catch (e) {
      console.error('Error loading member profiles:', e);
    }
  }, []);

  // localStorage + Supabase settings 로드
  useEffect(() => {
    const loadFromStorageAndSupabase = async () => {
      try {
        const savedAdmin = localStorage.getItem('kpii_is_admin');
        if (savedAdmin) setIsAdminState(savedAdmin === 'true');

        // Supabase settings를 먼저 로드
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          setSettings(prev => ({
            ...prev,
            logoImageUrl:
              data.logo_image_url ?? prev.logoImageUrl,
            founderImageUrl:
              data.founder_image_url ?? prev.founderImageUrl,
            chairmanImageUrl:
              data.chairman_image_url ??
              prev.chairmanImageUrl,
          }));
          setSettingsRowId(data.id);
        }

        // localStorage settings는 Supabase 이미지를 덮어쓰지 않도록 주의
        const savedSettings = localStorage.getItem(
          STORAGE_KEYS.SETTINGS
        );
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          const { logoImageUrl, founderImageUrl, chairmanImageUrl, adminPassword, ...otherSettings } = parsed;
          setSettings(prev => ({ ...prev, ...otherSettings }));
        }

        // BBS 데이터 로드 (Supabase 우선)
        await loadBBSData();

        // Rolling images 로드
        await loadRollingImages();

        // Inquiries 로드 (Supabase 우선)
        await loadInquiries();

        // Admin password 로드
        await loadAdminPassword();

        // 정회원 프로필 로드
        await loadMemberProfiles();

      } catch (e) {
        console.error('Data recovery failed', e);
      } finally {
        setTimeout(() => setIsInitialized(true), 50);
      }
    };

    loadFromStorageAndSupabase();
  }, [loadRollingImages, loadInquiries, loadAdminPassword, loadBBSData, loadMemberProfiles]);

  // localStorage 저장 (비밀번호, BBS, inquiries 제외)
  useEffect(() => {
    if (!isInitialized) return;

    try {
      // BBS와 inquiries는 Supabase에만 저장
      
      // settings에서 adminPassword 제외하고 저장
      const { adminPassword, ...settingsToSave } = settings;
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settingsToSave)
      );
    } catch (e) {
      console.warn(
        'Storage quota exceeded.',
        e
      );
    }
  }, [settings, isInitialized]);

  const setIsAdmin = useCallback((val: boolean) => {
    setIsAdminState(val);
    localStorage.setItem('kpii_is_admin', String(val));
  }, []);

  // BBS (Supabase 동기화)
  const addBBSEntry = useCallback(async (entry: BBSEntry) => {
    try {
      const { error } = await supabase
        .from('bbs_entries')
        .insert([{
          id: entry.id,
          category: entry.category,
          title: entry.title,
          content: entry.content,
          author: entry.author,
          date: entry.date,
          image_url: entry.imageUrl,
          file_name: entry.fileName,
          file_size: entry.fileSize,
        }]);

      if (error) {
        console.error('Failed to save BBS entry:', error);
        throw error;
      }

      setBbsData(prev => [entry, ...prev]);
      console.log('BBS entry saved to Supabase');
    } catch (e) {
      console.error('Error adding BBS entry:', e);
      alert('게시글 저장에 실패했습니다.');
      throw e;
    }
  }, []);

  const updateBBSEntry = useCallback(
    async (entry: BBSEntry) => {
      try {
        const { error } = await supabase
          .from('bbs_entries')
          .update({
            category: entry.category,
            title: entry.title,
            content: entry.content,
            author: entry.author,
            date: entry.date,
            image_url: entry.imageUrl,
            file_name: entry.fileName,
            file_size: entry.fileSize,
          })
          .eq('id', entry.id);

        if (error) {
          console.error('Failed to update BBS entry:', error);
          throw error;
        }

        setBbsData(prev =>
          prev.map(b => (b.id === entry.id ? entry : b))
        );
        console.log('BBS entry updated in Supabase');
      } catch (e) {
        console.error('Error updating BBS entry:', e);
        alert('게시글 수정에 실패했습니다.');
        throw e;
      }
    },
    []
  );

  const deleteBBSEntry = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('bbs_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete BBS entry:', error);
        throw error;
      }

      setBbsData(prev =>
        prev.filter(entry => entry.id !== id)
      );
      console.log('BBS entry deleted from Supabase');
    } catch (e) {
      console.error('Error deleting BBS entry:', e);
      alert('게시글 삭제에 실패했습니다.');
      throw e;
    }
  }, []);

  // BBS 순서 업데이트
  const updateBBSOrder = useCallback(async (category: MenuType, items: BBSEntry[]) => {
    try {
      // 순서대로 display_order 업데이트
      const updates = items.map((item, index) => 
        supabase
          .from('bbs_entries')
          .update({ display_order: index + 1 })
          .eq('id', item.id)
      );

      await Promise.all(updates);

      // 로컬 state 업데이트
      setBbsData(prev => 
        prev.map(entry => {
          const updated = items.find(i => i.id === entry.id);
          return updated ? { ...entry, displayOrder: items.indexOf(updated) + 1 } : entry;
        })
      );

      console.log('BBS order updated successfully');
    } catch (e) {
      console.error('Error updating BBS order:', e);
      alert('순서 변경에 실패했습니다.');
      throw e;
    }
  }, []);

  // Inquiry (Supabase 동기화)
  const addInquiry = useCallback(async (inq: Inquiry) => {
    try {
      const { error } = await supabase
        .from('inquiries')
        .insert([{
          id: inq.id,
          title: inq.title,
          content: inq.content,
          date: inq.date,
          status: inq.status,
        }]);

      if (error) {
        console.error('Failed to save inquiry:', error);
        throw error;
      }

      setInquiries(prev => [inq, ...prev]);
      console.log('Inquiry saved to Supabase');
    } catch (e) {
      console.error('Error adding inquiry:', e);
      alert('문의 저장에 실패했습니다.');
      throw e;
    }
  }, []);

  const deleteInquiry = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('inquiries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete inquiry:', error);
        throw error;
      }

      setInquiries(prev =>
        prev.filter(inq => inq.id !== id)
      );
      console.log('Inquiry deleted from Supabase');
    } catch (e) {
      console.error('Error deleting inquiry:', e);
      alert('문의 삭제에 실패했습니다.');
      throw e;
    }
  }, []);

  // Settings
  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      setSettings(prev => ({ ...prev, ...updates }));
    },
    []
  );

  const toggleSidebar = useCallback(() => {
    setSettings(prev => ({ ...prev, showSidebar: !prev.showSidebar }));
  }, []);

  const updateAdminPassword = useCallback(
    async (password: string) => {
      try {
        const { error } = await supabase
          .from('admin_settings')
          .upsert({
            setting_key: 'admin_password',
            setting_value: { password },
          }, {
            onConflict: 'setting_key'
          });

        if (error) {
          console.error('Failed to save password:', error);
          throw error;
        }

        setSettings(prev => ({
          ...prev,
          adminPassword: password,
        }));
        
        console.log('Admin password saved to Supabase');
      } catch (e) {
        console.error('Error updating admin password:', e);
        alert('비밀번호 저장에 실패했습니다.');
        throw e;
      }
    },
    []
  );

  // Rolling images with Supabase
  const addRollingImage = useCallback(
    async (image: Omit<RollingImage, 'id'>) => {
      try {
        const { data, error } = await supabase
          .from('rolling_images')
          .insert([image])
          .select()
          .single();

        if (error) {
          console.error('Failed to add rolling image:', error);
          throw error;
        }

        if (data) {
          const transformedData: RollingImage = {
            id: data.id,
            image_url: data.image_url,
            subtitle: data.subtitle || undefined,
            title: data.title || undefined,
            button_text: data.button_text || undefined,
            button_link: data.button_link || undefined,
            link_type: data.link_type,
            display_order: data.display_order,
          };

          setSettings(prev => ({
            ...prev,
            rollingImages: [...prev.rollingImages, transformedData],
          }));
        }
      } catch (e) {
        console.error('Error adding rolling image:', e);
        throw e;
      }
    },
    []
  );

  const updateRollingImage = useCallback(
    async (image: RollingImage) => {
      try {
        const { error } = await supabase
          .from('rolling_images')
          .update({
            image_url: image.image_url,
            subtitle: image.subtitle,
            title: image.title,
            button_text: image.button_text,
            button_link: image.button_link,
            link_type: image.link_type,
            display_order: image.display_order,
          })
          .eq('id', image.id);

        if (error) {
          console.error('Failed to update rolling image:', error);
          throw error;
        }

        setSettings(prev => ({
          ...prev,
          rollingImages: prev.rollingImages.map(img =>
            img.id === image.id ? image : img
          ),
        }));
      } catch (e) {
        console.error('Error updating rolling image:', e);
        throw e;
      }
    },
    []
  );

  const deleteRollingImage = useCallback(async (id: number) => {
    try {
      const { error } = await supabase
        .from('rolling_images')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete rolling image:', error);
        throw error;
      }

      setSettings(prev => ({
        ...prev,
        rollingImages: prev.rollingImages.filter(
          img => img.id !== id
        ),
      }));
    } catch (e) {
      console.error('Error deleting rolling image:', e);
      throw e;
    }
  }, []);

  // Profile image URLs (Supabase settings table)
  const updateProfileImage = useCallback(
    async (
      type: 'founder' | 'chairman' | 'logo',
      url: string
    ) => {
      setSettings(prev => ({
        ...prev,
        [`${type}ImageUrl`]: url,
      }) as AppSettings);

      try {
        if (!settingsRowId) return;

        const payload: Record<string, string> = {};
        if (type === 'logo')
          payload.logo_image_url = url;
        if (type === 'founder')
          payload.founder_image_url = url;
        if (type === 'chairman')
          payload.chairman_image_url = url;

        const { error } = await supabase
          .from('settings')
          .update(payload)
          .eq('id', settingsRowId);

        if (error) {
          console.error(
            'Supabase update error:',
            error
          );
          alert(
            'Failed to save image settings.'
          );
        }
      } catch (e) {
        console.error(e);
        alert(
          'Unexpected error while saving image settings.'
        );
      }
    },
    [settingsRowId]
  );

  // 정회원 프로필 CRUD
  const addMemberProfile = useCallback(async (profile: Omit<MemberProfile, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Supabase에 insert하면 자동으로 UUID가 생성됨
      const { data, error } = await supabase
        .from('member_profiles')
        .insert([profile])
        .select()
        .single();

      if (error) {
        console.error('Failed to add member profile:', error);
        throw error;
      }

      if (data) {
        setMemberProfiles(prev => [...prev, data as MemberProfile]);
        console.log('Member profile added to Supabase');
      }
    } catch (e) {
      console.error('Error adding member profile:', e);
      alert('프로필 추가에 실패했습니다.');
      throw e;
    }
  }, []);

  const updateMemberProfile = useCallback(async (profile: MemberProfile) => {
    try {
      const { error } = await supabase
        .from('member_profiles')
        .update({
          name: profile.name,
          org_position: profile.org_position,
          company: profile.company,
          company_position: profile.company_position,
          image_url: profile.image_url,
          category: profile.category,
          description: profile.description,
          specialty: profile.specialty,
          email: profile.email,
          row_number: profile.row_number,
          display_order: profile.display_order,
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Failed to update member profile:', error);
        throw error;
      }

      setMemberProfiles(prev =>
        prev.map(p => (p.id === profile.id ? profile : p))
      );
      console.log('Member profile updated in Supabase');
    } catch (e) {
      console.error('Error updating member profile:', e);
      alert('프로필 수정에 실패했습니다.');
      throw e;
    }
  }, []);

  const deleteMemberProfile = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('member_profiles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete member profile:', error);
        throw error;
      }

      setMemberProfiles(prev =>
        prev.filter(p => p.id !== id)
      );
      console.log('Member profile deleted from Supabase');
    } catch (e) {
      console.error('Error deleting member profile:', e);
      alert('프로필 삭제에 실패했습니다.');
      throw e;
    }
  }, []);

  const updateMemberProfileOrder = useCallback(async (profiles: MemberProfile[]) => {
    try {
      const updates = profiles.map(profile => 
        supabase
          .from('member_profiles')
          .update({ 
            row_number: profile.row_number,
            display_order: profile.display_order 
          })
          .eq('id', profile.id)
      );

      await Promise.all(updates);

      setMemberProfiles(profiles);
      console.log('Member profile order updated successfully');
    } catch (e) {
      console.error('Error updating member profile order:', e);
      alert('순서 변경에 실패했습니다.');
      throw e;
    }
  }, []);

  const value: AppContextType = {
    bbsData,
    inquiries,
    memberProfiles,
    settings,
    isAdmin,
    isSyncing,
    setIsAdmin,
    toggleSidebar,
    addBBSEntry,
    updateBBSEntry,
    deleteBBSEntry,
    updateBBSOrder,
    addInquiry,
    deleteInquiry,
    updateSettings,
    updateAdminPassword,
    addRollingImage,
    updateRollingImage,
    deleteRollingImage,
    loadRollingImages,
    updateProfileImage,
    loadMemberProfiles,
    addMemberProfile,
    updateMemberProfile,
    deleteMemberProfile,
    updateMemberProfileOrder,
  };

  return React.createElement(
    AppContext.Provider,
    { value },
    children
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error(
      'useApp must be used within AppProvider'
    );
  }
  return context;
};