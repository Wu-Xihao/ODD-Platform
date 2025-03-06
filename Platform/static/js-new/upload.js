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

// // displayBatchImages 用于在批量上传时显示所有图像的预览
// function displayBatchImages(event) {
//     var files = event.target.files;
//     var leftEyeContainer = document.getElementById('left-eye-images');
//     var rightEyeContainer = document.getElementById('right-eye-images');
//     leftEyeContainer.innerHTML = ''; // 清空之前的内容
//     rightEyeContainer.innerHTML = ''; // 清空之前的内容
//
//     for (var i = 0; i < files.length; i++) {
//         var file = files[i];
//         var reader = new FileReader();
//         reader.onload = (function(file) {
//             return function(e) {
//                 var img = document.createElement('img');
//                 img.src = e.target.result;
//                 img.className = 'uploaded-image';
//                 if (file.name.toLowerCase().includes('left')) {
//                     leftEyeContainer.appendChild(img);
//                 } else if (file.name.toLowerCase().includes('right')) {
//                     rightEyeContainer.appendChild(img);
//                 }
//             };
//         })(file);
//         reader.readAsDataURL(file);
//     }
// }
//
// // 获取表单数据并使用fetch将其发送到服务器
// function handleSubmit(event) {
//     event.preventDefault(); // 阻止默认表单提交
//
//     // 获取上传方式，确保有选中的上传方式
//     if (!window.selectedUploadOption) {
//         alert("请选择上传方式！");
//         return;
//     }
//
//     var formData = new FormData();
//
//     // 获取表单数据
//     formData.append('name', document.querySelector('input[name="name"]').value);
//     formData.append('gender', document.querySelector('input[name="gender"]:checked').value);
//     formData.append('contact', document.querySelector('input[name="contact"]').value);
//     formData.append('age', document.querySelector('input[name="age"]').value);
//     formData.append('agreement', document.querySelector('input[name="agreement"]').checked);
//
//     // 选择上传方式
//     formData.append('uploadType', window.selectedUploadOption); // 使用全局变量
//
//     // 单图上传
//     if (window.selectedUploadOption === 'single') {
//         var leftEyeFile = document.getElementById('leftEyeUpload').files[0];
//         var rightEyeFile = document.getElementById('rightEyeUpload').files[0];
//         if (leftEyeFile) formData.append('leftEyeUpload', leftEyeFile);
//         if (rightEyeFile) formData.append('rightEyeUpload', rightEyeFile);
//     }
//     // 批量上传
//     else if (window.selectedUploadOption === 'batch') {
//         var batchFiles = document.getElementById('batchUpload').files;
//         for (var i = 0; i < batchFiles.length; i++) {
//             formData.append('batchFiles', batchFiles[i]);
//         }
//     }
//
//     // 使用fetch将表单数据提交到后端
//     fetch('http://127.0.0.1:5000/upload', {
//         method: 'POST',
//         body: formData
//     })
//     .then(response => response.json())
//     .then(data => {
//         if (data.success) {
//             alert('上传成功');
//         } else {
//             alert('上传失败');
//         }
//     })
//     .catch(error => {
//         console.error('Error:', error);
//         alert('上传失败');
//     });
// }
//
// // 绑定表单提交事件
// document.querySelector('form').addEventListener('submit', handleSubmit);

