from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import os
import torch
import cv2
import numpy as np
from PIL import Image
from torchvision import transforms
from improved_model import create_model
from improved_config import Config
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
import re
from datetime import datetime
from werkzeug.utils import secure_filename
import time

app = Flask(__name__)
CORS(app, supports_credentials=True)

# 添加静态文件路由
@app.route('/upload/processed_img/<path:filename>')
def serve_image(filename):
    return send_from_directory('../upload/processed_img', filename)

# 添加头像文件路由
@app.route('/upload/avatar/<path:filename>')
def serve_avatar(filename):
    return send_from_directory('../upload/avatar', filename)

# 处理头像上传
@app.route('/api/user/avatar/upload', methods=['POST'])
def upload_avatar():
    try:
        user_id = request.form.get('user_id')
        if not user_id:
            return jsonify({'error': '未提供用户ID'}), 400
            
        if 'avatar' not in request.files:
            return jsonify({'error': '未上传文件'}), 400
            
        file = request.files['avatar']
        if file.filename == '':
            return jsonify({'error': '未选择文件'}), 400
            
        if file:
            # 确保文件名安全
            filename = secure_filename(f"avatar_{user_id}_{int(time.time())}.png")
            
            # 确保目录存在
            avatar_dir = os.path.join('..', 'upload', 'avatar')
            os.makedirs(avatar_dir, exist_ok=True)
            
            # 保存文件
            file_path = os.path.join(avatar_dir, filename)
            file.save(file_path)
            
            # 更新数据库中的头像路径，使用http路径
            avatar_path = f'/upload/avatar/{filename}'  # 修改这里，添加前导斜杠
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET avatar = %s WHERE id = %s', (avatar_path, user_id))
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'avatar_path': avatar_path
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# 数据库配置
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',  # 请修改为您的数据库密码
    'database': 'eye_diagnosis_db'
}


# 创建数据库连接函数
def get_db_connection():
    return mysql.connector.connect(**db_config)


