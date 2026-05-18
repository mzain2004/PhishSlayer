from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, model_validator
import uuid


class TLPLevel(str, Enum):
    WHITE = "white"
    GREEN = "green"
    AMBER = "amber"
    RED = "red"


class IOCType(str, Enum):
    IP = "ip"
    IPV6 = "ipv6"
    DOMAIN = "domain"
    URL = "url"
    EMAIL = "email"
    HASH_MD5 = "hash_md5"
    HASH_SHA1 = "hash_sha1"
    HASH_SHA256 = "hash_sha256"
    FILENAME = "filename"
    REGISTRY_KEY = "registry_key"
    MUTEX = "mutex"
    USER_AGENT = "user_agent"


class IOCSource(str, Enum):
    MANUAL = "manual"
    L1_AGENT = "l1_agent"
    L2_AGENT = "l2_agent"
    L3_AGENT = "l3_agent"
    THREATFOX = "threatfox"
    URLHAUS = "urlhaus"
    MALWAREBAZAAR = "malwarebazaar"
    ABUSEIPDB = "abuseipdb"
    STIX_IMPORT = "stix_import"


_EXPIRY_DAYS: dict[IOCType, Optional[int]] = {
    IOCType.IP: 30,
    IOCType.IPV6: 30,
    IOCType.DOMAIN: 90,
    IOCType.URL: 14,
    IOCType.EMAIL: 180,
    IOCType.USER_AGENT: 30,
    IOCType.HASH_MD5: None,
    IOCType.HASH_SHA1: None,
    IOCType.HASH_SHA256: None,
    IOCType.FILENAME: None,
    IOCType.REGISTRY_KEY: None,
    IOCType.MUTEX: None,
}


class IOCDocument(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    org_id: str
    value: str = Field(min_length=1, max_length=2048)
    type: IOCType

    tlp_level: TLPLevel = TLPLevel.AMBER
    confidence_score: float = Field(default=50.0, ge=0.0, le=100.0)
    source: IOCSource = IOCSource.MANUAL
    source_alert_id: Optional[str] = None
    source_hunt_id: Optional[str] = None

    threat_type: Optional[str] = None
    malware_family: Optional[str] = None
    mitre_techniques: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    description: Optional[str] = Field(None, max_length=2000)

    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    expires_at: Optional[datetime] = None
    is_expired: bool = False

    hit_count: int = 0
    false_positive: bool = False
    whitelisted: bool = False

    feed_data: dict = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def set_default_expiry(cls, data: dict) -> dict:
        """Set smart default expiry based on IOC type if not provided."""
        if data.get("expires_at") is not None:
            return data
        ioc_type_raw = data.get("type")
        if ioc_type_raw is None:
            return data
        try:
            ioc_type = IOCType(ioc_type_raw) if isinstance(ioc_type_raw, str) else ioc_type_raw
        except ValueError:
            return data
        days = _EXPIRY_DAYS.get(ioc_type)
        if days is not None:
            data["expires_at"] = datetime.utcnow() + timedelta(days=days)
        return data

    def current_confidence(self) -> float:
        """Apply time-based decay to confidence score."""
        days_since_last_seen = (datetime.utcnow() - self.last_seen).days

        decay_rates = {
            "ip": 2.0,
            "ipv6": 2.0,
            "domain": 0.5,
            "url": 3.0,
            "email": 0.3,
        }

        rate = decay_rates.get(self.type.value, 1.0)
        decay = min(days_since_last_seen * rate, 40)
        hit_boost = min(self.hit_count * 2, 20)

        if self.false_positive:
            return 0.0

        return max(0.0, min(100.0, self.confidence_score - decay + hit_boost))

    def to_stix_pattern(self) -> Optional[str]:
        """Convert to STIX 2.1 indicator pattern."""
        v = self.value.replace("'", "\\'")
        patterns = {
            IOCType.IP: f"[ipv4-addr:value = '{v}']",
            IOCType.IPV6: f"[ipv6-addr:value = '{v}']",
            IOCType.DOMAIN: f"[domain-name:value = '{v}']",
            IOCType.URL: f"[url:value = '{v}']",
            IOCType.EMAIL: f"[email-message:from_ref.value = '{v}']",
            IOCType.HASH_MD5: f"[file:hashes.MD5 = '{v}']",
            IOCType.HASH_SHA1: f"[file:hashes.'SHA-1' = '{v}']",
            IOCType.HASH_SHA256: f"[file:hashes.'SHA-256' = '{v}']",
        }
        return patterns.get(self.type)
