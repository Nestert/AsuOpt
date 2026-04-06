#!/usr/bin/env python3
"""
extract_pdf_text.py — извлечение текста из PDF по страницам с помощью PyMuPDF.

Принимает два аргумента: путь к PDF-файлу и путь к выходному JSON-файлу.
Выходной формат:
{
  "pageCount": N,
  "pages": [
    { "page": 1, "text": "...", "isScanned": false },
    ...
  ],
  "warnings": ["..."]  // если текст не извлёкся (скан без OCR)
}
"""

import sys
import json
import os

def extract(pdf_path, out_path):
    warnings = []
    pages = []

    try:
        import fitz  # PyMuPDF
    except ImportError:
        result = {
            "pageCount": 0,
            "pages": [],
            "warnings": ["PyMuPDF (fitz) не установлен — текст не извлечён"]
        }
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
        return

    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        result = {
            "pageCount": 0,
            "pages": [],
            "warnings": [f"Не удалось открыть PDF: {str(e)}"]
        }
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
        return

    page_count = len(doc)

    for i, page in enumerate(doc):
        text = page.get_text("text")
        # Считаем страницу сканированной если текста менее 20 символов
        is_scanned = len(text.strip()) < 20
        if is_scanned:
            warnings.append(f"Страница {i+1}: текст не извлечён (возможно скан). OCR не выполнялся.")
        pages.append({
            "page": i + 1,
            "text": text,
            "isScanned": is_scanned
        })

    doc.close()

    result = {
        "pageCount": page_count,
        "pages": pages,
        "warnings": warnings
    }
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: extract_pdf_text.py <pdf_path> <out_json_path>"}))
        sys.exit(1)
    extract(sys.argv[1], sys.argv[2])
