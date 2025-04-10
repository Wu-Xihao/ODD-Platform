$(document).ready(function () {
    // 发送按钮点击事件
    $('#send_message_btn').click(function () {
        var user_message = $('#user_message').val();
        if (user_message.trim() !== "") {
            // 展示用户消息
            appendMessage(user_message, 'user');
            $('#user_message').val('');

            // 添加“正在思考...”提示
            appendMessage("正在思考...", 'bot', true);

            // 发送请求到 Flask 后端
            $.ajax({
                url: 'http://localhost:5000/ask',
                method: 'POST',
                data: JSON.stringify({ "message": user_message }),
                contentType: 'application/json',
                success: function (response) {
                    replaceThinkingMessage(response.reply);
                },
                error: function () {
                    replaceThinkingMessage("抱歉，我无法理解您的问题。");
                }
            });
        }
    });

    // 添加消息到界面
    function appendMessage(message, sender, isThinking = false) {
        var time = new Date().toLocaleTimeString();
        var messageHTML = '';

        if (sender === 'user') {
            messageHTML = `
                <div class="d-flex justify-content-end mb-4">
                    <div class="msg_cotainer_send">
                        ${escapeHTML(message)}
                        <span class="msg_time_send">${time}</span>
                    </div>
                    <div class="img_cont_msg">
                        <img src="static/image/person.png" class="rounded-circle user_img_msg" alt="">
                    </div>
                </div>
            `;
        } else if (sender === 'bot') {
            messageHTML = `
                <div class="d-flex justify-content-start mb-4 thinking-msg">
                    <div class="img_cont_msg">
                        <img src="static/image/bot.png" class="rounded-circle user_img_msg" alt="">
                    </div>
                    <div class="msg_cotainer">
                        ${isThinking ? escapeHTML(message) : message}
                        <span class="msg_time">${time}</span>
                    </div>
                </div>
            `;
        }

        $('#DZ_W_Contacts_Body3').append(messageHTML);
        $('#DZ_W_Contacts_Body3').scrollTop($('#DZ_W_Contacts_Body3')[0].scrollHeight);
    }

    // 替换“正在思考...”为最终回复（Markdown 渲染 + XSS 清理）
    function replaceThinkingMessage(actualMessage) {
        var $thinkingMsg = $('#DZ_W_Contacts_Body3 .thinking-msg').last();
        var renderedHTML = DOMPurify.sanitize(marked.parse(actualMessage));

        $thinkingMsg.find('.msg_cotainer').html(`
            ${renderedHTML}
            <span class="msg_time">${new Date().toLocaleTimeString()}</span>
        `);
        $thinkingMsg.removeClass('thinking-msg');
    }

    // HTML 转义（防止用户注入 HTML）
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, function (tag) {
            const chars = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            };
            return chars[tag] || tag;
        });
    }
});
