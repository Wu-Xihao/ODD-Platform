// 疾病类型映射
const DISEASE_TYPES = {
    'N': '正常',
    'D': '糖尿病',
    'G': '青光眼',
    'C': '白内障',
    'A': 'AMD',
    'H': '高血压',
    'M': '近视',
    'O': '其他疾病/异常'
};

// 当前数据模式（单份/批量）
let currentMode = 'single';

// 创建reportGenerator对象
window.reportGenerator = {
    updateReportPreview: function(data) {
        // 更新报告预览的逻辑
        if (document.getElementById('reportId')) {
            document.getElementById('reportId').textContent = data.reportId;
        }
        if (document.getElementById('patientInfo')) {
            document.getElementById('patientInfo').textContent = data.patientInfo;
        }
        if (document.getElementById('doctorName')) {
            document.getElementById('doctorName').textContent = data.doctorName;
        }
        // 可以根据需要添加更多报告更新逻辑
    }
};

// 静态测试数据
const testData = {
    // 单份数据测试
    singleTest: {
        left: {
            imageUrl: 'static/images/test/left-eye.jpg',
            predictions: {
                'N': 0.15,
                'D': 0.75,
                'G': 0.25,
                'C': 0.10,
                'A': 0.05,
                'H': 0.30,
                'M': 0.60,
                'O': 0.08
            }
        },
        right: {
            imageUrl: 'static/images/test/right-eye.jpg',
            predictions: {
                'N': 0.82,
                'D': 0.08,
                'G': 0.05,
                'C': 0.12,
                'A': 0.03,
                'H': 0.15,
                'M': 0.25,
                'O': 0.04
            }
        }
    },

    // 批量数据测试
    batchTest: [
        {
            imageUrl: 'static/images/test/eye-1.jpg',
            eye: '左眼',
            predictions: {
                'N': 0.15,
                'D': 0.75,
                'G': 0.25,
                'C': 0.10,
                'A': 0.05,
                'H': 0.30,
                'M': 0.60,
                'O': 0.08
            }
        },
        {
            imageUrl: 'static/images/test/eye-2.jpg',
            eye: '右眼',
            predictions: {
                'N': 0.82,
                'D': 0.08,
                'G': 0.05,
                'C': 0.12,
                'A': 0.03,
                'H': 0.15,
                'M': 0.25,
                'O': 0.04
            }
        },
        {
            imageUrl: 'static/images/test/eye-3.jpg',
            eye: '左眼',
            predictions: {
                'N': 0.05,
                'D': 0.15,
                'G': 0.85,
                'C': 0.20,
                'A': 0.10,
                'H': 0.25,
                'M': 0.30,
                'O': 0.05
            }
        }
    ]
};

// 分页配置
const PAGE_SIZE = 5; // 每页显示的数据条数
let currentPage = 1;
let totalPages = 1;
let currentData = []; // 存储当前的预测结果数据

// 初始化函数
function initPredictPage() {
    console.log('初始化预测页面');
    // 绑定切换按钮事件
    $('#singleDataBtn').click(() => switchMode('single'));
    $('#batchDataBtn').click(() => switchMode('batch'));

    // 初始化页面
    setupPredictionDisplay();

    // 加载测试数据
    loadTestData();
}

// 切换显示模式
function switchMode(mode) {
    currentMode = mode;
    if (mode === 'single') {
        $('#singleDataBtn').addClass('active');
        $('#batchDataBtn').removeClass('active');
        $('#singleDataResult').show();
        $('#batchDataResult').hide();
    } else {
        $('#singleDataBtn').removeClass('active');
        $('#batchDataBtn').addClass('active');
        $('#singleDataResult').hide();
        $('#batchDataResult').show();
    }
}

