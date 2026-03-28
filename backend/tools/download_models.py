from pathlib import Path
import requests

MODELS = {
    "face_detection_yunet_2023mar.onnx": "https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx",
    "face_recognition_sface_2021dec.onnx": "https://huggingface.co/opencv/face_recognition_sface/resolve/main/face_recognition_sface_2021dec.onnx",
}

ROOT = Path(__file__).resolve().parents[1] / "models"
ROOT.mkdir(parents=True, exist_ok=True)

MIN_SIZE = {
    "face_detection_yunet_2023mar.onnx": 150_000,
    "face_recognition_sface_2021dec.onnx": 30_000_000,
}

def download_file(url: str, target: Path) -> None:
    print(f"[download] {target.name}")
    with requests.get(url, stream=True, timeout=120) as response:
        response.raise_for_status()
        with target.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)
    print(f"[ok] {target} ({target.stat().st_size} bytes)")

if __name__ == "__main__":
    for filename, url in MODELS.items():
        target = ROOT / filename
        if target.exists() and target.stat().st_size >= MIN_SIZE[filename]:
            print(f"[skip] {filename} already exists")
            continue
        if target.exists():
            target.unlink()
        download_file(url, target)
