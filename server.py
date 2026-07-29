from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import cgi
import json
import os
import shutil
import subprocess
import uuid

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache"
MAX_UPLOAD = 500 * 1024 * 1024
os.chdir(ROOT)


def find_blender():
    configured = os.environ.get("FIELD_STUDIO_BLENDER")
    if configured and Path(configured).is_file():
        return Path(configured)

    executable = shutil.which("blender")
    if executable:
        return Path(executable)

    if os.name == "nt":
        program_files = Path(os.environ.get("ProgramFiles", r"C:\Program Files"))
        foundation = program_files / "Blender Foundation"
        candidates = sorted(foundation.glob("Blender */blender.exe"), reverse=True)
        if candidates:
            return candidates[0]

    return None


class FieldStudioHandler(SimpleHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if urlparse(self.path).path != "/api/convert-glb":
            self.send_json(404, {"error": "Unknown endpoint"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        if not length or length > MAX_UPLOAD:
            self.send_json(413, {"error": "GLB 文件为空或超过 500 MB"})
            return

        blender = find_blender()
        if not blender:
            self.send_json(
                503,
                {"error": "未找到 Blender。请安装 Blender、加入 PATH，或设置 FIELD_STUDIO_BLENDER。"},
            )
            return

        job_id = uuid.uuid4().hex
        job_dir = CACHE / job_id
        job_dir.mkdir(parents=True, exist_ok=False)
        try:
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                },
            )
            field = form["file"] if "file" in form else None
            if field is None or not getattr(field, "file", None):
                raise ValueError("请求中没有 GLB 文件")

            source = job_dir / "source.glb"
            with source.open("wb") as target:
                shutil.copyfileobj(field.file, target)

            command = [
                str(blender),
                "--background",
                "--factory-startup",
                "--python",
                str(ROOT / "convert_glb.py"),
                "--",
                str(source),
                str(job_dir),
            ]
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=300,
            )
            manifest_path = job_dir / "manifest.json"
            if completed.returncode != 0 or not manifest_path.exists():
                detail = (completed.stderr or completed.stdout)[-1200:]
                raise RuntimeError(f"Blender 转换失败：{detail.strip()}")

            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["frames"] = [
                f"/cache/{job_id}/{name}" for name in manifest["frames"]
            ]
            if manifest.get("sdf"):
                manifest["sdf"]["url"] = (
                    f"/cache/{job_id}/{manifest['sdf']['url']}"
                )
                manifest["sdf"]["materialUrl"] = (
                    f"/cache/{job_id}/{manifest['sdf']['materialUrl']}"
                )
            self.send_json(200, manifest)
        except subprocess.TimeoutExpired:
            shutil.rmtree(job_dir, ignore_errors=True)
            self.send_json(504, {"error": "Blender 转换超过 5 分钟"})
        except Exception as error:
            shutil.rmtree(job_dir, ignore_errors=True)
            self.send_json(500, {"error": str(error)})


if __name__ == "__main__":
    CACHE.mkdir(exist_ok=True)
    print("Field Studio running at http://127.0.0.1:4173", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 4173), FieldStudioHandler).serve_forever()