// 设置预测显示
function setupPredictionDisplay() {
    // 为左右眼结果区域创建预测条
    const createPredictionBars = (containerId) => {
        const container = $(`#${containerId} .prediction-bars`);
        container.empty();

        Object.entries(DISEASE_TYPES).forEach(([key, value]) => {
            container.append(`
                <div class="prediction-item">
                    <div class="d-flex justify-content-between mb-1">
                        <span>${value}</span>
                        <span class="probability-value" data-disease="${key}">0%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" 
                             data-disease="${key}" style="width: 0%" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                </div>
            `);
        });
    };

    createPredictionBars('leftEyeResult');
    createPredictionBars('rightEyeResult');
}

// 更新预测结果
function updatePredictions(predictions) {
    if (currentMode === 'single') {
        updateSinglePrediction(predictions);
    } else {
        updateBatchPredictions(predictions);
    }
}

// 更新单份数据预测结果
function updateSinglePrediction(predictions) {
    const updateEyePrediction = (eye, data) => {
        Object.entries(data).forEach(([disease, probability]) => {
            const probabilityPercentage = (probability * 100).toFixed(1);
            $(`#${eye}EyeResult .probability-value[data-disease="${disease}"]`)
                .text(`${probabilityPercentage}%`);
            $(`#${eye}EyeResult .progress-bar[data-disease="${disease}"]`)
                .css('width', `${probabilityPercentage}%`)
                .attr('aria-valuenow', probabilityPercentage);
        });
    };

    if (predictions.left) {
        updateEyePrediction('left', predictions.left);
    }
    if (predictions.right) {
        updateEyePrediction('right', predictions.right);
    }
}

// 更新批量数据预测结果
function updateBatchPredictions(predictions) {
    const tbody = $('#batchResultsTable');
    tbody.empty();

    predictions.forEach((pred, index) => {
        const mainDiagnosis = getMainDiagnosis(pred.predictions);
        tbody.append(`
            <tr>
                <td>${index + 1}</td>
                <td><img src="${pred.imageUrl}" alt="眼部图像" class="img-thumbnail" style="width: 100px;"></td>
                <td>${pred.eye}</td>
                <td>${DISEASE_TYPES[mainDiagnosis.disease]}</td>
                <td>${(mainDiagnosis.probability * 100).toFixed(1)}%</td>
                <td>
                    <button class="btn btn-sm btn-primary view-details" data-index="${index}">
                        查看详情
                    </button>
                </td>
            </tr>
        `);
    });

    // 绑定详情按钮事件
    $('.view-details').click(function() {
        const index = $(this).data('index');
        showPredictionDetails(predictions[index]);
    });
}

// 获取主要诊断结果
function getMainDiagnosis(predictions) {
    let maxProb = 0;
    let mainDisease = '';

    Object.entries(predictions).forEach(([disease, probability]) => {
        if (probability > maxProb) {
            maxProb = probability;
            mainDisease = disease;
        }
    });

    return {
        disease: mainDisease,
        probability: maxProb
    };
}

// 显示预测详情
function showPredictionDetails(prediction) {
    // 实现详情模态框显示逻辑
    // ...
}

// 添加测试数据加载函数
function loadTestData() {
    // 加载单份数据测试结果
    $('#leftEyeImg').attr('src', testData.singleTest.left.imageUrl);
    $('#rightEyeImg').attr('src', testData.singleTest.right.imageUrl);
    updateSinglePrediction({
        left: testData.singleTest.left.predictions,
        right: testData.singleTest.right.predictions
    });

    // 加载批量数据测试结果
    updateBatchPredictions(testData.batchTest);

    // 更新报告预览
    const reportData = {
        reportId: 'RPT' + new Date().getTime(),
        patientInfo: '张三 (35岁 男)',
        doctorName: '李医生',
        leftEye: testData.singleTest.left,
        rightEye: testData.singleTest.right
    };

    window.reportGenerator.updateReportPreview(reportData);
}

