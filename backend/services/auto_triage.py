import re

class AutoTriageEngine:
    """
    Bộ máy Phân loại Tự động Lỗi & Phân tích Log
    (Smart Log Parser & Auto-Triage Engine)
    """

    CRITICAL_PATTERNS = [
        r'NullPointerException', r'OutOfMemoryError', r'Deadlock', r'Fatal',
        r'DatabaseConnectionError', r'SegmentationFault', r'CRITICAL',
        r'HTTP\s*500', r'HTTP\s*502', r'HTTP\s*503', r'HTTP\s*504',
        r'TransactionRollbackException', r'System.AccessViolationException'
    ]

    MAJOR_PATTERNS = [
        r'TimeoutError', r'ExpiredSignatureError', r'Unauthorized', 
        r'ValidationFailed', r'SyntaxError', r'UnhandledPromiseRejection',
        r'HTTP\s*400', r'HTTP\s*401', r'HTTP\s*403', r'HTTP\s*404',
        r'KeyError', r'AttributeError', r'TypeError', r'ConnectionRefusedError'
    ]

    MINOR_PATTERNS = [
        r'Warning', r'Deprecated', r'overflow', r'layout',
        r'style mismatch', r'rendering error', r'minor glitch'
    ]

    ENHANCEMENT_PATTERNS = [
        r'feature request', r'enhancement', r'improvement', r'suggest', r'add support'
    ]

    @classmethod
    def analyze_log_and_title(cls, title: str, raw_logs: str = "", module_default_assignee_id: int = None):
        combined_text = f"{title}\n{raw_logs or ''}"
        
        detected_severity = "MAJOR"
        detected_type = "BUG"
        detected_priority = "MEDIUM"
        confidence_score = 70.0
        reasons = []

        # 1. Kiểm tra từ khóa Critical
        critical_matches = []
        for pattern in cls.CRITICAL_PATTERNS:
            found = re.findall(pattern, combined_text, re.IGNORECASE)
            if found:
                critical_matches.extend(found)

        if critical_matches:
            detected_severity = "CRITICAL"
            detected_priority = "HIGH"
            detected_type = "INCIDENT" if "500" in combined_text or "Deadlock" in combined_text else "BUG"
            confidence_score = min(98.0, 85.0 + len(critical_matches) * 5)
            reasons.append(f"Phát hiện các lỗi nghiêm trọng: {', '.join(set(critical_matches))}")

        else:
            # 2. Kiểm tra từ khóa Major
            major_matches = []
            for pattern in cls.MAJOR_PATTERNS:
                found = re.findall(pattern, combined_text, re.IGNORECASE)
                if found:
                    major_matches.extend(found)

            if major_matches:
                detected_severity = "MAJOR"
                detected_priority = "MEDIUM"
                detected_type = "BUG"
                confidence_score = min(90.0, 75.0 + len(major_matches) * 4)
                reasons.append(f"Phát hiện từ khóa lỗi hệ thống: {', '.join(set(major_matches))}")
            else:
                # 3. Kiểm tra Minor / UI
                minor_matches = []
                for pattern in cls.MINOR_PATTERNS:
                    found = re.findall(pattern, combined_text, re.IGNORECASE)
                    if found:
                        minor_matches.extend(found)

                if minor_matches:
                    detected_severity = "MINOR"
                    detected_priority = "LOW"
                    detected_type = "BUG"
                    confidence_score = 80.0
                    reasons.append(f"Phát hiện vấn đề giao diện / cảnh báo: {', '.join(set(minor_matches))}")

        # 4. Kiểm tra Enhancement
        enhancement_matches = []
        for pattern in cls.ENHANCEMENT_PATTERNS:
            found = re.findall(pattern, combined_text, re.IGNORECASE)
            if found:
                enhancement_matches.extend(found)

        if enhancement_matches and not critical_matches:
            detected_type = "ENHANCEMENT"
            detected_severity = "TRIVIAL"
            detected_priority = "LOW"
            confidence_score = 85.0
            reasons.append("Yêu cầu cải tiến tính năng / giao diện.")

        if not reasons:
            reasons.append("Phân loại mặc định dựa trên bối cảnh mô tả chung.")

        return {
            'suggested_severity': detected_severity,
            'suggested_type': detected_type,
            'suggested_priority': detected_priority,
            'confidence_score': round(confidence_score, 1),
            'suggested_assignee_id': module_default_assignee_id,
            'reasons': reasons
        }
