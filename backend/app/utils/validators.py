import re
from datetime import datetime

def validate_email(email: str) -> bool:
    if not email or len(email) > 120:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))

def validate_date_string(date_str: str) -> bool:
    if not date_str:
        return False
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except ValueError:
        return False

def parse_date(date_str: str):
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None

def validate_price_bounds(base_price: float, min_price: float, max_price: float) -> tuple[bool, str]:
    if min_price <= 0:
        return False, "Minimum price must be greater than zero."
    if min_price > base_price:
        return False, "Minimum price cannot be greater than base price."
    if base_price > max_price:
        return False, "Base price cannot be greater than maximum price."
    if max_price > base_price * 4.0:
        return False, "Maximum price cannot exceed 400% of base price to prevent price gouging."
    return True, ""
