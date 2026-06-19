/* ==============================
   博客数据 (从 JSON 加载)
   ============================== */
let blogPosts = [];

async function loadPosts() {
    try {
        const res = await fetch('data/posts.json');
        if (!res.ok) throw new Error('加载文章数据失败');
        blogPosts = await res.json();
        renderPosts();
        initScrollAnimations();
    } catch (err) {
        console.error(err);
        dom.blogGrid.innerHTML = `<p class="blog__empty">暂无文章数据</p>`;
    }
}

/* ==============================
   状态管理
   ============================== */
const state = {
    currentFilter: 'all',
    visibleCount: 6,
    isLoading: false,
};

/* ==============================
   DOM 引用
   ============================== */
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const dom = {
    header: $('#header'),
    navMenu: $('#nav-menu'),
    navToggle: $('#nav-toggle'),
    navClose: $('#nav-close'),
    navLinks: $$('.nav__link'),
    themeToggle: $('#theme-toggle'),
    blogGrid: $('#blog-grid'),
    filterBtns: $$('.blog__filter-btn'),
    loadMore: $('#load-more'),
    scrollUp: $('#scroll-up'),
    contactForm: $('#contact-form'),
    articleCount: $('#article-count'),
};

/* ==============================
   主题切换 - 自适应系统
   ==============================
   三态模式: auto(跟随系统) → light → dark → auto ...
   ============================== */

function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 获取当前要显示的主题 */
function computeTheme(mode) {
    if (mode === 'auto') return getSystemTheme();
    return mode; // 'light' 或 'dark'
}

/** 获取保存的主题模式 */
function getThemeMode() {
    return localStorage.getItem('theme-mode') || 'auto';
}

/** 设置主题并更新 UI */
function applyTheme(mode) {
    const theme = computeTheme(mode);
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(mode);
}

/** 初始化主题 */
function initTheme() {
    const mode = getThemeMode();
    applyTheme(mode);
}

/** 切换主题模式: auto → light → dark → auto */
function toggleTheme() {
    const currentMode = getThemeMode();
    let nextMode;
    if (currentMode === 'auto') nextMode = 'light';
    else if (currentMode === 'light') nextMode = 'dark';
    else nextMode = 'auto';

    localStorage.setItem('theme-mode', nextMode);
    applyTheme(nextMode);
}

/** 更新主题按钮图标和提示 */
function updateThemeIcon(mode) {
    const icon = dom.themeToggle.querySelector('i');
    const labels = {
        auto: '跟随系统',
        light: '浅色模式',
        dark: '深色模式',
    };
    dom.themeToggle.setAttribute('data-mode', mode);
    dom.themeToggle.title = `主题: ${labels[mode] || mode} (点击切换)`;

    if (mode === 'dark') {
        icon.className = 'fas fa-moon';
    } else if (mode === 'light') {
        icon.className = 'fas fa-sun';
    } else {
        // auto: 图标跟随系统当前状态
        const sys = getSystemTheme();
        icon.className = sys === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

/** 始终监听系统主题变化，auto 模式下实时跟随 */
function listenSystemTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
        const mode = getThemeMode();
        if (mode === 'auto') {
            applyTheme('auto');
        }
    });
}

/* ==============================
   导航栏
   ============================== */
function toggleNav() {
    dom.navMenu.classList.toggle('show');
}

function closeNav() {
    dom.navMenu.classList.remove('show');
}

function handleNavScroll() {
    if (window.scrollY > 50) {
        dom.header.classList.add('scrolled');
    } else {
        dom.header.classList.remove('scrolled');
    }
}

function updateActiveLink() {
    const sections = $$('section[id]');
    const scrollY = window.scrollY + 100;

    sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        const sectionId = section.getAttribute('id');

        if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
            dom.navLinks.forEach((link) => {
                link.classList.remove('active-link');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active-link');
                }
            });
        }
    });
}

/* ==============================
   博客卡片渲染
   ============================== */
function getCategoryLabel(category) {
    const labels = {
        tech: '技术',
        life: '生活',
        tutorial: '教程',
        notes: '随笔',
    };
    return labels[category] || category;
}

