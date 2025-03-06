import os
from werkzeug.utils import secure_filename
from flask_cors import CORS
import re
import logging
from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from preprocessImg import *
from eyeDiseasePredictor import EyeDiseasePredictor

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
    """检查文件扩展名是否符合要求"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/upload', methods=['POST'])
def upload_files():
    upload_type = request.form.get('uploadType')
    user_name = request.form.get('user_name')

    if not user_name:
        return jsonify(success=False, error="缺少 user_name")

    user_folder = os.path.join(app.config['UPLOAD_ORIGIN_FOLDER'], user_name)
    os.makedirs(user_folder, exist_ok=True)  # 创建用户目录

    success_files = []
    error_files = []

    if upload_type == 'batch':
        # 处理批量上传
        for file in request.files.getlist('batchFiles'):
            filename = secure_filename(file.filename)

            if not allowed_file(filename):
                error_files.append(filename)
                continue  # 跳过不符合要求的文件

            # 解析病人名和眼别（left/right）
            name_parts = filename.rsplit('_', 1)
            if len(name_parts) != 2 or not name_parts[1].lower().startswith(('left', 'right')):
                error_files.append(filename)
                continue

            patient_name = name_parts[0]  # 病人名
            eye_side = 'left' if 'left' in name_parts[1].lower() else 'right'

            patient_folder = os.path.join(user_folder, patient_name)
            os.makedirs(patient_folder, exist_ok=True)  # 创建病人文件夹

            save_path = os.path.join(patient_folder, filename)
            file.save(save_path)
            success_files.append(save_path)

    elif upload_type == 'single':
        # 处理单图上传
        for eye_side in ['leftEyeUpload', 'rightEyeUpload']:
            if eye_side in request.files:
                file = request.files[eye_side]
                filename = secure_filename(file.filename)

                if file and allowed_file(filename):
                    save_path = os.path.join(user_folder, filename)
                    file.save(save_path)
                    success_files.append(save_path)
                else:
                    error_files.append(filename)

    return jsonify(success=True, uploaded=success_files, errors=error_files)


# -------------------PreProcess--------------------


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


# -------------------Prediction-------------------

# 添加静态文件路由
@app.route('/upload/processed-img/<path:filename>')
def serve_image(filename):
    return send_from_directory('../upload/processed-img', filename)

# 创建预测器实例
model_path = '../model/checkpoints/best_model.pth'  # 请确保这是正确的模型路径
predictor = EyeDiseasePredictor(model_path)


@app.route('/predict', methods=['GET'])
def predict_image():
    try:
        # 获取用户名参数
        user_name = request.args.get('user_name', '')
        print(f"接收到用户请求: {user_name}")

        if not user_name:
            return jsonify({
                "success": False,
                "error": "未提供用户名"
            }), 400

        # 构建用户图片目录路径
        user_dir = os.path.join('../upload/processed-img', user_name)

        # 检查用户目录是否存在
        if not os.path.exists(user_dir):
            return jsonify({
                "success": False,
                "error": f"未找到用户 {user_name} 的图片目录"
            }), 404

        left_eye_file = None
        right_eye_file = None

        # 获取用户目录下的所有病人文件夹
        patient_folders = [f for f in os.listdir(user_dir)
                           if os.path.isdir(os.path.join(user_dir, f))]

        # 如果没有子文件夹
        if not patient_folders:
            # 检查是否有左右眼文件
            for filename in os.listdir(user_dir):
                if 'left' in filename.lower():
                    left_eye_file = filename
                elif 'right' in filename.lower():
                    right_eye_file = filename

            # 如果也没有找到左右眼的图像
            if not left_eye_file or not right_eye_file:
                return jsonify({
                    "success": False,
                    "error": f"用户 {user_name} 的目录下未找到病人文件夹"
                }), 404

        # 存储所有病人的预测结果
        all_patients_predictions = []

        if left_eye_file and right_eye_file:
            patient_results = {
                "patient_name": user_name,
                "left_eye": None,
                "right_eye": None,
                "type": "single"
            }
            # 左眼
            left_eye_path = os.path.join(user_dir, left_eye_file)
            left_results = predictor.predict(left_eye_path)
            if left_results is not None:
                patient_results["left_eye"] = {
                    "image_name": left_eye_file,
                    "predictions": left_results
                }
            # 右眼
            right_eye_path = os.path.join(user_dir, right_eye_file)
            right_results = predictor.predict(right_eye_path)
            if right_results is not None:
                patient_results["right_eye"] = {
                    "image_name": right_eye_file,
                    "predictions": right_results
                }

            if patient_results["left_eye"] is not None or patient_results["right_eye"] is not None:
                all_patients_predictions.append(patient_results)
        else:

            # 处理每个病人的文件夹
            for patient_folder in patient_folders:
                patient_path = os.path.join(user_dir, patient_folder)

                # 查找左右眼图片
                image_files = os.listdir(patient_path)
                left_eye_file = next((f for f in image_files if 'left' in f.lower()), None)
                right_eye_file = next((f for f in image_files if 'right' in f.lower()), None)

                patient_results = {
                    "patient_name": patient_folder,
                    "left_eye": None,
                    "right_eye": None,
                    "type": "batch"
                }

                # 处理左眼图片
                if left_eye_file:
                    left_eye_path = os.path.join(patient_path, left_eye_file)
                    left_results = predictor.predict(left_eye_path)
                    if left_results is not None:
                        patient_results["left_eye"] = {
                            "image_name": left_eye_file,
                            "predictions": left_results
                        }

                # 处理右眼图片
                if right_eye_file:
                    right_eye_path = os.path.join(patient_path, right_eye_file)
                    right_results = predictor.predict(right_eye_path)
                    if right_results is not None:
                        patient_results["right_eye"] = {
                            "image_name": right_eye_file,
                            "predictions": right_results
                        }

                # 如果至少有一只眼睛的预测结果，添加到结果列表
                if patient_results["left_eye"] is not None or patient_results["right_eye"] is not None:
                    all_patients_predictions.append(patient_results)

        if not all_patients_predictions:
            return jsonify({
                "success": False,
                "error": "所有图片预测均失败"
            }), 500

        return jsonify({
            "success": True,
            "user_name": user_name,
            "patients": all_patients_predictions
        })

    except Exception as e:
        print(f"预测过程中出现错误: {str(e)}")  # 添加错误日志
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ---------------------Report---------------------


if __name__ == '__main__':
    app.run(debug=True)
