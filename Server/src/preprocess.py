# import os
# import re
# import logging
# from flask import Flask, request, jsonify, send_from_directory, url_for
# from flask_cors import CORS
# from preprocessImg import *
#
# # 初始化 Flask
# app = Flask(__name__)
#
# CORS(app)  # 允许跨域请求
#
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)
#
# # 文件夹路径
# BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
# UPLOAD_ORIGIN_FOLDER = os.path.join(BASE_DIR, "upload", "origin-img")
# UPLOAD_PROCESSED_FOLDER = os.path.join(BASE_DIR, "upload", "processed-img")
#
# # 提供原始图像访问
# @app.route('/upload/origin-img/<username>/<filename>')
# def get_uploaded_image(username, filename):
#     user_folder = os.path.join(UPLOAD_ORIGIN_FOLDER, username)
#     return send_from_directory(user_folder, filename)
#
# # 提供处理后图像访问
# @app.route('/upload/processed-img/<username>/<filename>')
# def get_processed_image(username, filename):
#     user_folder = os.path.join(UPLOAD_PROCESSED_FOLDER, username)
#     return send_from_directory(user_folder, filename)
#
# @app.route('/preprocess', methods=['POST'])
# def preprocess_images():
#     try:
#         # 获取前端传来的姓名
#         data = request.get_json()
#         name = data.get('name')
#
#         if not name:
#             return jsonify({"error": "Name is required!"}), 400
#
#         # 确定用户的原始图像文件夹路径
#         user_origin_folder = os.path.join(UPLOAD_ORIGIN_FOLDER, name)
#         user_processed_folder = os.path.join(UPLOAD_PROCESSED_FOLDER, name)
#
#         if not os.path.exists(user_origin_folder):
#             return jsonify({"error": "User folder not found!"}), 404
#
#         # 创建存储处理后图像的文件夹
#         if not os.path.exists(user_processed_folder):
#             os.makedirs(user_processed_folder)
#
#         # 预处理对象
#         preprocessor = EyeImagePreprocessor()
#
#         # 正则匹配文件名，例如 "1_left.jpg" 或 "2_right.jpg"
#         pattern = re.compile(r"(\d+)_(left|right)\.jpg", re.IGNORECASE)
#
#         # 获取所有图像文件并按编号分组
#         grouped_images = {}
#
#         for filename in os.listdir(user_origin_folder):
#             match = pattern.match(filename)
#             if match:
#                 num, side = match.groups()
#                 if num not in grouped_images:
#                     grouped_images[num] = {}
#                 grouped_images[num][side] = filename
#
#         # 存储最终返回的结果
#         result = []
#
#         for num, files in grouped_images.items():
#             left_eye_orig = files.get("left")
#             right_eye_orig = files.get("right")
#
#             # 确保同一编号的左右眼都存在
#             if not left_eye_orig or not right_eye_orig:
#                 continue
#
#             # 生成原始和处理后文件路径
#             left_eye_orig_path = os.path.join(user_origin_folder, left_eye_orig)
#             right_eye_orig_path = os.path.join(user_origin_folder, right_eye_orig)
#
#             left_eye_proc_filename = f"{num}_left.jpg"
#             right_eye_proc_filename = f"{num}_right.jpg"
#             left_eye_proc_path = os.path.join(user_processed_folder, left_eye_proc_filename)
#             right_eye_proc_path = os.path.join(user_processed_folder, right_eye_proc_filename)
#
#             # 预处理并保存
#             preprocessor.process_single_image(left_eye_orig_path, left_eye_proc_path)
#             preprocessor.process_single_image(right_eye_orig_path, right_eye_proc_path)
#
#             # 构造 URL（使用 Flask 端点）
#             group_result = {
#                 "originalLeft": url_for('get_uploaded_image', username=name, filename=left_eye_orig, _external=True),
#                 "originalRight": url_for('get_uploaded_image', username=name, filename=right_eye_orig, _external=True),
#                 "processedLeft": url_for('get_processed_image', username=name, filename=left_eye_proc_filename, _external=True),
#                 "processedRight": url_for('get_processed_image', username=name, filename=right_eye_proc_filename, _external=True),
#             }
#             result.append(group_result)
#
#         return jsonify(result)
#
#     except Exception as e:
#         logger.error(f"Error in preprocessing: {str(e)}")
#         return jsonify({"error": "Internal server error!"}), 500
#
# if __name__ == '__main__':
#     app.run(debug=True)
#
#


