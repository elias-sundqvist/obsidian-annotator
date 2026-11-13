import Foundation
import PDFKit
import CoreText
import AppKit

let base = URL(fileURLWithPath: CommandLine.arguments[1]), out = URL(fileURLWithPath: CommandLine.arguments[2])
var box = CGRect(x: 0, y: 0, width: 612, height: 792)
let ctx = CGContext(base as CFURL, mediaBox: &box, nil)!
let pages: [[String]] = [
  ["Notes on careful measurement", "",
   "Every instrument tells you something about the world and", "something about itself. The trick is learning which is which",
   "before you write anything down. A careful measurement is", "repeated, and its spread is reported with its value.",
   "", "Keep the raw numbers. They outlast the story told about them."],
  ["Waves and patterns", "",
   "A wave carries a pattern without carrying the stuff it moves", "through. Watch a cork on a pond: it bobs, and stays."]
]
let font = CTFontCreateWithName("Helvetica" as CFString, 14, nil), title = CTFontCreateWithName("Helvetica-Bold" as CFString, 20, nil)
for lines in pages {
  ctx.beginPDFPage(nil)
  var y: CGFloat = 720
  for (i, line) in lines.enumerated() {
    let attrs = [kCTFontAttributeName: i == 0 ? title : font] as CFDictionary
    let ct = CTLineCreateWithAttributedString(CFAttributedStringCreate(nil, line as CFString, attrs)!)
    ctx.textPosition = CGPoint(x: 72, y: y); CTLineDraw(ct, ctx); y -= i == 0 ? 34 : 22
  }
  ctx.endPDFPage()
}
ctx.closePDF()

let doc = PDFDocument(url: base)!
let first = doc.page(at: 0)!, second = doc.page(at: 1)!
func mark(_ text: String, _ type: PDFAnnotationSubtype, _ color: NSColor, _ note: String?) {
  let parts = text.components(separatedBy: "|").compactMap { doc.findString($0, withOptions: []).first }
  guard let sel = parts.first, let page = sel.pages.first else { print("not found: \(text)"); return }
  for other in parts.dropFirst() { sel.add(other) }
  let whole = sel.bounds(for: page)
  let a = PDFAnnotation(bounds: whole, forType: type, withProperties: nil)
  var quads: [NSValue] = []
  for line in sel.selectionsByLine() { let b = line.bounds(for: page)
    for p in [CGPoint(x: b.minX, y: b.maxY), CGPoint(x: b.maxX, y: b.maxY), CGPoint(x: b.minX, y: b.minY), CGPoint(x: b.maxX, y: b.minY)] { quads.append(NSValue(point: CGPoint(x: p.x - whole.minX, y: p.y - whole.minY))) } }
  a.quadrilateralPoints = quads; a.color = color; a.userName = "Robin Reader"; if let note = note { a.contents = note }
  page.addAnnotation(a)
}
mark("something about the world and|something about itself", .highlight, NSColor(red: 1, green: 0.92, blue: 0.3, alpha: 1), "Both at once \u{2014} na\u{00EF}ve readers miss this")
mark("repeated", .underline, NSColor(red: 0.2, green: 0.5, blue: 0.95, alpha: 1), nil)
mark("the story told about them", .strikeOut, NSColor(red: 0.9, green: 0.25, blue: 0.5, alpha: 1), "Too glib")
mark("it bobs, and stays", .highlight, NSColor(red: 0.6, green: 0.9, blue: 0.55, alpha: 1), nil)

let sticky = PDFAnnotation(bounds: CGRect(x: 520, y: 700, width: 20, height: 20), forType: .text, withProperties: nil)
sticky.contents = "Check the units in this section"; sticky.color = NSColor(red: 1, green: 0.8, blue: 0.4, alpha: 1); sticky.userName = "Robin Reader"; first.addAnnotation(sticky)
let empty = PDFAnnotation(bounds: CGRect(x: 560, y: 700, width: 20, height: 20), forType: .text, withProperties: nil); first.addAnnotation(empty)

let ink = PDFAnnotation(bounds: CGRect(x: 60, y: 480, width: 320, height: 90), forType: .ink, withProperties: nil)
let path = NSBezierPath(); path.move(to: CGPoint(x: 10, y: 20))
for i in 1...24 { path.line(to: CGPoint(x: 10 + CGFloat(i) * 12, y: 45 + 30 * sin(CGFloat(i) / 3))) }
ink.add(path)
let tick = NSBezierPath(); tick.move(to: CGPoint(x: 250, y: 10)); tick.line(to: CGPoint(x: 265, y: 0)); tick.line(to: CGPoint(x: 300, y: 40)); ink.add(tick)
ink.color = NSColor(red: 0.55, green: 0.35, blue: 0.9, alpha: 1); let border = PDFBorder(); border.lineWidth = 2.5; ink.border = border; first.addAnnotation(ink)

let square = PDFAnnotation(bounds: CGRect(x: 66, y: 596, width: 420, height: 52), forType: .square, withProperties: nil)
square.color = NSColor(red: 0.95, green: 0.5, blue: 0.1, alpha: 1); square.contents = "The heart of it"; first.addAnnotation(square)

let free = PDFAnnotation(bounds: CGRect(x: 72, y: 560, width: 220, height: 40), forType: .freeText, withProperties: nil)
free.contents = "A typed remark in the margin"; free.font = NSFont(name: "Helvetica", size: 12); free.fontColor = .black; free.color = .clear; second.addAnnotation(free)

for i in 0..<doc.pageCount { for a in doc.page(at: i)!.annotations { a.userName = "Robin Reader" } }
doc.documentAttributes = [PDFDocumentAttribute.titleAttribute: "Notes on careful measurement", PDFDocumentAttribute.authorAttribute: "Fixture"]
doc.write(to: out)
print("pages", doc.pageCount, "annotations", first.annotations.count + second.annotations.count)
