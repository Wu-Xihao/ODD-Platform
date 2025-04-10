import os
import torch
import cv2
import numpy as np
from PIL import Image
from torchvision import transforms
from model import create_model
from improved_config import Config

class EyeDiseasePredictor:
    def __init__(self, model_path):
        # 初始化配置
        self.config = Config()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        # 加载模型
        self.model = create_model(num_classes=self.config.num_classes, pretrained=False)
        checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)

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

