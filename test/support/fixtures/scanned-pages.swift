// Makes scanned-pages.pdf and scanned-pages.geometry.json: a three-page PDF as a scanner would give it, and where its words are.
//   swift scanned-pages.swift scanned-pages.pdf scanned-pages.geometry.json
// Page 1 is a picture of a typeset page, a little tilted and grainy. Page 2 is a picture stored sideways and turned
// upright by the page's own rotation, as a scanner fed the long way writes it. Page 3 has real text. Nothing is
// downloaded: the pages are typeset here, drawn into bitmaps, and the bitmaps are what the PDF holds.
// The geometry file says, for each picture page, its lines and each word's box in hundredths of a percent of the page
// as it is shown: what a recogniser that read the page perfectly would report.
import Foundation
import PDFKit
import CoreText
import AppKit
import ImageIO

let out = URL(fileURLWithPath: CommandLine.arguments[1]), geometryOut = URL(fileURLWithPath: CommandLine.arguments[2])
let W: CGFloat = 612, H: CGFloat = 792, scale: CGFloat = 150 / 72
let body = CTFontCreateWithName("Times-Roman" as CFString, 13, nil), head = CTFontCreateWithName("Times-Bold" as CFString, 19, nil)

struct Word { let text: String; let x: Int; let y: Int; let w: Int; let h: Int }
// A small generator with a fixed start, so the grain is the same every time the fixture is made.
var seed: UInt32 = 20261113
func chance() -> UInt32 { seed = seed &* 1664525 &+ 1013904223; return seed >> 8 }

/// One typeset page as a grey bitmap (JPEG), tilted by `tilt` radians about its middle, with the box of every word.
func scan(_ lines: [String], tilt: CGFloat) -> (Data, [[Word]]) {
  let pw = Int(W * scale), ph = Int(H * scale)
  let ctx = CGContext(data: nil, width: pw, height: ph, bitsPerComponent: 8, bytesPerRow: pw, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)!
  ctx.setFillColor(gray: 0.93, alpha: 1); ctx.fill(CGRect(x: 0, y: 0, width: pw, height: ph))
  ctx.scaleBy(x: scale, y: scale)
  let turn = CGAffineTransform(translationX: W / 2, y: H / 2).rotated(by: tilt).translatedBy(x: -W / 2, y: -H / 2)
  ctx.concatenate(turn)
  ctx.setFillColor(gray: 0.12, alpha: 1)
  var found: [[Word]] = [], y: CGFloat = 708
  for (i, line) in lines.enumerated() {
    if line.isEmpty { y -= 20; continue }
    let attrs = [kCTFontAttributeName: i == 0 ? head : body, kCTForegroundColorFromContextAttributeName: true] as CFDictionary
    let ct = CTLineCreateWithAttributedString(CFAttributedStringCreate(nil, line as CFString, attrs)!)
    ctx.textPosition = CGPoint(x: 80, y: y); CTLineDraw(ct, ctx)
    var ascent: CGFloat = 0, descent: CGFloat = 0, leading: CGFloat = 0
    _ = CTLineGetTypographicBounds(ct, &ascent, &descent, &leading)
    var words: [Word] = [], at = 0
    let text = line as NSString
    for part in line.components(separatedBy: " ") {
      let length = (part as NSString).length
      if length > 0 {
        let x0 = 80 + CTLineGetOffsetForStringIndex(ct, at, nil), x1 = 80 + CTLineGetOffsetForStringIndex(ct, at + length, nil)
        let box = CGRect(x: x0, y: y - descent, width: x1 - x0, height: ascent + descent).applying(turn)
        let unit = { (v: CGFloat) in Int((v * 10000).rounded()) }
        words.append(Word(text: text.substring(with: NSRange(location: at, length: length)), x: unit(box.minX / W), y: unit(1 - box.maxY / H), w: unit(box.width / W), h: unit(box.height / H)))
      }
      at += length + 1
    }
    found.append(words); y -= i == 0 ? 36 : 21
  }
  // Grain, and a few specks, as paper and glass give.
  let pixels = ctx.data!.bindMemory(to: UInt8.self, capacity: pw * ph)
  for i in 0..<(pw * ph) { let v = Int(pixels[i]) + Int(chance() % 11) - 5; pixels[i] = UInt8(max(0, min(255, v))) }
  for _ in 0..<40 { let at = Int(chance()) % (pw * (ph - 2)); pixels[at] = 60; pixels[at + 1] = 90; pixels[at + pw] = 80 }
  let image = ctx.makeImage()!, data = NSMutableData()
  let dest = CGImageDestinationCreateWithData(data, "public.jpeg" as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: 0.35] as CFDictionary); CGImageDestinationFinalize(dest)
  return (data as Data, found)
}

