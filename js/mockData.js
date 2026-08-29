/**
 * Gamza Market - Supabase Data Layer & Manager (GamzaData)
 * 감자마켓 Supabase 데이터베이스 연동 및 데이터 관리자
 */

(function (global) {
  'use strict';

  function getSupabase() {
    return global.GamzaSupabase ? global.GamzaSupabase.client : null;
  }

  const GamzaData = {
    /**
     * 상대 시간 포맷터 유틸리티
     */
    formatRelativeTime(dateInput) {
      if (!dateInput) return '방금 전';
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return dateInput;

      const now = new Date();
      const diffSec = Math.floor((now - date) / 1000);

      if (diffSec < 60) return '방금 전';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}분 전`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}시간 전`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 30) return `${diffDay}일 전`;
      const diffMonth = Math.floor(diffDay / 30);
      if (diffMonth < 12) return `${diffMonth}달 전`;
      return `${Math.floor(diffDay / 365)}년 전`;
    },

    /**
     * 현재 사용자 프로필 가져오기
     */
    async getCurrentUser() {
      if (global.GamzaSupabase && typeof global.GamzaSupabase.getOrCreateCurrentProfile === 'function') {
        return await global.GamzaSupabase.getOrCreateCurrentProfile();
      }
      return {
        id: 'guest_fallback',
        nickname: '익명의 포슬감자',
        avatar_url: 'assets/default-avatar.svg',
        activity_area: '강원도 춘천시 감자동',
        manner_temperature: 36.5
      };
    },

    /**
     * 상품 목록 조회 (Supabase 비동기)
     * @param {Object} filterOptions { category, onlyAvailable, searchKeyword, sortBy, page, itemsPerPage }
     */
    async fetchProducts(filterOptions = {}) {
      const supabase = getSupabase();
      const user = await this.getCurrentUser();

      if (!supabase) {
        console.warn('[GamzaData] Supabase 미연결');
        return { products: [], totalCount: 0 };
      }

      try {
        let query = supabase
          .from('products')
          .select(`
            id,
            seller_id,
            title,
            category,
            price,
            location,
            status,
            image_url,
            description,
            likes_count,
            created_at,
            updated_at,
            seller:profiles(id, nickname, avatar_url, activity_area, manner_temperature),
            comments:product_comments(count)
          `, { count: 'exact' });

        // 카테고리 필터
        if (filterOptions.category && filterOptions.category !== '전체') {
          query = query.eq('category', filterOptions.category);
        }

        // 거래 가능만 필터 (거래완료 상품 제외)
        if (filterOptions.onlyAvailable) {
          query = query.neq('status', '거래완료');
        }

        // 검색어 필터
        if (filterOptions.searchKeyword && filterOptions.searchKeyword.trim()) {
          const kw = filterOptions.searchKeyword.trim();
          query = query.or(`title.ilike.%${kw}%,description.ilike.%${kw}%,location.ilike.%${kw}%`);
        }

        // 정렬
        switch (filterOptions.sortBy) {
          case 'price-low':
            query = query.order('price', { ascending: true });
            break;
          case 'price-high':
            query = query.order('price', { ascending: false });
            break;
          case 'likes':
            query = query.order('likes_count', { ascending: false });
            break;
          case 'latest':
          default:
            query = query.order('created_at', { ascending: false });
            break;
        }

        // 페이지네이션
        const page = Number(filterOptions.page) || 1;
        const itemsPerPage = Number(filterOptions.itemsPerPage) || 9;
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        query = query.range(from, to);

        const { data, count, error } = await query;

        if (error) {
          console.error('[GamzaData] fetchProducts 오류:', error);
          throw error;
        }

        // 현재 사용자가 찜했는지 확인
        let likedProductIds = new Set();
        if (user && user.id && data && data.length > 0) {
          const productIds = data.map(p => p.id);
          const { data: likesData } = await supabase
            .from('product_likes')
            .select('product_id')
            .eq('user_id', user.id)
            .in('product_id', productIds);

          if (likesData) {
            likedProductIds = new Set(likesData.map(l => l.product_id));
          }
        }

        // 프론트엔드 포맷으로 매핑
        const mapped = (data || []).map(p => ({
          id: p.id,
          title: p.title,
          category: p.category,
          price: p.price,
          location: p.location,
          status: p.status,
          image: p.image_url,
          description: p.description,
          likes: p.likes_count || 0,
          isLiked: likedProductIds.has(p.id),
          createdAt: this.formatRelativeTime(p.created_at),
          rawCreatedAt: p.created_at,
          seller_id: p.seller_id,
          seller: p.seller ? {
            id: p.seller.id,
            name: p.seller.nickname,
            profileImage: (p.seller.avatar_url && !p.seller.avatar_url.includes('photo-1534528741775-53994a69daeb')) ? p.seller.avatar_url : 'assets/default-avatar.svg',
            location: p.seller.activity_area,
            temperature: p.seller.manner_temperature
          } : {
            name: '감자이웃',
            profileImage: 'assets/default-avatar.svg',
            location: p.location,
            temperature: 36.5
          },
          commentsCount: (p.comments && p.comments[0] && p.comments[0].count) ? p.comments[0].count : 0
        }));

        return {
          products: mapped,
          totalCount: count || 0,
          page,
          totalPages: Math.ceil((count || 0) / itemsPerPage) || 1
        };
      } catch (e) {
        console.error('[GamzaData] 상품 조회 실패:', e);
        return { products: [], totalCount: 0, page: 1, totalPages: 1 };
      }
    },

    /**
     * ID로 단일 상품 상세 조회 (판매자 및 댓글 포함)
     * @param {number|string} id 
     */
    async getProductById(id) {
      const supabase = getSupabase();
      const user = await this.getCurrentUser();
      const numId = Number(id);

      if (!supabase) return null;

      try {
        const { data: product, error } = await supabase
          .from('products')
          .select(`
            id,
            seller_id,
            title,
            category,
            price,
            location,
            status,
            image_url,
            description,
            likes_count,
            created_at,
            updated_at,
            seller:profiles(id, nickname, avatar_url, activity_area, manner_temperature)
          `)
          .eq('id', numId)
          .single();

        if (error || !product) {
          console.error('[GamzaData] getProductById 오류:', error);
          return null;
        }

        // 찜 여부 조회
        let isLiked = false;
        if (user && user.id) {
          const { data: likeRec } = await supabase
            .from('product_likes')
            .select('id')
            .eq('product_id', numId)
            .eq('user_id', user.id)
            .maybeSingle();
          isLiked = !!likeRec;
        }

        // 댓글 목록 조회
        const { data: commentsData } = await supabase
          .from('product_comments')
          .select(`
            id,
            content,
            created_at,
            author:profiles(id, nickname, avatar_url, activity_area)
          `)
          .eq('product_id', numId)
          .order('created_at', { ascending: true });

        const mappedComments = (commentsData || []).map(c => ({
          id: c.id,
          author: c.author ? c.author.nickname : '익명감자',
          avatar: c.author ? c.author.avatar_url : 'assets/default-avatar.svg',
          location: c.author ? c.author.activity_area : '감자동',
          text: c.content,
          createdAt: this.formatRelativeTime(c.created_at)
        }));

        return {
          id: product.id,
          seller_id: product.seller_id,
          title: product.title,
          category: product.category,
          price: product.price,
          location: product.location,
          status: product.status,
          image: product.image_url,
          description: product.description,
          likes: product.likes_count || 0,
          isLiked,
          createdAt: this.formatRelativeTime(product.created_at),
          rawCreatedAt: product.created_at,
          seller: product.seller ? {
            id: product.seller.id,
            name: product.seller.nickname,
            profileImage: (product.seller.avatar_url && !product.seller.avatar_url.includes('photo-1534528741775-53994a69daeb')) ? product.seller.avatar_url : 'assets/default-avatar.svg',
            location: product.seller.activity_area,
            temperature: product.seller.manner_temperature
          } : {
            name: '감자이웃',
            profileImage: 'assets/default-avatar.svg',
            location: product.location,
            temperature: 36.5
          },
          comments: mappedComments
        };
      } catch (e) {
        console.error('[GamzaData] getProductById 예외:', e);
        return null;
      }
    },

    /**
     * 신규 상품 등록 (Supabase DB INSERT)
     * @param {Object} productData 
     */
    async addProduct(productData) {
      const supabase = getSupabase();
      const user = await this.getCurrentUser();

      if (!supabase) throw new Error('Supabase client not available');

      const newProductRecord = {
        seller_id: user.id,
        title: productData.title || '제목 없음',
        category: productData.category || '기타',
        price: Number(productData.price) || 0,
        location: productData.location || user.activity_area || '강원도 춘천시 감자동',
        status: productData.status || '판매중',
        image_url: productData.image || 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80',
        description: productData.description || '',
        likes_count: 0
      };

      const { data, error } = await supabase
        .from('products')
        .insert([newProductRecord])
        .select()
        .single();

      if (error) {
        console.error('[GamzaData] addProduct 실패:', error);
        throw error;
      }

      this.notifyChange();
      return data;
    },

    /**
     * 상품 정보 수정 (Supabase DB UPDATE)
     * @param {number|string} productId 
     * @param {Object} updateData 
     */
    async updateProduct(productId, updateData) {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      const numId = Number(productId);
      const payload = {
        updated_at: new Date().toISOString()
      };

      if (updateData.title !== undefined) payload.title = updateData.title.trim();
      if (updateData.category !== undefined) payload.category = updateData.category;
      if (updateData.price !== undefined) payload.price = Number(updateData.price) || 0;
      if (updateData.location !== undefined) payload.location = updateData.location.trim();
      if (updateData.status !== undefined) payload.status = updateData.status;
      if (updateData.image !== undefined) payload.image_url = updateData.image;
      if (updateData.description !== undefined) payload.description = updateData.description.trim();

      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', numId)
        .select()
        .single();

      if (error) {
        console.error('[GamzaData] updateProduct 실패:', error);
        throw error;
      }

      this.notifyChange();
      return data;
    },

    /**
     * 상품 판매 상태만 빠르게 변경 (판매중 / 예약중 / 거래완료)
     * @param {number|string} productId 
     * @param {string} newStatus 
     */
    async updateProductStatus(productId, newStatus) {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      const numId = Number(productId);
      const { data, error } = await supabase
        .from('products')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', numId)
        .select()
        .single();

      if (error) {
        console.error('[GamzaData] updateProductStatus 실패:', error);
        throw error;
      }

      this.notifyChange();
      return data;
    },

    /**
     * 상품 삭제 (Supabase DB DELETE)
     * @param {number|string} productId 
     */
    async deleteProduct(productId) {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      const numId = Number(productId);
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', numId);

      if (error) {
        console.error('[GamzaData] deleteProduct 실패:', error);
        throw error;
      }

      this.notifyChange();
      return true;
    },

    /**
     * 찜(관심) 토글
     * @param {number|string} productId 
     */
    async toggleLike(productId) {
      const supabase = getSupabase();
      const user = await this.getCurrentUser();
      const numId = Number(productId);

      if (!supabase || !user || !user.id) return { isLiked: false, likes: 0 };

      try {
        // 이미 찜했는지 확인
        const { data: existing } = await supabase
          .from('product_likes')
          .select('id')
          .eq('product_id', numId)
          .eq('user_id', user.id)
          .maybeSingle();

        let isLiked = false;
        if (existing) {
          // 찜 해제
          await supabase
            .from('product_likes')
            .delete()
            .eq('id', existing.id);
          isLiked = false;
        } else {
          // 찜 등록
          await supabase
            .from('product_likes')
            .insert([{ product_id: numId, user_id: user.id }]);
          isLiked = true;
        }

        // 최신 상품 likes_count 조회
        const { data: prod } = await supabase
          .from('products')
          .select('likes_count')
          .eq('id', numId)
          .single();

        const likes = prod ? prod.likes_count : 0;
        this.notifyChange();
        return { isLiked, likes };
      } catch (e) {
        console.error('[GamzaData] toggleLike 오류:', e);
        return { isLiked: false, likes: 0 };
      }
    },

    /**
     * 댓글 추가
     * @param {number|string} productId 
     * @param {string} content 
     */
    async addComment(productId, content) {
      const supabase = getSupabase();
      const user = await this.getCurrentUser();
      const numId = Number(productId);

      if (!supabase || !user || !user.id) throw new Error('Supabase or User not available');

      const text = typeof content === 'object' ? (content.text || content.content || '') : content;

      const { data, error } = await supabase
        .from('product_comments')
        .insert([{
          product_id: numId,
          author_id: user.id,
          content: text.trim()
        }])
        .select(`
          id,
          content,
          created_at,
          author:profiles(id, nickname, avatar_url, activity_area)
        `)
        .single();

      if (error) {
        console.error('[GamzaData] addComment 오류:', error);
        throw error;
      }

      this.notifyChange();

      return {
        id: data.id,
        author: data.author ? data.author.nickname : user.nickname,
        avatar: data.author ? data.author.avatar_url : user.avatar_url,
        location: data.author ? data.author.activity_area : user.activity_area,
        text: data.content,
        createdAt: '방금 전'
      };
    },

    /**
     * 상태 변경 ('판매중' | '예약중' | '거래완료')
     */
    async updateStatus(productId, newStatus) {
      const supabase = getSupabase();
      const numId = Number(productId);
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('products')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', numId)
        .select()
        .single();

      if (error) {
        console.error('[GamzaData] updateStatus 오류:', error);
        return null;
      }
      this.notifyChange();
      return data;
    },

    /**
     * 변경 알림 커스텀 이벤트
     */
    notifyChange() {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gamza-data-updated'));
      }
    }
  };

  global.GamzaData = GamzaData;
})(typeof window !== 'undefined' ? window : globalThis);
