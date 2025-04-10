const rowsPerPage = 6;
let currentPage = 1;
let diseaseData = [];

// 将换行符转化为 <br> 标签
function formatTextWithNewLines(text) {
  // 检查 text 是否存在且为字符串
  if (text && typeof text === "string") {
    return text.split("\n").map(line => `${line}`).join("<br>");
  }
  return ""; // 如果没有内容，返回空字符串
}

function renderTable(data, page) {
  const tbody = document.getElementById("diseaseTableBody");
  tbody.innerHTML = "";

  // 分页计算
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedItems = data.slice(start, end);

  // 动态填充表格
  for (const item of paginatedItems) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.title}</td>
      <td>${item.simple_description}</td>
      <td>${formatTextWithNewLines(item["典型症状："] || "")}</td>
      <td>${formatTextWithNewLines(item["常用药品："] || "")}</td>
      <td>${formatTextWithNewLines(item["并发症："] || "")}</td>
      <td><a href="${item.link}" target="_blank">查看详情</a></td>
    `;

    tbody.appendChild(tr);
  }
}

function renderPagination(data) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const totalPages = Math.ceil(data.length / rowsPerPage);

  // 渲染分页按钮
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === currentPage ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;

    // 点击分页按钮时更新当前页并重新渲染表格
    li.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage = i;
      renderTable(data, currentPage);
      renderPagination(data);
    });

    pagination.appendChild(li);
  }
}

async function fetchData() {
  try {
    const response = await fetch("./static/data/disease.json"); //json文件路径
    if (!response.ok) {
      throw new Error("数据加载失败");
    }
    diseaseData = await response.json();
    console.log("加载的数据：", diseaseData); // 查看加载的数据
    renderTable(diseaseData, currentPage);
    renderPagination(diseaseData);
  } catch (error) {
    console.error("加载疾病数据出错：", error);
  }
}

document.addEventListener("DOMContentLoaded", fetchData);