// 页面加载完成后初始化
$(document).ready(function() {
    initPredictPage();
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，初始化预测功能...');

    // 获取必要的DOM元素
    const startPredictBtn = document.getElementById('startPredictBtn');
    const modelSelect = document.getElementById('modelSelect');
    const predictionDetails = document.getElementById('predictionDetails');

    // 验证关键DOM元素是否存在
    if (!startPredictBtn || !modelSelect || !predictionDetails) {
        console.error('无法找到必要的DOM元素，请检查HTML结构');
        return;
    }

    console.log('DOM元素验证通过，添加事件监听器...');

    // 开始识别按钮点击事件
    startPredictBtn.addEventListener('click', async function() {
        console.log('开始识别按钮被点击');

        try {
            // 显示加载状态
            startPredictBtn.disabled = true;
            startPredictBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 识别中...';

            // 获取用户名
            const userName = localStorage.getItem('userName') || '';
            console.log('用户名:', userName);

            // 构建URL
            const url = new URL('http://localhost:5000/predict');
            url.searchParams.append('user_name', userName);

            // 等待数据加载完成
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            console.log('服务器响应状态:', response.status);
            if (!response.ok) {
                throw new Error(response.status === 404 ? '未找到图片文件，请先上传图片' : `服务器错误: ${response.status}`);
            }

            const data = await response.json();
            console.log('收到预测结果:', data);

            if (!data.success) {
                throw new Error(data.error || '预测失败');
            }

            // 保存预测结果到localStorage
            localStorage.setItem('predictionResults', JSON.stringify(data.patients || []));
            console.log('预测结果已保存到localStorage');

            // 等待DOM更新完成
            await new Promise(resolve => {
                // 清空现有数据
                const tbody = document.getElementById('predictionDetails');
                tbody.innerHTML = '';

                // 保存新数据
                currentData = data.patients || [];
                currentPage = 1;

                // 确保DOM更新完成
                requestAnimationFrame(() => {
                    requestAnimationFrame(async () => {
                        try {
                            console.log('开始渲染数据，数据量:', currentData.length);
                            await renderTableData();
                            console.log('数据渲染完成');
                            resolve();
                        } catch (error) {
                            console.error('渲染过程出错:', error);
                            resolve();
                        }
                    });
                });
            });

        } catch (error) {
            console.error('处理过程出错:', error);
            alert(error.message || '请求失败，请检查网络连接');
        } finally {
            // 恢复按钮状态
            startPredictBtn.disabled = false;
            startPredictBtn.innerHTML = '<i class="fas fa-play"></i> 开始识别';
        }
    });

    // 添加显示详情的函数
    window.showDetails = function(patientName, patientData) {
        const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
        const leftEyeDetails = document.getElementById('leftEyeDetails');
        const rightEyeDetails = document.getElementById('rightEyeDetails');

        // 更新模态框标题
        document.querySelector('#detailsModal .modal-title').textContent = `${patientName} 的详细预测结果`;

        // 显示左眼详细结果
        if (patientData.left_eye) {
            leftEyeDetails.innerHTML = patientData.left_eye.predictions.all_predictions.map(pred => `
                <div class="prediction-item mb-2">
                    <div class="d-flex justify-content-between">
                        <span>${pred.name} (${pred.code})</span>
                        <span>${pred.confidence.toFixed(1)}%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${pred.confidence}%" 
                             aria-valuenow="${pred.confidence}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            leftEyeDetails.innerHTML = '<p>无左眼数据</p>';
        }

        // 显示右眼详细结果
        if (patientData.right_eye) {
            rightEyeDetails.innerHTML = patientData.right_eye.predictions.all_predictions.map(pred => `
                <div class="prediction-item mb-2">
                    <div class="d-flex justify-content-between">
                        <span>${pred.name} (${pred.code})</span>
                        <span>${pred.confidence.toFixed(1)}%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${pred.confidence}%" 
                             aria-valuenow="${pred.confidence}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            rightEyeDetails.innerHTML = '<p>无右眼数据</p>';
        }

        modal.show();
    };

    console.log('预测功能初始化完成');
});

// 更新分页信息
function updatePagination(total) {
    totalPages = Math.ceil(total / PAGE_SIZE);
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container d-flex justify-content-between align-items-center mt-3';

    // 添加页码信息
    const pageInfo = document.createElement('div');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;

    // 添加分页按钮
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'btn-group';

    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-primary' + (currentPage === 1 ? ' disabled' : '');
    prevBtn.textContent = '上一页';
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderTableData();
        }
    };

    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary' + (currentPage === totalPages ? ' disabled' : '');
    nextBtn.textContent = '下一页';
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTableData();
        }
    };

    buttonGroup.appendChild(prevBtn);
    buttonGroup.appendChild(nextBtn);

    paginationContainer.appendChild(pageInfo);
    paginationContainer.appendChild(buttonGroup);

    // 添加到表格容器后面
    const tableContainer = document.querySelector('.prediction-results');
    const existingPagination = tableContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    tableContainer.appendChild(paginationContainer);
}

