"""慢康智枢 — 配置管理模块"""
from dataclasses import dataclass, field
from typing import Optional
import os, json

@dataclass
class AppConfig:
    """全局应用配置"""
    APP_NAME: str = "慢康智枢"
    VERSION: str = "2.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///chronic.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp/uploads")
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

@dataclass
class WeChatConfig:
    """微信小程序配置"""
    APP_ID: str = os.getenv("WECHAT_APP_ID", "")
    APP_SECRET: str = os.getenv("WECHAT_APP_SECRET", "")
    TOKEN: str = os.getenv("WECHAT_TOKEN", "")
    ENCODING_AES_KEY: str = os.getenv("WECHAT_AES_KEY", "")

@dataclass
class SMSConfig:
    """短信服务配置"""
    PROVIDER: str = os.getenv("SMS_PROVIDER", "aliyun")
    ACCESS_KEY: str = os.getenv("SMS_ACCESS_KEY", "")
    ACCESS_SECRET: str = os.getenv("SMS_ACCESS_SECRET", "")
    SIGN_NAME: str = "慢康智枢"
    TEMPLATE_CODE: str = os.getenv("SMS_TEMPLATE_CODE", "")

@dataclass
class AIConfig:
    """AI 模型配置"""
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    MODEL_NAME: str = os.getenv("AI_MODEL", "gpt-4")
    TEMPERATURE: float = 0.7
    MAX_TOKENS: int = 2048

@dataclass
class RiskConfig:
    """风险评估阈值配置"""
    HIGH_RISK_THRESHOLD: float = 0.75
    MEDIUM_RISK_THRESHOLD: float = 0.45
    FOLLOW_UP_INTERVAL_DAYS: int = 30
    EMERGENCY_INTERVAL_HOURS: int = 2

@dataclass
class Config:
    """总配置容器"""
    app: AppConfig = field(default_factory=AppConfig)
    wechat: WeChatConfig = field(default_factory=WeChatConfig)
    sms: SMSConfig = field(default_factory=SMSConfig)
    ai: AIConfig = field(default_factory=AIConfig)
    risk: RiskConfig = field(default_factory=RiskConfig)

    @classmethod
    def from_file(cls, path: str) -> "Config":
        """从 JSON 文件加载配置"""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        cfg = cls()
        for section_name, section_data in data.items():
            section = getattr(cfg, section_name, None)
            if section and isinstance(section_data, dict):
                for k, v in section_data.items():
                    if hasattr(section, k):
                        setattr(section, k, v)
        return cfg

    def to_dict(self) -> dict:
        from dataclasses import asdict
        return asdict(self)

# 全局单例
_config: Optional[Config] = None

def get_config() -> Config:
    global _config
    if _config is None:
        config_path = os.getenv("CONFIG_PATH", "config.json")
        if os.path.exists(config_path):
            _config = Config.from_file(config_path)
        else:
            _config = Config()
    return _config

def reload_config(path: Optional[str] = None) -> Config:
    global _config
    _config = Config.from_file(path) if path else Config()
    return _config
