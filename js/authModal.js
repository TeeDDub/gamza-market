/**
 * 🥔 감자마켓 (Gamza Market) - 로그인 & 회원가입 모달 모듈 (authModal.js)
 * Supabase Auth 연동 및 사용자 입력 유효성 검증
 */

(function (global) {
  'use strict';

  let isInitialized = false;
  let currentTab = 'login'; // 'login' | 'signup'
  let onSuccessCallback = null;
  let selectedAvatarFile = null;

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

  const AuthModal = {
    /**
     * 모달 초기화 (DOM 생성 및 이벤트 바인딩)
     */
    init() {
      if (isInitialized || document.getElementById('auth-modal-overlay')) {
        return;
      }

      this.createDOM();
      this.bindEvents();
      isInitialized = true;
    },

    /**
     * 모달 DOM 생성
     */
    createDOM() {
      const modalHtml = `
        <div id="auth-modal-overlay" class="modal-overlay auth-modal-overlay" aria-hidden="true">
          <div class="modal-content-card auth-modal-card" role="dialog" aria-labelledby="auth-modal-title">
            
            <!-- 모달 헤더 -->
            <div class="modal-header auth-modal-header">
              <div class="auth-header-title-wrap">
                <span class="auth-brand-potato">🥔</span>
                <h2 id="auth-modal-title" class="auth-modal-title">감자마켓 시작하기</h2>
              </div>
              <button type="button" class="modal-close-btn" id="auth-modal-close-btn" aria-label="닫기">✕</button>
            </div>

            <!-- 탭 전환 바 (로그인 / 회원가입) -->
            <div class="auth-tab-bar" role="tablist">
              <button type="button" class="auth-tab-btn active" id="auth-tab-login" data-tab="login" role="tab" aria-selected="true">
                로그인
              </button>
              <button type="button" class="auth-tab-btn" id="auth-tab-signup" data-tab="signup" role="tab" aria-selected="false">
                회원가입
              </button>
            </div>

            <!-- 에러/안내 메시지 배너 -->
            <div id="auth-error-banner" class="auth-error-banner" style="display: none;" role="alert"></div>

            <!-- 1. 로그인 폼 -->
            <form id="auth-login-form" class="auth-form-pane" novalidate>
              <div class="form-group">
                <label for="login-email" class="form-label">이메일 주소</label>
                <input 
                  type="email" 
                  id="login-email" 
                  class="form-input" 
                  placeholder="gamza@example.com" 
                  autocomplete="email"
                  required 
                />
              </div>

              <div class="form-group">
                <label for="login-password" class="form-label">비밀번호</label>
                <input 
                  type="password" 
                  id="login-password" 
                  class="form-input" 
                  placeholder="비밀번호를 입력해주세요" 
                  autocomplete="current-password"
                  required 
                />
              </div>

              <div class="auth-submit-wrap">
                <button type="submit" id="btn-login-submit" class="btn-auth-submit">
                  🥔 로그인하기
                </button>
              </div>

              <div class="auth-footer-links">
                <span>아직 감자마켓 회원이 아니신가요?</span>
                <button type="button" class="btn-link-switch" id="btn-switch-to-signup">회원가입</button>
              </div>
            </form>

            <!-- 2. 회원가입 폼 -->
            <form id="auth-signup-form" class="auth-form-pane" style="display: none;" novalidate>
              <!-- 프로필 사진 선택 영역 -->
              <div class="form-group auth-avatar-upload-group">
                <label class="form-label">프로필 사진</label>
                <div class="auth-avatar-picker-wrap">
                  <div class="auth-avatar-preview-box" id="auth-avatar-preview-box">
                    <img id="signup-avatar-preview" src="assets/default-avatar.svg" alt="프로필 사진 미리보기" />
                    <label for="signup-avatar-file" class="auth-avatar-camera-btn" title="사진 업로드">
                      📷
                    </label>
                  </div>
                  <input type="file" id="signup-avatar-file" class="auth-avatar-file-input" accept="image/*" />
                  <div class="auth-avatar-hint">
                    <label for="signup-avatar-file" class="btn-avatar-select-label">📸 사진 선택하기</label>
                    <span class="auth-avatar-subhint">미선택 시 귀여운 기본 실루엣으로 설정됩니다</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="signup-nickname" class="form-label">
                  닉네임 <span class="required-dot">*</span>
                </label>
                <input 
                  type="text" 
                  id="signup-nickname" 
                  class="form-input" 
                  placeholder="예: 포슬포슬감자 (2자 이상)" 
                  maxlength="15"
                  required 
                />
                <span class="form-hint">동네 이웃에게 보여질 이름입니다.</span>
              </div>

              <div class="form-group">
                <label for="signup-email" class="form-label">
                  이메일 주소 <span class="required-dot">*</span>
                </label>
                <input 
                  type="email" 
                  id="signup-email" 
                  class="form-input" 
                  placeholder="gamza@example.com" 
                  autocomplete="email"
                  required 
                />
              </div>

              <div class="form-group">
                <label for="signup-password" class="form-label">
                  비밀번호 <span class="required-dot">*</span>
                </label>
                <input 
                  type="password" 
                  id="signup-password" 
                  class="form-input" 
                  placeholder="6자리 이상 입력해주세요" 
                  autocomplete="new-password"
                  minlength="6"
                  required 
                />
              </div>

              <div class="form-group">
                <label for="signup-password-confirm" class="form-label">
                  비밀번호 확인 <span class="required-dot">*</span>
                </label>
                <input 
                  type="password" 
                  id="signup-password-confirm" 
                  class="form-input" 
                  placeholder="비밀번호를 한 번 더 입력해주세요" 
                  autocomplete="new-password"
                  required 
                />
              </div>

              <div class="auth-submit-wrap">
                <button type="submit" id="btn-signup-submit" class="btn-auth-submit">
                  ✨ 감자마켓 가입하기
                </button>
              </div>

              <div class="auth-footer-links">
                <span>이미 계정이 있으신가요?</span>
                <button type="button" class="btn-link-switch" id="btn-switch-to-login">로그인</button>
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
      const overlay = document.getElementById('auth-modal-overlay');
      const closeBtn = document.getElementById('auth-modal-close-btn');
      const tabLogin = document.getElementById('auth-tab-login');
      const tabSignup = document.getElementById('auth-tab-signup');
      const switchToSignup = document.getElementById('btn-switch-to-signup');
      const switchToLogin = document.getElementById('btn-switch-to-login');
      const loginForm = document.getElementById('auth-login-form');
      const signupForm = document.getElementById('auth-signup-form');
      const avatarFileInput = document.getElementById('signup-avatar-file');

      // 닫기 이벤트 (오버레이 클릭, 닫기 버튼, ESC 키)
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

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay && overlay.classList.contains('is-visible')) {
          this.close();
        }
      });

      // 탭 전환
      if (tabLogin) tabLogin.addEventListener('click', () => this.switchTab('login'));
      if (tabSignup) tabSignup.addEventListener('click', () => this.switchTab('signup'));
      if (switchToSignup) switchToSignup.addEventListener('click', () => this.switchTab('signup'));
      if (switchToLogin) switchToLogin.addEventListener('click', () => this.switchTab('login'));

      // 프로필 사진 파일 선택 이벤트
      if (avatarFileInput) {
        avatarFileInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          if (!file.type.startsWith('image/')) {
            this.showError('이미지 파일(JPG, PNG, GIF 등)만 선택할 수 있습니다.');
            return;
          }

          if (file.size > 5 * 1024 * 1024) {
            this.showError('프로필 사진은 5MB 이하만 가능합니다.');
            return;
          }

          this.clearError();
          selectedAvatarFile = file;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const previewImg = document.getElementById('signup-avatar-preview');
            if (previewImg) previewImg.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        });
      }

      // 폼 제출
      if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));
      if (signupForm) signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    },

    /**
     * 탭 전환 (로그인 <-> 회원가입)
     */
    switchTab(tab) {
      currentTab = tab;
      this.clearError();

      const tabLogin = document.getElementById('auth-tab-login');
      const tabSignup = document.getElementById('auth-tab-signup');
      const loginForm = document.getElementById('auth-login-form');
      const signupForm = document.getElementById('auth-signup-form');
      const titleEl = document.getElementById('auth-modal-title');

      if (tab === 'signup') {
        if (tabLogin) {
          tabLogin.classList.remove('active');
          tabLogin.setAttribute('aria-selected', 'false');
        }
        if (tabSignup) {
          tabSignup.classList.add('active');
          tabSignup.setAttribute('aria-selected', 'true');
        }
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
        if (titleEl) titleEl.textContent = '감자마켓 이웃 회원가입';

        const nickInput = document.getElementById('signup-nickname');
        if (nickInput) setTimeout(() => nickInput.focus(), 50);
      } else {
        if (tabSignup) {
          tabSignup.classList.remove('active');
          tabSignup.setAttribute('aria-selected', 'false');
        }
        if (tabLogin) {
          tabLogin.classList.add('active');
          tabLogin.setAttribute('aria-selected', 'true');
        }
        if (signupForm) signupForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';
        if (titleEl) titleEl.textContent = '감자마켓 시작하기';

        const emailInput = document.getElementById('login-email');
        if (emailInput) setTimeout(() => emailInput.focus(), 50);
      }
    },

    /**
     * 에러 메시지 표시
     */
    showError(msg) {
      const banner = document.getElementById('auth-error-banner');
      if (banner) {
        banner.textContent = msg;
        banner.style.display = 'block';
      }
    },

    /**
     * 에러 메시지 초기화
     */
    clearError() {
      const banner = document.getElementById('auth-error-banner');
      if (banner) {
        banner.textContent = '';
        banner.style.display = 'none';
      }
    },

    /**
     * 모달 열기
     * @param {Object} options { tab: 'login'|'signup', onSuccess: Function }
     */
    open(options = {}) {
      this.init();
      onSuccessCallback = options.onSuccess || null;
      selectedAvatarFile = null;

      const previewImg = document.getElementById('signup-avatar-preview');
      if (previewImg) previewImg.src = 'assets/default-avatar.svg';

      const fileInput = document.getElementById('signup-avatar-file');
      if (fileInput) fileInput.value = '';

      const overlay = document.getElementById('auth-modal-overlay');
      if (!overlay) return;

      this.clearError();
      this.switchTab(options.tab || 'login');

      overlay.classList.add('is-visible');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    },

    /**
     * 모달 닫기
     */
    close() {
      const overlay = document.getElementById('auth-modal-overlay');
      if (!overlay) return;

      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      this.clearError();
      onSuccessCallback = null;
      selectedAvatarFile = null;
    },

    /**
     * 로그인 제출 처리
     */
    async handleLogin(e) {
      e.preventDefault();
      this.clearError();

      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');
      const submitBtn = document.getElementById('btn-login-submit');

      const email = (emailInput.value || '').trim();
      const password = (passwordInput.value || '');

      if (!email || !email.includes('@')) {
        this.showError('올바른 이메일 주소를 입력해주세요. 🥔');
        emailInput.focus();
        return;
      }

      if (!password) {
        this.showError('비밀번호를 입력해주세요. 🥔');
        passwordInput.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '🥔 로그인 중...';
      }

      try {
        if (!global.GamzaSupabase || typeof global.GamzaSupabase.signIn !== 'function') {
          throw new Error('인증 모듈이 준비되지 않았습니다.');
        }

        await global.GamzaSupabase.signIn({ email, password });
        const userProfile = await global.GamzaSupabase.getAuthenticatedUser();

        const nickname = userProfile ? userProfile.nickname : '이웃';
        showToast(`반가워요, ${nickname}님! 🥔✨`);

        const cb = onSuccessCallback;
        this.close();

        // 성공 후 콜백 실행 (예: 글쓰기 모달 열기)
        if (typeof cb === 'function') {
          setTimeout(() => cb(userProfile), 150);
        }
      } catch (err) {
        console.error('[AuthModal] 로그인 실패:', err);
        const errMsg = err.message || '';
        if (errMsg.includes('Invalid login credentials')) {
          this.showError('이메일 또는 비밀번호가 일치하지 않습니다.');
        } else if (errMsg.includes('Email not confirmed')) {
          this.showError('이메일 인증이 완료되지 않았습니다.');
        } else {
          this.showError(errMsg || '로그인에 실패했습니다. 다시 시도해주세요.');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🥔 로그인하기';
        }
      }
    },

    /**
     * 회원가입 제출 처리
     */
    async handleSignup(e) {
      e.preventDefault();
      this.clearError();

      const nickInput = document.getElementById('signup-nickname');
      const emailInput = document.getElementById('signup-email');
      const passwordInput = document.getElementById('signup-password');
      const confirmInput = document.getElementById('signup-password-confirm');
      const submitBtn = document.getElementById('btn-signup-submit');

      const nickname = (nickInput.value || '').trim();
      const email = (emailInput.value || '').trim();
      const password = (passwordInput.value || '');
      const confirmPassword = (confirmInput.value || '');

      // 1. 닉네임 검증
      if (!nickname || nickname.length < 2) {
        this.showError('닉네임은 2글자 이상 입력해주세요! 🥔');
        nickInput.focus();
        return;
      }

      // 2. 이메일 검증
      if (!email || !email.includes('@')) {
        this.showError('유효한 이메일 주소를 입력해주세요.');
        emailInput.focus();
        return;
      }

      // 3. 비밀번호 검증
      if (!password || password.length < 6) {
        this.showError('비밀번호를 6자리 이상 입력해주세요.');
        passwordInput.focus();
        return;
      }

      // 4. 비밀번호 일치 확인
      if (password !== confirmPassword) {
        this.showError('비밀번호가 일치하지 않습니다.');
        confirmInput.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '✨ 회원가입 처리 중...';
      }

      try {
        if (!global.GamzaSupabase || typeof global.GamzaSupabase.signUp !== 'function') {
          throw new Error('인증 모듈이 준비되지 않았습니다.');
        }

        let avatar_url = 'assets/default-avatar.svg';

        // 선택된 프로필 사진이 있는 경우 Supabase Storage에 업로드
        if (selectedAvatarFile && typeof global.GamzaSupabase.uploadAvatarImage === 'function') {
          submitBtn.textContent = '📸 프로필 사진 업로드 중...';
          avatar_url = await global.GamzaSupabase.uploadAvatarImage(selectedAvatarFile);
        }

        submitBtn.textContent = '🥔 계정 생성 중...';
        await global.GamzaSupabase.signUp({ email, password, nickname, avatar_url });
        const userProfile = await global.GamzaSupabase.getAuthenticatedUser();

        showToast(`환영합니다, ${nickname}님! 감자마켓 이웃이 되셨어요! 🥔🎉`);

        const cb = onSuccessCallback;
        this.close();

        // 성공 후 콜백 실행 (예: 글쓰기 모달 열기)
        if (typeof cb === 'function') {
          setTimeout(() => cb(userProfile), 150);
        }
      } catch (err) {
        console.error('[AuthModal] 회원가입 실패:', err);
        const errMsg = err.message || '';
        if (errMsg.includes('User already registered') || errMsg.includes('already exists')) {
          this.showError('이미 등록된 이메일 주소입니다. 로그인해주세요.');
        } else {
          this.showError(errMsg || '회원가입에 실패했습니다. 다시 시도해주세요.');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '✨ 감자마켓 가입하기';
        }
      }
    }
  };

  global.AuthModal = AuthModal;
})(typeof window !== 'undefined' ? window : globalThis);
