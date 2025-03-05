# import os
# import cv2
# import numpy as np
# from flask import Flask, jsonify, send_from_directory, url_for
# from flask_cors import CORS
# import logging
# import uuid
#
# # 配置日志
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)
#
# app = Flask(__name__)
# CORS(app)
#
# # 获取 src 目录的上一级目录路径
# BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
#
# # 指定 upload 文件夹路径
# UPLOAD_FOLDER = os.path.join(BASE_DIR, 'upload', 'origin-img')
# PREPROCESS_FOLDER = os.path.join(BASE_DIR, 'upload', 'processed-img')
#
# ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
# MAX_IMAGE_COUNT = 6  # 最多展示5组图像
#
# # 确保文件夹存在
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# os.makedirs(PREPROCESS_FOLDER, exist_ok=True)
#
# def allowed_file(filename):
#     return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
#
# # 处理图像的预处理器
# class EyeImagePreprocessor:
#     def __init__(self, input_size=(512, 512)):
#         """
#         初始化预处理器
#         Args:
#             input_size: 目标图像大小
#         """
#         self.input_size = input_size
#         self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
#
#         # 创建圆形mask
#         self.mask = self._create_circular_mask(input_size[0], input_size[1])
#
#     def _create_circular_mask(self, height, width):
#         """创建圆形mask"""
#         mask = np.zeros((height, width), np.uint8)
#         center = (width // 2, height // 2)
#         radius = min(width, height) // 2 - 10
#         cv2.circle(mask, center, radius, 1, -1)
#         return mask
#
#     def _basic_preprocess(self, image):
#         """基础图像预处理"""
#         try:
#             # 调整大小
#             image = cv2.resize(image, self.input_size)
#
#             # 应用圆形mask
#             masked = cv2.bitwise_and(image, image, mask=self.mask)
#
#             return masked
#         except Exception as e:
#             logger.error(f"Error in basic preprocessing: {str(e)}")
#             return None
#
#     def _enhance_image(self, image):
#         """图像增强"""
#         try:
#             # 转换到LAB色彩空间
#             lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
#             l, a, b = cv2.split(lab)
#
#             # 应用CLAHE到L通道
#             l = self.clahe.apply(l)
#
#             # 合并通道
#             lab = cv2.merge((l, a, b))
#
#             # 转换回BGR
#             enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
#
#             return enhanced
#         except Exception as e:
#             logger.error(f"Error in image enhancement: {str(e)}")
#             return None
#
#     def remove_black_border(self, image):
#         """
#         去除图像的黑边
#         Args:
#             image: 输入图像
#         Returns:
#             去除黑边后的图像
#         """
#         try:
#             # 转为灰度图像，方便分析黑边
#             gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
#
#             # 查找非黑像素点的行列
#             rows_non_zero = np.where(gray.max(axis=1) > 0)[0]  # 查找非黑行
#             cols_non_zero = np.where(gray.max(axis=0) > 0)[0]  # 查找非黑列
#
#             if len(rows_non_zero) == 0 or len(cols_non_zero) == 0:
#                 logger.warning("图像没有有效内容!")
#                 return image  # 如果图像全部为黑色，返回原图
#
#             # 计算上下左右边界
#             top = rows_non_zero[0]
#             bottom = rows_non_zero[-1]
#             left = cols_non_zero[0]
#             right = cols_non_zero[-1]
#
#             # 裁剪图像
#             cropped_image = image[top:bottom+1, left:right+1]
#
#             return cropped_image
#         except Exception as e:
#             logger.error(f"去除黑边失败: {str(e)}")
#             return image  # 返回原图以防错误发生
#
#     def process_image(self, image_path, output_path):
#         """处理单张眼睛图像"""
#         try:
#             img = cv2.imread(image_path)
#             if img is None:
#                 raise ValueError(f"Failed to load image: {image_path}")
#
#             img_no_border = self.remove_black_border(img)
#             processed = self._basic_preprocess(img_no_border)
#             enhanced = self._enhance_image(processed)
#
#             cv2.imwrite(output_path, enhanced)
#             return True
#         except Exception as e:
#             logger.error(f"Error processing {image_path}: {str(e)}")
#             return False
#
#
# @app.route('/start_preprocess', methods=['GET'])
# def start_preprocess():
#     """处理上传的图像并返回预处理后的图像"""
#     images_to_process = []
#     uploaded_images = [f for f in os.listdir(UPLOAD_FOLDER) if allowed_file(f)]
#
#     if not uploaded_images:
#         logger.warning("没有上传有效的图像文件!")
#         return jsonify({'success': False, 'message': '没有上传有效的图像文件!'})
#
#     preprocessor = EyeImagePreprocessor(input_size=(512, 512))
#
#     for img_filename in uploaded_images[:MAX_IMAGE_COUNT]:
#         original_path = os.path.join(UPLOAD_FOLDER, img_filename)
#         processed_filename = f"{img_filename}"
#         processed_path = os.path.join(PREPROCESS_FOLDER, processed_filename)
#
#         success = preprocessor.process_image(original_path, processed_path)
#         if success:
#             images_to_process.append({
#                 'original': url_for('get_uploaded_image', filename=img_filename, _external=True),
#                 'processed': url_for('get_processed_image', filename=processed_filename, _external=True)
#             })
#
#     return jsonify({'success': True, 'images': images_to_process})
#
# @app.route('/upload/origin-img/<filename>')
# def get_uploaded_image(filename):
#     """提供上传的原始图像"""
#     return send_from_directory(UPLOAD_FOLDER, filename)
#
# @app.route('/upload/processed-img/<filename>')
# def get_processed_image(filename):
#     """提供处理后的图像"""
#     return send_from_directory(PREPROCESS_FOLDER, filename)
#
# if __name__ == '__main__':
#     app.run(debug=True)


import os
import re
import logging
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

if __name__ == '__main__':
    app.run(debug=True)


