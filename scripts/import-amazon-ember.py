#!/usr/bin/env python3
"""Import only the owner-supplied, verified font faces. No download or conversion."""
import argparse
import hashlib
from pathlib import Path
from zipfile import ZipFile

FACES = [
  [
    "Amazon Ember Display Light.ttf",
    "Ember-Display-Light.ttf",
    "a22806c4a7b779930f6b67d68ad2cdc817c1f9c84953f07d5212b400ca29db4d"
  ],
  [
    "Amazon Ember Light.ttf",
    "Ember-Light.ttf",
    "aae090aefd692a1f590f51f7b915b0ae11b5f345221b05211d5156b60ff75b3e"
  ],
  [
    "Amazon Ember.ttf",
    "Ember-Regular.ttf",
    "05b2a9732500a1ef59a0e4d29ca699ec4134e1f10454a8df9945910522b01561"
  ],
  [
    "Amazon Ember Bold.ttf",
    "Ember-Bold.ttf",
    "d3922a88b50a95e27a6b1ebb8cb6cd466178d453926e83fe61d672df03d5351d"
  ],
  [
    "Amazon Ember Light Italic.ttf",
    "Ember-Light-Italic.ttf",
    "a26c80c5fa70341d7ad566e22b3c376b3ab0c57c5267b45483e438c0e1bc46c9"
  ],
  [
    "Amazon Ember Mono.ttf",
    "Ember-Mono.ttf",
    "36926e8d0bd409870136802075f0dd4dadde68fd32b22430bf9d81bd253ed7c9"
  ]
]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    dest = Path(__file__).resolve().parents[1] / "src/assets/techblog-fonts"
    staged = []
    with ZipFile(args.archive) as archive:
        for source, target, expected in FACES:
            matches = [i for i in archive.infolist() if i.filename == source]
            if len(matches) != 1 or matches[0].file_size > 2_000_000:
                raise SystemExit(f"Missing or invalid font: {source}")
            payload = archive.read(matches[0])
            if hashlib.sha256(payload).hexdigest() != expected:
                raise SystemExit(f"Unexpected SHA-256: {source}")
            staged.append((dest / target, payload))
    for path, payload in staged:
        if path.exists() and path.read_bytes() != payload:
            raise SystemExit(f"Refusing to overwrite differing font: {path.name}")
    dest.mkdir(parents=True, exist_ok=True)
    for path, payload in staged:
        path.write_bytes(payload)
        print(f"Imported {path.name}")
    print("Verified six font faces. Commit these assets on the feature branch.")

if __name__ == "__main__":
    main()