import os
import logging
import cv2
from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from preprocessImg import *

# 初始化 Flask
app = Flask(__name__)

CORS(app)  # 允许跨域请求

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 文件夹路径
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOAD_ORIGIN_FOLDER = os.path.join(BASE_DIR, "upload", "origin-img")
UPLOAD_PROCESSED_FOLDER = os.path.join(BASE_DIR, "upload", "processed-img")

# 提供原始图像访问
@app.route('/upload/origin-img/<username>/<filename>')
def get_uploaded_single_image(username, filename):
    user_folder = os.path.join(UPLOAD_ORIGIN_FOLDER, username)
    return send_from_directory(user_folder, filename)

# 提供处理后图像访问
@app.route('/upload/processed-img/<username>/<filename>')
def get_processed_single_image(username, filename):
    user_folder = os.path.join(UPLOAD_PROCESSED_FOLDER, username)
    return send_from_directory(user_folder, filename)

# 提供原始图像访问
@app.route('/upload/origin-img/<username>/<patient_name>/<filename>')
def get_uploaded_image(username, patient_name, filename):
    user_folder = os.path.join(UPLOAD_ORIGIN_FOLDER, username, patient_name)
    return send_from_directory(user_folder, filename)


# 提供处理后图像访问
@app.route('/upload/processed-img/<username>/<patient_name>/<filename>')
def get_processed_image(username, patient_name, filename):
    user_folder = os.path.join(UPLOAD_PROCESSED_FOLDER, username, patient_name)
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

        # 存储最终返回的结果
        result = []

        # 如果 user_name 文件夹下有子文件夹，表示有病人的图像
        if any(os.path.isdir(os.path.join(user_origin_folder, d)) for d in os.listdir(user_origin_folder)):
            # 遍历用户的每个病人文件夹
            for patient_name in os.listdir(user_origin_folder):
                patient_folder = os.path.join(user_origin_folder, patient_name)

                # 确保是一个文件夹
                if os.path.isdir(patient_folder):
                    left_eye_file = None
                    right_eye_file = None

                    # 遍历病人文件夹中的文件，找到左右眼图像
                    for filename in os.listdir(patient_folder):
                        if 'left' in filename.lower():
                            left_eye_file = filename
                        elif 'right' in filename.lower():
                            right_eye_file = filename

                    # 如果没有找到左右眼图像，跳过该病人
                    if not left_eye_file or not right_eye_file:
                        continue

                    # 创建病人处理后的文件夹
                    patient_processed_folder = os.path.join(user_processed_folder, patient_name)
                    if not os.path.exists(patient_processed_folder):
                        os.makedirs(patient_processed_folder)

                    # 生成原始和处理后文件路径
                    left_eye_orig_path = os.path.join(patient_folder, left_eye_file)
                    right_eye_orig_path = os.path.join(patient_folder, right_eye_file)

                    left_eye_proc_filename = f"{patient_name}_left.jpg"
                    right_eye_proc_filename = f"{patient_name}_right.jpg"
                    left_eye_proc_path = os.path.join(patient_processed_folder, left_eye_proc_filename)
                    right_eye_proc_path = os.path.join(patient_processed_folder, right_eye_proc_filename)

                    # 预处理并保存
                    left_enhanced_img = preprocessor.process_single_image(left_eye_orig_path, left_eye_proc_path)
                    right_enhanced_img = preprocessor.process_single_image(right_eye_orig_path, right_eye_proc_path)

                    # 合并图像
                    merged_img = np.concatenate((left_enhanced_img, right_enhanced_img), axis=1)
                    # 保存合并后的图像
                    merged_eye_proc_path = os.path.join(patient_processed_folder, f"{patient_name}_merged.jpg")
                    cv2.imwrite(merged_eye_proc_path, merged_img)

                    # 构造 URL（使用 Flask 端点）
                    group_result = {
                        "originalLeft": url_for('get_uploaded_image', username=name, patient_name=patient_name,
                                                filename=left_eye_file, _external=True),
                        "originalRight": url_for('get_uploaded_image', username=name, patient_name=patient_name,
                                                 filename=right_eye_file, _external=True),
                        "processedLeft": url_for('get_processed_image', username=name, patient_name=patient_name,
                                                 filename=left_eye_proc_filename, _external=True),
                        "processedRight": url_for('get_processed_image', username=name, patient_name=patient_name,
                                                  filename=right_eye_proc_filename, _external=True),
                        "mergedImg": url_for('get_processed_image', username=name, patient_name=patient_name,
                                                filename=f"{patient_name}_merged.jpg", _external=True),
                    }
                    result.append(group_result)

        # 如果 user_name 文件夹下没有子文件夹，直接处理左右眼图像
        else:
            left_eye_file = None
            right_eye_file = None

            # 遍历文件夹中的文件，找到左右眼图像
            for filename in os.listdir(user_origin_folder):
                if 'left' in filename.lower():
                    left_eye_file = filename
                elif 'right' in filename.lower():
                    right_eye_file = filename

            # 如果没有找到左右眼图像，返回错误
            if not left_eye_file or not right_eye_file:
                return jsonify({"error": "Left or right eye image not found!"}), 400

            # 创建用户处理后的文件夹
            if not os.path.exists(user_processed_folder):
                os.makedirs(user_processed_folder)

            # 生成原始和处理后文件路径
            left_eye_orig_path = os.path.join(user_origin_folder, left_eye_file)
            right_eye_orig_path = os.path.join(user_origin_folder, right_eye_file)

            left_eye_proc_filename = left_eye_file
            right_eye_proc_filename = right_eye_file
            left_eye_proc_path = os.path.join(user_processed_folder, left_eye_proc_filename)
            right_eye_proc_path = os.path.join(user_processed_folder, right_eye_proc_filename)

            # 预处理并保存
            left_enhanced_img = preprocessor.process_single_image(left_eye_orig_path, left_eye_proc_path)
            right_enhanced_img = preprocessor.process_single_image(right_eye_orig_path, right_eye_proc_path)

            # 合并图像
            merged_img = np.concatenate((left_enhanced_img, right_enhanced_img), axis=1)
            # 保存合并后的图像
            merged_eye_proc_path = os.path.join(user_processed_folder, f"img_merged.jpg")
            cv2.imwrite(merged_eye_proc_path, merged_img)

            # 构造 URL（使用 Flask 端点）
            group_result = {
                "originalLeft": url_for('get_uploaded_single_image', username=name, patient_name='', filename=left_eye_file,
                                        _external=True),
                "originalRight": url_for('get_uploaded_single_image', username=name, patient_name='', filename=right_eye_file,
                                         _external=True),
                "processedLeft": url_for('get_processed_single_image', username=name, patient_name='',
                                         filename=left_eye_proc_filename, _external=True),
                "processedRight": url_for('get_processed_single_image', username=name, patient_name='',
                                          filename=right_eye_proc_filename, _external=True),
                "mergedImg": url_for('get_processed_single_image', username=name, patient_name='',
                                            filename="img_merged.jpg", _external=True),
            }
            result.append(group_result)

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in preprocessing: {str(e)}")
        return jsonify({"error": "Internal server error!"}), 500


if __name__ == '__main__':
    app.run(debug=True)