let first = ["On reading old pages", "",
  "A scanned page is a picture of words, not the words. The eye", "reads it at once; a program has to work the letters out, one",
  "by one, from their shapes. Where the paper was clean and the", "glass was level, it does this well.",
  "", "Faint ink, a tilted sheet or a stain make it guess. Good tools", "say how sure they are of each word, and leave the doubtful",
  "ones for a person to judge."]
let second = ["Margins and measures", "",
  "Leave room at the edge of a page. The margin is where a", "reader answers the writer, and where a binder hides the fold.",
  "", "Measure twice: once in the units of the page, once in the", "units of the thing it describes."]
let third = ["A page with its own text", "", "This page was typed, not scanned. Its words can be selected", "as they are, and nothing needs to be recognised here."]

let (firstPicture, firstWords) = scan(first, tilt: 0.004), (secondPicture, secondWords) = scan(second, tilt: -0.003)
let temp = FileManager.default.temporaryDirectory.appendingPathComponent("scanned-pages-\(ProcessInfo.processInfo.processIdentifier).pdf")
let picture = { (data: Data) in CGImage(jpegDataProviderSource: CGDataProvider(data: data as CFData)!, decode: nil, shouldInterpolate: true, intent: .defaultIntent)! }
var upright = CGRect(x: 0, y: 0, width: W, height: H), sideways = CGRect(x: 0, y: 0, width: H, height: W)
let pdf = CGContext(temp as CFURL, mediaBox: &upright, nil)!
pdf.beginPage(mediaBox: &upright); pdf.draw(picture(firstPicture), in: upright); pdf.endPage()
// Stored a quarter turn anticlockwise; the page's rotation (set below) turns it back.
pdf.beginPage(mediaBox: &sideways); pdf.saveGState(); pdf.translateBy(x: H, y: 0); pdf.rotate(by: .pi / 2); pdf.draw(picture(secondPicture), in: upright); pdf.restoreGState(); pdf.endPage()
pdf.beginPage(mediaBox: &upright)
var y: CGFloat = 708
for (i, line) in third.enumerated() {
  if line.isEmpty { y -= 20; continue }
  let ct = CTLineCreateWithAttributedString(CFAttributedStringCreate(nil, line as CFString, [kCTFontAttributeName: i == 0 ? head : body] as CFDictionary)!)
  pdf.textPosition = CGPoint(x: 80, y: y); CTLineDraw(ct, pdf); y -= i == 0 ? 36 : 21
}
pdf.endPage(); pdf.closePDF()

let doc = PDFDocument(url: temp)!
doc.page(at: 1)!.rotation = 90
doc.documentAttributes = [PDFDocumentAttribute.titleAttribute: "Scanned pages", PDFDocumentAttribute.authorAttribute: "Fixture"]
doc.write(to: out)
try? FileManager.default.removeItem(at: temp)

let lines = { (found: [[Word]]) in found.map { $0.map { ["text": $0.text, "x": $0.x, "y": $0.y, "w": $0.w, "h": $0.h] as [String: Any] } } }
let geometry: [String: Any] = ["pages": [["page": 1, "lines": lines(firstWords)], ["page": 2, "lines": lines(secondWords)]]]
try JSONSerialization.data(withJSONObject: geometry, options: [.sortedKeys]).write(to: geometryOut)
print("pages", doc.pageCount, "words", firstWords.joined().count + secondWords.joined().count)
