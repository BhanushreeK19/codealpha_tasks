/* =========================================
   SocialSphere - Main Application JS
   ========================================= */

// Global state
let currentUser = null;
let currentPage = 1;
let currentSection = 'feed';
let editingPostId = null;
let postsPage = { feed: 1, explore: 1, profile: 1 };
let loadingPosts = false;
let profileUsername = null;

// ==================== INIT ====================
window.addEventListener('DOMContentLoaded', async () => {
  loadTheme();
  await loadCurrentUser();
  routeFromURL();
  window.addEventListener('popstate', routeFromURL);
});

async function loadCurrentUser() {
  try {
    const res = await fetch('/api/users/me');
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      updateSidebarUser();
    }
  } catch (e) { console.error(e); }
}

function updateSidebarUser() {
  if (!currentUser) return;
  document.getElementById('sidebarName').textContent = currentUser.full_name || currentUser.username;
  document.getElementById('sidebarHandle').textContent = '@' + currentUser.username;
  const wrap = document.getElementById('sidebarAvatarWrap');
  wrap.innerHTML = '';
  if (currentUser.profile_picture && currentUser.profile_picture !== 'default-avatar.png') {
    wrap.innerHTML = `<img src="/uploads/${currentUser.profile_picture}" class="avatar avatar-sm" alt="avatar" onerror="this.parentNode.textContent='${getInitials(currentUser.full_name || currentUser.username)}'">`;
  } else {
    wrap.textContent = getInitials(currentUser.full_name || currentUser.username);
  }
}

function routeFromURL() {
  const path = window.location.pathname;
  if (path.startsWith('/profile/')) {
    const username = path.split('/profile/')[1];
    loadProfile(username);
  } else if (path === '/explore') {
    loadExplore();
  } else if (path === '/search') {
    loadPeople();
  } else if (path === '/settings') {
    loadSettings();
  } else {
    loadFeed();
  }
}

// ==================== NAVIGATION ====================
function navigate(section, e) {
  if (e) e.preventDefault();
  let url = '/feed';
  if (section === 'explore') url = '/explore';
  else if (section === 'search') url = '/search';
  else if (section === 'settings') url = '/settings';
  history.pushState({}, '', url);
  routeFromURL();
}

function navigateToMyProfile(e) {
  if (e) e.preventDefault();
  if (currentUser) {
    history.pushState({}, '', `/profile/${currentUser.username}`);
    loadProfile(currentUser.username);
  }
}

function setActiveNav(section) {
  document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`nav-${section}`);
  const mel = document.getElementById(`mnav-${section}`);
  if (el) el.classList.add('active');
  if (mel) mel.classList.add('active');
}

// ==================== FEED ====================
async function loadFeed() {
  setActiveNav('feed');
  document.getElementById('pageTitle').textContent = 'Home';
  postsPage.feed = 1;

  document.getElementById('contentBody').innerHTML = `
    <div id="composerWrap"></div>
    <div id="feedPosts"></div>
    <div id="feedLoader" class="loading-center" style="display:none;"><div class="spinner"></div></div>
    <div id="feedEnd" style="display:none;text-align:center;padding:1.5rem;color:var(--color-text-light);font-size:0.9rem;">You're all caught up! 🎉</div>
    <div id="loadMoreWrap" style="text-align:center;padding:1rem;display:none;">
      <button class="btn btn-outline" onclick="loadMoreFeed()">Load more</button>
    </div>
  `;

  renderComposer();
  loadRightPanel();
  await fetchFeedPosts(1);
}

function renderComposer() {
  document.getElementById('composerWrap').innerHTML = `
    <div class="post-composer">
      <div class="composer-top">
        <div class="avatar-placeholder avatar-md" style="font-size:1rem;">${getInitials(currentUser?.full_name || currentUser?.username || '?')}</div>
        <textarea class="composer-textarea" id="composerText" placeholder="What's on your mind, ${currentUser?.full_name?.split(' ')[0] || 'there'}?" maxlength="2000" oninput="updateCharCount()"></textarea>
      </div>
      <div class="composer-image-preview" id="composerImgPreview">
        <img id="composerImgPreviewImg" src="" alt="preview" />
        <button class="remove-image-btn" onclick="removeComposerImage()">✕</button>
      </div>
      <div class="composer-footer">
        <div class="composer-actions">
          <button class="composer-action-btn" onclick="document.getElementById('postImageInput').click()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Photo
          </button>
          <input type="file" id="postImageInput" accept="image/*" style="display:none" onchange="previewComposerImage(this)" />
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span class="char-count" id="charCount">0/2000</span>
          <button class="btn btn-primary btn-sm" onclick="createPost()" id="postSubmitBtn">Post</button>
        </div>
      </div>
    </div>
  `;
}

