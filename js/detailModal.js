/**
 * 감자마켓 (Gamza Market) - 상품 상세 모달 & 인터랙션 모듈 (detailModal.js)
 * 상단 대표 이미지 고정(상단 절반) + 하단 부드러운 스크롤 + 감자 테마 작성자 관리 패널
 */

(function (global) {
  'use strict';

  // ==========================================
  // 1. 유틸리티 함수 (가격, 날짜, 포맷팅)
  // ==========================================

  function formatPrice(price) {
    if (price === 0 || price === '0' || price === '나눔') {
      return '무료나눔 🎁';
    }
    const num = Number(price) || 0;
    return `₩${num.toLocaleString('ko-KR')}`;
  }

  function formatRelativeTime(dateInput) {
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
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getStatusInfo(status) {
    switch (status) {
      case 'RESERVED':
      case '예약중':
        return { text: '예약중', className: 'badge-reserved' };
      case 'COMPLETED':
      case 'SOLD_OUT':
      case '거래완료':
        return { text: '거래완료', className: 'badge-sold' };
      case 'SELLING':
      case '판매중':
      default:
        return { text: '판매중', className: 'badge-selling' };
    }
  }

  function getMannerTempColor(temp) {
    const t = parseFloat(temp) || 36.5;
    if (t < 36.0) return '#6b7280';
    if (t < 37.5) return '#f59e0b';
    if (t < 40.0) return '#f97316';
    return '#ef4444';
  }

  // ==========================================
  // 2. 모달 스타일 주입 (인라인 CSS)
  // ==========================================

  function injectStyles() {
    const existing = document.getElementById('gamza-detail-modal-styles');
    if (existing) {
      existing.remove(); // 기존 스타일 교체
    }

    const style = document.createElement('style');
    style.id = 'gamza-detail-modal-styles';
    style.textContent = `
      .gamza-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(18, 14, 10, 0.65);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.28s;
        padding: 16px;
        box-sizing: border-box;
      }

      .gamza-modal-overlay.is-active {
        opacity: 1;
        visibility: visible;
      }

      /* 모달 컨테이너 (상단 대표 이미지 고정 + 하단 본문 스크롤) */
      .gamza-modal-container {
        position: relative;
        background: #ffffff;
        width: 100%;
        max-width: 620px;
        height: 86vh;
        max-height: 840px;
        min-height: 520px;
        border-radius: 24px;
        box-shadow: 0 20px 45px rgba(50, 30, 10, 0.25), 0 0 0 1px rgba(220, 190, 160, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: scale(0.94) translateY(12px);
        transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .gamza-modal-overlay.is-active .gamza-modal-container {
        transform: scale(1) translateY(0);
      }

      .gamza-modal-close-btn {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 800;
        color: #4b382a;
        cursor: pointer;
        z-index: 30;
        transition: all 0.2s ease;
      }

      .gamza-modal-close-btn:hover {
        background: #ffffff;
        transform: scale(1.08);
        color: #e05e26;
      }

      /* 1. 상단 절반 대표 이미지 영역 (항상 고정 노출) */
      .gamza-detail-img-box {
        position: relative;
        width: 100%;
        height: 42%;
        min-height: 250px;
        max-height: 360px;
        flex-shrink: 0;
        background: #f7efe4;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .gamza-detail-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      /* 2. 하단 스크롤 가능 본문 영역 */
      .gamza-detail-scroll-pane {
        flex: 1;
        overflow-y: auto;
        padding: 22px 24px 24px;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        scroll-behavior: smooth;
      }

      /* 🥔 작성자 전용 관리 패널 (감자마켓 시그니처 톤앤매너) */
      .gamza-author-panel {
        background: linear-gradient(135deg, #FFFDF8 0%, #FAF4E8 100%);
        border: 1.5px solid #ECDDC5;
        border-radius: 18px;
        padding: 14px 16px;
        margin-bottom: 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(80, 50, 20, 0.04);
      }

      .author-panel-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .author-badge-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .author-panel-title {
        font-size: 13px;
        font-weight: 800;
        color: #5C4331;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .author-sub-tag {
        font-size: 10px;
        font-weight: 800;
        background: #FFE58F;
        color: #7A4E00;
        padding: 2px 6px;
        border-radius: 6px;
      }

      .author-panel-actions {
        display: flex;
        gap: 6px;
      }

      .btn-author-action {
        padding: 5px 12px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .btn-author-edit {
        background: #ffffff;
        color: #5C4331;
        border: 1px solid #E2D3BE;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }

      .btn-author-edit:hover {
        background: #FFF3D6;
        border-color: #FFB800;
        color: #332419;
      }

      .btn-author-delete {
        background: #FFF5F5;
        color: #E03131;
        border: 1px solid #FFC9C9;
      }

      .btn-author-delete:hover {
        background: #FFE3E3;
        border-color: #FA5252;
      }

      /* 세그먼트 형태의 판매 상태 선택 버튼 바 */
      .author-status-segment-wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #EFE8DA;
        padding: 3px;
        border-radius: 14px;
        gap: 2px;
      }

      .author-status-segment-btn {
        flex: 1;
        border: none;
        background: transparent;
        padding: 7px 0;
        font-size: 12px;
        font-weight: 700;
        color: #7D6E61;
        border-radius: 11px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      .author-status-segment-btn:hover:not(.active) {
        color: #3D2B1F;
        background: rgba(255, 255, 255, 0.4);
      }

      .author-status-segment-btn.active[data-status="판매중"] {
        background: #ffffff;
        color: #2B8A3E;
        font-weight: 900;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      }

      .author-status-segment-btn.active[data-status="예약중"] {
        background: #ffffff;
        color: #D9480F;
        font-weight: 900;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      }

      .author-status-segment-btn.active[data-status="거래완료"] {
        background: #ffffff;
        color: #495057;
        font-weight: 900;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      }

      /* 뱃지 및 카테고리 태그 */
      .gamza-badge-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .gamza-badge {
        font-size: 12px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 8px;
        letter-spacing: -0.2px;
      }

      .badge-selling {
        background: #e6f4ea;
        color: #137333;
        border: 1px solid #ceead6;
      }

      .badge-reserved {
        background: #fef7e0;
        color: #b06000;
        border: 1px solid #feefc3;
      }

      .badge-sold {
        background: #f1f3f4;
        color: #5f6368;
        border: 1px solid #dadce0;
      }

      .gamza-category-tag {
        font-size: 13px;
        color: #7A4E00;
        background: #FFF8D6;
        border: 1px solid #FFE680;
        padding: 4px 10px;
        border-radius: 8px;
        font-weight: 700;
      }

      .gamza-detail-title {
        font-size: 22px;
        font-weight: 900;
        color: #2C241E;
        line-height: 1.35;
        margin: 0 0 8px 0;
        word-break: break-word;
      }

      .gamza-detail-meta {
        font-size: 13px;
        color: #8F8174;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
      }

      .gamza-detail-price {
        font-size: 26px;
        font-weight: 900;
        color: #9C5400;
        margin-bottom: 18px;
        letter-spacing: -0.5px;
      }

      .gamza-detail-desc {
        font-size: 15px;
        line-height: 1.65;
        color: #44352b;
        background: #FFFDF8;
        padding: 16px 18px;
        border-radius: 16px;
        border: 1px solid #F3EBDD;
        margin-bottom: 20px;
        white-space: pre-line;
      }

      /* 판매자 정보 카드 */
      .gamza-seller-card {
        background: #FBF8F2;
        border: 1px solid #EFE6D8;
        border-radius: 16px;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 22px;
        gap: 12px;
      }

      .gamza-seller-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .gamza-seller-avatar {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: #E8DCCB;
        border: 2px solid #FFD233;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }

      .gamza-seller-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .gamza-seller-name {
        font-size: 15px;
        font-weight: 800;
        color: #2C241E;
        margin-bottom: 3px;
      }

      .gamza-seller-loc {
        font-size: 12px;
        color: #8F8174;
      }

      .gamza-manner-box {
        text-align: right;
        min-width: 110px;
      }

      .gamza-manner-temp {
        font-size: 16px;
        font-weight: 900;
        display: block;
        margin-bottom: 2px;
      }

      .gamza-manner-label {
        font-size: 11px;
        color: #8F8174;
        display: block;
        margin-bottom: 4px;
      }

      .gamza-manner-track {
        width: 100%;
        height: 6px;
        background: #E2D7C7;
        border-radius: 99px;
        overflow: hidden;
      }

      .gamza-manner-fill {
        height: 100%;
        border-radius: 99px;
        transition: width 0.3s ease;
      }

      /* 하단 액션 바 */
      .gamza-action-bar {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
      }

      .gamza-like-btn {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 18px;
        border-radius: 14px;
        background: #FFFDF8;
        border: 1.5px solid #dfcfbc;
        color: #5c4331;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .gamza-like-btn:hover {
        background: #FFF5D6;
        border-color: #ffd233;
        transform: translateY(-1px);
      }

      .gamza-like-btn.is-liked {
        background: #FFF0F0;
        border-color: #FFA39E;
        color: #cf1322;
      }

      /* 댓글 영역 */
      .gamza-comments-section {
        border-top: 1.5px dashed #EFE4D0;
        padding-top: 20px;
      }

      .gamza-comments-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 16px;
        font-weight: 800;
        color: #332419;
        margin-bottom: 14px;
      }

      .gamza-comments-count {
        background: #FFD233;
        color: #332419;
        font-size: 12px;
        font-weight: 900;
        padding: 2px 7px;
        border-radius: 99px;
      }

      .gamza-comments-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 16px;
        max-height: 240px;
        overflow-y: auto;
      }

      .gamza-comments-empty {
        text-align: center;
        padding: 24px;
        color: #8F8174;
        font-size: 13px;
        background: #FDFBF7;
        border-radius: 12px;
        border: 1px dashed #E5D8C5;
      }

      .gamza-comment-item {
        display: flex;
        gap: 10px;
        background: #FAF6F0;
        padding: 10px 12px;
        border-radius: 12px;
      }

      .gamza-comment-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #E8DCCB;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }

      .gamza-comment-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .gamza-comment-body {
        flex: 1;
      }

      .gamza-comment-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 3px;
      }

      .gamza-comment-author {
        font-size: 13px;
        font-weight: 800;
        color: #332419;
      }

      .gamza-comment-time {
        font-size: 11px;
        color: #8F8174;
      }

      .gamza-comment-text {
        font-size: 13px;
        line-height: 1.45;
        color: #44352b;
        word-break: break-word;
      }

      .gamza-comment-form {
        display: flex;
        gap: 8px;
      }

      .gamza-comment-input {
        flex: 1;
        padding: 10px 14px;
        border-radius: 12px;
        border: 1.5px solid #dfcfbc;
        background: #ffffff;
        font-size: 14px;
        color: #332419;
        outline: none;
      }

      .gamza-comment-input:focus {
        border-color: #FFB800;
        box-shadow: 0 0 0 3px rgba(255, 184, 0, 0.18);
      }

      .gamza-comment-submit-btn {
        padding: 10px 18px;
        background: #5c4331;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .gamza-comment-submit-btn:hover {
        background: #443022;
      }
    `;
    document.head.appendChild(style);
  }

  // ==========================================
  // 3. 모달 DOM 싱글톤 생성 및 관리
  // ==========================================

  let currentProductId = null;
  let modalOverlayEl = null;

  function ensureModalDOM() {
    injectStyles();

    let overlay = document.getElementById('gamza-detail-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'gamza-detail-modal';
      overlay.className = 'gamza-modal-overlay';
      overlay.innerHTML = `
        <div class="gamza-modal-container" role="dialog" aria-modal="true">
          <button type="button" class="gamza-modal-close-btn" aria-label="닫기">✕</button>
          
          <!-- 상단 대표 이미지 영역 (고정) -->
          <div class="gamza-detail-img-box" id="gamza-modal-img-box"></div>
          
          <!-- 하단 스크롤 가능 콘텐츠 영역 -->
          <div class="gamza-detail-scroll-pane" id="gamza-modal-body"></div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          DetailModal.close();
        }
      });

      const closeBtn = overlay.querySelector('.gamza-modal-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => DetailModal.close());
      }
    }

    modalOverlayEl = overlay;
    return overlay;
  }

  // ==========================================
  // 4. 모달 내용 렌더링
  // ==========================================

  function renderModalContent(product, currentUser) {
    const imgBoxEl = document.getElementById('gamza-modal-img-box');
    const bodyEl = document.getElementById('gamza-modal-body');
    if (!imgBoxEl || !bodyEl) return;

    const status = getStatusInfo(product.status);
    const category = product.category || '기타';
    const title = escapeHtml(product.title || '제목 없음');
    const location = escapeHtml(product.location || '강원도 춘천시 감자동');
    const timeFormatted = escapeHtml(product.createdAt || '방금 전');
    const priceFormatted = formatPrice(product.price);
    const description = escapeHtml(String(product.description || '상세 설명이 없습니다.').slice(0, 500));

    // 작성자 본인 여부 확인
    const user = currentUser || (global.GamzaApp && global.GamzaApp.currentUser) || null;
    const isAuthor = Boolean(
      user && user.id && (
        user.id === product.seller_id || 
        (product.seller && user.id === product.seller.id)
      )
    );

    // 1. 상단 대표 이미지 렌더링
    const imageSrc = product.image || 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80';
    imgBoxEl.innerHTML = `
      <img 
        src="${escapeHtml(imageSrc)}" 
        alt="${title}" 
        class="gamza-detail-img" 
        onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80';"
      />
    `;

    // 2. 판매자 정보
    const seller = product.seller || {};
    const sellerName = escapeHtml(seller.name || '감자이웃');
    let sellerAvatar = seller.profileImage || 'assets/default-avatar.svg';
    if (sellerAvatar.includes('photo-1534528741775-53994a69daeb')) {
      sellerAvatar = 'assets/default-avatar.svg';
    }
    const sellerLoc = escapeHtml(seller.location || location);
    const mannerTemp = parseFloat(seller.temperature || 36.5).toFixed(1);
    const mannerColor = getMannerTempColor(mannerTemp);
    const mannerPercent = Math.min(Math.max((mannerTemp / 100) * 100, 10), 100);

    const isLiked = Boolean(product.isLiked);
    const likesCount = parseInt(product.likes || 0, 10);

    // 댓글 목록
    const comments = Array.isArray(product.comments) ? product.comments : [];
    const commentsCount = comments.length;

    let commentsHtml = '';
    if (comments.length === 0) {
      commentsHtml = '<div class="gamza-comments-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요! ✨</div>';
    } else {
      commentsHtml = comments.map(c => {
        const cAuthor = escapeHtml(c.author || '감자이웃');
        let cAvatarUrl = c.avatar || 'assets/default-avatar.svg';
        if (cAvatarUrl.includes('photo-1535713875002-d1d0cf377fde') || cAvatarUrl.includes('photo-1534528741775-53994a69daeb')) {
          cAvatarUrl = 'assets/default-avatar.svg';
        }
        const cAvatar = (cAvatarUrl.startsWith('http') || cAvatarUrl.startsWith('/') || cAvatarUrl.startsWith('assets') || cAvatarUrl.startsWith('data:')) 
          ? `<img src="${cAvatarUrl}" alt="${cAuthor}" onerror="this.src='assets/default-avatar.svg'">` 
          : cAvatarUrl;
        const cTime = escapeHtml(c.createdAt || '방금 전');
        const cContent = escapeHtml(c.text || c.content || '');
        return `
          <div class="gamza-comment-item">
            <div class="gamza-comment-avatar">${cAvatar}</div>
            <div class="gamza-comment-body">
              <div class="gamza-comment-top">
                <span class="gamza-comment-author">${cAuthor}</span>
                <span class="gamza-comment-time">${cTime}</span>
              </div>
              <div class="gamza-comment-text">${cContent}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    const sellerAvatarEl = `<img src="${sellerAvatar}" alt="${sellerName}" onerror="this.src='assets/default-avatar.svg'"/>`;

    // 작성자 전용 관리 패널 HTML (감자마켓 맞춤 디자인)
    const authorPanelHtml = isAuthor ? `
      <div class="gamza-author-panel">
        <div class="author-panel-top">
          <div class="author-badge-group">
            <span class="author-panel-title">🥔 내가 쓴 글</span>
            <span class="author-sub-tag">작성자 관리</span>
          </div>
          <div class="author-panel-actions">
            <button type="button" class="btn-author-action btn-author-edit" id="btn-author-edit" title="게시글 수정">
              ✏️ 수정
            </button>
            <button type="button" class="btn-author-action btn-author-delete" id="btn-author-delete" title="게시글 삭제">
              🗑️ 삭제
            </button>
          </div>
        </div>
        
        <div class="author-status-segment-wrap" role="group" aria-label="판매 상태 변경">
          <button type="button" class="author-status-segment-btn ${product.status === '판매중' ? 'active' : ''}" data-status="판매중">
            🌱 판매중
          </button>
          <button type="button" class="author-status-segment-btn ${product.status === '예약중' ? 'active' : ''}" data-status="예약중">
            ⏳ 예약중
          </button>
          <button type="button" class="author-status-segment-btn ${product.status === '거래완료' ? 'active' : ''}" data-status="거래완료">
            ✅ 거래완료
          </button>
        </div>
      </div>
    ` : '';

    bodyEl.innerHTML = `
      ${authorPanelHtml}

      <div class="gamza-badge-row">
        <span class="gamza-badge ${status.className}" id="modal-status-badge">${status.text}</span>
        <span class="gamza-category-tag">#${escapeHtml(category)}</span>
      </div>

      <h2 class="gamza-detail-title">${title}</h2>

      <div class="gamza-detail-meta">
        <span>📍 ${location}</span>
        <span>•</span>
        <span>${timeFormatted}</span>
      </div>

      <div class="gamza-detail-price">${priceFormatted}</div>

      <div class="gamza-detail-desc">${description}</div>

      <!-- 판매자 정보 카드 -->
      <div class="gamza-seller-card">
        <div class="gamza-seller-left">
          <div class="gamza-seller-avatar">
            ${sellerAvatarEl}
          </div>
          <div>
            <div class="gamza-seller-name">${sellerName}</div>
            <div class="gamza-seller-loc">${sellerLoc}</div>
          </div>
        </div>
        <div class="gamza-manner-box">
          <span class="gamza-manner-temp" style="color: ${mannerColor}">
            🌡️ ${mannerTemp}℃
          </span>
          <span class="gamza-manner-label">매너온도</span>
          <div class="gamza-manner-track">
            <div class="gamza-manner-fill" style="width: ${mannerPercent}%; background: ${mannerColor};"></div>
          </div>
        </div>
      </div>

      <!-- 하단 액션 바 -->
      <div class="gamza-action-bar">
        <button type="button" id="gamza-btn-like" class="gamza-like-btn ${isLiked ? 'is-liked' : ''}">
          <span class="heart-icon">${isLiked ? '❤️' : '🤍'}</span>
          <span id="gamza-like-text">관심 <strong id="gamza-like-count">${likesCount}</strong></span>
        </button>
      </div>

      <!-- 댓글 영역 -->
      <div class="gamza-comments-section">
        <div class="gamza-comments-header">
          <span>💬 댓글</span>
          <span class="gamza-comments-count" id="gamza-comments-counter">${commentsCount}</span>
        </div>

        <div class="gamza-comments-list" id="gamza-comments-list">
          ${commentsHtml}
        </div>

        <form class="gamza-comment-form" id="gamza-comment-form">
          <input 
            type="text" 
            class="gamza-comment-input" 
            id="gamza-comment-input" 
            placeholder="따뜻한 댓글을 남겨주세요 (예: 구매 가능한가요?)" 
            autocomplete="off"
            maxlength="200"
          />
          <button type="submit" class="gamza-comment-submit-btn" id="gamza-comment-submit">등록</button>
        </form>
      </div>
    `;

    // 작성자 버튼 이벤트 바인딩
    if (isAuthor) {
      const editBtn = document.getElementById('btn-author-edit');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          DetailModal.close();
          if (global.CreateModal && typeof global.CreateModal.openEdit === 'function') {
            global.CreateModal.openEdit(product);
          }
        });
      }

      const deleteBtn = document.getElementById('btn-author-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          const ok = window.confirm('정말 이 감자글을 삭제하시겠습니까? 🥔\n삭제된 글은 복구할 수 없습니다.');
          if (!ok) return;

          try {
            if (global.GamzaData && typeof global.GamzaData.deleteProduct === 'function') {
              await global.GamzaData.deleteProduct(product.id);
              if (global.GamzaApp && typeof global.GamzaApp.showToast === 'function') {
                global.GamzaApp.showToast('게시글이 삭제되었습니다! 🥔');
              }
              DetailModal.close();
            }
          } catch (err) {
            console.error('게시글 삭제 실패:', err);
            alert('게시글 삭제에 실패했습니다.');
          }
        });
      }

      const statusSegmentBtns = bodyEl.querySelectorAll('.author-status-segment-btn');
      statusSegmentBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const newStatus = btn.dataset.status;
          if (!newStatus || newStatus === product.status) return;

          try {
            if (global.GamzaData && typeof global.GamzaData.updateProductStatus === 'function') {
              await global.GamzaData.updateProductStatus(product.id, newStatus);
              product.status = newStatus;
              if (global.GamzaApp && typeof global.GamzaApp.showToast === 'function') {
                global.GamzaApp.showToast(`판매 상태가 '${newStatus}'(으)로 변경되었습니다! 🥔`);
              }
              renderModalContent(product, user);
            }
          } catch (err) {
            console.error('판매 상태 변경 실패:', err);
            alert('판매 상태 변경에 실패했습니다.');
          }
        });
      });
    }

    // 찜하기 버튼 바인딩
    const likeBtn = document.getElementById('gamza-btn-like');
    if (likeBtn) {
      likeBtn.addEventListener('click', async () => {
        await handleLikeToggle(product.id);
      });
    }

    // 댓글 등록 폼 바인딩
    const commentForm = document.getElementById('gamza-comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleCommentSubmit(product.id);
      });
    }
  }

  // ==========================================
  // 5. 인터랙션 핸들러 (찜 & 댓글 비동기)
  // ==========================================

  async function handleLikeToggle(productId) {
    if (!global.GamzaData) return;

    const likeBtn = document.getElementById('gamza-btn-like');
    if (likeBtn) likeBtn.style.pointerEvents = 'none';

    try {
      const res = await global.GamzaData.toggleLike(productId);
      const likeCountEl = document.getElementById('gamza-like-count');
      const heartIconEl = likeBtn ? likeBtn.querySelector('.heart-icon') : null;

      if (likeBtn && likeCountEl && res) {
        if (res.isLiked) {
          likeBtn.classList.add('is-liked');
          if (heartIconEl) heartIconEl.textContent = '❤️';
        } else {
          likeBtn.classList.remove('is-liked');
          if (heartIconEl) heartIconEl.textContent = '🤍';
        }
        likeCountEl.textContent = res.likes;
      }
    } catch (err) {
      console.error('상세 모달 찜 실패:', err);
    } finally {
      if (likeBtn) likeBtn.style.pointerEvents = '';
    }
  }

  async function handleCommentSubmit(productId) {
    const inputEl = document.getElementById('gamza-comment-input');
    const submitBtn = document.getElementById('gamza-comment-submit');
    if (!inputEl || !global.GamzaData) return;

    const text = inputEl.value.trim();
    if (!text) {
      inputEl.focus();
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      const newComment = await global.GamzaData.addComment(productId, text);
      inputEl.value = '';

      const commentsListEl = document.getElementById('gamza-comments-list');
      const counterEl = document.getElementById('gamza-comments-counter');

      if (commentsListEl && newComment) {
        const emptyEl = commentsListEl.querySelector('.gamza-comments-empty');
        if (emptyEl) {
          commentsListEl.innerHTML = '';
        }

        const cAuthor = escapeHtml(newComment.author || '포슬감자');
        const cAvatar = newComment.avatar ? (newComment.avatar.startsWith('http') ? `<img src="${newComment.avatar}" alt="${cAuthor}">` : newComment.avatar) : '🥔';
        const cTime = escapeHtml(newComment.createdAt || '방금 전');
        const cContent = escapeHtml(newComment.text || newComment.content || '');

        const itemHtml = `
          <div class="gamza-comment-item">
            <div class="gamza-comment-avatar">${cAvatar}</div>
            <div class="gamza-comment-body">
              <div class="gamza-comment-top">
                <span class="gamza-comment-author">${cAuthor}</span>
                <span class="gamza-comment-time">${cTime}</span>
              </div>
              <div class="gamza-comment-text">${cContent}</div>
            </div>
          </div>
        `;
        commentsListEl.insertAdjacentHTML('beforeend', itemHtml);
        commentsListEl.scrollTop = commentsListEl.scrollHeight;

        if (counterEl) {
          const curr = parseInt(counterEl.textContent || '0', 10);
          counterEl.textContent = curr + 1;
        }
      }
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      alert('댓글 등록에 실패했습니다.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // ==========================================
  // 6. 모달 오픈 / 닫기 API
  // ==========================================

  const DetailModal = {
    async open(productId) {
      if (!productId && productId !== 0) return;

      const overlay = ensureModalDOM();
      currentProductId = productId;

      const imgBoxEl = document.getElementById('gamza-modal-img-box');
      const bodyEl = document.getElementById('gamza-modal-body');

      if (imgBoxEl) {
        imgBoxEl.innerHTML = `
          <div style="font-size: 40px; animation: pulse 1s infinite;">🥔</div>
        `;
      }

      if (bodyEl) {
        bodyEl.innerHTML = `
          <div style="padding: 40px 20px; text-align: center; color: #8F8174;">
            <p style="font-weight: 700;">상품 상세 정보를 불러오는 중...</p>
          </div>
        `;
      }

      overlay.classList.add('is-active');
      document.body.style.overflow = 'hidden';

      if (global.GamzaData && typeof global.GamzaData.getProductById === 'function') {
        const product = await global.GamzaData.getProductById(productId);
        let currentUser = null;
        if (global.GamzaSupabase && typeof global.GamzaSupabase.getAuthenticatedUser === 'function') {
          currentUser = await global.GamzaSupabase.getAuthenticatedUser();
        }
        if (product) {
          renderModalContent(product, currentUser);
          return;
        }
      }

      if (bodyEl) {
        bodyEl.innerHTML = `
          <div style="padding: 40px 20px; text-align: center; color: #8F8174;">
            <p>상품 정보를 찾을 수 없습니다.</p>
          </div>
        `;
      }
    },

    close() {
      if (!modalOverlayEl) return;
      modalOverlayEl.classList.remove('is-active');
      document.body.style.overflow = '';
      currentProductId = null;
    },

    getCurrentProductId() {
      return currentProductId;
    }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlayEl && modalOverlayEl.classList.contains('is-active')) {
      DetailModal.close();
    }
  });

  window.addEventListener('open-product-detail', (e) => {
    const id = e.detail?.productId ?? e.detail?.id ?? e.detail;
    if (id !== undefined && id !== null) {
      DetailModal.open(id);
    }
  });

  global.DetailModal = DetailModal;
})(typeof window !== 'undefined' ? window : globalThis);
