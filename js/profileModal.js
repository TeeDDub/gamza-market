/**
 * 🥔 감자마켓 (Gamza Market) - 내 프로필 관리 모달 (profileModal.js)
 * 프로필 사진 업로드/변경, 닉네임 수정 및 매너온도 확인
 */

(function (global) {
  'use strict';

  let isInitialized = false;
  let selectedNewAvatarFile = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(msg) {
    if (global.GamzaApp && typeof global.GamzaApp.showToast === 'function') {
      global.GamzaApp.showToast(msg);
    } else {
      console.log('[Toast]', msg);
    }
  }

  const ProfileModal = {
    /**
     * 모달 초기화
     */
    init() {
      if (isInitialized || document.getElementById('profile-modal-overlay')) {
        return;
      }

      this.createDOM();
      this.bindEvents();
      isInitialized = true;
    },

    /**
     * 모달 마크업 생성
     */
    createDOM() {
      const modalHtml = `
        <div id="profile-modal-overlay" class="modal-overlay profile-modal-overlay" aria-hidden="true">
          <div class="modal-content-card profile-modal-card" role="dialog" aria-labelledby="profile-modal-title">
            
            <!-- 모달 헤더 -->
            <div class="modal-header profile-modal-header">
              <div class="profile-header-title-wrap">
                <span class="profile-header-icon">🥔</span>
                <h2 id="profile-modal-title" class="modal-title">내 감자 프로필</h2>
              </div>
              <button type="button" class="modal-close-btn" id="profile-modal-close-btn" aria-label="닫기">✕</button>
            </div>

            <!-- 에러/안내 메시지 배너 -->
            <div id="profile-error-banner" class="auth-error-banner" style="display: none;" role="alert"></div>

            <!-- 프로필 폼 -->
            <form id="profile-edit-form" class="profile-form-body" novalidate>
              
              <!-- 1. 아바타 사진 변경 영역 -->
              <div class="profile-avatar-center-wrap">
                <div class="profile-avatar-box">
                  <img 
                    id="profile-edit-avatar-img" 
                    src="assets/default-avatar.svg" 
                    alt="내 프로필 사진"
                    onerror="this.src='assets/default-avatar.svg'" 
                  />
                  <label for="profile-edit-avatar-file" class="profile-avatar-badge" title="사진 변경">
                    📷
                  </label>
                </div>
                <input type="file" id="profile-edit-avatar-file" class="profile-avatar-file-input" accept="image/*" />
                <label for="profile-edit-avatar-file" class="btn-profile-photo-change">
                  📸 프로필 사진 변경
                </label>
              </div>

              <!-- 2. 매너온도 박스 -->
              <div class="profile-manner-card">
                <div class="profile-manner-header">
                  <span class="manner-title">🌡️ 매너온도</span>
                  <span class="manner-score" id="profile-manner-score">36.5℃</span>
                </div>
                <div class="manner-bar-track">
                  <div class="manner-bar-fill" id="profile-manner-bar" style="width: 36.5%;"></div>
                </div>
                <p class="manner-desc">첫 시작 매너온도는 36.5℃입니다. 따뜻한 이웃 거래를 만들어봐요!</p>
              </div>

              <!-- 3. 닉네임 입력 -->
              <div class="form-group">
                <label for="profile-edit-nickname" class="form-label">
                  닉네임 <span class="required-dot">*</span>
                </label>
                <input 
                  type="text" 
                  id="profile-edit-nickname" 
                  class="form-input" 
                  placeholder="2자 이상의 닉네임" 
                  maxlength="15"
                  required 
                />
              </div>

              <!-- 4. 활동 지역 -->
              <div class="form-group">
                <label for="profile-edit-area" class="form-label">활동 지역</label>
                <input 
                  type="text" 
                  id="profile-edit-area" 
                  class="form-input" 
                  placeholder="예: 강원도 춘천시 감자동" 
                  value="강원도 춘천시 감자동"
                />
              </div>

              <!-- 5. 가입 이메일 (읽기 전용) -->
              <div class="form-group">
                <label class="form-label">로그인 계정 이메일</label>
                <input 
                  type="text" 
                  id="profile-edit-email" 
                  class="form-input form-input-readonly" 
                  readonly 
                  disabled 
                />
              </div>

              <!-- 6. 버튼 영역 -->
              <div class="profile-btn-group">
                <button type="button" class="btn btn-secondary" id="btn-profile-cancel">취소</button>
                <button type="submit" class="btn btn-primary" id="btn-profile-submit">💾 변경사항 저장</button>
              </div>

            </form>

          </div>
        </div>
      `;

      const div = document.createElement('div');
      div.innerHTML = modalHtml;
      document.body.appendChild(div.firstElementChild);
    },

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
      const overlay = document.getElementById('profile-modal-overlay');
      const closeBtn = document.getElementById('profile-modal-close-btn');
      const cancelBtn = document.getElementById('btn-profile-cancel');
      const fileInput = document.getElementById('profile-edit-avatar-file');
      const form = document.getElementById('profile-edit-form');

      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            this.close();
          }
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.close());
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay && overlay.classList.contains('is-visible')) {
          this.close();
        }
      });

      // 파일 변경 이벤트
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          if (!file.type.startsWith('image/')) {
            this.showError('이미지 파일만 선택할 수 있습니다.');
            return;
          }

          if (file.size > 5 * 1024 * 1024) {
            this.showError('프로필 사진은 5MB 이하만 업로드 가능합니다.');
            return;
          }

          this.clearError();
          selectedNewAvatarFile = file;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const previewImg = document.getElementById('profile-edit-avatar-img');
            if (previewImg) previewImg.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        });
      }

      // 폼 제출
      if (form) {
        form.addEventListener('submit', (e) => this.handleSubmit(e));
      }
    },

    /**
     * 에러 메시지
     */
    showError(msg) {
      const banner = document.getElementById('profile-error-banner');
      if (banner) {
        banner.textContent = msg;
        banner.style.display = 'block';
      }
    },

    clearError() {
      const banner = document.getElementById('profile-error-banner');
      if (banner) {
        banner.textContent = '';
        banner.style.display = 'none';
      }
    },

    /**
     * 모달 열기
     */
    async open() {
      this.init();
      selectedNewAvatarFile = null;
      this.clearError();

      const overlay = document.getElementById('profile-modal-overlay');
      if (!overlay) return;

      // 사용자 정보 로드
      let user = null;
      if (global.GamzaSupabase) {
        user = await global.GamzaSupabase.getAuthenticatedUser();
      }

      if (!user) {
        showToast('🥔 로그인이 필요합니다.');
        if (global.AuthModal) {
          global.AuthModal.open({ tab: 'login' });
        }
        return;
      }

      // 데이터 채우기
      const avatarImg = document.getElementById('profile-edit-avatar-img');
      const nicknameInput = document.getElementById('profile-edit-nickname');
      const areaInput = document.getElementById('profile-edit-area');
      const emailInput = document.getElementById('profile-edit-email');
      const mannerScore = document.getElementById('profile-manner-score');
      const mannerBar = document.getElementById('profile-manner-bar');
      const fileInput = document.getElementById('profile-edit-avatar-file');

      if (fileInput) fileInput.value = '';
      if (avatarImg) {
        let av = user.avatar_url || 'assets/default-avatar.svg';
        if (av.includes('photo-1534528741775-53994a69daeb')) {
          av = 'assets/default-avatar.svg';
        }
        avatarImg.src = av;
      }
      if (nicknameInput) nicknameInput.value = user.nickname || '';
      if (areaInput) areaInput.value = user.activity_area || '강원도 춘천시 감자동';
      if (emailInput) emailInput.value = user.email || '(이메일 정보 없음)';

      const temp = parseFloat(user.manner_temperature || 36.5).toFixed(1);
      if (mannerScore) mannerScore.textContent = `${temp}℃`;
      if (mannerBar) {
        const pct = Math.min(Math.max((temp / 100) * 100, 10), 100);
        mannerBar.style.width = `${pct}%`;
      }

      overlay.classList.add('is-visible');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    },

    /**
     * 모달 닫기
     */
    close() {
      const overlay = document.getElementById('profile-modal-overlay');
      if (!overlay) return;

      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      this.clearError();
      selectedNewAvatarFile = null;
    },

    /**
     * 프로필 저장 제출
     */
    async handleSubmit(e) {
      e.preventDefault();
      this.clearError();

      const nicknameInput = document.getElementById('profile-edit-nickname');
      const areaInput = document.getElementById('profile-edit-area');
      const submitBtn = document.getElementById('btn-profile-submit');

      const nickname = (nicknameInput.value || '').trim();
      const activity_area = (areaInput.value || '').trim() || '강원도 춘천시 감자동';

      if (!nickname || nickname.length < 2) {
        this.showError('닉네임은 2글자 이상 입력해주세요! 🥔');
        nicknameInput.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '🥔 프로필 저장 중...';
      }

      try {
        let avatar_url = null;

        // 새 사진 파일이 선택된 경우 스토리지에 업로드
        if (selectedNewAvatarFile && global.GamzaSupabase && typeof global.GamzaSupabase.uploadAvatarImage === 'function') {
          submitBtn.textContent = '📸 새 사진 업로드 중...';
          avatar_url = await global.GamzaSupabase.uploadAvatarImage(selectedNewAvatarFile);
        }

        const updatePayload = { nickname, activity_area };
        if (avatar_url) {
          updatePayload.avatar_url = avatar_url;
        }

        submitBtn.textContent = '🥔 데이터 동기화 중...';
        await global.GamzaSupabase.updateProfile(updatePayload);

        showToast('내 프로필이 멋지게 변경되었습니다! 🥔✨');
        this.close();

        // 헤더 및 상품 목록 갱신
        const updatedUser = await global.GamzaSupabase.getAuthenticatedUser();
        if (global.GamzaApp && typeof global.GamzaApp.currentUser !== 'undefined') {
          const nicknameEl = document.getElementById('header-user-nickname');
          if (nicknameEl && updatedUser) {
            nicknameEl.textContent = `🥔 ${updatedUser.nickname}`;
          }
        }

        if (global.ProductList && typeof global.ProductList.render === 'function') {
          global.ProductList.render();
        }
      } catch (err) {
        console.error('[ProfileModal] 프로필 저장 실패:', err);
        this.showError(err.message || '프로필 수정에 실패했습니다.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '💾 변경사항 저장';
        }
      }
    }
  };

  global.ProfileModal = ProfileModal;
})(typeof window !== 'undefined' ? window : globalThis);
