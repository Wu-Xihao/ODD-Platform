class Config:
    def __init__(self):
        # 数据相关
        self.data_path = '/'    # 标注数据集文件所在的路径
        self.image_dir = '/'    # 图像样本文件夹路径
        self.model_path = '../model/checkpoints/best_model.pth'   # 模型保存路径

        # 训练参数 - 减小批量大小和图像尺寸
        self.batch_size = 8  # 从16减到8
        self.epochs = 50
        self.learning_rate = 1e-3
        self.weight_decay = 1e-2
        self.num_classes = 8

        # 优化策略
        self.accumulation_steps = 4
        self.warmup_epochs = 5
        self.label_smoothing = 0.1
        self.mixup_alpha = 0.2

        # 模型保存
        self.save_freq = 5
        self.early_stopping_patience = 10

        # 数据增强参数 - 减小图像尺寸
        self.img_size = 384  # 从512减到384
        self.aug_strength = 0.5
