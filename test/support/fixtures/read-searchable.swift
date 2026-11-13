// Reads a PDF with Apple's PDFKit (what Preview and iOS read with) and prints, as JSON, each page's text and where
// some phrases are found:  swift read-searchable.swift copy.pdf "a phrase" "another"
import Foundation
import PDFKit
let doc = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!
var pages: [[String: Any]] = []
for i in 0..<doc.pageCount {
  let page = doc.page(at: i)!
  var found: [[String: Any]] = []
  for probe in CommandLine.arguments.dropFirst(2) {
    for sel in doc.findString(probe, withOptions: []) where sel.pages.first == page {
      let r = sel.bounds(for: page), round = { (v: CGFloat) in (Double(v) * 10).rounded() / 10 }
      found.append(["phrase": probe, "x": round(r.minX), "y": round(r.minY), "w": round(r.width), "h": round(r.height)])
    }
  }
  pages.append(["page": i + 1, "rotation": page.rotation, "text": page.string ?? "", "found": found])
}
let data = try JSONSerialization.data(withJSONObject: ["pages": pages], options: [.sortedKeys])
print(String(data: data, encoding: .utf8)!)
