import base64

import requests

ENDPOINT = "https://dd1235--nn-image-caption-imagecaptionserver-caption-image.modal.run"


def encode_image_to_base64(path: str) -> str:
    """Read a file and return base64 encoded string."""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def main():
    img_b64 = encode_image_to_base64("sample.jpg")

    payload = {"image_base64": img_b64, "prompt": "caption this image for instagram"}

    print("Sending request to Modal endpoint...\n")

    res = requests.post(ENDPOINT, json=payload)

    print("Status:", res.status_code)
    try:
        print("Response JSON:", res.json())
    except Exception:
        print("Raw Response:", res.text)


if __name__ == "__main__":
    main()
