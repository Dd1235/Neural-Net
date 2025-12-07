import "@testing-library/jest-dom";
import "whatwg-fetch";

if (!process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL) {
  process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL = "http://localhost:8000";
}
