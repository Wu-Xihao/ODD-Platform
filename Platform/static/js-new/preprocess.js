document.addEventListener("DOMContentLoaded", function () {
    let startBtn = document.getElementById("startPreprocessBtn");

    if (!startBtn) {
        console.error("按钮 #startPreprocessBtn 未找到！");
        return;
    }

    startBtn.addEventListener("click", function () {
        // 获取上传时填写的姓名
        const name = document.querySelector('input[name="name"]').value;

        // 检查姓名是否为空
        if (!name) {
            alert("请先填写姓名！");
            return;
        }

        let imageContainer = document.getElementById("imageContainer");
        if (!imageContainer) {
            console.error("容器 #imageContainer 未找到！");
            return;
        }
        imageContainer.innerHTML = '';  // 清空旧内容

        // 发送请求到后端
        fetch("http://127.0.0.1:5000/preprocess", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: name })  // 传递姓名
        })
        .then(response => response.json())
        .then(data => {
            console.log("后端返回的数据:", data);

            if (data && data.length > 0) {
                // 最多展示 5 组
                data.slice(0, 5).forEach((item) => {
                    console.log("图像数据:", item);

                    let imgDiv = document.createElement("div");
                    imgDiv.classList.add("row");

                    // 创建图像展示的 HTML 结构
                    imgDiv.innerHTML = `
                        <div class="col-xl-6">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title">原始左右眼图像</h5>
                                </div>
                                <div class="row">
                                    <div class="col-xl-6">
                                        <div class="card">
                                            <div class="card-body">
                                                <img class="card-img-bottom img-fluid eye-img"
                                                    src="${item.originalLeft}"
                                                    alt="原始左眼图像"
                                                    onerror="this.src='placeholder.jpg'">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-xl-6">
                                        <div class="card">
                                            <div class="card-body">
                                                <img class="card-img-bottom img-fluid eye-img"
                                                    src="${item.originalRight}"
                                                    alt="原始右眼图像"
                                                    onerror="this.src='placeholder.jpg'">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-6">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title">处理后的左右眼图像</h5>
                                </div>
                                <div class="row">
                                    <div class="col-xl-12">
                                        <div class="card">
                                            <div class="card-body">
                                                <img class="card-img-bottom img-fluid eye-img"
                                                    src="${item.mergedImg}"
                                                    alt="预处理并进行合并的图像"
                                                    onerror="this.src='placeholder.jpg'">
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                    `;

                    imageContainer.appendChild(imgDiv);
                });

                //强制触发重新渲染
                let wizardTab = document.getElementById("contentBody");
                if (wizardTab) {
                    // 强制浏览器重新计算布局
                    wizardTab.style.display = 'none'; // 隐藏
                    wizardTab.offsetHeight; // 读取属性触发 reflow
                    wizardTab.style.display = ''; // 显示
                }
            } else {
                alert("预处理失败: " + (data.message || "未知错误"));
            }
        })
        .catch(error => {
            console.error("请求失败:", error);
            alert("请求失败，请检查后端是否启动！");
        });
    });
});

