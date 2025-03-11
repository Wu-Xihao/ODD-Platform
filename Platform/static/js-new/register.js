document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.querySelector('form');
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.querySelector('input[type="text"]').value;
        const email = document.querySelector('input[type="email"]').value;
        const password = document.querySelector('input[type="password"]').value;
        
        // 简单的表单验证
        if (!username || !email || !password) {
            alert('请填写所有必填字段');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('注册成功！');
                // 注册成功后跳转到登录页
                window.location.href = 'login.html';
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('注册失败，请稍后重试');
            console.error('Error:', error);
        }
    });
});
