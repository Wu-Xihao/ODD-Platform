// 内容切换函数
function showContent(contentType) {
    // 隐藏所有内容
    document.getElementById('disease-diagnosis-content').style.display = 'none';
    document.getElementById('profile-content').style.display = 'none';
    
    // 显示选中的内容
    if (contentType === 'disease-diagnosis') {
        document.getElementById('disease-diagnosis-content').style.display = 'block';
    } else if (contentType === 'profile') {
        document.getElementById('profile-content').style.display = 'block';
        updateProfileInfo(); // 更新个人信息
        updateStatistics(); // 更新统计信息
    }
}

// 更新个人信息
async function updateProfileInfo() {
    try {
        // 从localStorage获取用户ID
        const userId = localStorage.getItem('userId');
        if (!userId) {
            throw new Error('未登录');
        }

        // 从后端获取用户信息
        const response = await fetch(`http://localhost:5000/api/user/profile?user_id=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error('获取用户信息失败');
        }

        const userInfo = await response.json();
        
        // 更新页面上的用户信息
        document.getElementById('profile-username').textContent = userInfo.username || '未登录';
        document.getElementById('profile-email').textContent = userInfo.email || '未登录';
        document.getElementById('profile-location').textContent = userInfo.location || '位置未知';
        document.getElementById('profile-location-details').textContent = userInfo.location || '位置未知';
        document.getElementById('profile-register-time').textContent = 
            new Date(userInfo.register_time).getFullYear() + '年' || '2024年';
        
        // 更新用户头像
        const profilePhoto = document.querySelector('.profile-photo img');
        if (profilePhoto) {
            // 使用完整的服务器地址
            const baseUrl = 'http://localhost:5000/';
            const avatarPath = userInfo.avatar ? 
                (userInfo.avatar.startsWith('http') ? userInfo.avatar : `${baseUrl}${userInfo.avatar}`) : 
                'static/picture/profile.png';
            console.log('头像路径:', avatarPath); // 添加调试日志
            profilePhoto.src = avatarPath;
            
            // 添加点击事件处理头像上传
            profilePhoto.addEventListener('click', function() {
                document.getElementById('avatar-upload').click();
            });
            profilePhoto.style.cursor = 'pointer';
        }
        
        // 更新顶部导航栏的用户信息
        const headerUsername = document.querySelector('.header-info span');
        const headerLocation = document.querySelector('.header-info small');
        const headerAvatar = document.querySelector('.header-profile img'); // 添加顶部头像更新
        if (headerUsername) headerUsername.textContent = userInfo.username;
        if (headerLocation) headerLocation.textContent = userInfo.location;
        if (headerAvatar && userInfo.avatar) {
            headerAvatar.src = userInfo.avatar.startsWith('http') ? 
                userInfo.avatar : `http://localhost:5000/${userInfo.avatar}`;
        }
        
    } catch (error) {
        console.error('更新个人信息失败:', error);
        showToast('获取用户信息失败，请重试', 'error');
    }
}

// 更新统计信息
function updateStatistics() {
    // 从localStorage获取诊断记录
    const diagnosesStr = localStorage.getItem('diagnoses');
    const diagnoses = diagnosesStr ? JSON.parse(diagnosesStr) : [];
    
    // 更新统计数据
    document.getElementById('total-diagnoses').textContent = diagnoses.length;
    document.getElementById('total-reports').textContent = diagnoses.length; // 假设每次诊断都生成报告
    
    // 更新最近诊断时间
    if (diagnoses.length > 0) {
        const lastDiagnosis = diagnoses[diagnoses.length - 1];
        document.getElementById('last-diagnosis').textContent = formatDate(lastDiagnosis.date);
    }
    
    // 更新诊断记录表格
    updateDiagnosisTable(diagnoses);
}

// 格式化日期
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

