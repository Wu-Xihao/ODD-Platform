import os
from werkzeug.utils import secure_filename
from flask_cors import CORS
import re
import logging
from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from preprocessImg import *

app = Flask(__name__)

# 启用 CORS，允许所有来源的请求
CORS(app)

# 文件夹路径
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOAD_ORIGIN_FOLDER = os.path.join(BASE_DIR, "upload", "origin-img")
os.makedirs(UPLOAD_ORIGIN_FOLDER, exist_ok=True)
app.config['UPLOAD_ORIGIN_FOLDER'] = UPLOAD_ORIGIN_FOLDER
UPLOAD_PROCESSED_FOLDER = os.path.join(BASE_DIR, "upload", "processed-img")

# 设置允许的文件扩展名
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# ------------------Upload------------------

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
    user_folder = os.path.join(app.config['UPLOAD_ORIGIN_FOLDER'], name)
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

# -------------------PreProcess--------------------


# 提供原始图像访问
@app.route('/upload/origin-img/<username>/<filename>')
def get_uploaded_image(username, filename):
    user_folder = os.path.join(UPLOAD_ORIGIN_FOLDER, username)
    return send_from_directory(user_folder, filename)

# 提供处理后图像访问
@app.route('/upload/processed-img/<username>/<filename>')
def get_processed_image(username, filename):
    user_folder = os.path.join(UPLOAD_PROCESSED_FOLDER, username)
    return send_from_directory(user_folder, filename)

@app.route('/preprocess', methods=['POST'])
def preprocess_images():
    try:
        # 获取前端传来的姓名
        data = request.get_json()
        name = data.get('name')

        if not name:
            return jsonify({"error": "Name is required!"}), 400

        # 确定用户的原始图像文件夹路径
        user_origin_folder = os.path.join(UPLOAD_ORIGIN_FOLDER, name)
        user_processed_folder = os.path.join(UPLOAD_PROCESSED_FOLDER, name)

        if not os.path.exists(user_origin_folder):
            return jsonify({"error": "User folder not found!"}), 404

        # 创建存储处理后图像的文件夹
        if not os.path.exists(user_processed_folder):
            os.makedirs(user_processed_folder)

        # 预处理对象
        preprocessor = EyeImagePreprocessor()

        # 正则匹配文件名，例如 "1_left.jpg" 或 "2_right.jpg"
        pattern = re.compile(r"(\d+)_(left|right)\.jpg", re.IGNORECASE)

        # 获取所有图像文件并按编号分组
        grouped_images = {}

        for filename in os.listdir(user_origin_folder):
            match = pattern.match(filename)
            if match:
                num, side = match.groups()
                if num not in grouped_images:
                    grouped_images[num] = {}
                grouped_images[num][side] = filename

        # 存储最终返回的结果
        result = []

        for num, files in grouped_images.items():
            left_eye_orig = files.get("left")
            right_eye_orig = files.get("right")

            # 确保同一编号的左右眼都存在
            if not left_eye_orig or not right_eye_orig:
                continue

            # 生成原始和处理后文件路径
            left_eye_orig_path = os.path.join(user_origin_folder, left_eye_orig)
            right_eye_orig_path = os.path.join(user_origin_folder, right_eye_orig)

            left_eye_proc_filename = f"{num}_left.jpg"
            right_eye_proc_filename = f"{num}_right.jpg"
            left_eye_proc_path = os.path.join(user_processed_folder, left_eye_proc_filename)
            right_eye_proc_path = os.path.join(user_processed_folder, right_eye_proc_filename)

            # 预处理并保存
            preprocessor.process_single_image(left_eye_orig_path, left_eye_proc_path)
            preprocessor.process_single_image(right_eye_orig_path, right_eye_proc_path)

            # 构造 URL（使用 Flask 端点）
            group_result = {
                "originalLeft": url_for('get_uploaded_image', username=name, filename=left_eye_orig, _external=True),
                "originalRight": url_for('get_uploaded_image', username=name, filename=right_eye_orig, _external=True),
                "processedLeft": url_for('get_processed_image', username=name, filename=left_eye_proc_filename, _external=True),
                "processedRight": url_for('get_processed_image', username=name, filename=right_eye_proc_filename, _external=True),
            }
            result.append(group_result)

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in preprocessing: {str(e)}")
        return jsonify({"error": "Internal server error!"}), 500

# -------------------Prediction-------------------


# ---------------------Report---------------------


if __name__ == '__main__':
    app.run(debug=True)
