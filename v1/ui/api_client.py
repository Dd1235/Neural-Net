from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Optional

import requests

from .state import get_api_base_url


@dataclass
class APIResponse:
    payload: Optional[Dict[str, Any]]
    data: Any
    status_code: int
    url: str


class APIClientError(Exception):
    """Raised when the backend call fails."""


def call_api(
    path: str,
    *,
    method: str = "GET",
    payload: Optional[Dict[str, Any]] = None,
    timeout: int = 120,
) -> APIResponse:
    """Execute an HTTP request against the FastAPI backend."""
    base_url = get_api_base_url()
    url = f"{base_url}{path}"
    try:
        response = requests.request(
            method,
            url,
            json=payload,
            timeout=timeout,
        )
    except requests.RequestException as exc:
        raise APIClientError(str(exc)) from exc

    if not response.ok:
        snippet = response.text[:400]
        raise APIClientError(f"{response.status_code} from {url}: {snippet}")

    if not response.content:
        data: Any = {}
    else:
        try:
            data = response.json()
        except ValueError:
            data = response.text

    return APIResponse(payload=payload, data=data, status_code=response.status_code, url=url)

