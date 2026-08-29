/**
 * 감자마켓 (Gamza Market) - 메인 어플리케이션 엔트리포인트 (app.js)
 * 전체 모듈 연동, 전역 이벤트 핸들링 및 사용자 인터랙션 초기화
 */

(function () {
  'use strict';

  // 토스트 메시지 헬퍼 함수
  function showToast(message, duration = 2500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    // 기존 토스트 제거 (중복 누적 방지)
    container.innerHTML = '';

    const cleanMsg = String(message).replace(/^[🥔\s]+/, '').trim();
    const toast = document.createElement('div');
    toast.className = 'gamza-toast';
    toast.innerHTML = `<span class="toast-icon">🥔</span><span class="toast-text">${cleanMsg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  let currentUserProfile = null;

  // 헤더 우측 로그인/사용자 상태 UI 업데이트
  function updateHeaderAuthState(profile) {
    const unloggedGroup = document.getElementById('auth-unlogged-group');
    const loggedGroup = document.getElementById('auth-logged-group');
    const nicknameEl = document.getElementById('header-user-nickname');

    if (profile && profile.authUser) {
      if (unloggedGroup) unloggedGroup.style.display = 'none';
      if (loggedGroup) loggedGroup.style.display = 'inline-flex';
      if (nicknameEl) {
        const nick = profile.nickname || '포슬감자';
        nicknameEl.textContent = `🥔 ${nick}`;
        nicknameEl.title = `로그인 계정: ${profile.email || nick}`;
      }
    } else {
      if (unloggedGroup) unloggedGroup.style.display = 'inline-flex';
      if (loggedGroup) loggedGroup.style.display = 'none';
    }
  }

  // 앱 초기화
  async function initApp() {
    console.log('🥔 감자마켓 애플리케이션 초기화 시작...');

    // 1. 인증 상태 확인 및 리스너 등록
    if (window.GamzaSupabase) {
      try {
        currentUserProfile = await window.GamzaSupabase.getAuthenticatedUser();
        updateHeaderAuthState(currentUserProfile);

        // Supabase Auth 상태 변경 리스너 구독
        window.GamzaSupabase.onAuthStateChange(async (event, session, profile) => {
          currentUserProfile = profile;
          updateHeaderAuthState(profile);

          if (event === 'SIGNED_OUT') {
            showToast('🥔 안전하게 로그아웃되었습니다.');
          }

          // 유저 상태 변경에 따른 상품 목록 갱신 (찜 상태 등)
          if (window.ProductList && typeof window.ProductList.render === 'function') {
            window.ProductList.render();
          }
        });
      } catch (e) {
        console.warn('사용자 인증 초기화 실패:', e);
      }
    }

    // 2. 상품 목록 모듈 초기화
    if (window.ProductList && typeof window.ProductList.init === 'function') {
      window.ProductList.init({
        container: '#product-grid',
        pagination: '#pagination',
        categoryContainer: '#category-filters',
        categoryBtn: '.category-btn',
        toggleAvailable: '#toggle-available-only',
        resultCount: '#product-count',
        emptyState: '#empty-state'
      });
    }

    // 3. 상품 상세 모달 모듈 초기화
    if (window.DetailModal && typeof window.DetailModal.init === 'function') {
      window.DetailModal.init();
    }

    // 4. 상품 등록(글쓰기) 모달 모듈 초기화
    if (window.CreateModal && typeof window.CreateModal.init === 'function') {
      window.CreateModal.init();
    }

    // 5. 로그인 & 회원가입 모달 모듈 초기화
    if (window.AuthModal && typeof window.AuthModal.init === 'function') {
      window.AuthModal.init();
    }

    // 6. 내 프로필 관리 모달 모듈 초기화
    if (window.ProfileModal && typeof window.ProfileModal.init === 'function') {
      window.ProfileModal.init();
    }

    // 7. 헤더 닉네임 뱃지 클릭 시 내 프로필 모달 열기
    const nicknameBtn = document.getElementById('header-user-nickname');
    if (nicknameBtn) {
      nicknameBtn.style.cursor = 'pointer';
      nicknameBtn.addEventListener('click', () => {
        if (window.ProfileModal && typeof window.ProfileModal.open === 'function') {
          window.ProfileModal.open();
        }
      });
    }

    // 8. 글쓰기 버튼 클릭 핸들러 (인증 여부 체크 -> 비로그인 시 로그인 유도 후 자동 글쓰기)
    const handleWriteClick = async () => {
      let authUser = currentUserProfile;
      if (!authUser && window.GamzaSupabase) {
        authUser = await window.GamzaSupabase.getAuthenticatedUser();
      }

      // 비로그인 상태인 경우: 로그인 모달 열기 & 로그인 성공 시 즉시 글쓰기 모달 오픈
      if (!authUser) {
        showToast('🥔 글을 작성하려면 먼저 로그인해주세요!');
        if (window.AuthModal && typeof window.AuthModal.open === 'function') {
          window.AuthModal.open({
            tab: 'login',
            onSuccess: () => {
              if (window.CreateModal && typeof window.CreateModal.open === 'function') {
                window.CreateModal.open();
              }
            }
          });
        }
        return;
      }

      // 이미 로그인되어 있는 경우: 곧바로 글쓰기 모달 오픈
      if (window.CreateModal && typeof window.CreateModal.open === 'function') {
        window.CreateModal.open();
      } else {
        showToast('🥔 글쓰기 모달을 불러오는 중입니다.');
      }
    };

    const headerWriteBtn = document.getElementById('btn-header-write');
    if (headerWriteBtn) {
      headerWriteBtn.addEventListener('click', handleWriteClick);
    }

    const fabWriteBtn = document.getElementById('fab-write-btn');
    if (fabWriteBtn) {
      fabWriteBtn.addEventListener('click', handleWriteClick);
    }

    const emptyWriteBtn = document.getElementById('btn-empty-write');
    if (emptyWriteBtn) {
      emptyWriteBtn.addEventListener('click', handleWriteClick);
    }

    const navWriteBtn = document.getElementById('nav-write');
    if (navWriteBtn) {
      navWriteBtn.addEventListener('click', handleWriteClick);
    }

    // 9. 로그인 버튼 클릭 핸들러
    const loginBtn = document.getElementById('btn-header-login');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        if (window.AuthModal && typeof window.AuthModal.open === 'function') {
          window.AuthModal.open({ tab: 'login' });
        }
      });
    }

    // 10. 로그아웃 버튼 클릭 핸들러
    const logoutBtn = document.getElementById('btn-header-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          if (window.GamzaSupabase && typeof window.GamzaSupabase.signOut === 'function') {
            await window.GamzaSupabase.signOut();
          }
        } catch (err) {
          console.error('로그아웃 에러:', err);
          showToast('로그아웃 처리 중 오류가 발생했습니다.');
        }
      });
    }

    // 11. 브랜드 로고 클릭 시 홈으로 초기화
    const brandLogo = document.getElementById('brand-home-btn');
    if (brandLogo) {
      brandLogo.addEventListener('click', () => {
        if (window.ProductList) {
          if (typeof window.ProductList.resetFilters === 'function') {
            window.ProductList.resetFilters();
          } else {
            window.ProductList.setCategory('전체');
            window.ProductList.setPage(1);
          }
        }
        showToast('🥔 홈으로 이동했습니다.');
      });
    }

    // 12. 하단 네비게이션 탭 핸들러
    const navItems = document.querySelectorAll('.app-bottom-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget;
        const id = target.id;

        if (id === 'nav-home') {
          navItems.forEach(nav => nav.classList.remove('active'));
          target.classList.add('active');
          if (window.ProductList && typeof window.ProductList.setCategory === 'function') {
            window.ProductList.setCategory('전체');
          }
        } else if (id === 'nav-chat') {
          showToast('💬 감자톡 대화함은 준비 중입니다!');
        } else if (id === 'nav-my') {
          if (currentUserProfile) {
            if (window.ProfileModal && typeof window.ProfileModal.open === 'function') {
              window.ProfileModal.open();
            } else {
              showToast(`🥔 내 정보: ${currentUserProfile.nickname || '이웃'}`);
            }
          } else {
            showToast('🥔 로그인이 필요한 서비스입니다.');
            if (window.AuthModal) {
              window.AuthModal.open({ tab: 'login' });
            }
          }
        }
      });
    });

    console.log('✨ 감자마켓 애플리케이션 초기화 완료!');
  }

  // DOM 로드 완료 시 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // 전역 노출
  window.GamzaApp = {
    showToast,
    init: initApp,
    get currentUser() {
      return currentUserProfile;
    }
  };
})();