function createBlogCard(post) {
    return `
        <a href="article.html?id=${post.id}" class="blog__card-link">
            <article class="blog__card" data-category="${post.category}" style="animation-delay: ${Math.random() * 0.3}s">
                <div class="blog__card-image-placeholder" style="background: ${post.color}">
                    <div class="card-bg"></div>
                    <i class="${post.icon}"></i>
                </div>
                <div class="blog__card-body">
                    <div class="blog__card-meta">
                        <span class="blog__card-category ${post.category}">${getCategoryLabel(post.category)}</span>
                        <span class="blog__card-date">
                            <i class="far fa-calendar-alt"></i>
                            ${post.date}
                        </span>
                    </div>
                    <h3 class="blog__card-title">${post.title}</h3>
                    <p class="blog__card-excerpt">${post.excerpt}</p>
                    <div class="blog__card-footer">
                        <div class="blog__card-author">
                            <div class="blog__card-author-avatar">L</div>
                            <span>Lieh Sad</span>
                        </div>
                        <div class="blog__card-read">
                            ${post.readTime}
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                </div>
            </article>
        </a>
    `;
}

function renderPosts() {
    const filtered = state.currentFilter === 'all'
        ? blogPosts
        : blogPosts.filter((p) => p.category === state.currentFilter);

    const visible = filtered.slice(0, state.visibleCount);
    dom.blogGrid.innerHTML = visible.map(createBlogCard).join('');

    // 更新加载更多按钮
    if (state.visibleCount >= filtered.length) {
        dom.loadMore.style.display = 'none';
    } else {
        dom.loadMore.style.display = 'inline-flex';
    }

    // 更新文章计数
    updateCategoryCounts();
    updateArticleCount(filtered.length);
}

function updateCategoryCounts() {
    const categories = ['tech', 'life', 'tutorial', 'notes'];
    categories.forEach((cat) => {
        const count = blogPosts.filter((p) => p.category === cat).length;
        const el = document.getElementById(`count-${cat}`);
        if (el) el.textContent = `${count} 篇文章`;
    });
}

function updateArticleCount(total) {
    if (dom.articleCount) {
        dom.articleCount.textContent = total;
    }
}