// 渲染表格数据
async function renderTableData() {
    return new Promise((resolve, reject) => {
        try {
            console.log('开始渲染表格数据');
            console.log('当前页:', currentPage, '总数据:', currentData.length);

            const tbody = document.getElementById('predictionDetails');
            const userName = localStorage.getItem('userName') || '';

            // 清空现有内容
            tbody.innerHTML = '';

            if (!currentData || currentData.length === 0) {
                console.log('没有数据可显示');
                resolve();
                return;
            }

            const start = (currentPage - 1) * PAGE_SIZE;
            const end = Math.min(start + PAGE_SIZE, currentData.length);

            console.log('渲染数据范围:', start, '到', end);

            // 使用Promise.all等待所有图片加载完成
            const loadImagePromises = [];

            for (let i = start; i < end; i++) {
                const patient = currentData[i];
                if (!patient) continue;

                const row = document.createElement('tr');

                // 预加载图片
                if (patient.left_eye) {
                    const leftImgPromise = new Promise((resolveImg) => {
                        const img = new Image();
                        img.onload = () => resolveImg();
                        img.onerror = () => resolveImg();
                        img.src = `http://localhost:5000/upload/processed-img/${userName}/${patient.patient_name}/${patient.left_eye.image_name}`;
                    });
                    loadImagePromises.push(leftImgPromise);
                }

                if (patient.right_eye) {
                    const rightImgPromise = new Promise((resolveImg) => {
                        const img = new Image();
                        img.onload = () => resolveImg();
                        img.onerror = () => resolveImg();
                        img.src = `http://localhost:5000/upload/processed-img/${userName}/${patient.patient_name}/${patient.right_eye.image_name}`;
                    });
                    loadImagePromises.push(rightImgPromise);
                }

                // 构建行内容
                row.innerHTML = `
                    <td>${patient.patient_name || ''}</td>
                    <td>${patient.left_eye ? `
                        <img src="http://localhost:5000/upload/processed-img/${userName}/${patient.patient_name}/${patient.left_eye.image_name}" 
                             class="img-thumbnail" alt="左眼图片">` : '无图片'}
                    </td>
                    <td>${patient.right_eye ? `
                        <img src="http://localhost:5000/upload/processed-img/${userName}/${patient.patient_name}/${patient.right_eye.image_name}" 
                             class="img-thumbnail" alt="右眼图片">` : '无图片'}
                    </td>
                    <td>${(patient.left_eye ? patient.left_eye.predictions.top_prediction.code : '') + 
                         (patient.right_eye ? ', ' + patient.right_eye.predictions.top_prediction.code : '')}</td>
                    <td>${(patient.left_eye ? patient.left_eye.predictions.top_prediction.name : '') +
                         (patient.right_eye ? ', ' + patient.right_eye.predictions.top_prediction.name : '')}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick='showDetails("${patient.patient_name}", ${JSON.stringify(patient).replace(/'/g, "\\'")})'">
                            详情
                        </button>
                    </td>
                `;

                tbody.appendChild(row);
            }

            // 等待所有图片加载完成
            Promise.all(loadImagePromises).then(() => {
                console.log('所有图片加载完成');
                // 更新分页信息
                updatePagination(currentData.length);
                resolve();
            });

        } catch (error) {
            console.error('渲染表格数据出错:', error);
            reject(error);
        }
    });
}