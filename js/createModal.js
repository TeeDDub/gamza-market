/**
 * 🥔 감자마켓 (Gamza Market) - 글쓰기(상품 등록) 모달 모듈
 * createModal.js
 */

const CreateModal = (() => {
  // 기본 프리셋 이미지 목록
  const PRESET_IMAGES = [
    {
      id: 'p1',
      title: '갓 캔 꿀감자',
      url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'p2',
      title: '포슬포슬 구운 감자',
      url: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'p3',
      title: '무선 헤드폰/디지털',
      url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'p4',
      title: '따뜻한 감자색 니트',
      url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'p5',
      title: '홈카페 커피머신',
      url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'p6',
      title: '마음 편한 힐링도서',
      url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'p7',
      title: '레트로 게임기',
      url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'p8',
      title: '반려 식물 화분',
      url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&auto=format&fit=crop&q=80'
    }
  ];

  let selectedImageUrl = PRESET_IMAGES[0].url;
  let selectedFile = null;
  let activeImageTab = 'preset'; // 'preset' | 'url' | 'file'
  let isInitialized = false;
  let editingProduct = null;

  /**
   * 모달 마크업 렌더링 및 DOM 추가
   */
  function init() {
    if (isInitialized || document.getElementById('create-modal-overlay')) {
      return;
    }

    const modalHtml = `
      <div id="create-modal-overlay" class="modal-overlay" aria-hidden="true">
        <div class="modal-content-card" role="dialog" aria-labelledby="create-modal-title">
          <!-- 모달 헤더 -->
          <div class="modal-header">
            <h2 id="create-modal-title" class="modal-title">
              <span>✏️</span> 상품 등록하기
            </h2>
            <button type="button" class="modal-close-btn" id="create-modal-close-btn" aria-label="닫기">
              ✕
            </button>
          </div>

          <!-- 모달 본문 (폼) -->
          <form id="create-product-form" class="modal-body" novalidate>
            <!-- 1. 대표 이미지 선택 섹션 -->
            <div class="form-group">
              <label class="form-label">
                상품 대표 이미지 <span class="required-dot">*</span>
              </label>

              <!-- 이미지 선택 탭 -->
              <div class="image-selector-tabs">
                <button type="button" class="img-tab-btn active" data-tab="preset">추천 이미지</button>
                <button type="button" class="img-tab-btn" data-tab="url">이미지 URL</button>
                <button type="button" class="img-tab-btn" data-tab="file">내 파일 첨부</button>
              </div>

              <!-- 탭 1: 추천 이미지 선택기 -->
              <div id="img-tab-content-preset" class="img-tab-pane">
                <div class="preset-grid" id="preset-image-grid">
                  ${PRESET_IMAGES.map((img, idx) => `
                    <div class="preset-thumb ${idx === 0 ? 'selected' : ''}" data-url="${img.url}" title="${img.title}">
                      <img src="${img.url}" alt="${img.title}" loading="lazy" />
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- 탭 2: URL 직접 입력 -->
              <div id="img-tab-content-url" class="img-tab-pane" style="display: none;">
                <input 
                  type="url" 
                  id="create-image-url-input" 
                  class="form-input" 
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <!-- 탭 3: 파일 업로드 -->
              <div id="img-tab-content-file" class="img-tab-pane" style="display: none;">
                <label class="file-upload-trigger" for="create-file-upload">
                  📁 사진 파일 선택하기
                </label>
                <input type="file" id="create-file-upload" class="file-upload-input" accept="image/*" />
              </div>

              <!-- 선택된 이미지 미리보기 -->
              <div class="image-preview-box" id="create-image-preview-box">
                <img id="create-preview-img" src="${selectedImageUrl}" alt="상품 이미지 미리보기" />
              </div>
            </div>

            <!-- 2. 상품명 입력 -->
            <div class="form-group">
              <label for="create-title" class="form-label">
                글 제목 / 상품명 <span class="required-dot">*</span>
              </label>
              <input 
                type="text" 
                id="create-title" 
                class="form-input" 
                placeholder="판매하거나 나눔할 물품명을 입력해주세요" 
                maxlength="50"
                required
              />
            </div>

            <!-- 3. 카테고리 & 판매 상태 (2열 그리드) -->
            <div class="form-row-2col">
              <div class="form-group">
                <label for="create-category" class="form-label">
                  카테고리 <span class="required-dot">*</span>
                </label>
                <select id="create-category" class="form-select" required>
                  <option value="" disabled selected>선택하세요</option>
                  <option value="디지털">디지털</option>
                  <option value="의류">의류</option>
                  <option value="가전">가전</option>
                  <option value="도서">도서</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div class="form-group">
                <label for="create-status" class="form-label">
                  판매 상태 <span class="required-dot">*</span>
                </label>
                <select id="create-status" class="form-select">
                  <option value="판매중" selected>판매중</option>
                  <option value="예약중">예약중</option>
                  <option value="거래완료">거래완료</option>
                </select>
              </div>
            </div>

            <!-- 4. 가격 & 거래 희망 장소 (2열 그리드) -->
            <div class="form-row-2col">
              <div class="form-group">
                <label for="create-price" class="form-label">
                  가격 (원) <span class="required-dot">*</span>
                </label>
                <input 
                  type="text" 
                  id="create-price" 
                  class="form-input" 
                  placeholder="0 (무료나눔: 0)" 
                  inputmode="numeric"
                  required
                />
              </div>

              <div class="form-group">
                <label for="create-location" class="form-label">
                  거래 희망 장소
                </label>
                <input 
                  type="text" 
                  id="create-location" 
                  class="form-input" 
                  value="감자동" 
                  placeholder="예: 역삼동, 감자동" 
                />
              </div>
            </div>

            <!-- 5. 상세 설명 (500자 제한) -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <label for="create-description" class="form-label" style="margin-bottom: 0;">
                  자세한 설명
                </label>
                <span id="desc-char-count" style="font-size: 0.75rem; color: #8F8174; font-weight: 600;">0 / 500자</span>
              </div>
              <textarea 
                id="create-description" 
                class="form-textarea" 
                rows="4" 
                maxlength="500"
                placeholder="물품의 상태, 구입 시기, 직거래 선호 장소 등을 자세히 적어주세요. (최대 500자)"
              ></textarea>
            </div>
          </form>

          <!-- 모달 푸터 (작성 완료 버튼) -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="create-modal-cancel-btn" style="flex: 1;">
              취소
            </button>
            <button type="submit" form="create-product-form" class="btn btn-primary btn-lg" id="create-modal-submit-btn" style="flex: 2;">
              ✏️ 상품 등록하기
            </button>
          </div>
        </div>
      </div>

      <!-- 전역 토스트 컨테이너 -->
      <div id="gamza-toast-container" class="toast-container" aria-live="polite"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    bindEvents();
    isInitialized = true;
  }

  /**
   * 이벤트 리스너 바인딩
   */
  function bindEvents() {
    const overlay = document.getElementById('create-modal-overlay');
    const closeBtn = document.getElementById('create-modal-close-btn');
    const cancelBtn = document.getElementById('create-modal-cancel-btn');
    const form = document.getElementById('create-product-form');
    const priceInput = document.getElementById('create-price');
    const urlInput = document.getElementById('create-image-url-input');
    const fileInput = document.getElementById('create-file-upload');
    const presetGrid = document.getElementById('preset-image-grid');

    // 닫기 이벤트들
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (cancelBtn) cancelBtn.addEventListener('click', close);
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    }

    // ESC 키 누를 때 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
        close();
      }
    });

    // 이미지 탭 전환
    const tabButtons = document.querySelectorAll('.image-selector-tabs .img-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        switchImageTab(targetTab);
      });
    });

    // 프리셋 이미지 클릭 선택
    if (presetGrid) {
      presetGrid.addEventListener('click', (e) => {
        const thumb = e.target.closest('.preset-thumb');
        if (!thumb) return;

        presetGrid.querySelectorAll('.preset-thumb').forEach(t => t.classList.remove('selected'));
        thumb.classList.add('selected');
        
        selectedImageUrl = thumb.dataset.url;
        selectedFile = null;
        updatePreview(selectedImageUrl);
      });
    }

    // URL 직접 입력 시 미리보기 반영
    if (urlInput) {
      urlInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val) {
          selectedImageUrl = val;
          selectedFile = null;
          updatePreview(val);
        }
      });
    }

    // 파일 업로드 시 파일 객체 저장 및 미리보기 반영
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          showToast('이미지 파일만 업로드할 수 있어요! 🥔');
          return;
        }

        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          selectedImageUrl = event.target.result;
          updatePreview(selectedImageUrl);
          showToast('사진이 첨부되었습니다! 📸');
        };
        reader.readAsDataURL(file);
      });
    }

    // 가격 입력 시 숫자 필터링 및 쉼표 포맷팅
    if (priceInput) {
      priceInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value === '') {
          e.target.value = '';
          return;
        }
        const num = parseInt(value, 10);
        e.target.value = num.toLocaleString('ko-KR');
      });
    }

    // 상세 설명 실시간 글자 수 카운팅 (500자 제한)
    const descInput = document.getElementById('create-description');
    const charCountEl = document.getElementById('desc-char-count');
    if (descInput && charCountEl) {
      descInput.addEventListener('input', () => {
        const len = descInput.value.length;
        charCountEl.textContent = `${len} / 500자`;
        if (len >= 500) {
          charCountEl.style.color = '#e53935';
        } else {
          charCountEl.style.color = '#8F8174';
        }
      });
    }

    // 폼 제출 (등록 유효성 검사 및 데이터 저장)
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }
  }

  /**
   * 이미지 선택기 탭 전환
   */
  function switchImageTab(tabName) {
    activeImageTab = tabName;
    document.querySelectorAll('.image-selector-tabs .img-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const presetPane = document.getElementById('img-tab-content-preset');
    const urlPane = document.getElementById('img-tab-content-url');
    const filePane = document.getElementById('img-tab-content-file');

    if (presetPane) presetPane.style.display = tabName === 'preset' ? 'block' : 'none';
    if (urlPane) urlPane.style.display = tabName === 'url' ? 'block' : 'none';
    if (filePane) filePane.style.display = tabName === 'file' ? 'block' : 'none';
  }

  /**
   * 이미지 미리보기 갱신
   */
  function updatePreview(url) {
    const previewImg = document.getElementById('create-preview-img');
    if (previewImg) {
      previewImg.src = url;
      previewImg.onerror = () => {
        previewImg.src = PRESET_IMAGES[0].url;
      };
    }
  }

  /**
   * 글쓰기/수정 폼 유효성 검사 및 저장 처리
   */
  async function handleFormSubmit(e) {
    e.preventDefault();

    const titleInput = document.getElementById('create-title');
    const categorySelect = document.getElementById('create-category');
    const statusSelect = document.getElementById('create-status');
    const priceInput = document.getElementById('create-price');
    const locationInput = document.getElementById('create-location');
    const descInput = document.getElementById('create-description');
    const submitBtn = document.getElementById('create-modal-submit-btn');

    const title = titleInput.value.trim();
    const category = categorySelect.value;
    const status = statusSelect.value || '판매중';
    const rawPrice = priceInput.value.replace(/[^0-9]/g, '');
    const location = (locationInput.value.trim()) || '강원도 춘천시 감자동';
    const description = descInput.value.trim();

    // 유효성 검사 1: 제목
    if (!title || title.length < 2) {
      showToast('상품명을 2글자 이상 입력해주세요! 🥔');
      titleInput.focus();
      return;
    }

    // 유효성 검사 2: 카테고리
    if (!category) {
      showToast('카테고리를 선택해주세요! 🥔');
      categorySelect.focus();
      return;
    }

    // 유효성 검사 3: 가격
    if (rawPrice === '') {
      showToast('가격을 입력해주세요! (무료나눔은 0원) 🥔');
      priceInput.focus();
      return;
    }

    const price = parseInt(rawPrice, 10);
    let image = selectedImageUrl || PRESET_IMAGES[0].url;
    const isEditMode = Boolean(editingProduct && editingProduct.id);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isEditMode ? '🥔 상품 수정 중...' : '🥔 상품 등록 중...';
    }

    try {
      // 내 파일 첨부 탭에서 파일을 선택한 경우 Supabase Storage 버킷에 업로드
      if (activeImageTab === 'file' && selectedFile && window.GamzaSupabase && typeof window.GamzaSupabase.uploadProductImage === 'function') {
        submitBtn.textContent = '📸 사진 클라우드 업로드 중...';
        image = await window.GamzaSupabase.uploadProductImage(selectedFile);
      }

      const productPayload = {
        title,
        category,
        status,
        price,
        location,
        description: description.slice(0, 500),
        image
      };

      if (isEditMode) {
        submitBtn.textContent = '🥔 수정 데이터 저장 중...';
        if (window.GamzaData && typeof window.GamzaData.updateProduct === 'function') {
          await window.GamzaData.updateProduct(editingProduct.id, productPayload);
        }
        showToast('상품 정보가 수정되었습니다! 🥔✨');
        
        const editId = editingProduct.id;
        close();

        setTimeout(() => {
          if (window.dispatchEvent && typeof CustomEvent !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-product-detail', {
              detail: { productId: editId }
            }));
          }
        }, 150);
      } else {
        submitBtn.textContent = '🥔 상품 데이터 저장 중...';
        if (window.GamzaData && typeof window.GamzaData.addProduct === 'function') {
          await window.GamzaData.addProduct(productPayload);
        }
        showToast('새로운 상품이 등록되었습니다! ✨');
        close();
      }

      // 상품 목록 새로고침
      if (window.ProductList && typeof window.ProductList.render === 'function') {
        window.ProductList.render();
      }
    } catch (err) {
      console.error(isEditMode ? '상품 수정 실패:' : '상품 등록 실패:', err);
      showToast(isEditMode ? '상품 수정에 실패했습니다.' : '상품 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = isEditMode ? '💾 수정 완료' : '✏️ 상품 등록하기';
      }
    }
  }

  /**
   * 모달 열기 (신규 등록)
   */
  function open() {
    init();
    editingProduct = null;
    const overlay = document.getElementById('create-modal-overlay');
    const titleEl = document.getElementById('create-modal-title');
    const submitBtn = document.getElementById('create-modal-submit-btn');

    if (titleEl) titleEl.innerHTML = '<span>✏️</span> 상품 등록하기';
    if (submitBtn) submitBtn.textContent = '✏️ 상품 등록하기';

    if (overlay) {
      resetForm();
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden'; 
      setTimeout(() => {
        const titleInput = document.getElementById('create-title');
        if (titleInput) titleInput.focus();
      }, 100);
    }
  }

  /**
   * 모달 열기 (기존 글 수정)
   */
  function openEdit(product) {
    if (!product) return;
    init();
    editingProduct = product;

    const overlay = document.getElementById('create-modal-overlay');
    const titleEl = document.getElementById('create-modal-title');
    const submitBtn = document.getElementById('create-modal-submit-btn');

    if (titleEl) titleEl.innerHTML = '<span>✏️</span> 상품 수정하기';
    if (submitBtn) submitBtn.textContent = '💾 수정 완료';

    const titleInput = document.getElementById('create-title');
    const categorySelect = document.getElementById('create-category');
    const statusSelect = document.getElementById('create-status');
    const priceInput = document.getElementById('create-price');
    const locationInput = document.getElementById('create-location');
    const descInput = document.getElementById('create-description');

    if (titleInput) titleInput.value = product.title || '';
    if (categorySelect) categorySelect.value = product.category || '기타';
    if (statusSelect) statusSelect.value = product.status || '판매중';
    if (priceInput) priceInput.value = (product.price !== undefined) ? Number(product.price).toLocaleString('ko-KR') : '0';
    if (locationInput) locationInput.value = product.location || '감자동';
    if (descInput) {
      descInput.value = product.description || '';
      const charCountEl = document.getElementById('desc-char-count');
      if (charCountEl) charCountEl.textContent = `${descInput.value.length} / 500자`;
    }

    selectedImageUrl = product.image || PRESET_IMAGES[0].url;
    selectedFile = null;
    updatePreview(selectedImageUrl);
    switchImageTab('preset');

    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (titleInput) titleInput.focus();
      }, 100);
    }
  }

  /**
   * 모달 닫기
   */
  function close() {
    const overlay = document.getElementById('create-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
    editingProduct = null;
  }

  /**
   * 폼 리셋
   */
  function resetForm() {
    const form = document.getElementById('create-product-form');
    if (form) form.reset();

    selectedFile = null;
    editingProduct = null;

    // 글자 수 카운터 초기화
    const charCountEl = document.getElementById('desc-char-count');
    if (charCountEl) {
      charCountEl.textContent = '0 / 500자';
      charCountEl.style.color = '#8F8174';
    }

    // 기본 이미지 복원
    selectedImageUrl = PRESET_IMAGES[0].url;
    switchImageTab('preset');

    const presetGrid = document.getElementById('preset-image-grid');
    if (presetGrid) {
      const thumbs = presetGrid.querySelectorAll('.preset-thumb');
      thumbs.forEach((t, idx) => {
        t.classList.toggle('selected', idx === 0);
      });
    }

    updatePreview(selectedImageUrl);

    const locationInput = document.getElementById('create-location');
    if (locationInput) locationInput.value = '감자동';

    const statusSelect = document.getElementById('create-status');
    if (statusSelect) statusSelect.value = '판매중';
  }

  /**
   * 토스트 알림 띄우기 (전역 유틸)
   */
  function showToast(message, duration = 2800) {
    if (window.GamzaApp && typeof window.GamzaApp.showToast === 'function') {
      window.GamzaApp.showToast(message, duration);
      return;
    }
    const cleanMsg = String(message).replace(/^[🥔\s]+/, '').trim();
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    container.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = 'gamza-toast';
    toast.innerHTML = `<span class="toast-icon">🥔</span><span class="toast-text">${cleanMsg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }

  // DOM 로드 완료 시 자동 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 외부 노출 인터페이스
  return {
    init,
    open,
    openEdit,
    close,
    showToast,
    PRESET_IMAGES
  };
})();

// 전역 바인딩
if (typeof window !== 'undefined') {
  window.CreateModal = CreateModal;
}