class EyeDiseasePredictor:
    def __init__(self, model_path):
        # 初始化配置
        self.config = Config()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        # 加载模型
        self.model = create_model(num_classes=self.config.num_classes, pretrained=False)
        checkpoint = torch.load(model_path, map_location=self.device)

        # 处理权重加载
        if 'model_state_dict' in checkpoint:
            state_dict = checkpoint['model_state_dict']
        else:
            state_dict = checkpoint

        # 移除权重键中的 'backbone.' 前缀
        new_state_dict = {}
        for k, v in state_dict.items():
            if k.startswith('backbone.'):
                new_state_dict[k[9:]] = v
            else:
                new_state_dict[k] = v

        # 加载处理后的权重
        try:
            self.model.load_state_dict(new_state_dict, strict=False)
            print("模型加载成功！")
        except Exception as e:
            print(f"模型加载时出现警告（这可能是正常的）: {str(e)}")

        self.model.to(self.device)
        self.model.eval()

        # 定义类别名称
        self.class_names = {
            'N': '正常',
            'D': '糖尿病视网膜病变',
            'G': '青光眼',
            'C': '白内障',
            'A': '年龄相关性黄斑变性',
            'H': '高度近视',
            'M': '病理性近视',
            'O': '其他异常'
        }

        # 定义图像预处理
        self.transform = transforms.Compose([
            transforms.Resize((512, 512)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        # 创建CLAHE对象
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    def preprocess_image(self, image_path):
        """预处理图像"""
        # 读取图像
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"无法读取图像: {image_path}")

        # 调整大小
        img = cv2.resize(img, (512, 512))

        # 创建圆形mask
        mask = np.zeros((512, 512), np.uint8)
        center = (256, 256)
        radius = 246  # 512/2 - 10
        cv2.circle(mask, center, radius, 1, -1)

        # 应用mask
        masked = cv2.bitwise_and(img, img, mask=mask)

        # 转换到LAB色彩空间并增强
        lab = cv2.cvtColor(masked, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        l = self.clahe.apply(l)
        lab = cv2.merge((l, a, b))
        enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        # 转换为PIL图像
        enhanced_pil = Image.fromarray(cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB))

        # 应用transforms
        return self.transform(enhanced_pil)

    def predict(self, image_path, threshold=0.5):
        """预测单张图片"""
        # 预处理图像
        try:
            image = self.preprocess_image(image_path)
        except Exception as e:
            print(f"图像预处理失败: {str(e)}")
            return None

        # 添加batch维度
        image = image.unsqueeze(0).to(self.device)

        # 预测
        with torch.no_grad():
            outputs = self.model(image)
            probabilities = torch.sigmoid(outputs)

        # 获取所有预测结果
        all_predictions = []
        max_prob = 0
        max_class = None
        max_chinese_name = None

        # 处理每个类别的预测结果
        for i, prob in enumerate(probabilities[0]):
            confidence = prob.item() * 100
            class_name = list(self.class_names.keys())[i]
            chinese_name = self.class_names[class_name]

            # 记录最高概率的类别
            if confidence > max_prob:
                max_prob = confidence
                max_class = class_name
                max_chinese_name = chinese_name

            # 添加到所有预测结果列表
            all_predictions.append({
                "code": class_name,
                "name": chinese_name,
                "confidence": round(confidence, 2)
            })

        # 返回包含最高概率类别和所有预测结果的字典
        return {
            "top_prediction": {
                "code": max_class,
                "name": max_chinese_name,
                "confidence": round(max_prob, 2)
            },
            "all_predictions": all_predictions
        }


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
        user_dir = os.path.join('../upload/processed_img', user_name)

        # 检查用户目录是否存在
        if not os.path.exists(user_dir):
            return jsonify({
                "success": False,
                "error": f"未找到用户 {user_name} 的图片目录"
            }), 404

        # 获取用户目录下的所有病人文件夹
        patient_folders = [f for f in os.listdir(user_dir)
                           if os.path.isdir(os.path.join(user_dir, f))]

        if not patient_folders:
            return jsonify({
                "success": False,
                "error": f"用户 {user_name} 的目录下未找到病人文件夹"
            }), 404

        # 存储所有病人的预测结果
        all_patients_predictions = []

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
                "right_eye": None
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


# 添加登录接口
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'success': False, 'message': '请填写所有必填字段'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cursor.fetchone()

        if user and check_password_hash(user['password_hash'], password):
            return jsonify({
                'success': True,
                'message': '登录成功',
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email']
                }
            })
        else:
            return jsonify({'success': False, 'message': '邮箱或密码错误'}), 401

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


# 添加注册接口
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'success': False, 'message': '请填写所有必填字段'}), 400

    # 验证邮箱格式
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({'success': False, 'message': '邮箱格式不正确'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 检查用户名是否已存在
        cursor.execute('SELECT id FROM users WHERE username = %s', (username,))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': '用户名已存在'}), 400

        # 检查邮箱是否已存在
        cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': '邮箱已被注册'}), 400

        # 创建新用户
        password_hash = generate_password_hash(password)
        cursor.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)',
            (username, email, password_hash)
        )
        conn.commit()

        return jsonify({'success': True, 'message': '注册成功'})

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    try:
        # 从请求参数中获取用户ID
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': '未提供用户ID'}), 400
        
        # 从数据库获取用户信息
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT username, email, avatar, location, created_at as register_time 
            FROM users 
            WHERE id = %s
        """, (user_id,))
        user_info = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user_info:
            return jsonify({'error': '用户不存在'}), 404
            
        return jsonify(user_info)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/user/profile/update', methods=['POST'])
def update_user_profile():
    try:
        data = request.json
        user_id = data.get('user_id')
        username = data.get('username')
        email = data.get('email')
        location = data.get('location')
        
        if not user_id or not username or not email:
            return jsonify({'error': '用户ID、用户名和邮箱不能为空'}), 400
            
        # 更新数据库中的用户信息
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users 
            SET username = %s, email = %s, location = %s 
            WHERE id = %s
        """, (username, email, location, user_id))
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': '更新成功'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
