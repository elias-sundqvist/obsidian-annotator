"""Generate a deterministic synthetic 40-page native-PDF lifecycle fixture."""
import sys
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from pypdf import PdfReader


def make_fixture(path):
    pdf = canvas.Canvas(path, pagesize=(612, 792), invariant=1)
    pdf.setTitle('Synthetic PDF virtualization field guide')
    for number in range(1, 41):
        pdf.setFillColor(HexColor('#3158bb'))
        pdf.setFont('Helvetica-Bold', 24)
        pdf.drawString(48, 726, f'Virtualization page {number:02}')
        pdf.setFillColor(HexColor('#202020'))
        pdf.setFont('Helvetica', 14)
        pdf.drawString(48, 668, f'Unique anchor {number:02} belongs to this PDF page.')
        pdf.setFont('Helvetica', 11)
        for row in range(12):
            pdf.drawString(48, 620 - row * 30,
                           f'Synthetic passage {number:02}.{row:02}: scroll away and return to verify saved highlights.')
        pdf.setFillColor(HexColor('#666666'))
        pdf.drawString(48, 48, f'UI test fixture - no personal content - page {number} of 40')
        pdf.showPage()
    pdf.save()
    reader = PdfReader(path)
    assert len(reader.pages) == 40
    for number, page in enumerate(reader.pages, 1):
        assert f'Unique anchor {number:02}' in page.extract_text()


if __name__ == '__main__':
    make_fixture(sys.argv[1])