// 更新诊断记录表格
function updateDiagnosisTable(diagnoses) {
    const tbody = document.getElementById('recent-diagnoses');
    if (!diagnoses || diagnoses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">暂无诊断记录</td></tr>';
        return;
    }
    
    // 只显示最近的5条记录
    const recentDiagnoses = diagnoses.slice(-5).reverse();
    tbody.innerHTML = recentDiagnoses.map(diagnosis => `
        <tr>
            <td>${formatDate(diagnosis.date)}</td>
            <td>${diagnosis.type || '眼底检查'}</td>
            <td><span class="badge bg-${diagnosis.result === '正常' ? 'success' : 'warning'}">${diagnosis.result || '--'}</span></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="viewReport('${diagnosis.id}')">
                    <i class="fas fa-file-medical"></i> 查看报告
                </button>
            </td>
        </tr>
    `).join('');
}

// 显示修改信息模态框
async function showEditModal() {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            throw new Error('未登录');
        }

        const response = await fetch(`http://localhost:5000/api/user/profile?user_id=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error('获取用户信息失败');
        }

        const userInfo = await response.json();
        
        // 填充表单
        document.getElementById('edit-username').value = userInfo.username || '';
        document.getElementById('edit-email').value = userInfo.email || '';
        document.getElementById('edit-location').value = userInfo.location || '';
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
        modal.show();
    } catch (error) {
        console.error('获取用户信息失败:', error);
        showToast('获取用户信息失败，请重试', 'error');
    }
}

// 保存修改的信息
async function saveProfileChanges() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showToast('未登录', 'error');
        return;
    }

    const username = document.getElementById('edit-username').value;
    const email = document.getElementById('edit-email').value;
    const location = document.getElementById('edit-location').value;
    
    // 验证输入
    if (!username || !email) {
        showToast('用户名和邮箱不能为空！', 'error');
        return;
    }
    
    try {
        // 发送更新请求到后端
        const response = await fetch('http://localhost:5000/api/user/profile/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify({
                user_id: userId,
                username,
                email,
                location
            })
        });

        if (!response.ok) {
            throw new Error('更新用户信息失败');
        }

        // 更新显示
        await updateProfileInfo();
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        modal.hide();
        
        // 显示成功提示
        showToast('信息修改成功！', 'success');
    } catch (error) {
        console.error('保存用户信息失败:', error);
        showToast('保存失败，请重试', 'error');
    }
}

// 显示提示信息
function showToast(message, type = 'success') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `position-fixed top-50 start-50 translate-middle bg-${type} text-white p-3 rounded`;
    toast.style.zIndex = '9999';
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 2秒后移除
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// 查看报告
function viewReport(reportId) {
    // 这里添加查看报告的逻辑
    console.log('查看报告:', reportId);
}

// 处理头像上传
async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件', 'error');
        return;
    }
    
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            throw new Error('未登录');
        }
        
        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('user_id', userId);
        
        const response = await fetch('http://localhost:5000/api/user/avatar/upload', {
            method: 'POST',
            body: formData,
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error('上传失败');
        }
        
        const result = await response.json();
        if (result.success) {
            const baseUrl = 'http://localhost:5000/';
            const avatarPath = `${baseUrl}${result.avatar_path}`;
            console.log('新头像路径:', avatarPath); // 添加调试日志
            
            // 更新个人中心头像
            const profilePhoto = document.querySelector('.profile-photo img');
            if (profilePhoto) {
                profilePhoto.src = avatarPath;
            }
            
            // 更新顶部导航栏头像
            const headerAvatar = document.querySelector('.header-profile img');
            if (headerAvatar) {
                headerAvatar.src = avatarPath;
            }
            
            showToast('头像更新成功！', 'success');
        } else {
            throw new Error(result.error || '上传失败');
        }
    } catch (error) {
        console.error('上传头像失败:', error);
        showToast('上传头像失败，请重试', 'error');
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 默认显示疾病诊断内容
    showContent('disease-diagnosis');
    
    // 添加头像上传输入框的变化监听
    const avatarInput = document.getElementById('avatar-upload');
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarUpload);
    }
    
    // 处理退出登录
    const logoutLinks = document.querySelectorAll('a[href="login.html"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            // 清除localStorage中的用户信息
            localStorage.removeItem('userInfo');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('diagnoses');
            // 跳转到登录页
            window.location.href = 'login.html';
        });
    });
}); 