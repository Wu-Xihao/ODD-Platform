document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('form');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.querySelector('input[type="email"]').value;
        const password = document.querySelector('input[type="password"]').value;
        const rememberMe = document.querySelector('#basic_checkbox_1').checked;
        
        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 保存用户信息到localStorage
                localStorage.setItem('userInfo', JSON.stringify({
                    id: data.user.id,
                    username: data.user.username,
                    email: data.user.email,
                    location: data.user.location || '位置未知'
                }));

                // 保存用户ID到localStorage
                localStorage.setItem('userId', data.user.id);

                // 如果选择了记住我，保存邮箱
                if (rememberMe) {
                    localStorage.setItem('userEmail', email);
                }
                
                // 登录成功，跳转到首页
                window.location.href = 'index.html';
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('登录失败，请稍后重试');
            console.error('Error:', error);
        }
    });
    
    // 检查是否有保存的邮箱
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
        document.querySelector('input[type="email"]').value = savedEmail;
        document.querySelector('#basic_checkbox_1').checked = true;
    }
});