function displayBatchImages(event) {
    var files = event.target.files;
    var leftEyeContainer = document.getElementById('left-eye-images');
    var rightEyeContainer = document.getElementById('right-eye-images');

    if (!leftEyeContainer || !rightEyeContainer) {
        console.error("左眼或右眼容器不存在！");
        return;
    }

    leftEyeContainer.innerHTML = ''; // 清空之前的内容
    rightEyeContainer.innerHTML = ''; // 清空之前的内容

    let patientData = {}; // 存储病人名和对应的左右眼图片

    for (let file of files) {
        // 检查 webkitRelativePath 是否可用
        if (!file.webkitRelativePath) {
            console.warn("文件缺少 webkitRelativePath，可能未以文件夹方式上传");
            continue;
        }

        let pathParts = file.webkitRelativePath.split("/"); // 解析路径
        if (pathParts.length < 3) continue; // 确保路径格式符合：主文件夹/病人文件夹/图片文件

        let patientName = pathParts[1]; // 病人子文件夹名（即病人姓名）
        let fileName = pathParts[2]; // 图像文件名

        if (!patientData[patientName]) {
            patientData[patientName] = { left: null, right: null };
        }

        if (fileName.toLowerCase().includes("left")) {
            patientData[patientName].left = file;
        } else if (fileName.toLowerCase().includes("right")) {
            patientData[patientName].right = file;
        }
    }

    console.log("解析出的病人数据:", patientData); // 调试输出病人数据

    // 仅显示前 5 位病人的图像
    let patientNames = Object.keys(patientData).slice(0, 5);
    patientNames.forEach(name => {
        let leftFile = patientData[name].left;
        let rightFile = patientData[name].right;

        if (leftFile) {
            let leftImg = document.createElement('img');
            leftImg.src = URL.createObjectURL(leftFile);
            leftImg.className = 'uploaded-image';
            leftImg.alt = `左眼 - ${name}`;
            leftEyeContainer.appendChild(leftImg);
            console.log(`左眼图片加载成功: ${leftFile.name}`);
        } else {
            console.warn(`病人 ${name} 没有左眼图片`);
        }

        if (rightFile) {
            let rightImg = document.createElement('img');
            rightImg.src = URL.createObjectURL(rightFile);
            rightImg.className = 'uploaded-image';
            rightImg.alt = `右眼 - ${name}`;
            rightEyeContainer.appendChild(rightImg);
            console.log(`右眼图片加载成功: ${rightFile.name}`);
        } else {
            console.warn(`病人 ${name} 没有右眼图片`);
        }
    });

    // 存储数据用于提交
    window.batchUploadData = patientData;
}

// 绑定事件
document.getElementById('batchUpload')?.addEventListener('change', displayBatchImages);


// 批量上传提交
function handleSubmit(event) {
    event.preventDefault();

    if (!window.selectedUploadOption) {
        alert("请选择上传方式！");
        return;
    }

    let formData = new FormData();
    formData.append('uploadType', window.selectedUploadOption);

    let userName = document.querySelector('input[name="name"]').value.trim(); // 用户名
    if (!userName) {
        alert("请输入用户名！");
        return;
    }

    // 保存用户名到localStorage
    localStorage.setItem('userName', userName);

    formData.append('user_name', userName);
    formData.append('gender', document.querySelector('input[name="gender"]:checked')?.value || '');
    formData.append('contact', document.querySelector('input[name="contact"]').value.trim());
    formData.append('age', document.querySelector('input[name="age"]').value.trim());
    formData.append('agreement', document.querySelector('input[name="agreement"]').checked ? 'true' : 'false');

    // 单图上传
    if (window.selectedUploadOption === 'single') {
        let leftEyeFile = document.getElementById('leftEyeUpload').files[0];
        let rightEyeFile = document.getElementById('rightEyeUpload').files[0];
        if (leftEyeFile) formData.append('leftEyeUpload', leftEyeFile, leftEyeFile.name);
        if (rightEyeFile) formData.append('rightEyeUpload', rightEyeFile, rightEyeFile.name);
    }
    // 批量上传
    else if (window.selectedUploadOption === 'batch') {
        let patientData = window.batchUploadData;
        if (!patientData || Object.keys(patientData).length === 0) {
            alert("请先选择包含病人文件夹的文件夹！");
            return;
        }

        for (let patient in patientData) {
            let leftFile = patientData[patient].left;
            let rightFile = patientData[patient].right;

            if (leftFile) formData.append('batchFiles', leftFile, `${patient}_left.jpg`);
            if (rightFile) formData.append('batchFiles', rightFile, `${patient}_right.jpg`);
        }
    }

    // Debug: 输出 FormData 内容
    console.log("即将上传的表单数据:");
    for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
    }

    // 发送请求
    fetch('http://127.0.0.1:5000/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP 错误！状态码: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        alert(data.success ? '上传成功' : '上传失败');
    })
    .catch(error => {
        console.error('上传错误:', error);
        alert('上传失败，请检查网络或服务器状态！');
    });
}

// 绑定事件
document.querySelector('form')?.addEventListener('submit', handleSubmit);

