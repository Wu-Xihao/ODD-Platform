// showUploadOptions 用于显示单图上传或批量上传选项
function showUploadOptions(option) {
    document.getElementById('single-upload').style.display = 'none';
    document.getElementById('batch-upload').style.display = 'none';

    if (option === 'single') {
        document.getElementById('single-upload').style.display = 'block';
    } else if (option === 'batch') {
        document.getElementById('batch-upload').style.display = 'block';
    }

    // 存储选择的上传方式，供提交时使用
    window.selectedUploadOption = option; // 将选中的上传方式存储为全局变量

    // 动态调整.tab-content的高度
    var tabContent = document.querySelector('.tab-content');
    tabContent.style.height = 'auto';
}

// displayImage 用于在上传图像后显示图像预览
function displayImage(inputId, containerId) {
    var input = document.getElementById(inputId);
    var container = document.getElementById(containerId);
    container.innerHTML = ''; // 清空之前的内容

    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'uploaded-image';
            container.appendChild(img);
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// displayBatchImages 用于在批量上传时显示所有图像的预览
function displayBatchImages(event) {
    var files = event.target.files;
    var leftEyeContainer = document.getElementById('left-eye-images');
    var rightEyeContainer = document.getElementById('right-eye-images');
    leftEyeContainer.innerHTML = ''; // 清空之前的内容
    rightEyeContainer.innerHTML = ''; // 清空之前的内容

    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var reader = new FileReader();
        reader.onload = (function(file) {
            return function(e) {
                var img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'uploaded-image';
                if (file.name.toLowerCase().includes('left')) {
                    leftEyeContainer.appendChild(img);
                } else if (file.name.toLowerCase().includes('right')) {
                    rightEyeContainer.appendChild(img);
                }
            };
        })(file);
        reader.readAsDataURL(file);
    }
}

// 获取表单数据并使用fetch将其发送到服务器
function handleSubmit(event) {
    event.preventDefault(); // 阻止默认表单提交

    // 获取上传方式，确保有选中的上传方式
    if (!window.selectedUploadOption) {
        alert("请选择上传方式！");
        return;
    }

    var formData = new FormData();

    // 获取表单数据
    formData.append('name', document.querySelector('input[name="name"]').value);
    formData.append('gender', document.querySelector('input[name="gender"]:checked').value);
    formData.append('contact', document.querySelector('input[name="contact"]').value);
    formData.append('age', document.querySelector('input[name="age"]').value);
    formData.append('agreement', document.querySelector('input[name="agreement"]').checked);

    // 选择上传方式
    formData.append('uploadType', window.selectedUploadOption); // 使用全局变量

    // 单图上传
    if (window.selectedUploadOption === 'single') {
        var leftEyeFile = document.getElementById('leftEyeUpload').files[0];
        var rightEyeFile = document.getElementById('rightEyeUpload').files[0];
        if (leftEyeFile) formData.append('leftEyeUpload', leftEyeFile);
        if (rightEyeFile) formData.append('rightEyeUpload', rightEyeFile);
    }
    // 批量上传
    else if (window.selectedUploadOption === 'batch') {
        var batchFiles = document.getElementById('batchUpload').files;
        for (var i = 0; i < batchFiles.length; i++) {
            formData.append('batchFiles', batchFiles[i]);
        }
    }

    // 使用fetch将表单数据提交到后端
    fetch('http://127.0.0.1:5000/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('上传成功');
        } else {
            alert('上传失败');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('上传失败');
    });
}

// 绑定表单提交事件
document.querySelector('form').addEventListener('submit', handleSubmit);
