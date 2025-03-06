// 报告生成与管理类
class ReportGenerator {
    constructor() {
        this.initializeEventListeners();
    }

    // 初始化事件监听
    initializeEventListeners() {
        $('#downloadReport').click(() => this.downloadReport());
    }

    // 更新报告预览
    updateReportPreview(data) {
        // 更新基本信息
        $('#reportId').text(data.reportId);
        $('#examDate').text(new Date().toLocaleDateString());
        $('#patientInfo').text(data.patientInfo || '未提供');
        $('#doctorName').text(data.doctorName || '智能诊断系统');
        $('#diagnosisTime').text(new Date().toLocaleString());

        // 更新左眼诊断结果
        this.updateEyeReport('leftEyeReport', data.leftEye);
        // 更新右眼诊断结果
        this.updateEyeReport('rightEyeReport', data.rightEye);

        // 更新诊断总结
        this.updateDiagnosisSummary(data);
        // 更新建议
        this.updateRecommendations(data);
    }

    // 更新单眼诊断结果
    updateEyeReport(containerId, eyeData) {
        if (!eyeData) return;

        const container = $(`#${containerId}`);
        container.empty();

        // 添加诊断结果表格
        const table = $('<table class="table table-bordered"></table>');
        table.append('<thead><tr><th>疾病类型</th><th>概率</th><th>状态</th></tr></thead>');

        const tbody = $('<tbody></tbody>');
        Object.entries(eyeData.predictions).forEach(([disease, probability]) => {
            const status = probability > 0.5 ? '异常' : '正常';
            const statusClass = probability > 0.5 ? 'text-danger' : 'text-success';

            tbody.append(`
                <tr>
                    <td>${DISEASE_TYPES[disease]}</td>
                    <td>${(probability * 100).toFixed(1)}%</td>
                    <td class="${statusClass}">${status}</td>
                </tr>
            `);
        });

        table.append(tbody);
        container.append(table);
    }

    // 更新诊断总结
    updateDiagnosisSummary(data) {
        const summary = $('#diagnosisSummary');
        summary.empty();

        const leftMainDiagnosis = this.getMainDiagnosis(data.leftEye?.predictions);
        const rightMainDiagnosis = this.getMainDiagnosis(data.rightEye?.predictions);

        let summaryText = '<p>根据AI诊断结果显示：</p>';

        if (leftMainDiagnosis) {
            summaryText += `<p>左眼主要诊断为：${DISEASE_TYPES[leftMainDiagnosis.disease]}
                           (置信度：${(leftMainDiagnosis.probability * 100).toFixed(1)}%)</p>`;
        }

        if (rightMainDiagnosis) {
            summaryText += `<p>右眼主要诊断为：${DISEASE_TYPES[rightMainDiagnosis.disease]}
                           (置信度：${(rightMainDiagnosis.probability * 100).toFixed(1)}%)</p>`;
        }

        summary.html(summaryText);
    }

    // 更新建议
    updateRecommendations(data) {
        const recommendations = $('#recommendationContent');
        recommendations.empty();

        let recommendationText = '<ul>';

        // 根据诊断结果生成建议
        const leftMainDiagnosis = this.getMainDiagnosis(data.leftEye?.predictions);
        const rightMainDiagnosis = this.getMainDiagnosis(data.rightEye?.predictions);

        if (leftMainDiagnosis?.probability > 0.5 || rightMainDiagnosis?.probability > 0.5) {
            recommendationText += '<li>建议及时到医院进行进一步检查。</li>';
        }

        recommendationText += `
            <li>保持良好的用眼习惯，注意用眼卫生。</li>
            <li>定期进行眼科检查。</li>
            <li>保持健康的生活方式，避免熬夜。</li>
        `;

        recommendationText += '</ul>';
        recommendations.html(recommendationText);
    }

