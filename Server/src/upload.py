import os
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS

app = Flask(__name__)

# 启用 CORS，允许所有来源的请求
CORS(app)

# 配置上传文件夹
UPLOAD_FOLDER = '../upload/origin-img'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 设置允许的文件扩展名
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}


# 判断文件是否符合要求
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# 处理上传请求
@app.route('/upload', methods=['POST'])
def upload_files():
    name = request.form.get('name')
    gender = request.form.get('gender')
    contact = request.form.get('contact')
    age = request.form.get('age')
    agreement = request.form.get('agreement')

    # 获取上传方式
    upload_type = request.form.get('uploadType')

    # 创建个人文件夹
    user_folder = os.path.join(app.config['UPLOAD_FOLDER'], name)
    os.makedirs(user_folder, exist_ok=True)

    # 保存上传的文件
    if upload_type == 'single':
        # 处理单图上传
        if 'leftEyeUpload' in request.files:
            left_file = request.files['leftEyeUpload']
            if left_file and allowed_file(left_file.filename):
                filename = secure_filename(left_file.filename)
                left_file.save(os.path.join(user_folder, filename))

        if 'rightEyeUpload' in request.files:
            right_file = request.files['rightEyeUpload']
            if right_file and allowed_file(right_file.filename):
                filename = secure_filename(right_file.filename)
                right_file.save(os.path.join(user_folder, filename))

    elif upload_type == 'batch':
        # 批量上传
        files = request.files.getlist('batchFiles')
        # print(files)
        for file in files:
            if file and allowed_file(file.filename):
                # filename = secure_filename(file.filename)
                filename = file.filename.split('/')[1]
                file.save(os.path.join(user_folder, filename))

    # 你可以在这里处理保存的信息（如 name, gender, contact 等），比如存入数据库
    return jsonify(success=True)


if __name__ == '__main__':
    app.run(debug=True)
