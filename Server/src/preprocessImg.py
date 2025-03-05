import cv2
import numpy as np
import os
import logging

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EyeImagePreprocessor:
    def __init__(self, input_size=(512, 512)):
        """
        初始化预处理器
        Args:
            input_size: 目标图像大小
        """
        self.input_size = input_size
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

        # 创建圆形mask
        self.mask = self._create_circular_mask(input_size[0], input_size[1])

    def _create_circular_mask(self, height, width):
        """创建圆形mask"""
        mask = np.zeros((height, width), np.uint8)
        center = (width // 2, height // 2)
        radius = min(width, height) // 2 - 10
        cv2.circle(mask, center, radius, 1, -1)
        return mask

    def remove_black_border(self, image):
        """
        去除图像的黑边
        Args:
            image: 输入图像
        Returns:
            去除黑边后的图像
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            rows_non_zero = np.where(gray.max(axis=1) > 0)[0]
            cols_non_zero = np.where(gray.max(axis=0) > 0)[0]

            if len(rows_non_zero) == 0 or len(cols_non_zero) == 0:
                logger.warning("图像没有有效内容!")
                return image

            top = rows_non_zero[0]
            bottom = rows_non_zero[-1]
            left = cols_non_zero[0]
            right = cols_non_zero[-1]

            cropped_image = image[top:bottom+1, left:right+1]
            return cropped_image
        except Exception as e:
            logger.error(f"去除黑边失败: {str(e)}")
            return image  # 返回原图

    def _basic_preprocess(self, image):
        """基础图像预处理"""
        try:
            # 去除黑边
            image = self.remove_black_border(image)
            # 调整大小
            image = cv2.resize(image, self.input_size)
            # 应用圆形mask
            masked = cv2.bitwise_and(image, image, mask=self.mask)
            return masked
        except Exception as e:
            logger.error(f"基础预处理失败: {str(e)}")
            return None

    def _enhance_image(self, image):
        """图像增强"""
        try:
            # 转换到LAB色彩空间
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)

            # 应用CLAHE到L通道
            l = self.clahe.apply(l)

            # 合并通道
            lab = cv2.merge((l, a, b))

            # 转换回BGR
            enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

            return enhanced
        except Exception as e:
            logger.error(f"图像增强失败: {str(e)}")
            return None

    def process_single_image(self, image_path, save_path):
        """处理单张图像并返回图像对象"""
        try:
            img = cv2.imread(image_path)

            if img is None:
                raise ValueError(f"无法加载图像: {image_path}")

            # 基础预处理
            processed = self._basic_preprocess(img)

            if processed is None:
                logger.error(f"图像处理失败: {image_path}")
                return None

            # 图像增强
            enhanced = self._enhance_image(processed)

            if enhanced is None:
                logger.error(f"图像增强失败: {image_path}")
                return None

            cv2.imwrite(save_path, enhanced)
            logger.info(f"图像处理并保存成功: {save_path}")
            return enhanced

        except Exception as e:
            logger.error(f"处理图像失败: {str(e)}")
            return None

def save_processed_image(image, output_path):
    """保存处理后的图像"""
    try:
        cv2.imwrite(output_path, image)
        logger.info(f"图像处理并保存成功: {output_path}")
        return True
    except Exception as e:
        logger.error(f"保存图像失败: {str(e)}")
        return False

if __name__ == "__main__":
    # 配置路径
    image_path = r"C:\Users\DELL\Desktop\imgs\4_left.jpg"  # 替换为实际的图像文件路径
    output_dir = r"C:\Users\DELL\Desktop\imgs"  # 替换为输出目录

    # 创建预处理器
    preprocessor = EyeImagePreprocessor()

    output_path = os.path.join(output_dir, os.path.basename(image_path))

    # 处理单张图像并保存
    processed_image = preprocessor.process_single_image(image_path, output_path)