    // 获取主要诊断
    getMainDiagnosis(predictions) {
        if (!predictions) return null;

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

    // 下载报告
    async downloadReport() {
        try {
            // 使用html2pdf库生成PDF
            const element = document.getElementById('reportPreview');
            const opt = {
                margin: 1,
                filename: `眼科诊断报告_${new Date().getTime()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error('生成PDF报告时出错:', error);
            alert('生成报告失败，请稍后重试');
        }
    }
}

// 页面加载完成后初始化报告生成器
$(document).ready(function() {
    window.reportGenerator = new ReportGenerator();
});

// 分页配置
const REPORT_PAGE_SIZE = 5;
let reportCurrentPage = 1;
let reportTotalPages = 1;
let reportData = []; // 存储报告数据

// 初始化报告页面
function initReportPage() {
    console.log('初始化报告页面');
    // 从localStorage获取预测数据
    const predictionData = localStorage.getItem('predictionResults');
    if (predictionData) {
        reportData = JSON.parse(predictionData);
        renderReportTable();
    }
}

// 渲染报告表格
async function renderReportTable() {
    return new Promise((resolve, reject) => {
        try {
            console.log('开始渲染报告表格');
            console.log('当前页:', reportCurrentPage, '总数据:', reportData.length);

            const tbody = document.getElementById('reportDetails');
            const userName = localStorage.getItem('userName') || '';

            // 清空现有内容
            tbody.innerHTML = '';

            if (!reportData || reportData.length === 0) {
                console.log('没有数据可显示');
                resolve();
                return;
            }

            const start = (reportCurrentPage - 1) * REPORT_PAGE_SIZE;
            const end = Math.min(start + REPORT_PAGE_SIZE, reportData.length);

            console.log('渲染数据范围:', start, '到', end);

            // 使用Promise.all等待所有图片加载完成
            const loadImagePromises = [];

            for (let i = start; i < end; i++) {
                const patient = reportData[i];
                if (!patient) continue;

                const row = document.createElement('tr');

                // 预加载图片
                if (patient.left_eye) {
                    const leftImgPromise = new Promise((resolveImg) => {
                        const img = new Image();
                        img.onload = () => resolveImg();
                        img.onerror = () => resolveImg();
                        if(patient.type === "single")
                            img.src = `http://localhost:5000/upload/processed-img/${userName}/${patient.left_eye.image_name}`;
                        else if(patient.type === "batch")
                            img.src = `http://localhost:5000/upload/processed-img/${userName}/${patient.patient_name}/${patient.left_eye.image_name}`;
                    });
                    loadImagePromises.push(leftImgPromise);
                }

                if (patient.right_eye) {
                    const rightImgPromise = new Promise((resolveImg) => {
                        const img = new Image();
                        img.onload = () => resolveImg();
                        img.onerror = () => resolveImg();
                        if(patient.type === "single")
                            img.src = `http://localhost:5000/upload/processed-img/${userName}/${patient.right_eye.image_name}`;
                        else if(patient.type === "batch")
                            img.src = `http://localhost:5000/upload/processed-img/${userName}/${patient.patient_name}/${patient.right_eye.image_name}`;
                    });
                    loadImagePromises.push(rightImgPromise);
                }

                // 构建行内容
                row.innerHTML = `
                    <td>${patient.patient_name || ''}</td>
                    <td>${patient.left_eye ? `
                        <img src="${patient.type === 'single' ? 
                                `http://localhost:5000/upload/processed-img/${userName}/${patient.left_eye.image_name}` :
                                `http://localhost:5000/upload/processed-img/${userName}/${patient.patient_name}/${patient.left_eye.image_name}`}"
                         class="img-thumbnail" alt="左眼图片">` : '无图片'}
                    </td>
                    <td>${patient.right_eye ? `
                        <img src="${patient.type === 'single' ? 
                                `http://localhost:5000/upload/processed-img/${userName}/${patient.right_eye.image_name}` :
                                `http://localhost:5000/upload/processed-img/${userName}/${patient.patient_name}/${patient.right_eye.image_name}`}"
                         class="img-thumbnail" alt="右眼图片">` : '无图片'}
                    </td>
                    <td>${(patient.left_eye ? patient.left_eye.predictions.top_prediction.code : '') + 
                         (patient.right_eye ? ', ' + patient.right_eye.predictions.top_prediction.code : '')}</td>
                    <td>${(patient.left_eye ? patient.left_eye.predictions.top_prediction.name : '') +
                         (patient.right_eye ? ', ' + patient.right_eye.predictions.top_prediction.name : '')}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick='generateReport("${patient.patient_name}", ${JSON.stringify(patient).replace(/'/g, "\\'")})'">
                            下载报告
                        </button>
                    </td>
                `;

                tbody.appendChild(row);
            }

            // 等待所有图片加载完成
            Promise.all(loadImagePromises).then(() => {
                console.log('所有图片加载完成');
                // 更新分页信息
                updateReportPagination(reportData.length);
                resolve();
            });

        } catch (error) {
            console.error('渲染报告表格数据出错:', error);
            reject(error);
        }
    });
}

// 更新分页信息
function updateReportPagination(total) {
    reportTotalPages = Math.ceil(total / REPORT_PAGE_SIZE);
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container d-flex justify-content-between align-items-center mt-3';

    // 添加页码信息
    const pageInfo = document.createElement('div');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `第 ${reportCurrentPage} 页，共 ${reportTotalPages} 页`;

    // 添加分页按钮
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'btn-group';

    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-primary' + (reportCurrentPage === 1 ? ' disabled' : '');
    prevBtn.textContent = '上一页';
    prevBtn.onclick = () => {
        if (reportCurrentPage > 1) {
            reportCurrentPage--;
            renderReportTable();
        }
    };

    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary' + (reportCurrentPage === reportTotalPages ? ' disabled' : '');
    nextBtn.textContent = '下一页';
    nextBtn.onclick = () => {
        if (reportCurrentPage < reportTotalPages) {
            reportCurrentPage++;
            renderReportTable();
        }
    };

    buttonGroup.appendChild(prevBtn);
    buttonGroup.appendChild(nextBtn);

    paginationContainer.appendChild(pageInfo);
    paginationContainer.appendChild(buttonGroup);

    // 添加到表格容器后面
    const tableContainer = document.querySelector('#wizard_Report .table-responsive');
    const existingPagination = tableContainer.parentElement.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    tableContainer.parentElement.appendChild(paginationContainer);
}

