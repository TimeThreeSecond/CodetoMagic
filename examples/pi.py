"""Chudnovsky + binary splitting: calculate pi with integer arithmetic.

Run: python examples/pi.py
No third-party packages are needed. Change DIGITS in main() for more decimals.
The application only visualizes this file; it never executes imported Python.
"""

from math import isqrt

C3_OVER_24 = 640320 ** 3 // 24


def binary_split(start: int, end: int) -> tuple[int, int, int]:
    """Return (P, Q, T) for the half-open Chudnovsky term interval."""
    if end - start == 1:
        if start == 0:
            return 1, 1, 13591409
        p = (6 * start - 5) * (2 * start - 1) * (6 * start - 1)
        q = start ** 3 * C3_OVER_24
        t = p * (13591409 + 545140134 * start)
        if start & 1:
            t = -t
        return p, q, t

    middle = (start + end) // 2
    p_left, q_left, t_left = binary_split(start, middle)
    p_right, q_right, t_right = binary_split(middle, end)
    return p_left * p_right, q_left * q_right, t_left * q_right + p_left * t_right


def calculate_pi(digits: int = 1000) -> str:
    """Return pi truncated to `digits` places (not rounded)."""
    if not isinstance(digits, int) or isinstance(digits, bool) or digits < 1:
        raise ValueError("digits must be a positive integer")
    # Each term contributes roughly 14 decimal digits; keep 20 guard places.
    precision = digits + 20
    terms = precision // 14 + 2
    _, q, t = binary_split(0, terms)
    scale = 10 ** precision
    square_root = isqrt(10005 * scale * scale)
    scaled_pi = q * 426880 * square_root // t
    scaled_pi //= 10 ** 20

    # Format in small chunks, so Python's integer-to-string digit limit is
    # irrelevant without changing interpreter-wide security settings.
    chunks = []
    while scaled_pi:
        scaled_pi, remainder = divmod(scaled_pi, 10 ** 9)
        chunks.append(f"{remainder:09d}")
    decimal = "".join(reversed(chunks)).lstrip("0")
    return decimal[0] + "." + decimal[1:]


def main() -> None:
    DIGITS = 1000
    result = calculate_pi(DIGITS)
    assert result.startswith("3.14159265358979323846264338327950288419716939937510")
    assert len(result.split(".")[1]) == DIGITS
    print(f"Pi to {DIGITS} decimal places (truncated):")
    print(result)


if __name__ == "__main__":
    main()
