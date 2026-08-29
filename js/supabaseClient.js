/**
 * 감자마켓 (Gamza Market) - Supabase 클라이언트 모듈
 * supabaseClient.js
 */

(function (global) {
  'use strict';

  const SUPABASE_URL = 'https://zglbdqvxlpdflzllzgsf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbGJkcXZ4bHBkZmx6bGx6Z3NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDQxNTEsImV4cCI6MjEwMzU4MDE1MX0.UD-iDuWgeedX4Yk0RJiKlwQWvkbBpmS1h5TJ-XeLbI0';

  let client = null;
  function getClient() {
    if (!client && global.supabase && typeof global.supabase.createClient === 'function') {
      client = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  // 개인정보를 전혀 담지 않는 게스트 프로필 관리
  const PROFILE_STORAGE_KEY = 'gamza_guest_profile';
  const DEFAULT_AVATAR = 'assets/default-avatar.svg';

  const SupabaseClient = {
    get client() {
      return getClient();
    },
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    DEFAULT_AVATAR,

    /**
     * 현재 인증(로그인)된 사용자 및 프로필 정보 조회
     * @returns {Promise<Object|null>}
     */
    async getAuthenticatedUser() {
      const cli = this.client;
      if (!cli) return null;

      try {
        const { data: { user }, error } = await cli.auth.getUser();
        if (error || !user) return null;

        // public.profiles에서 프로필 조회
        const { data: profile, error: profileErr } = await cli
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          // 구버전 외부 이미지 URL인 경우 기본 실루엣으로 보정
          const avatarUrl = (profile.avatar_url && !profile.avatar_url.includes('photo-1534528741775-53994a69daeb')) 
            ? profile.avatar_url 
            : DEFAULT_AVATAR;

          return {
            ...profile,
            avatar_url: avatarUrl,
            email: user.email,
            authUser: user
          };
        }

        // 프로필이 없는 경우 메타데이터 기반으로 즉시 생성 (안전장치)
        const nickname = (user.user_metadata && user.user_metadata.nickname) 
          ? user.user_metadata.nickname 
          : `포슬감자#${user.id.slice(0, 4)}`;

        const avatar_url = (user.user_metadata && user.user_metadata.avatar_url) || DEFAULT_AVATAR;

        const newProfile = {
          id: user.id,
          nickname,
          avatar_url,
          activity_area: '강원도 춘천시 감자동',
          manner_temperature: 36.5
        };

        const { data: createdProfile } = await cli
          .from('profiles')
          .upsert(newProfile)
          .select()
          .single();

        return {
          ...(createdProfile || newProfile),
          email: user.email,
          authUser: user
        };
      } catch (err) {
        console.error('[SupabaseClient] getAuthenticatedUser 오류:', err);
        return null;
      }
    },

    /**
     * 이메일/비밀번호 회원가입 (프로필 사진 옵션 포함)
     * @param {Object} param0 { email, password, nickname, avatar_url }
     */
    async signUp({ email, password, nickname, avatar_url }) {
      const cli = this.client;
      if (!cli) throw new Error('Supabase client not initialized');

      const trimmedEmail = email.trim();
      const trimmedNickname = nickname.trim();
      const finalAvatarUrl = avatar_url || DEFAULT_AVATAR;

      const { data, error } = await cli.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            nickname: trimmedNickname,
            activity_area: '강원도 춘천시 감자동',
            avatar_url: finalAvatarUrl
          }
        }
      });

      if (error) {
        throw error;
      }

      // 사용자 생성 즉시 public.profiles에도 레코드 보장
      if (data && data.user) {
        const userProfile = {
          id: data.user.id,
          nickname: trimmedNickname,
          avatar_url: finalAvatarUrl,
          activity_area: '강원도 춘천시 감자동',
          manner_temperature: 36.5
        };

        await cli.from('profiles').upsert(userProfile);
      }

      return data;
    },

    /**
     * 이메일/비밀번호 로그인
     * @param {Object} param0 { email, password }
     */
    async signIn({ email, password }) {
      const cli = this.client;
      if (!cli) throw new Error('Supabase client not initialized');

      const { data, error } = await cli.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        throw error;
      }

      return data;
    },

    /**
     * 로그아웃
     */
    async signOut() {
      const cli = this.client;
      if (!cli) return;

      const { error } = await cli.auth.signOut();
      if (error) {
        console.error('[SupabaseClient] signOut 오류:', error);
        throw error;
      }
    },

    /**
     * 사용자 프로필 업데이트 (닉네임, 아바타 사진, 활동지역 등)
     * @param {Object} updates { nickname, avatar_url, activity_area }
     */
    async updateProfile(updates) {
      const cli = this.client;
      if (!cli) throw new Error('Supabase client not available');

      const authUser = await this.getAuthenticatedUser();
      if (!authUser || !authUser.id) {
        throw new Error('로그인이 필요합니다.');
      }

      const updatePayload = {};
      if (updates.nickname && updates.nickname.trim()) {
        updatePayload.nickname = updates.nickname.trim();
      }
      if (updates.avatar_url) {
        updatePayload.avatar_url = updates.avatar_url;
      }
      if (updates.activity_area) {
        updatePayload.activity_area = updates.activity_area.trim();
      }

      // 1. public.profiles 테이블 업데이트
      const { data, error } = await cli
        .from('profiles')
        .update(updatePayload)
        .eq('id', authUser.id)
        .select()
        .single();

      if (error) {
        console.error('[SupabaseClient] updateProfile DB 실패:', error);
        throw error;
      }

      // 2. auth.users 메타데이터 동기화
      try {
        await cli.auth.updateUser({
          data: updatePayload
        });
      } catch (metaErr) {
        console.warn('[SupabaseClient] auth metadata update warning:', metaErr);
      }

      return data;
    },

    /**
     * 인증 상태 변화 리스너 등록
     * @param {Function} callback (event, session, profile) => void
     */
    onAuthStateChange(callback) {
      const cli = this.client;
      if (!cli) return { unsubscribe: () => {} };

      const { data: { subscription } } = cli.auth.onAuthStateChange(async (event, session) => {
        let profile = null;
        if (session && session.user) {
          profile = await this.getAuthenticatedUser();
        }
        if (typeof callback === 'function') {
          callback(event, session, profile);
        }
      });

      return subscription;
    },

    /**
     * 로컬 게스트 프로필 조회 또는 새로 생성 (로그인 사용자가 있으면 해당 프로필 반환)
     */
    async getOrCreateCurrentProfile() {
      // 1. 실제 로그인된 사용자 확인
      const authUser = await this.getAuthenticatedUser();
      if (authUser) {
        return authUser;
      }

      // 2. 게스트 프로필 조회/생성
      try {
        let stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        const cli = this.client;
        if (stored) {
          const profile = JSON.parse(stored);
          if (cli && profile.id && typeof profile.id === 'string' && profile.id.length > 20) {
            const { data } = await cli
              .from('profiles')
              .select('*')
              .eq('id', profile.id)
              .maybeSingle();

            if (data) {
              return {
                ...data,
                avatar_url: data.avatar_url && !data.avatar_url.includes('photo-1534528741775-53994a69daeb')
                  ? data.avatar_url
                  : DEFAULT_AVATAR
              };
            }
          } else if (profile.id) {
            return {
              ...profile,
              avatar_url: profile.avatar_url || DEFAULT_AVATAR
            };
          }
        }

        // 새로운 게스트 프로필 생성 (실루엣 아바타 적용)
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const newProfile = {
          nickname: `포슬감자#${randomNum}`,
          avatar_url: DEFAULT_AVATAR,
          activity_area: '강원도 춘천시 감자동',
          manner_temperature: 36.5
        };

        if (cli) {
          const { data, error } = await cli
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();

          if (!error && data) {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
            return data;
          }
        }

        newProfile.id = 'guest_' + Date.now();
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
        return newProfile;
      } catch (err) {
        console.error('[SupabaseClient] 게스트 프로필 오류:', err);
        return {
          id: 'fallback_user',
          nickname: '따뜻한이웃',
          avatar_url: DEFAULT_AVATAR,
          activity_area: '강원도 춘천시 감자동',
          manner_temperature: 36.5
        };
      }
    },

    /**
     * 프로필 아바타 이미지 업로드 (avatars 폴더 저장)
     * @param {File} file 
     * @returns {Promise<string>} 업로드된 공개 URL
     */
    async uploadAvatarImage(file) {
      const cli = this.client;
      if (!cli) throw new Error('Supabase client not available');

      if (!file || !file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드할 수 있습니다.');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('프로필 사진은 5MB 이하만 가능합니다.');
      }

      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data, error } = await cli.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('[SupabaseClient] 아바타 업로드 실패:', error);
        throw error;
      }

      const { data: publicUrlData } = cli.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    },

    /**
     * Supabase Storage (product-images 버킷)에 상품 이미지 업로드
     * @param {File} file 
     * @returns {Promise<string>} 업로드된 공개 URL
     */
    async uploadProductImage(file) {
      const cli = this.client;
      if (!cli) throw new Error('Supabase client not available');

      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { data, error } = await cli.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[SupabaseClient] 이미지 업로드 실패:', error);
        throw error;
      }

      const { data: publicUrlData } = cli.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    }
  };

  global.GamzaSupabase = SupabaseClient;
})(typeof window !== 'undefined' ? window : globalThis);