function filterPosts(category) {
    state.currentFilter = category;
    state.visibleCount = 6;

    dom.filterBtns.forEach((btn) => btn.classList.remove('active'));
    document.querySelector(`[data-filter="${category}"]`).classList.add('active');

    renderPosts();

    // 滚动到博客区域（移动端）
    const blogSection = document.getElementById('blog');
    if (window.innerWidth <= 768) {
        blogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function loadMore() {
    if (state.isLoading) return;
    state.isLoading = true;

    const icon = dom.loadMore.querySelector('i');
    icon.className = 'fas fa-spinner fa-spin';

    setTimeout(() => {
        state.visibleCount += 3;
        state.isLoading = false;
        renderPosts();
        icon.className = 'fas fa-sync-alt';
    }, 400);
}

/* ==============================
   回到顶部
   ============================== */
function handleScrollUp() {
    if (window.scrollY > 500) {
        dom.scrollUp.classList.add('show');
    } else {
        dom.scrollUp.classList.remove('show');
    }
}

/* ==============================
   联系表单
   ============================== */
function handleContactSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const subject = document.getElementById('contact-subject').value.trim();
    const message = document.getElementById('contact-message').value.trim();

    if (!name || !email || !subject || !message) {
        showToast('请填写所有字段', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showToast('请输入有效的邮箱地址', 'error');
        return;
    }

    const btn = dom.contactForm.querySelector('.contact__form-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 打开邮箱客户端...';
    btn.disabled = true;

    // 构建 mailto 链接
    const mailto = [
        'mailto:sadlieh@hotmail.com',
        '?subject=', encodeURIComponent(`[博客留言] ${subject} - 来自 ${name}`),
        '&body=', encodeURIComponent(
            `来自: ${name} (${email})\n` +
            `主题: ${subject}\n\n` +
            `${message}\n\n` +
            `---\n此邮件通过 Lieh Sad 博客联系表单发送`
        )
    ].join('');

    // 短暂延迟后打开 mailto（让按钮反馈先显示）
    setTimeout(() => {
        window.location.href = mailto;

        btn.innerHTML = '<i class="fas fa-external-link-alt"></i> 已打开邮箱';
        btn.style.background = 'linear-gradient(135deg, #00b894, #00cec9)';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.disabled = false;
        }, 3000);

        dom.contactForm.reset();
        showToast('已打开您的默认邮箱客户端 ✉️', 'success');
    }, 600);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ==============================
   Toast 通知
   ============================== */
function showToast(message, type = 'info') {
    const existingToasts = $$('.toast');
    existingToasts.forEach((t) => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <div class="toast__icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </div>
        <span class="toast__message">${message}</span>
        <button class="toast__close"><i class="fas fa-times"></i></button>
    `;

    document.body.appendChild(toast);

    // 触发动画
    requestAnimationFrame(() => {
        toast.classList.add('toast--visible');
    });

    // 自动关闭
    const autoClose = setTimeout(() => {
        removeToast(toast);
    }, 4000);

    toast.querySelector('.toast__close').addEventListener('click', () => {
        clearTimeout(autoClose);
        removeToast(toast);
    });
}

function removeToast(toast) {
    toast.classList.remove('toast--visible');
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// 添加 Toast 样式
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast {
        position: fixed;
        top: 1.5rem;
        right: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 1rem 1.5rem;
        background: var(--bg-card);
        border-radius: var(--border-radius-sm);
        box-shadow: 0 10px 30px var(--shadow-color);
        border: 1px solid var(--border-color);
        z-index: 10000;
        transform: translateX(120%);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        max-width: 400px;
        backdrop-filter: blur(10px);
    }

    .toast--visible {
        transform: translateX(0);
    }

    .toast__icon i {
        font-size: 1.3rem;
    }

    .toast--success .toast__icon i { color: #00b894; }
    .toast--error .toast__icon i { color: #e17055; }
    .toast--info .toast__icon i { color: #0984e3; }

    .toast__message {
        font-size: 0.9rem;
        color: var(--text-color);
        flex: 1;
    }

    .toast__close {
        color: var(--text-lighter);
        font-size: 0.9rem;
        padding: 0.2rem;
    }

    .toast__close:hover {
        color: var(--text-color);
    }
`;
document.head.appendChild(toastStyles);

/* ==============================
   滚动动画 (Intersection Observer)
   ============================== */
function initScrollAnimations() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        },
        { threshold: 0.1 }
    );

    // 观察所有卡片
    document.querySelectorAll('.blog__card, .category__card, .about__content, .contact__content').forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        observer.observe(el);
    });
}

/* ==============================
   页脚分类链接
   ============================== */
function initFooterLinks() {
    const footerLinks = document.querySelectorAll('.footer__links-group a[data-filter]');
    footerLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const filter = link.getAttribute('data-filter');
            filterPosts(filter);

            // 滚动到博客区域
            document.getElementById('blog').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

/* ==============================
   打字机效果 (Hero 标题装饰)
   ============================== */
function typeWriterEffect() {
    const subtitle = document.querySelector('.hero__subtitle');
    if (!subtitle) return;

    const text = subtitle.textContent;
    subtitle.textContent = '';
    subtitle.style.display = 'inline-block';
    subtitle.style.borderRight = '3px solid var(--primary-color)';
    subtitle.style.overflow = 'hidden';
    subtitle.style.whiteSpace = 'nowrap';
    subtitle.style.animation = 'none';

    let i = 0;
    const speed = 50;

    function type() {
        if (i < text.length) {
            subtitle.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            // 闪烁光标效果由 CSS 处理
            subtitle.style.borderRight = '3px solid transparent';
            setInterval(() => {
                subtitle.style.borderRight =
                    subtitle.style.borderRight === '3px solid transparent'
                        ? '3px solid var(--primary-color)'
                        : '3px solid transparent';
            }, 800);
        }
    }

    // 页面加载后启动
    setTimeout(type, 800);
}

/* ==============================
   文章详情页
   ============================== */
function isArticlePage() {
    return window.location.pathname.endsWith('article.html') || window.location.search.includes('id=');
}

function getArticleId() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id'));
}