// 将图片转换为base64
async function getBase64Image(imgUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';  // 处理跨域问题
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg');
            resolve(dataURL);
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = imgUrl;
    });
}

// 生成并下载PDF报告
async function generateReport(patientName, patientData) {
    try {
        console.log('生成报告:', patientName);

        // 克隆报告模板
        const template = document.getElementById('reportTemplate').cloneNode(true);
        template.style.display = 'block';

        // 更新报告内容
        const reportId = 'RPT' + new Date().getTime();
        template.querySelector('.report-id').textContent = reportId;
        template.querySelector('.exam-date').textContent = new Date().toLocaleDateString();
        template.querySelector('.patient-name').textContent = patientName;
        template.querySelector('.diagnosis-time').textContent = new Date().toLocaleString();

        // 添加图片和预测结果
        const userName = localStorage.getItem('userName') || '';

        // 预加载所有图片并转换为base64
        if (patientData.left_eye) {
            try {
                const leftImgUrl = `http://localhost:5000/upload/processed_img/${userName}/${patientName}/${patientData.left_eye.image_name}`;
                const leftImgBase64 = await getBase64Image(leftImgUrl);

                const leftEyeImg = document.createElement('img');
                leftEyeImg.src = leftImgBase64;
                leftEyeImg.className = 'img-fluid mb-3';
                leftEyeImg.style.maxWidth = '100%';
                template.querySelector('.left-eye-image').appendChild(leftEyeImg);

                // 添加左眼预测结果
                const leftPredictions = document.createElement('div');
                leftPredictions.innerHTML = patientData.left_eye.predictions.all_predictions.map(pred => `
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
                template.querySelector('.left-eye-predictions').appendChild(leftPredictions);
            } catch (error) {
                console.error('左眼图片处理失败:', error);
                template.querySelector('.left-eye-image').innerHTML = '<p>图片加载失败</p>';
            }
        }

        if (patientData.right_eye) {
            try {
                const rightImgUrl = `http://localhost:5000/upload/processed_img/${userName}/${patientName}/${patientData.right_eye.image_name}`;
                const rightImgBase64 = await getBase64Image(rightImgUrl);

                const rightEyeImg = document.createElement('img');
                rightEyeImg.src = rightImgBase64;
                rightEyeImg.className = 'img-fluid mb-3';
                rightEyeImg.style.maxWidth = '100%';
                template.querySelector('.right-eye-image').appendChild(rightEyeImg);

                // 添加右眼预测结果
                const rightPredictions = document.createElement('div');
                rightPredictions.innerHTML = patientData.right_eye.predictions.all_predictions.map(pred => `
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
                template.querySelector('.right-eye-predictions').appendChild(rightPredictions);
            } catch (error) {
                console.error('右眼图片处理失败:', error);
                template.querySelector('.right-eye-image').innerHTML = '<p>图片加载失败</p>';
            }
        }

        // 添加诊断总结
        const diagnosisSummary = document.createElement('div');
        diagnosisSummary.innerHTML = `
            <p>左眼主要诊断：${patientData.left_eye ? patientData.left_eye.predictions.top_prediction.name : '无数据'}</p>
            <p>右眼主要诊断：${patientData.right_eye ? patientData.right_eye.predictions.top_prediction.name : '无数据'}</p>
        `;
        template.querySelector('.diagnosis-content').appendChild(diagnosisSummary);

        // 临时将模板添加到body
        document.body.appendChild(template);

        // 等待一小段时间确保DOM更新完成
        await new Promise(resolve => setTimeout(resolve, 100));

        // 生成PDF配置
        const opt = {
            margin: 1,
            filename: `眼科诊断报告_${patientName}_${reportId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: true
            },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        // 生成并下载PDF
        await html2pdf().set(opt).from(template).save();

        // 移除临时模板
        document.body.removeChild(template);

        // 模拟点击 "上一步"
        $('#smartwizard').smartWizard("prev");
        // 模拟点击 "下一步"
        $('#smartwizard').smartWizard("next");

    } catch (error) {
        console.error('生成PDF报告时出错:', error);
        alert('生成报告失败，请稍后重试');
    }
}

// 监听步骤切换事件
$('#smartwizard').on('showStep', function(e, anchorObject, stepNumber, stepDirection) {
    if (stepNumber === 3) { // 报告步骤
        initReportPage();
    }
});