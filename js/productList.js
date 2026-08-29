/**
 * Gamza Market - Product List Component (ProductList)
 * 감자마켓 상품 목록 렌더링, 필터링, 페이지네이션 및 이벤트 핸들링 모듈 (Supabase 비동기 연동)
 */

(function (global) {
  'use strict';

  const ProductList = {
    // 상태 관리
    state: {
      category: '전체',
      onlyAvailable: false,
      searchKeyword: '',
      sortBy: 'latest', // 'latest' | 'price-low' | 'price-high' | 'likes'
      currentPage: 1,
      itemsPerPage: 9,
      isLoading: false
    },

    // DOM 셀렉터 및 엘리먼트 참조
    elements: {
      container: null,
      pagination: null,
      categoryButtons: null,
      toggleOnlyAvailable: null,
      resultCount: null,
      emptyState: null
    },

    /**
     * 상품 목록 모듈 초기화
     * @param {Object} options 사용자 지정 셀렉터 또는 옵션
     */
    init: function (options = {}) {
      this.selectors = {
        container: options.container || '#product-grid',
        pagination: options.pagination || '#pagination',
        categoryContainer: options.categoryContainer || '#category-filters',
        categoryBtn: options.categoryBtn || '.category-btn',
        toggleAvailable: options.toggleAvailable || '#toggle-available-only',
        resultCount: options.resultCount || '#product-count',
        emptyState: options.emptyState || '#empty-state',
        sortSelect: options.sortSelect || '#sort-select'
      };

      this.cacheElements();
      this.bindEvents();
      this.render();

      // GamzaData 데이터 갱신 시 자동 리렌더링
      if (typeof window !== 'undefined') {
        window.addEventListener('gamza-data-updated', () => {
          this.render();
        });
      }
    },

    /**
     * DOM 엘리먼트 캐싱
     */
    cacheElements: function () {
      this.elements.container = document.querySelector(this.selectors.container);
      this.elements.pagination = document.querySelector(this.selectors.pagination);
      this.elements.categoryButtons = document.querySelectorAll(this.selectors.categoryBtn);
      this.elements.toggleOnlyAvailable = document.querySelector(this.selectors.toggleAvailable);
      this.elements.resultCount = document.querySelector(this.selectors.resultCount);
      this.elements.emptyState = document.querySelector(this.selectors.emptyState);
      this.elements.sortSelect = document.querySelector(this.selectors.sortSelect);
    },

    /**
     * 이벤트 리스너 바인딩
     */
    bindEvents: function () {
      // 1. 카테고리 필터 버튼 클릭
      const categoryContainer = document.querySelector(this.selectors.categoryContainer);
      if (categoryContainer) {
        categoryContainer.addEventListener('click', (e) => {
          const btn = e.target.closest(this.selectors.categoryBtn);
          if (!btn) return;

          const category = btn.dataset.category || btn.textContent.trim();
          this.setCategory(category);
        });
      } else {
        document.querySelectorAll(this.selectors.categoryBtn).forEach((btn) => {
          btn.addEventListener('click', () => {
            const category = btn.dataset.category || btn.textContent.trim();
            this.setCategory(category);
          });
        });
      }

      // 2. '거래 가능 상품만 보기' 토글 스위치
      if (this.elements.toggleOnlyAvailable) {
        this.elements.toggleOnlyAvailable.addEventListener('change', (e) => {
          this.setOnlyAvailable(e.target.checked);
        });
      }

      // 3. 정렬 옵션 변경
      if (this.elements.sortSelect) {
        this.elements.sortSelect.addEventListener('change', (e) => {
          this.setSortBy(e.target.value);
        });
      }

      // 4. 상품 카드 클릭 (이벤트 위임) -> 상세 모달 열기 커스텀 이벤트 발행
      if (this.elements.container) {
        this.elements.container.addEventListener('click', async (e) => {
          // 찜 버튼 클릭 시 카드 열림 방지 및 찜 토글 실행
          const likeBtn = e.target.closest('.card-like-btn');
          if (likeBtn) {
            e.stopPropagation();
            const card = likeBtn.closest('.product-card');
            if (card) {
              const productId = card.dataset.id;
              await this.handleLikeClick(productId, likeBtn);
            }
            return;
          }

          // 상품 카드 클릭 시 모달 오픈 커스텀 이벤트
          const card = e.target.closest('.product-card');
          if (card) {
            const productId = Number(card.dataset.id) || card.dataset.id;
            this.dispatchDetailEvent(productId);
          }
        });
      }

      // 5. 페이지네이션 클릭 (이벤트 위임)
      if (this.elements.pagination) {
        this.elements.pagination.addEventListener('click', (e) => {
          const pageBtn = e.target.closest('.page-btn');
          if (!pageBtn || pageBtn.disabled || pageBtn.classList.contains('active')) return;

          const targetPage = Number(pageBtn.dataset.page);
          if (targetPage && targetPage > 0) {
            this.setPage(targetPage);
            // 스크롤 상단 이동
            if (this.elements.container) {
              this.elements.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        });
      }
    },

    /**
     * 커스텀 이벤트: 상품 상세 모달 요청
     * @param {number|string} productId 
     */
    dispatchDetailEvent: function (productId) {
      const event = new CustomEvent('open-product-detail', {
        bubbles: true,
        composed: true,
        detail: { productId: Number(productId) || productId }
      });
      document.dispatchEvent(event);
    },

    /**
     * 카드 내부 찜(좋아요) 토글 핸들러
     * @param {number|string} productId 
     * @param {HTMLElement} likeBtn 
     */
    handleLikeClick: async function (productId, likeBtn) {
      if (!global.GamzaData) return;

      likeBtn.style.pointerEvents = 'none';
      try {
        const result = await global.GamzaData.toggleLike(productId);
        if (result) {
          likeBtn.classList.toggle('liked', result.isLiked);
          const countSpan = likeBtn.querySelector('.like-count');
          if (countSpan) {
            countSpan.textContent = result.likes;
          }
          const heartIcon = likeBtn.querySelector('.heart-icon');
          if (heartIcon) {
            heartIcon.textContent = result.isLiked ? '❤️' : '🤍';
          }
        }
      } catch (err) {
        console.error('찜 처리 실패:', err);
      } finally {
        likeBtn.style.pointerEvents = '';
      }
    },

    /**
     * 카테고리 변경
     * @param {string} category 
     */
    setCategory: function (category) {
      this.state.category = category;
      this.state.currentPage = 1;
      this.updateCategoryUI();
      this.render();
    },

    /**
     * 카테고리 버튼 Active UI 상태 업데이트
     */
    updateCategoryUI: function () {
      const buttons = document.querySelectorAll(this.selectors.categoryBtn);
      buttons.forEach((btn) => {
        const cat = btn.dataset.category || btn.textContent.trim();
        if (cat === this.state.category) {
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        }
      });
    },

    /**
     * 거래 가능 상품만 보기 토글
     * @param {boolean} onlyAvailable 
     */
    setOnlyAvailable: function (onlyAvailable) {
      this.state.onlyAvailable = Boolean(onlyAvailable);
      this.state.currentPage = 1;
      if (this.elements.toggleOnlyAvailable) {
        this.elements.toggleOnlyAvailable.checked = this.state.onlyAvailable;
      }
      this.render();
    },

    /**
     * 검색어 설정
     * @param {string} keyword 
     */
    setSearchKeyword: function (keyword) {
      this.state.searchKeyword = keyword || '';
      this.state.currentPage = 1;
      this.render();
    },

    /**
     * 정렬 기준 설정
     */
    setSortBy: function (sortBy) {
      this.state.sortBy = sortBy || 'latest';
      this.state.currentPage = 1;
      this.render();
    },

    /**
     * 현재 페이지 변경
     */
    setPage: function (page) {
      this.state.currentPage = page;
      this.render();
    },

    /**
     * 단일 상품 카드 HTML 템플릿 생성
     * @param {Object} product 
     * @returns {string} HTML 문자열
     */
    createCardHTML: function (product) {
      const formattedPrice = (Number(product.price) === 0) 
        ? '무료나눔 🎁' 
        : Number(product.price).toLocaleString('ko-KR') + '원';
      const commentsCount = Number(product.commentsCount) || 0;
      const isLiked = Boolean(product.isLiked);
      const likesCount = Number(product.likes) || 0;

      // 상태별 뱃지 클래스
      let statusBadgeHTML = '';
      if (product.status === '예약중') {
        statusBadgeHTML = `<span class="product-status-badge badge-reserved">예약중</span>`;
      } else if (product.status === '거래완료') {
        statusBadgeHTML = `<span class="product-status-badge badge-completed">거래완료</span>`;
      } else {
        statusBadgeHTML = `<span class="product-status-badge badge-available">판매중</span>`;
      }

      const imageSrc = product.image || 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80';

      return `
        <article class="product-card ${product.status === '거래완료' ? 'is-completed' : ''}" data-id="${product.id}" tabindex="0" role="button" aria-label="${this.escapeHTML(product.title)}">
          <div class="product-image-wrap">
            <img 
              src="${imageSrc}" 
              alt="${this.escapeHTML(product.title)}" 
              class="product-image"
              loading="lazy"
              onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80';"
            />
            <div class="product-category-tag">${this.escapeHTML(product.category || '기타')}</div>
            <button type="button" class="card-like-btn ${isLiked ? 'liked' : ''}" aria-label="관심 상품 등록" title="관심">
              <span class="heart-icon">${isLiked ? '❤️' : '🤍'}</span>
              <span class="like-count">${likesCount}</span>
            </button>
          </div>
          <div class="product-info">
            <div class="product-header">
              <h3 class="product-title" title="${this.escapeHTML(product.title)}">${this.escapeHTML(product.title)}</h3>
            </div>
            <div class="product-meta">
              <span class="product-seller" title="작성자: ${this.escapeHTML(product.seller && product.seller.name ? product.seller.name : '감자이웃')}">🥔 ${this.escapeHTML(product.seller && product.seller.name ? product.seller.name : '감자이웃')}</span>
              <span class="meta-dot">·</span>
              <span class="product-location">${this.escapeHTML(product.location || '감자동')}</span>
              <span class="meta-dot">·</span>
              <span class="product-time">${this.escapeHTML(product.createdAt || '방금 전')}</span>
            </div>
            <div class="product-bottom">
              <div class="product-price-box">
                ${statusBadgeHTML}
                <strong class="product-price">${formattedPrice}</strong>
              </div>
              <div class="product-counts">
                ${commentsCount > 0 ? `
                  <span class="count-item" title="댓글 ${commentsCount}개">
                    <span class="count-icon">💬</span>
                    <span class="count-num">${commentsCount}</span>
                  </span>
                ` : ''}
              </div>
            </div>
          </div>
        </article>
      `;
    },

    /**
     * 페이지네이션 렌더링 HTML 생성
     */
    createPaginationHTML: function (totalPages, currentPage) {
      if (totalPages <= 1) return '';

      let html = '<div class="pagination-container" role="navigation" aria-label="페이지 내비게이션">';

      // 이전 페이지 버튼
      const prevDisabled = currentPage === 1 ? 'disabled' : '';
      html += `
        <button type="button" class="page-btn page-nav page-prev" data-page="${currentPage - 1}" ${prevDisabled} aria-label="이전 페이지">
          ‹ 이전
        </button>
      `;

      // 페이지 번호 버튼 목록
      const maxButtons = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);

      if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }

      if (startPage > 1) {
        html += `<button type="button" class="page-btn" data-page="1">1</button>`;
        if (startPage > 2) {
          html += `<span class="page-ellipsis">…</span>`;
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage ? 'active' : '';
        const ariaCurrent = i === currentPage ? 'aria-current="page"' : '';
        html += `
          <button type="button" class="page-btn ${isActive}" data-page="${i}" ${ariaCurrent}>
            ${i}
          </button>
        `;
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          html += `<span class="page-ellipsis">…</span>`;
        }
        html += `<button type="button" class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
      }

      // 다음 페이지 버튼
      const nextDisabled = currentPage === totalPages ? 'disabled' : '';
      html += `
        <button type="button" class="page-btn page-nav page-next" data-page="${currentPage + 1}" ${nextDisabled} aria-label="다음 페이지">
          다음 ›
        </button>
      `;

      html += '</div>';
      return html;
    },

    /**
     * 메인 비동기 렌더 함수
     */
    render: async function () {
      this.cacheElements();

      if (!global.GamzaData) return;

      // 로딩 스켈레톤 표시
      if (this.elements.container && !this.state.isLoading) {
        this.elements.container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px 0; color: #8F8174;">
            <div style="font-size: 32px; animation: bounce 1s infinite;">🥔</div>
            <p style="margin-top: 8px; font-weight: 600;">포슬포슬 감자 상품을 불러오는 중...</p>
          </div>
        `;
      }

      this.state.isLoading = true;

      try {
        const result = await global.GamzaData.fetchProducts({
          category: this.state.category,
          onlyAvailable: this.state.onlyAvailable,
          searchKeyword: this.state.searchKeyword,
          sortBy: this.state.sortBy,
          page: this.state.currentPage,
          itemsPerPage: this.state.itemsPerPage
        });

        const { products, totalCount, totalPages } = result;

        // 현재 페이지 유효 범위 보정
        if (this.state.currentPage > totalPages && totalPages > 0) {
          this.state.currentPage = totalPages;
        }

        // 결과 개수 표시 업데이트
        if (this.elements.resultCount) {
          this.elements.resultCount.textContent = `총 ${totalCount}개의 감자 상품`;
        }

        // 상품 그리드 렌더링
        if (this.elements.container) {
          if (!products || products.length === 0) {
            this.elements.container.innerHTML = `
              <div class="empty-product-list" style="grid-column: 1 / -1; text-align: center; padding: 48px 0;">
                <div class="empty-icon" style="font-size: 40px; margin-bottom: 8px;">🥔💨</div>
                <p class="empty-text" style="color: #665; font-size: 15px; margin-bottom: 12px;">조건에 맞는 감자 상품이 없습니다.</p>
                <button type="button" class="empty-reset-btn" onclick="ProductList.resetFilters()" style="padding: 8px 16px; border-radius: 8px; background: #FFD233; border: none; font-weight: bold; cursor: pointer;">필터 초기화</button>
              </div>
            `;
          } else {
            this.elements.container.innerHTML = products.map(p => this.createCardHTML(p)).join('');
          }
        }

        // 페이지네이션 렌더링
        if (this.elements.pagination) {
          this.elements.pagination.innerHTML = this.createPaginationHTML(totalPages, this.state.currentPage);
        }
      } catch (err) {
        console.error('[ProductList] render 오류:', err);
      } finally {
        this.state.isLoading = false;
      }
    },

    /**
     * 필터 초기화
     */
    resetFilters: function () {
      this.state.category = '전체';
      this.state.onlyAvailable = false;
      this.state.searchKeyword = '';
      this.state.currentPage = 1;

      this.updateCategoryUI();
      if (this.elements.toggleOnlyAvailable) {
        this.elements.toggleOnlyAvailable.checked = false;
      }
      const searchInput = document.querySelector('#search-input');
      if (searchInput) searchInput.value = '';

      this.render();
    },

    /**
     * HTML XSS 방지 유틸
     */
    escapeHTML: function (str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  // 모듈 export 및 브라우저 전역 노출
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProductList };
  }
  global.ProductList = ProductList;

  // DOMContentLoaded 시 기본 자동 초기화 시도
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => ProductList.init());
    } else {
      ProductList.init();
    }
  }

})(typeof window !== 'undefined' ? window : globalThis);