function updateCharCount() {
  const text = document.getElementById('composerText').value;
  const counter = document.getElementById('charCount');
  counter.textContent = `${text.length}/2000`;
  counter.className = 'char-count';
  if (text.length > 1800) counter.classList.add('warning');
  if (text.length > 1950) { counter.classList.remove('warning'); counter.classList.add('danger'); }
}

function previewComposerImage(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('composerImgPreviewImg').src = e.target.result;
      document.getElementById('composerImgPreview').style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function removeComposerImage() {
  document.getElementById('composerImgPreview').style.display = 'none';
  document.getElementById('composerImgPreviewImg').src = '';
  document.getElementById('postImageInput').value = '';
}

async function createPost() {
  const content = document.getElementById('composerText').value.trim();
  if (!content) { showToast('Write something first!', 'error'); return; }

  const btn = document.getElementById('postSubmitBtn');
  btn.disabled = true; btn.textContent = 'Posting...';

  const formData = new FormData();
  formData.append('content', content);
  const imgInput = document.getElementById('postImageInput');
  if (imgInput.files[0]) formData.append('image', imgInput.files[0]);

  try {
    const res = await fetch('/api/posts', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      document.getElementById('composerText').value = '';
      removeComposerImage();
      updateCharCount();
      const feedPosts = document.getElementById('feedPosts');
      const postEl = createPostElement(data.post);
      feedPosts.insertBefore(postEl, feedPosts.firstChild);
      showToast('Post created! 🎉', 'success');
    } else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Failed to post', 'error'); }
  btn.disabled = false; btn.textContent = 'Post';
}

async function fetchFeedPosts(page) {
  if (loadingPosts) return;
  loadingPosts = true;
  document.getElementById('feedLoader').style.display = 'flex';

  try {
    const res = await fetch(`/api/posts?page=${page}`);
    const data = await res.json();
    if (data.success) {
      const container = document.getElementById('feedPosts');
      if (data.posts.length === 0 && page === 1) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🌱</div><h3>Your feed is empty</h3><p>Follow some people to see their posts here!</p><button class="btn btn-primary" style="margin-top:1rem" onclick="navigate('search',event)">Find People</button></div>`;
      } else {
        data.posts.forEach(p => container.appendChild(createPostElement(p)));
        if (data.pagination.page < data.pagination.totalPages) {
          document.getElementById('loadMoreWrap').style.display = 'block';
          postsPage.feed = page;
        } else {
          document.getElementById('loadMoreWrap').style.display = 'none';
          if (page > 1) document.getElementById('feedEnd').style.display = 'block';
        }
      }
    }
  } catch (e) { showToast('Failed to load feed', 'error'); }
  loadingPosts = false;
  document.getElementById('feedLoader').style.display = 'none';
}

async function loadMoreFeed() {
  document.getElementById('loadMoreWrap').style.display = 'none';
  await fetchFeedPosts(postsPage.feed + 1);
}

// ==================== EXPLORE ====================
async function loadExplore() {
  setActiveNav('explore');
  document.getElementById('pageTitle').textContent = 'Explore';
  postsPage.explore = 1;

  document.getElementById('contentBody').innerHTML = `
    <div id="explorePosts"></div>
    <div id="exploreLoader" class="loading-center" style="display:none;"><div class="spinner"></div></div>
    <div id="exploreLoadMoreWrap" style="text-align:center;padding:1rem;display:none;">
      <button class="btn btn-outline" onclick="loadMoreExplore()">Load more</button>
    </div>
  `;

  loadRightPanel();
  await fetchExplorePosts(1);
}

async function fetchExplorePosts(page) {
  if (loadingPosts) return;
  loadingPosts = true;
  const loader = document.getElementById('exploreLoader');
  if (loader) loader.style.display = 'flex';

  try {
    const res = await fetch(`/api/posts/explore?page=${page}`);
    const data = await res.json();
    if (data.success) {
      const container = document.getElementById('explorePosts');
      if (data.posts.length === 0 && page === 1) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No posts yet</h3><p>Be the first to post something!</p></div>`;
      } else {
        data.posts.forEach(p => container.appendChild(createPostElement(p)));
        const lmw = document.getElementById('exploreLoadMoreWrap');
        if (data.pagination.page < data.pagination.totalPages) {
          lmw.style.display = 'block';
          postsPage.explore = page;
        } else { lmw.style.display = 'none'; }
      }
    }
  } catch (e) { showToast('Failed to load posts', 'error'); }
  loadingPosts = false;
  if (loader) loader.style.display = 'none';
}

async function loadMoreExplore() {
  document.getElementById('exploreLoadMoreWrap').style.display = 'none';
  await fetchExplorePosts(postsPage.explore + 1);
}

// ==================== PROFILE ====================
async function loadProfile(username) {
  setActiveNav('profile');
  profileUsername = username;
  document.getElementById('pageTitle').textContent = 'Profile';
  document.getElementById('contentBody').innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  try {
    const res = await fetch(`/api/users/${username}`);
    const data = await res.json();
    if (!data.success) {
      document.getElementById('contentBody').innerHTML = `<div class="empty-state"><div class="empty-state-icon">😕</div><h3>User not found</h3></div>`;
      return;
    }

    const { user, posts, pagination } = data;

    document.getElementById('contentBody').innerHTML = `
      <div class="profile-header">
        <div class="profile-cover"></div>
        <div class="profile-info">
          <div class="profile-top-row">
            <div class="profile-avatar-wrap">
              ${user.profile_picture && user.profile_picture !== 'default-avatar.png'
        ? `<img src="/uploads/${user.profile_picture}" class="profile-avatar" alt="avatar" onerror="this.style.display='none'">`
        : `<div class="avatar-placeholder avatar-2xl" style="font-size:2rem;border:4px solid var(--color-surface);">${getInitials(user.full_name || user.username)}</div>`
      }
            </div>
            <div style="padding-top:1rem;">
              ${user.isOwnProfile
        ? `<button class="btn btn-outline btn-sm" onclick="openEditProfile()">Edit Profile</button>`
        : `<button class="btn ${user.isFollowing ? 'btn-outline' : 'btn-primary'} btn-sm" id="followBtn" onclick="toggleFollow('${user.username}')">
                    ${user.isFollowing ? 'Following' : 'Follow'}
                  </button>`
      }
            </div>
          </div>

          <div class="profile-name">${escHtml(user.full_name || user.username)}</div>
          <div class="profile-username">@${escHtml(user.username)}</div>
          ${user.bio ? `<div class="profile-bio">${escHtml(user.bio)}</div>` : ''}

          <div class="profile-meta">
            ${user.location ? `<span class="profile-meta-item"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>${escHtml(user.location)}</span>` : ''}
            ${user.website ? `<span class="profile-meta-item"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg><a href="${escHtml(user.website)}" target="_blank" rel="noopener">${escHtml(user.website)}</a></span>` : ''}
            <span class="profile-meta-item"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>Joined ${formatDate(user.createdAt)}</span>
          </div>

          <div class="profile-stats">
            <div class="profile-stat">
              <div class="profile-stat-count">${pagination.totalPosts}</div>
              <div class="profile-stat-label">Posts</div>
            </div>
            <div class="profile-stat clickable-stat"
              onclick="showFollowers('${user.username}')">
              <div class="profile-stat-count" id="followerCount">${user.followerCount}</div>
              <div class="profile-stat-label">Followers</div>
            </div>

            <div class="profile-stat clickable-stat"
              onclick="showFollowing('${user.username}')">
              <div class="profile-stat-count">${user.followingCount}</div>
              <div class="profile-stat-label">Following</div>
            </div>
          </div>
        </div>
      </div>

      <div id="profilePosts"></div>
      <div style="text-align:center;padding:1rem;display:${pagination.page < pagination.totalPages ? 'block' : 'none'};" id="profileLoadMoreWrap">
        <button class="btn btn-outline" onclick="loadMoreProfile('${user.username}')">Load more</button>
      </div>
    `;

    postsPage.profile = 1;
    const container = document.getElementById('profilePosts');
    if (posts.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✍️</div><h3>No posts yet</h3><p>${user.isOwnProfile ? "Share your first post!" : `${user.full_name || user.username} hasn't posted yet.`}</p></div>`;
    } else {
      posts.forEach(p => container.appendChild(createPostElement(p)));
    }

    loadRightPanel();
  } catch (e) { console.error(e); showToast('Failed to load profile', 'error'); }
}

async function loadMoreProfile(username) {
  document.getElementById('profileLoadMoreWrap').style.display = 'none';
  postsPage.profile++;
  try {
    const res = await fetch(`/api/users/${username}?page=${postsPage.profile}`);
    const data = await res.json();
    if (data.success) {
      const container = document.getElementById('profilePosts');
      data.posts.forEach(p => container.appendChild(createPostElement(p)));
      if (data.pagination.page < data.pagination.totalPages) {
        document.getElementById('profileLoadMoreWrap').style.display = 'block';
      }
    }
  } catch (e) { }
}

async function toggleFollow(username) {
  const btn = document.getElementById('followBtn');
  if (!btn) return;
  btn.disabled = true;

  try {
    const res = await fetch(`/api/users/${username}/follow`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      btn.textContent = data.following ? 'Following' : 'Follow';
      btn.className = `btn ${data.following ? 'btn-outline' : 'btn-primary'} btn-sm`;
      const countEl = document.getElementById('followerCount');
      if (countEl) countEl.textContent = data.followerCount;
    }
  } catch (e) { showToast('Failed to update follow', 'error'); }
  btn.disabled = false;
}



// ==================== PEOPLE / SEARCH ====================
async function loadPeople() {
  setActiveNav('search');
  document.getElementById('pageTitle').textContent = 'Find People';

  document.getElementById('contentBody').innerHTML = `
    <div class="search-bar" style="margin-bottom:1.5rem;">
      <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" class="search-input" id="peopleSearchInput" placeholder="Search by name or username..." oninput="debounceSearch(this.value)" autofocus />
    </div>
    <div id="searchResults"></div>
  `;

  loadRightPanel();
}

let searchTimeout;
function debounceSearch(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => searchPeople(val), 350);
}

async function searchPeople(query) {
  const container = document.getElementById('searchResults');
  if (!query.trim()) { container.innerHTML = ''; return; }

  container.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  try {
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.success) {
      if (data.users.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><h3>No users found</h3><p>Try a different search term</p></div>`;
      } else {
        container.innerHTML = data.users.map(u => `
          <div class="panel-card" style="display:flex;align-items:center;gap:1rem;margin-bottom:0.75rem;padding:1rem;">
            <a href="/profile/${u.username}" onclick="navigate_profile('${u.username}',event)">
              <div class="avatar-placeholder avatar-md" style="font-size:1rem;">${getInitials(u.full_name || u.username)}</div>
            </a>
            <div style="flex:1;min-width:0;">
              <a href="/profile/${u.username}" onclick="navigate_profile('${u.username}',event)" style="font-weight:600;color:var(--color-text);text-decoration:none;display:block;">${escHtml(u.full_name || u.username)}</a>
              <div style="font-size:0.82rem;color:var(--color-text-secondary);">@${escHtml(u.username)}</div>
              ${u.bio ? `<div style="font-size:0.85rem;color:var(--color-text-secondary);margin-top:0.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(u.bio)}</div>` : ''}
            </div>
            <button class="btn ${u.isFollowing ? 'btn-outline' : 'btn-primary'} btn-sm" onclick="quickFollow('${u.username}', this)">${u.isFollowing ? 'Following' : 'Follow'}</button>
          </div>
        `).join('');
      }
    }
  } catch (e) { container.innerHTML = '<div class="empty-state"><p>Search failed. Try again.</p></div>'; }
}

function navigate_profile(username, e) {
  if (e) e.preventDefault();
  history.pushState({}, '', `/profile/${username}`);
  loadProfile(username);
}

async function quickFollow(username, btn) {
  btn.disabled = true;
  try {
    const res = await fetch(`/api/users/${username}/follow`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      btn.textContent = data.following ? 'Following' : 'Follow';
      btn.className = `btn ${data.following ? 'btn-outline' : 'btn-primary'} btn-sm`;
    }
  } catch (e) { }
  btn.disabled = false;
}

// ==================== SETTINGS ====================
async function loadSettings() {
  setActiveNav('settings');
  document.getElementById('pageTitle').textContent = 'Settings';

  document.getElementById('contentBody').innerHTML = `
    <div class="settings-layout">
      <nav class="settings-nav">
        <button class="settings-nav-item active" onclick="showSettingsTab('profile',this)">👤 Profile</button>
        <button class="settings-nav-item" onclick="showSettingsTab('account',this)">🔐 Account</button>
        <button class="settings-nav-item" onclick="showSettingsTab('appearance',this)">🎨 Appearance</button>
      </nav>
      <div>
        <div id="settings-profile" class="settings-section active">
          <div class="settings-card">
            <h3 class="settings-card-title">Edit Profile</h3>
            <form id="profileForm" onsubmit="saveProfile(event)">
              <div style="text-align:center;margin-bottom:1.5rem;">
                <div class="avatar-placeholder avatar-2xl" style="font-size:2rem;margin:0 auto 0.75rem;" id="settingsAvatarPreview">${getInitials(currentUser?.full_name || currentUser?.username || '?')}</div>
                <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('avatarInput').click()">
                  📷 Change Photo
                </button>
                <input type="file" id="avatarInput" accept="image/*" style="display:none" onchange="previewAvatar(this)" />
              </div>
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-input" id="settingsName" value="${escHtml(currentUser?.full_name || '')}" placeholder="Your full name" />
              </div>
              <div class="form-group">
                <label class="form-label">Bio</label>
                <textarea class="form-input" id="settingsBio" placeholder="Tell the world about yourself...">${escHtml(currentUser?.bio || '')}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Location</label>
                <input type="text" class="form-input" id="settingsLocation" value="${escHtml(currentUser?.location || '')}" placeholder="Where are you based?" />
              </div>
              <div class="form-group">
                <label class="form-label">Website</label>
                <input type="url" class="form-input" id="settingsWebsite" value="${escHtml(currentUser?.website || '')}" placeholder="https://yoursite.com" />
              </div>
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </form>
          </div>
        </div>

        <div id="settings-account" class="settings-section">
          <div class="settings-card">
            <h3 class="settings-card-title">Change Password</h3>
            <form id="passwordForm" onsubmit="changePassword(event)">
              <div class="form-group">
                <label class="form-label">Current Password</label>
                <input type="password" class="form-input" id="currentPass" placeholder="••••••••" />
              </div>
              <div class="form-group">
                <label class="form-label">New Password</label>
                <input type="password" class="form-input" id="newPass" placeholder="Min 6 characters" />
              </div>
              <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <input type="password" class="form-input" id="confirmPass" placeholder="••••••••" />
              </div>
              <button type="submit" class="btn btn-primary">Update Password</button>
            </form>
          </div>
          <div class="settings-card" style="margin-top:1rem;">
            <h3 class="settings-card-title">Account Info</h3>
            <p style="font-size:0.9rem;color:var(--color-text-secondary);">Username: <strong>@${escHtml(currentUser?.username || '')}</strong></p>
            <p style="font-size:0.9rem;color:var(--color-text-secondary);margin-top:0.5rem;">Email: <strong>${escHtml(currentUser?.email || '')}</strong></p>
            <p style="font-size:0.9rem;color:var(--color-text-secondary);margin-top:0.5rem;">Member since: <strong>${formatDate(currentUser?.created_at)}</strong></p>
          </div>
        </div>

        <div id="settings-appearance" class="settings-section">
          <div class="settings-card">
            <h3 class="settings-card-title">Appearance</h3>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 0;border-bottom:1px solid var(--color-border);">
              <div>
                <div style="font-weight:600;">Dark Mode</div>
                <div style="font-size:0.85rem;color:var(--color-text-secondary);">Switch between light and dark themes</div>
              </div>
              <label style="position:relative;display:inline-block;width:52px;height:28px;cursor:pointer;">
                <input type="checkbox" id="darkModeToggle" onchange="toggleDarkMode()" style="opacity:0;width:0;height:0;" ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'checked' : ''}>
                <span style="position:absolute;inset:0;background:var(--color-border);border-radius:28px;transition:0.3s;" id="toggleSlider"></span>
                <span style="position:absolute;left:4px;top:4px;width:20px;height:20px;background:white;border-radius:50%;transition:0.3s;transform:${document.documentElement.getAttribute('data-theme') === 'dark' ? 'translateX(24px)' : 'none'};" id="toggleKnob"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Update toggle colors
  updateToggleColors();
}

function updateToggleColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const slider = document.getElementById('toggleSlider');
  const knob = document.getElementById('toggleKnob');
  if (slider) slider.style.background = isDark ? 'var(--color-primary)' : 'var(--color-border)';
  if (knob) knob.style.transform = isDark ? 'translateX(24px)' : 'none';
}

function showSettingsTab(tab, btn) {
  document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`settings-${tab}`).classList.add('active');
  btn.classList.add('active');
}

function previewAvatar(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      const preview = document.getElementById('settingsAvatarPreview');
      preview.innerHTML = `<img src="${e.target.result}" class="avatar avatar-2xl" alt="preview" style="margin:0 auto;display:block;">`;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function saveProfile(e) {
  e.preventDefault();
  const formData = new FormData();
  formData.append('full_name', document.getElementById('settingsName').value);
  formData.append('bio', document.getElementById('settingsBio').value);
  formData.append('location', document.getElementById('settingsLocation').value);
  formData.append('website', document.getElementById('settingsWebsite').value);
  const avatarInput = document.getElementById('avatarInput');
  if (avatarInput.files[0]) formData.append('profile_picture', avatarInput.files[0]);

  try {
    const res = await fetch('/api/users/me/update', { method: 'PUT', body: formData });
    const data = await res.json();
    if (data.success) {
      currentUser = { ...currentUser, ...data.user };
      updateSidebarUser();
      showToast('Profile updated!', 'success');
    } else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Failed to update profile', 'error'); }
}

async function changePassword(e) {
  e.preventDefault();
  const current_password = document.getElementById('currentPass').value;
  const new_password = document.getElementById('newPass').value;
  const confirm = document.getElementById('confirmPass').value;

  if (new_password !== confirm) { showToast('Passwords do not match', 'error'); return; }

  try {
    const res = await fetch('/api/users/me/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password, new_password })
    });
    const data = await res.json();
    if (data.success) { showToast('Password changed!', 'success'); document.getElementById('passwordForm').reset(); }
    else { showToast(data.message, 'error'); }
  } catch (e) { showToast('Failed to change password', 'error'); }
}

// ==================== POST CARD ====================
function createPostElement(post) {
  const div = document.createElement('div');
  div.className = 'post-card';
  div.id = `post-${post.id}`;

  const isOwn = currentUser && post.User?.id === currentUser.id;
  const avatarHtml = (post.User?.profile_picture && post.User.profile_picture !== 'default-avatar.png')
    ? `<img src="/uploads/${post.User.profile_picture}" class="avatar avatar-md" alt="avatar" onerror="this.style.display='none'">`
    : `<div class="avatar-placeholder avatar-md" style="font-size:0.9rem;">${getInitials(post.User?.full_name || post.User?.username || '?')}</div>`;

  const commentsHtml = (post.Comments || []).map(c => renderComment(c)).join('');

  div.innerHTML = `
    <div class="post-header">
      <a href="/profile/${post.User?.username}" onclick="navigate_profile('${post.User?.username}',event)">${avatarHtml}</a>
      <div class="post-author-info">
        <a href="/profile/${post.User?.username}" onclick="navigate_profile('${post.User?.username}',event)" class="post-author-name">${escHtml(post.User?.full_name || post.User?.username || 'Unknown')}</a>
        <div class="post-meta">
          @${escHtml(post.User?.username || '')} · ${timeAgo(post.createdAt)}
          ${post.is_edited ? '<span>· edited</span>' : ''}
        </div>
      </div>
      ${isOwn ? `
        <div class="dropdown" id="postMenu-${post.id}">
          <button class="post-options-btn" onclick="toggleDropdown('postMenu-${post.id}')">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 6c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 6c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>
          </button>
          <div class="dropdown-menu" id="dropdown-postMenu-${post.id}">
            <button class="dropdown-item" onclick="openEditPost(${post.id},'${escHtml(post.content).replace(/'/g, "\\'")}');closeDropdown('postMenu-${post.id}')">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Edit
            </button>
            <button class="dropdown-item danger" onclick="confirmDeletePost(${post.id});closeDropdown('postMenu-${post.id}')">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Delete
            </button>
          </div>
        </div>
      ` : ''}
    </div>

    <div class="post-body">
      <div class="post-content" id="postContent-${post.id}">${escHtml(post.content)}</div>
      ${post.image_url ? `<img src="/uploads/${post.image_url}" class="post-image" alt="post image" loading="lazy">` : ''}
    </div>

    <div class="post-actions">
      <button class="post-action-btn like-btn ${post.liked ? 'liked' : ''}" id="likeBtn-${post.id}" onclick="toggleLike(${post.id})">
        <svg width="20" height="20" fill="${post.liked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" id="likeIcon-${post.id}"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
        <span id="likeCount-${post.id}">${post.likeCount}</span>
      </button>
      <button class="post-action-btn comment-btn" onclick="toggleComments(${post.id})">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        <span id="commentCount-${post.id}">${post.commentCount}</span>
      </button>
    </div>

    <div class="comments-section" id="commentsSection-${post.id}" style="display:none;">
      <div id="commentsList-${post.id}">${commentsHtml}</div>
      <div class="comment-input-row">
        <div class="avatar-placeholder avatar-xs" style="font-size:0.65rem;">${getInitials(currentUser?.full_name || currentUser?.username || '?')}</div>
        <input type="text" class="comment-input" id="commentInput-${post.id}" placeholder="Write a comment..." maxlength="500"
          onkeydown="if(event.key==='Enter')submitComment(${post.id})" />
        <button class="btn btn-primary btn-sm" onclick="submitComment(${post.id})">Send</button>
      </div>
    </div>
  `;

  return div;
}

function renderComment(c) {
  const isOwn = currentUser && c.User?.id === currentUser.id;
  return `
    <div class="comment-item" id="comment-${c.id}">
      <div class="avatar-placeholder avatar-xs" style="font-size:0.65rem;">${getInitials(c.User?.full_name || c.User?.username || '?')}</div>
      <div class="comment-bubble">
        <a href="/profile/${c.User?.username}" onclick="navigate_profile('${c.User?.username}',event)" class="comment-author">${escHtml(c.User?.full_name || c.User?.username || 'Unknown')}</a>
        <div class="comment-content">${escHtml(c.content)}</div>
        <div class="comment-meta">
          ${timeAgo(c.createdAt)}
          ${isOwn ? `<button class="comment-delete-btn" onclick="deleteComment(${c.post_id || 0},${c.id})">Delete</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ==================== POST ACTIONS ====================
async function toggleLike(postId) {
  const btn = document.getElementById(`likeBtn-${postId}`);
  const icon = document.getElementById(`likeIcon-${postId}`);
  const count = document.getElementById(`likeCount-${postId}`);

  try {
    const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      btn.classList.toggle('liked', data.liked);
      icon.setAttribute('fill', data.liked ? 'currentColor' : 'none');
      count.textContent = data.likeCount;
      if (data.liked) btn.classList.add('heart-pop');
      setTimeout(() => btn.classList.remove('heart-pop'), 400);
    }
  } catch (e) { }
}

function toggleComments(postId) {
  const section = document.getElementById(`commentsSection-${postId}`);
  section.style.display = section.style.display === 'none' ? 'block' : 'none';
  if (section.style.display === 'block') document.getElementById(`commentInput-${postId}`)?.focus();
}

async function submitComment(postId) {
  const input = document.getElementById(`commentInput-${postId}`);
  const content = input.value.trim();
  if (!content) return;

  try {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    if (data.success) {
      input.value = '';
      const list = document.getElementById(`commentsList-${postId}`);
      const commentEl = document.createElement('div');
      commentEl.innerHTML = renderComment({ ...data.comment.toJSON ? data.comment.toJSON() : data.comment, post_id: postId });
      list.appendChild(commentEl.firstElementChild);
      const countEl = document.getElementById(`commentCount-${postId}`);
      if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
    }
  } catch (e) { }
}

async function deleteComment(postId, commentId) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      document.getElementById(`comment-${commentId}`)?.remove();
      const countEl = document.getElementById(`commentCount-${postId}`);
      if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
    }
  } catch (e) { }
}

