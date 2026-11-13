"""Extracts the text of PDFs page by page into <name>.txt next to each PDF (needs pypdf).

    python3 -I scripts/library/pdftxt.py <file.pdf> ...
"""
import sys, pypdf
for p in sys.argv[1:]:
    try:
        r = pypdf.PdfReader(p)
        t = "\n".join(f"=== page {i+1}\n" + (pg.extract_text() or "") for i, pg in enumerate(r.pages))
        open(p[:-4] + ".txt", "w").write(t)
        print(p, len(r.pages), "pages", len(t), "chars")
    except Exception as e:
        print(p, "ERR", e)
