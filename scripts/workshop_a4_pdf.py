"""Create a human-readable A4 cut-card PDF from workshopCardPages JSON on stdin."""

import json
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


FONT_DIR = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Arial", str(FONT_DIR / "arial.ttf")))
pdfmetrics.registerFont(TTFont("ArialBold", str(FONT_DIR / "arialbd.ttf")))


def cm(value):
    return f"{round(float(value) * 10) / 100:.2f}"


def fit_text(pdf, value, x, y, max_width, size=10, bold=False):
    font = "ArialBold" if bold else "Arial"
    text = str(value)
    while size > 7 and pdfmetrics.stringWidth(text, font, size) > max_width:
        size -= 0.4
    pdf.setFont(font, size)
    if pdfmetrics.stringWidth(text, font, size) > max_width:
        while text and pdfmetrics.stringWidth(text + "…", font, size) > max_width:
            text = text[:-1]
        text += "…"
    pdf.drawString(x, y, text)


def draw_card(pdf, part, x, y, width, height):
    pdf.setFillColor(colors.HexColor("#1C2F38"))
    pdf.setStrokeColor(colors.HexColor("#9AA8AE"))
    pdf.setLineWidth(0.7)
    pdf.rect(x, y, width, height)
    pad = 10
    top = y + height - pad
    fit_text(pdf, f"{part['sequence']} · {part['id']}   {part['name']}", x + pad, top - 3, width - 80, 11, True)
    fit_text(pdf, "1 шт.", x + width - 44, top - 3, 38, 9, True)
    fit_text(pdf, f"{part['material']} · {part['decor']}", x + pad, top - 20, width - 2 * pad, 8)
    cut = f"ГОТОВЫЙ РАЗМЕР ПОСЛЕ КРОМКИ: {cm(part['u'])} × {cm(part['v'])} × {cm(part['thickness'])} см"
    fit_text(pdf, cut, x + pad, top - 39, width - 2 * pad, 10, True)

    u, v = max(float(part["u"]), 1), max(float(part["v"]), 1)
    draw_left, draw_bottom, max_w, max_h = x + 52, y + 93, width - 100, 76
    scale = min(max_w / u, max_h / v)
    w, h = max(18, u * scale), max(12, v * scale)
    bx = draw_left + (max_w - w) / 2
    by = draw_bottom + (max_h - h) / 2
    pdf.setFillColor(colors.white)
    pdf.setStrokeColor(colors.HexColor("#637078"))
    pdf.rect(bx, by, w, h, fill=1, stroke=1)
    for i, (x1, y1, x2, y2) in enumerate([
        (bx, by, bx, by + h),
        (bx + w, by, bx + w, by + h),
        (bx, by + h, bx + w, by + h),
        (bx, by, bx + w, by),
    ]):
        marked = float(part["edges"][i]) > 0
        pdf.setStrokeColor(colors.HexColor("#27205F" if marked else "#8A969C"))
        pdf.setLineWidth(3.3 if marked else 0.7)
        pdf.line(x1, y1, x2, y2)
    pdf.setStrokeColor(colors.HexColor("#34444A"))
    pdf.setLineWidth(0.6)
    pdf.line(bx, by - 12, bx + w, by - 12)
    pdf.line(bx, by - 17, bx, by - 7)
    pdf.line(bx + w, by - 17, bx + w, by - 7)
    pdf.line(bx - 15, by, bx - 15, by + h)
    pdf.line(bx - 20, by, bx - 10, by)
    pdf.line(bx - 20, by + h, bx - 10, by + h)
    pdf.setFillColor(colors.HexColor("#243238"))
    pdf.setFont("ArialBold", 9)
    pdf.drawCentredString(bx + w / 2, by - 25, f"{cm(u)} см")
    pdf.saveState()
    pdf.translate(bx - 27, by + h / 2)
    pdf.rotate(90)
    pdf.drawCentredString(0, 0, f"{cm(v)} см")
    pdf.restoreState()

    labels = ["слева", "справа", "сверху", "снизу"]
    edge_text = " · ".join(
        f"{label}: {part['edgeType']} {part['edges'][i]} мм" if float(part["edges"][i]) > 0 else f"{label}: -"
        for i, label in enumerate(labels)
    )
    fit_text(pdf, "КРОМКА — толстые стороны чертежа", x + pad, y + 60, width - 2 * pad, 8, True)
    fit_text(pdf, edge_text, x + pad, y + 45, width - 2 * pad, 8)
    fit_text(pdf, f"Заготовка до кромки: {cm(part['blankU'])} × {cm(part['blankV'])} см", x + pad, y + 27, width - 2 * pad, 8)
    fit_text(pdf, "Схема не в масштабе; резать по указанным числам.", x + pad, y + 12, width - 2 * pad, 7)


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: workshop_a4_pdf.py OUTPUT.pdf < pages.json")
    data = json.load(sys.stdin)
    path = Path(sys.argv[1])
    path.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(path), pagesize=landscape(A4), pageCompression=1)
    page_w, page_h = landscape(A4)
    margin, gap, header, footer = 24, 10, 52, 27
    card_w = (page_w - 2 * margin - gap) / 2
    card_h = (page_h - 2 * margin - header - footer - gap) / 2
    for index, page in enumerate(data["pages"], 1):
        pdf.setFillColor(colors.HexColor("#1C2F38"))
        fit_text(pdf, f"{data['name']} · {page['title']}", margin, page_h - margin - 12, page_w - 150, 14, True)
        fit_text(pdf, f"{index} / {len(data['pages'])}", page_w - margin - 60, page_h - margin - 12, 60, 9, True)
        fit_text(pdf, page["meta"], margin, page_h - margin - 30, page_w - 2 * margin, 9)
        if data["draft"] or page.get("unplaced"):
            pdf.setFillColor(colors.HexColor("#AD2020"))
            warning = "НЕ РАЗМЕЩЕНО — НЕ ПИЛИТЬ" if page.get("unplaced") else "ЧЕРНОВИК — СВЕРИТЬ ПЕРЕД РАСПИЛОМ"
            fit_text(pdf, warning, margin, page_h - margin - 44, page_w - 2 * margin, 11, True)
        for slot, part in enumerate(page["parts"]):
            col, row = slot % 2, slot // 2
            x = margin + col * (card_w + gap)
            y = margin + footer + (1 - row) * (card_h + gap)
            draw_card(pdf, part, x, y, card_w, card_h)
        pdf.setFillColor(colors.HexColor("#455960"))
        fit_text(pdf, "Бланк для мастера, не программа станка. Перед резом сверить материал, лист, пропил и кромку.", margin, margin + 7, page_w - 2 * margin, 8)
        pdf.showPage()
    pdf.save()
    print(f"{path} ({len(data['pages'])} pages)")


if __name__ == "__main__":
    main()
