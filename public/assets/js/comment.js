(function() {
    'use strict';
    const API_BASE = '/api';
    let commentsData = [];
    let sortAsc = false;
    const bugForm = document.getElementById('bugReportForm');
    const bugTitle = document.getElementById('bugTitle');
    const bugDescription = document.getElementById('bugDescription');
    const bugPriority = document.getElementById('bugPriority');
    const priorityTags = document.querySelectorAll('.priority-tag');
    const charCount = document.getElementById('charCount');
    const commentList = document.getElementById('commentList');
    const commentCount = document.getElementById('commentCount');
    const toast = document.getElementById('toastMessage');
    const newCommentForm = document.getElementById('newCommentForm');
    const commentName = document.getElementById('commentName');
    const commentText = document.getElementById('commentText');
    const commentEmail = document.getElementById('commentEmail');
    const sortBtn = document.getElementById('sortCommentsBtn');
    const refreshBtn = document.getElementById('refreshCommentsBtn');
    const submitBugBtn = document.getElementById('submitBugBtn');
    const submitCommentBtn = document.getElementById('submitCommentBtn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(this.dataset.tab).classList.add('active');
        });
    });
    function showToast(msg, type = 'success') {
        toast.textContent = msg;
        toast.className = 'toast-message show ' + type;
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }
    function getPersianDate() {
        const d = new Date();
        return d.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');
    }
    function getPriorityClass(priority) {
        if (priority === 'بالا') return 'priority-badge-high';
        if (priority === 'پایین') return 'priority-badge-low';
        return 'priority-badge-medium';
    }
    function renderComments(list) {
        const container = commentList;
        const countEl = commentCount;
        if (!list || list.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--gray); padding: 40px 0;">
                    <p style="font-size: 1.2rem;">هیچ نظری وجود ندارد.</p>
                    <p>اولین نفری باشید که نظر می‌دهید.</p>
                </div>
            `;
            if (countEl) countEl.textContent = '0';
            return;
        }
        let html = '';
        list.forEach(comment => {
            const likeIcon = comment.liked ? '♥' : '♡';
            const likeClass = comment.liked ? 'like-btn liked' : 'like-btn';
            html += `
                <div class="comment-item" data-id="${comment.id}">
                    <div class="comment-head">
                        <div class="comment-user">
                            <div class="avatar">${comment.name.charAt(0)}</div>
                            <div>
                                <div class="name">${comment.name}</div>
                                <div class="date">${comment.date || 'تاریخ نامشخص'}</div>
                            </div>
                        </div>
                        <span class="comment-priority ${getPriorityClass(comment.priority)}">
                            ${comment.priority}
                        </span>
                    </div>
                    <div class="comment-text">${comment.text}</div>
                    <div class="comment-actions">
                        <button class="${likeClass}" data-id="${comment.id}">
                            ${likeIcon} <span class="like-count">${comment.likes || 0}</span>
                        </button>
                        <button class="reply-btn" data-id="${comment.id}">پاسخ</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        if (countEl) countEl.textContent = list.length;
        container.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.dataset.id);
                const comment = commentsData.find(c => c.id === id);
                if (!comment) return;
                
                const newLiked = !comment.liked;
                const newLikes = comment.likes + (newLiked ? 1 : -1);
                
                fetch(API_BASE + '/comment/like', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: id,
                        liked: newLiked,
                        likes: newLikes
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        comment.liked = newLiked;
                        comment.likes = newLikes;
                        renderComments(commentsData);
                        showToast(newLiked ? 'نظر را پسندیدید' : 'پسندیدن برداشته شد', 'success');
                    } else {
                        showToast('خطا در ثبت لایک', 'error');
                    }
                })
                .catch(() => {
                    showToast('خطا در ارتباط با سرور', 'error');
                });
            });
        });
        container.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.dataset.id);
                const comment = commentsData.find(c => c.id === id);
                if (comment) {
                    commentText.value = '@' + comment.name + ' ';
                    commentText.focus();
                    showToast('در حال پاسخ به ' + comment.name, 'success');
                    tabBtns.forEach(b => b.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));
                    document.querySelector('[data-tab="tab2"]').classList.add('active');
                    document.getElementById('tab2').classList.add('active');
                }
            });
        });
    }
    function loadComments() {
        commentList.innerHTML = `
            <div style="text-align: center; color: var(--gray); padding: 40px 0;">
                <p>در حال بارگذاری نظرات...</p>
            </div>
        `;
        fetch(API_BASE + '/comments')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    commentsData = data.data;
                    sortComments();
                } else {
                    commentsData = [];
                    renderComments(commentsData);
                    showToast('خطا در دریافت نظرات', 'error');
                }
            })
            .catch(() => {
                commentsData = [];
                renderComments(commentsData);
                showToast('خطا در ارتباط با سرور', 'error');
            });
    }
    function sortComments() {
        commentsData.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('/'));
            const dateB = new Date(b.date.split('/').reverse().join('/'));
            return sortAsc ? dateA - dateB : dateB - dateA;
        });
        sortBtn.textContent = sortAsc ? 'مرتب‌سازی: قدیمی‌ترین' : 'مرتب‌سازی: جدیدترین';
        renderComments(commentsData);
    }
    sortBtn.addEventListener('click', function() {
        sortAsc = !sortAsc;
        sortComments();
    });
    refreshBtn.addEventListener('click', function() {
        loadComments();
        showToast('نظرات بروزرسانی شد', 'success');
    });
    priorityTags.forEach(tag => {
        tag.addEventListener('click', function() {
            priorityTags.forEach(t => t.classList.remove('active-priority'));
            this.classList.add('active-priority');
            bugPriority.value = this.dataset.value;
        });
    });
    bugDescription.addEventListener('input', function() {
        const len = this.value.length;
        charCount.textContent = len;
        if (len > 500) {
            this.value = this.value.substring(0, 500);
            charCount.textContent = 500;
            showToast('حداکثر ۵۰۰ کاراکتر مجاز است.', 'error');
        }
    });
    bugForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const title = bugTitle.value.trim();
        const desc = bugDescription.value.trim();
        if (!title || !desc) {
            showToast('لطفاً عنوان و شرح مشکل را وارد کنید.', 'error');
            return;
        }
        if (desc.length > 500) {
            showToast('شرح مشکل نباید بیشتر از ۵۰۰ کاراکتر باشد.', 'error');
            return;
        }
        submitBugBtn.disabled = true;
        submitBugBtn.innerHTML = '<span class="loading-spinner"></span> در حال ارسال...';
        const formData = {
            title: title,
            description: desc,
            priority: bugPriority.value,
            section: document.getElementById('bugSection').value,
            device: document.getElementById('bugDevice').value.trim() || 'نامشخص',
            attachLog: document.getElementById('bugAttachLog').checked
        };
        fetch(API_BASE + '/bug-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('گزارش باگ با موفقیت ثبت شد', 'success');
                bugForm.reset();
                charCount.textContent = '0';
                priorityTags.forEach(t => t.classList.remove('active-priority'));
                document.querySelector('.priority-tag.p-medium').classList.add('active-priority');
                bugPriority.value = 'متوسط';
                document.getElementById('bugAttachLog').checked = false;
                loadComments();
            } else {
                showToast(data.message || 'خطا در ثبت گزارش', 'error');
            }
        })
        .catch(() => {
            showToast('خطا در ارتباط با سرور', 'error');
        })
        .finally(() => {
            submitBugBtn.disabled = false;
            submitBugBtn.textContent = 'ارسال گزارش';
        });
    });
    newCommentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = commentName.value.trim();
        const text = commentText.value.trim();
        if (!name || !text) {
            showToast('نام و متن نظر را وارد کنید.', 'error');
            return;
        }
        if (text.length < 5) {
            showToast('متن نظر باید حداقل ۵ کاراکتر باشد.', 'error');
            return;
        }
        submitCommentBtn.disabled = true;
        submitCommentBtn.innerHTML = '<span class="loading-spinner"></span> در حال ارسال...';
        const formData = {
            name: name,
            email: commentEmail.value.trim(),
            text: text,
            date: getPersianDate()
        };
        fetch(API_BASE + '/comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('نظر شما با موفقیت ثبت شد', 'success');
                newCommentForm.reset();
                loadComments();
            } else {
                showToast(data.message || 'خطا در ثبت نظر', 'error');
            }
        })
        .catch(() => {
            showToast('خطا در ارتباط با سرور', 'error');
        })
        .finally(() => {
            submitCommentBtn.disabled = false;
            submitCommentBtn.textContent = 'ارسال نظر';
        });
    });
    bugForm.querySelector('button[type="reset"]').addEventListener('click', function(e) {
        e.preventDefault();
        bugForm.reset();
        charCount.textContent = '0';
        priorityTags.forEach(t => t.classList.remove('active-priority'));
        document.querySelector('.priority-tag.p-medium').classList.add('active-priority');
        bugPriority.value = 'متوسط';
        showToast('فرم پاک شد', 'success');
    });
    loadComments();
})();