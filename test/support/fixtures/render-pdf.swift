// Reads a PDF with Apple's PDFKit (what Preview and iOS read with), draws each page to a PNG the way it is shown,
// and prints, as JSON, each page's size as shown, its rotation, its annotations and its text:
//   swift render-pdf.swift copy.pdf <folder for the PNGs> [pixels per point]
import Foundation
import PDFKit
import AppKit

let doc = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!
let out = URL(fileURLWithPath: CommandLine.arguments[2])
let scale = CommandLine.arguments.count > 3 ? CGFloat(Double(CommandLine.arguments[3]) ?? 2) : 2
var pages: [[String: Any]] = []
for i in 0..<doc.pageCount {
  let page = doc.page(at: i)!
  let box = page.bounds(for: .cropBox)
  let turned = page.rotation % 180 != 0
  let size = CGSize(width: (turned ? box.height : box.width) * scale, height: (turned ? box.width : box.height) * scale)
  let width = Int(size.width.rounded()), height = Int(size.height.rounded())
  let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
  ctx.scaleBy(x: scale, y: scale)
  page.draw(with: .cropBox, to: ctx)
  let file = out.appendingPathComponent("page-\(i + 1).png")
  let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
  try! rep.representation(using: .png, properties: [:])!.write(to: file)
  let round = { (v: CGFloat) in (Double(v) * 10).rounded() / 10 }
  pages.append([
    "page": i + 1, "label": page.label ?? "", "rotation": page.rotation,
    "shown": [round(turned ? box.height : box.width), round(turned ? box.width : box.height)],
    "annotations": page.annotations.map { $0.type ?? "?" },
    "text": page.string ?? "", "png": file.path
  ])
}
let data = try JSONSerialization.data(withJSONObject: ["pages": pages], options: [.sortedKeys])
print(String(data: data, encoding: .utf8)!)