// Edit Post
function openEditPost(postId, content) {
  editingPostId = postId;
  document.getElementById('editPostContent').value = content;
  openModal('editPostModal');
}

async function saveEditPost() {
  const content = document.getElementById('editPostContent').value.trim();
  if (!content) return;

  try {
    const res = await fetch(`/api/posts/${editingPostId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    if (data.success) {
      const el = document.getElementById(`postContent-${editingPostId}`);
      if (el) el.textContent = content;
      closeModal('editPostModal');
      showToast('Post updated!', 'success');
    }
  } catch (e) { showToast('Failed to update post', 'error'); }
}

// Delete Post
function confirmDeletePost(postId) {
  document.getElementById('confirmTitle').textContent = 'Delete Post';
  document.getElementById('confirmMsg').textContent = 'Are you sure you want to delete this post? This cannot be undone.';
  const btn = document.getElementById('confirmActionBtn');
  btn.onclick = () => deletePost(postId);
  openModal('confirmModal');
}

async function deletePost(postId) {
  try {
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      document.getElementById(`post-${postId}`)?.remove();
      closeModal('confirmModal');
      showToast('Post deleted', 'success');
    }
  } catch (e) { showToast('Failed to delete post', 'error'); }
}

// Edit Profile (from profile page)
function openEditProfile() {
  document.getElementById('editProfileContent').innerHTML = `
    <form onsubmit="saveProfileModal(event)">
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" class="form-input" id="modalName" value="${escHtml(currentUser?.full_name || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Bio</label>
        <textarea class="form-input" id="modalBio">${escHtml(currentUser?.bio || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Location</label>
        <input type="text" class="form-input" id="modalLocation" value="${escHtml(currentUser?.location || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Profile Picture</label>
        <input type="file" class="form-input" id="modalAvatar" accept="image/*" />
      </div>
      <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1rem;">
        <button type="button" class="btn btn-ghost" onclick="closeModal('editProfileModal')">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `;
  openModal('editProfileModal');
}

async function saveProfileModal(e) {
  e.preventDefault();
  const formData = new FormData();
  formData.append('full_name', document.getElementById('modalName').value);
  formData.append('bio', document.getElementById('modalBio').value);
  formData.append('location', document.getElementById('modalLocation').value);
  const avatar = document.getElementById('modalAvatar');
  if (avatar.files[0]) formData.append('profile_picture', avatar.files[0]);

  try {
    const res = await fetch('/api/users/me/update', { method: 'PUT', body: formData });
    const data = await res.json();
    if (data.success) {
      currentUser = { ...currentUser, ...data.user };
      updateSidebarUser();
      closeModal('editProfileModal');
      showToast('Profile updated!', 'success');
      loadProfile(currentUser.username);
    }
  } catch (e) { showToast('Failed to update', 'error'); }
}

// ==================== RIGHT PANEL ====================
async function loadRightPanel() {
  const panel = document.getElementById('rightPanel');
  panel.innerHTML = `
    <div class="panel-card">
      <div class="search-bar">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" class="search-input" placeholder="Search people..." oninput="sideSearch(this.value)" id="sideSearchInput" />
      </div>
      <div id="sideSearchResults"></div>
    </div>
    <div class="panel-card" id="suggestionsCard">
      <div class="panel-title">Who to follow</div>
      <div id="suggestions"><div class="loading-center" style="padding:1rem;"><div class="spinner" style="width:20px;height:20px;border-width:2px;"></div></div></div>
    </div>
    <div class="panel-card" style="font-size:0.78rem;color:var(--color-text-light);line-height:1.8;">
      <div style="font-weight:600;margin-bottom:0.5rem;color:var(--color-text-secondary);">SocialSphere</div>
      Built with ♥ using Node.js, Express & MySQL<br/>
      Full-stack portfolio project
    </div>
  `;

  // Load suggestions
  try {
    const res = await fetch('/api/posts/explore?page=1');
    const data = await res.json();
    const suggestDiv = document.getElementById('suggestions');
    if (data.success && data.posts.length > 0) {
      const users = [...new Map(data.posts.map(p => [p.User?.id, p.User])).values()].filter(u => u && u.id !== currentUser?.id).slice(0, 5);
      if (users.length === 0) {
        suggestDiv.innerHTML = '<p style="font-size:0.85rem;color:var(--color-text-secondary);">No suggestions right now</p>';
      } else {
        suggestDiv.innerHTML = users.map(u => `
          <div class="user-suggestion">
            <div class="avatar-placeholder avatar-sm" style="font-size:0.75rem;">${getInitials(u.full_name || u.username)}</div>
            <div class="suggestion-info">
              <a href="/profile/${u.username}" onclick="navigate_profile('${u.username}',event)" class="suggestion-name">${escHtml(u.full_name || u.username)}</a>
              <div class="suggestion-username">@${escHtml(u.username)}</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="quickFollow('${u.username}',this)" style="font-size:0.78rem;padding:0.3rem 0.75rem;">Follow</button>
          </div>
        `).join('');
      }
    }
  } catch (e) { }
}

let sideSearchTimeout;
function sideSearch(val) {
  clearTimeout(sideSearchTimeout);
  const results = document.getElementById('sideSearchResults');
  if (!val.trim()) { results.innerHTML = ''; return; }
  sideSearchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.success) {
        results.innerHTML = data.users.slice(0, 4).map(u => `
          <div class="user-suggestion">
            <div class="avatar-placeholder avatar-sm" style="font-size:0.75rem;">${getInitials(u.full_name || u.username)}</div>
            <div class="suggestion-info">
              <a href="/profile/${u.username}" onclick="navigate_profile('${u.username}',event)" class="suggestion-name">${escHtml(u.full_name || u.username)}</a>
              <div class="suggestion-username">@${escHtml(u.username)}</div>
            </div>
          </div>
        `).join('');
      }
    } catch (e) { }
  }, 300);
}

// ==================== FOLLOWERS / FOLLOWING ====================

async function showFollowers(username) {
  try {
    const res = await fetch(`/api/users/${username}/followers`);
    const data = await res.json();

    document.getElementById('userListTitle').textContent = 'Followers';

    renderUserList(data.followers);

    document.getElementById('userListModal').style.display = 'block';
  } catch (err) {
    console.error(err);
  }
}

async function showFollowing(username) {
  try {
    const res = await fetch(`/api/users/${username}/following`);
    const data = await res.json();

    document.getElementById('userListTitle').textContent = 'Following';

    renderUserList(data.following);

    document.getElementById('userListModal').style.display = 'block';
  } catch (err) {
    console.error(err);
  }
}

function renderUserList(users) {
  const container = document.getElementById('userListContainer');

  if (!users.length) {
    container.innerHTML = '<p>No users found.</p>';
    return;
  }

  container.innerHTML = users.map(user => `
    <div class="user-list-item"
         onclick="navigate_profile('${user.username}')">

      <img
        src="/uploads/${user.profile_picture || 'default-avatar.png'}"
        class="avatar-small"
      >

      <div>
        <strong>${user.username}</strong>
        <div>${user.full_name || ''}</div>
      </div>
    </div>
  `).join('');
}

function closeUserList() {
  document.getElementById('userListModal').style.display = 'none';
}

// ==================== AUTH ====================
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  } catch (e) { window.location.href = '/login'; }
}

// ==================== DARK MODE ====================
function loadTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const label = document.getElementById('darkLabel');
  const icon = document.getElementById('darkIcon');
  if (label) label.textContent = theme === 'dark' ? 'Light' : 'Dark';
  if (icon) {
    if (theme === 'dark') {
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
    } else {
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
    }
  }
}

function toggleDarkMode() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
  updateToggleColors();
  // Sync checkbox if it exists
  const cb = document.getElementById('darkModeToggle');
  if (cb) cb.checked = next === 'dark';
}

// ==================== MODAL ====================
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ==================== DROPDOWN ====================
function toggleDropdown(menuId) {
  const el = document.getElementById(`dropdown-${menuId}`);
  document.querySelectorAll('.dropdown-menu.open').forEach(m => { if (m.id !== `dropdown-${menuId}`) m.classList.remove('open'); });
  el?.classList.toggle('open');
}

function closeDropdown(menuId) {
  document.getElementById(`dropdown-${menuId}`)?.classList.remove('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
  }
});

// ==================== TOAST ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type]}</span> ${escHtml(message)}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(30px)'; toast.style.transition = '0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ==================== HELPERS ====================
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

