// $(document).ready(function () {
//     $('#multi-value-select').select2();
//
//     $('#search-graph').on('click', function () {
//         const keyword = $('#keyword').val();
//         const category = $('#single-select').val();
//         const relations = $('#multi-value-select').val();
//
//         $.ajax({
//             type: 'POST',
//             url: 'http://localhost:5000/query_graph',
//             contentType: 'application/json',
//             data: JSON.stringify({
//                 keyword: keyword,
//                 category: category,
//                 relations: relations
//             }),
//             success: function (response) {
//                 renderGraph(response);
//             },
//             error: function () {
//                 alert('查询失败，请检查输入');
//             }
//         });
//     });
//
//     function renderGraph(data) {
//         let html = '<h5>图谱结果</h5><ul class="list-group">';
//         data.edges.forEach(edge => {
//             html += `<li class="list-group-item">${edge.source} ——[${edge.relation}]→ ${edge.target}</li>`;
//         });
//         html += '</ul>';
//         $('#graph-content').html(html);
//     }
// });

$(document).ready(function () {
    $('#multi-value-select').select2();

    $('#search-graph').on('click', function () {
        const keyword = $('#keyword').val();
        const category = $('#single-select').val();
        const relations = $('#multi-value-select').val();

        $.ajax({
            type: 'POST',
            url: 'http://localhost:5000/query_graph',
            contentType: 'application/json',
            data: JSON.stringify({
                keyword: keyword,
                category: category,
                relations: relations
            }),
            success: function (response) {
                renderGraph(response);
            },
            error: function () {
                alert('查询失败，请检查输入');
            }
        });
    });

    function renderGraph(data) {
        // 清空现有图形内容
        $('#graph-content').html('');

        if (!data || !data.nodes || !data.edges || data.nodes.length === 0) {
            $('#graph-content').html('<p class="text-danger">未找到匹配的数据。</p>');
            return;
        }

        // 将返回的数据准备为 vis.js 图形所需的节点和边
        const nodes = new vis.DataSet(data.nodes.map(node => ({
            id: node.id,
            label: node.id,  // 显示节点ID
            group: node.label  // 作为节点的类别
        })));

        const edges = new vis.DataSet(data.edges.map(edge => ({
            from: edge.source,
            to: edge.target,
            label: edge.relation  // 关系作为边的标签
        })));

        // 配置 vis.js 图形选项
        const options = {
            nodes: {
                shape: 'dot',
                size: 15,
                font: {
                    size: 14
                },
                borderWidth: 2,
            },
            edges: {
                width: 2,
                arrows: {
                    to: {enabled: true, scaleFactor: 0.5}
                },
                smooth: {
                    type: 'continuous'
                }
            },
            layout: {
                randomSeed: 2
            },
            physics: {
                enabled: true
            }
        };

        // 创建一个新的 Network 对象，用 vis.js 绘制图谱
        const container = document.getElementById('graph-content');
        const network = new vis.Network(container, { nodes: nodes, edges: edges }, options);
    }
});