function loadArticle() {
    if (!isArticlePage()) return;

    const articleId = getArticleId();
    if (!articleId) {
        document.getElementById('article-body').innerHTML = '<p class="article__empty">文章不存在</p>';
        return;
    }

    // 从全局 blogPosts 中查找，如果还没加载则先加载
    if (blogPosts.length === 0) {
        fetch('data/posts.json')
            .then(res => res.json())
            .then(data => {
                blogPosts = data;
                renderArticle(articleId);
            })
            .catch(() => {
                document.getElementById('article-body').innerHTML = '<p class="article__empty">文章加载失败</p>';
            });
    } else {
        renderArticle(articleId);
    }
}

function renderArticle(id) {
    const post = blogPosts.find(p => p.id === id);
    if (!post) {
        document.getElementById('article-body').innerHTML = '<p class="article__empty">文章不存在</p>';
        return;
    }

    // 更新页面标题
    document.title = `${post.title} - LIEH SAD | 个人博客`;

    // 更新 meta 信息
    document.getElementById('article-title').textContent = post.title;
    document.getElementById('article-category').textContent = getCategoryLabel(post.category);
    document.getElementById('article-category').className = `blog__card-category ${post.category}`;
    document.getElementById('article-date').innerHTML = `<i class="far fa-calendar-alt"></i> ${post.date}`;
    document.getElementById('article-readtime').innerHTML = `<i class="far fa-clock"></i> ${post.readTime}`;

    // 更新文章内容
    document.getElementById('article-body').innerHTML = post.content || '<p>暂无内容</p>';

    // 更新上下篇文章导航
    const currentIndex = blogPosts.findIndex(p => p.id === id);
    const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
    const nextPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

    const prevLink = document.getElementById('article-prev');
    const nextLink = document.getElementById('article-next');
    const prevTitle = document.getElementById('article-prev-title');
    const nextTitle = document.getElementById('article-next-title');

    if (prevPost) {
        prevLink.href = `article.html?id=${prevPost.id}`;
        prevLink.style.display = 'flex';
        prevTitle.textContent = prevPost.title;
    } else {
        prevLink.style.display = 'none';
    }

    if (nextPost) {
        nextLink.href = `article.html?id=${nextPost.id}`;
        nextLink.style.display = 'flex';
        nextTitle.textContent = nextPost.title;
    } else {
        nextLink.style.display = 'none';
    }

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==============================
   初始化
   ============================== */
function init() {
    // 主题（自适应系统）
    initTheme();
    listenSystemTheme();

    // 事件监听（所有页面通用）
    dom.themeToggle.addEventListener('click', toggleTheme);
    dom.navToggle.addEventListener('click', toggleNav);
    dom.navClose.addEventListener('click', closeNav);
    dom.navLinks.forEach((link) => link.addEventListener('click', closeNav));

    // 回到顶部
    dom.scrollUp.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 滚动事件
    window.addEventListener('scroll', () => {
        handleNavScroll();
        handleScrollUp();
        updateActiveLink();
    });

    // 页面加载完成后更新激活链接
    window.addEventListener('load', () => {
        updateActiveLink();
    });

    // 如果是文章详情页，加载文章内容并跳过首页逻辑
    if (isArticlePage()) {
        loadArticle();
        return;
    }

    // 从 JSON 加载博客数据
    loadPosts();

    // 页脚链接
    initFooterLinks();

    // 打字机效果
    typeWriterEffect();

    // 筛选按钮
    dom.filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            filterPosts(btn.getAttribute('data-filter'));
        });
    });

    // 加载更多
    dom.loadMore.addEventListener('click', loadMore);

    // 联系表单
    dom.contactForm.addEventListener('submit', handleContactSubmit);
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
