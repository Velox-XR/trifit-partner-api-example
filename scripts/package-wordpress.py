"""Build only the public WordPress plugin, without any local configuration."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1] / 'examples/wordpress'
files = ['velox-dress-me-php.php', 'view.php', 'app.js', 'style.css',
         'assets/before.svg', 'assets/after.svg']
target = root / 'downloads/velox-dress-me-php.zip'
target.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in files:
        path = root / 'velox-dress-me-php' / name
        data = path.read_bytes().replace(b'\r\n', b'\n')
        entry = zipfile.ZipInfo('velox-dress-me-php/' + name, (2026, 11, 23, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o644 << 16
        archive.writestr(entry, data)
print(target.relative_to(root.parents[1]))
