import os
import torch
import torch.nn as nn
from torchvision import models
import timm


class ImprovedEyeDiseaseNet(nn.Module):
    def __init__(self, num_classes=8, pretrained=True):
        super().__init__()

        # 使用EfficientNet-b4作为backbone
        self.backbone = timm.create_model('efficientnet_b4',
                                          pretrained=pretrained,
                                          num_classes=0)

        # 获取backbone的输出特征维度
        backbone_out = 1792

        # 特征提取
        self.features = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Dropout(0.4)
        )

        # 多层分类头
        self.classifier = nn.Sequential(
            nn.Linear(backbone_out, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.3),

            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.2),

            nn.Linear(256, num_classes)
        )

        # 初始化权重
        self._initialize_weights()

    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm1d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)

    def forward(self, x):
        # 提取特征
        x = self.backbone.forward_features(x)
        x = self.features(x)
        x = torch.flatten(x, 1)

        # 分类
        x = self.classifier(x)
        return x


def create_model(num_classes=8, pretrained=True):
    model = ImprovedEyeDiseaseNet(num_classes=num_classes, pretrained=False)

    def remove_prefix(state_dict):
        new_state_dict = {}
        for k, v in state_dict.items():
            if k.startswith('backbone.'):
                new_state_dict[k[9:]] = v  # 移除 "backbone." 前缀
            else:
                new_state_dict[k] = v
        return new_state_dict

    return model