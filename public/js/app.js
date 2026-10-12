/**
 * 𝑷𝑨𝑹𝑴𝑨𝑹'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯 - Application Logic (V2.2 - Clean Text, Zero Emojis)
 * Provider: Study Mafia
 * Features: Pure HTML5 Cinema Player, Direct Download PDFs, PWA, Mobile & Laptop Optimized
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    course: typeof COURSE_DATA !== 'undefined' ? COURSE_DATA : null,
    activeFilter: 'all',
    activeView: 'lecture', // 'lecture' or 'grid'
    searchQuery: '',
    completedIds: new Set(JSON.parse(localStorage.getItem('parmar_gk_completed_items') || '[]')),
    currentVideoItem: null,
    deferredPrompt: null
  };

  if (!state.course) {
    console.error('Course data not found!');
    return;
  }

  // DOM Elements
  const elements = {
    heroThumbnail: document.getElementById('heroThumbnail'),
    filterPills: document.querySelectorAll('.filter-pill'),
    viewModeBtns: document.querySelectorAll('.view-mode-btn'),
    headerSearchInput: document.getElementById('headerSearchInput'),
    mobileSearchInput: document.getElementById('mobileSearchInput'),
    contentContainer: document.getElementById('contentContainer'),
    // Cinema Player Modal (HTML5 Only)
    videoModal: document.getElementById('videoModal'),
    videoModalClose: document.getElementById('videoModalClose'),
    videoNative: document.getElementById('videoNative'),
    nativeControlsBar: document.getElementById('nativeControlsBar'),
    videoModalTitle: document.getElementById('videoModalTitle'),
    playerLectureTitle: document.getElementById('playerLectureTitle'),
    playerMetaDetails: document.getElementById('playerMetaDetails'),
    btnDownloadVideo: document.getElementById('btnDownloadVideo'),
    btnPlayVlc: document.getElementById('btnPlayVlc'),
    btnPlayMx: document.getElementById('btnPlayMx'),
    btnToggleCompleteVideo: document.getElementById('btnToggleCompleteVideo'),
    btnPrevVideo: document.getElementById('btnPrevVideo'),
    btnNextVideo: document.getElementById('btnNextVideo'),
    // Video Loading Overlay & Fallback Actions
    videoLoadingNotice: document.getElementById('videoLoadingNotice'),
    btnFallbackDl: document.getElementById('btnFallbackDl'),
    btnFallbackVlc: document.getElementById('btnFallbackVlc'),
    btnFallbackMx: document.getElementById('btnFallbackMx'),
    btnFallbackWeb: document.getElementById('btnFallbackWeb'),
    // Quiz Modal
    quizModal: document.getElementById('quizModal'),
    quizModalClose: document.getElementById('quizModalClose'),
    quizModalTitle: document.getElementById('quizModalTitle'),
    quizIframe: document.getElementById('quizIframe'),
    btnDownloadQuiz: document.getElementById('btnDownloadQuiz'),
    btnOpenQuizTab: document.getElementById('btnOpenQuizTab'),
    // WhatsApp Channel Modal & Triggers
    whatsappModal: document.getElementById('whatsappModal'),
    whatsappModalClose: document.getElementById('whatsappModalClose'),
    btnJoinWhatsapp: document.getElementById('btnJoinWhatsapp'),
    btnAlreadyJoinedWhatsapp: document.getElementById('btnAlreadyJoinedWhatsapp'),
    btnHeaderWhatsapp: document.getElementById('btnHeaderWhatsapp'),
    floatingWhatsappBtn: document.getElementById('floatingWhatsappBtn'),
    // PWA & Alerts
    btnInstallHeader: document.getElementById('btnInstallHeader'),
    offlineBanner: document.getElementById('offlineBanner'),
    toast: document.getElementById('toastNotification')
  };

  // SVGs for clean UI icons (Clean vectors, no emoji characters)
  const icons = {
    video: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
    pdf: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    quiz: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    download: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    play: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
    chevronDown: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>`
  };

  // Show Toast Message (Pure text, no emoji)
  function showToast(message, duration = 2500) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    clearTimeout(elements.toast._timer);
    elements.toast._timer = setTimeout(() => {
      elements.toast.classList.remove('show');
    }, duration);
  }

  // Toggle Item Completion
  function toggleComplete(itemId, e) {
    if (e) e.stopPropagation();
    if (state.completedIds.has(itemId)) {
      state.completedIds.delete(itemId);
      showToast('Marked as incomplete');
    } else {
      state.completedIds.add(itemId);
      showToast('Marked as completed');
    }
    localStorage.setItem('parmar_gk_completed_items', JSON.stringify(Array.from(state.completedIds)));
    renderContent();

    if (state.currentVideoItem && state.currentVideoItem.id === itemId) {
      updateModalCompleteButton();
    }
  }

  function updateModalCompleteButton() {
    if (!elements.btnToggleCompleteVideo || !state.currentVideoItem) return;
    const isComp = state.completedIds.has(state.currentVideoItem.id);
    if (isComp) {
      elements.btnToggleCompleteVideo.classList.add('primary');
      elements.btnToggleCompleteVideo.textContent = 'Completed';
    } else {
      elements.btnToggleCompleteVideo.classList.remove('primary');
      elements.btnToggleCompleteVideo.textContent = 'Mark Complete';
    }
  }

  // Filter Items
  function getFilteredItems() {
    let items = state.course.allItems;

    if (state.activeFilter === 'video') {
      items = items.filter(i => i.type === 'video');
    } else if (state.activeFilter === 'pdf') {
      items = items.filter(i => i.type === 'pdf');
    } else if (state.activeFilter === 'quiz') {
      items = items.filter(i => i.type === 'quiz');
    } else if (state.activeFilter === 'completed') {
      items = items.filter(i => state.completedIds.has(i.id));
    }

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      items = items.filter(i => 
        i.title.toLowerCase().includes(q) ||
        i.lectureTopic.toLowerCase().includes(q) ||
        i.sourceId.toLowerCase().includes(q) ||
        i.id.includes(q)
      );
    }

    return items;
  }

  // Render Content (Modules or Grid)
  function renderContent() {
    const filteredItems = getFilteredItems();

    if (filteredItems.length === 0) {
      elements.contentContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--yellow-border);">
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--yellow-primary); text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.05em;">Search Result</div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #FFF; margin-bottom: 0.35rem;">No matching materials found</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 360px; margin: 0 auto 1.25rem;">
            Check your search spelling or clear the current category filter.
          </p>
          <button class="btn-action-primary" id="btnResetFilters">Clear Search</button>
        </div>
      `;
      document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        state.activeFilter = 'all';
        state.searchQuery = '';
        if (elements.headerSearchInput) elements.headerSearchInput.value = '';
        if (elements.mobileSearchInput) elements.mobileSearchInput.value = '';
        elements.filterPills.forEach(p => p.classList.toggle('active', p.dataset.filter === 'all'));
        renderContent();
      });
      return;
    }

    if (state.activeView === 'grid') {
      renderGridView(filteredItems);
    } else {
      renderLectureView(filteredItems);
    }
  }

  // Render Grid View
  function renderGridView(items) {
    const cardsHtml = items.map(item => createResourceCardHtml(item)).join('');
    elements.contentContainer.innerHTML = `
      <div class="resources-grid-view">
        ${cardsHtml}
      </div>
    `;
    attachResourceCardEvents();
  }

  // Render Lecture Accordion View
  function renderLectureView(filteredItems) {
    const lectureGroups = {};
    state.course.lectures.forEach(lec => {
      lectureGroups[lec.lectureNumber] = {
        meta: lec,
        items: []
      };
    });

    filteredItems.forEach(item => {
      if (lectureGroups[item.lectureNumber]) {
        lectureGroups[item.lectureNumber].items.push(item);
      }
    });

    const accordionsHtml = state.course.lectures.map(lec => {
      const group = lectureGroups[lec.lectureNumber];
      if (!group || group.items.length === 0) return '';

      const videoCount = group.items.filter(i => i.type === 'video').length;
      const pdfCount = group.items.filter(i => i.type === 'pdf').length;
      const quizCount = group.items.filter(i => i.type === 'quiz').length;
      const completedInGroup = group.items.filter(i => state.completedIds.has(i.id)).length;
      const isAllCompleted = completedInGroup === group.items.length;

      const itemsListHtml = group.items.map(item => createResourceCardHtml(item)).join('');

      return `
        <div class="lecture-module-card expanded" data-lecture="${lec.lectureNumber}">
          <div class="lecture-header" data-toggle-lecture="${lec.lectureNumber}">
            <div class="lecture-header-left">
              <div class="lecture-index-circle" style="${isAllCompleted ? 'background: rgba(16, 185, 129, 0.2); border-color: var(--color-completed); color: var(--color-completed);' : ''}">
                ${isAllCompleted ? '✓' : lec.lectureNumber}
              </div>
              <div class="lecture-title-box">
                <div class="lecture-title-text">${lec.title}</div>
                <div class="lecture-subtitle-text">${group.items.length} items • ${completedInGroup}/${group.items.length} Completed</div>
              </div>
            </div>
            <div class="lecture-header-right">
              <div class="lecture-badges-summary">
                ${videoCount > 0 ? `<span class="badge-count-tag video">${videoCount} Video</span>` : ''}
                ${pdfCount > 0 ? `<span class="badge-count-tag pdf">${pdfCount} PDFs</span>` : ''}
                ${quizCount > 0 ? `<span class="badge-count-tag quiz">${quizCount} Quiz</span>` : ''}
              </div>
              <div class="accordion-chevron">${icons.chevronDown}</div>
            </div>
          </div>
          <div class="lecture-items-list">
            ${itemsListHtml}
          </div>
        </div>
      `;
    }).filter(Boolean).join('');

    elements.contentContainer.innerHTML = accordionsHtml;
    attachAccordionEvents();
    attachResourceCardEvents();
  }

  // Create Resource Card HTML (PDFs direct download, clean text labels)
  function createResourceCardHtml(item) {
    const isCompleted = state.completedIds.has(item.id);
    let icon = icons.pdf;
    let actionButtonsHtml = '';

    if (item.type === 'video') {
      icon = icons.video;
      actionButtonsHtml = `
        <button class="btn-action-primary" data-play-video="${item.id}">
          ${icons.play} Watch
        </button>
        <a href="${item.smartProxyDl}" target="_blank" download class="btn-action-outline" title="Download Video">
          ${icons.download} Download
        </a>
        <a href="${item.vlcUrl}" class="btn-action-outline" title="VLC Player">
          VLC
        </a>
      `;
    } else if (item.type === 'pdf') {
      icon = icons.pdf;
      actionButtonsHtml = `
        <a href="${item.smartProxyDl}" target="_blank" download class="btn-action-primary" title="Direct Download Class PDF">
          ${icons.download} Download PDF
        </a>
      `;
    } else if (item.type === 'quiz') {
      icon = icons.quiz;
      actionButtonsHtml = `
        <button class="btn-action-primary" data-open-quiz="${item.id}">
          ${icons.play} Quiz
        </button>
        <a href="${item.smartProxyDl}" target="_blank" download class="btn-action-outline" title="Download Quiz HTML">
          ${icons.download} Download
        </a>
      `;
    }

    return `
      <div class="resource-card ${isCompleted ? 'completed' : ''}" data-item-id="${item.id}">
        <div class="resource-left">
          <div class="resource-icon-badge ${item.type}">
            ${icon}
          </div>
          <div class="resource-info">
            <div class="resource-title">${item.title}</div>
            <div class="resource-meta-row">
              <span class="tag-source-id">${item.sourceId}</span>
              <span>Lec ${item.lectureNumber}</span>
            </div>
          </div>
        </div>
        <div class="resource-actions">
          ${actionButtonsHtml}
          <button class="btn-check-complete ${isCompleted ? 'completed' : ''}" data-toggle-complete="${item.id}" title="${isCompleted ? 'Mark incomplete' : 'Mark completed'}">
            ${icons.check}
          </button>
        </div>
      </div>
    `;
  }

  // Attach Accordion Handlers
  function attachAccordionEvents() {
    document.querySelectorAll('[data-toggle-lecture]').forEach(header => {
      header.addEventListener('click', () => {
        const card = header.closest('.lecture-module-card');
        card.classList.toggle('expanded');
      });
    });
  }

  // Attach Resource Card Handlers
  function attachResourceCardEvents() {
    document.querySelectorAll('[data-play-video]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-play-video');
        const item = state.course.allItems.find(i => i.id === id);
        if (item) openCinemaPlayer(item);
      });
    });

    document.querySelectorAll('[data-open-quiz]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-open-quiz');
        const item = state.course.allItems.find(i => i.id === id);
        if (item) openQuizModal(item);
      });
    });

    document.querySelectorAll('[data-toggle-complete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-toggle-complete');
        toggleComplete(id, e);
      });
    });
  }

  // =========================================================================
  // CINEMA PLAYER (Pure HTML5 Video Player)
  // =========================================================================
  function showVideoLoading(show, title = 'The video is loading, please have patience', subtitle = 'Connecting to high-speed proxy stream. It may take 5 to 15 seconds to buffer.') {
    if (!elements.videoLoadingNotice) return;
    if (show) {
      const t = elements.videoLoadingNotice.querySelector('.loading-notice-title');
      const s = elements.videoLoadingNotice.querySelector('.loading-notice-subtitle');
      if (t) t.textContent = title;
      if (s) s.textContent = subtitle;
      elements.videoLoadingNotice.classList.add('active');
    } else {
      elements.videoLoadingNotice.classList.remove('active');
    }
  }

  function openCinemaPlayer(videoItem) {
    state.currentVideoItem = videoItem;
    localStorage.setItem('parmar_gk_last_watched', videoItem.id);

    elements.videoModalTitle.textContent = `Lecture ${videoItem.lectureNumber}`;
    elements.playerLectureTitle.textContent = videoItem.title;
    elements.playerMetaDetails.textContent = `${videoItem.sourceId} • ${videoItem.lectureTopic}`;

    // Action Links
    elements.btnDownloadVideo.href = videoItem.smartProxyDl;
    elements.btnPlayVlc.href = videoItem.vlcUrl;
    elements.btnPlayMx.href = videoItem.mxPlayerUrl;

    if (elements.btnFallbackDl) elements.btnFallbackDl.href = videoItem.smartProxyDl;
    if (elements.btnFallbackVlc) elements.btnFallbackVlc.href = videoItem.vlcUrl;
    if (elements.btnFallbackMx) elements.btnFallbackMx.href = videoItem.mxPlayerUrl;
    if (elements.btnFallbackWeb) elements.btnFallbackWeb.href = videoItem.streamUrl || videoItem.smartProxyWatch || videoItem.smartProxyDl;

    updateModalCompleteButton();
    renderPlayerCompanionMaterials(videoItem);

    // Prompt loading state notice
    showVideoLoading(true, 'The video is loading, please have patience', 'Connecting to high-speed proxy stream. It may take 5 to 15 seconds to buffer.');
    showToast('The video is loading, please have patience', 3500);

    // Direct HTML5 Video Stream
    elements.videoNative.src = videoItem.smartProxyDl;
    elements.videoNative.load();
    elements.videoNative.play().catch(() => {});

    elements.videoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function renderPlayerCompanionMaterials(videoItem) {
    if (!elements.companionList) return;
    const siblings = state.course.allItems.filter(i => 
      i.lectureNumber === videoItem.lectureNumber && i.id !== videoItem.id
    );

    if (siblings.length === 0) {
      elements.companionList.innerHTML = `<div style="font-size: 0.78rem; color: var(--text-muted); padding: 0.35rem;">No additional materials for this lecture.</div>`;
      return;
    }

    elements.companionList.innerHTML = siblings.map(s => {
      let icon = s.type === 'pdf' ? icons.pdf : icons.quiz;

      if (s.type === 'pdf') {
        // PDF is direct download only
        return `
          <div class="companion-item">
            <div class="companion-item-left">
              <span style="color: var(--color-pdf); flex-shrink: 0;">${icon}</span>
              <span class="companion-item-title" title="${s.title}">
                ${s.title}
              </span>
            </div>
            <div class="companion-actions">
              <a href="${s.smartProxyDl}" target="_blank" download class="btn-player-mini primary" title="Download PDF">
                ${icons.download} Download PDF
              </a>
            </div>
          </div>
        `;
      } else {
        // Quiz is interactive runner + DL
        return `
          <div class="companion-item">
            <div class="companion-item-left">
              <span style="color: var(--color-quiz); flex-shrink: 0;">${icon}</span>
              <span class="companion-item-title" title="${s.title}">
                ${s.title}
              </span>
            </div>
            <div class="companion-actions">
              <button class="btn-player-mini primary" data-companion-open-quiz="${s.id}">Quiz</button>
              <a href="${s.smartProxyDl}" target="_blank" download class="btn-player-mini" title="Download">
                ${icons.download}
              </a>
            </div>
          </div>
        `;
      }
    }).join('');

    elements.companionList.querySelectorAll('[data-companion-open-quiz]').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.companionOpenQuiz;
        const item = state.course.allItems.find(i => i.id === id);
        if (item) openQuizModal(item);
      });
    });
  }

  function closeCinemaPlayer() {
    elements.videoModal.classList.remove('active');
    document.body.style.overflow = '';
    elements.videoNative.pause();
    elements.videoNative.src = '';
    showVideoLoading(false);
  }

  // Native Video Player Event Listeners (Loading, Buffering, Errors)
  if (elements.videoNative) {
    elements.videoNative.addEventListener('loadstart', () => {
      showVideoLoading(true);
    });
    elements.videoNative.addEventListener('waiting', () => {
      showVideoLoading(true, 'The video is loading, please have patience', 'Buffering high-speed proxy stream. Please wait a moment.');
    });
    elements.videoNative.addEventListener('canplay', () => {
      showVideoLoading(false);
    });
    elements.videoNative.addEventListener('playing', () => {
      showVideoLoading(false);
    });
    elements.videoNative.addEventListener('error', () => {
      showVideoLoading(true, 'Video stream requires direct playback', 'The proxy stream is taking longer or requires direct playback. Click below to download or stream in VLC / MX Player.');
    });
  }

  function navigateVideo(direction) {
    const allVideos = state.course.allItems.filter(i => i.type === 'video');
    if (allVideos.length === 0 || !state.currentVideoItem) return;

    const currentIndex = allVideos.findIndex(v => v.id === state.currentVideoItem.id);
    let nextIndex = currentIndex + direction;

    if (nextIndex < 0) nextIndex = allVideos.length - 1;
    if (nextIndex >= allVideos.length) nextIndex = 0;

    openCinemaPlayer(allVideos[nextIndex]);
    showToast(`Loaded Lecture ${allVideos[nextIndex].lectureNumber}`);
  }

  // =========================================================================
  // QUIZ MODAL
  // =========================================================================
  function openQuizModal(item) {
    elements.quizModalTitle.textContent = item.title;
    elements.btnDownloadQuiz.href = item.smartProxyDl;
    elements.btnOpenQuizTab.href = item.smartProxyDl;

    elements.quizIframe.src = item.smartProxyDl;

    elements.quizModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeQuizModal() {
    elements.quizModal.classList.remove('active');
    document.body.style.overflow = '';
    elements.quizIframe.src = '';
  }

  // =========================================================================
  // EVENT LISTENERS & SETUP
  // =========================================================================

  // Filter Pills Click
  elements.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      elements.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.dataset.filter;
      renderContent();
    });
  });

  // View Mode Buttons (Lecture vs Grid)
  elements.viewModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.viewModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeView = btn.dataset.view;
      renderContent();
    });
  });

  // Search Inputs
  const handleSearch = (e) => {
    state.searchQuery = e.target.value;
    if (elements.headerSearchInput && elements.headerSearchInput !== e.target) {
      elements.headerSearchInput.value = state.searchQuery;
    }
    if (elements.mobileSearchInput && elements.mobileSearchInput !== e.target) {
      elements.mobileSearchInput.value = state.searchQuery;
    }
    renderContent();
  };
  elements.headerSearchInput?.addEventListener('input', handleSearch);
  elements.mobileSearchInput?.addEventListener('input', handleSearch);

  // Video Navigation
  elements.btnPrevVideo?.addEventListener('click', () => navigateVideo(-1));
  elements.btnNextVideo?.addEventListener('click', () => navigateVideo(1));

  elements.btnToggleCompleteVideo?.addEventListener('click', () => {
    if (state.currentVideoItem) {
      toggleComplete(state.currentVideoItem.id);
    }
  });

  // =========================================================================
  // WHATSAPP CHANNEL MODAL
  // =========================================================================
  function openWhatsappModal() {
    if (elements.whatsappModal) {
      elements.whatsappModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeWhatsappModal() {
    if (elements.whatsappModal) {
      elements.whatsappModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  elements.btnJoinWhatsapp?.addEventListener('click', () => {
    sessionStorage.setItem('parmar_gk_wa_dismissed', 'true');
    closeWhatsappModal();
  });

  elements.btnAlreadyJoinedWhatsapp?.addEventListener('click', () => {
    sessionStorage.setItem('parmar_gk_wa_dismissed', 'true');
    closeWhatsappModal();
    showToast('Welcome back to the batch portal');
  });

  elements.whatsappModalClose?.addEventListener('click', closeWhatsappModal);
  elements.btnHeaderWhatsapp?.addEventListener('click', openWhatsappModal);
  elements.floatingWhatsappBtn?.addEventListener('click', openWhatsappModal);

  // Modal Closers
  elements.videoModalClose?.addEventListener('click', closeCinemaPlayer);
  elements.quizModalClose?.addEventListener('click', closeQuizModal);

  [elements.videoModal, elements.quizModal, elements.whatsappModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal === elements.videoModal) closeCinemaPlayer();
        else if (modal === elements.quizModal) closeQuizModal();
        else if (modal === elements.whatsappModal) closeWhatsappModal();
      }
    });
  });

  // Trigger WhatsApp channel popup on visit
  setTimeout(openWhatsappModal, 600);

  // Mobile Bottom Navigation Tabs (Lectures, Videos, PDFs, Quizzes)
  document.querySelectorAll('.mobile-nav-item').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.mobile-nav-item').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const action = tab.dataset.nav;
      if (action === 'lectures') {
        state.activeFilter = 'all';
        state.activeView = 'lecture';
        elements.filterPills.forEach(p => p.classList.toggle('active', p.dataset.filter === 'all'));
        renderContent();
        window.scrollTo({ top: 320, behavior: 'smooth' });
      } else if (action === 'videos') {
        state.activeFilter = 'video';
        elements.filterPills.forEach(p => p.classList.toggle('active', p.dataset.filter === 'video'));
        renderContent();
        window.scrollTo({ top: 320, behavior: 'smooth' });
      } else if (action === 'pdfs') {
        state.activeFilter = 'pdf';
        elements.filterPills.forEach(p => p.classList.toggle('active', p.dataset.filter === 'pdf'));
        renderContent();
        window.scrollTo({ top: 320, behavior: 'smooth' });
      } else if (action === 'quizzes') {
        state.activeFilter = 'quiz';
        elements.filterPills.forEach(p => p.classList.toggle('active', p.dataset.filter === 'quiz'));
        renderContent();
        window.scrollTo({ top: 320, behavior: 'smooth' });
      }
    });
  });

  // Header Scroll Effect
  window.addEventListener('scroll', () => {
    const header = document.querySelector('.site-header');
    if (header) {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  });

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCinemaPlayer();
      closeQuizModal();
      closeWhatsappModal();
    }
    if (elements.videoModal.classList.contains('active')) {
      if (e.key === 'ArrowRight' && !e.target.matches('input, textarea')) {
        navigateVideo(1);
      } else if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea')) {
        navigateVideo(-1);
      }
    }
  });

  // Native Video Player Ended -> Auto Advance
  elements.videoNative?.addEventListener('ended', () => {
    showToast('Video completed. Playing next lecture...');
    if (state.currentVideoItem) {
      state.completedIds.add(state.currentVideoItem.id);
      localStorage.setItem('parmar_gk_completed_items', JSON.stringify(Array.from(state.completedIds)));
      renderContent();
    }
    setTimeout(() => navigateVideo(1), 1200);
  });

  // =========================================================================
  // PWA SERVICE WORKER & INSTALLATION
  // =========================================================================
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
        .catch(err => console.log('[PWA] Service Worker registration failed:', err));
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
    if (elements.btnInstallHeader) {
      elements.btnInstallHeader.style.display = 'inline-flex';
    }
  });

  elements.btnInstallHeader?.addEventListener('click', async () => {
    if (state.deferredPrompt) {
      state.deferredPrompt.prompt();
      const choiceResult = await state.deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showToast('Thank you for installing the app');
      }
      state.deferredPrompt = null;
    } else {
      showToast('Tap Add to Home Screen in your browser menu');
    }
  });

  window.addEventListener('offline', () => {
    if (elements.offlineBanner) elements.offlineBanner.style.display = 'block';
    showToast('Offline Mode Active', 4000);
  });

  window.addEventListener('online', () => {
    if (elements.offlineBanner) elements.offlineBanner.style.display = 'none';
    showToast('Connection Restored');
  });

  // Initial Content Render
  renderContent();
  console.log('𝑷𝑨𝑹𝑴𝑨𝑹\'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯 - Web App Initialized (V2.2).');
});
