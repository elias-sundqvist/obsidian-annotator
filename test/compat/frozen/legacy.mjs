var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// .generated/codec.cjs
var require_codec = __commonJS({
  ".generated/codec.cjs"(exports, module) {
    "use strict";
    var po = Object.defineProperty;
    var Gb = Object.getOwnPropertyDescriptor;
    var Kb = Object.getOwnPropertyNames;
    var Vb = Object.prototype.hasOwnProperty;
    var Yb = (n, e) => {
      for (var t in e) po(n, t, { get: e[t], enumerable: true });
    };
    var Xb = (n, e, t, o) => {
      if (e && typeof e == "object" || typeof e == "function") for (let r of Kb(e)) !Vb.call(n, r) && r !== t && po(n, r, { get: () => e[r], enumerable: !(o = Gb(e, r)) || o.enumerable });
      return n;
    };
    var Zb = (n) => Xb(po({}, "__esModule", { value: true }), n);
    var VA = {};
    Yb(VA, { create: () => WA, inspections: () => ne, readAll: () => de, readSome: () => RA, recolor: () => QA, remove: () => GA, replaceFragment: () => HA, replaceStoredString: () => Db, update: () => UA, write: () => KA });
    module.exports = Zb(VA);
    function Cn(n, e = 0) {
      return n[e] === "\uDC00" ? 4 : n.codePointAt(e) > 65535 ? 2 : 1;
    }
    function hi(n) {
      return n.length < 4 ? n.codePointAt(0) : (n.charCodeAt(1) << 22 | n.charCodeAt(2) << 11 | n.charCodeAt(3)) >>> 0;
    }
    function gi(n) {
      return n.replace(/\uDC00[^]{3}/gu, "\uFFFD");
    }
    function Wn(n) {
      return n.replace(/\p{Cs}/gu, "\uFFFD");
    }
    function yn(n) {
      for (; n !== null && typeof n == "object" && n.$ === "$JMP"; ) n = n.f(n.x);
      return n;
    }
    function zn(n, e) {
      return (...t) => t.length < e ? zn((...o) => n(...t, ...o), e - t.length) : yn(n(...t));
    }
    function mi(n) {
      return n.$ === "None" ? "" : n.value + "";
    }
    function pi(n) {
      if (n.$ === "Nil") return "";
      {
        let e = n.head, t = e.body, o = e.ending, r = n.tail, i = cw(o), s = aw(r), c = i + s;
        return t + c;
      }
    }
    function bi(n, e, t) {
      if (n.$ === "Nil") return t ? { $: "Con", head: { $: "Line", body: "", ending: { $: "Some", value: e } }, tail: { $: "Nil" } } : { $: "Con", head: { $: "Line", body: e + "", ending: { $: "None" } }, tail: { $: "Nil" } };
      {
        let o = n.head, r = o.body, i = o.ending, s = n.tail;
        return t ? { $: "Con", head: { $: "Line", body: "", ending: { $: "Some", value: e } }, tail: { $: "Con", head: { $: "Line", body: r, ending: i }, tail: s } } : { $: "Con", head: { $: "Line", body: e + r, ending: i }, tail: s };
      }
    }
    function wi(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, Cn(t));
          n = t.slice(Cn(t)), e = uw(o, r, Ci(r, `
`));
          continue;
        }
      }
    }
    function nw(n) {
      return wi(lw(n), { $: "Nil" });
    }
    function Ni(n, e) {
      if (n === "") return e;
      {
        let t = n.slice(0, Cn(n)), o = n.slice(Cn(n));
        return { $: "Con", head: { $: "Line", body: t + o, ending: { $: "None" } }, tail: e };
      }
    }
    function xi(n) {
      if (n !== "") {
        let e = n.slice(0, Cn(n));
        return zi(e, `
`);
      } else return false;
    }
    function yi(n, e, t, o) {
      for (; ; ) {
        let r = n, i = e, s = t, c = o;
        if (r === "") return rw(_w(i, s));
        {
          let a = r.slice(0, Cn(r)), $ = r.slice(Cn(r));
          if (c) {
            n = $, e = "", t = { $: "Con", head: { $: "Line", body: i, ending: { $: "Some", value: a } }, tail: s }, o = bo($);
            continue;
          } else {
            let N = a + "";
            n = $, e = i + N, t = s, o = bo($);
            continue;
          }
        }
      }
    }
    function ew(n) {
      return yi(n, "", { $: "Nil" }, bo(n));
    }
    function tw(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, Cn(t));
          n = t.slice(Cn(t)), e = Ci(r, `
`);
          continue;
        }
      }
    }
    function zi(n, e) {
      let t = hi(n), o = hi(e);
      return t === o;
    }
    function ow(n) {
      return iw(n, "");
    }
    function rw(n) {
      return sw(n, { $: "Nil" });
    }
    function iw(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, Cn(t));
          n = t.slice(Cn(t)), e = r + o;
          continue;
        }
      }
    }
    function sw(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head;
          n = t.tail, e = { $: "Con", head: r, tail: o };
          continue;
        }
      }
    }
    var cw = mi;
    var aw = pi;
    var Ci = zi;
    var uw = bi;
    var lw = ow;
    var _w = Ni;
    var bo = xi;
    var Si = { ending_text: zn((n) => gi(yn(mi(n))), 1), encode: zn((n) => gi(yn(pi(n))), 1), push: zn((n, e, t) => yn(bi(n, Wn(e), t)), 3), decode_go: zn((n, e) => yn(wi(Wn(n), e)), 2), decode_exact: zn((n) => yn(nw(Wn(n))), 1), lines_end: zn((n, e) => yn(Ni(Wn(n), e)), 2), head_newline: zn((n) => yn(xi(Wn(n))), 1), lines_go: zn((n, e, t, o) => yn(yi(Wn(n), Wn(e), t, o)), 4), decode: zn((n) => yn(ew(Wn(n))), 1), ends_nl: zn((n, e) => yn(tw(Wn(n), e)), 2) };
    function mt(n) {
      if (n > 281474976710655) throw "bend: a Nat past the largest immediate 2^48-1";
      return n;
    }
    function Fe(n) {
      if (!Number.isInteger(n) || n < 0 || n > 2 ** 53) throw "bend: expected a Nat host number: an integer from 0 to 2^53";
      return n;
    }
    function vi(n) {
      return n.replace(/\uDC00[^]{3}/gu, "\uFFFD");
    }
    function J(n) {
      for (; n !== null && typeof n == "object" && n.$ === "$JMP"; ) n = n.f(n.x);
      return n;
    }
    function D(n, e) {
      return (...t) => t.length < e ? D((...o) => n(...t, ...o), e - t.length) : J(n(...t));
    }
    function ki(n, e) {
      return n.$ === "Raw" ? { $: "Raw", text: n.text } : { $: "Annotation", id: n.id, lines: e };
    }
    function Ai(n, e, t) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let o = n.head, r = n.tail;
        if (e == 0) return { $: "Con", head: hw(o, t), tail: r };
        {
          let i = e - 1;
          return { $: "Con", head: o, tail: gw(r, i, t) };
        }
      }
    }
    function ji(n) {
      return n.$ === "Raw" ? { $: "Prose", text: n.text } : { $: "AnnotationKey", id: n.id };
    }
    function Fi(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = n.tail;
        return { $: "Con", head: mw(e), tail: pw(t) };
      }
    }
    function Ei(n, e) {
      if (n.$ === "Nil") return e;
      {
        let t = n.head, o = n.tail;
        return { $: "Con", head: t, tail: bw(o, e) };
      }
    }
    function Pi(n) {
      if (n.$ === "Nil") return 0;
      {
        let e = n.tail;
        return mt(ww(e) + 1);
      }
    }
    function wo(n, e, t) {
      if (n == 0) return { $: "Con", head: t, tail: e };
      {
        let o = n - 1;
        if (e.$ === "Nil") return { $: "Nil" };
        {
          let r = e.head, i = e.tail;
          return { $: "Con", head: r, tail: Nw(o, i, t) };
        }
      }
    }
    function No(n, e) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let t = n.head, o = n.tail;
        if (e == 0) return o;
        {
          let r = e - 1;
          return { $: "Con", head: t, tail: xw(o, r) };
        }
      }
    }
    function xo(n, e, t) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let o = n.head, r = n.tail;
        if (e == 0) return { $: "Con", head: t, tail: r };
        {
          let i = e - 1;
          return { $: "Con", head: o, tail: yw(r, i, t) };
        }
      }
    }
    function yo(n, e) {
      if (e.$ === "Created") {
        let t = e.index;
        return No(n, t);
      } else if (e.$ === "Updated") {
        let t = e.index, o = e.original;
        return xo(n, t, o);
      } else if (e.$ === "Deleted") {
        let t = e.index, o = e.original;
        return wo(t, n, o);
      } else return n;
    }
    function qi(n) {
      if (n.$ === "Created") {
        let e = n.index;
        return { $: "Created", index: mt(e + 1) };
      } else if (n.$ === "Updated") {
        let e = n.index, t = n.original;
        return { $: "Updated", index: mt(e + 1), original: t };
      } else if (n.$ === "Deleted") {
        let e = n.index, t = n.original;
        return { $: "Deleted", index: mt(e + 1), original: t };
      } else return { $: "Unchanged" };
    }
    function Ii(n, e) {
      if (e.$ === "Rejected") {
        let t = e.document, o = e.error;
        return { $: "Rejected", document: { $: "Con", head: n, tail: t }, error: o };
      } else {
        let t = e.document, o = e.receipt, r = e.observed;
        return { $: "Applied", document: { $: "Con", head: n, tail: t }, receipt: zw(o), observed: r };
      }
    }
    function Mi(n, e, t) {
      if (n.$ === "Raw") {
        let o = n.text;
        if (t.$ === "Create") {
          let r = t.id, i = t.lines;
          return { $: "Applied", document: { $: "Con", head: { $: "Annotation", id: r, lines: i }, tail: { $: "Con", head: { $: "Raw", text: o }, tail: e } }, receipt: { $: "Created", index: 0 }, observed: { $: "None" } };
        } else return t.$ === "Read" ? { $: "Rejected", document: { $: "Con", head: { $: "Raw", text: o }, tail: e }, error: { $: "NotAnnotation" } } : t.$ === "Update" ? { $: "Rejected", document: { $: "Con", head: { $: "Raw", text: o }, tail: e }, error: { $: "NotAnnotation" } } : { $: "Rejected", document: { $: "Con", head: { $: "Raw", text: o }, tail: e }, error: { $: "NotAnnotation" } };
      } else {
        let o = n.id, r = n.lines;
        if (t.$ === "Create") {
          let i = t.id, s = t.lines;
          return { $: "Applied", document: { $: "Con", head: { $: "Annotation", id: i, lines: s }, tail: { $: "Con", head: { $: "Annotation", id: o, lines: r }, tail: e } }, receipt: { $: "Created", index: 0 }, observed: { $: "None" } };
        } else {
          if (t.$ === "Read") return { $: "Applied", document: { $: "Con", head: { $: "Annotation", id: o, lines: r }, tail: e }, receipt: { $: "Unchanged" }, observed: { $: "Some", value: { $: "Annotation", id: o, lines: r } } };
          if (t.$ === "Update") {
            let i = t.lines;
            return { $: "Applied", document: { $: "Con", head: { $: "Annotation", id: o, lines: i }, tail: e }, receipt: { $: "Updated", index: 0, original: { $: "Annotation", id: o, lines: r } }, observed: { $: "Some", value: { $: "Annotation", id: o, lines: r } } };
          } else return { $: "Applied", document: e, receipt: { $: "Deleted", index: 0, original: { $: "Annotation", id: o, lines: r } }, observed: { $: "None" } };
        }
      }
    }
    function Li(n) {
      if (n.$ === "Create") {
        let e = n.id, t = n.lines;
        return { $: "Applied", document: { $: "Con", head: { $: "Annotation", id: e, lines: t }, tail: { $: "Nil" } }, receipt: { $: "Created", index: 0 }, observed: { $: "None" } };
      } else return n.$ === "Read" ? { $: "Rejected", document: { $: "Nil" }, error: { $: "Missing" } } : n.$ === "Update" ? { $: "Rejected", document: { $: "Nil" }, error: { $: "Missing" } } : { $: "Rejected", document: { $: "Nil" }, error: { $: "Missing" } };
    }
    function Oi(n, e, t) {
      if (n.$ === "Nil") return e == 0 ? Li(t) : { $: "Rejected", document: { $: "Nil" }, error: { $: "Missing" } };
      {
        let o = n.head, r = n.tail;
        if (e == 0) return Mi(o, r, t);
        {
          let i = e - 1;
          return Ii(o, zo(r, i, t));
        }
      }
    }
    function Ti(n) {
      return n.$ === "Rejected", n.document;
    }
    function fw(n) {
      if (n.$ === "Rejected") return n.document;
      {
        let e = n.document, t = n.receipt;
        return yo(e, t);
      }
    }
    function Bi(n) {
      return n.$ === "Rejected" ? { $: "None" } : { $: "Some", value: n.receipt };
    }
    function Ji(n, e) {
      if (n.$ === "Nil") return { $: "End", document: e };
      {
        let t = n.head, o = t.index, r = t.command, i = n.tail, s = zo(e, o, r);
        return { $: "Step", receipt: Cw(s), later: vw(i, Sw(s)) };
      }
    }
    function $w(n) {
      for (; ; ) {
        let e = n;
        if (e.$ === "End") return e.document;
        n = e.later;
        continue;
      }
    }
    function Di(n, e) {
      if (n.$ === "None") return e;
      {
        let t = n.value;
        return yo(e, t);
      }
    }
    function Ri(n) {
      if (n.$ === "End") return n.document;
      {
        let e = n.receipt, t = n.later;
        return Di(e, kw(t));
      }
    }
    function Wi(n) {
      if (n.$ === "Raw") return n.text;
      {
        let e = n.lines;
        return Hi(e);
      }
    }
    function Ui(n) {
      if (n.$ === "Nil") return "";
      {
        let e = n.head, t = n.tail, o = Aw(e), r = jw(t);
        return o + r;
      }
    }
    function Qi(n) {
      return n.$ === "Rejected" ? { $: "None" } : n.observed;
    }
    function dw(n, e) {
      return Qi(zo(n, e, { $: "Read" }));
    }
    function Hi(n) {
      if (n.$ === "Nil") return "";
      {
        let e = n.head, t = n.tail, o = Fw(t);
        return e + o;
      }
    }
    var hw = ki;
    var gw = Ai;
    var mw = ji;
    var pw = Fi;
    var bw = Ei;
    var ww = Pi;
    var Nw = wo;
    var xw = No;
    var yw = xo;
    var zw = qi;
    var zo = Oi;
    var Cw = Bi;
    var Sw = Ti;
    var vw = Ji;
    var kw = Ri;
    var Aw = Wi;
    var jw = Ui;
    var Fw = Hi;
    var Co = { "storage:replace": D((n, e) => J(ki(n, e)), 2), "storage:edit_at": D((n, e, t) => J(Ai(n, Fe(e), t)), 3), "storage:outline_segment": D((n) => J(ji(n)), 1), "storage:outline": D((n) => J(Fi(n)), 1), "storage:append_segments": D((n, e) => J(Ei(n, e)), 2), "storage:length": D((n) => J(Pi(n)), 1), insert_at: D((n, e, t) => J(wo(Fe(n), e, t)), 3), remove_at: D((n, e) => J(No(n, Fe(e))), 2), restore_at: D((n, e, t) => J(xo(n, Fe(e), t)), 3), undo: D((n, e) => J(yo(n, e)), 2), shift: D((n) => J(qi(n)), 1), lift: D((n, e) => J(Ii(n, e)), 2), at_head: D((n, e, t) => J(Mi(n, e, t)), 3), at_end: D((n) => J(Li(n)), 1), apply: D((n, e, t) => J(Oi(n, Fe(e), t)), 3), document: D((n) => J(Ti(n)), 1), rollback: D((n) => J(fw(n)), 1), get_receipt: D((n) => J(Bi(n)), 1), run: D((n, e) => J(Ji(n, e)), 2), final: D((n) => J($w(n)), 1), rollback_frame: D((n, e) => J(Di(n, e)), 2), rollback_history: D((n) => J(Ri(n)), 1), render_segment: D((n) => vi(J(Wi(n))), 1), render: D((n) => vi(J(Ui(n))), 1), observed: D((n) => J(Qi(n)), 1), read_at: D((n, e) => J(dw(n, Fe(e))), 2) };
    function Nt(n, e) {
      return { $: n < e ? "LT" : n === e ? "EQ" : "GT" };
    }
    function an(n) {
      if (n > 281474976710655) throw "bend: a Nat past the largest immediate 2^48-1";
      return n;
    }
    function L(n) {
      if (!Number.isInteger(n) || n < 0 || n > 2 ** 53) throw "bend: expected a Nat host number: an integer from 0 to 2^53";
      return n;
    }
    var xt = function(e) {
      return e < 55296 || e >= 57344 && e <= 1114111 ? String.fromCodePoint(e) : String.fromCharCode(56320, e >>> 22, e >>> 11 & 2047, e & 2047);
    };
    function S(n, e = 0) {
      return n[e] === "\uDC00" ? 4 : n.codePointAt(e) > 65535 ? 2 : 1;
    }
    function G(n) {
      return n.length < 4 ? n.codePointAt(0) : (n.charCodeAt(1) << 22 | n.charCodeAt(2) << 11 | n.charCodeAt(3)) >>> 0;
    }
    function en(n) {
      return n.replace(/\uDC00[^]{3}/gu, "\uFFFD");
    }
    function p(n) {
      return n.replace(/\p{Cs}/gu, "\uFFFD");
    }
    function b(n) {
      for (; n !== null && typeof n == "object" && n.$ === "$JMP"; ) n = n.f(n.x);
      return n;
    }
    function w(n, e) {
      return (...t) => t.length < e ? w((...o) => n(...t, ...o), e - t.length) : b(n(...t));
    }
    function Yi(n) {
      return n.$ === "None" ? "" : n.value + "";
    }
    function Xi(n) {
      if (n.$ === "Nil") return "";
      {
        let e = n.head, t = e.body, o = e.ending, r = n.tail, i = $N(o), s = Vc(r), c = i + s;
        return t + c;
      }
    }
    function Zi(n, e, t) {
      if (n.$ === "Nil") return t ? { $: "Con", head: { $: "Line", body: "", ending: { $: "Some", value: e } }, tail: { $: "Nil" } } : { $: "Con", head: { $: "Line", body: e + "", ending: { $: "None" } }, tail: { $: "Nil" } };
      {
        let o = n.head, r = o.body, i = o.ending, s = n.tail;
        return t ? { $: "Con", head: { $: "Line", body: "", ending: { $: "Some", value: e } }, tail: { $: "Con", head: { $: "Line", body: r, ending: i }, tail: s } } : { $: "Con", head: { $: "Line", body: e + r, ending: i }, tail: s };
      }
    }
    function ns(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, S(t));
          n = t.slice(S(t)), e = dN(o, r, qe(r, `
`));
          continue;
        }
      }
    }
    function Ew(n) {
      return ns(me(n), { $: "Nil" });
    }
    function es(n, e) {
      if (n === "") return e;
      {
        let t = n.slice(0, S(n)), o = n.slice(S(n));
        return { $: "Con", head: { $: "Line", body: t + o, ending: { $: "None" } }, tail: e };
      }
    }
    function ts(n) {
      if (n !== "") {
        let e = n.slice(0, S(n));
        return yt(e, `
`);
      } else return false;
    }
    function os(n, e, t, o) {
      for (; ; ) {
        let r = n, i = e, s = t, c = o;
        if (r === "") return Mo(hN(i, s));
        {
          let a = r.slice(0, S(r)), $ = r.slice(S(r));
          if (c) {
            n = $, e = "", t = { $: "Con", head: { $: "Line", body: i, ending: { $: "Some", value: a } }, tail: s }, o = Ao($);
            continue;
          } else {
            let N = a + "";
            n = $, e = i + N, t = s, o = Ao($);
            continue;
          }
        }
      }
    }
    function rs(n) {
      return os(n, "", { $: "Nil" }, Ao(n));
    }
    function Pw(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, S(t));
          n = t.slice(S(t)), e = qe(r, `
`);
          continue;
        }
      }
    }
    function is(n) {
      if (n !== "") {
        let e = n.slice(0, S(n)), t = G(e);
        if (t == 13) {
          let o = n.slice(S(n));
          return He(o);
        } else {
          let o = n.slice(S(n));
          return He(xt(t) + o);
        }
      } else return He(n);
    }
    function ss(n) {
      return is(me(n));
    }
    function cs(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, S(t));
          n = t.slice(S(t)), e = qe(r, "\r");
          continue;
        }
      }
    }
    function as(n, e) {
      return e ? ss(n) : n;
    }
    function us(n) {
      return as(n, gN(n, false));
    }
    function ls(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t !== "") {
          let r = t.slice(0, S(t)), i = G(r);
          if (i == 32) {
            let s = t.slice(S(t));
            if (o == 0) return " " + s;
            {
              let c = o - 1;
              n = s, e = c;
              continue;
            }
          } else {
            let s = t.slice(S(t));
            return xt(i) + s;
          }
        } else return t;
      }
    }
    function _s(n) {
      if (n !== "") {
        let e = n.slice(0, S(n)), t = G(e);
        if (t == 32) return n.slice(S(n));
        {
          let o = n.slice(S(n));
          return xt(t) + o;
        }
      } else return n;
    }
    function fs(n) {
      if (n !== "") {
        let e = n.slice(0, S(n));
        if (G(e) == 62) {
          let o = n.slice(S(n));
          return { $: "Some", value: Yc(o) };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function $s(n) {
      return fs(pe(n, 3));
    }
    function ds(n, e) {
      if (n !== "") {
        let t = n.slice(0, S(n));
        if (G(t) == 62) {
          let r = n.slice(S(n));
          return { $: "Some", value: te(e, Yc(r), r) };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function hs(n, e) {
      return ds(pe(n, 3), e);
    }
    function gs(n, e) {
      return Lo(Qn(n), e);
    }
    function ms(n, e, t) {
      return t ? gs(n, e) : false;
    }
    function Eo(n, e) {
      return ms(n, e, vn(Ee(n), e));
    }
    function ps(n, e) {
      return Ct(Qn(n), e);
    }
    function bs(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, S(t));
          n = t.slice(S(t)), e = Xc(r);
          continue;
        }
      }
    }
    function ws(n, e, t) {
      return t ? true : ps(n, e);
    }
    function Ns(n, e, t) {
      return t ? ws(n, e, Pe(mN(e, false))) : false;
    }
    function xs(n, e) {
      return Ns(n, e, vn(Ee(n), e));
    }
    function ys(n, e) {
      if (n.$ === "None") return false;
      {
        let t = n.value;
        return Eo(t, e);
      }
    }
    function Po(n) {
      if (n !== "") {
        let e = n.slice(0, S(n));
        if (G(e) == 96) {
          let o = n.slice(S(n));
          if (o !== "") {
            let r = o.slice(0, S(o));
            if (G(r) == 96) {
              let s = o.slice(S(o));
              if (s !== "") {
                let c = s.slice(0, S(s));
                if (G(c) == 96) {
                  let $ = s.slice(S(s));
                  return Lo(Qn($), "annotation-json");
                } else return false;
              } else return false;
            } else return false;
          } else return false;
        } else return false;
      } else return false;
    }
    function zs(n) {
      if (n.$ === "None") return false;
      {
        let e = n.value;
        return Po(Qn(e));
      }
    }
    function Cs(n) {
      if (n.$ === "None") return false;
      {
        let e = n.value, t = Sn(e, "```annotation-json"), o = Sn(e, "``` annotation-json");
        return t || o;
      }
    }
    function Ss(n) {
      if (n === "") return true;
      {
        let e = n.slice(0, S(n)), t = n.slice(S(n)), o = Zc(e), r = qe(e, "-"), i = pN(e);
        return Hn(i || (o || r), na(t));
      }
    }
    function vs(n) {
      return Hn(Pe(Ge(n)), na(n));
    }
    function ks(n, e) {
      return e ? { $: "Some", value: n } : { $: "None" };
    }
    function As(n) {
      if (n !== "") {
        let e = n.slice(0, S(n));
        if (G(e) == 94) {
          let o = n.slice(S(n));
          return ks(o, bN(o));
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function js(n) {
      return As(wN(pe(n, 3)));
    }
    function Fs(n, e) {
      if (e.$ === "Absent") return { $: "Absent" };
      {
        let t = e.before, o = e.after;
        return { $: "Found", before: { $: "Con", head: n, tail: t }, after: o };
      }
    }
    function Es(n, e, t, o) {
      return o ? { $: "Found", before: { $: "Nil" }, after: e } : Fs(n, t);
    }
    function Ps(n, e, t) {
      if (n.$ === "Nil") return { $: "Absent" };
      {
        let o = n.head, r = n.tail;
        return Es(o, r, Ke(r, e, t), te(t, Sn(o, e), Un(o, e)));
      }
    }
    function qs(n, e, t, o) {
      return o ? { $: "Tuple", fst: cn(t), snd: { $: "Some", value: e } } : { $: "Tuple", fst: cn(n), snd: { $: "None" } };
    }
    function Is(n) {
      if (n.$ === "Con") {
        let e = n.head, t = n.tail;
        if (t.$ === "Con") {
          let o = t.head, r = t.tail;
          return qs({ $: "Con", head: e, tail: { $: "Con", head: o, tail: r } }, e, r, Un(o, "%%TAGS%%"));
        } else return { $: "Tuple", fst: cn({ $: "Con", head: e, tail: t }), snd: { $: "None" } };
      } else return { $: "Tuple", fst: cn(n), snd: { $: "None" } };
    }
    function qw(n, e) {
      return Gw(Qn(n), e);
    }
    function Ms(n, e) {
      return Ct(Ee(me(Ee(n))), me(e));
    }
    function Ls(n) {
      if (n.$ === "Nil") return true;
      {
        let e = n.head, t = n.tail;
        return Hn(Sn(e, "*"), NN(ea({ $: "Con", head: e, tail: t }, `
`), "*"));
      }
    }
    function vo(n, e, t, o, r, i) {
      return i ? { $: "Some", value: { $: "Legacy", json: n, display: e, link: t, comment: o, tags: r } } : { $: "None" };
    }
    function ko(n, e, t, o, r) {
      if (r.$ === "Absent") return vo(n, e, { $: "None" }, t, o, Gi(e));
      {
        let i = r.before, s = r.after;
        return vo(n, i, yN(xN(e, ta(i))), t, o, In(Gi(i), zN(s)));
      }
    }
    function Os(n, e, t, o) {
      if (o.$ === "Absent") return ko(n, e, { $: "None" }, t, Ke(e, "%%LINK%%", true));
      {
        let r = o.before, i = o.after;
        return ko(n, r, { $: "Some", value: i }, t, Ke(r, "%%LINK%%", true));
      }
    }
    function Ts(n, e) {
      let t = e.fst, o = e.snd;
      return Os(n, t, o, Ke(t, "%%COMMENT%%", false));
    }
    function Bs(n, e, t) {
      return t ? Ts(n, CN(cn(e))) : { $: "None" };
    }
    function Js(n, e) {
      if (e.$ === "Con") {
        let t = e.head, o = e.tail;
        return Bs(n, o, Un(t, "%%"));
      } else return { $: "None" };
    }
    function Ds(n) {
      if (n.$ === "Absent") return { $: "None" };
      {
        let e = n.before, t = n.after;
        return Js(ea(e, `
`), t);
      }
    }
    function Rs(n, e) {
      return e ? Ds(Ke(n, "```", false)) : { $: "None" };
    }
    function Ws(n) {
      if (n.$ === "Con") {
        let e = n.head, t = n.tail;
        if (t.$ === "Con") {
          let o = t.head, r = t.tail;
          return Rs(r, In(jo(e, "%%"), jo(o, "```annotation-json")));
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function Us(n, e) {
      return n ? Po(Qn(e)) : false;
    }
    function Qs(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          n = o.tail, e = Un(s, "%%"), t = te(SN(r, s), an(i + 1), i);
          continue;
        }
      }
    }
    function Hs(n, e) {
      return e ? Ws(n) : { $: "None" };
    }
    function Gs(n) {
      return Hs(n, kN(vN(n, false, 0), 1));
    }
    function Ks(n, e, t, o) {
      for (; ; ) {
        let r = n, i = e, s = t, c = o;
        if (r === "") return s;
        {
          let a = r.slice(0, S(r)), $ = r.slice(S(r)), N = In(c, qe(a, i));
          n = $, e = i, t = te(N, an(s + 1), s), o = N;
          continue;
        }
      }
    }
    function Vs(n) {
      if (n !== "") {
        let e = n.slice(0, S(n)), t = G(e);
        if (t == 96) {
          let o = n.slice(S(n));
          if (o !== "") {
            let r = o.slice(0, S(o));
            if (G(r) == 96) {
              let s = o.slice(S(o));
              if (s !== "") {
                let c = s.slice(0, S(s));
                if (G(c) == 96) {
                  let $ = s.slice(S(s));
                  return { $: "Some", value: { $: "Fence", char: "`", size: Fo($, "`", 3, true), quoted: false } };
                } else return { $: "None" };
              } else return { $: "None" };
            } else return { $: "None" };
          } else return { $: "None" };
        } else if (t == 126) {
          let o = n.slice(S(n));
          if (o !== "") {
            let r = o.slice(0, S(o));
            if (G(r) == 126) {
              let s = o.slice(S(o));
              if (s !== "") {
                let c = s.slice(0, S(s));
                if (G(c) == 126) {
                  let $ = s.slice(S(s));
                  return { $: "Some", value: { $: "Fence", char: "~", size: Fo($, "~", 3, true), quoted: false } };
                } else return { $: "None" };
              } else return { $: "None" };
            } else return { $: "None" };
          } else return { $: "None" };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function qo(n, e, t) {
      let o = Fo(n, e, 0, true);
      return Hn(AN(o, t), Ge(Qn(jN(n, o))));
    }
    function Ys(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, S(t)), i = t.slice(S(t));
          n = i, e = te(vn(r + i, "<!--"), true, te(vn(r + i, "-->"), false, o));
          continue;
        }
      }
    }
    function Xs(n) {
      return n ? { $: "HtmlComment" } : { $: "Neutral" };
    }
    function dn(n, e, t, o) {
      return { $: "ScanState", mode: e, reversed: { $: "Con", head: { $: "RawPart", raw: n }, tail: t }, line: an(o + 1) };
    }
    function Zs(n) {
      return zt(Un(n, "%%"), { $: "ObsidianComment" }, ra(oa(n, false)));
    }
    function wt(n, e, t, o, r) {
      return r ? { $: "ScanState", mode: { $: "OpaqueHtml" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "unsupported raw HTML context", line: o }, tail: t }, line: an(o + 1) } : dn(n, FN(e), t, o);
    }
    function nc(n, e, t, o, r) {
      if (r.$ === "Some") {
        let i = r.value;
        if (i.$ === "Fence") {
          let s = i.char, c = i.size;
          return dn(n, { $: "Fence", char: s, size: c, quoted: true }, t, o);
        } else return wt(n, e, t, o, In(Sn(e, "<"), Pe(Sn(e, "<!--"))));
      } else return wt(n, e, t, o, In(Sn(e, "<"), Pe(Sn(e, "<!--"))));
    }
    function ec(n, e, t, o, r) {
      if (r.$ === "None") return wt(n, e, t, o, In(Sn(e, "<"), Pe(Sn(e, "<!--"))));
      {
        let i = r.value;
        return nc(n, i, t, o, ia(i));
      }
    }
    function tc(n, e, t) {
      if (n !== "") {
        let o = n.slice(0, S(n)), r = n.slice(S(n));
        if (e == 0) return false;
        {
          let i = e - 1, s = o + r, c = vn(s, ". "), a = vn(s, ") "), $ = In(t, c || a), N = In(Zc(o), sa(r, i, true));
          return $ || N;
        }
      } else return false;
    }
    function oc(n) {
      let e = vn(n, "+ "), t = vn(n, "* "), o = vn(n, "- "), r = e || t;
      return sa(n, 10, false) || (o || r);
    }
    function rc(n, e, t, o, r) {
      return r ? dn(n, { $: "ListBody" }, t, o) : ec(n, e, t, o, ge(e));
    }
    function ic(n, e, t, o, r) {
      if (r.$ === "Some") {
        let i = r.value;
        return dn(n, i, t, o);
      } else return rc(n, e, t, o, EN(pe(e, 3)));
    }
    function sc(n, e, t, o, r, i) {
      return r ? { $: "ScanState", mode: { $: "Opening", raw: n, line: o }, reversed: t, line: an(o + 1) } : i ? { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "annotation fence without opening marker", line: o }, tail: t }, line: an(o + 1) } : ic(n, e, t, o, ia(pe(e, 3)));
    }
    function cc(n, e, t, o, r) {
      return r ? dn(n, { $: "Frontmatter" }, t, o) : sc(n, e, t, o, ca(ge(e), "%%"), aa(ge(e)));
    }
    function ac(n) {
      if (n !== "") {
        let e = n.slice(0, S(n)), t = G(e);
        if (t == 65279) return n.slice(S(n));
        {
          let o = n.slice(S(n));
          return xt(t) + o;
        }
      } else return n;
    }
    function he(n, e, t, o) {
      return cc(n, te(Ki(o, 0), Vi(e), e), t, o, In(Ki(o, 0), Un(Vi(e), "---")));
    }
    function uc(n, e, t, o, r, i, s) {
      return s ? { $: "ScanState", mode: { $: "Candidate", raw: t + n, reversed: { $: "Con", head: "```annotation-json", tail: { $: "Con", head: "%%", tail: { $: "Nil" } } }, line: o, formatted: Sn(t, "> ") }, reversed: r, line: an(i + 1) } : he(n, e, { $: "Con", head: { $: "RawPart", raw: t }, tail: r }, i);
    }
    function lc(n, e, t, o, r, i) {
      if (i.$ === "Some") {
        let s = i.value;
        return { $: "ScanState", mode: { $: "AfterAnnotation" }, reversed: { $: "Con", head: { $: "AnnotationPart", id: e, raw: n, fields: s, line: t }, tail: o }, line: an(r + 1) };
      } else return { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "malformed or unsupported annotation body", line: t }, tail: o }, line: an(r + 1) };
    }
    function _c(n, e, t, o, r, i) {
      if (i.$ === "Some") {
        let s = i.value;
        return lc(n, s, t, o, r, PN(cn(e)));
      } else return { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "missing or unsupported annotation block ID", line: t }, tail: o }, line: an(r + 1) };
    }
    function fc(n, e, t, o, r, i, s, c, a) {
      if (a.$ === "Some") {
        let $ = a.value;
        return { $: "ScanState", mode: { $: "Candidate", raw: t + n, reversed: { $: "Con", head: $, tail: o }, line: r, formatted: i }, reversed: s, line: an(c + 1) };
      } else return _c(t + n, o, r, s, c, qN(e));
    }
    function $c(n, e, t, o, r, i, s) {
      return s ? dn(n, { $: "Neutral" }, r, i) : dn(n, { $: "Fence", char: e, size: t, quoted: o }, r, i);
    }
    function dc(n, e, t) {
      if (n.$ === "None") return false;
      {
        let o = n.value;
        return qo(pe(o, 3), e, t);
      }
    }
    function hc(n, e, t, o) {
      return o ? dc(ge(n), e, t) : qo(pe(n, 3), e, t);
    }
    function pt(n, e, t, o, r) {
      return r ? dn(n, { $: "Neutral" }, t, o) : dn(n, e, t, o);
    }
    function gc(n, e, t, o, r, i, s) {
      return r ? dn(n, { $: "ListBody" }, t, o) : i ? s ? { $: "ScanState", mode: { $: "ListBody" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "nested annotation candidate inside list is unsupported", line: o }, tail: t }, line: an(o + 1) } : dn(n, { $: "ListBody" }, t, o) : he(n, e, t, o);
    }
    function mc(n, e, t, o, r) {
      if (t.$ === "Con") {
        let i = t.head;
        if (i.$ === "AnnotationPart") {
          let s = i.id, c = i.raw, a = i.fields, $ = i.line, N = t.tail;
          return r ? { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "AnnotationPart", id: s, raw: c + n, fields: a, line: $ }, tail: N }, line: an(o + 1) } : he(n, e, { $: "Con", head: { $: "AnnotationPart", id: s, raw: c, fields: a, line: $ }, tail: N }, o);
        } else {
          let s = t.tail;
          return he(n, e, { $: "Con", head: i, tail: s }, o);
        }
      } else return he(n, e, t, o);
    }
    function pc(n, e, t, o, r) {
      if (n.$ === "Neutral") return he(e, t, o, r);
      if (n.$ === "AfterAnnotation") return mc(e, t, o, r, Ge(t));
      if (n.$ === "Opening") {
        let i = n.raw, s = n.line;
        return uc(e, t, i, s, o, r, IN(ge(t)));
      } else if (n.$ === "Candidate") {
        let i = n.raw, s = n.reversed, c = n.line, a = n.formatted;
        return fc(e, t, i, s, c, a, o, r, MN(t, a));
      } else if (n.$ === "Fence") {
        let i = n.char, s = n.size, c = n.quoted;
        return $c(e, i, s, c, o, r, LN(t, i, s, c));
      } else {
        if (n.$ === "HtmlComment") return dn(e, ra(oa(t, true)), o, r);
        if (n.$ === "ObsidianComment") return pt(e, { $: "ObsidianComment" }, o, r, Un(t, "%%"));
        if (n.$ === "Frontmatter") {
          let i = Un(t, "---"), s = Un(t, "...");
          return pt(e, { $: "Frontmatter" }, o, r, i || s);
        } else {
          if (n.$ === "OpaqueHtml") return pt(e, { $: "OpaqueHtml" }, o, r, Ge(Qn(t)));
          {
            let i = vn(t, " "), s = vn(t, "	"), c = ca(ge(t), "%%"), a = aa(ge(t));
            return gc(e, t, o, r, Ge(Qn(t)), i || s, c || a);
          }
        }
      }
    }
    function bc(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head, i = r.body, s = r.ending, c = t.tail, a = o.mode, $ = o.reversed, N = o.line;
          n = c, e = TN(a, Vc({ $: "Con", head: { $: "Line", body: i, ending: s }, tail: { $: "Nil" } }), ON(i), $, N);
          continue;
        }
      }
    }
    function wc(n) {
      let e = n.mode;
      if (e.$ === "Neutral") {
        let t = n.reversed;
        return { $: "Scan", parts: cn(t), closed: true };
      } else if (e.$ === "AfterAnnotation") {
        let t = n.reversed;
        return { $: "Scan", parts: cn(t), closed: true };
      } else if (e.$ === "ListBody") {
        let t = n.reversed;
        return { $: "Scan", parts: cn(t), closed: true };
      } else if (e.$ === "Opening") {
        let t = e.raw, o = n.reversed;
        return { $: "Scan", parts: cn({ $: "Con", head: { $: "RawPart", raw: t }, tail: o }), closed: true };
      } else if (e.$ === "Candidate") {
        let t = e.raw, o = e.line, r = n.reversed;
        return { $: "Scan", parts: cn({ $: "Con", head: { $: "CandidateError", raw: t, message: "annotation has no closing anchor", line: o }, tail: r }), closed: false };
      } else {
        let t = n.reversed, o = n.line;
        return { $: "Scan", parts: cn({ $: "Con", head: { $: "CandidateError", raw: "", message: "unclosed Markdown context", line: o }, tail: t }), closed: false };
      }
    }
    function Nc(n) {
      return wc(BN(n, { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Nil" }, line: 0 }));
    }
    function xc(n) {
      return Nc(JN(n));
    }
    function yc(n) {
      return n.$ === "RawPart" || n.$ === "AnnotationPart", n.raw;
    }
    function zc(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head, i = t.tail, s = Oo(r);
          n = i, e = o + s;
          continue;
        }
      }
    }
    function Iw(n) {
      return zc(n, "");
    }
    function Cc(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          if (s.$ === "AnnotationPart") {
            let c = s.id, a = o.tail, $ = jo(c, r);
            n = a, e = r, t = i || $;
            continue;
          } else {
            n = o.tail, e = r, t = i;
            continue;
          }
        }
      }
    }
    function Sc(n, e) {
      return Cc(n, e, false);
    }
    function vc(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head;
          if (r.$ === "CandidateError") {
            n = t.tail, e = true;
            continue;
          } else if (r.$ === "AnnotationPart") {
            let i = r.id, s = t.tail, c = Ve(s, i);
            n = s, e = o || c;
            continue;
          } else {
            n = t.tail, e = o;
            continue;
          }
        }
      }
    }
    function Mw(n) {
      return vc(n, false);
    }
    function kc(n) {
      if (n === "") return { $: "SeenEnd", next: { $: "SeenNone" } };
      {
        let e = n.slice(0, S(n)), t = n.slice(S(n));
        return { $: "SeenChar", char: e, down: ua(t), next: { $: "SeenNone" } };
      }
    }
    function Ac(n, e) {
      if (n.$ === "SeenChar") {
        let t = n.char;
        if (e !== "") {
          let o = e.slice(0, S(e));
          return yt(t, o);
        } else return false;
      } else return false;
    }
    function jc(n, e) {
      if (n.$ === "SeenChar") {
        let t = n.char;
        if (e !== "") {
          let o = e.slice(0, S(e));
          return yt(o, t);
        } else return false;
      } else return false;
    }
    function Fc(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "SeenNone") return false;
        if (o.$ === "SeenEnd") {
          let s = o.next;
          if (r === "") return true;
          {
            let c = r.slice(0, S(r)), a = r.slice(S(r));
            n = s, e = c + a, t = Qe(s, c + a);
            continue;
          }
        } else {
          let s = o.down, c = o.next;
          if (r === "") {
            n = c, e = "", t = Qe(c, "");
            continue;
          } else {
            let a = r.slice(0, S(r)), $ = r.slice(S(r));
            if (i) {
              n = s, e = $, t = Qe(s, $);
              continue;
            } else {
              n = c, e = a + $, t = Qe(c, a + $);
              continue;
            }
          }
        }
      }
    }
    function Ec(n, e) {
      return Fc(n, e, Qe(n, e));
    }
    function Io(n, e, t) {
      if (n.$ === "SeenNone") {
        if (e === "") return { $: "SeenEnd", next: { $: "SeenNone" } };
        {
          let o = e.slice(0, S(e)), r = e.slice(S(e));
          return { $: "SeenChar", char: o, down: ua(r), next: { $: "SeenNone" } };
        }
      } else if (n.$ === "SeenEnd") {
        let o = n.next;
        if (e === "") return { $: "SeenEnd", next: o };
        {
          let r = e.slice(0, S(e)), i = e.slice(S(e));
          return { $: "SeenEnd", next: So(o, r + i, bt(o, r + i)) };
        }
      } else {
        let o = n.char, r = n.down, i = n.next;
        if (e === "") return { $: "SeenEnd", next: { $: "SeenChar", char: o, down: r, next: i } };
        {
          let s = e.slice(0, S(e)), c = e.slice(S(e));
          return t ? { $: "SeenChar", char: o, down: So(r, c, bt(r, c)), next: i } : { $: "SeenChar", char: o, down: r, next: So(i, s + c, bt(i, s + c)) };
        }
      }
    }
    function Pc(n, e) {
      return Io(n, e, bt(n, e));
    }
    function qc(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          if (s.$ === "CandidateError") {
            n = o.tail, e = r, t = true;
            continue;
          } else if (s.$ === "AnnotationPart") {
            let c = s.id, a = o.tail, $ = _a(r, c);
            n = a, e = la(r, c), t = $ || i;
            continue;
          } else {
            n = o.tail, e = r, t = i;
            continue;
          }
        }
      }
    }
    function Ic(n) {
      return qc(cn(n), { $: "SeenNone" }, false);
    }
    function Mc(n) {
      let e = n.parts, t = n.closed;
      return Hn(t, Pe(DN(e)));
    }
    function Lc(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head, c = o.tail, a = Ve({ $: "Con", head: s, tail: { $: "Nil" } }, r), $ = te(a, "", Oo(s));
          n = c, e = r, t = i + $;
          continue;
        }
      }
    }
    function Oc(n, e) {
      return Lc(n, e, "");
    }
    function Tc(n, e) {
      let t = n.parts;
      return { $: "SourceEdit", source: RN(t, e), error: { $: "None" } };
    }
    function Bc(n, e, t, o) {
      return o ? Tc(t, e) : { $: "SourceEdit", source: n, error: { $: "Some", value: "unsafe annotation document" } };
    }
    function Lw(n, e) {
      let t = WN(n);
      return Bc(n, e, t, UN(t));
    }
    function Ow(n) {
      return n.source;
    }
    function Jc(n, e, t, o) {
      return o ? { $: "Con", head: { $: "Diagnostic", line: e, message: "duplicate annotation ID: " + n }, tail: t } : t;
    }
    function Dc(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return Mo(o);
        {
          let r = t.head;
          if (r.$ === "CandidateError") {
            let i = r.message, s = r.line;
            n = t.tail, e = { $: "Con", head: { $: "Diagnostic", line: s, message: i }, tail: o };
            continue;
          } else if (r.$ === "AnnotationPart") {
            let i = r.id, s = r.line, c = t.tail;
            n = c, e = fa(i, s, o, Ve(c, i));
            continue;
          } else {
            n = t.tail, e = o;
            continue;
          }
        }
      }
    }
    function Tw(n) {
      return Dc(n, { $: "Nil" });
    }
    function Rc(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          if (s.$ === "CandidateError") {
            let c = s.message, a = s.line;
            n = o.tail, e = r, t = { $: "Con", head: { $: "Diagnostic", line: a, message: c }, tail: i };
            continue;
          } else if (s.$ === "AnnotationPart") {
            let c = s.id, a = s.line;
            n = o.tail, e = la(r, c), t = fa(c, a, i, _a(r, c));
            continue;
          } else {
            n = o.tail, e = r, t = i;
            continue;
          }
        }
      }
    }
    function Bw(n) {
      return Rc(cn(n), { $: "SeenNone" }, { $: "Nil" });
    }
    function Wc(n, e) {
      if (n.$ === "Nil") return { $: "None" };
      {
        let t = n.head, o = n.tail;
        return zt(Ve({ $: "Con", head: t, tail: { $: "Nil" } }, e), { $: "Some", value: t }, QN(o, e));
      }
    }
    function Uc(n, e, t) {
      let o = Ve({ $: "Con", head: n, tail: { $: "Nil" } }, e);
      return zt(o, t, Oo(n));
    }
    function Qc(n, e, t) {
      if (n.$ === "Nil") return "";
      {
        let o = n.head, r = n.tail, i = HN(o, e, t), s = GN(r, e, t);
        return i + s;
      }
    }
    function yt(n, e) {
      let t = G(n), o = G(e);
      return t === o;
    }
    function He(n) {
      return rN(n, "");
    }
    function Mo(n) {
      return iN(n, { $: "Nil" });
    }
    function zt(n, e, t) {
      return n ? e : t;
    }
    function Lo(n, e) {
      return Gc(KN(n, e));
    }
    function Jw(n) {
      return Hc(Ee(n));
    }
    function Ct(n, e) {
      return cN(e, n);
    }
    function Dw(n, e, t) {
      let o = 0;
      for (; ; ) switch (o) {
        case 0: {
          let r = n;
          if (r === "") return "";
          {
            let i = r.slice(0, S(r));
            n = r.slice(S(r)), e = i, t = Xc(i), o = 1;
            continue;
          }
        }
        case 1: {
          let r = n, i = e;
          if (t) {
            n = r, o = 0;
            continue;
          } else return i + r;
        }
      }
    }
    function Rw(n) {
      let e = G(n), t = e === 32, o = In(e >= 9, e <= 13);
      return t || o;
    }
    function Ww(n) {
      return !n;
    }
    function Hn(n, e) {
      return n ? e : false;
    }
    function Uw(n) {
      let e = VN(n), t = YN(n);
      return e || t;
    }
    function Qw(n) {
      let e = G(n);
      return Hn(e >= 48, e <= 57);
    }
    function Hw(n) {
      return n === "";
    }
    function Hc(n) {
      return He(Ee(me(n)));
    }
    function Gw(n, e) {
      return Ct(me(n), me(e));
    }
    function Kw(n, e) {
      if (n.$ === "Nil") return "";
      {
        let t = n.head, o = n.tail;
        return Kc(o, t, e);
      }
    }
    function Vw(n) {
      return n.$ === "Nil" ? { $: "None" } : { $: "Some", value: n.head };
    }
    function Yw(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return { $: "Nil" };
        {
          let r = t.head, i = t.tail;
          if (o == 0) return { $: "Con", head: r, tail: i };
          {
            let s = o - 1;
            n = i, e = s;
            continue;
          }
        }
      }
    }
    function Xw(n) {
      if (n.$ === "Nil") return 0;
      {
        let e = n.tail;
        return an(ta(e) + 1);
      }
    }
    function Zw(n) {
      return n.$ === "Nil";
    }
    function nN(n, e) {
      return lN(Nt(n, e));
    }
    function eN(n, e) {
      return _N(Nt(n, e));
    }
    function tN(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return "";
        {
          let r = t.slice(0, S(t)), i = t.slice(S(t));
          if (o == 0) return r + i;
          {
            let s = o - 1;
            n = i, e = s;
            continue;
          }
        }
      }
    }
    function oN(n, e) {
      return Gc(Nt(n, e));
    }
    function rN(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, S(t));
          n = t.slice(S(t)), e = r + o;
          continue;
        }
      }
    }
    function iN(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head;
          n = t.tail, e = { $: "Con", head: r, tail: o };
          continue;
        }
      }
    }
    function Gc(n) {
      return n.$ === "EQ";
    }
    function sN(n, e) {
      return fN(n, e, { $: "EQ" });
    }
    function cN(n, e, t) {
      let o = 0;
      for (; ; ) switch (o) {
        case 0: {
          let r = n, i = e;
          if (r === "") return true;
          {
            let s = r.slice(0, S(r)), c = r.slice(S(r));
            if (i === "") return false;
            {
              let a = i.slice(0, S(i)), $ = i.slice(S(i));
              n = c, e = $, t = qe(a, s), o = 1;
              continue;
            }
          }
        }
        case 1: {
          let r = n, i = e;
          if (t) {
            n = r, e = i, o = 0;
            continue;
          } else return false;
        }
      }
    }
    function aN(n) {
      let e = G(n);
      return Hn(e >= 65, e <= 90);
    }
    function uN(n) {
      let e = G(n);
      return Hn(e >= 97, e <= 122);
    }
    function Kc(n, e, t) {
      if (n.$ === "Nil") return e;
      {
        let o = n.head, r = n.tail, i = XN(r, o, t), s = t + i;
        return e + s;
      }
    }
    function lN(n) {
      return n.$ !== "GT";
    }
    function _N(n) {
      return n.$ !== "LT";
    }
    function fN(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o === "") return r !== "" && i.$ === "EQ" ? { $: "LT" } : i;
        {
          let s = o.slice(0, S(o)), c = G(s), a = o.slice(S(o));
          if (r === "") return i.$ === "EQ" ? { $: "GT" } : i;
          {
            let $ = r.slice(0, S(r)), N = G($), k = r.slice(S(r));
            if (i.$ === "EQ") {
              n = a, e = k, t = Nt(c, N);
              continue;
            } else return i;
          }
        }
      }
    }
    var $N = Yi;
    var Vc = Xi;
    var qe = yt;
    var dN = Zi;
    var me = He;
    var hN = es;
    var Ao = ts;
    var gN = cs;
    var Yc = _s;
    var pe = ls;
    var te = zt;
    var Qn = Jw;
    var Ee = Dw;
    var vn = Ct;
    var Xc = Rw;
    var mN = bs;
    var Pe = Ww;
    var Sn = xs;
    var pN = Uw;
    var Zc = Qw;
    var na = Ss;
    var Ge = Hw;
    var bN = vs;
    var wN = Hc;
    var Ke = Ps;
    var Un = Eo;
    var cn = Mo;
    var ea = Kw;
    var NN = Ms;
    var Gi = Ls;
    var ta = Xw;
    var xN = Yw;
    var yN = Vw;
    var zN = Zw;
    var In = Hn;
    var CN = Is;
    var jo = Lo;
    var SN = Us;
    var vN = Qs;
    var kN = nN;
    var Fo = Ks;
    var AN = eN;
    var jN = tN;
    var oa = Ys;
    var ra = Xs;
    var FN = Zs;
    var ia = Vs;
    var sa = tc;
    var ge = $s;
    var EN = oc;
    var ca = ys;
    var aa = Cs;
    var Ki = oN;
    var Vi = ac;
    var PN = Gs;
    var qN = js;
    var IN = zs;
    var MN = hs;
    var LN = hc;
    var ON = us;
    var TN = pc;
    var BN = bc;
    var JN = rs;
    var Oo = yc;
    var Ve = Sc;
    var ua = kc;
    var Qe = Ac;
    var bt = jc;
    var So = Io;
    var la = Pc;
    var _a = Ec;
    var DN = Ic;
    var RN = Oc;
    var WN = xc;
    var UN = Mc;
    var fa = Jc;
    var QN = Wc;
    var HN = Uc;
    var GN = Qc;
    var KN = sN;
    var VN = aN;
    var YN = uN;
    var XN = Kc;
    var oe = { "document:ending_text": w((n) => en(b(Yi(n))), 1), "document:encode": w((n) => en(b(Xi(n))), 1), "document:push": w((n, e, t) => b(Zi(n, p(e), t)), 3), "document:decode_go": w((n, e) => b(ns(p(n), e)), 2), "document:decode_exact": w((n) => b(Ew(p(n))), 1), "document:lines_end": w((n, e) => b(es(p(n), e)), 2), "document:head_newline": w((n) => b(ts(p(n))), 1), "document:lines_go": w((n, e, t, o) => b(os(p(n), p(e), t, o)), 4), "document:decode": w((n) => b(rs(p(n))), 1), "document:ends_nl": w((n, e) => b(Pw(p(n), e)), 2), clean_reverse: w((n) => en(b(is(p(n)))), 1), clean_exact: w((n) => en(b(ss(p(n)))), 1), ends_cr: w((n, e) => b(cs(p(n), e)), 2), clean_checked: w((n, e) => en(b(as(p(n), e))), 2), clean: w((n) => en(b(us(p(n)))), 1), indent: w((n, e) => en(b(ls(p(n), L(e)))), 2), optional_space: w((n) => en(b(_s(p(n)))), 1), unquote_prefix: w((n) => b(fs(p(n))), 1), unquote: w((n) => b($s(p(n))), 1), unquote_style_prefix: w((n, e) => b(ds(p(n), e)), 2), unquote_style: w((n, e) => b(hs(p(n), e)), 2), is_marker_exact: w((n, e) => b(gs(p(n), p(e))), 2), is_marker_checked: w((n, e, t) => b(ms(p(n), p(e), t)), 3), is_marker: w((n, e) => b(Eo(p(n), p(e))), 2), starts_trimmed_exact: w((n, e) => b(ps(p(n), p(e))), 2), ends_blank: w((n, e) => b(bs(p(n), e)), 2), starts_trimmed_tight: w((n, e, t) => b(ws(p(n), p(e), t)), 3), starts_trimmed_checked: w((n, e, t) => b(Ns(p(n), p(e), t)), 3), starts_trimmed: w((n, e) => b(xs(p(n), p(e))), 2), quoted_marker: w((n, e) => b(ys(n, p(e))), 2), header_text: w((n) => b(Po(p(n))), 1), header: w((n) => b(zs(n)), 1), quoted_header: w((n) => b(Cs(n)), 1), identifier_chars: w((n) => b(Ss(p(n))), 1), identifier_nonempty: w((n) => b(vs(p(n))), 1), checked_identifier: w((n, e) => b(ks(p(n), e)), 2), anchor_text: w((n) => b(As(p(n))), 1), anchor: w((n) => b(js(p(n))), 1), split_prepend: w((n, e) => b(Fs(p(n), e)), 2), split_choose: w((n, e, t, o) => b(Es(p(n), e, t, o)), 4), split: w((n, e, t) => b(Ps(n, p(e), t)), 3), tags_choose: w((n, e, t, o) => b(qs(n, p(e), t, o)), 4), tags_suffix: w((n) => b(Is(n)), 1), ends_trimmed_exact: w((n, e) => b(qw(p(n), p(e))), 2), ends_trimmed: w((n, e) => b(Ms(p(n), p(e))), 2), display_valid: w((n) => b(Ls(n)), 1), assemble: w((n, e, t, o, r, i) => b(vo(p(n), e, t, o, r, i)), 6), sections_link: w((n, e, t, o, r) => b(ko(p(n), e, t, o, r)), 5), sections_comment: w((n, e, t, o) => b(Os(p(n), e, t, o)), 4), sections: w((n, e) => b(Ts(p(n), e)), 2), after_json_marker: w((n, e, t) => b(Bs(p(n), e, t)), 3), after_json: w((n, e) => b(Js(p(n), e)), 2), json_split: w((n) => b(Ds(n)), 1), parse_body_checked: w((n, e) => b(Rs(n, e)), 2), parse_body: w((n) => b(Ws(n)), 1), header_after: w((n, e) => b(Us(n, p(e))), 2), count_headers: w((n, e, t) => b(Qs(n, e, L(t))), 3), body_guard: w((n, e) => b(Hs(n, e)), 2), body: w((n) => b(Gs(n)), 1), count_prefix: w((n, e, t, o) => b(Ks(p(n), p(e), L(t), o)), 4), fence_start: w((n) => b(Vs(p(n))), 1), fence_close: w((n, e, t) => b(qo(p(n), p(e), L(t))), 3), comment_state: w((n, e) => b(Ys(p(n), e)), 2), mode_comment: w((n) => b(Xs(n)), 1), emit: w((n, e, t, o) => b(dn(p(n), e, t, L(o))), 4), plain_comment_mode: w((n) => b(Zs(p(n))), 1), raw_context: w((n, e, t, o, r) => b(wt(p(n), p(e), t, L(o), r)), 5), quoted_context: w((n, e, t, o, r) => b(nc(p(n), p(e), t, L(o), r)), 5), normal_quote: w((n, e, t, o, r) => b(ec(p(n), p(e), t, L(o), r)), 5), ordered_list: w((n, e, t) => b(tc(p(n), L(e), t)), 3), list_start: w((n) => b(oc(p(n))), 1), normal_list: w((n, e, t, o, r) => b(rc(p(n), p(e), t, L(o), r)), 5), normal_fence: w((n, e, t, o, r) => b(ic(p(n), p(e), t, L(o), r)), 5), normal_open: w((n, e, t, o, r, i) => b(sc(p(n), p(e), t, L(o), r, i)), 6), normal_frontmatter: w((n, e, t, o, r) => b(cc(p(n), p(e), t, L(o), r)), 5), remove_bom: w((n) => en(b(ac(p(n)))), 1), normal: w((n, e, t, o) => b(he(p(n), p(e), t, L(o))), 4), opening_next: w((n, e, t, o, r, i, s) => b(uc(p(n), p(e), p(t), L(o), r, L(i), s)), 7), candidate_fields: w((n, e, t, o, r, i) => b(lc(p(n), p(e), L(t), o, L(r), i)), 6), candidate_anchor: w((n, e, t, o, r, i) => b(_c(p(n), e, L(t), o, L(r), i)), 6), candidate_line: w((n, e, t, o, r, i, s, c, a) => b(fc(p(n), p(e), p(t), o, L(r), i, s, L(c), a)), 9), fence_line: w((n, e, t, o, r, i, s) => b($c(p(n), p(e), L(t), o, r, L(i), s)), 7), quoted_fence_close: w((n, e, t) => b(dc(n, p(e), L(t))), 3), close_kind: w((n, e, t, o) => b(hc(p(n), p(e), L(t), o)), 4), context_line: w((n, e, t, o, r) => b(pt(p(n), e, t, L(o), r)), 5), list_line: w((n, e, t, o, r, i, s) => b(gc(p(n), p(e), t, L(o), r, i, s)), 7), after_annotation: w((n, e, t, o, r) => b(mc(p(n), p(e), t, L(o), r)), 5), step: w((n, e, t, o, r) => b(pc(n, p(e), p(t), o, L(r))), 5), run: w((n, e) => b(bc(n, e)), 2), finish: w((n) => b(wc(n)), 1), scan_lines: w((n) => b(Nc(n)), 1), scan: w((n) => b(xc(p(n))), 1), part_raw: w((n) => en(b(yc(n))), 1), render_go: w((n, e) => en(b(zc(n, p(e)))), 2), render: w((n) => en(b(Iw(n))), 1), has_id_go: w((n, e, t) => b(Cc(n, p(e), t)), 3), has_id: w((n, e) => b(Sc(n, p(e))), 2), errors_go: w((n, e) => b(vc(n, e)), 2), errors_pairwise: w((n) => b(Mw(n)), 1), seen_chain: w((n) => b(kc(p(n))), 1), seen_meets: w((n, e) => b(Ac(n, p(e))), 2), seen_joins: w((n, e) => b(jc(n, p(e))), 2), seen_has_go: w((n, e, t) => b(Fc(n, p(e), t)), 3), seen_has: w((n, e) => b(Ec(n, p(e))), 2), seen_add_go: w((n, e, t) => b(Io(n, p(e), t)), 3), seen_add: w((n, e) => b(Pc(n, p(e))), 2), errors_seen: w((n, e, t) => b(qc(n, e, t)), 3), errors: w((n) => b(Ic(n)), 1), safe: w((n) => b(Mc(n)), 1), without_id_go: w((n, e, t) => en(b(Lc(n, p(e), p(t)))), 3), without_id: w((n, e) => en(b(Oc(n, p(e)))), 2), delete_good: w((n, e) => b(Tc(n, p(e))), 2), delete_checked: w((n, e, t, o) => b(Bc(p(n), p(e), t, o)), 4), delete: w((n, e) => b(Lw(p(n), p(e))), 2), output: w((n) => en(b(Ow(n))), 1), duplicate_diagnostic: w((n, e, t, o) => b(Jc(p(n), L(e), t, o)), 4), diagnostics_go: w((n, e) => b(Dc(n, e)), 2), diagnostics_pairwise: w((n) => b(Tw(n)), 1), diagnostics_seen: w((n, e, t) => b(Rc(n, e, t)), 3), diagnostics: w((n) => b(Bw(n)), 1), lookup: w((n, e) => b(Wc(n, p(e))), 2), replacement_part: w((n, e, t) => en(b(Uc(n, p(e), p(t)))), 3), replace_id: w((n, e, t) => en(b(Qc(n, p(e), p(t)))), 3) };
    function $a(n) {
      let e = { $: "WNil" };
      for (let t = 31; t >= 0; t--) e = { $: "WCon", head: (n >>> t & 1) === 1, tail: e };
      return e;
    }
    function Et(n, e) {
      return { $: n < e ? "LT" : n === e ? "EQ" : "GT" };
    }
    function ln(n) {
      if (n > 281474976710655) throw "bend: a Nat past the largest immediate 2^48-1";
      return n;
    }
    function I(n) {
      if (!Number.isInteger(n) || n < 0 || n > 2 ** 53) throw "bend: expected a Nat host number: an integer from 0 to 2^53";
      return n;
    }
    var Pt = function(e) {
      return e < 55296 || e >= 57344 && e <= 1114111 ? String.fromCodePoint(e) : String.fromCharCode(56320, e >>> 22, e >>> 11 & 2047, e & 2047);
    };
    function C(n, e = 0) {
      return n[e] === "\uDC00" ? 4 : n.codePointAt(e) > 65535 ? 2 : 1;
    }
    function U(n) {
      return n.length < 4 ? n.codePointAt(0) : (n.charCodeAt(1) << 22 | n.charCodeAt(2) << 11 | n.charCodeAt(3)) >>> 0;
    }
    function K(n) {
      return n.replace(/\uDC00[^]{3}/gu, "\uFFFD");
    }
    function d(n) {
      return n.replace(/\p{Cs}/gu, "\uFFFD");
    }
    function St(n, e) {
      return { $: "$JMP", f: n.j?.f === n ? n.j : n, x: e };
    }
    function ma(n) {
      let e = (t) => h(n(t));
      return e.j = n, n.f = e, e;
    }
    function h(n) {
      for (; n !== null && typeof n == "object" && n.$ === "$JMP"; ) n = n.f(n.x);
      return n;
    }
    function g(n, e) {
      return (...t) => t.length < e ? g((...o) => n(...t, ...o), e - t.length) : h(n(...t));
    }
    function pa(n) {
      return n.$ === "TextLine" ? { $: "TextLine" } : { $: "SpaceLine" };
    }
    function ba(n) {
      return n.$ === "TextLine" ? { $: "AfterText" } : { $: "AfterBlank" };
    }
    function wa(n) {
      let e = Mn(n, "	"), t = Mn(n, "\r"), o = Mn(n, " "), r = e || t;
      return { $: "Tuple", fst: Mn(n, `
`), snd: o || r };
    }
    function Na(n, e) {
      return e.fst ? ba(n) : e.snd ? pa(n) : { $: "TextLine" };
    }
    function xa(n, e) {
      return Na(n, J2(e));
    }
    function ya(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, C(t));
          n = t.slice(C(t)), e = D2(o, r);
          continue;
        }
      }
    }
    function za(n) {
      return n.$ === "EmptySource" || n.$ === "AfterBlank" ? "" : n.$ === "TextLine" ? `

` : `
`;
    }
    function Ca(n) {
      let e = W2(R2(n, { $: "EmptySource" }));
      return n + e;
    }
    function Sa(n) {
      return n.$ === "None" ? "" : n.value + "";
    }
    function va(n) {
      if (n.$ === "Nil") return "";
      {
        let e = n.head, t = e.body, o = e.ending, r = n.tail, i = U2(o), s = Ul(r), c = i + s;
        return t + c;
      }
    }
    function ka(n, e, t) {
      if (n.$ === "Nil") return t ? { $: "Con", head: { $: "Line", body: "", ending: { $: "Some", value: e } }, tail: { $: "Nil" } } : { $: "Con", head: { $: "Line", body: e + "", ending: { $: "None" } }, tail: { $: "Nil" } };
      {
        let o = n.head, r = o.body, i = o.ending, s = n.tail;
        return t ? { $: "Con", head: { $: "Line", body: "", ending: { $: "Some", value: e } }, tail: { $: "Con", head: { $: "Line", body: r, ending: i }, tail: s } } : { $: "Con", head: { $: "Line", body: e + r, ending: i }, tail: s };
      }
    }
    function Aa(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, C(t));
          n = t.slice(C(t)), e = Q2(o, r, Mn(r, `
`));
          continue;
        }
      }
    }
    function ZN(n) {
      return Aa(Ne(n), { $: "Nil" });
    }
    function ja(n, e) {
      if (n === "") return e;
      {
        let t = n.slice(0, C(n)), o = n.slice(C(n));
        return { $: "Con", head: { $: "Line", body: t + o, ending: { $: "None" } }, tail: e };
      }
    }
    function Fa(n) {
      if (n !== "") {
        let e = n.slice(0, C(n));
        return qt(e, `
`);
      } else return false;
    }
    function Ea(n, e, t, o) {
      for (; ; ) {
        let r = n, i = e, s = t, c = o;
        if (r === "") return Vo(H2(i, s));
        {
          let a = r.slice(0, C(r)), $ = r.slice(C(r));
          if (c) {
            n = $, e = "", t = { $: "Con", head: { $: "Line", body: i, ending: { $: "Some", value: a } }, tail: s }, o = Ro($);
            continue;
          } else {
            let N = a + "";
            n = $, e = i + N, t = s, o = Ro($);
            continue;
          }
        }
      }
    }
    function Pa(n) {
      return Ea(n, "", { $: "Nil" }, Ro(n));
    }
    function n2(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, C(t));
          n = t.slice(C(t)), e = Mn(r, `
`);
          continue;
        }
      }
    }
    function qa(n) {
      if (n !== "") {
        let e = n.slice(0, C(n)), t = U(e);
        if (t == 13) {
          let o = n.slice(C(n));
          return Xe(o);
        } else {
          let o = n.slice(C(n));
          return Xe(Pt(t) + o);
        }
      } else return Xe(n);
    }
    function Ia(n) {
      return qa(Ne(n));
    }
    function Ma(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, C(t));
          n = t.slice(C(t)), e = Mn(r, "\r");
          continue;
        }
      }
    }
    function La(n, e) {
      return e ? Ia(n) : n;
    }
    function Oa(n) {
      return La(n, G2(n, false));
    }
    function Ta(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t !== "") {
          let r = t.slice(0, C(t)), i = U(r);
          if (i == 32) {
            let s = t.slice(C(t));
            if (o == 0) return " " + s;
            {
              let c = o - 1;
              n = s, e = c;
              continue;
            }
          } else {
            let s = t.slice(C(t));
            return Pt(i) + s;
          }
        } else return t;
      }
    }
    function Ba(n) {
      if (n !== "") {
        let e = n.slice(0, C(n)), t = U(e);
        if (t == 32) return n.slice(C(n));
        {
          let o = n.slice(C(n));
          return Pt(t) + o;
        }
      } else return n;
    }
    function Ja(n) {
      if (n !== "") {
        let e = n.slice(0, C(n));
        if (U(e) == 62) {
          let o = n.slice(C(n));
          return { $: "Some", value: Ql(o) };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function Da(n) {
      return Ja(xe(n, 3));
    }
    function Ra(n, e) {
      if (n !== "") {
        let t = n.slice(0, C(n));
        if (U(t) == 62) {
          let r = n.slice(C(n));
          return { $: "Some", value: re(e, Ql(r), r) };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function Wa(n, e) {
      return Ra(xe(n, 3), e);
    }
    function Ua(n, e) {
      return Yo(Kn(n), e);
    }
    function Qa(n, e, t) {
      return t ? Ua(n, e) : false;
    }
    function Qo(n, e) {
      return Qa(n, e, An(Ie(n), e));
    }
    function Ha(n, e) {
      return Mt(Kn(n), e);
    }
    function Ga(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, C(t));
          n = t.slice(C(t)), e = Hl(r);
          continue;
        }
      }
    }
    function Ka(n, e, t) {
      return t ? true : Ha(n, e);
    }
    function Va(n, e, t) {
      return t ? Ka(n, e, ie(K2(e, false))) : false;
    }
    function Ya(n, e) {
      return Va(n, e, An(Ie(n), e));
    }
    function Xa(n, e) {
      if (n.$ === "None") return false;
      {
        let t = n.value;
        return Qo(t, e);
      }
    }
    function Ho(n) {
      if (n !== "") {
        let e = n.slice(0, C(n));
        if (U(e) == 96) {
          let o = n.slice(C(n));
          if (o !== "") {
            let r = o.slice(0, C(o));
            if (U(r) == 96) {
              let s = o.slice(C(o));
              if (s !== "") {
                let c = s.slice(0, C(s));
                if (U(c) == 96) {
                  let $ = s.slice(C(s));
                  return Yo(Kn($), "annotation-json");
                } else return false;
              } else return false;
            } else return false;
          } else return false;
        } else return false;
      } else return false;
    }
    function Za(n) {
      if (n.$ === "None") return false;
      {
        let e = n.value;
        return Ho(Kn(e));
      }
    }
    function nu(n) {
      if (n.$ === "None") return false;
      {
        let e = n.value, t = kn(e, "```annotation-json"), o = kn(e, "``` annotation-json");
        return t || o;
      }
    }
    function eu(n) {
      if (n === "") return true;
      {
        let e = n.slice(0, C(n)), t = n.slice(C(n)), o = Gl(e), r = Mn(e, "-"), i = V2(e);
        return Ln(i || (o || r), Kl(t));
      }
    }
    function tu(n) {
      return Ln(ie(Ze(n)), Kl(n));
    }
    function ou(n, e) {
      return e ? { $: "Some", value: n } : { $: "None" };
    }
    function ru(n) {
      if (n !== "") {
        let e = n.slice(0, C(n));
        if (U(e) == 94) {
          let o = n.slice(C(n));
          return ou(o, Vl(o));
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function iu(n) {
      return ru(Y2(xe(n, 3)));
    }
    function su(n, e) {
      if (e.$ === "Absent") return { $: "Absent" };
      {
        let t = e.before, o = e.after;
        return { $: "Found", before: { $: "Con", head: n, tail: t }, after: o };
      }
    }
    function cu(n, e, t, o) {
      return o ? { $: "Found", before: { $: "Nil" }, after: e } : su(n, t);
    }
    function au(n, e, t) {
      if (n.$ === "Nil") return { $: "Absent" };
      {
        let o = n.head, r = n.tail;
        return cu(o, r, nt(r, e, t), re(t, kn(o, e), Gn(o, e)));
      }
    }
    function uu(n, e, t, o) {
      return o ? { $: "Tuple", fst: un(t), snd: { $: "Some", value: e } } : { $: "Tuple", fst: un(n), snd: { $: "None" } };
    }
    function lu(n) {
      if (n.$ === "Con") {
        let e = n.head, t = n.tail;
        if (t.$ === "Con") {
          let o = t.head, r = t.tail;
          return uu({ $: "Con", head: e, tail: { $: "Con", head: o, tail: r } }, e, r, Gn(o, "%%TAGS%%"));
        } else return { $: "Tuple", fst: un({ $: "Con", head: e, tail: t }), snd: { $: "None" } };
      } else return { $: "Tuple", fst: un(n), snd: { $: "None" } };
    }
    function e2(n, e) {
      return w2(Kn(n), e);
    }
    function _u(n, e) {
      return Mt(Ie(Ne(Ie(n))), Ne(e));
    }
    function fu(n) {
      if (n.$ === "Nil") return true;
      {
        let e = n.head, t = n.tail;
        return Ln(kn(e, "*"), X2(Yl({ $: "Con", head: e, tail: t }, `
`), "*"));
      }
    }
    function Bo(n, e, t, o, r, i) {
      return i ? { $: "Some", value: { $: "Legacy", json: n, display: e, link: t, comment: o, tags: r } } : { $: "None" };
    }
    function Jo(n, e, t, o, r) {
      if (r.$ === "Absent") return Bo(n, e, { $: "None" }, t, o, da(e));
      {
        let i = r.before, s = r.after;
        return Bo(n, i, nx(Z2(e, Xl(i))), t, o, Nn(da(i), ex(s)));
      }
    }
    function $u(n, e, t, o) {
      if (o.$ === "Absent") return Jo(n, e, { $: "None" }, t, nt(e, "%%LINK%%", true));
      {
        let r = o.before, i = o.after;
        return Jo(n, r, { $: "Some", value: i }, t, nt(r, "%%LINK%%", true));
      }
    }
    function du(n, e) {
      let t = e.fst, o = e.snd;
      return $u(n, t, o, nt(t, "%%COMMENT%%", false));
    }
    function hu(n, e, t) {
      return t ? du(n, tx(un(e))) : { $: "None" };
    }
    function gu(n, e) {
      if (e.$ === "Con") {
        let t = e.head, o = e.tail;
        return hu(n, o, Gn(t, "%%"));
      } else return { $: "None" };
    }
    function mu(n) {
      if (n.$ === "Absent") return { $: "None" };
      {
        let e = n.before, t = n.after;
        return gu(Yl(e, `
`), t);
      }
    }
    function pu(n, e) {
      return e ? mu(nt(n, "```", false)) : { $: "None" };
    }
    function bu(n) {
      if (n.$ === "Con") {
        let e = n.head, t = n.tail;
        if (t.$ === "Con") {
          let o = t.head, r = t.tail;
          return pu(r, Nn(jt(e, "%%"), jt(o, "```annotation-json")));
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function wu(n, e) {
      return n ? Ho(Kn(e)) : false;
    }
    function Nu(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          n = o.tail, e = Gn(s, "%%"), t = re(ox(r, s), ln(i + 1), i);
          continue;
        }
      }
    }
    function xu(n, e) {
      return e ? bu(n) : { $: "None" };
    }
    function yu(n) {
      return xu(n, ix(rx(n, false, 0), 1));
    }
    function zu(n, e, t, o) {
      for (; ; ) {
        let r = n, i = e, s = t, c = o;
        if (r === "") return s;
        {
          let a = r.slice(0, C(r)), $ = r.slice(C(r)), N = Nn(c, Mn(a, i));
          n = $, e = i, t = re(N, ln(s + 1), s), o = N;
          continue;
        }
      }
    }
    function Cu(n) {
      if (n !== "") {
        let e = n.slice(0, C(n)), t = U(e);
        if (t == 96) {
          let o = n.slice(C(n));
          if (o !== "") {
            let r = o.slice(0, C(o));
            if (U(r) == 96) {
              let s = o.slice(C(o));
              if (s !== "") {
                let c = s.slice(0, C(s));
                if (U(c) == 96) {
                  let $ = s.slice(C(s));
                  return { $: "Some", value: { $: "Fence", char: "`", size: Wo($, "`", 3, true), quoted: false } };
                } else return { $: "None" };
              } else return { $: "None" };
            } else return { $: "None" };
          } else return { $: "None" };
        } else if (t == 126) {
          let o = n.slice(C(n));
          if (o !== "") {
            let r = o.slice(0, C(o));
            if (U(r) == 126) {
              let s = o.slice(C(o));
              if (s !== "") {
                let c = s.slice(0, C(s));
                if (U(c) == 126) {
                  let $ = s.slice(C(s));
                  return { $: "Some", value: { $: "Fence", char: "~", size: Wo($, "~", 3, true), quoted: false } };
                } else return { $: "None" };
              } else return { $: "None" };
            } else return { $: "None" };
          } else return { $: "None" };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function Go(n, e, t) {
      let o = Wo(n, e, 0, true);
      return Ln(sx(o, t), Ze(Kn(cx(n, o))));
    }
    function Su(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, C(t)), i = t.slice(C(t));
          n = i, e = re(An(r + i, "<!--"), true, re(An(r + i, "-->"), false, o));
          continue;
        }
      }
    }
    function vu(n) {
      return n ? { $: "HtmlComment" } : { $: "Neutral" };
    }
    function hn(n, e, t, o) {
      return { $: "ScanState", mode: e, reversed: { $: "Con", head: { $: "RawPart", raw: n }, tail: t }, line: ln(o + 1) };
    }
    function ku(n) {
      return It(Gn(n, "%%"), { $: "ObsidianComment" }, n_(Zl(n, false)));
    }
    function At(n, e, t, o, r) {
      return r ? { $: "ScanState", mode: { $: "OpaqueHtml" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "unsupported raw HTML context", line: o }, tail: t }, line: ln(o + 1) } : hn(n, ax(e), t, o);
    }
    function Au(n, e, t, o, r) {
      if (r.$ === "Some") {
        let i = r.value;
        if (i.$ === "Fence") {
          let s = i.char, c = i.size;
          return hn(n, { $: "Fence", char: s, size: c, quoted: true }, t, o);
        } else return At(n, e, t, o, Nn(kn(e, "<"), ie(kn(e, "<!--"))));
      } else return At(n, e, t, o, Nn(kn(e, "<"), ie(kn(e, "<!--"))));
    }
    function ju(n, e, t, o, r) {
      if (r.$ === "None") return At(n, e, t, o, Nn(kn(e, "<"), ie(kn(e, "<!--"))));
      {
        let i = r.value;
        return Au(n, i, t, o, e_(i));
      }
    }
    function Fu(n, e, t) {
      if (n !== "") {
        let o = n.slice(0, C(n)), r = n.slice(C(n));
        if (e == 0) return false;
        {
          let i = e - 1, s = o + r, c = An(s, ". "), a = An(s, ") "), $ = Nn(t, c || a), N = Nn(Gl(o), t_(r, i, true));
          return $ || N;
        }
      } else return false;
    }
    function Eu(n) {
      let e = An(n, "+ "), t = An(n, "* "), o = An(n, "- "), r = e || t;
      return t_(n, 10, false) || (o || r);
    }
    function Pu(n, e, t, o, r) {
      return r ? hn(n, { $: "ListBody" }, t, o) : ju(n, e, t, o, we(e));
    }
    function qu(n, e, t, o, r) {
      if (r.$ === "Some") {
        let i = r.value;
        return hn(n, i, t, o);
      } else return Pu(n, e, t, o, ux(xe(e, 3)));
    }
    function Iu(n, e, t, o, r, i) {
      return r ? { $: "ScanState", mode: { $: "Opening", raw: n, line: o }, reversed: t, line: ln(o + 1) } : i ? { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "annotation fence without opening marker", line: o }, tail: t }, line: ln(o + 1) } : qu(n, e, t, o, e_(xe(e, 3)));
    }
    function Mu(n, e, t, o, r) {
      return r ? hn(n, { $: "Frontmatter" }, t, o) : Iu(n, e, t, o, o_(we(e), "%%"), r_(we(e)));
    }
    function Lu(n) {
      if (n !== "") {
        let e = n.slice(0, C(n)), t = U(e);
        if (t == 65279) return n.slice(C(n));
        {
          let o = n.slice(C(n));
          return Pt(t) + o;
        }
      } else return n;
    }
    function be(n, e, t, o) {
      return Mu(n, re(ha(o, 0), ga(e), e), t, o, Nn(ha(o, 0), Gn(ga(e), "---")));
    }
    function Ou(n, e, t, o, r, i, s) {
      return s ? { $: "ScanState", mode: { $: "Candidate", raw: t + n, reversed: { $: "Con", head: "```annotation-json", tail: { $: "Con", head: "%%", tail: { $: "Nil" } } }, line: o, formatted: kn(t, "> ") }, reversed: r, line: ln(i + 1) } : be(n, e, { $: "Con", head: { $: "RawPart", raw: t }, tail: r }, i);
    }
    function Tu(n, e, t, o, r, i) {
      if (i.$ === "Some") {
        let s = i.value;
        return { $: "ScanState", mode: { $: "AfterAnnotation" }, reversed: { $: "Con", head: { $: "AnnotationPart", id: e, raw: n, fields: s, line: t }, tail: o }, line: ln(r + 1) };
      } else return { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "malformed or unsupported annotation body", line: t }, tail: o }, line: ln(r + 1) };
    }
    function Bu(n, e, t, o, r, i) {
      if (i.$ === "Some") {
        let s = i.value;
        return Tu(n, s, t, o, r, lx(un(e)));
      } else return { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "missing or unsupported annotation block ID", line: t }, tail: o }, line: ln(r + 1) };
    }
    function Ju(n, e, t, o, r, i, s, c, a) {
      if (a.$ === "Some") {
        let $ = a.value;
        return { $: "ScanState", mode: { $: "Candidate", raw: t + n, reversed: { $: "Con", head: $, tail: o }, line: r, formatted: i }, reversed: s, line: ln(c + 1) };
      } else return Bu(t + n, o, r, s, c, _x(e));
    }
    function Du(n, e, t, o, r, i, s) {
      return s ? hn(n, { $: "Neutral" }, r, i) : hn(n, { $: "Fence", char: e, size: t, quoted: o }, r, i);
    }
    function Ru(n, e, t) {
      if (n.$ === "None") return false;
      {
        let o = n.value;
        return Go(xe(o, 3), e, t);
      }
    }
    function Wu(n, e, t, o) {
      return o ? Ru(we(n), e, t) : Go(xe(n, 3), e, t);
    }
    function vt(n, e, t, o, r) {
      return r ? hn(n, { $: "Neutral" }, t, o) : hn(n, e, t, o);
    }
    function Uu(n, e, t, o, r, i, s) {
      return r ? hn(n, { $: "ListBody" }, t, o) : i ? s ? { $: "ScanState", mode: { $: "ListBody" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "nested annotation candidate inside list is unsupported", line: o }, tail: t }, line: ln(o + 1) } : hn(n, { $: "ListBody" }, t, o) : be(n, e, t, o);
    }
    function Qu(n, e, t, o, r) {
      if (t.$ === "Con") {
        let i = t.head;
        if (i.$ === "AnnotationPart") {
          let s = i.id, c = i.raw, a = i.fields, $ = i.line, N = t.tail;
          return r ? { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "AnnotationPart", id: s, raw: c + n, fields: a, line: $ }, tail: N }, line: ln(o + 1) } : be(n, e, { $: "Con", head: { $: "AnnotationPart", id: s, raw: c, fields: a, line: $ }, tail: N }, o);
        } else {
          let s = t.tail;
          return be(n, e, { $: "Con", head: i, tail: s }, o);
        }
      } else return be(n, e, t, o);
    }
    function Hu(n, e, t, o, r) {
      if (n.$ === "Neutral") return be(e, t, o, r);
      if (n.$ === "AfterAnnotation") return Qu(e, t, o, r, Ze(t));
      if (n.$ === "Opening") {
        let i = n.raw, s = n.line;
        return Ou(e, t, i, s, o, r, fx(we(t)));
      } else if (n.$ === "Candidate") {
        let i = n.raw, s = n.reversed, c = n.line, a = n.formatted;
        return Ju(e, t, i, s, c, a, o, r, $x(t, a));
      } else if (n.$ === "Fence") {
        let i = n.char, s = n.size, c = n.quoted;
        return Du(e, i, s, c, o, r, dx(t, i, s, c));
      } else {
        if (n.$ === "HtmlComment") return hn(e, n_(Zl(t, true)), o, r);
        if (n.$ === "ObsidianComment") return vt(e, { $: "ObsidianComment" }, o, r, Gn(t, "%%"));
        if (n.$ === "Frontmatter") {
          let i = Gn(t, "---"), s = Gn(t, "...");
          return vt(e, { $: "Frontmatter" }, o, r, i || s);
        } else {
          if (n.$ === "OpaqueHtml") return vt(e, { $: "OpaqueHtml" }, o, r, Ze(Kn(t)));
          {
            let i = An(t, " "), s = An(t, "	"), c = o_(we(t), "%%"), a = r_(we(t));
            return Uu(e, t, o, r, Ze(Kn(t)), i || s, c || a);
          }
        }
      }
    }
    function Gu(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head, i = r.body, s = r.ending, c = t.tail, a = o.mode, $ = o.reversed, N = o.line;
          n = c, e = gx(a, Ul({ $: "Con", head: { $: "Line", body: i, ending: s }, tail: { $: "Nil" } }), hx(i), $, N);
          continue;
        }
      }
    }
    function Ku(n) {
      let e = n.mode;
      if (e.$ === "Neutral") {
        let t = n.reversed;
        return { $: "Scan", parts: un(t), closed: true };
      } else if (e.$ === "AfterAnnotation") {
        let t = n.reversed;
        return { $: "Scan", parts: un(t), closed: true };
      } else if (e.$ === "ListBody") {
        let t = n.reversed;
        return { $: "Scan", parts: un(t), closed: true };
      } else if (e.$ === "Opening") {
        let t = e.raw, o = n.reversed;
        return { $: "Scan", parts: un({ $: "Con", head: { $: "RawPart", raw: t }, tail: o }), closed: true };
      } else if (e.$ === "Candidate") {
        let t = e.raw, o = e.line, r = n.reversed;
        return { $: "Scan", parts: un({ $: "Con", head: { $: "CandidateError", raw: t, message: "annotation has no closing anchor", line: o }, tail: r }), closed: false };
      } else {
        let t = n.reversed, o = n.line;
        return { $: "Scan", parts: un({ $: "Con", head: { $: "CandidateError", raw: "", message: "unclosed Markdown context", line: o }, tail: t }), closed: false };
      }
    }
    function Vu(n) {
      return Ku(mx(n, { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Nil" }, line: 0 }));
    }
    function Yu(n) {
      return Vu(px(n));
    }
    function Xu(n) {
      return n.$ === "RawPart" || n.$ === "AnnotationPart", n.raw;
    }
    function Zu(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head, i = t.tail, s = Xo(r);
          n = i, e = o + s;
          continue;
        }
      }
    }
    function t2(n) {
      return Zu(n, "");
    }
    function nl(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          if (s.$ === "AnnotationPart") {
            let c = s.id, a = o.tail, $ = jt(c, r);
            n = a, e = r, t = i || $;
            continue;
          } else {
            n = o.tail, e = r, t = i;
            continue;
          }
        }
      }
    }
    function el(n, e) {
      return nl(n, e, false);
    }
    function tl(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head;
          if (r.$ === "CandidateError") {
            n = t.tail, e = true;
            continue;
          } else if (r.$ === "AnnotationPart") {
            let i = r.id, s = t.tail, c = Me(s, i);
            n = s, e = o || c;
            continue;
          } else {
            n = t.tail, e = o;
            continue;
          }
        }
      }
    }
    function o2(n) {
      return tl(n, false);
    }
    function ol(n) {
      if (n === "") return { $: "SeenEnd", next: { $: "SeenNone" } };
      {
        let e = n.slice(0, C(n)), t = n.slice(C(n));
        return { $: "SeenChar", char: e, down: i_(t), next: { $: "SeenNone" } };
      }
    }
    function rl(n, e) {
      if (n.$ === "SeenChar") {
        let t = n.char;
        if (e !== "") {
          let o = e.slice(0, C(e));
          return qt(t, o);
        } else return false;
      } else return false;
    }
    function il(n, e) {
      if (n.$ === "SeenChar") {
        let t = n.char;
        if (e !== "") {
          let o = e.slice(0, C(e));
          return qt(o, t);
        } else return false;
      } else return false;
    }
    function sl(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "SeenNone") return false;
        if (o.$ === "SeenEnd") {
          let s = o.next;
          if (r === "") return true;
          {
            let c = r.slice(0, C(r)), a = r.slice(C(r));
            n = s, e = c + a, t = Ye(s, c + a);
            continue;
          }
        } else {
          let s = o.down, c = o.next;
          if (r === "") {
            n = c, e = "", t = Ye(c, "");
            continue;
          } else {
            let a = r.slice(0, C(r)), $ = r.slice(C(r));
            if (i) {
              n = s, e = $, t = Ye(s, $);
              continue;
            } else {
              n = c, e = a + $, t = Ye(c, a + $);
              continue;
            }
          }
        }
      }
    }
    function cl(n, e) {
      return sl(n, e, Ye(n, e));
    }
    function Ko(n, e, t) {
      if (n.$ === "SeenNone") {
        if (e === "") return { $: "SeenEnd", next: { $: "SeenNone" } };
        {
          let o = e.slice(0, C(e)), r = e.slice(C(e));
          return { $: "SeenChar", char: o, down: i_(r), next: { $: "SeenNone" } };
        }
      } else if (n.$ === "SeenEnd") {
        let o = n.next;
        if (e === "") return { $: "SeenEnd", next: o };
        {
          let r = e.slice(0, C(e)), i = e.slice(C(e));
          return { $: "SeenEnd", next: To(o, r + i, kt(o, r + i)) };
        }
      } else {
        let o = n.char, r = n.down, i = n.next;
        if (e === "") return { $: "SeenEnd", next: { $: "SeenChar", char: o, down: r, next: i } };
        {
          let s = e.slice(0, C(e)), c = e.slice(C(e));
          return t ? { $: "SeenChar", char: o, down: To(r, c, kt(r, c)), next: i } : { $: "SeenChar", char: o, down: r, next: To(i, s + c, kt(i, s + c)) };
        }
      }
    }
    function al(n, e) {
      return Ko(n, e, kt(n, e));
    }
    function ul(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          if (s.$ === "CandidateError") {
            n = o.tail, e = r, t = true;
            continue;
          } else if (s.$ === "AnnotationPart") {
            let c = s.id, a = o.tail, $ = c_(r, c);
            n = a, e = s_(r, c), t = $ || i;
            continue;
          } else {
            n = o.tail, e = r, t = i;
            continue;
          }
        }
      }
    }
    function ll(n) {
      return ul(un(n), { $: "SeenNone" }, false);
    }
    function _l(n) {
      let e = n.parts, t = n.closed;
      return Ln(t, ie(a_(e)));
    }
    function fl(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head, c = o.tail, a = Me({ $: "Con", head: s, tail: { $: "Nil" } }, r), $ = re(a, "", Xo(s));
          n = c, e = r, t = i + $;
          continue;
        }
      }
    }
    function $l(n, e) {
      return fl(n, e, "");
    }
    function dl(n, e) {
      let t = n.parts;
      return { $: "SourceEdit", source: bx(t, e), error: { $: "None" } };
    }
    function hl(n, e, t, o) {
      return o ? dl(t, e) : { $: "SourceEdit", source: n, error: { $: "Some", value: "unsafe annotation document" } };
    }
    function gl(n, e) {
      let t = u_(n);
      return hl(n, e, t, wx(t));
    }
    function ml(n) {
      return n.source;
    }
    function pl(n, e, t, o) {
      return o ? { $: "Con", head: { $: "Diagnostic", line: e, message: "duplicate annotation ID: " + n }, tail: t } : t;
    }
    function bl(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return Vo(o);
        {
          let r = t.head;
          if (r.$ === "CandidateError") {
            let i = r.message, s = r.line;
            n = t.tail, e = { $: "Con", head: { $: "Diagnostic", line: s, message: i }, tail: o };
            continue;
          } else if (r.$ === "AnnotationPart") {
            let i = r.id, s = r.line, c = t.tail;
            n = c, e = l_(i, s, o, Me(c, i));
            continue;
          } else {
            n = t.tail, e = o;
            continue;
          }
        }
      }
    }
    function r2(n) {
      return bl(n, { $: "Nil" });
    }
    function wl(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          if (s.$ === "CandidateError") {
            let c = s.message, a = s.line;
            n = o.tail, e = r, t = { $: "Con", head: { $: "Diagnostic", line: a, message: c }, tail: i };
            continue;
          } else if (s.$ === "AnnotationPart") {
            let c = s.id, a = s.line;
            n = o.tail, e = s_(r, c), t = l_(c, a, i, c_(r, c));
            continue;
          } else {
            n = o.tail, e = r, t = i;
            continue;
          }
        }
      }
    }
    function i2(n) {
      return wl(un(n), { $: "SeenNone" }, { $: "Nil" });
    }
    function Nl(n, e) {
      if (n.$ === "Nil") return { $: "None" };
      {
        let t = n.head, o = n.tail;
        return It(Me({ $: "Con", head: t, tail: { $: "Nil" } }, e), { $: "Some", value: t }, Nx(o, e));
      }
    }
    function xl(n, e, t) {
      let o = Me({ $: "Con", head: n, tail: { $: "Nil" } }, e);
      return It(o, t, Xo(n));
    }
    function yl(n, e, t) {
      if (n.$ === "Nil") return "";
      {
        let o = n.head, r = n.tail, i = xx(o, e, t), s = yx(r, e, t);
        return i + s;
      }
    }
    function Do(n, e, t, o) {
      if (o.$ === "None") return { $: "None" };
      {
        let r = o.value;
        return { $: "Some", value: Ft(r) };
      }
    }
    function zl(n, e, t) {
      if (n == 0) return { $: "Some", value: null };
      {
        let o = n - 1;
        if (e.head) {
          let i = e.tail;
          if (t.head) {
            let c = t.tail;
            return Do(true, i, c, Uo(o, i, c));
          } else return { $: "None" };
        } else {
          let i = e.tail;
          if (t.head) return { $: "None" };
          {
            let c = t.tail;
            return Do(false, i, c, Uo(o, i, c));
          }
        }
      }
    }
    function Cl(n, e, t) {
      if (t.$ === "None") return { $: "None" };
      {
        let o = t.value;
        return { $: "Some", value: Ft(o) };
      }
    }
    function Sl(n, e) {
      let t = U(n), o = $a(t), r = U(e), i = $a(r);
      return Cl(o, i, Uo(32, o, i));
    }
    function vl(n, e) {
      if (n.$ === "Some") {
        let t = n.value;
        if (e.$ === "Some") {
          let o = e.value;
          return { $: "Some", value: zx(Ft(t), Ft(o)) };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function kl(n, e, t) {
      return St(e, Cx(n, t));
    }
    function Al(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o === "") return r === "" ? St(i, { $: "Some", value: null }) : St(i, { $: "None" });
        {
          let s = o.slice(0, C(o)), c = o.slice(C(o));
          if (r !== "") {
            let a = r.slice(0, C(r)), $ = r.slice(C(r));
            n = c, e = $, t = ma(s2(a, s, i));
            continue;
          } else return St(i, { $: "None" });
        }
      }
    }
    function s2(n, e, t) {
      return (o) => kl(Sx(e, n), t, o);
    }
    function c2(n, e) {
      return Al(n, e, ma(a2()));
    }
    function a2() {
      return (n) => n;
    }
    function jl(n, e) {
      return n ? { $: "Some", value: e } : { $: "None" };
    }
    function Fl(n, e) {
      return jl(jt(n, e), null);
    }
    function El(n, e, t, o, r) {
      if (r.$ === "None") return { $: "CreationRefused", message: "created annotation does not own a complete trailing blank-line separator" };
      {
        let i = r.value;
        return { $: "CreationReady", source: t, proof: o, stable: i };
      }
    }
    function Pl(n, e, t, o) {
      if (o.$ === "None") return { $: "CreationRefused", message: "created annotation did not reparse/delete to the boundary-normalized source" };
      {
        let r = o.value;
        return El(n, e, t, r, __(Zo(t), t));
      }
    }
    function ql(n, e) {
      return e;
    }
    function Il(n, e) {
      if (e.$ === "None") return { $: "None" };
      {
        let t = e.value;
        return { $: "Some", value: vx(n, t) };
      }
    }
    function Ml(n, e, t) {
      return Il(t, __(e, Zo(n)));
    }
    function Ll(n, e, t, o, r) {
      let i = o.source;
      return o.error.$ === "Some" ? { $: "CreationRefused", message: "created annotation is malformed, ambiguous, or in an unsafe context" } : Pl(n, e, t, kx(n, i, r));
    }
    function Ol(n, e, t, o) {
      if (o) {
        let i = `
^` + (e + `

`), s = Zo(n), c = t + i, a = s + c;
        return Ll(n, e, a, f_(a, e), null);
      } else return { $: "CreationRefused", message: "unsafe document, duplicate ID, or invalid ID" };
    }
    function Tl(n, e) {
      let t = e.parts, o = e.closed;
      return Ln(Vl(n), Nn(o, Nn(ie(a_(t)), ie(Me(t, n)))));
    }
    function Bl(n, e, t) {
      return Ol(n, e, t, Ax(e, u_(n)));
    }
    function u2(n) {
      return n.$ === "CreationRefused" ? { $: "None" } : { $: "Some", value: n.source };
    }
    function l2(n) {
      return n.$ !== "CreationRefused";
    }
    function Jl(n, e, t) {
      if (t.$ === "CreationRefused") return n;
      {
        let o = t.source;
        return ml(f_(o, e));
      }
    }
    function _2(n, e, t) {
      return Jl(n, e, jx(n, e, t));
    }
    function f2(n, e, t) {
      return t.$ === "CreationRefused" ? n : t.source;
    }
    function qt(n, e) {
      let t = U(n), o = U(e);
      return t === o;
    }
    function Xe(n) {
      return E2(n, "");
    }
    function Vo(n) {
      return P2(n, { $: "Nil" });
    }
    function It(n, e, t) {
      return n ? e : t;
    }
    function Yo(n, e) {
      return Rl(Fx(n, e));
    }
    function $2(n) {
      return Dl(Ie(n));
    }
    function Mt(n, e) {
      return I2(e, n);
    }
    function d2(n, e, t) {
      let o = 0;
      for (; ; ) switch (o) {
        case 0: {
          let r = n;
          if (r === "") return "";
          {
            let i = r.slice(0, C(r));
            n = r.slice(C(r)), e = i, t = Hl(i), o = 1;
            continue;
          }
        }
        case 1: {
          let r = n, i = e;
          if (t) {
            n = r, o = 0;
            continue;
          } else return i + r;
        }
      }
    }
    function h2(n) {
      let e = U(n), t = e === 32, o = Nn(e >= 9, e <= 13);
      return t || o;
    }
    function g2(n) {
      return !n;
    }
    function Ln(n, e) {
      return n ? e : false;
    }
    function m2(n) {
      let e = Ex(n), t = Px(n);
      return e || t;
    }
    function p2(n) {
      let e = U(n);
      return Ln(e >= 48, e <= 57);
    }
    function b2(n) {
      return n === "";
    }
    function Dl(n) {
      return Xe(Ie(Ne(n)));
    }
    function w2(n, e) {
      return Mt(Ne(n), Ne(e));
    }
    function N2(n, e) {
      if (n.$ === "Nil") return "";
      {
        let t = n.head, o = n.tail;
        return Wl(o, t, e);
      }
    }
    function x2(n) {
      return n.$ === "Nil" ? { $: "None" } : { $: "Some", value: n.head };
    }
    function y2(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return { $: "Nil" };
        {
          let r = t.head, i = t.tail;
          if (o == 0) return { $: "Con", head: r, tail: i };
          {
            let s = o - 1;
            n = i, e = s;
            continue;
          }
        }
      }
    }
    function z2(n) {
      if (n.$ === "Nil") return 0;
      {
        let e = n.tail;
        return ln(Xl(e) + 1);
      }
    }
    function C2(n) {
      return n.$ === "Nil";
    }
    function S2(n, e) {
      return O2(Et(n, e));
    }
    function v2(n, e) {
      return T2(Et(n, e));
    }
    function k2(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return "";
        {
          let r = t.slice(0, C(t)), i = t.slice(C(t));
          if (o == 0) return r + i;
          {
            let s = o - 1;
            n = i, e = s;
            continue;
          }
        }
      }
    }
    function A2(n, e) {
      return Rl(Et(n, e));
    }
    function j2(n) {
      return null;
    }
    function F2(n, e) {
      return n;
    }
    function E2(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, C(t));
          n = t.slice(C(t)), e = r + o;
          continue;
        }
      }
    }
    function P2(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head;
          n = t.tail, e = { $: "Con", head: r, tail: o };
          continue;
        }
      }
    }
    function Rl(n) {
      return n.$ === "EQ";
    }
    function q2(n, e) {
      return B2(n, e, { $: "EQ" });
    }
    function I2(n, e, t) {
      let o = 0;
      for (; ; ) switch (o) {
        case 0: {
          let r = n, i = e;
          if (r === "") return true;
          {
            let s = r.slice(0, C(r)), c = r.slice(C(r));
            if (i === "") return false;
            {
              let a = i.slice(0, C(i)), $ = i.slice(C(i));
              n = c, e = $, t = Mn(a, s), o = 1;
              continue;
            }
          }
        }
        case 1: {
          let r = n, i = e;
          if (t) {
            n = r, e = i, o = 0;
            continue;
          } else return false;
        }
      }
    }
    function M2(n) {
      let e = U(n);
      return Ln(e >= 65, e <= 90);
    }
    function L2(n) {
      let e = U(n);
      return Ln(e >= 97, e <= 122);
    }
    function Wl(n, e, t) {
      if (n.$ === "Nil") return e;
      {
        let o = n.head, r = n.tail, i = qx(r, o, t), s = t + i;
        return e + s;
      }
    }
    function O2(n) {
      return n.$ !== "GT";
    }
    function T2(n) {
      return n.$ !== "LT";
    }
    function B2(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o === "") return r !== "" && i.$ === "EQ" ? { $: "LT" } : i;
        {
          let s = o.slice(0, C(o)), c = U(s), a = o.slice(C(o));
          if (r === "") return i.$ === "EQ" ? { $: "GT" } : i;
          {
            let $ = r.slice(0, C(r)), N = U($), k = r.slice(C(r));
            if (i.$ === "EQ") {
              n = a, e = k, t = Et(c, N);
              continue;
            } else return i;
          }
        }
      }
    }
    var Mn = qt;
    var J2 = wa;
    var D2 = xa;
    var R2 = ya;
    var W2 = za;
    var U2 = Sa;
    var Ul = va;
    var Q2 = ka;
    var Ne = Xe;
    var H2 = ja;
    var Ro = Fa;
    var G2 = Ma;
    var Ql = Ba;
    var xe = Ta;
    var re = It;
    var Kn = $2;
    var Ie = d2;
    var An = Mt;
    var Hl = h2;
    var K2 = Ga;
    var ie = g2;
    var kn = Ya;
    var V2 = m2;
    var Gl = p2;
    var Kl = eu;
    var Ze = b2;
    var Vl = tu;
    var Y2 = Dl;
    var nt = au;
    var Gn = Qo;
    var un = Vo;
    var Yl = N2;
    var X2 = _u;
    var da = fu;
    var Xl = z2;
    var Z2 = y2;
    var nx = x2;
    var ex = C2;
    var Nn = Ln;
    var tx = lu;
    var jt = Yo;
    var ox = wu;
    var rx = Nu;
    var ix = S2;
    var Wo = zu;
    var sx = v2;
    var cx = k2;
    var Zl = Su;
    var n_ = vu;
    var ax = ku;
    var e_ = Cu;
    var t_ = Fu;
    var we = Da;
    var ux = Eu;
    var o_ = Xa;
    var r_ = nu;
    var ha = A2;
    var ga = Lu;
    var lx = yu;
    var _x = iu;
    var fx = Za;
    var $x = Wa;
    var dx = Wu;
    var hx = Oa;
    var gx = Hu;
    var mx = Gu;
    var px = Pa;
    var Xo = Xu;
    var Me = el;
    var i_ = ol;
    var Ye = rl;
    var kt = il;
    var To = Ko;
    var s_ = al;
    var c_ = cl;
    var a_ = ll;
    var bx = $l;
    var u_ = Yu;
    var wx = _l;
    var l_ = pl;
    var Nx = Nl;
    var xx = xl;
    var yx = yl;
    var Ft = j2;
    var Uo = zl;
    var zx = F2;
    var Cx = vl;
    var Sx = Sl;
    var Zo = Ca;
    var __ = Fl;
    var vx = ql;
    var kx = Ml;
    var f_ = gl;
    var Ax = Tl;
    var jx = Bl;
    var Fx = q2;
    var Ex = M2;
    var Px = L2;
    var qx = Wl;
    var $_ = { "boundary:space": g((n) => h(pa(n)), 1), "boundary:newline": g((n) => h(ba(n)), 1), "boundary:classify": g((n) => h(wa(d(n))), 1), "boundary:step_kind": g((n, e) => h(Na(n, e)), 2), "boundary:step": g((n, e) => h(xa(n, d(e))), 2), "boundary:run": g((n, e) => h(ya(d(n), e)), 2), "boundary:suffix": g((n) => K(h(za(n))), 1), "boundary:normalize": g((n) => K(h(Ca(d(n)))), 1), "document:ending_text": g((n) => K(h(Sa(n))), 1), "document:encode": g((n) => K(h(va(n))), 1), "document:push": g((n, e, t) => h(ka(n, d(e), t)), 3), "document:decode_go": g((n, e) => h(Aa(d(n), e)), 2), "document:decode_exact": g((n) => h(ZN(d(n))), 1), "document:lines_end": g((n, e) => h(ja(d(n), e)), 2), "document:head_newline": g((n) => h(Fa(d(n))), 1), "document:lines_go": g((n, e, t, o) => h(Ea(d(n), d(e), t, o)), 4), "document:decode": g((n) => h(Pa(d(n))), 1), "document:ends_nl": g((n, e) => h(n2(d(n), e)), 2), "recognizer:clean_reverse": g((n) => K(h(qa(d(n)))), 1), "recognizer:clean_exact": g((n) => K(h(Ia(d(n)))), 1), "recognizer:ends_cr": g((n, e) => h(Ma(d(n), e)), 2), "recognizer:clean_checked": g((n, e) => K(h(La(d(n), e))), 2), "recognizer:clean": g((n) => K(h(Oa(d(n)))), 1), "recognizer:indent": g((n, e) => K(h(Ta(d(n), I(e)))), 2), "recognizer:optional_space": g((n) => K(h(Ba(d(n)))), 1), "recognizer:unquote_prefix": g((n) => h(Ja(d(n))), 1), "recognizer:unquote": g((n) => h(Da(d(n))), 1), "recognizer:unquote_style_prefix": g((n, e) => h(Ra(d(n), e)), 2), "recognizer:unquote_style": g((n, e) => h(Wa(d(n), e)), 2), "recognizer:is_marker_exact": g((n, e) => h(Ua(d(n), d(e))), 2), "recognizer:is_marker_checked": g((n, e, t) => h(Qa(d(n), d(e), t)), 3), "recognizer:is_marker": g((n, e) => h(Qo(d(n), d(e))), 2), "recognizer:starts_trimmed_exact": g((n, e) => h(Ha(d(n), d(e))), 2), "recognizer:ends_blank": g((n, e) => h(Ga(d(n), e)), 2), "recognizer:starts_trimmed_tight": g((n, e, t) => h(Ka(d(n), d(e), t)), 3), "recognizer:starts_trimmed_checked": g((n, e, t) => h(Va(d(n), d(e), t)), 3), "recognizer:starts_trimmed": g((n, e) => h(Ya(d(n), d(e))), 2), "recognizer:quoted_marker": g((n, e) => h(Xa(n, d(e))), 2), "recognizer:header_text": g((n) => h(Ho(d(n))), 1), "recognizer:header": g((n) => h(Za(n)), 1), "recognizer:quoted_header": g((n) => h(nu(n)), 1), "recognizer:identifier_chars": g((n) => h(eu(d(n))), 1), "recognizer:identifier_nonempty": g((n) => h(tu(d(n))), 1), "recognizer:checked_identifier": g((n, e) => h(ou(d(n), e)), 2), "recognizer:anchor_text": g((n) => h(ru(d(n))), 1), "recognizer:anchor": g((n) => h(iu(d(n))), 1), "recognizer:split_prepend": g((n, e) => h(su(d(n), e)), 2), "recognizer:split_choose": g((n, e, t, o) => h(cu(d(n), e, t, o)), 4), "recognizer:split": g((n, e, t) => h(au(n, d(e), t)), 3), "recognizer:tags_choose": g((n, e, t, o) => h(uu(n, d(e), t, o)), 4), "recognizer:tags_suffix": g((n) => h(lu(n)), 1), "recognizer:ends_trimmed_exact": g((n, e) => h(e2(d(n), d(e))), 2), "recognizer:ends_trimmed": g((n, e) => h(_u(d(n), d(e))), 2), "recognizer:display_valid": g((n) => h(fu(n)), 1), "recognizer:assemble": g((n, e, t, o, r, i) => h(Bo(d(n), e, t, o, r, i)), 6), "recognizer:sections_link": g((n, e, t, o, r) => h(Jo(d(n), e, t, o, r)), 5), "recognizer:sections_comment": g((n, e, t, o) => h($u(d(n), e, t, o)), 4), "recognizer:sections": g((n, e) => h(du(d(n), e)), 2), "recognizer:after_json_marker": g((n, e, t) => h(hu(d(n), e, t)), 3), "recognizer:after_json": g((n, e) => h(gu(d(n), e)), 2), "recognizer:json_split": g((n) => h(mu(n)), 1), "recognizer:parse_body_checked": g((n, e) => h(pu(n, e)), 2), "recognizer:parse_body": g((n) => h(bu(n)), 1), "recognizer:header_after": g((n, e) => h(wu(n, d(e))), 2), "recognizer:count_headers": g((n, e, t) => h(Nu(n, e, I(t))), 3), "recognizer:body_guard": g((n, e) => h(xu(n, e)), 2), "recognizer:body": g((n) => h(yu(n)), 1), "recognizer:count_prefix": g((n, e, t, o) => h(zu(d(n), d(e), I(t), o)), 4), "recognizer:fence_start": g((n) => h(Cu(d(n))), 1), "recognizer:fence_close": g((n, e, t) => h(Go(d(n), d(e), I(t))), 3), "recognizer:comment_state": g((n, e) => h(Su(d(n), e)), 2), "recognizer:mode_comment": g((n) => h(vu(n)), 1), "recognizer:emit": g((n, e, t, o) => h(hn(d(n), e, t, I(o))), 4), "recognizer:plain_comment_mode": g((n) => h(ku(d(n))), 1), "recognizer:raw_context": g((n, e, t, o, r) => h(At(d(n), d(e), t, I(o), r)), 5), "recognizer:quoted_context": g((n, e, t, o, r) => h(Au(d(n), d(e), t, I(o), r)), 5), "recognizer:normal_quote": g((n, e, t, o, r) => h(ju(d(n), d(e), t, I(o), r)), 5), "recognizer:ordered_list": g((n, e, t) => h(Fu(d(n), I(e), t)), 3), "recognizer:list_start": g((n) => h(Eu(d(n))), 1), "recognizer:normal_list": g((n, e, t, o, r) => h(Pu(d(n), d(e), t, I(o), r)), 5), "recognizer:normal_fence": g((n, e, t, o, r) => h(qu(d(n), d(e), t, I(o), r)), 5), "recognizer:normal_open": g((n, e, t, o, r, i) => h(Iu(d(n), d(e), t, I(o), r, i)), 6), "recognizer:normal_frontmatter": g((n, e, t, o, r) => h(Mu(d(n), d(e), t, I(o), r)), 5), "recognizer:remove_bom": g((n) => K(h(Lu(d(n)))), 1), "recognizer:normal": g((n, e, t, o) => h(be(d(n), d(e), t, I(o))), 4), "recognizer:opening_next": g((n, e, t, o, r, i, s) => h(Ou(d(n), d(e), d(t), I(o), r, I(i), s)), 7), "recognizer:candidate_fields": g((n, e, t, o, r, i) => h(Tu(d(n), d(e), I(t), o, I(r), i)), 6), "recognizer:candidate_anchor": g((n, e, t, o, r, i) => h(Bu(d(n), e, I(t), o, I(r), i)), 6), "recognizer:candidate_line": g((n, e, t, o, r, i, s, c, a) => h(Ju(d(n), d(e), d(t), o, I(r), i, s, I(c), a)), 9), "recognizer:fence_line": g((n, e, t, o, r, i, s) => h(Du(d(n), d(e), I(t), o, r, I(i), s)), 7), "recognizer:quoted_fence_close": g((n, e, t) => h(Ru(n, d(e), I(t))), 3), "recognizer:close_kind": g((n, e, t, o) => h(Wu(d(n), d(e), I(t), o)), 4), "recognizer:context_line": g((n, e, t, o, r) => h(vt(d(n), e, t, I(o), r)), 5), "recognizer:list_line": g((n, e, t, o, r, i, s) => h(Uu(d(n), d(e), t, I(o), r, i, s)), 7), "recognizer:after_annotation": g((n, e, t, o, r) => h(Qu(d(n), d(e), t, I(o), r)), 5), "recognizer:step": g((n, e, t, o, r) => h(Hu(n, d(e), d(t), o, I(r))), 5), "recognizer:run": g((n, e) => h(Gu(n, e)), 2), "recognizer:finish": g((n) => h(Ku(n)), 1), "recognizer:scan_lines": g((n) => h(Vu(n)), 1), "recognizer:scan": g((n) => h(Yu(d(n))), 1), "recognizer:part_raw": g((n) => K(h(Xu(n))), 1), "recognizer:render_go": g((n, e) => K(h(Zu(n, d(e)))), 2), "recognizer:render": g((n) => K(h(t2(n))), 1), "recognizer:has_id_go": g((n, e, t) => h(nl(n, d(e), t)), 3), "recognizer:has_id": g((n, e) => h(el(n, d(e))), 2), "recognizer:errors_go": g((n, e) => h(tl(n, e)), 2), "recognizer:errors_pairwise": g((n) => h(o2(n)), 1), "recognizer:seen_chain": g((n) => h(ol(d(n))), 1), "recognizer:seen_meets": g((n, e) => h(rl(n, d(e))), 2), "recognizer:seen_joins": g((n, e) => h(il(n, d(e))), 2), "recognizer:seen_has_go": g((n, e, t) => h(sl(n, d(e), t)), 3), "recognizer:seen_has": g((n, e) => h(cl(n, d(e))), 2), "recognizer:seen_add_go": g((n, e, t) => h(Ko(n, d(e), t)), 3), "recognizer:seen_add": g((n, e) => h(al(n, d(e))), 2), "recognizer:errors_seen": g((n, e, t) => h(ul(n, e, t)), 3), "recognizer:errors": g((n) => h(ll(n)), 1), "recognizer:safe": g((n) => h(_l(n)), 1), "recognizer:without_id_go": g((n, e, t) => K(h(fl(n, d(e), d(t)))), 3), "recognizer:without_id": g((n, e) => K(h($l(n, d(e)))), 2), "recognizer:delete_good": g((n, e) => h(dl(n, d(e))), 2), "recognizer:delete_checked": g((n, e, t, o) => h(hl(d(n), d(e), t, o)), 4), "recognizer:delete": g((n, e) => h(gl(d(n), d(e))), 2), "recognizer:output": g((n) => K(h(ml(n))), 1), "recognizer:duplicate_diagnostic": g((n, e, t, o) => h(pl(d(n), I(e), t, o)), 4), "recognizer:diagnostics_go": g((n, e) => h(bl(n, e)), 2), "recognizer:diagnostics_pairwise": g((n) => h(r2(n)), 1), "recognizer:diagnostics_seen": g((n, e, t) => h(wl(n, e, t)), 3), "recognizer:diagnostics": g((n) => h(i2(n)), 1), "recognizer:lookup": g((n, e) => h(Nl(n, d(e))), 2), "recognizer:replacement_part": g((n, e, t) => K(h(xl(n, d(e), d(t)))), 3), "recognizer:replace_id": g((n, e, t) => K(h(yl(n, d(e), d(t)))), 3), "evidence:word_tail": g((n, e, t, o) => h(Do(n, e, t, o)), 4), "evidence:word": g((n, e, t) => h(zl(I(n), e, t)), 3), "evidence:char_words": g((n, e, t) => h(Cl(n, e, t)), 3), "evidence:char": g((n, e) => h(Sl(d(n), d(e))), 2), "evidence:string_parts": g((n, e) => h(vl(n, e)), 2), "evidence:continue_string": g((n, e, t) => h(kl(n, e, t)), 3), "evidence:string_go": g((n, e, t) => h(Al(d(n), d(e), t)), 3), "evidence:string": g((n, e) => h(c2(d(n), d(e))), 2), "evidence:same_checked": g((n, e) => h(jl(n, e)), 2), "evidence:same": g((n, e) => h(Fl(d(n), d(e))), 2), certify_stable: g((n, e, t, o, r) => h(El(d(n), d(e), d(t), o, r)), 5), certify: g((n, e, t, o) => h(Pl(d(n), d(e), d(t), o)), 4), deleted_proof: g((n, e) => h(ql(n, e)), 2), deleted_same: g((n, e) => h(Il(n, e)), 2), check_deleted: g((n, e, t) => h(Ml(d(n), d(e), t)), 3), check_candidate: g((n, e, t, o, r) => h(Ll(d(n), d(e), d(t), o, r)), 5), create_allowed: g((n, e, t, o) => h(Ol(d(n), d(e), d(t), o)), 4), allowed: g((n, e) => h(Tl(d(n), e)), 2), create: g((n, e, t) => h(Bl(d(n), d(e), d(t))), 3), created: g((n) => h(u2(n)), 1), succeeded: g((n) => h(l2(n)), 1), cycle_result: g((n, e, t) => K(h(Jl(d(n), d(e), t))), 3), cycle: g((n, e, t) => K(h(_2(d(n), d(e), d(t)))), 3), result_source: g((n, e, t) => K(h(f2(d(n), d(e), t))), 3) };
    function d_(n, e = 0) {
      return n[e] === "\uDC00" ? 4 : n.codePointAt(e) > 65535 ? 2 : 1;
    }
    function h_(n) {
      return n.length < 4 ? n.codePointAt(0) : (n.charCodeAt(1) << 22 | n.charCodeAt(2) << 11 | n.charCodeAt(3)) >>> 0;
    }
    function g_(n) {
      return n.replace(/\uDC00[^]{3}/gu, "\uFFFD");
    }
    function Lt(n) {
      return n.replace(/\p{Cs}/gu, "\uFFFD");
    }
    function Vn(n) {
      for (; n !== null && typeof n == "object" && n.$ === "$JMP"; ) n = n.f(n.x);
      return n;
    }
    function Yn(n, e) {
      return (...t) => t.length < e ? Yn((...o) => n(...t, ...o), e - t.length) : Vn(n(...t));
    }
    function m_(n) {
      return n.$ === "TextLine" ? { $: "TextLine" } : { $: "SpaceLine" };
    }
    function p_(n) {
      return n.$ === "TextLine" ? { $: "AfterText" } : { $: "AfterBlank" };
    }
    function b_(n) {
      let e = Ot(n, "	"), t = Ot(n, "\r"), o = Ot(n, " "), r = e || t;
      return { $: "Tuple", fst: Ot(n, `
`), snd: o || r };
    }
    function w_(n, e) {
      return e.fst ? p_(n) : e.snd ? m_(n) : { $: "TextLine" };
    }
    function N_(n, e) {
      return w_(n, Lx(e));
    }
    function x_(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, d_(t));
          n = t.slice(d_(t)), e = Ox(o, r);
          continue;
        }
      }
    }
    function y_(n) {
      return n.$ === "EmptySource" || n.$ === "AfterBlank" ? "" : n.$ === "TextLine" ? `

` : `
`;
    }
    function Ix(n) {
      let e = Bx(Tx(n, { $: "EmptySource" }));
      return n + e;
    }
    function Mx(n, e) {
      let t = h_(n), o = h_(e);
      return t === o;
    }
    var Ot = Mx;
    var Lx = b_;
    var Ox = N_;
    var Tx = x_;
    var Bx = y_;
    var z_ = { space: Yn((n) => Vn(m_(n)), 1), newline: Yn((n) => Vn(p_(n)), 1), classify: Yn((n) => Vn(b_(Lt(n))), 1), step_kind: Yn((n, e) => Vn(w_(n, e)), 2), step: Yn((n, e) => Vn(N_(n, Lt(e))), 2), run: Yn((n, e) => Vn(x_(Lt(n), e)), 2), suffix: Yn((n) => g_(Vn(y_(n))), 1), normalize: Yn((n) => g_(Vn(Ix(Lt(n)))), 1) };
    function C_(n) {
      let e = { $: "WNil" };
      for (let t = 31; t >= 0; t--) e = { $: "WCon", head: (n >>> t & 1) === 1, tail: e };
      return e;
    }
    function Ut(n, e) {
      return { $: n < e ? "LT" : n === e ? "EQ" : "GT" };
    }
    function Z(n) {
      if (n > 281474976710655) throw "bend: a Nat past the largest immediate 2^48-1";
      return n;
    }
    function P(n) {
      if (!Number.isInteger(n) || n < 0 || n > 2 ** 53) throw "bend: expected a Nat host number: an integer from 0 to 2^53";
      return n;
    }
    var Qt = function(e) {
      return e < 55296 || e >= 57344 && e <= 1114111 ? String.fromCodePoint(e) : String.fromCharCode(56320, e >>> 22, e >>> 11 & 2047, e & 2047);
    };
    function z(n, e = 0) {
      return n[e] === "\uDC00" ? 4 : n.codePointAt(e) > 65535 ? 2 : 1;
    }
    function Q(n) {
      return n.length < 4 ? n.codePointAt(0) : (n.charCodeAt(1) << 22 | n.charCodeAt(2) << 11 | n.charCodeAt(3)) >>> 0;
    }
    function S_(n, e) {
      for (let t = 0; t <= n.length; t += z(n, t)) if (n.startsWith(e, t)) return true;
      return false;
    }
    function B(n) {
      return n.replace(/\uDC00[^]{3}/gu, "\uFFFD");
    }
    function u(n) {
      return n.replace(/\p{Cs}/gu, "\uFFFD");
    }
    function Tt(n, e) {
      return { $: "$JMP", f: n.j?.f === n ? n.j : n, x: e };
    }
    function E_(n) {
      let e = (t) => l(n(t));
      return e.j = n, n.f = e, e;
    }
    function l(n) {
      for (; n !== null && typeof n == "object" && n.$ === "$JMP"; ) n = n.f(n.x);
      return n;
    }
    function _(n, e) {
      return (...t) => t.length < e ? _((...o) => n(...t, ...o), e - t.length) : l(n(...t));
    }
    function P_(n) {
      return n.$ === "None" ? "" : n.value + "";
    }
    function q_(n) {
      if (n.$ === "Nil") return "";
      {
        let e = n.head, t = e.body, o = e.ending, r = n.tail, i = Iy(o), s = br(r), c = i + s;
        return t + c;
      }
    }
    function I_(n, e, t) {
      if (n.$ === "Nil") return t ? { $: "Con", head: { $: "Line", body: "", ending: { $: "Some", value: e } }, tail: { $: "Nil" } } : { $: "Con", head: { $: "Line", body: e + "", ending: { $: "None" } }, tail: { $: "Nil" } };
      {
        let o = n.head, r = o.body, i = o.ending, s = n.tail;
        return t ? { $: "Con", head: { $: "Line", body: "", ending: { $: "Some", value: e } }, tail: { $: "Con", head: { $: "Line", body: r, ending: i }, tail: s } } : { $: "Con", head: { $: "Line", body: e + r, ending: i }, tail: s };
      }
    }
    function M_(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, z(t));
          n = t.slice(z(t)), e = My(o, r, On(r, `
`));
          continue;
        }
      }
    }
    function Jx(n) {
      return M_(Ce(n), { $: "Nil" });
    }
    function L_(n, e) {
      if (n === "") return e;
      {
        let t = n.slice(0, z(n)), o = n.slice(z(n));
        return { $: "Con", head: { $: "Line", body: t + o, ending: { $: "None" } }, tail: e };
      }
    }
    function O_(n) {
      if (n !== "") {
        let e = n.slice(0, z(n));
        return Ht(e, `
`);
      } else return false;
    }
    function T_(n, e, t, o) {
      for (; ; ) {
        let r = n, i = e, s = t, c = o;
        if (r === "") return mr(Ly(i, s));
        {
          let a = r.slice(0, z(r)), $ = r.slice(z(r));
          if (c) {
            n = $, e = "", t = { $: "Con", head: { $: "Line", body: i, ending: { $: "Some", value: a } }, tail: s }, o = rr($);
            continue;
          } else {
            let N = a + "";
            n = $, e = i + N, t = s, o = rr($);
            continue;
          }
        }
      }
    }
    function B_(n) {
      return T_(n, "", { $: "Nil" }, rr(n));
    }
    function J_(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, z(t));
          n = t.slice(z(t)), e = On(r, `
`);
          continue;
        }
      }
    }
    function D_(n) {
      if (n !== "") {
        let e = n.slice(0, z(n)), t = Q(e);
        if (t == 13) {
          let o = n.slice(z(n));
          return tt(o);
        } else {
          let o = n.slice(z(n));
          return tt(Qt(t) + o);
        }
      } else return tt(n);
    }
    function R_(n) {
      return D_(Ce(n));
    }
    function W_(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, z(t));
          n = t.slice(z(t)), e = On(r, "\r");
          continue;
        }
      }
    }
    function U_(n, e) {
      return e ? R_(n) : n;
    }
    function ar(n) {
      return U_(n, Oy(n, false));
    }
    function Q_(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t !== "") {
          let r = t.slice(0, z(t)), i = Q(r);
          if (i == 32) {
            let s = t.slice(z(t));
            if (o == 0) return " " + s;
            {
              let c = o - 1;
              n = s, e = c;
              continue;
            }
          } else {
            let s = t.slice(z(t));
            return Qt(i) + s;
          }
        } else return t;
      }
    }
    function H_(n) {
      if (n !== "") {
        let e = n.slice(0, z(n)), t = Q(e);
        if (t == 32) return n.slice(z(n));
        {
          let o = n.slice(z(n));
          return Qt(t) + o;
        }
      } else return n;
    }
    function G_(n) {
      if (n !== "") {
        let e = n.slice(0, z(n));
        if (Q(e) == 62) {
          let o = n.slice(z(n));
          return { $: "Some", value: Rd(o) };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function K_(n) {
      return G_(ae(n, 3));
    }
    function V_(n, e) {
      if (n !== "") {
        let t = n.slice(0, z(n));
        if (Q(t) == 62) {
          let r = n.slice(z(n));
          return { $: "Some", value: se(e, Rd(r), r) };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function Y_(n, e) {
      return V_(ae(n, 3), e);
    }
    function X_(n, e) {
      return pr(Zn(n), e);
    }
    function Z_(n, e, t) {
      return t ? X_(n, e) : false;
    }
    function ur(n, e) {
      return Z_(n, e, Fn(Le(n), e));
    }
    function nf(n, e) {
      return Kt(Zn(n), e);
    }
    function ef(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, z(t));
          n = t.slice(z(t)), e = Wd(r);
          continue;
        }
      }
    }
    function tf(n, e, t) {
      return t ? true : nf(n, e);
    }
    function of(n, e, t) {
      return t ? tf(n, e, ce(Ty(e, false))) : false;
    }
    function rf(n, e) {
      return of(n, e, Fn(Le(n), e));
    }
    function sf(n, e) {
      if (n.$ === "None") return false;
      {
        let t = n.value;
        return ur(t, e);
      }
    }
    function lr(n) {
      if (n !== "") {
        let e = n.slice(0, z(n));
        if (Q(e) == 96) {
          let o = n.slice(z(n));
          if (o !== "") {
            let r = o.slice(0, z(o));
            if (Q(r) == 96) {
              let s = o.slice(z(o));
              if (s !== "") {
                let c = s.slice(0, z(s));
                if (Q(c) == 96) {
                  let $ = s.slice(z(s));
                  return pr(Zn($), "annotation-json");
                } else return false;
              } else return false;
            } else return false;
          } else return false;
        } else return false;
      } else return false;
    }
    function cf(n) {
      if (n.$ === "None") return false;
      {
        let e = n.value;
        return lr(Zn(e));
      }
    }
    function af(n) {
      if (n.$ === "None") return false;
      {
        let e = n.value, t = jn(e, "```annotation-json"), o = jn(e, "``` annotation-json");
        return t || o;
      }
    }
    function uf(n) {
      if (n === "") return true;
      {
        let e = n.slice(0, z(n)), t = n.slice(z(n)), o = Ud(e), r = On(e, "-"), i = By(e);
        return pn(i || (o || r), Qd(t));
      }
    }
    function lf(n) {
      return pn(ce(ot(n)), Qd(n));
    }
    function _f(n, e) {
      return e ? { $: "Some", value: n } : { $: "None" };
    }
    function ff(n) {
      if (n !== "") {
        let e = n.slice(0, z(n));
        if (Q(e) == 94) {
          let o = n.slice(z(n));
          return _f(o, Hd(o));
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function $f(n) {
      return ff(Jy(ae(n, 3)));
    }
    function df(n, e) {
      if (e.$ === "Absent") return { $: "Absent" };
      {
        let t = e.before, o = e.after;
        return { $: "Found", before: { $: "Con", head: n, tail: t }, after: o };
      }
    }
    function hf(n, e, t, o) {
      return o ? { $: "Found", before: { $: "Nil" }, after: e } : df(n, t);
    }
    function gf(n, e, t) {
      if (n.$ === "Nil") return { $: "Absent" };
      {
        let o = n.head, r = n.tail;
        return hf(o, r, rt(r, e, t), se(t, jn(o, e), Xn(o, e)));
      }
    }
    function mf(n, e, t, o) {
      return o ? { $: "Tuple", fst: _n(t), snd: { $: "Some", value: e } } : { $: "Tuple", fst: _n(n), snd: { $: "None" } };
    }
    function pf(n) {
      if (n.$ === "Con") {
        let e = n.head, t = n.tail;
        if (t.$ === "Con") {
          let o = t.head, r = t.tail;
          return mf({ $: "Con", head: e, tail: { $: "Con", head: o, tail: r } }, e, r, Xn(o, "%%TAGS%%"));
        } else return { $: "Tuple", fst: _n({ $: "Con", head: e, tail: t }), snd: { $: "None" } };
      } else return { $: "Tuple", fst: _n(n), snd: { $: "None" } };
    }
    function Dx(n, e) {
      return $y(Zn(n), e);
    }
    function bf(n, e) {
      return Kt(Le(Ce(Le(n))), Ce(e));
    }
    function wf(n) {
      if (n.$ === "Nil") return true;
      {
        let e = n.head, t = n.tail;
        return pn(jn(e, "*"), Dy(Gd({ $: "Con", head: e, tail: t }, `
`), "*"));
      }
    }
    function er(n, e, t, o, r, i) {
      return i ? { $: "Some", value: { $: "Legacy", json: n, display: e, link: t, comment: o, tags: r } } : { $: "None" };
    }
    function tr(n, e, t, o, r) {
      if (r.$ === "Absent") return er(n, e, { $: "None" }, t, o, v_(e));
      {
        let i = r.before, s = r.after;
        return er(n, i, Wy(Ry(e, Kd(i))), t, o, mn(v_(i), Uy(s)));
      }
    }
    function Nf(n, e, t, o) {
      if (o.$ === "Absent") return tr(n, e, { $: "None" }, t, rt(e, "%%LINK%%", true));
      {
        let r = o.before, i = o.after;
        return tr(n, r, { $: "Some", value: i }, t, rt(r, "%%LINK%%", true));
      }
    }
    function xf(n, e) {
      let t = e.fst, o = e.snd;
      return Nf(n, t, o, rt(t, "%%COMMENT%%", false));
    }
    function yf(n, e, t) {
      return t ? xf(n, Qy(_n(e))) : { $: "None" };
    }
    function zf(n, e) {
      if (e.$ === "Con") {
        let t = e.head, o = e.tail;
        return yf(n, o, Xn(t, "%%"));
      } else return { $: "None" };
    }
    function Cf(n) {
      if (n.$ === "Absent") return { $: "None" };
      {
        let e = n.before, t = n.after;
        return zf(Gd(e, `
`), t);
      }
    }
    function Sf(n, e) {
      return e ? Cf(rt(n, "```", false)) : { $: "None" };
    }
    function vf(n) {
      if (n.$ === "Con") {
        let e = n.head, t = n.tail;
        if (t.$ === "Con") {
          let o = t.head, r = t.tail;
          return Sf(r, mn(Rt(e, "%%"), Rt(o, "```annotation-json")));
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function kf(n, e) {
      return n ? lr(Zn(e)) : false;
    }
    function Af(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          n = o.tail, e = Xn(s, "%%"), t = se(Hy(r, s), Z(i + 1), i);
          continue;
        }
      }
    }
    function jf(n, e) {
      return e ? vf(n) : { $: "None" };
    }
    function Ff(n) {
      return jf(n, Ky(Gy(n, false, 0), 1));
    }
    function Ef(n, e, t, o) {
      for (; ; ) {
        let r = n, i = e, s = t, c = o;
        if (r === "") return s;
        {
          let a = r.slice(0, z(r)), $ = r.slice(z(r)), N = mn(c, On(a, i));
          n = $, e = i, t = se(N, Z(s + 1), s), o = N;
          continue;
        }
      }
    }
    function Pf(n) {
      if (n !== "") {
        let e = n.slice(0, z(n)), t = Q(e);
        if (t == 96) {
          let o = n.slice(z(n));
          if (o !== "") {
            let r = o.slice(0, z(o));
            if (Q(r) == 96) {
              let s = o.slice(z(o));
              if (s !== "") {
                let c = s.slice(0, z(s));
                if (Q(c) == 96) {
                  let $ = s.slice(z(s));
                  return { $: "Some", value: { $: "Fence", char: "`", size: ir($, "`", 3, true), quoted: false } };
                } else return { $: "None" };
              } else return { $: "None" };
            } else return { $: "None" };
          } else return { $: "None" };
        } else if (t == 126) {
          let o = n.slice(z(n));
          if (o !== "") {
            let r = o.slice(0, z(o));
            if (Q(r) == 126) {
              let s = o.slice(z(o));
              if (s !== "") {
                let c = s.slice(0, z(s));
                if (Q(c) == 126) {
                  let $ = s.slice(z(s));
                  return { $: "Some", value: { $: "Fence", char: "~", size: ir($, "~", 3, true), quoted: false } };
                } else return { $: "None" };
              } else return { $: "None" };
            } else return { $: "None" };
          } else return { $: "None" };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function _r(n, e, t) {
      let o = ir(n, e, 0, true);
      return pn(Vy(o, t), ot(Zn(Yy(n, o))));
    }
    function qf(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, z(t)), i = t.slice(z(t));
          n = i, e = se(Fn(r + i, "<!--"), true, se(Fn(r + i, "-->"), false, o));
          continue;
        }
      }
    }
    function If(n) {
      return n ? { $: "HtmlComment" } : { $: "Neutral" };
    }
    function gn(n, e, t, o) {
      return { $: "ScanState", mode: e, reversed: { $: "Con", head: { $: "RawPart", raw: n }, tail: t }, line: Z(o + 1) };
    }
    function Mf(n) {
      return Gt(Xn(n, "%%"), { $: "ObsidianComment" }, Yd(Vd(n, false)));
    }
    function Dt(n, e, t, o, r) {
      return r ? { $: "ScanState", mode: { $: "OpaqueHtml" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "unsupported raw HTML context", line: o }, tail: t }, line: Z(o + 1) } : gn(n, Xy(e), t, o);
    }
    function Lf(n, e, t, o, r) {
      if (r.$ === "Some") {
        let i = r.value;
        if (i.$ === "Fence") {
          let s = i.char, c = i.size;
          return gn(n, { $: "Fence", char: s, size: c, quoted: true }, t, o);
        } else return Dt(n, e, t, o, mn(jn(e, "<"), ce(jn(e, "<!--"))));
      } else return Dt(n, e, t, o, mn(jn(e, "<"), ce(jn(e, "<!--"))));
    }
    function Of(n, e, t, o, r) {
      if (r.$ === "None") return Dt(n, e, t, o, mn(jn(e, "<"), ce(jn(e, "<!--"))));
      {
        let i = r.value;
        return Lf(n, i, t, o, wr(i));
      }
    }
    function Tf(n, e, t) {
      if (n !== "") {
        let o = n.slice(0, z(n)), r = n.slice(z(n));
        if (e == 0) return false;
        {
          let i = e - 1, s = o + r, c = Fn(s, ". "), a = Fn(s, ") "), $ = mn(t, c || a), N = mn(Ud(o), Xd(r, i, true));
          return $ || N;
        }
      } else return false;
    }
    function Bf(n) {
      let e = Fn(n, "+ "), t = Fn(n, "* "), o = Fn(n, "- "), r = e || t;
      return Xd(n, 10, false) || (o || r);
    }
    function Jf(n, e, t, o, r) {
      return r ? gn(n, { $: "ListBody" }, t, o) : Of(n, e, t, o, ze(e));
    }
    function Df(n, e, t, o, r) {
      if (r.$ === "Some") {
        let i = r.value;
        return gn(n, i, t, o);
      } else return Jf(n, e, t, o, Zy(ae(e, 3)));
    }
    function Rf(n, e, t, o, r, i) {
      return r ? { $: "ScanState", mode: { $: "Opening", raw: n, line: o }, reversed: t, line: Z(o + 1) } : i ? { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "annotation fence without opening marker", line: o }, tail: t }, line: Z(o + 1) } : Df(n, e, t, o, wr(ae(e, 3)));
    }
    function Wf(n, e, t, o, r) {
      return r ? gn(n, { $: "Frontmatter" }, t, o) : Rf(n, e, t, o, Zd(ze(e), "%%"), nh(ze(e)));
    }
    function Uf(n) {
      if (n !== "") {
        let e = n.slice(0, z(n)), t = Q(e);
        if (t == 65279) return n.slice(z(n));
        {
          let o = n.slice(z(n));
          return Qt(t) + o;
        }
      } else return n;
    }
    function ye(n, e, t, o) {
      return Wf(n, se(k_(o, 0), A_(e), e), t, o, mn(k_(o, 0), Xn(A_(e), "---")));
    }
    function Qf(n, e, t, o, r, i, s) {
      return s ? { $: "ScanState", mode: { $: "Candidate", raw: t + n, reversed: { $: "Con", head: "```annotation-json", tail: { $: "Con", head: "%%", tail: { $: "Nil" } } }, line: o, formatted: jn(t, "> ") }, reversed: r, line: Z(i + 1) } : ye(n, e, { $: "Con", head: { $: "RawPart", raw: t }, tail: r }, i);
    }
    function Hf(n, e, t, o, r, i) {
      if (i.$ === "Some") {
        let s = i.value;
        return { $: "ScanState", mode: { $: "AfterAnnotation" }, reversed: { $: "Con", head: { $: "AnnotationPart", id: e, raw: n, fields: s, line: t }, tail: o }, line: Z(r + 1) };
      } else return { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "malformed or unsupported annotation body", line: t }, tail: o }, line: Z(r + 1) };
    }
    function Gf(n, e, t, o, r, i) {
      if (i.$ === "Some") {
        let s = i.value;
        return Hf(n, s, t, o, r, nz(_n(e)));
      } else return { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "missing or unsupported annotation block ID", line: t }, tail: o }, line: Z(r + 1) };
    }
    function Kf(n, e, t, o, r, i, s, c, a) {
      if (a.$ === "Some") {
        let $ = a.value;
        return { $: "ScanState", mode: { $: "Candidate", raw: t + n, reversed: { $: "Con", head: $, tail: o }, line: r, formatted: i }, reversed: s, line: Z(c + 1) };
      } else return Gf(t + n, o, r, s, c, ez(e));
    }
    function Vf(n, e, t, o, r, i, s) {
      return s ? gn(n, { $: "Neutral" }, r, i) : gn(n, { $: "Fence", char: e, size: t, quoted: o }, r, i);
    }
    function Yf(n, e, t) {
      if (n.$ === "None") return false;
      {
        let o = n.value;
        return _r(ae(o, 3), e, t);
      }
    }
    function Xf(n, e, t, o) {
      return o ? Yf(ze(n), e, t) : _r(ae(n, 3), e, t);
    }
    function Bt(n, e, t, o, r) {
      return r ? gn(n, { $: "Neutral" }, t, o) : gn(n, e, t, o);
    }
    function Zf(n, e, t, o, r, i, s) {
      return r ? gn(n, { $: "ListBody" }, t, o) : i ? s ? { $: "ScanState", mode: { $: "ListBody" }, reversed: { $: "Con", head: { $: "CandidateError", raw: n, message: "nested annotation candidate inside list is unsupported", line: o }, tail: t }, line: Z(o + 1) } : gn(n, { $: "ListBody" }, t, o) : ye(n, e, t, o);
    }
    function n$(n, e, t, o, r) {
      if (t.$ === "Con") {
        let i = t.head;
        if (i.$ === "AnnotationPart") {
          let s = i.id, c = i.raw, a = i.fields, $ = i.line, N = t.tail;
          return r ? { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Con", head: { $: "AnnotationPart", id: s, raw: c + n, fields: a, line: $ }, tail: N }, line: Z(o + 1) } : ye(n, e, { $: "Con", head: { $: "AnnotationPart", id: s, raw: c, fields: a, line: $ }, tail: N }, o);
        } else {
          let s = t.tail;
          return ye(n, e, { $: "Con", head: i, tail: s }, o);
        }
      } else return ye(n, e, t, o);
    }
    function e$(n, e, t, o, r) {
      if (n.$ === "Neutral") return ye(e, t, o, r);
      if (n.$ === "AfterAnnotation") return n$(e, t, o, r, ot(t));
      if (n.$ === "Opening") {
        let i = n.raw, s = n.line;
        return Qf(e, t, i, s, o, r, tz(ze(t)));
      } else if (n.$ === "Candidate") {
        let i = n.raw, s = n.reversed, c = n.line, a = n.formatted;
        return Kf(e, t, i, s, c, a, o, r, oz(t, a));
      } else if (n.$ === "Fence") {
        let i = n.char, s = n.size, c = n.quoted;
        return Vf(e, i, s, c, o, r, rz(t, i, s, c));
      } else {
        if (n.$ === "HtmlComment") return gn(e, Yd(Vd(t, true)), o, r);
        if (n.$ === "ObsidianComment") return Bt(e, { $: "ObsidianComment" }, o, r, Xn(t, "%%"));
        if (n.$ === "Frontmatter") {
          let i = Xn(t, "---"), s = Xn(t, "...");
          return Bt(e, { $: "Frontmatter" }, o, r, i || s);
        } else {
          if (n.$ === "OpaqueHtml") return Bt(e, { $: "OpaqueHtml" }, o, r, ot(Zn(t)));
          {
            let i = Fn(t, " "), s = Fn(t, "	"), c = Zd(ze(t), "%%"), a = nh(ze(t));
            return Zf(e, t, o, r, ot(Zn(t)), i || s, c || a);
          }
        }
      }
    }
    function t$(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head, i = r.body, s = r.ending, c = t.tail, a = o.mode, $ = o.reversed, N = o.line;
          n = c, e = eh(a, br({ $: "Con", head: { $: "Line", body: i, ending: s }, tail: { $: "Nil" } }), iz(i), $, N);
          continue;
        }
      }
    }
    function fr(n) {
      let e = n.mode;
      if (e.$ === "Neutral") {
        let t = n.reversed;
        return { $: "Scan", parts: _n(t), closed: true };
      } else if (e.$ === "AfterAnnotation") {
        let t = n.reversed;
        return { $: "Scan", parts: _n(t), closed: true };
      } else if (e.$ === "ListBody") {
        let t = n.reversed;
        return { $: "Scan", parts: _n(t), closed: true };
      } else if (e.$ === "Opening") {
        let t = e.raw, o = n.reversed;
        return { $: "Scan", parts: _n({ $: "Con", head: { $: "RawPart", raw: t }, tail: o }), closed: true };
      } else if (e.$ === "Candidate") {
        let t = e.raw, o = e.line, r = n.reversed;
        return { $: "Scan", parts: _n({ $: "Con", head: { $: "CandidateError", raw: t, message: "annotation has no closing anchor", line: o }, tail: r }), closed: false };
      } else {
        let t = n.reversed, o = n.line;
        return { $: "Scan", parts: _n({ $: "Con", head: { $: "CandidateError", raw: "", message: "unclosed Markdown context", line: o }, tail: t }), closed: false };
      }
    }
    function o$(n) {
      return fr(th(n, { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Nil" }, line: 0 }));
    }
    function r$(n) {
      return o$(Nr(n));
    }
    function i$(n) {
      return n.$ === "RawPart" || n.$ === "AnnotationPart", n.raw;
    }
    function s$(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head, i = t.tail, s = xr(r);
          n = i, e = o + s;
          continue;
        }
      }
    }
    function Rx(n) {
      return s$(n, "");
    }
    function c$(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          if (s.$ === "AnnotationPart") {
            let c = s.id, a = o.tail, $ = Rt(c, r);
            n = a, e = r, t = i || $;
            continue;
          } else {
            n = o.tail, e = r, t = i;
            continue;
          }
        }
      }
    }
    function a$(n, e) {
      return c$(n, e, false);
    }
    function u$(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head;
          if (r.$ === "CandidateError") {
            n = t.tail, e = true;
            continue;
          } else if (r.$ === "AnnotationPart") {
            let i = r.id, s = t.tail, c = Oe(s, i);
            n = s, e = o || c;
            continue;
          } else {
            n = t.tail, e = o;
            continue;
          }
        }
      }
    }
    function Wx(n) {
      return u$(n, false);
    }
    function l$(n) {
      if (n === "") return { $: "SeenEnd", next: { $: "SeenNone" } };
      {
        let e = n.slice(0, z(n)), t = n.slice(z(n));
        return { $: "SeenChar", char: e, down: oh(t), next: { $: "SeenNone" } };
      }
    }
    function _$(n, e) {
      if (n.$ === "SeenChar") {
        let t = n.char;
        if (e !== "") {
          let o = e.slice(0, z(e));
          return Ht(t, o);
        } else return false;
      } else return false;
    }
    function f$(n, e) {
      if (n.$ === "SeenChar") {
        let t = n.char;
        if (e !== "") {
          let o = e.slice(0, z(e));
          return Ht(o, t);
        } else return false;
      } else return false;
    }
    function $$(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "SeenNone") return false;
        if (o.$ === "SeenEnd") {
          let s = o.next;
          if (r === "") return true;
          {
            let c = r.slice(0, z(r)), a = r.slice(z(r));
            n = s, e = c + a, t = et(s, c + a);
            continue;
          }
        } else {
          let s = o.down, c = o.next;
          if (r === "") {
            n = c, e = "", t = et(c, "");
            continue;
          } else {
            let a = r.slice(0, z(r)), $ = r.slice(z(r));
            if (i) {
              n = s, e = $, t = et(s, $);
              continue;
            } else {
              n = c, e = a + $, t = et(c, a + $);
              continue;
            }
          }
        }
      }
    }
    function d$(n, e) {
      return $$(n, e, et(n, e));
    }
    function $r(n, e, t) {
      if (n.$ === "SeenNone") {
        if (e === "") return { $: "SeenEnd", next: { $: "SeenNone" } };
        {
          let o = e.slice(0, z(e)), r = e.slice(z(e));
          return { $: "SeenChar", char: o, down: oh(r), next: { $: "SeenNone" } };
        }
      } else if (n.$ === "SeenEnd") {
        let o = n.next;
        if (e === "") return { $: "SeenEnd", next: o };
        {
          let r = e.slice(0, z(e)), i = e.slice(z(e));
          return { $: "SeenEnd", next: nr(o, r + i, Jt(o, r + i)) };
        }
      } else {
        let o = n.char, r = n.down, i = n.next;
        if (e === "") return { $: "SeenEnd", next: { $: "SeenChar", char: o, down: r, next: i } };
        {
          let s = e.slice(0, z(e)), c = e.slice(z(e));
          return t ? { $: "SeenChar", char: o, down: nr(r, c, Jt(r, c)), next: i } : { $: "SeenChar", char: o, down: r, next: nr(i, s + c, Jt(i, s + c)) };
        }
      }
    }
    function h$(n, e) {
      return $r(n, e, Jt(n, e));
    }
    function g$(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          if (s.$ === "CandidateError") {
            n = o.tail, e = r, t = true;
            continue;
          } else if (s.$ === "AnnotationPart") {
            let c = s.id, a = o.tail, $ = ih(r, c);
            n = a, e = rh(r, c), t = $ || i;
            continue;
          } else {
            n = o.tail, e = r, t = i;
            continue;
          }
        }
      }
    }
    function m$(n) {
      return g$(_n(n), { $: "SeenNone" }, false);
    }
    function p$(n) {
      let e = n.parts, t = n.closed;
      return pn(t, ce(sh(e)));
    }
    function b$(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head, c = o.tail, a = Oe({ $: "Con", head: s, tail: { $: "Nil" } }, r), $ = se(a, "", xr(s));
          n = c, e = r, t = i + $;
          continue;
        }
      }
    }
    function w$(n, e) {
      return b$(n, e, "");
    }
    function N$(n, e) {
      let t = n.parts;
      return { $: "SourceEdit", source: sz(t, e), error: { $: "None" } };
    }
    function dr(n, e, t, o) {
      return o ? N$(t, e) : { $: "SourceEdit", source: n, error: { $: "Some", value: "unsafe annotation document" } };
    }
    function x$(n, e) {
      let t = ch(n);
      return dr(n, e, t, ah(t));
    }
    function y$(n) {
      return n.source;
    }
    function z$(n, e, t, o) {
      return o ? { $: "Con", head: { $: "Diagnostic", line: e, message: "duplicate annotation ID: " + n }, tail: t } : t;
    }
    function C$(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return mr(o);
        {
          let r = t.head;
          if (r.$ === "CandidateError") {
            let i = r.message, s = r.line;
            n = t.tail, e = { $: "Con", head: { $: "Diagnostic", line: s, message: i }, tail: o };
            continue;
          } else if (r.$ === "AnnotationPart") {
            let i = r.id, s = r.line, c = t.tail;
            n = c, e = uh(i, s, o, Oe(c, i));
            continue;
          } else {
            n = t.tail, e = o;
            continue;
          }
        }
      }
    }
    function Ux(n) {
      return C$(n, { $: "Nil" });
    }
    function S$(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return i;
        {
          let s = o.head;
          if (s.$ === "CandidateError") {
            let c = s.message, a = s.line;
            n = o.tail, e = r, t = { $: "Con", head: { $: "Diagnostic", line: a, message: c }, tail: i };
            continue;
          } else if (s.$ === "AnnotationPart") {
            let c = s.id, a = s.line;
            n = o.tail, e = rh(r, c), t = uh(c, a, i, ih(r, c));
            continue;
          } else {
            n = o.tail, e = r, t = i;
            continue;
          }
        }
      }
    }
    function Qx(n) {
      return S$(_n(n), { $: "SeenNone" }, { $: "Nil" });
    }
    function v$(n, e) {
      if (n.$ === "Nil") return { $: "None" };
      {
        let t = n.head, o = n.tail;
        return Gt(Oe({ $: "Con", head: t, tail: { $: "Nil" } }, e), { $: "Some", value: t }, cz(o, e));
      }
    }
    function k$(n, e, t) {
      let o = Oe({ $: "Con", head: n, tail: { $: "Nil" } }, e);
      return Gt(o, t, xr(n));
    }
    function A$(n, e, t) {
      if (n.$ === "Nil") return "";
      {
        let o = n.head, r = n.tail, i = az(o, e, t), s = uz(r, e, t);
        return i + s;
      }
    }
    function j$(n) {
      return n.$ === "TextLine" ? { $: "TextLine" } : { $: "SpaceLine" };
    }
    function F$(n) {
      return n.$ === "TextLine" ? { $: "AfterText" } : { $: "AfterBlank" };
    }
    function E$(n) {
      let e = On(n, "	"), t = On(n, "\r"), o = On(n, " "), r = e || t;
      return { $: "Tuple", fst: On(n, `
`), snd: o || r };
    }
    function P$(n, e) {
      return e.fst ? F$(n) : e.snd ? j$(n) : { $: "TextLine" };
    }
    function q$(n, e) {
      return P$(n, lz(e));
    }
    function hr(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, z(t));
          n = t.slice(z(t)), e = _z(o, r);
          continue;
        }
      }
    }
    function I$(n) {
      return n.$ === "EmptySource" || n.$ === "AfterBlank" ? "" : n.$ === "TextLine" ? `

` : `
`;
    }
    function M$(n) {
      let e = lh(sr(n, { $: "EmptySource" }));
      return n + e;
    }
    function or(n, e, t, o) {
      if (o.$ === "None") return { $: "None" };
      {
        let r = o.value;
        return { $: "Some", value: Wt(r) };
      }
    }
    function L$(n, e, t) {
      if (n == 0) return { $: "Some", value: null };
      {
        let o = n - 1;
        if (e.head) {
          let i = e.tail;
          if (t.head) {
            let c = t.tail;
            return or(true, i, c, cr(o, i, c));
          } else return { $: "None" };
        } else {
          let i = e.tail;
          if (t.head) return { $: "None" };
          {
            let c = t.tail;
            return or(false, i, c, cr(o, i, c));
          }
        }
      }
    }
    function O$(n, e, t) {
      if (t.$ === "None") return { $: "None" };
      {
        let o = t.value;
        return { $: "Some", value: Wt(o) };
      }
    }
    function T$(n, e) {
      let t = Q(n), o = C_(t), r = Q(e), i = C_(r);
      return O$(o, i, cr(32, o, i));
    }
    function B$(n, e) {
      if (n.$ === "Some") {
        let t = n.value;
        if (e.$ === "Some") {
          let o = e.value;
          return { $: "Some", value: fz(Wt(t), Wt(o)) };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function J$(n, e, t) {
      return Tt(e, $z(n, t));
    }
    function D$(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o === "") return r === "" ? Tt(i, { $: "Some", value: null }) : Tt(i, { $: "None" });
        {
          let s = o.slice(0, z(o)), c = o.slice(z(o));
          if (r !== "") {
            let a = r.slice(0, z(r)), $ = r.slice(z(r));
            n = c, e = $, t = E_(Hx(a, s, i));
            continue;
          } else return Tt(i, { $: "None" });
        }
      }
    }
    function Hx(n, e, t) {
      return (o) => J$(dz(e, n), t, o);
    }
    function Gx(n, e) {
      return D$(n, e, E_(Kx()));
    }
    function Kx() {
      return (n) => n;
    }
    function R$(n, e) {
      return n ? { $: "Some", value: e } : { $: "None" };
    }
    function W$(n, e) {
      return R$(Rt(n, e), null);
    }
    function U$(n, e, t, o, r) {
      if (r.$ === "None") return { $: "CreationRefused", message: "created annotation does not own a complete trailing blank-line separator" };
      {
        let i = r.value;
        return { $: "CreationReady", source: t, proof: o, stable: i };
      }
    }
    function Q$(n, e, t, o) {
      if (o.$ === "None") return { $: "CreationRefused", message: "created annotation did not reparse/delete to the boundary-normalized source" };
      {
        let r = o.value;
        return U$(n, e, t, r, _h(yr(t), t));
      }
    }
    function H$(n, e) {
      return e;
    }
    function G$(n, e) {
      if (e.$ === "None") return { $: "None" };
      {
        let t = e.value;
        return { $: "Some", value: hz(n, t) };
      }
    }
    function K$(n, e, t) {
      return G$(t, _h(e, yr(n)));
    }
    function V$(n, e, t, o, r) {
      let i = o.source;
      return o.error.$ === "Some" ? { $: "CreationRefused", message: "created annotation is malformed, ambiguous, or in an unsafe context" } : Q$(n, e, t, gz(n, i, r));
    }
    function Y$(n, e, t, o) {
      if (o) {
        let i = `
^` + (e + `

`), s = yr(n), c = t + i, a = s + c;
        return V$(n, e, a, fh(a, e), null);
      } else return { $: "CreationRefused", message: "unsafe document, duplicate ID, or invalid ID" };
    }
    function X$(n, e) {
      let t = e.parts, o = e.closed;
      return pn(Hd(n), mn(o, mn(ce(sh(t)), ce(Oe(t, n)))));
    }
    function Z$(n, e, t) {
      return Y$(n, e, t, $h(e, ch(n)));
    }
    function Vx(n) {
      return n.$ === "CreationRefused" ? { $: "None" } : { $: "Some", value: n.source };
    }
    function Yx(n) {
      return n.$ !== "CreationRefused";
    }
    function nd(n, e, t) {
      if (t.$ === "CreationRefused") return n;
      {
        let o = t.source;
        return y$(fh(o, e));
      }
    }
    function Xx(n, e, t) {
      return nd(n, e, mz(n, e, t));
    }
    function Zx(n, e, t) {
      return t.$ === "CreationRefused" ? n : t.source;
    }
    function ed(n, e) {
      if (e.$ === "RawPart") return { $: "RawPart", raw: e.raw };
      if (e.$ === "AnnotationPart") {
        let t = e.id, o = e.raw, r = e.fields, i = e.line;
        return { $: "AnnotationPart", id: t, raw: o, fields: r, line: Z(i + n) };
      } else {
        let t = e.raw, o = e.message, r = e.line;
        return { $: "CandidateError", raw: t, message: o, line: Z(r + n) };
      }
    }
    function td(n, e) {
      if (e.$ === "Nil") return { $: "Nil" };
      {
        let t = e.head, o = e.tail;
        return { $: "Con", head: pz(n, t), tail: dh(n, o) };
      }
    }
    function od(n, e) {
      if (e.$ === "Neutral") return { $: "Neutral" };
      if (e.$ === "AfterAnnotation") return { $: "AfterAnnotation" };
      if (e.$ === "Opening") {
        let t = e.raw, o = e.line;
        return { $: "Opening", raw: t, line: Z(o + n) };
      } else if (e.$ === "Candidate") {
        let t = e.raw, o = e.reversed, r = e.line, i = e.formatted;
        return { $: "Candidate", raw: t, reversed: o, line: Z(r + n), formatted: i };
      } else if (e.$ === "Fence") {
        let t = e.char, o = e.size, r = e.quoted;
        return { $: "Fence", char: t, size: o, quoted: r };
      } else return e.$ === "HtmlComment" ? { $: "HtmlComment" } : e.$ === "ObsidianComment" ? { $: "ObsidianComment" } : e.$ === "Frontmatter" ? { $: "Frontmatter" } : e.$ === "OpaqueHtml" ? { $: "OpaqueHtml" } : { $: "ListBody" };
    }
    function rd(n, e) {
      let t = e.mode, o = e.reversed, r = e.line;
      return { $: "ScanState", mode: bz(n, t), reversed: dh(n, o), line: Z(r + n) };
    }
    function id(n, e) {
      let t = n.mode, o = n.reversed, r = n.line;
      return { $: "ScanState", mode: t, reversed: Vt(o, e), line: r };
    }
    function sd(n, e) {
      return n.$ === "AfterAnnotation" ? e.$ !== "Nil" : true;
    }
    function cd(n) {
      if (n.$ === "Some") {
        let e = n.value;
        return e.$ === "Opening" ? false : e.$ !== "Candidate";
      } else return true;
    }
    function ad(n) {
      if (n.$ === "Nil") return "";
      {
        let t = n.head.body;
        return ar(t);
      }
    }
    function ud(n, e) {
      let t = n.mode, o = n.reversed;
      return n.line == 0 ? false : pn(wz(t, o), Nz(wr(ae(e, 3))));
    }
    function ld(n, e, t, o) {
      for (; ; ) {
        let r = n, i = e, s = t, c = o;
        if (r.$ === "Nil") return { $: "Some", value: c };
        {
          let a = r.head, $ = a.body, N = a.ending, k = r.tail;
          if (s) {
            let O = c.mode, q = c.reversed, M = c.line, V = eh(O, br({ $: "Con", head: { $: "Line", body: $, ending: N }, tail: { $: "Nil" } }), i, q, M), H = hh(k);
            n = k, e = H, t = gh(V, H), o = V;
            continue;
          } else return { $: "None" };
        }
      }
    }
    function _d() {
      return { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Nil" }, line: 1 };
    }
    function fd(n) {
      let e = hh(n);
      return ld(n, e, gh(j_(), e), j_());
    }
    function $d(n) {
      return fd(Nr(n));
    }
    function dd(n, e) {
      return n ? { $: "Some", value: e } : { $: "None" };
    }
    function hd(n) {
      return dd(xz(n, false), null);
    }
    function gd(n) {
      return { $: "First", text: n, state: th(Nr(n), { $: "ScanState", mode: { $: "Neutral" }, reversed: { $: "Nil" }, line: 0 }), proof: null, ends: mh(n) };
    }
    function md(n, e, t) {
      if (e.$ === "None") return { $: "None" };
      {
        let o = e.value;
        return { $: "Some", value: { $: "Later", text: n, state: o, proof: t, ends: mh(n) } };
      }
    }
    function pd(n) {
      return md(n, yz(n), null);
    }
    function bd(n, e, t, o, r) {
      for (; ; ) {
        let i = n, s = e, c = t, a = o, $ = r;
        if (i.$ === "Nil") return { $: "Some", value: { $: "Joined", text: s + c, state: $ } };
        {
          let N = i.head;
          if (N.$ === "Later") {
            let k = N.text, O = N.state, q = N.ends, M = i.tail;
            if (a.$ === "Some") if ($.mode.$ === "Neutral") {
              let H = $.reversed, Rn = $.line;
              if (Rn == 0) return { $: "None" };
              {
                let ee = Rn - 1;
                n = M, e = s + c, t = k, o = q, r = Cz(zz(ee, O), H);
                continue;
              }
            } else return { $: "None" };
            else return { $: "None" };
          } else return { $: "None" };
        }
      }
    }
    function wd(n) {
      if (n.$ === "Con") {
        let e = n.head;
        if (e.$ === "First") {
          let t = e.text, o = e.state, r = e.ends, i = n.tail;
          return bd(i, "", t, r, o);
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function Nd(n) {
      if (n.$ === "None") return { $: "None" };
      {
        let e = n.value, t = e.text, o = e.state;
        return { $: "Some", value: { $: "Assembled", text: t, scan: Sz(o) } };
      }
    }
    function xd(n) {
      return Nd(vz(n));
    }
    function ny(n) {
      return n.text;
    }
    function ey(n) {
      return n.scan;
    }
    function gr(n, e, t) {
      return dr(n, e, t, ah(t));
    }
    function ty(n, e) {
      let t = n.text, o = n.scan;
      return gr(t, e, o);
    }
    function oy(n) {
      return n.original;
    }
    function ry(n) {
      return n.source;
    }
    function yd(n) {
      return n.$ === "First", n.text;
    }
    function zd(n) {
      return n.$ === "First", n.ends.$ !== "None";
    }
    function Cd(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return zd(o);
        {
          let r = t.head;
          n = t.tail, e = r;
          continue;
        }
      }
    }
    function Sd(n) {
      return n !== "";
    }
    function vd(n) {
      return n.$ === "Nil" ? { $: "EmptySource" } : { $: "AfterBlank" };
    }
    function kd(n, e) {
      if (n.$ === "Nil") return true;
      {
        let t = n.head, o = n.tail;
        return pn(kz(o, t), Az(e));
      }
    }
    function Ad(n, e) {
      return hr(e, jz(n));
    }
    function jd(n) {
      return n.$ === "EmptySource" ? true : n.$ === "AfterBlank";
    }
    function Fd(n, e) {
      let o = `
^` + (e + `

`);
      return n + o;
    }
    function Ed(n, e) {
      return n.$ === "Nil" ? { $: "Some", value: Fz(e) } : pd(e);
    }
    function Pd(n, e) {
      return pn(S_(n, e), S_(e, n));
    }
    function qd(n, e, t) {
      return t ? { $: "Some", value: { $: "Created", original: n, source: e } } : { $: "None" };
    }
    function Id(n, e, t, o) {
      let r = o.source;
      return o.error.$ === "Some" ? { $: "None" } : qd(n, e, Ez(r, t));
    }
    function Md(n, e, t, o) {
      if (o.$ === "None") return { $: "None" };
      {
        let r = o.value, i = r.text, s = r.scan;
        return Id(e, i, t, Pz(i, n, s));
      }
    }
    function Ld(n, e, t, o, r, i) {
      if (r.$ === "Some") {
        let s = r.value;
        return i ? Md(e, t, o, ph(Vt(n, { $: "Con", head: s, tail: { $: "Nil" } }))) : { $: "None" };
      } else return { $: "None" };
    }
    function Od(n, e, t, o, r, i) {
      if (i) {
        let s = lh(F_(n, e)), c = qz(o, t), a = e + s;
        return Ld(n, t, r, r + s, Iz(n, a + c), Mz(sr(c, sr(s, F_(n, e)))));
      } else return { $: "None" };
    }
    function Td(n, e, t, o, r) {
      if (r.$ === "None") return { $: "None" };
      {
        let i = r.value, s = i.text, c = i.scan;
        return Od(n, e, t, o, s, mn($h(t, c), Lz(n, e)));
      }
    }
    function iy(n, e, t, o) {
      return Td(n, Oz(e), t, o, ph(Vt(n, { $: "Con", head: e, tail: { $: "Nil" } })));
    }
    function Ht(n, e) {
      let t = Q(n), o = Q(e);
      return t === o;
    }
    function tt(n) {
      return Sy(n, "");
    }
    function mr(n) {
      return vy(n, { $: "Nil" });
    }
    function Gt(n, e, t) {
      return n ? e : t;
    }
    function pr(n, e) {
      return Jd(Tz(n, e));
    }
    function sy(n) {
      return Bd(Le(n));
    }
    function Kt(n, e) {
      return Ay(e, n);
    }
    function cy(n, e, t) {
      let o = 0;
      for (; ; ) switch (o) {
        case 0: {
          let r = n;
          if (r === "") return "";
          {
            let i = r.slice(0, z(r));
            n = r.slice(z(r)), e = i, t = Wd(i), o = 1;
            continue;
          }
        }
        case 1: {
          let r = n, i = e;
          if (t) {
            n = r, o = 0;
            continue;
          } else return i + r;
        }
      }
    }
    function ay(n) {
      let e = Q(n), t = e === 32, o = mn(e >= 9, e <= 13);
      return t || o;
    }
    function uy(n) {
      return !n;
    }
    function pn(n, e) {
      return n ? e : false;
    }
    function ly(n) {
      let e = Bz(n), t = Jz(n);
      return e || t;
    }
    function _y(n) {
      let e = Q(n);
      return pn(e >= 48, e <= 57);
    }
    function fy(n) {
      return n === "";
    }
    function Bd(n) {
      return tt(Le(Ce(n)));
    }
    function $y(n, e) {
      return Kt(Ce(n), Ce(e));
    }
    function dy(n, e) {
      if (n.$ === "Nil") return "";
      {
        let t = n.head, o = n.tail;
        return Dd(o, t, e);
      }
    }
    function hy(n) {
      return n.$ === "Nil" ? { $: "None" } : { $: "Some", value: n.head };
    }
    function gy(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return { $: "Nil" };
        {
          let r = t.head, i = t.tail;
          if (o == 0) return { $: "Con", head: r, tail: i };
          {
            let s = o - 1;
            n = i, e = s;
            continue;
          }
        }
      }
    }
    function my(n) {
      if (n.$ === "Nil") return 0;
      {
        let e = n.tail;
        return Z(Kd(e) + 1);
      }
    }
    function py(n) {
      return n.$ === "Nil";
    }
    function by(n, e) {
      return Ey(Ut(n, e));
    }
    function wy(n, e) {
      return Py(Ut(n, e));
    }
    function Ny(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return "";
        {
          let r = t.slice(0, z(t)), i = t.slice(z(t));
          if (o == 0) return r + i;
          {
            let s = o - 1;
            n = i, e = s;
            continue;
          }
        }
      }
    }
    function xy(n, e) {
      return Jd(Ut(n, e));
    }
    function yy(n) {
      return null;
    }
    function zy(n, e) {
      return n;
    }
    function Cy(n, e) {
      if (n.$ === "Nil") return e;
      {
        let t = n.head, o = n.tail;
        return { $: "Con", head: t, tail: Vt(o, e) };
      }
    }
    function Sy(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, z(t));
          n = t.slice(z(t)), e = r + o;
          continue;
        }
      }
    }
    function vy(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t.$ === "Nil") return o;
        {
          let r = t.head;
          n = t.tail, e = { $: "Con", head: r, tail: o };
          continue;
        }
      }
    }
    function Jd(n) {
      return n.$ === "EQ";
    }
    function ky(n, e) {
      return qy(n, e, { $: "EQ" });
    }
    function Ay(n, e, t) {
      let o = 0;
      for (; ; ) switch (o) {
        case 0: {
          let r = n, i = e;
          if (r === "") return true;
          {
            let s = r.slice(0, z(r)), c = r.slice(z(r));
            if (i === "") return false;
            {
              let a = i.slice(0, z(i)), $ = i.slice(z(i));
              n = c, e = $, t = On(a, s), o = 1;
              continue;
            }
          }
        }
        case 1: {
          let r = n, i = e;
          if (t) {
            n = r, e = i, o = 0;
            continue;
          } else return false;
        }
      }
    }
    function jy(n) {
      let e = Q(n);
      return pn(e >= 65, e <= 90);
    }
    function Fy(n) {
      let e = Q(n);
      return pn(e >= 97, e <= 122);
    }
    function Dd(n, e, t) {
      if (n.$ === "Nil") return e;
      {
        let o = n.head, r = n.tail, i = Dz(r, o, t), s = t + i;
        return e + s;
      }
    }
    function Ey(n) {
      return n.$ !== "GT";
    }
    function Py(n) {
      return n.$ !== "LT";
    }
    function qy(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o === "") return r !== "" && i.$ === "EQ" ? { $: "LT" } : i;
        {
          let s = o.slice(0, z(o)), c = Q(s), a = o.slice(z(o));
          if (r === "") return i.$ === "EQ" ? { $: "GT" } : i;
          {
            let $ = r.slice(0, z(r)), N = Q($), k = r.slice(z(r));
            if (i.$ === "EQ") {
              n = a, e = k, t = Ut(c, N);
              continue;
            } else return i;
          }
        }
      }
    }
    var Iy = P_;
    var br = q_;
    var On = Ht;
    var My = I_;
    var Ce = tt;
    var Ly = L_;
    var rr = O_;
    var Oy = W_;
    var Rd = H_;
    var ae = Q_;
    var se = Gt;
    var Zn = sy;
    var Le = cy;
    var Fn = Kt;
    var Wd = ay;
    var Ty = ef;
    var ce = uy;
    var jn = rf;
    var By = ly;
    var Ud = _y;
    var Qd = uf;
    var ot = fy;
    var Hd = lf;
    var Jy = Bd;
    var rt = gf;
    var Xn = ur;
    var _n = mr;
    var Gd = dy;
    var Dy = bf;
    var v_ = wf;
    var Kd = my;
    var Ry = gy;
    var Wy = hy;
    var Uy = py;
    var mn = pn;
    var Qy = pf;
    var Rt = pr;
    var Hy = kf;
    var Gy = Af;
    var Ky = by;
    var ir = Ef;
    var Vy = wy;
    var Yy = Ny;
    var Vd = qf;
    var Yd = If;
    var Xy = Mf;
    var wr = Pf;
    var Xd = Tf;
    var ze = K_;
    var Zy = Bf;
    var Zd = sf;
    var nh = af;
    var k_ = xy;
    var A_ = Uf;
    var nz = Ff;
    var ez = $f;
    var tz = cf;
    var oz = Y_;
    var rz = Xf;
    var iz = ar;
    var eh = e$;
    var th = t$;
    var Nr = B_;
    var xr = i$;
    var Oe = a$;
    var oh = l$;
    var et = _$;
    var Jt = f$;
    var nr = $r;
    var rh = h$;
    var ih = d$;
    var sh = m$;
    var sz = w$;
    var ch = r$;
    var ah = p$;
    var uh = z$;
    var cz = v$;
    var az = k$;
    var uz = A$;
    var lz = E$;
    var _z = q$;
    var sr = hr;
    var lh = I$;
    var Wt = yy;
    var cr = L$;
    var fz = zy;
    var $z = B$;
    var dz = T$;
    var yr = M$;
    var _h = W$;
    var hz = H$;
    var gz = K$;
    var fh = x$;
    var $h = X$;
    var mz = Z$;
    var pz = ed;
    var dh = td;
    var bz = od;
    var Vt = Cy;
    var wz = sd;
    var Nz = cd;
    var hh = ad;
    var gh = ud;
    var j_ = _d;
    var xz = J_;
    var mh = hd;
    var yz = $d;
    var zz = rd;
    var Cz = id;
    var Sz = fr;
    var vz = wd;
    var kz = Cd;
    var Az = Sd;
    var jz = vd;
    var Fz = gd;
    var Ez = Pd;
    var Pz = gr;
    var ph = xd;
    var F_ = Ad;
    var qz = Fd;
    var Iz = Ed;
    var Mz = jd;
    var Lz = kd;
    var Oz = yd;
    var Tz = ky;
    var Bz = jy;
    var Jz = Fy;
    var Dz = Dd;
    var Se = { "document:ending_text": _((n) => B(l(P_(n))), 1), "document:encode": _((n) => B(l(q_(n))), 1), "document:push": _((n, e, t) => l(I_(n, u(e), t)), 3), "document:decode_go": _((n, e) => l(M_(u(n), e)), 2), "document:decode_exact": _((n) => l(Jx(u(n))), 1), "document:lines_end": _((n, e) => l(L_(u(n), e)), 2), "document:head_newline": _((n) => l(O_(u(n))), 1), "document:lines_go": _((n, e, t, o) => l(T_(u(n), u(e), t, o)), 4), "document:decode": _((n) => l(B_(u(n))), 1), "document:ends_nl": _((n, e) => l(J_(u(n), e)), 2), "recognizer:clean_reverse": _((n) => B(l(D_(u(n)))), 1), "recognizer:clean_exact": _((n) => B(l(R_(u(n)))), 1), "recognizer:ends_cr": _((n, e) => l(W_(u(n), e)), 2), "recognizer:clean_checked": _((n, e) => B(l(U_(u(n), e))), 2), "recognizer:clean": _((n) => B(l(ar(u(n)))), 1), "recognizer:indent": _((n, e) => B(l(Q_(u(n), P(e)))), 2), "recognizer:optional_space": _((n) => B(l(H_(u(n)))), 1), "recognizer:unquote_prefix": _((n) => l(G_(u(n))), 1), "recognizer:unquote": _((n) => l(K_(u(n))), 1), "recognizer:unquote_style_prefix": _((n, e) => l(V_(u(n), e)), 2), "recognizer:unquote_style": _((n, e) => l(Y_(u(n), e)), 2), "recognizer:is_marker_exact": _((n, e) => l(X_(u(n), u(e))), 2), "recognizer:is_marker_checked": _((n, e, t) => l(Z_(u(n), u(e), t)), 3), "recognizer:is_marker": _((n, e) => l(ur(u(n), u(e))), 2), "recognizer:starts_trimmed_exact": _((n, e) => l(nf(u(n), u(e))), 2), "recognizer:ends_blank": _((n, e) => l(ef(u(n), e)), 2), "recognizer:starts_trimmed_tight": _((n, e, t) => l(tf(u(n), u(e), t)), 3), "recognizer:starts_trimmed_checked": _((n, e, t) => l(of(u(n), u(e), t)), 3), "recognizer:starts_trimmed": _((n, e) => l(rf(u(n), u(e))), 2), "recognizer:quoted_marker": _((n, e) => l(sf(n, u(e))), 2), "recognizer:header_text": _((n) => l(lr(u(n))), 1), "recognizer:header": _((n) => l(cf(n)), 1), "recognizer:quoted_header": _((n) => l(af(n)), 1), "recognizer:identifier_chars": _((n) => l(uf(u(n))), 1), "recognizer:identifier_nonempty": _((n) => l(lf(u(n))), 1), "recognizer:checked_identifier": _((n, e) => l(_f(u(n), e)), 2), "recognizer:anchor_text": _((n) => l(ff(u(n))), 1), "recognizer:anchor": _((n) => l($f(u(n))), 1), "recognizer:split_prepend": _((n, e) => l(df(u(n), e)), 2), "recognizer:split_choose": _((n, e, t, o) => l(hf(u(n), e, t, o)), 4), "recognizer:split": _((n, e, t) => l(gf(n, u(e), t)), 3), "recognizer:tags_choose": _((n, e, t, o) => l(mf(n, u(e), t, o)), 4), "recognizer:tags_suffix": _((n) => l(pf(n)), 1), "recognizer:ends_trimmed_exact": _((n, e) => l(Dx(u(n), u(e))), 2), "recognizer:ends_trimmed": _((n, e) => l(bf(u(n), u(e))), 2), "recognizer:display_valid": _((n) => l(wf(n)), 1), "recognizer:assemble": _((n, e, t, o, r, i) => l(er(u(n), e, t, o, r, i)), 6), "recognizer:sections_link": _((n, e, t, o, r) => l(tr(u(n), e, t, o, r)), 5), "recognizer:sections_comment": _((n, e, t, o) => l(Nf(u(n), e, t, o)), 4), "recognizer:sections": _((n, e) => l(xf(u(n), e)), 2), "recognizer:after_json_marker": _((n, e, t) => l(yf(u(n), e, t)), 3), "recognizer:after_json": _((n, e) => l(zf(u(n), e)), 2), "recognizer:json_split": _((n) => l(Cf(n)), 1), "recognizer:parse_body_checked": _((n, e) => l(Sf(n, e)), 2), "recognizer:parse_body": _((n) => l(vf(n)), 1), "recognizer:header_after": _((n, e) => l(kf(n, u(e))), 2), "recognizer:count_headers": _((n, e, t) => l(Af(n, e, P(t))), 3), "recognizer:body_guard": _((n, e) => l(jf(n, e)), 2), "recognizer:body": _((n) => l(Ff(n)), 1), "recognizer:count_prefix": _((n, e, t, o) => l(Ef(u(n), u(e), P(t), o)), 4), "recognizer:fence_start": _((n) => l(Pf(u(n))), 1), "recognizer:fence_close": _((n, e, t) => l(_r(u(n), u(e), P(t))), 3), "recognizer:comment_state": _((n, e) => l(qf(u(n), e)), 2), "recognizer:mode_comment": _((n) => l(If(n)), 1), "recognizer:emit": _((n, e, t, o) => l(gn(u(n), e, t, P(o))), 4), "recognizer:plain_comment_mode": _((n) => l(Mf(u(n))), 1), "recognizer:raw_context": _((n, e, t, o, r) => l(Dt(u(n), u(e), t, P(o), r)), 5), "recognizer:quoted_context": _((n, e, t, o, r) => l(Lf(u(n), u(e), t, P(o), r)), 5), "recognizer:normal_quote": _((n, e, t, o, r) => l(Of(u(n), u(e), t, P(o), r)), 5), "recognizer:ordered_list": _((n, e, t) => l(Tf(u(n), P(e), t)), 3), "recognizer:list_start": _((n) => l(Bf(u(n))), 1), "recognizer:normal_list": _((n, e, t, o, r) => l(Jf(u(n), u(e), t, P(o), r)), 5), "recognizer:normal_fence": _((n, e, t, o, r) => l(Df(u(n), u(e), t, P(o), r)), 5), "recognizer:normal_open": _((n, e, t, o, r, i) => l(Rf(u(n), u(e), t, P(o), r, i)), 6), "recognizer:normal_frontmatter": _((n, e, t, o, r) => l(Wf(u(n), u(e), t, P(o), r)), 5), "recognizer:remove_bom": _((n) => B(l(Uf(u(n)))), 1), "recognizer:normal": _((n, e, t, o) => l(ye(u(n), u(e), t, P(o))), 4), "recognizer:opening_next": _((n, e, t, o, r, i, s) => l(Qf(u(n), u(e), u(t), P(o), r, P(i), s)), 7), "recognizer:candidate_fields": _((n, e, t, o, r, i) => l(Hf(u(n), u(e), P(t), o, P(r), i)), 6), "recognizer:candidate_anchor": _((n, e, t, o, r, i) => l(Gf(u(n), e, P(t), o, P(r), i)), 6), "recognizer:candidate_line": _((n, e, t, o, r, i, s, c, a) => l(Kf(u(n), u(e), u(t), o, P(r), i, s, P(c), a)), 9), "recognizer:fence_line": _((n, e, t, o, r, i, s) => l(Vf(u(n), u(e), P(t), o, r, P(i), s)), 7), "recognizer:quoted_fence_close": _((n, e, t) => l(Yf(n, u(e), P(t))), 3), "recognizer:close_kind": _((n, e, t, o) => l(Xf(u(n), u(e), P(t), o)), 4), "recognizer:context_line": _((n, e, t, o, r) => l(Bt(u(n), e, t, P(o), r)), 5), "recognizer:list_line": _((n, e, t, o, r, i, s) => l(Zf(u(n), u(e), t, P(o), r, i, s)), 7), "recognizer:after_annotation": _((n, e, t, o, r) => l(n$(u(n), u(e), t, P(o), r)), 5), "recognizer:step": _((n, e, t, o, r) => l(e$(n, u(e), u(t), o, P(r))), 5), "recognizer:run": _((n, e) => l(t$(n, e)), 2), "recognizer:finish": _((n) => l(fr(n)), 1), "recognizer:scan_lines": _((n) => l(o$(n)), 1), "recognizer:scan": _((n) => l(r$(u(n))), 1), "recognizer:part_raw": _((n) => B(l(i$(n))), 1), "recognizer:render_go": _((n, e) => B(l(s$(n, u(e)))), 2), "recognizer:render": _((n) => B(l(Rx(n))), 1), "recognizer:has_id_go": _((n, e, t) => l(c$(n, u(e), t)), 3), "recognizer:has_id": _((n, e) => l(a$(n, u(e))), 2), "recognizer:errors_go": _((n, e) => l(u$(n, e)), 2), "recognizer:errors_pairwise": _((n) => l(Wx(n)), 1), "recognizer:seen_chain": _((n) => l(l$(u(n))), 1), "recognizer:seen_meets": _((n, e) => l(_$(n, u(e))), 2), "recognizer:seen_joins": _((n, e) => l(f$(n, u(e))), 2), "recognizer:seen_has_go": _((n, e, t) => l($$(n, u(e), t)), 3), "recognizer:seen_has": _((n, e) => l(d$(n, u(e))), 2), "recognizer:seen_add_go": _((n, e, t) => l($r(n, u(e), t)), 3), "recognizer:seen_add": _((n, e) => l(h$(n, u(e))), 2), "recognizer:errors_seen": _((n, e, t) => l(g$(n, e, t)), 3), "recognizer:errors": _((n) => l(m$(n)), 1), "recognizer:safe": _((n) => l(p$(n)), 1), "recognizer:without_id_go": _((n, e, t) => B(l(b$(n, u(e), u(t)))), 3), "recognizer:without_id": _((n, e) => B(l(w$(n, u(e)))), 2), "recognizer:delete_good": _((n, e) => l(N$(n, u(e))), 2), "recognizer:delete_checked": _((n, e, t, o) => l(dr(u(n), u(e), t, o)), 4), "recognizer:delete": _((n, e) => l(x$(u(n), u(e))), 2), "recognizer:output": _((n) => B(l(y$(n))), 1), "recognizer:duplicate_diagnostic": _((n, e, t, o) => l(z$(u(n), P(e), t, o)), 4), "recognizer:diagnostics_go": _((n, e) => l(C$(n, e)), 2), "recognizer:diagnostics_pairwise": _((n) => l(Ux(n)), 1), "recognizer:diagnostics_seen": _((n, e, t) => l(S$(n, e, t)), 3), "recognizer:diagnostics": _((n) => l(Qx(n)), 1), "recognizer:lookup": _((n, e) => l(v$(n, u(e))), 2), "recognizer:replacement_part": _((n, e, t) => B(l(k$(n, u(e), u(t)))), 3), "recognizer:replace_id": _((n, e, t) => B(l(A$(n, u(e), u(t)))), 3), "boundary:space": _((n) => l(j$(n)), 1), "boundary:newline": _((n) => l(F$(n)), 1), "boundary:classify": _((n) => l(E$(u(n))), 1), "boundary:step_kind": _((n, e) => l(P$(n, e)), 2), "boundary:step": _((n, e) => l(q$(n, u(e))), 2), "boundary:run": _((n, e) => l(hr(u(n), e)), 2), "boundary:suffix": _((n) => B(l(I$(n))), 1), "boundary:normalize": _((n) => B(l(M$(u(n)))), 1), "evidence:word_tail": _((n, e, t, o) => l(or(n, e, t, o)), 4), "evidence:word": _((n, e, t) => l(L$(P(n), e, t)), 3), "evidence:char_words": _((n, e, t) => l(O$(n, e, t)), 3), "evidence:char": _((n, e) => l(T$(u(n), u(e))), 2), "evidence:string_parts": _((n, e) => l(B$(n, e)), 2), "evidence:continue_string": _((n, e, t) => l(J$(n, e, t)), 3), "evidence:string_go": _((n, e, t) => l(D$(u(n), u(e), t)), 3), "evidence:string": _((n, e) => l(Gx(u(n), u(e))), 2), "evidence:same_checked": _((n, e) => l(R$(n, e)), 2), "evidence:same": _((n, e) => l(W$(u(n), u(e))), 2), "source-crud:certify_stable": _((n, e, t, o, r) => l(U$(u(n), u(e), u(t), o, r)), 5), "source-crud:certify": _((n, e, t, o) => l(Q$(u(n), u(e), u(t), o)), 4), "source-crud:deleted_proof": _((n, e) => l(H$(n, e)), 2), "source-crud:deleted_same": _((n, e) => l(G$(n, e)), 2), "source-crud:check_deleted": _((n, e, t) => l(K$(u(n), u(e), t)), 3), "source-crud:check_candidate": _((n, e, t, o, r) => l(V$(u(n), u(e), u(t), o, r)), 5), "source-crud:create_allowed": _((n, e, t, o) => l(Y$(u(n), u(e), u(t), o)), 4), "source-crud:allowed": _((n, e) => l(X$(u(n), e)), 2), "source-crud:create": _((n, e, t) => l(Z$(u(n), u(e), u(t))), 3), "source-crud:created": _((n) => l(Vx(n)), 1), "source-crud:succeeded": _((n) => l(Yx(n)), 1), "source-crud:cycle_result": _((n, e, t) => B(l(nd(u(n), u(e), t))), 3), "source-crud:cycle": _((n, e, t) => B(l(Xx(u(n), u(e), u(t)))), 3), "source-crud:result_source": _((n, e, t) => B(l(Zx(u(n), u(e), t))), 3), move_part: _((n, e) => l(ed(P(n), e)), 2), move_parts: _((n, e) => l(td(P(n), e)), 2), move_mode: _((n, e) => l(od(P(n), e)), 2), move_state: _((n, e) => l(rd(P(n), e)), 2), onto: _((n, e) => l(id(n, e)), 2), settled: _((n, e) => l(sd(n, e)), 2), fence_plain: _((n) => l(cd(n)), 1), head_text: _((n) => B(l(ad(n))), 1), ready: _((n, e) => l(ud(n, u(e))), 2), checked: _((n, e, t, o) => l(ld(n, u(e), t, o)), 4), later_start: _(() => l(_d()), 0), scan_lines_later: _((n) => l(fd(n)), 1), scan_later: _((n) => l($d(u(n))), 1), ends_checked: _((n, e) => l(dd(n, e)), 2), ends_evidence: _((n) => l(hd(u(n))), 1), opening: _((n) => l(gd(u(n))), 1), following_checked: _((n, e, t) => l(md(u(n), e, t)), 3), following: _((n) => l(pd(u(n))), 1), extend: _((n, e, t, o, r) => l(bd(n, u(e), u(t), o, r)), 5), join: _((n) => l(wd(n)), 1), assembled: _((n) => l(Nd(n)), 1), assemble: _((n) => l(xd(n)), 1), assembled_text: _((n) => B(l(ny(n))), 1), assembled_scan: _((n) => l(ey(n)), 1), delete_scanned: _((n, e, t) => l(gr(u(n), u(e), t)), 3), delete: _((n, e) => l(ty(n, u(e))), 2), created_original: _((n) => B(l(oy(n))), 1), created_source: _((n) => B(l(ry(n))), 1), segment_text: _((n) => B(l(yd(n))), 1), segment_ended: _((n) => l(zd(n)), 1), ends_last: _((n, e) => l(Cd(n, e)), 2), nonempty: _((n) => l(Sd(u(n))), 1), end_start: _((n) => l(vd(n)), 1), end_known: _((n, e) => l(kd(n, u(e))), 2), end_state: _((n, e) => l(Ad(n, u(e))), 2), ended: _((n) => l(jd(n)), 1), anchor_tail: _((n, e) => B(l(Fd(u(n), u(e)))), 2), place: _((n, e) => l(Ed(n, u(e))), 2), same_text: _((n, e) => l(Pd(u(n), u(e))), 2), create_checked: _((n, e, t) => l(qd(u(n), u(e), t)), 3), create_deleted: _((n, e, t, o) => l(Id(u(n), u(e), u(t), o)), 4), create_scanned: _((n, e, t, o) => l(Md(u(n), u(e), u(t), o)), 4), create_placed: _((n, e, t, o, r, i) => l(Ld(n, u(e), u(t), u(o), r, i)), 6), create_allowed: _((n, e, t, o, r, i) => l(Od(n, u(e), u(t), u(o), u(r), i)), 6), create_from: _((n, e, t, o, r) => l(Td(n, u(e), u(t), u(o), r)), 5), create: _((n, e, t, o) => l(iy(n, e, u(t), u(o))), 4) };
    function En(n) {
      return n.reduceRight((e, t) => ({ $: "Con", head: t, tail: e }), { $: "Nil" });
    }
    function Tn(n) {
      let e = [];
      for (; n.$ === "Con"; n = n.tail) e.push(n.head);
      if (n.$ !== "Nil") throw new Error("Invalid Bend list");
      return e;
    }
    function zh(n, e) {
      let t = JSON.parse(n);
      if (!t || Array.isArray(t) || typeof t != "object") throw new Error("Annotation JSON must be an object");
      if ("id" in t && t.id !== e) throw new Error(`JSON ID disagrees with block ID ${e}`);
      return t;
    }
    var it = [];
    var Ch = /* @__PURE__ */ new WeakMap();
    var Xt = /* @__PURE__ */ new WeakMap();
    var bh = /* @__PURE__ */ new WeakMap();
    var ne = { whole: 0, windowed: 0, operated: 0, windows: true, operations: true };
    function Te(n) {
      let e = [n];
      for (; e.length; ) {
        let t = e.pop();
        if (!(!t || typeof t != "object" || Object.isFrozen(t))) {
          Object.freeze(t);
          for (let o of Object.keys(t)) e.push(t[o]);
        }
      }
      return n;
    }
    function zr(n) {
      for (let t of it) if (t.source === n) return t.result;
      let e = ne.windows ? Hz(n) : null;
      return ne[e ? "windowed" : "whole"]++, !e && ne.windows && (e = Fh(n, jh(kh(n), true, false))), e || (e = Rz(n)), it.unshift({ source: n, result: e }), it.length > 3 && it.pop(), e;
    }
    function Rz(n) {
      let e = oe.scan(n), t = Tn(oe.diagnostics(e.parts)).map((o) => ({ line: Number(o.line) + 1, message: o.message }));
      return Sh(n, Tn(e.parts), e, t, oe.safe(e));
    }
    function Wz(n, e, t) {
      let o = n.fields, r = zh(o.json, n.id), i = o.comment.$ === "Some" ? Tn(o.comment.value) : typeof r.text == "string" ? r.text.split(`
`) : [], s = { $: "Block", json: o.json, display: Tn(o.display).join(`
`) || "*%%HIGHLIGHT%%*", link: o.link.$ === "Some" ? o.link.value : `%%LINK%%[[#^${n.id}|show annotation]]`, comment: En(i), tags: o.tags.$ === "Some" ? o.tags.value : (r.tags || []).map((c) => `#${c}`).join(", ") };
      return Te({ id: n.id, syntax: s, json: r, raw: n.raw, segmentIndex: t, start: e, end: e + n.raw.length, eol: n.raw.match(/\r?\n/)?.[0] || `
`, ending: n.raw.slice(n.raw.lastIndexOf(`^${n.id}`) + n.id.length + 1), presence: { link: o.link.$ === "Some", comment: o.comment.$ === "Some", tags: o.tags.$ === "Some" }, fields: o });
    }
    function Sh(n, e, t, o, r) {
      let i = [], s = [], c = [], a = 0;
      for (let k of e) {
        let O = a;
        if (c.push(O), a += k.raw.length, k.$ !== "AnnotationPart") {
          i.push({ $: "Raw", text: k.raw });
          continue;
        }
        try {
          let q = bh.get(k.fields), M = i.length, V = !q || q.raw !== k.raw || q.id !== k.id ? Wz(k, O, M) : q.start === O && q.segmentIndex === M ? q : Object.freeze({ ...q, start: O, end: a, segmentIndex: M });
          bh.set(k.fields, V), i.push({ $: "Annotation", id: k.id, lines: En([k.raw]) }), s.push(V);
        } catch (q) {
          o.push({ line: Number(k.line) + 1, message: `Invalid annotation ${k.id}: ${q.message}` }), i.push({ $: "Raw", text: k.raw }), r = false;
        }
      }
      let $, N = Object.freeze({ get tree() {
        return $ ??= Te(Si.decode(n));
      }, segments: Te(En(i)), blocks: Object.freeze(s), diagnostics: Object.freeze(o.map(Object.freeze)), recognized: Te(t) });
      return Ch.set(N, { parts: e, starts: c, safe: r && o.length === 0 }), N;
    }
    function Uz(n, e) {
      let t = Math.min(n.length, e.length), o = 65536, r = 0;
      for (; r + o <= t && n.slice(r, r + o) === e.slice(r, r + o); ) r += o;
      let i = r, s = Math.min(t, r + o);
      for (; i < s; ) {
        let c = i + s + 1 >> 1;
        n.slice(r, c) === e.slice(r, c) ? i = c : s = c - 1;
      }
      return i;
    }
    function Qz(n, e, t) {
      let o = Math.min(n.length, e.length) - t, r = 65536, i = 0;
      for (; i + r <= o && n.slice(n.length - i - r, n.length - i) === e.slice(e.length - i - r, e.length - i); ) i += r;
      let s = i, c = Math.min(o, i + r);
      for (; s < c; ) {
        let a = s + c + 1 >> 1;
        n.slice(n.length - a, n.length - i) === e.slice(e.length - a, e.length - i) ? s = a : c = a - 1;
      }
      return s;
    }
    var vh = /* @__PURE__ */ new WeakSet();
    function wh(n) {
      return Te(n), vh.add(n), n;
    }
    function kh(n) {
      let e = [], t = /\n\^[A-Za-z0-9-]+[ \t]*\r?\n\r?\n/g, o = 0;
      for (let r; r = t.exec(n); ) e.push(n.slice(o, r.index + r[0].length)), o = r.index + r[0].length;
      return o < n.length && e.push(n.slice(o)), e;
    }
    function Ah(n) {
      return n.ends.$ === "Some" && n.state.mode.$ === "Neutral" && n.state.line > 0;
    }
    function jh(n, e, t) {
      if (!n.length) return e ? [wh(Se.opening(""))] : [];
      let o = [], r = "";
      for (let i = 0; i < n.length; i++) {
        let s = r + n[i], c = i === n.length - 1, a = e && !o.length ? null : Se.following(s), $ = a ? a.$ === "Some" ? a.value : null : Se.opening(s);
        if ($ && (Ah($) || c && !t)) o.push(wh($)), r = "";
        else {
          if (c) return null;
          r = s;
        }
      }
      return o;
    }
    function Fh(n, e) {
      if (!e || !e.every((c) => vh.has(c))) return null;
      let t = Se.assemble(En(e));
      if (t.$ !== "Some" || t.value.text !== n) return null;
      let o = t.value.scan, r = Tn(oe.diagnostics(o.parts)).map((c) => ({ line: Number(c.line) + 1, message: c.message })), i = Sh(n, Tn(o.parts), o, r, oe.safe(o)), s = [0];
      for (let c of e) s.push(s.at(-1) + c.text.length);
      return Xt.set(i, { segments: Object.freeze(e), starts: s, assembled: Te(t.value) }), i;
    }
    function Hz(n) {
      let e = null;
      for (let q of it) {
        let M = Xt.get(q.result);
        if (!M) continue;
        let V = Uz(q.source, n), H = Qz(q.source, n, V);
        (!e || V + H > e.kept + e.tail) && (e = { ...M, old: q.source, kept: V, tail: H });
      }
      if (!e) return null;
      let { segments: t, starts: o, old: r, kept: i, tail: s } = e, c = 0, a = t.length;
      for (; c < t.length && o[c + 1] <= i; ) c++;
      for (; a > c && o[a - 1] >= r.length - s; ) a--;
      for (; c > 0 && !Ah(t[c - 1]); ) c--;
      let $ = n.length - r.length;
      for (; c === 0 && a < t.length && o[a] + $ <= 0; ) a++;
      let N = o[c], k = o[a] + $;
      if (k < N) return null;
      let O = jh(kh(n.slice(N, k)), c === 0, a < t.length);
      return O && Fh(n, [...t.slice(0, c), ...O, ...t.slice(a)]);
    }
    function Pn(n) {
      let e = zr(n);
      if (e.diagnostics.length || !Ch.get(e).safe) throw new Error(e.diagnostics.map((t) => `Line ${t.line}: ${t.message}`).join("; ") || "Unsafe annotation document");
      return e;
    }
    function Gz(n) {
      return Co.render(n);
    }
    function Nh(n, e) {
      if (typeof n != "string" || /[\r\n]/.test(n)) throw new Error(`${e} must be a single line`);
      return n;
    }
    function xh(n, e, t) {
      for (let r of Object.keys(t)) if (!["json", "display", "link", "comment", "tags"].includes(r)) throw new Error(`Unsupported patch field ${r}`);
      let o = { ...n };
      for (let [r, i] of Object.entries(t)) if (r === "comment") {
        if (!Array.isArray(i)) throw new Error("comment must be an array of lines");
        o.comment = En(i.map((s) => Nh(s, "comment")));
      } else if (r === "json" || r === "display") {
        if (typeof i != "string") throw new Error(`${r} must be text`);
        o[r] = i;
      } else o[r] = Nh(i, r);
      if (zh(o.json, e), !o.display.trim().startsWith("*") || !o.display.trim().endsWith("*") || !o.link.trimStart().startsWith("%%LINK%%")) throw new Error("Unsupported visible fields");
      return o;
    }
    function yh(n, e = `
`) {
      let t = Tn(n.comment).join(`
`);
      return `%%
\`\`\`annotation-json
${n.json}
\`\`\`
%%
${n.display}
${n.link}
%%COMMENT%%
${t}
%%TAGS%%
${n.tags}`.replaceAll(`\r
`, `
`).split(`
`).map((r) => `>${r}`).join(e);
    }
    function Cr(n) {
      return { segments: Pn(n).segments, receipts: [] };
    }
    function Be(n) {
      return Gz(n.segments);
    }
    function Yt(n, e, t, o, r = null, i = null, s = null) {
      let c = Co.apply(n.segments, e, t);
      if (c.$ !== "Applied") throw new Error(`CRUD rejected: ${c.error.$}`);
      let a = { segments: c.document, receipts: [...n.receipts, { core: c.receipt, boundaryIndex: r, suffixRestore: s }] };
      if (i !== null && Be(a) !== i) throw new Error("CRUD representation disagrees with Bend source operation");
      return Pn(Be(a)), { session: a, value: o };
    }
    function Kz(n, e, t, o) {
      let r = ne.operations ? Xt.get(e) : null;
      if (r) {
        let s = Se.create(En(r.segments.slice(0, -1)), r.segments.at(-1), t, o);
        if (s.$ === "Some" && s.value.original === n) {
          let c = s.value.source, a = `${o}
^${t}

`;
          if (c.length >= n.length + a.length && c.startsWith(n) && c.endsWith(a)) return ne.operated++, { source: c, boundary: c.slice(n.length, c.length - a.length) };
        }
      }
      let i = $_.create(n, t, o);
      if (i.$ !== "CreationReady") throw new Error(i.message);
      return { source: i.source, boundary: z_.normalize(n).slice(n.length) };
    }
    function Vz(n, e, t) {
      let o = ne.operations ? Xt.get(e) : null;
      return o && o.assembled.text === n ? (ne.operated++, Se.delete(o.assembled, t.id)) : oe.delete(n, t.id);
    }
    function Sr(n, e) {
      let t = Be(n), o = Pn(t), r = Tn(n.segments), i = r.findIndex((M) => M.$ === "Annotation" && M.id === e.id);
      if (e.kind === "create") {
        if (typeof e.id != "string" || !oe.identifier_nonempty(e.id)) throw new Error("Unsupported annotation ID");
        if (i >= 0) throw new Error(`Duplicate annotation ID ${e.id}`);
        let M = xh({ $: "Block", json: "{}", display: "*%%HIGHLIGHT%%*", link: `%%LINK%%[[#^${e.id}|show annotation]]`, comment: En([]), tags: "" }, e.id, e.fields || {}), V = Kz(t, o, e.id, yh(M)), H = V.boundary, Rn = H ? { ...n, segments: En([...r, { $: "Raw", text: H }]) } : n, ee = V.source.slice(t.length + H.length);
        return Yt(Rn, r.length + (H ? 1 : 0), { $: "Create", id: e.id, lines: En([ee]) }, null, H ? r.length : null, V.source);
      }
      if (!["read", "update", "delete"].includes(e.kind)) throw new Error("Unknown CRUD operation");
      if (i < 0) {
        if (e.kind === "read" || e.kind === "delete") return { session: n, value: null };
        throw new Error(`Unknown annotation ID ${e.id}`);
      }
      let s = o.blocks.find((M) => M.id === e.id);
      if (!s) throw new Error("Annotation resolver disagrees with parsed document");
      if (e.kind === "read") return Yt(n, i, { $: "Read" }, { id: s.id, syntax: s.syntax, json: s.json, raw: s.raw });
      if (e.kind === "delete") {
        let M = Vz(t, o, s);
        if (M.error.$ === "Some") throw new Error(M.error.value);
        let V = Tn(r[i].lines).join(""), H = s.raw.startsWith(V) ? s.raw.slice(V.length) : "", Rn = n, ee = null;
        if (H) {
          let je = r[i + 1];
          if (je?.$ !== "Raw" || !je.text.startsWith(H)) throw new Error("Annotation boundary disagrees with storage segments");
          r[i + 1] = { ...je, text: je.text.slice(H.length) }, Rn = { ...n, segments: En(r) }, ee = { index: i + 1, text: H };
        }
        return Yt(Rn, i, { $: "Delete" }, null, null, M.source, ee);
      }
      let c = xh(s.syntax, e.id, e.patch || {});
      if (JSON.stringify(c) === JSON.stringify(s.syntax)) return { session: n, value: null };
      let a = Tn(r[i].lines).join(""), $ = s.raw.startsWith(a) ? s.raw.slice(a.length) : "";
      if (!$ && !a.endsWith(s.raw)) throw new Error("Annotation source span disagrees with storage segment");
      let N = $ ? "" : a.slice(0, a.length - s.raw.length), k = yh(c, s.eol), O = `${N}${k}${s.eol}^${e.id}${s.ending}`, q = $ ? O.slice(0, -$.length) : O;
      return Yt(n, i, { $: "Update", lines: En([q]) }, null);
    }
    function Eh(n, e, t = {}) {
      return Be(Sr(Cr(n), { kind: "create", id: e, fields: t }).session);
    }
    function ve(n, e, t) {
      return Be(Sr(Cr(n), { kind: "update", id: e, patch: t }).session);
    }
    function Ph(n, e) {
      return Be(Sr(Cr(n), { kind: "delete", id: e }).session);
    }
    function Yz(n, e) {
      return { $: n < e ? "LT" : n === e ? "EQ" : "GT" };
    }
    function T(n, e = 0) {
      return n[e] === "\uDC00" ? 4 : n.codePointAt(e) > 65535 ? 2 : 1;
    }
    function De(n) {
      return n.length < 4 ? n.codePointAt(0) : (n.charCodeAt(1) << 22 | n.charCodeAt(2) << 11 | n.charCodeAt(3)) >>> 0;
    }
    function Ar(n, e) {
      for (let t = 0; t <= n.length; t += T(n, t)) if (n.startsWith(e, t)) return true;
      return false;
    }
    function ke(n) {
      return n.replace(/\uDC00[^]{3}/gu, "\uFFFD");
    }
    function v(n) {
      return n.replace(/\p{Cs}/gu, "\uFFFD");
    }
    function Xz(n, e) {
      return { $: "$JMP", f: n.j?.f === n ? n.j : n, x: e };
    }
    function x(n) {
      let e = (t) => f(n(t));
      return e.j = n, n.f = e, e;
    }
    function f(n) {
      for (; n !== null && typeof n == "object" && n.$ === "$JMP"; ) n = n.f(n.x);
      return n;
    }
    function m(n, e) {
      return (...t) => t.length < e ? m((...o) => n(...t, ...o), e - t.length) : f(n(...t));
    }
    function Lh(n, e) {
      if (n.$ === "Nil") return { $: "AbsentField" };
      {
        let t = n.head, o = t.key, r = t.value, i = n.tail;
        return AS(Je(o, e), { $: "PresentField", value: r }, h0(i, e));
      }
    }
    function Oh(n, e) {
      if (n.$ === "Nil") return false;
      {
        let o = n.head.key;
        return Tr(o, e);
      }
    }
    function Th(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return { $: "AbsentField" };
        {
          let c = o.head.value, a = o.tail;
          if (i) return { $: "PresentField", value: c };
          n = a, e = r, t = fp(a, r);
          continue;
        }
      }
    }
    function Bh(n, e) {
      return Th(n, e, fp(n, e));
    }
    function Jh(n, e) {
      if (n.$ === "Nil") return false;
      {
        let o = n.head.key, r = n.tail, i = Je(o, e), s = $p(r, e);
        return i || s;
      }
    }
    function Dh(n) {
      if (n.$ === "Nil") return true;
      {
        let t = n.head.key, o = n.tail;
        return tp(g0($p(o, t)), dp(o));
      }
    }
    function Rh(n, e) {
      return e ? { $: "Done", value: n } : { $: "Fail", error: "duplicate object key" };
    }
    function Wh(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = e.key, o = e.value, r = n.tail;
        return { $: "Con", head: { $: "Member", key: t, value: o }, tail: hp(r) };
      }
    }
    function Uh(n) {
      let e = hp(n);
      return Rh(e, dp(e));
    }
    function Qh(n) {
      if (n.$ === "JObject") {
        let e = n.members;
        return Uh(e);
      } else return { $: "Fail", error: "expected object" };
    }
    function jr(n) {
      return n.$ === "JString" ? { $: "Done", value: n.value } : { $: "Fail", error: "expected string" };
    }
    function Hh(n) {
      return n.$ === "JNumber" ? { $: "Done", value: n.value } : { $: "Fail", error: "expected number" };
    }
    function Gh(n) {
      return n.$ === "JBool" ? { $: "Done", value: n.value } : { $: "Fail", error: "expected boolean" };
    }
    function Kh(n) {
      return FS(n);
    }
    function nn(n, e) {
      if (e.$ === "Done") return { $: "Done", value: e.value };
      {
        let o = ": " + e.error;
        return { $: "Fail", error: n + o };
      }
    }
    function Vh(n) {
      return ES(n);
    }
    function Yh(n, e) {
      if (n.$ === "Nil") return false;
      {
        let t = n.head, o = n.tail, r = Je(t, e), i = m0(o, e);
        return r || i;
      }
    }
    function Xh(n, e) {
      if (n.$ === "Nil") return false;
      {
        let t = n.head;
        return Tr(t, e);
      }
    }
    function Zh(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o.$ === "Nil") return false;
        {
          let s = o.tail;
          if (i) return true;
          n = s, e = r, t = gp(s, r);
          continue;
        }
      }
    }
    function ng(n, e) {
      return Zh(n, e, gp(n, e));
    }
    function eg(n, e, t) {
      return t ? e : { $: "Con", head: n, tail: e };
    }
    function tg(n, e) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let t = n.head, o = t.key, r = t.value, i = n.tail;
        return eg({ $: "Member", key: o, value: r }, xn(i, e), p0(e, o));
      }
    }
    function og(n) {
      return y(mp(n), x(Zz()));
    }
    function Zz() {
      return (n) => A({ $: "Utf16Offset", number: n });
    }
    function rg(n, e, t, o, r) {
      return t ? y(Re(n, "exact"), x(nC(n))) : o ? y(ro(n, "start"), x(oC(n))) : r ? y(Re(n, "startContainer"), x(iC(n))) : { $: "Done", value: { $: "ExtensionSelector", kind: e, members: n } };
    }
    function nC(n) {
      return (e) => y(on(n, "prefix"), x(eC(n, e)));
    }
    function eC(n, e) {
      return (t) => y(on(n, "suffix"), x(tC(t, n, e)));
    }
    function tC(n, e, t) {
      return (o) => A({ $: "QuoteSelector", exact: t, prefix: n, suffix: o, extensions: xn(e, { $: "Con", head: "type", tail: { $: "Con", head: "exact", tail: { $: "Con", head: "prefix", tail: { $: "Con", head: "suffix", tail: { $: "Nil" } } } } }) });
    }
    function oC(n) {
      return (e) => y(ro(n, "end"), x(rC(e, n)));
    }
    function rC(n, e) {
      return (t) => A({ $: "PositionSelector", start: n, end: t, extensions: xn(e, { $: "Con", head: "type", tail: { $: "Con", head: "start", tail: { $: "Con", head: "end", tail: { $: "Nil" } } } }) });
    }
    function iC(n) {
      return (e) => y(ro(n, "startOffset"), x(sC(n, e)));
    }
    function sC(n, e) {
      return (t) => y(Re(n, "endContainer"), x(cC(n, e, t)));
    }
    function cC(n, e, t) {
      return (o) => y(ro(n, "endOffset"), x(aC(o, n, e, t)));
    }
    function aC(n, e, t, o) {
      return (r) => A({ $: "DomRangeSelector", startContainer: t, startOffset: o, endContainer: n, endOffset: r, extensions: xn(e, { $: "Con", head: "type", tail: { $: "Con", head: "startContainer", tail: { $: "Con", head: "startOffset", tail: { $: "Con", head: "endContainer", tail: { $: "Con", head: "endOffset", tail: { $: "Nil" } } } } } }) });
    }
    function ig(n, e) {
      return rg(n, e, Je(e, "TextQuoteSelector"), Je(e, "TextPositionSelector"), Je(e, "RangeSelector"));
    }
    function sg(n) {
      return y(Jn(n), x(uC()));
    }
    function uC() {
      return (n) => y(Re(n, "type"), x(lC(n)));
    }
    function lC(n) {
      return (e) => ig(n, e);
    }
    function cg(n) {
      return LS(n);
    }
    function ag(n) {
      return y(Jn(n), x(_C()));
    }
    function _C() {
      return (n) => y(Re(n, "source"), x(fC(n)));
    }
    function fC(n) {
      return (e) => y(b0(n, "selector"), x($C(e, n)));
    }
    function $C(n, e) {
      return (t) => A({ $: "Target", source: n, selectors: t, extensions: xn(e, { $: "Con", head: "source", tail: { $: "Con", head: "selector", tail: { $: "Nil" } } }) });
    }
    function ug(n) {
      return TS(n);
    }
    function lg(n) {
      return n.$ === "JString" ? { $: "Done", value: { $: "TitleText", value: n.value } } : y(Br(n), x(dC()));
    }
    function dC() {
      return (n) => A({ $: "TitleList", values: n });
    }
    function _g(n) {
      return y(Jn(n), x(hC()));
    }
    function hC() {
      return (n) => y(Re(n, "href"), x(gC(n)));
    }
    function gC(n) {
      return (e) => y(on(n, "rel"), x(mC(e, n)));
    }
    function mC(n, e) {
      return (t) => y(on(e, "type"), x(pC(n, t, e)));
    }
    function pC(n, e, t) {
      return (o) => A({ $: "DocumentLink", href: n, rel: e, mediaType: o, extensions: xn(t, { $: "Con", head: "href", tail: { $: "Con", head: "rel", tail: { $: "Con", head: "type", tail: { $: "Nil" } } } }) });
    }
    function fg(n) {
      return BS(n);
    }
    function Fr(n) {
      if (n.$ === "Nil") return { $: "Done", value: { $: "Nil" } };
      {
        let e = n.head, t = e.key, o = e.value, r = n.tail;
        return y(Br(o), x(bC(r, t)));
      }
    }
    function bC(n, e) {
      return (t) => y(w0(n), x(wC(e, t)));
    }
    function wC(n, e) {
      return (t) => A({ $: "Con", head: { $: "MetadataEntry", key: n, values: e }, tail: t });
    }
    function $g(n) {
      return y(Jn(n), x(NC()));
    }
    function NC() {
      return (n) => Fr(n);
    }
    function dg(n) {
      return y(We(n, "dc"), x(xC(n)));
    }
    function xC(n) {
      return (e) => y(We(n, "eprints"), x(yC(e, n)));
    }
    function yC(n, e) {
      return (t) => y(We(e, "facebook"), x(zC(n, t, e)));
    }
    function zC(n, e, t) {
      return (o) => y(We(t, "highwire"), x(CC(n, o, e, t)));
    }
    function CC(n, e, t, o) {
      return (r) => y(We(o, "prism"), x(SC(n, e, t, o, r)));
    }
    function SC(n, e, t, o, r) {
      return (i) => y(We(o, "twitter"), x(vC(n, i, e, t, r)));
    }
    function vC(n, e, t, o, r) {
      return (i) => A({ $: "WebMetadata", dc: n, eprints: o, facebook: t, highwire: r, prism: e, twitter: i });
    }
    function hg(n) {
      return y(Jn(n), x(kC()));
    }
    function kC() {
      return (n) => y(N0(n, "title"), x(AC(n)));
    }
    function AC(n) {
      return (e) => y(x0(n, "link"), x(jC(e, n)));
    }
    function jC(n, e) {
      return (t) => y(on(e, "documentFingerprint"), x(FC(n, t, e)));
    }
    function FC(n, e, t) {
      return (o) => y(on(t, "favicon"), x(EC(n, o, e, t)));
    }
    function EC(n, e, t, o) {
      return (r) => y(y0(o), x(PC(n, e, t, o, r)));
    }
    function PC(n, e, t, o, r) {
      return (i) => A({ $: "DocumentMetadata", title: n, links: t, fingerprint: e, favicon: r, web: i, extensions: xn(o, { $: "Con", head: "title", tail: { $: "Con", head: "link", tail: { $: "Con", head: "documentFingerprint", tail: { $: "Con", head: "favicon", tail: { $: "Con", head: "dc", tail: { $: "Con", head: "eprints", tail: { $: "Con", head: "facebook", tail: { $: "Con", head: "highwire", tail: { $: "Con", head: "prism", tail: { $: "Con", head: "twitter", tail: { $: "Nil" } } } } } } } } } } }) });
    }
    function gg(n) {
      return y(Jn(n), x(qC()));
    }
    function qC() {
      return (n) => y(at(n, "read"), x(IC(n)));
    }
    function IC(n) {
      return (e) => y(at(n, "update"), x(MC(n, e)));
    }
    function MC(n, e) {
      return (t) => y(at(n, "delete"), x(LC(n, t, e)));
    }
    function LC(n, e, t) {
      return (o) => A({ $: "Permissions", read: t, update: e, delete: o, extensions: xn(n, { $: "Con", head: "read", tail: { $: "Con", head: "update", tail: { $: "Con", head: "delete", tail: { $: "Nil" } } } }) });
    }
    function mg(n) {
      return y(Jn(n), x(OC()));
    }
    function OC() {
      return (n) => y(z0(n, "display_name"), x(TC(n)));
    }
    function TC(n) {
      return (e) => A({ $: "UserInfo", displayName: e, extensions: xn(n, { $: "Con", head: "display_name", tail: { $: "Nil" } }) });
    }
    function pg(n) {
      return QS(n);
    }
    function bg(n) {
      return y(Jn(n), x(BC()));
    }
    function BC() {
      return (n) => y(on(n, "html"), x(JC(n)));
    }
    function JC(n) {
      return (e) => y(on(n, "incontext"), x(DC(n, e)));
    }
    function DC(n, e) {
      return (t) => y(on(n, "json"), x(RC(n, t, e)));
    }
    function RC(n, e, t) {
      return (o) => A({ $: "Links", html: t, incontext: e, json: o, extensions: xn(n, { $: "Con", head: "html", tail: { $: "Con", head: "incontext", tail: { $: "Con", head: "json", tail: { $: "Nil" } } } }) });
    }
    function wg(n) {
      return y(Jn(n), x(WC()));
    }
    function WC() {
      return (n) => y(C0(n, "flagCount"), x(UC(n)));
    }
    function UC(n) {
      return (e) => A({ $: "Moderation", flagCount: e, extensions: xn(n, { $: "Con", head: "flagCount", tail: { $: "Nil" } }) });
    }
    function Ng(n) {
      return y(on(n, "id"), x(QC(n)));
    }
    function QC(n) {
      return (e) => y(on(n, "group"), x(HC(e, n)));
    }
    function HC(n, e) {
      return (t) => y(on(e, "user"), x(GC(n, e, t)));
    }
    function GC(n, e, t) {
      return (o) => y(S0(e, "permissions"), x(KC(o, n, e, t)));
    }
    function KC(n, e, t, o) {
      return (r) => y(v0(t, "user_info"), x(VC(n, e, o, r)));
    }
    function VC(n, e, t, o) {
      return (r) => A({ $: "Identity", id: e, group: t, user: n, permissions: o, userInfo: r });
    }
    function xg(n) {
      return y(on(n, "text"), x(YC(n)));
    }
    function YC(n) {
      return (e) => y(at(n, "tags"), x(XC(e, n)));
    }
    function XC(n, e) {
      return (t) => y(k0(e, "target"), x(ZC(n, t, e)));
    }
    function ZC(n, e, t) {
      return (o) => y(at(t, "references"), x(nS(o, n, e)));
    }
    function nS(n, e, t) {
      return (o) => A({ $: "Content", text: e, tags: t, targets: n, references: o });
    }
    function yg(n) {
      return y(on(n, "created"), x(eS(n)));
    }
    function eS(n) {
      return (e) => y(on(n, "updated"), x(tS(n, e)));
    }
    function tS(n, e) {
      return (t) => y(on(n, "uri"), x(oS(t, e)));
    }
    function oS(n, e) {
      return (t) => A({ $: "Audit", created: e, updated: n, uri: t });
    }
    function zg(n) {
      return y(pp(n, "hidden"), x(rS(n)));
    }
    function rS(n) {
      return (e) => y(pp(n, "flagged"), x(iS(n, e)));
    }
    function iS(n, e) {
      return (t) => y(A0(n, "moderation"), x(sS(t, e)));
    }
    function sS(n, e) {
      return (t) => A({ $: "Visibility", hidden: e, flagged: n, moderation: t });
    }
    function Er(n) {
      return y(Jn(n), x(cS()));
    }
    function cS() {
      return (n) => y(j0(n), x(aS(n)));
    }
    function aS(n) {
      return (e) => y(F0(n), x(uS(e, n)));
    }
    function uS(n, e) {
      return (t) => y(E0(e, "document"), x(lS(n, t, e)));
    }
    function lS(n, e, t) {
      return (o) => y(P0(t), x(_S(n, o, e, t)));
    }
    function _S(n, e, t, o) {
      return (r) => y(q0(o), x(fS(n, e, t, r, o)));
    }
    function fS(n, e, t, o, r) {
      return (i) => y(I0(r, "links"), x($S(n, e, i, t, o, r)));
    }
    function $S(n, e, t, o, r, i) {
      return (s) => A({ $: "AnnotationFields", identity: n, content: o, document: e, audit: r, visibility: t, links: s, extensions: xn(i, { $: "Con", head: "id", tail: { $: "Con", head: "group", tail: { $: "Con", head: "user", tail: { $: "Con", head: "permissions", tail: { $: "Con", head: "user_info", tail: { $: "Con", head: "text", tail: { $: "Con", head: "tags", tail: { $: "Con", head: "target", tail: { $: "Con", head: "references", tail: { $: "Con", head: "document", tail: { $: "Con", head: "created", tail: { $: "Con", head: "updated", tail: { $: "Con", head: "uri", tail: { $: "Con", head: "hidden", tail: { $: "Con", head: "flagged", tail: { $: "Con", head: "moderation", tail: { $: "Con", head: "links", tail: { $: "Nil" } } } } } } } } } } } } } } } } } }) });
    }
    function Cg(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = e.key, o = e.value, r = n.tail;
        return { $: "Con", head: { $: "JsonPair", key: t, value: o }, tail: bp(r) };
      }
    }
    function fn(n) {
      return { $: "JObject", members: bp(n) };
    }
    function dS(n, e) {
      return op(n, e);
    }
    function Pr(n) {
      return { $: "JString", value: n };
    }
    function Sg(n) {
      return { $: "JNumber", value: n };
    }
    function vg(n) {
      return { $: "JBool", value: n };
    }
    function kg(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = n.tail;
        return { $: "Con", head: { $: "JString", value: e }, tail: wp(t) };
      }
    }
    function qr(n) {
      return { $: "JArray", items: wp(n) };
    }
    function Ag(n) {
      return tv(n);
    }
    function jg(n) {
      return { $: "JNumber", value: n.number };
    }
    function Fg(n) {
      if (n.$ === "QuoteSelector") {
        let e = n.exact, t = n.prefix, o = n.suffix, r = n.extensions;
        return fn({ $: "Con", head: { $: "Member", key: "type", value: { $: "JString", value: "TextQuoteSelector" } }, tail: { $: "Con", head: { $: "Member", key: "exact", value: { $: "JString", value: e } }, tail: bn("prefix", t, bn("suffix", o, r)) } });
      } else if (n.$ === "PositionSelector") {
        let e = n.start, t = n.end, o = n.extensions;
        return fn({ $: "Con", head: { $: "Member", key: "type", value: { $: "JString", value: "TextPositionSelector" } }, tail: { $: "Con", head: { $: "Member", key: "start", value: Zt(e) }, tail: { $: "Con", head: { $: "Member", key: "end", value: Zt(t) }, tail: o } } });
      } else if (n.$ === "DomRangeSelector") {
        let e = n.startContainer, t = n.startOffset, o = n.endContainer, r = n.endOffset, i = n.extensions;
        return fn({ $: "Con", head: { $: "Member", key: "type", value: { $: "JString", value: "RangeSelector" } }, tail: { $: "Con", head: { $: "Member", key: "startContainer", value: { $: "JString", value: e } }, tail: { $: "Con", head: { $: "Member", key: "startOffset", value: Zt(t) }, tail: { $: "Con", head: { $: "Member", key: "endContainer", value: { $: "JString", value: o } }, tail: { $: "Con", head: { $: "Member", key: "endOffset", value: Zt(r) }, tail: i } } } } });
      } else {
        let e = n.members;
        return fn(e);
      }
    }
    function Eg(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = n.tail;
        return { $: "Con", head: M0(e), tail: Np(t) };
      }
    }
    function Pg(n) {
      return { $: "JArray", items: Np(n) };
    }
    function qg(n) {
      let e = n.source, t = n.selectors, o = n.extensions;
      return fn({ $: "Con", head: { $: "Member", key: "source", value: { $: "JString", value: e } }, tail: L0("selector", t, o) });
    }
    function Ig(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = n.tail;
        return { $: "Con", head: O0(e), tail: xp(t) };
      }
    }
    function Mg(n) {
      return { $: "JArray", items: xp(n) };
    }
    function Lg(n) {
      if (n.$ === "TitleText") return { $: "JString", value: n.value };
      {
        let e = n.values;
        return qr(e);
      }
    }
    function Og(n) {
      let e = n.href, t = n.rel, o = n.mediaType, r = n.extensions;
      return fn({ $: "Con", head: { $: "Member", key: "href", value: { $: "JString", value: e } }, tail: bn("rel", t, bn("type", o, r)) });
    }
    function Tg(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = n.tail;
        return { $: "Con", head: T0(e), tail: yp(t) };
      }
    }
    function Bg(n) {
      return { $: "JArray", items: yp(n) };
    }
    function Jg(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = e.key, o = e.values, r = n.tail;
        return { $: "Con", head: { $: "Member", key: t, value: zp(o) }, tail: Cp(r) };
      }
    }
    function Dg(n) {
      return fn(Cp(n));
    }
    function Rg(n, e) {
      let t = n.dc, o = n.eprints, r = n.facebook, i = n.highwire, s = n.prism, c = n.twitter;
      return rp("dc", t, st("eprints", o, st("facebook", r, st("highwire", i, st("prism", s, st("twitter", c, e))))));
    }
    function Wg(n) {
      let e = n.title, t = n.links, o = n.fingerprint, r = n.favicon, i = n.web, s = n.extensions;
      return fn(D0("title", e, J0("link", t, bn("documentFingerprint", o, bn("favicon", r, B0(i, s))))));
    }
    function Ug(n) {
      let e = n.read, t = n.update, o = n.delete, r = n.extensions;
      return fn(ct("read", e, ct("update", t, ct("delete", o, r))));
    }
    function Qg(n) {
      let e = n.displayName, t = n.extensions;
      return fn(R0("display_name", e, t));
    }
    function Hg(n) {
      return av(n);
    }
    function Gg(n) {
      let e = n.html, t = n.incontext, o = n.json, r = n.extensions;
      return fn(bn("html", e, bn("incontext", t, bn("json", o, r))));
    }
    function Kg(n) {
      let e = n.flagCount, t = n.extensions;
      return fn(W0("flagCount", e, t));
    }
    function Vg(n, e) {
      let t = n.id, o = n.group, r = n.user, i = n.permissions, s = n.userInfo;
      return to("id", t, bn("group", o, bn("user", r, Q0("permissions", i, U0("user_info", s, e)))));
    }
    function Yg(n, e) {
      let t = n.text, o = n.tags, r = n.targets, i = n.references;
      return to("text", t, ct("tags", o, H0("target", r, ct("references", i, e))));
    }
    function Xg(n, e) {
      let t = n.created, o = n.updated, r = n.uri;
      return to("created", t, bn("updated", o, bn("uri", r, e)));
    }
    function Zg(n, e) {
      let t = n.hidden, o = n.flagged, r = n.moderation;
      return ip("hidden", t, K0("flagged", o, G0("moderation", r, e)));
    }
    function nm(n) {
      let e = n.identity, t = n.content, o = n.document, r = n.audit, i = n.visibility, s = n.links, c = n.extensions;
      return fn(e3(e, n3(t, Z0("document", o, X0(r, Y0(i, V0("links", s, c)))))));
    }
    function em(n, e) {
      return n.$ === "AbsentField" ? e : n.value;
    }
    function tm(n, e) {
      return n.$ === "AbsentField" ? e : { $: "PresentField", value: n.value };
    }
    function om() {
      return { $: "Links", html: { $: "AbsentField" }, incontext: { $: "AbsentField" }, json: { $: "AbsentField" }, extensions: { $: "Nil" } };
    }
    function rm() {
      return { $: "Permissions", read: { $: "PresentField", value: { $: "Con", head: "Obsidian User", tail: { $: "Nil" } } }, update: { $: "PresentField", value: { $: "Con", head: "Obsidian User", tail: { $: "Nil" } } }, delete: { $: "PresentField", value: { $: "Con", head: "Obsidian User", tail: { $: "Nil" } } }, extensions: { $: "Nil" } };
    }
    function im() {
      return { $: "NonNullField", value: { $: "UserInfo", displayName: { $: "PresentField", value: { $: "NonNullField", value: "Obsidian User" } }, extensions: { $: "Nil" } } };
    }
    function sm(n) {
      return n.$ === "CreateRequest", n.input;
    }
    function cm(n, e) {
      if (n.$ === "AbsentField") return e;
      {
        let t = n.value;
        if (t === "") return e;
        {
          let o = t.slice(0, T(t)), r = t.slice(T(t));
          return o + r;
        }
      }
    }
    function am(n, e) {
      let o = n.identity.id;
      return cm(o, e);
    }
    function um(n, e) {
      let t = n.identity, o = t.group, r = t.user, i = t.permissions, s = t.userInfo, c = n.content, a = n.document, $ = n.audit, N = n.visibility, k = N.hidden, O = N.moderation, q = n.links, M = n.extensions;
      return { $: "AnnotationFields", identity: { $: "Identity", id: { $: "PresentField", value: e }, group: o, user: r, permissions: i, userInfo: s }, content: c, document: a, audit: $, visibility: { $: "Visibility", hidden: k, flagged: { $: "PresentField", value: false }, moderation: O }, links: q, extensions: M };
    }
    function lm(n) {
      if (n.$ === "PresentField") {
        let e = n.value;
        return e === "" ? { $: "AbsentField" } : { $: "PresentField", value: e };
      } else return n;
    }
    function _m(n) {
      if (n.$ === "PresentField") {
        let e = n.value;
        return e.$ === "Nil" ? { $: "AbsentField" } : { $: "PresentField", value: e };
      } else return n;
    }
    function fm(n) {
      if (n.$ === "PresentField") {
        let e = n.value;
        return e ? { $: "PresentField", value: e } : { $: "AbsentField" };
      } else return n;
    }
    function $m(n) {
      if (n.$ === "PresentField") {
        let e = n.value, t = e.html;
        if (t.$ === "AbsentField") {
          let o = e.incontext;
          if (o.$ === "AbsentField") {
            let r = e.json;
            if (r.$ === "AbsentField") {
              let i = e.extensions;
              return i.$ === "Nil" ? { $: "AbsentField" } : { $: "PresentField", value: { $: "Links", html: { $: "AbsentField" }, incontext: { $: "AbsentField" }, json: { $: "AbsentField" }, extensions: i } };
            } else {
              let i = e.extensions;
              return { $: "PresentField", value: { $: "Links", html: { $: "AbsentField" }, incontext: { $: "AbsentField" }, json: r, extensions: i } };
            }
          } else {
            let r = e.json, i = e.extensions;
            return { $: "PresentField", value: { $: "Links", html: { $: "AbsentField" }, incontext: o, json: r, extensions: i } };
          }
        } else {
          let o = e.incontext, r = e.json, i = e.extensions;
          return { $: "PresentField", value: { $: "Links", html: t, incontext: o, json: r, extensions: i } };
        }
      } else return n;
    }
    function dm(n) {
      let e = n.content, t = e.text, o = e.targets, r = e.references, i = n.document, s = n.audit, c = n.visibility, a = c.hidden, $ = c.flagged, N = c.moderation, k = n.links, O = n.extensions;
      return { $: "StoredAnnotation", fields: { $: "AnnotationFields", identity: { $: "Identity", id: { $: "AbsentField" }, group: { $: "AbsentField" }, user: { $: "AbsentField" }, permissions: { $: "AbsentField" }, userInfo: { $: "AbsentField" } }, content: { $: "Content", text: t3(t), tags: { $: "AbsentField" }, targets: o3(o), references: r }, document: i, audit: s, visibility: { $: "Visibility", hidden: qh(a), flagged: qh($), moderation: N }, links: r3(k), extensions: O } };
    }
    function hm(n, e) {
      let t = i3(vr(n), e), o = s3(vr(n), t);
      return { $: "WritePlan", id: t, response: { $: "WriteResponse", fields: o }, stored: c3(o) };
    }
    function gm(n, e) {
      return e.$ === "AbsentField" ? { $: "Fail", error: "write request requires tags array" } : { $: "Done", value: n };
    }
    function mm(n, e) {
      let o = e.content.tags;
      return gm(n, o);
    }
    function Ir(n) {
      return mm(n, vr(n));
    }
    function pm(n, e, t) {
      return t ? e : { $: "Con", head: n, tail: e };
    }
    function bm(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = e.key, o = e.value, r = n.tail;
        return pm({ $: "JsonPair", key: t, value: o }, Sp(r), Jr(t, "$"));
      }
    }
    function wm(n) {
      if (n.$ === "JObject") {
        let e = n.members;
        return { $: "JObject", members: Sp(e) };
      } else return n;
    }
    function Nm(n) {
      return y(kp(vp(n)), x(hS()));
    }
    function hS() {
      return (n) => Ir({ $: "CreateRequest", input: n });
    }
    function xm(n, e) {
      return y(kp(vp(e)), x(gS(n)));
    }
    function gS(n) {
      return (e) => Ir({ $: "UpdateRequest", pathId: n, input: e });
    }
    function ym(n, e) {
      if (n.$ === "QuoteSelector") {
        let t = n.exact, o = n.prefix, r = n.suffix, i = n.extensions, s = e.prefix, c = e.suffix;
        return { $: "QuoteSelector", exact: t, prefix: no(s, o), suffix: no(c, r), extensions: i };
      } else return n;
    }
    function zm(n, e) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let t = n.head, o = n.tail;
        return { $: "Con", head: a3(t, e), tail: Ap(o, e) };
      }
    }
    function Cm(n, e) {
      let t = n.source, o = n.selectors;
      if (o.$ === "AbsentField") {
        let r = n.extensions;
        return { $: "Target", source: t, selectors: { $: "AbsentField" }, extensions: r };
      } else {
        let r = o.value, i = n.extensions;
        return { $: "Target", source: t, selectors: { $: "PresentField", value: Ap(r, e) }, extensions: i };
      }
    }
    function Sm(n, e) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let t = n.head, o = n.tail;
        return { $: "Con", head: u3(t, e), tail: o };
      }
    }
    function vm(n, e, t) {
      let o = e.fields, r = o.identity, i = r.id, s = r.user, c = r.permissions, a = r.userInfo, $ = o.content, N = $.text, k = $.tags, O = $.targets, q = $.references, M = o.document, V = o.audit, H = o.visibility, Rn = H.hidden, ee = H.flagged, je = H.moderation, Rb = o.links, Wb = o.extensions, Ub = t.comment, Qb = t.tags, Hb = t.quote;
      return { $: "LoadedAnnotation", id: Bn(i, n), text: Bn(no(Ub, N), ""), tags: Bn(no(Qb, k), { $: "Nil" }), targets: l3(Bn(O, { $: "Nil" }), Hb), group: "__world__", user: Bn(s, "Obsidian User"), permissions: Bn(c, _3()), userInfo: Bn(a, f3()), hidden: Bn(Rn, false), flagged: Bn(ee, false), links: Bn(Rb, $3()), document: M, audit: V, references: q, moderation: je, extensions: Wb };
    }
    function km(n) {
      let e = n.id, t = n.text, o = n.tags, r = n.targets, i = n.group, s = n.user, c = n.permissions, a = n.userInfo, $ = n.hidden, N = n.flagged, k = n.links, O = n.document, q = n.audit, M = n.references, V = n.moderation, H = n.extensions;
      return { $: "AnnotationFields", identity: { $: "Identity", id: { $: "PresentField", value: e }, group: { $: "PresentField", value: i }, user: { $: "PresentField", value: s }, permissions: { $: "PresentField", value: c }, userInfo: { $: "PresentField", value: a } }, content: { $: "Content", text: { $: "PresentField", value: t }, tags: { $: "PresentField", value: o }, targets: { $: "PresentField", value: r }, references: M }, document: O, audit: q, visibility: { $: "Visibility", hidden: { $: "PresentField", value: $ }, flagged: { $: "PresentField", value: N }, moderation: V }, links: { $: "PresentField", value: k }, extensions: H };
    }
    function Am(n, e, t, o) {
      for (; ; ) {
        let r = n, i = e, s = t, c = o;
        if (r === "") return c ? { $: "Some", value: { $: "Cut", before: s, after: "" } } : { $: "None" };
        {
          let a = r.slice(0, T(r)), $ = r.slice(T(r));
          if (c) return { $: "Some", value: { $: "Cut", before: s, after: ue(a + $, [...ke(i)].length) } };
          {
            let N = a + "";
            n = $, e = i, t = s + N, o = Jr($, i);
            continue;
          }
        }
      }
    }
    function Mr(n, e) {
      return Am(n, e, "", Jr(n, e));
    }
    function jm(n, e, t) {
      return t ? Mr(n, e) : { $: "None" };
    }
    function Fm(n, e) {
      return jm(n, e, Ar(n, e));
    }
    function Em(n) {
      return n.$ === "None" ? { $: "AbsentField" } : { $: "PresentField", value: n.value.after };
    }
    function mS(n) {
      if (n.$ === "None") return { $: "VisibleQuote", prefix: { $: "AbsentField" }, suffix: { $: "AbsentField" } };
      {
        let e = n.value, t = e.before, o = e.after;
        return { $: "VisibleQuote", prefix: eo(Ih(t, "%%PREFIX%%")), suffix: eo(Ih(o, "%%POSTFIX%%")) };
      }
    }
    function Pm(n) {
      let e = jp(n);
      return oo(ue(Dr(ue(e, 1)), 1));
    }
    function qm(n) {
      if (n.$ === "None") return { $: "VisibleQuote", prefix: { $: "AbsentField" }, suffix: { $: "AbsentField" } };
      {
        let e = n.value, t = e.before, o = e.after;
        return { $: "VisibleQuote", prefix: eo(kr(t, "%%PREFIX%%")), suffix: eo(kr(o, "%%POSTFIX%%")) };
      }
    }
    function Im(n) {
      return qm(kr(d3(n), "%%HIGHLIGHT%%"));
    }
    function Mm(n, e) {
      if (n !== "") {
        let t = n.slice(0, T(n));
        if (De(t) == 37) {
          let r = n.slice(T(n));
          return sp("%" + r, e);
        } else return false;
      } else return false;
    }
    function Lm(n, e, t, o) {
      for (; ; ) {
        let r = n, i = e, s = t, c = o;
        if (r === "") return c ? { $: "Some", value: { $: "Cut", before: s, after: "" } } : { $: "None" };
        {
          let a = r.slice(0, T(r)), $ = r.slice(T(r));
          if (c) return { $: "Some", value: { $: "Cut", before: s, after: ue(a + $, [...ke(i)].length) } };
          {
            let N = a + "";
            n = $, e = i, t = s + N, o = io($, i);
            continue;
          }
        }
      }
    }
    function Om(n, e, t) {
      return t ? Lm(n, e, "", io(n, e)) : { $: "None" };
    }
    function Tm(n, e) {
      return Om(n, e, Ar(n, e));
    }
    function Bm(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o === "") return i ? { $: "Some", value: "" } : { $: "None" };
        {
          let s = o.slice(0, T(o)), c = o.slice(T(o));
          if (i) return { $: "Some", value: ue(s + c, [...ke(r)].length) };
          n = c, e = r, t = io(c, r);
          continue;
        }
      }
    }
    function Jm(n, e, t) {
      return t ? Bm(n, e, io(n, e)) : { $: "None" };
    }
    function Dm(n, e) {
      return Jm(n, e, Ar(n, e));
    }
    function Rm(n) {
      return n.$ === "None" ? { $: "AbsentField" } : { $: "PresentField", value: n.value };
    }
    function Wm(n) {
      if (n !== "") {
        let e = n.slice(0, T(n));
        return cp(e);
      } else return false;
    }
    function Um(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return true;
        {
          let r = t.slice(T(t));
          if (o) {
            n = r, e = Fp(r);
            continue;
          } else return false;
        }
      }
    }
    function Qm(n) {
      return Um(n, Fp(n));
    }
    function Hm(n) {
      return oo(ue(so(Dr(n)), 1));
    }
    function Lr(n, e) {
      return e ? { $: "None" } : { $: "Some", value: n };
    }
    function Gm(n) {
      if (n.$ === "None") return { $: "None" };
      {
        let e = n.value;
        return Lr(e, Ep(e));
      }
    }
    function Km(n) {
      if (n.$ === "None") return { $: "AbsentField" };
      {
        let e = n.value;
        return { $: "PresentField", value: h3(e) };
      }
    }
    function Vm(n, e) {
      if (e.$ === "None") return { $: "VisibleQuote", prefix: { $: "AbsentField" }, suffix: { $: "AbsentField" } };
      {
        let t = e.value;
        return { $: "VisibleQuote", prefix: g3(Mh(n, "%%PREFIX%%")), suffix: p3(m3(Mh(t, "%%POSTFIX%%"))) };
      }
    }
    function Ym(n) {
      if (n.$ === "None") return { $: "VisibleQuote", prefix: { $: "AbsentField" }, suffix: { $: "AbsentField" } };
      {
        let e = n.value, t = e.before, o = e.after;
        return Vm(t, b3(o, Ep(o)));
      }
    }
    function pS(n) {
      return Ym(w3(ue(so(n), 1), "%%HIGHLIGHT%%"));
    }
    function Xm(n) {
      return Im(n);
    }
    function Zm(n, e) {
      return n === "" ? e : { $: "Con", head: n, tail: e };
    }
    function np(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = n.tail;
        return Zm(ue(jp(e), 1), Pp(t));
      }
    }
    function Or(n) {
      if (n.$ === "AbsentField") return { $: "AbsentField" };
      {
        let e = n.value;
        return { $: "PresentField", value: Pp(qp(e, ",")) };
      }
    }
    function ep(n, e, t) {
      return { $: "VisibleFields", comment: e, tags: N3(t), quote: x3(n) };
    }
    function bS(n) {
      return Er(n);
    }
    function wS(n) {
      return nm(n);
    }
    function NS(n) {
      return Nm(n);
    }
    function xS(n, e) {
      return xm(n, e);
    }
    function yS(n, e) {
      return hm(n, e);
    }
    function zS(n, e, t) {
      return vm(n, e, t);
    }
    function CS(n) {
      return km(n);
    }
    function SS(n, e, t) {
      return ep(n, e, t);
    }
    function vS(n) {
      return Or(n);
    }
    function kS() {
      return { $: "JNull" };
    }
    function AS(n, e, t) {
      return n ? e : t;
    }
    function Tr(n, e) {
      return wv(y3(n, e));
    }
    function tp(n, e) {
      return n ? e : false;
    }
    function jS(n) {
      return !n;
    }
    function FS(n) {
      if (n.$ === "JArray") {
        let e = n.items;
        return ap(e);
      } else return { $: "Fail", error: "expected array" };
    }
    function ES(n) {
      return n.$ === "JNull" ? { $: "Done", value: { $: "NullField" } } : y(Rr(n), x(PS()));
    }
    function PS() {
      return (n) => A({ $: "NonNullField", value: n });
    }
    function y(n, e) {
      if (n.$ === "Fail") return { $: "Fail", error: n.error };
      {
        let t = n.value;
        return Xz(e, t);
      }
    }
    function A(n) {
      return { $: "Done", value: n };
    }
    function qS(n, e) {
      return nn(e, z3(tn(n, e)));
    }
    function IS(n, e) {
      return nn(e, C3(tn(n, e)));
    }
    function MS(n, e) {
      return nn(e, S3(tn(n, e)));
    }
    function LS(n) {
      if (n.$ === "JArray") {
        let e = n.items;
        return up(e);
      } else return { $: "Fail", error: "expected array" };
    }
    function OS(n, e) {
      return nn(e, v3(tn(n, e)));
    }
    function TS(n) {
      if (n.$ === "JArray") {
        let e = n.items;
        return lp(e);
      } else return { $: "Fail", error: "expected array" };
    }
    function BS(n) {
      if (n.$ === "JArray") {
        let e = n.items;
        return _p(e);
      } else return { $: "Fail", error: "expected array" };
    }
    function JS(n, e) {
      return nn(e, k3(tn(n, e)));
    }
    function DS(n, e) {
      return nn(e, A3(tn(n, e)));
    }
    function RS(n, e) {
      return nn(e, j3(tn(n, e)));
    }
    function WS(n, e) {
      return nn(e, F3(tn(n, e)));
    }
    function US(n, e) {
      return nn(e, E3(tn(n, e)));
    }
    function QS(n) {
      return n.$ === "JNull" ? { $: "Done", value: { $: "NullField" } } : y(P3(n), x(HS()));
    }
    function HS() {
      return (n) => A({ $: "NonNullField", value: n });
    }
    function GS(n, e) {
      return nn(e, q3(tn(n, e)));
    }
    function KS(n, e) {
      return nn(e, I3(tn(n, e)));
    }
    function VS(n, e) {
      return nn(e, M3(tn(n, e)));
    }
    function YS(n, e) {
      return nn(e, L3(tn(n, e)));
    }
    function XS(n, e) {
      return nn(e, O3(tn(n, e)));
    }
    function ZS(n, e) {
      return nn(e, T3(tn(n, e)));
    }
    function nv(n, e) {
      return nn(e, B3(tn(n, e)));
    }
    function ev(n, e) {
      return nn(e, J3(tn(n, e)));
    }
    function op(n, e) {
      if (n.$ === "Nil") return e;
      {
        let t = n.head, o = n.tail;
        return { $: "Con", head: t, tail: D3(o, e) };
      }
    }
    function tv(n) {
      if (n.$ === "NullField") return { $: "JNull" };
      {
        let e = n.value;
        return Pr(e);
      }
    }
    function to(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: R3(o) }, tail: t };
      }
    }
    function ov(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: W3(o) }, tail: t };
      }
    }
    function rp(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: U3(o) }, tail: t };
      }
    }
    function rv(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: Q3(o) }, tail: t };
      }
    }
    function iv(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: H3(o) }, tail: t };
      }
    }
    function sv(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: zp(o) }, tail: t };
      }
    }
    function cv(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: G3(o) }, tail: t };
      }
    }
    function av(n) {
      if (n.$ === "NullField") return { $: "JNull" };
      {
        let e = n.value;
        return Qg(e);
      }
    }
    function uv(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: K3(o) }, tail: t };
      }
    }
    function lv(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: V3(o) }, tail: t };
      }
    }
    function _v(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: Y3(o) }, tail: t };
      }
    }
    function fv(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: X3(o) }, tail: t };
      }
    }
    function ip(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: Z3(o) }, tail: t };
      }
    }
    function $v(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: nk(o) }, tail: t };
      }
    }
    function dv(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: ek(o) }, tail: t };
      }
    }
    function hv(n, e, t) {
      if (e.$ === "AbsentField") return t;
      {
        let o = e.value;
        return { $: "Con", head: { $: "Member", key: n, value: tk(o) }, tail: t };
      }
    }
    function sp(n, e) {
      return a0(e, n);
    }
    function gv(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return "";
        {
          let r = t.slice(0, T(t)), i = t.slice(T(t));
          if (o == 0) return r + i;
          {
            let s = o - 1;
            n = i, e = s;
            continue;
          }
        }
      }
    }
    function mv(n) {
      return u0(so(n));
    }
    function oo(n) {
      return l0(n, "");
    }
    function cp(n) {
      let e = De(n), t = e === 32, o = ok(e >= 9, e <= 13);
      return t || o;
    }
    function pv(n, e, t) {
      let o = 0;
      for (; ; ) switch (o) {
        case 0: {
          let r = n;
          if (r === "") return "";
          {
            let i = r.slice(0, T(r));
            n = r.slice(T(r)), e = i, t = rk(i), o = 1;
            continue;
          }
        }
        case 1: {
          let r = n, i = e;
          if (t) {
            n = r, o = 0;
            continue;
          } else return i + r;
        }
      }
    }
    function bv(n, e) {
      if (n === "") return { $: "Con", head: "", tail: { $: "Nil" } };
      {
        let t = n.slice(0, T(n)), o = n.slice(T(n));
        return _0(t, qp(o, e), Ip(t, e));
      }
    }
    function wv(n) {
      return n.$ === "EQ";
    }
    function Nv(n, e) {
      return $0(n, e, { $: "EQ" });
    }
    function ap(n) {
      if (n.$ === "Nil") return { $: "Done", value: { $: "Nil" } };
      {
        let e = n.head, t = n.tail;
        return y(Rr(e), x(xv(t)));
      }
    }
    function xv(n) {
      return (e) => y(ik(n), x(yv(e)));
    }
    function yv(n) {
      return (e) => A({ $: "Con", head: n, tail: e });
    }
    function zv(n) {
      if (n.$ === "AbsentField") return { $: "Fail", error: "missing required field" };
      {
        let e = n.value;
        return jr(e);
      }
    }
    function Cv(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(Rr(e), x(Sv()));
      }
    }
    function Sv() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function vv(n) {
      if (n.$ === "AbsentField") return { $: "Fail", error: "missing required field" };
      {
        let e = n.value;
        return og(e);
      }
    }
    function up(n) {
      if (n.$ === "Nil") return { $: "Done", value: { $: "Nil" } };
      {
        let e = n.head, t = n.tail;
        return y(sk(e), x(kv(t)));
      }
    }
    function kv(n) {
      return (e) => y(ck(n), x(Av(e)));
    }
    function Av(n) {
      return (e) => A({ $: "Con", head: n, tail: e });
    }
    function jv(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(ak(e), x(Fv()));
      }
    }
    function Fv() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function lp(n) {
      if (n.$ === "Nil") return { $: "Done", value: { $: "Nil" } };
      {
        let e = n.head, t = n.tail;
        return y(uk(e), x(Ev(t)));
      }
    }
    function Ev(n) {
      return (e) => y(lk(n), x(Pv(e)));
    }
    function Pv(n) {
      return (e) => A({ $: "Con", head: n, tail: e });
    }
    function _p(n) {
      if (n.$ === "Nil") return { $: "Done", value: { $: "Nil" } };
      {
        let e = n.head, t = n.tail;
        return y(_k(e), x(qv(t)));
      }
    }
    function qv(n) {
      return (e) => y(fk(n), x(Iv(e)));
    }
    function Iv(n) {
      return (e) => A({ $: "Con", head: n, tail: e });
    }
    function Mv(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y($k(e), x(Lv()));
      }
    }
    function Lv() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function Ov(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(dk(e), x(Tv()));
      }
    }
    function Tv() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function Bv(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(hk(e), x(Jv()));
      }
    }
    function Jv() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function Dv(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(Br(e), x(Rv()));
      }
    }
    function Rv() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function Wv(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(gk(e), x(Uv()));
      }
    }
    function Uv() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function Qv(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(mp(e), x(Hv()));
      }
    }
    function Hv() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function Gv(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(mk(e), x(Kv()));
      }
    }
    function Kv() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function Vv(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(pk(e), x(Yv()));
      }
    }
    function Yv() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function Xv(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(bk(e), x(Zv()));
      }
    }
    function Zv() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function n0(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(wk(e), x(e0()));
      }
    }
    function e0() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function t0(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(Nk(e), x(o0()));
      }
    }
    function o0() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function r0(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(xk(e), x(i0()));
      }
    }
    function i0() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function s0(n) {
      if (n.$ === "AbsentField") return { $: "Done", value: { $: "AbsentField" } };
      {
        let e = n.value;
        return y(yk(e), x(c0()));
      }
    }
    function c0() {
      return (n) => A({ $: "PresentField", value: n });
    }
    function a0(n, e, t) {
      let o = 0;
      for (; ; ) switch (o) {
        case 0: {
          let r = n, i = e;
          if (r === "") return true;
          {
            let s = r.slice(0, T(r)), c = r.slice(T(r));
            if (i === "") return false;
            {
              let a = i.slice(0, T(i)), $ = i.slice(T(i));
              n = c, e = $, t = Ip(a, s), o = 1;
              continue;
            }
          }
        }
        case 1: {
          let r = n, i = e;
          if (t) {
            n = r, e = i, o = 0;
            continue;
          } else return false;
        }
      }
    }
    function u0(n) {
      return oo(so(Dr(n)));
    }
    function l0(n, e) {
      for (; ; ) {
        let t = n, o = e;
        if (t === "") return o;
        {
          let r = t.slice(0, T(t));
          n = t.slice(T(t)), e = r + o;
          continue;
        }
      }
    }
    function _0(n, e, t) {
      return t ? { $: "Con", head: "", tail: e } : d0(n, e);
    }
    function f0(n, e) {
      let t = De(n), o = De(e);
      return t === o;
    }
    function $0(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o === "") return r !== "" && i.$ === "EQ" ? { $: "LT" } : i;
        {
          let s = o.slice(0, T(o)), c = De(s), a = o.slice(T(o));
          if (r === "") return i.$ === "EQ" ? { $: "GT" } : i;
          {
            let $ = r.slice(0, T(r)), N = De($), k = r.slice(T(r));
            if (i.$ === "EQ") {
              n = a, e = k, t = Yz(c, N);
              continue;
            } else return i;
          }
        }
      }
    }
    function d0(n, e) {
      if (e.$ === "Nil") return { $: "Con", head: n + "", tail: { $: "Nil" } };
      {
        let t = e.head, o = e.tail;
        return { $: "Con", head: n + t, tail: o };
      }
    }
    var Je = Tr;
    var h0 = Lh;
    var fp = Oh;
    var $p = Jh;
    var g0 = jS;
    var dp = Dh;
    var hp = Wh;
    var m0 = Yh;
    var gp = Xh;
    var xn = tg;
    var p0 = ng;
    var mp = Hh;
    var Re = qS;
    var on = IS;
    var ro = MS;
    var Jn = Qh;
    var b0 = OS;
    var Br = (n) => f(Kh(n));
    var w0 = (n) => f(Fr(n));
    var We = JS;
    var N0 = DS;
    var x0 = RS;
    var y0 = (n) => f(dg(n));
    var at = WS;
    var z0 = US;
    var C0 = GS;
    var S0 = KS;
    var v0 = VS;
    var k0 = YS;
    var pp = XS;
    var A0 = ZS;
    var j0 = (n) => f(Ng(n));
    var F0 = (n) => f(xg(n));
    var E0 = nv;
    var P0 = (n) => f(yg(n));
    var q0 = (n) => f(zg(n));
    var I0 = ev;
    var bp = Cg;
    var wp = kg;
    var bn = to;
    var Zt = jg;
    var M0 = Fg;
    var Np = Eg;
    var L0 = ov;
    var O0 = qg;
    var xp = Ig;
    var T0 = Og;
    var yp = Tg;
    var zp = qr;
    var Cp = Jg;
    var st = rp;
    var B0 = Rg;
    var J0 = iv;
    var D0 = rv;
    var ct = sv;
    var R0 = cv;
    var W0 = uv;
    var U0 = _v;
    var Q0 = lv;
    var H0 = fv;
    var G0 = $v;
    var K0 = ip;
    var V0 = hv;
    var Y0 = Zg;
    var X0 = Xg;
    var Z0 = dv;
    var n3 = Yg;
    var e3 = Vg;
    var t3 = lm;
    var o3 = _m;
    var qh = fm;
    var r3 = $m;
    var vr = sm;
    var i3 = am;
    var s3 = um;
    var c3 = dm;
    var Sp = bm;
    var Jr = sp;
    var vp = wm;
    var kp = (n) => f(Er(n));
    var no = tm;
    var a3 = ym;
    var Ap = zm;
    var u3 = Cm;
    var Bn = em;
    var l3 = Sm;
    var _3 = rm;
    var f3 = im;
    var $3 = om;
    var ue = gv;
    var Ih = Fm;
    var eo = Em;
    var jp = mv;
    var Dr = oo;
    var kr = Mr;
    var d3 = Pm;
    var io = Mm;
    var Fp = Wm;
    var so = pv;
    var Ep = Qm;
    var h3 = Hm;
    var Mh = Dm;
    var g3 = Rm;
    var m3 = Gm;
    var p3 = Km;
    var b3 = Lr;
    var w3 = Tm;
    var Pp = np;
    var qp = bv;
    var N3 = Or;
    var x3 = Xm;
    var y3 = Nv;
    var Rr = jr;
    var tn = Bh;
    var z3 = zv;
    var C3 = (n) => f(Cv(n));
    var S3 = (n) => f(vv(n));
    var v3 = (n) => f(jv(n));
    var k3 = (n) => f(Mv(n));
    var A3 = (n) => f(Ov(n));
    var j3 = (n) => f(Bv(n));
    var F3 = (n) => f(Dv(n));
    var E3 = (n) => f(Wv(n));
    var P3 = (n) => f(mg(n));
    var q3 = (n) => f(Qv(n));
    var I3 = (n) => f(Gv(n));
    var M3 = (n) => f(Vv(n));
    var L3 = (n) => f(Xv(n));
    var O3 = (n) => f(n0(n));
    var T3 = (n) => f(t0(n));
    var B3 = (n) => f(r0(n));
    var J3 = (n) => f(s0(n));
    var D3 = op;
    var R3 = Pr;
    var W3 = Pg;
    var U3 = Dg;
    var Q3 = Lg;
    var H3 = Bg;
    var G3 = Ag;
    var K3 = Sg;
    var V3 = Ug;
    var Y3 = Hg;
    var X3 = Mg;
    var Z3 = vg;
    var nk = Kg;
    var ek = Wg;
    var tk = Gg;
    var ok = tp;
    var rk = cp;
    var Ip = f0;
    var ik = (n) => f(ap(n));
    var sk = (n) => f(sg(n));
    var ck = (n) => f(up(n));
    var ak = (n) => f(cg(n));
    var uk = (n) => f(ag(n));
    var lk = (n) => f(lp(n));
    var _k = (n) => f(_g(n));
    var fk = (n) => f(_p(n));
    var $k = (n) => f($g(n));
    var dk = (n) => f(lg(n));
    var hk = (n) => f(fg(n));
    var gk = (n) => f(Vh(n));
    var mk = (n) => f(gg(n));
    var pk = (n) => f(pg(n));
    var bk = (n) => f(ug(n));
    var wk = Gh;
    var Nk = (n) => f(wg(n));
    var xk = (n) => f(hg(n));
    var yk = (n) => f(bg(n));
    var qn = { "annotation_schema:member_exact": m((n, e) => f(Lh(n, v(e))), 2), "annotation_schema:head_named": m((n, e) => f(Oh(n, v(e))), 2), "annotation_schema:member_go": m((n, e, t) => f(Th(n, v(e), t)), 3), "annotation_schema:member": m((n, e) => f(Bh(n, v(e))), 2), "annotation_schema:has": m((n, e) => f(Jh(n, v(e))), 2), "annotation_schema:unique": m((n) => f(Dh(n)), 1), "annotation_schema:object_checked": m((n, e) => f(Rh(n, e)), 2), "annotation_schema:members_from_pairs": m((n) => f(Wh(n)), 1), "annotation_schema:pairs_object": m((n) => f(Uh(n)), 1), "annotation_schema:object": m((n) => f(Qh(n)), 1), "annotation_schema:text": m((n) => f(jr(n)), 1), "annotation_schema:number": m((n) => f(Hh(n)), 1), "annotation_schema:boolean": m((n) => f(Gh(n)), 1), "annotation_schema:strings": m((n) => f(Kh(n)), 1), "annotation_schema:at_field": m((n, e) => f(nn(v(n), e)), 2), "annotation_schema:nullable_text": m((n) => f(Vh(n)), 1), "annotation_schema:known_exact": m((n, e) => f(Yh(n, v(e))), 2), "annotation_schema:head_is": m((n, e) => f(Xh(n, v(e))), 2), "annotation_schema:known_go": m((n, e, t) => f(Zh(n, v(e), t)), 3), "annotation_schema:known": m((n, e) => f(ng(n, v(e))), 2), "annotation_schema:keep_extension": m((n, e, t) => f(eg(n, e, t)), 3), "annotation_schema:extensions": m((n, e) => f(tg(n, e)), 2), "annotation_schema:offset": m((n) => f(og(n)), 1), "annotation_schema:selector_dispatch": m((n, e, t, o, r) => f(rg(n, v(e), t, o, r)), 5), "annotation_schema:selector_kind": m((n, e) => f(ig(n, v(e))), 2), "annotation_schema:selector": m((n) => f(sg(n)), 1), "annotation_schema:selectors": m((n) => f(cg(n)), 1), "annotation_schema:target": m((n) => f(ag(n)), 1), "annotation_schema:targets": m((n) => f(ug(n)), 1), "annotation_schema:title": m((n) => f(lg(n)), 1), "annotation_schema:document_link": m((n) => f(_g(n)), 1), "annotation_schema:document_links": m((n) => f(fg(n)), 1), "annotation_schema:metadata_items": m((n) => f(Fr(n)), 1), "annotation_schema:metadata": m((n) => f($g(n)), 1), "annotation_schema:web": m((n) => f(dg(n)), 1), "annotation_schema:document": m((n) => f(hg(n)), 1), "annotation_schema:permissions": m((n) => f(gg(n)), 1), "annotation_schema:user_info": m((n) => f(mg(n)), 1), "annotation_schema:nullable_user_info": m((n) => f(pg(n)), 1), "annotation_schema:links": m((n) => f(bg(n)), 1), "annotation_schema:moderation": m((n) => f(wg(n)), 1), "annotation_schema:identity": m((n) => f(Ng(n)), 1), "annotation_schema:content": m((n) => f(xg(n)), 1), "annotation_schema:audit": m((n) => f(yg(n)), 1), "annotation_schema:visibility": m((n) => f(zg(n)), 1), "annotation_schema:annotation": m((n) => f(Er(n)), 1), "annotation_json:pairs": m((n) => f(Cg(n)), 1), "annotation_json:object": m((n) => f(fn(n)), 1), "annotation_json:append": m((n, e) => f(dS(n, e)), 2), "annotation_json:text": m((n) => f(Pr(v(n))), 1), "annotation_json:number": m((n) => f(Sg(n)), 1), "annotation_json:boolean": m((n) => f(vg(n)), 1), "annotation_json:texts": m((n) => f(kg(n)), 1), "annotation_json:strings": m((n) => f(qr(n)), 1), "annotation_json:nullable_text": m((n) => f(Ag(n)), 1), "annotation_json:offset": m((n) => f(jg(n)), 1), "annotation_json:selector": m((n) => f(Fg(n)), 1), "annotation_json:selector_items": m((n) => f(Eg(n)), 1), "annotation_json:selectors": m((n) => f(Pg(n)), 1), "annotation_json:target": m((n) => f(qg(n)), 1), "annotation_json:target_items": m((n) => f(Ig(n)), 1), "annotation_json:targets": m((n) => f(Mg(n)), 1), "annotation_json:title": m((n) => f(Lg(n)), 1), "annotation_json:document_link": m((n) => f(Og(n)), 1), "annotation_json:link_items": m((n) => f(Tg(n)), 1), "annotation_json:document_links": m((n) => f(Bg(n)), 1), "annotation_json:metadata_items": m((n) => f(Jg(n)), 1), "annotation_json:metadata": m((n) => f(Dg(n)), 1), "annotation_json:web": m((n, e) => f(Rg(n, e)), 2), "annotation_json:document": m((n) => f(Wg(n)), 1), "annotation_json:permissions": m((n) => f(Ug(n)), 1), "annotation_json:user_info": m((n) => f(Qg(n)), 1), "annotation_json:nullable_user_info": m((n) => f(Hg(n)), 1), "annotation_json:links": m((n) => f(Gg(n)), 1), "annotation_json:moderation": m((n) => f(Kg(n)), 1), "annotation_json:identity": m((n, e) => f(Vg(n, e)), 2), "annotation_json:content": m((n, e) => f(Yg(n, e)), 2), "annotation_json:audit": m((n, e) => f(Xg(n, e)), 2), "annotation_json:visibility": m((n, e) => f(Zg(n, e)), 2), "annotation_json:annotation": m((n) => f(nm(n)), 1), "annotation_contract:get": m((n, e) => f(em(n, e)), 2), "annotation_contract:prefer": m((n, e) => f(tm(n, e)), 2), "annotation_contract:empty_links": m(() => f(om()), 0), "annotation_contract:local_permissions": m(() => f(rm()), 0), "annotation_contract:local_user_info": m(() => f(im()), 0), "annotation_contract:input": m((n) => f(sm(n)), 1), "annotation_contract:id_field": m((n, e) => ke(f(cm(n, v(e)))), 2), "annotation_contract:effective_id": m((n, e) => ke(f(am(n, v(e)))), 2), "annotation_contract:normalize_write": m((n, e) => f(um(n, v(e))), 2), "annotation_contract:strip_text": m((n) => f(lm(n)), 1), "annotation_contract:strip_list": m((n) => f(_m(n)), 1), "annotation_contract:strip_false": m((n) => f(fm(n)), 1), "annotation_contract:strip_links": m((n) => f($m(n)), 1), "annotation_contract:store": m((n) => f(dm(n)), 1), "annotation_contract:plan": m((n, e) => f(hm(n, v(e))), 2), "annotation_contract:write_tags": m((n, e) => f(gm(n, e)), 2), "annotation_contract:validate_fields": m((n, e) => f(mm(n, e)), 2), "annotation_contract:validate_write": m((n) => f(Ir(n)), 1), "annotation_contract:internal_member": m((n, e, t) => f(pm(n, e, t)), 3), "annotation_contract:wire_members": m((n) => f(bm(n)), 1), "annotation_contract:wire": m((n) => f(wm(n)), 1), "annotation_contract:decode_create": m((n) => f(Nm(n)), 1), "annotation_contract:decode_update": m((n, e) => f(xm(v(n), e)), 2), "annotation_contract:quote": m((n, e) => f(ym(n, e)), 2), "annotation_contract:quote_list": m((n, e) => f(zm(n, e)), 2), "annotation_contract:target_quote": m((n, e) => f(Cm(n, e)), 2), "annotation_contract:first_target": m((n, e) => f(Sm(n, e)), 2), "annotation_contract:load": m((n, e, t) => f(vm(v(n), e, t)), 3), "annotation_contract:loaded_fields": m((n) => f(km(n)), 1), "annotation_visible:cut_go": m((n, e, t, o) => f(Am(v(n), v(e), v(t), o)), 4), "annotation_visible:cut_exact": m((n, e) => f(Mr(v(n), v(e))), 2), "annotation_visible:cut_found": m((n, e, t) => f(jm(v(n), v(e), t)), 3), "annotation_visible:cut": m((n, e) => f(Fm(v(n), v(e))), 2), "annotation_visible:after": m((n) => f(Em(n)), 1), "annotation_visible:context_cut": m((n) => f(mS(n)), 1), "annotation_visible:content_exact": m((n) => ke(f(Pm(v(n)))), 1), "annotation_visible:context_cut_exact": m((n) => f(qm(n)), 1), "annotation_visible:context_exact": m((n) => f(Im(v(n))), 1), "annotation_visible:marks": m((n, e) => f(Mm(v(n), v(e))), 2), "annotation_visible:cut_mark_go": m((n, e, t, o) => f(Lm(v(n), v(e), v(t), o)), 4), "annotation_visible:cut_mark_found": m((n, e, t) => f(Om(v(n), v(e), t)), 3), "annotation_visible:cut_mark": m((n, e) => f(Tm(v(n), v(e))), 2), "annotation_visible:rest_go": m((n, e, t) => f(Bm(v(n), v(e), t)), 3), "annotation_visible:rest_found": m((n, e, t) => f(Jm(v(n), v(e), t)), 3), "annotation_visible:rest_after": m((n, e) => f(Dm(v(n), v(e))), 2), "annotation_visible:present": m((n) => f(Rm(n)), 1), "annotation_visible:head_space": m((n) => f(Wm(v(n))), 1), "annotation_visible:blank_go": m((n, e) => f(Um(v(n), e)), 2), "annotation_visible:blank": m((n) => f(Qm(v(n))), 1), "annotation_visible:before_last": m((n) => ke(f(Hm(v(n)))), 1), "annotation_visible:tail_checked": m((n, e) => f(Lr(v(n), e)), 2), "annotation_visible:tail_of": m((n) => f(Gm(n)), 1), "annotation_visible:suffix_of": m((n) => f(Km(n)), 1), "annotation_visible:context_tail": m((n, e) => f(Vm(v(n), e)), 2), "annotation_visible:context_found": m((n) => f(Ym(n)), 1), "annotation_visible:context_fast": m((n) => f(pS(v(n))), 1), "annotation_visible:context": m((n) => f(Xm(v(n))), 1), "annotation_visible:tag_prepend": m((n, e) => f(Zm(v(n), e)), 2), "annotation_visible:tag_items": m((n) => f(np(n)), 1), "annotation_visible:tags": m((n) => f(Or(n)), 1), "annotation_visible:fields": m((n, e, t) => f(ep(v(n), e, t)), 3), decode: m((n) => f(bS(n)), 1), encode: m((n) => f(wS(n)), 1), create: m((n) => f(NS(n)), 1), update: m((n, e) => f(xS(v(n), e)), 2), plan: m((n, e) => f(yS(n, v(e))), 2), load: m((n, e, t) => f(zS(v(n), e, t)), 3), loaded_fields: m((n) => f(CS(n)), 1), visible_fields: m((n, e, t) => f(SS(v(n), e, t)), 3), visible_tags: m((n) => f(vS(n)), 1), json_null: m(() => f(kS()), 0) };
    var Qr = qn.json_null().$;
    function Ae(n) {
      return n.reduceRight((e, t) => ({ $: "Con", head: t, tail: e }), { $: "Nil" });
    }
    function wn(n) {
      let e = [];
      for (; n.$ === "Con"; n = n.tail) e.push(n.head);
      if (n.$ !== "Nil") throw new Error("Invalid Bend list");
      return e;
    }
    var Mp = () => ({ $: "AbsentField" });
    var Wr = (n) => ({ $: "PresentField", value: n });
    function le(n) {
      return JSON.parse(n, (e, t, o) => {
        if (t === null) return { $: Qr };
        if (typeof t == "string") return { $: "JString", value: t };
        if (typeof t == "boolean") return { $: "JBool", value: t };
        if (typeof t == "number") {
          if (!o || typeof o.source != "string") throw new Error("JSON numeric source context requires the supported Node runtime");
          return { $: "JNumber", value: { $: "JsonNumber", literal: o.source } };
        }
        return Array.isArray(t) ? { $: "JArray", items: Ae(t) } : { $: "JObject", members: Ae(Object.entries(t).map(([r, i]) => ({ $: "JsonPair", key: r, value: i }))) };
      });
    }
    function _e(n) {
      switch (n.$) {
        case Qr:
          return "null";
        case "JString":
          return JSON.stringify(n.value);
        case "JBool":
          return n.value ? "true" : "false";
        case "JNumber": {
          let e = n.value.literal;
          if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(e)) throw new Error("Invalid numeric JSON literal");
          return e;
        }
        case "JArray":
          return `[${wn(n.items).map(_e).join(",")}]`;
        case "JObject":
          return `{${wn(n.members).map((e) => `${JSON.stringify(e.key)}:${_e(e.value)}`).join(",")}}`;
        default:
          throw new Error("Unknown typed JSON constructor");
      }
    }
    function Ur(n) {
      switch (n.$) {
        case Qr:
          return null;
        case "JString":
          return n.value;
        case "JBool":
          return n.value;
        case "JNumber": {
          let e = n.value.literal;
          if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(e)) throw new Error("Invalid numeric JSON literal");
          return Number(e);
        }
        case "JArray":
          return wn(n.items).map(Ur);
        case "JObject": {
          let e = {};
          for (let t of wn(n.members)) Object.defineProperty(e, t.key, { value: Ur(t.value), writable: true, enumerable: true, configurable: true });
          return e;
        }
        default:
          throw new Error("Unknown typed JSON constructor");
      }
    }
    function Lp(n, e) {
      if (n.$ !== "Done") throw new Error(`${e}: ${n.error}`);
      return n.value;
    }
    function zk(n) {
      return Lp(qn.decode(le(n)), "Annotation schema");
    }
    function Op(n) {
      return _e(qn.encode(n));
    }
    function Tp(n) {
      return Lp(qn.create(le(JSON.stringify(n))), "Create request");
    }
    function Bp(n, e) {
      if (typeof e != "string") throw new Error("Supply the fresh-ID candidate explicitly");
      return qn.plan(n, e);
    }
    function Jp(n) {
      return JSON.parse(Op(n.fields));
    }
    function Dp(n) {
      return Op(n.fields);
    }
    function Rp(n) {
      return Ur(qn.encode(qn.loaded_fields(n)));
    }
    function Hr(n, e, t = {}) {
      let o = { $: "StoredAnnotation", fields: zk(e) }, r = Object.hasOwn(t, "comment") ? Wr(t.comment) : Mp(), i = Object.hasOwn(t, "tags") ? Wr(t.tags) : Mp();
      return qn.load(n, o, qn.visible_fields(t.display || "", r, i));
    }
    function ut(n) {
      let e = n.map((o) => `#${o}`).join(", "), t = qn.visible_tags(Wr(e));
      if (JSON.stringify(wn(t.value)) !== JSON.stringify(n)) throw new Error("Tags cannot round-trip through the legacy comma-separated Markdown field");
      return e;
    }
    function co(n, e) {
      if (!n) return le(JSON.stringify(e));
      if (JSON.stringify(JSON.parse(_e(n))) === JSON.stringify(e)) return n;
      if (n.$ === "JObject" && e && typeof e == "object" && !Array.isArray(e)) {
        let t = new Map(wn(n.members).map((o) => [o.key, o.value]));
        return { $: "JObject", members: Ae(Object.entries(e).map(([o, r]) => ({ $: "JsonPair", key: o, value: co(t.get(o), r) }))) };
      }
      if (n.$ === "JArray" && Array.isArray(e)) {
        let t = wn(n.items);
        return { $: "JArray", items: Ae(e.map((o, r) => co(t[r], o))) };
      }
      return le(JSON.stringify(e));
    }
    function fe(n) {
      return String(n ?? "").replace(/\s+/g, " ").replace(/`/g, "\\`").replace(/<(?=[A-Za-z/!%?])/g, "<\u200B").replace(/%(?=%)/g, "%\u200B");
    }
    function Gr(n) {
      return String(n ?? "").replace(/\\`/g, "`").replace(new RegExp("<\u200B(?=[A-Za-z/!%?])", "g"), "<").replace(new RegExp("%\u200B(?=%)", "g"), "%");
    }
    function Ck(n, e, t = {}) {
      let o = Jp(e.response), r = { includePrefix: true, includePostfix: true, highlightHighlightedText: true, ...t }, i = { prefix: "", exact: "", suffix: "" };
      for (let N of o.target?.[0]?.selector || []) N.type === "TextQuoteSelector" && (i = { prefix: N.prefix || "", exact: N.exact, suffix: N.suffix || "" });
      let s = `*${r.includePrefix ? `%%PREFIX%%${fe(i.prefix.trim())}` : ""}%%HIGHLIGHT%%${r.highlightHighlightedText ? " ==" : ""}${fe(i.exact.trim())}${r.highlightHighlightedText ? "== " : ""}${r.includePostfix ? `%%POSTFIX%%${fe(i.suffix.trim())}` : ""}*`, c = { json: Dp(e.stored), display: s, link: `%%LINK%%[[#^${e.id}|show annotation]]`, comment: (o.text || "").split(`
`), tags: ut(o.tags) };
      return { source: Pn(n).blocks.some((N) => N.id === e.id) ? ve(n, e.id, c) : Eh(n, e.id, c), response: e.response, stored: e.stored, id: e.id };
    }
    function Kr(n, e, t, o) {
      return Ck(n, Bp(Tp(e), t), o);
    }
    function Wp(n, e) {
      let o = Pn(n).blocks.some((r) => r.id === e);
      return { source: Ph(n, e), response: { $: "DeleteResponse", id: e, deleted: o } };
    }
    function Gp(n, e) {
      return { $: n < e ? "LT" : n === e ? "EQ" : "GT" };
    }
    function Up(n) {
      if (!Number.isInteger(n) || n < 0 || n > 2 ** 53) throw "bend: expected a Nat host number: an integer from 0 to 2^53";
      return n;
    }
    function ao(n, e = 0) {
      return n[e] === "\uDC00" ? 4 : n.codePointAt(e) > 65535 ? 2 : 1;
    }
    function Qp(n) {
      return n.length < 4 ? n.codePointAt(0) : (n.charCodeAt(1) << 22 | n.charCodeAt(2) << 11 | n.charCodeAt(3)) >>> 0;
    }
    function lt(n) {
      return n.replace(/\uDC00[^]{3}/gu, "\uFFFD");
    }
    function Vr(n) {
      return n.replace(/\p{Cs}/gu, "\uFFFD");
    }
    function Y(n) {
      for (; n !== null && typeof n == "object" && n.$ === "$JMP"; ) n = n.f(n.x);
      return n;
    }
    function X(n, e) {
      return (...t) => t.length < e ? X((...o) => n(...t, ...o), e - t.length) : Y(n(...t));
    }
    function ft(n) {
      return n.$ === "Yellow" ? "yellow" : n.$ === "Orange" ? "orange" : n.$ === "Pink" ? "pink" : n.$ === "Purple" ? "purple" : n.$ === "Blue" ? "blue" : "green";
    }
    function Yr(n) {
      return c1(_t(n, "orange"), { $: "Orange" }, uo(_t(n, "pink"), { $: "Pink" }, uo(_t(n, "purple"), { $: "Purple" }, uo(_t(n, "blue"), { $: "Blue" }, uo(_t(n, "green"), { $: "Green" }, { $: "Yellow" })))));
    }
    function Kp(n) {
      return n.$ === "Yellow" ? 1 : n.$ === "Orange" ? 2 : n.$ === "Pink" ? 3 : n.$ === "Purple" ? 4 : n.$ === "Blue" ? 5 : 6;
    }
    function Vp(n) {
      return n == 0 ? { $: "None" } : n == 1 ? { $: "Some", value: { $: "Yellow" } } : n == 2 ? { $: "Some", value: { $: "Orange" } } : n == 3 ? { $: "Some", value: { $: "Pink" } } : n == 4 ? { $: "Some", value: { $: "Purple" } } : n == 5 ? { $: "Some", value: { $: "Blue" } } : n == 6 ? { $: "Some", value: { $: "Green" } } : { $: "None" };
    }
    function Sk(n, e) {
      return Fk(Hp(n), Hp(e));
    }
    function Yp(n) {
      let e = n.key;
      return a1(e, "color");
    }
    function Xp(n) {
      return { $: "JsonPair", key: "color", value: { $: "JString", value: qk(n) } };
    }
    function Zp(n) {
      if (n.$ === "JString") {
        let e = n.value;
        return Yr(e);
      } else return { $: "Yellow" };
    }
    function n1(n) {
      let e = n.value;
      return Zp(e);
    }
    function e1(n, e, t) {
      return n ? n1(e) : t;
    }
    function t1(n) {
      if (n.$ === "Nil") return { $: "Yellow" };
      {
        let e = n.head, t = n.tail;
        return e1(Zr(e), e, l1(t));
      }
    }
    function o1(n, e, t, o, r) {
      return n ? { $: "Con", head: _1(t), tail: o } : { $: "Con", head: e, tail: r };
    }
    function Xr(n, e) {
      if (n.$ === "Nil") return { $: "Con", head: _1(e), tail: { $: "Nil" } };
      {
        let t = n.head, o = n.tail;
        return o1(Zr(t), t, e, o, Ik(o, e));
      }
    }
    function r1(n, e, t) {
      return n ? t : { $: "Con", head: e, tail: t };
    }
    function i1(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = n.tail;
        return r1(Zr(e), e, Mk(t));
      }
    }
    function vk(n) {
      return ft(f1(n));
    }
    function kk(n) {
      return ft(l1(n));
    }
    function Ak(n, e) {
      return Xr(n, f1(e));
    }
    function s1(n) {
      if (n.$ === "None") return "";
      {
        let e = n.value;
        return ft(e);
      }
    }
    function jk(n) {
      return s1(Lk(n));
    }
    function c1(n, e, t) {
      return n ? e : t;
    }
    function a1(n, e) {
      return u1(Ok(n, e));
    }
    function Fk(n, e) {
      return u1(Gp(n, e));
    }
    function u1(n) {
      return n.$ === "EQ";
    }
    function Ek(n, e) {
      return Pk(n, e, { $: "EQ" });
    }
    function Pk(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o === "") return r !== "" && i.$ === "EQ" ? { $: "LT" } : i;
        {
          let s = o.slice(0, ao(o)), c = Qp(s), a = o.slice(ao(o));
          if (r === "") return i.$ === "EQ" ? { $: "GT" } : i;
          {
            let $ = r.slice(0, ao(r)), N = Qp($), k = r.slice(ao(r));
            if (i.$ === "EQ") {
              n = a, e = k, t = Gp(c, N);
              continue;
            } else return i;
          }
        }
      }
    }
    var _t = a1;
    var uo = c1;
    var Hp = Kp;
    var qk = ft;
    var Zr = Yp;
    var l1 = t1;
    var _1 = Xp;
    var Ik = Xr;
    var Mk = i1;
    var f1 = Yr;
    var Lk = Vp;
    var Ok = Ek;
    var $1 = { key: X((n) => lt(Y(ft(n))), 1), parse: X((n) => Y(Yr(Vr(n))), 1), index: X((n) => Y(Kp(n)), 1), at: X((n) => Y(Vp(Up(n))), 1), same: X((n, e) => Y(Sk(n, e)), 2), is_color: X((n) => Y(Yp(n)), 1), color_pair: X((n) => Y(Xp(n)), 1), value_ink: X((n) => Y(Zp(n)), 1), pair_ink: X((n) => Y(n1(n)), 1), choose: X((n, e, t) => Y(e1(n, e, t)), 3), get: X((n) => Y(t1(n)), 1), place: X((n, e, t, o, r) => Y(o1(n, e, t, o, r)), 5), set: X((n, e) => Y(Xr(n, e)), 2), keep: X((n, e, t) => Y(r1(n, e, t)), 3), others: X((n) => Y(i1(n)), 1), normal: X((n) => lt(Y(vk(Vr(n)))), 1), stored: X((n) => lt(Y(kk(n))), 1), recolor: X((n, e) => Y(Ak(n, Vr(e))), 2), shortcut_key: X((n) => lt(Y(s1(n))), 1), shortcut: X((n) => lt(Y(jk(Up(n)))), 1) };
    function p1(n, e) {
      return { $: n < e ? "LT" : n === e ? "EQ" : "GT" };
    }
    function Tk(n) {
      if (n > 281474976710655) throw "bend: a Nat past the largest immediate 2^48-1";
      return n;
    }
    function d1(n) {
      if (!Number.isInteger(n) || n < 0 || n > 2 ** 53) throw "bend: expected a Nat host number: an integer from 0 to 2^53";
      return n;
    }
    function lo(n, e = 0) {
      return n[e] === "\uDC00" ? 4 : n.codePointAt(e) > 65535 ? 2 : 1;
    }
    function h1(n) {
      return n.length < 4 ? n.codePointAt(0) : (n.charCodeAt(1) << 22 | n.charCodeAt(2) << 11 | n.charCodeAt(3)) >>> 0;
    }
    function $t(n) {
      return n.replace(/\uDC00[^]{3}/gu, "\uFFFD");
    }
    function $e(n) {
      return n.replace(/\p{Cs}/gu, "\uFFFD");
    }
    function j(n) {
      for (; n !== null && typeof n == "object" && n.$ === "$JMP"; ) n = n.f(n.x);
      return n;
    }
    function F(n, e) {
      return (...t) => t.length < e ? F((...o) => n(...t, ...o), e - t.length) : j(n(...t));
    }
    function dt(n) {
      return n.$ === "Yellow" ? "yellow" : n.$ === "Orange" ? "orange" : n.$ === "Pink" ? "pink" : n.$ === "Purple" ? "purple" : n.$ === "Blue" ? "blue" : "green";
    }
    function ei(n) {
      return U1(Ue(n, "orange"), { $: "Orange" }, _o(Ue(n, "pink"), { $: "Pink" }, _o(Ue(n, "purple"), { $: "Purple" }, _o(Ue(n, "blue"), { $: "Blue" }, _o(Ue(n, "green"), { $: "Green" }, { $: "Yellow" })))));
    }
    function b1(n) {
      return n.$ === "Yellow" ? 1 : n.$ === "Orange" ? 2 : n.$ === "Pink" ? 3 : n.$ === "Purple" ? 4 : n.$ === "Blue" ? 5 : 6;
    }
    function w1(n) {
      return n == 0 ? { $: "None" } : n == 1 ? { $: "Some", value: { $: "Yellow" } } : n == 2 ? { $: "Some", value: { $: "Orange" } } : n == 3 ? { $: "Some", value: { $: "Pink" } } : n == 4 ? { $: "Some", value: { $: "Purple" } } : n == 5 ? { $: "Some", value: { $: "Blue" } } : n == 6 ? { $: "Some", value: { $: "Green" } } : { $: "None" };
    }
    function N1(n, e) {
      return Hk(g1(n), g1(e));
    }
    function x1(n) {
      let e = n.key;
      return Q1(e, "color");
    }
    function y1(n) {
      return { $: "JsonPair", key: "color", value: { $: "JString", value: Xk(n) } };
    }
    function z1(n) {
      if (n.$ === "JString") {
        let e = n.value;
        return ei(e);
      } else return { $: "Yellow" };
    }
    function C1(n) {
      let e = n.value;
      return z1(e);
    }
    function S1(n, e, t) {
      return n ? C1(e) : t;
    }
    function v1(n) {
      if (n.$ === "Nil") return { $: "Yellow" };
      {
        let e = n.head, t = n.tail;
        return S1(si(e), e, G1(t));
      }
    }
    function k1(n, e, t, o, r) {
      return n ? { $: "Con", head: K1(t), tail: o } : { $: "Con", head: e, tail: r };
    }
    function ti(n, e) {
      if (n.$ === "Nil") return { $: "Con", head: K1(e), tail: { $: "Nil" } };
      {
        let t = n.head, o = n.tail;
        return k1(si(t), t, e, o, Zk(o, e));
      }
    }
    function A1(n, e, t) {
      return n ? t : { $: "Con", head: e, tail: t };
    }
    function j1(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = n.tail;
        return A1(si(e), e, nA(t));
      }
    }
    function Bk(n) {
      return dt(fo(n));
    }
    function Jk(n) {
      return dt(G1(n));
    }
    function Dk(n, e) {
      return ti(n, fo(e));
    }
    function F1(n) {
      if (n.$ === "None") return "";
      {
        let e = n.value;
        return dt(e);
      }
    }
    function Rk(n) {
      return F1(eA(n));
    }
    function E1(n) {
      if (n.$ === "Nil") return 0;
      {
        let e = n.tail;
        return Tk(tA(e) + 1);
      }
    }
    function P1(n) {
      for (; ; ) {
        let e = n;
        if (e.$ === "Nil") return { $: "Nil" };
        {
          let t = e.head, o = t.id, r = t.section, i = t.ink;
          if (t.quoted) {
            let c = e.tail;
            return { $: "Con", head: { $: "Entry", id: o, section: r, ink: i, quoted: true }, tail: oA(c) };
          } else {
            n = e.tail;
            continue;
          }
        }
      }
    }
    function q1(n) {
      for (; ; ) {
        let e = n;
        if (e.$ === "Nil") return { $: "Nil" };
        {
          let t = e.head, o = t.id, r = t.section, i = t.ink;
          if (t.quoted) {
            n = e.tail;
            continue;
          } else {
            let c = e.tail;
            return { $: "Con", head: { $: "Entry", id: o, section: r, ink: i, quoted: false }, tail: rA(c) };
          }
        }
      }
    }
    function I1(n, e) {
      if (n.$ === "Nil") return false;
      {
        let t = n.head, o = n.tail, r = iA(t, e), i = ci(o, e);
        return r || i;
      }
    }
    function M1(n) {
      return n.ink;
    }
    function L1(n, e, t) {
      return n ? { $: "Con", head: e, tail: t } : t;
    }
    function oi(n, e) {
      if (e.$ === "Nil") return { $: "Nil" };
      {
        let t = e.head, o = e.tail;
        return L1(ci(n, V1(t)), t, sA(n, o));
      }
    }
    function O1(n, e) {
      if (n.$ === "Nil") return e;
      {
        let t = n.head, o = n.tail;
        return oi({ $: "Con", head: t, tail: o }, e);
      }
    }
    function T1(n, e) {
      if (e.$ === "Nil") return true;
      {
        let t = e.head, o = e.tail;
        return Gk(ci(n, V1(t)), cA(n, o));
      }
    }
    function B1(n, e, t, o) {
      return n ? { $: "Con", head: { $: "Header", section: e }, tail: { $: "Con", head: t, tail: o } } : { $: "Con", head: t, tail: o };
    }
    function ri(n, e, t) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let o = n.head, r = o.id, i = o.section, s = n.tail, c = aA(Ue(i, e));
        return B1(t || c, i, { $: "Card", id: r }, uA(s, i, false));
      }
    }
    function J1(n) {
      return ri(n, "", true);
    }
    function D1(n) {
      for (; ; ) {
        let e = n;
        if (e.$ === "Nil") return { $: "Nil" };
        {
          let t = e.head;
          if (t.$ === "Header") {
            n = e.tail;
            continue;
          } else {
            let o = t.id, r = e.tail;
            return { $: "Con", head: o, tail: lA(r) };
          }
        }
      }
    }
    function R1(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let t = n.head.id, o = n.tail;
        return { $: "Con", head: t, tail: _A(o) };
      }
    }
    function Wk(n) {
      return n.$ === "Con" ? n.head.$ === "Header" : false;
    }
    function Uk(n, e, t, o) {
      return { $: "Entry", id: n, section: e, ink: fo(t), quoted: o };
    }
    function W1(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = n.tail;
        return { $: "Con", head: fo(e), tail: ni(t) };
      }
    }
    function ii(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let t = n.head.id, o = n.tail;
        return { $: "Con", head: { $: "Card", id: t }, tail: fA(o) };
      }
    }
    function Qk(n, e, t) {
      return t ? J1(m1(ni(n), e)) : ii(m1(ni(n), e));
    }
    function U1(n, e, t) {
      return n ? e : t;
    }
    function Q1(n, e) {
      return H1($A(n, e));
    }
    function Hk(n, e) {
      return H1(p1(n, e));
    }
    function Gk(n, e) {
      return n ? e : false;
    }
    function Kk(n) {
      return !n;
    }
    function H1(n) {
      return n.$ === "EQ";
    }
    function Vk(n, e) {
      return Yk(n, e, { $: "EQ" });
    }
    function Yk(n, e, t) {
      for (; ; ) {
        let o = n, r = e, i = t;
        if (o === "") return r !== "" && i.$ === "EQ" ? { $: "LT" } : i;
        {
          let s = o.slice(0, lo(o)), c = h1(s), a = o.slice(lo(o));
          if (r === "") return i.$ === "EQ" ? { $: "GT" } : i;
          {
            let $ = r.slice(0, lo(r)), N = h1($), k = r.slice(lo(r));
            if (i.$ === "EQ") {
              n = a, e = k, t = p1(c, N);
              continue;
            } else return i;
          }
        }
      }
    }
    var Ue = Q1;
    var _o = U1;
    var g1 = b1;
    var Xk = dt;
    var si = x1;
    var G1 = v1;
    var K1 = y1;
    var Zk = ti;
    var nA = j1;
    var fo = ei;
    var eA = w1;
    var tA = E1;
    var oA = P1;
    var rA = q1;
    var iA = N1;
    var ci = I1;
    var V1 = M1;
    var sA = oi;
    var cA = T1;
    var aA = Kk;
    var uA = ri;
    var lA = D1;
    var _A = R1;
    var ni = W1;
    var fA = ii;
    var m1 = O1;
    var $A = Vk;
    var dA = { "ink:key": F((n) => $t(j(dt(n))), 1), "ink:parse": F((n) => j(ei($e(n))), 1), "ink:index": F((n) => j(b1(n)), 1), "ink:at": F((n) => j(w1(d1(n))), 1), "ink:same": F((n, e) => j(N1(n, e)), 2), "ink:is_color": F((n) => j(x1(n)), 1), "ink:color_pair": F((n) => j(y1(n)), 1), "ink:value_ink": F((n) => j(z1(n)), 1), "ink:pair_ink": F((n) => j(C1(n)), 1), "ink:choose": F((n, e, t) => j(S1(n, e, t)), 3), "ink:get": F((n) => j(v1(n)), 1), "ink:place": F((n, e, t, o, r) => j(k1(n, e, t, o, r)), 5), "ink:set": F((n, e) => j(ti(n, e)), 2), "ink:keep": F((n, e, t) => j(A1(n, e, t)), 3), "ink:others": F((n) => j(j1(n)), 1), "ink:normal": F((n) => $t(j(Bk($e(n)))), 1), "ink:stored": F((n) => $t(j(Jk(n))), 1), "ink:recolor": F((n, e) => j(Dk(n, $e(e))), 2), "ink:shortcut_key": F((n) => $t(j(F1(n))), 1), "ink:shortcut": F((n) => $t(j(Rk(d1(n)))), 1), length: F((n) => j(E1(n)), 1), annotations: F((n) => j(P1(n)), 1), notes: F((n) => j(q1(n)), 1), has: F((n, e) => j(I1(n, e)), 2), ink_of: F((n) => j(M1(n)), 1), keep: F((n, e, t) => j(L1(n, e, t)), 3), only: F((n, e) => j(oi(n, e)), 2), visible: F((n, e) => j(O1(n, e)), 2), all_have: F((n, e) => j(T1(n, e)), 2), lead: F((n, e, t, o) => j(B1(n, $e(e), t, o)), 4), rows_from: F((n, e, t) => j(ri(n, $e(e), t)), 3), rows: F((n) => j(J1(n)), 1), cards: F((n) => j(D1(n)), 1), ids: F((n) => j(R1(n)), 1), opens_with_header: F((n) => j(Wk(n)), 1), entry: F((n, e, t, o) => j(Uk($e(n), $e(e), $e(t), o)), 4), filter: F((n) => j(W1(n)), 1), flat: F((n) => j(ii(n)), 1), listing: F((n, e, t) => j(Qk(n, e, t)), 3) };
    function $n(n, e = 0) {
      return n[e] === "\uDC00" ? 4 : n.codePointAt(e) > 65535 ? 2 : 1;
    }
    function $o(n) {
      return n.length < 4 ? n.codePointAt(0) : (n.charCodeAt(1) << 22 | n.charCodeAt(2) << 11 | n.charCodeAt(3)) >>> 0;
    }
    function ht(n) {
      return n.replace(/\uDC00[^]{3}/gu, "\uFFFD");
    }
    function Dn(n) {
      return n.replace(/\p{Cs}/gu, "\uFFFD");
    }
    function rn(n) {
      for (; n !== null && typeof n == "object" && n.$ === "$JMP"; ) n = n.f(n.x);
      return n;
    }
    function sn(n, e) {
      return (...t) => t.length < e ? sn((...o) => n(...t, ...o), e - t.length) : rn(n(...t));
    }
    function Z1(n) {
      if (n === "") return ">";
      {
        let e = n.slice(0, $n(n)), t = n.slice($n(n));
        return ">" + (" " + (e + t));
      }
    }
    function nb(n) {
      if (n !== "") {
        let e = n.slice(0, $n(n));
        if ($o(e) == 62) {
          let o = n.slice($n(n));
          if (o === "") return { $: "Some", value: "" };
          {
            let r = o.slice(0, $n(o));
            if ($o(r) == 32) {
              let s = o.slice($n(o));
              if (s !== "") {
                let c = s.slice(0, $n(s)), a = s.slice($n(s));
                return { $: "Some", value: c + a };
              } else return { $: "None" };
            } else return { $: "None" };
          }
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function ai(n) {
      if (n.$ === "Nil") return { $: "Nil" };
      {
        let e = n.head, t = n.tail;
        return { $: "Con", head: pA(e), tail: _b(t) };
      }
    }
    function eb(n, e) {
      if (n.$ === "Some") {
        let t = n.value;
        if (e.$ === "Some") {
          let o = e.value;
          return { $: "Some", value: { $: "Con", head: t, tail: o } };
        } else return { $: "None" };
      } else return { $: "None" };
    }
    function tb(n) {
      if (n.$ === "Nil") return { $: "Some", value: { $: "Nil" } };
      {
        let e = n.head, t = n.tail;
        return eb(bA(e), wA(t));
      }
    }
    function ob(n) {
      let e = Y1(n, `
`), t = Y1(n, "\r");
      return e || t;
    }
    function rb(n, e) {
      return n ? " " : e;
    }
    function ui(n) {
      if (n === "") return "";
      {
        let e = n.slice(0, $n(n)), t = n.slice($n(n));
        return NA(fb(e), e) + $b(t);
      }
    }
    function ib(n) {
      if (n === "") return false;
      {
        let e = n.slice(0, $n(n)), t = n.slice($n(n)), o = fb(e), r = xA(t);
        return o || r;
      }
    }
    function sb(n, e) {
      if (n.$ === "Nil") return e;
      {
        let t = n.head, o = n.tail;
        if (e.$ === "Nil") return { $: "Con", head: t, tail: o };
        {
          let r = e.head, i = e.tail;
          return lb({ $: "Con", head: t, tail: o }, { $: "Con", head: "", tail: { $: "Con", head: r, tail: i } });
        }
      }
    }
    function cb(n) {
      let e = n.quote, t = n.comment;
      return sb(e, t);
    }
    function ab(n) {
      let e = n.title;
      return ui(e);
    }
    function ub(n, e) {
      let t = $b(n), o = "] " + e;
      return "> [!" + (t + o);
    }
    function hA(n, e) {
      if (n === "") return ai(X1(e));
      {
        let t = n.slice(0, $n(n)), o = n.slice($n(n));
        return { $: "Con", head: zA(t + o, yA(e)), tail: _b(X1(e)) };
      }
    }
    function gA(n, e) {
      return n === "" ? e : e.$ === "Nil" ? { $: "Nil" } : e.tail;
    }
    function mA(n, e) {
      let t = $o(n), o = $o(e);
      return t === o;
    }
    function lb(n, e) {
      if (n.$ === "Nil") return e;
      {
        let t = n.head, o = n.tail;
        return { $: "Con", head: t, tail: CA(o, e) };
      }
    }
    var pA = Z1;
    var _b = ai;
    var bA = nb;
    var wA = tb;
    var Y1 = mA;
    var fb = ob;
    var NA = rb;
    var $b = ui;
    var xA = ib;
    var X1 = cb;
    var yA = ab;
    var zA = ub;
    var CA = lb;
    var SA = { quote_line: sn((n) => ht(rn(Z1(Dn(n)))), 1), unquote_line: sn((n) => rn(nb(Dn(n))), 1), quote_lines: sn((n) => rn(ai(n)), 1), prepend: sn((n, e) => rn(eb(n, e)), 2), unquote_lines: sn((n) => rn(tb(n)), 1), is_break: sn((n) => rn(ob(Dn(n))), 1), flat: sn((n, e) => ht(rn(rb(n, Dn(e)))), 2), single_line: sn((n) => ht(rn(ui(Dn(n)))), 1), has_break: sn((n) => rn(ib(Dn(n))), 1), join: sn((n, e) => rn(sb(n, e)), 2), body: sn((n) => rn(cb(n)), 1), title_of: sn((n) => ht(rn(ab(n))), 1), heading: sn((n, e) => ht(rn(ub(Dn(n), Dn(e)))), 2), block: sn((n, e) => rn(hA(Dn(n), e)), 2), block_body: sn((n, e) => rn(gA(Dn(n), e)), 2) };
    function vA(n, e) {
      return { $: n < e ? "LT" : n === e ? "EQ" : "GT" };
    }
    function li(n) {
      if (n > 281474976710655) throw "bend: a Nat past the largest immediate 2^48-1";
      return n;
    }
    function E(n) {
      if (!Number.isInteger(n) || n < 0 || n > 2 ** 53) throw "bend: expected a Nat host number: an integer from 0 to 2^53";
      return n;
    }
    function R(n) {
      for (; n !== null && typeof n == "object" && n.$ === "$JMP"; ) n = n.f(n.x);
      return n;
    }
    function W(n, e) {
      return (...t) => t.length < e ? W((...o) => n(...t, ...o), e - t.length) : R(n(...t));
    }
    function Nb(n) {
      return n.start;
    }
    function xb(n) {
      return n.size;
    }
    function yb(n) {
      let e = n.start, t = n.size;
      return li(e + t);
    }
    function zb(n, e) {
      return $i(n, IA(e));
    }
    function Cb(n, e) {
      let t = n > e ? n : e, o = n < e ? n : e;
      return { $: "Span", start: n < e ? n : e, size: t < o ? 0 : t - o };
    }
    function Sb(n, e, t) {
      return Cb(e < n ? e : n, t < n ? t : n);
    }
    function vb(n, e, t) {
      let o = e.start, r = e.size, i = li(o + t), s = n < r ? 0 : n - r;
      return { $: "Span", start: i < s ? i : s, size: r };
    }
    function kb(n, e) {
      let t = n.start, o = n.size;
      return { $: "Span", start: t < e ? 0 : t - e, size: o };
    }
    function Ab(n, e, t) {
      let o = e.start, r = e.size, i = li(r + t), s = n < o ? 0 : n - o;
      return { $: "Span", start: o, size: i < s ? i : s };
    }
    function jb(n, e, t) {
      let o = e.start, r = e.size, i = r < t ? 0 : r - t, s = i > n ? i : n;
      return { $: "Span", start: o, size: r < s ? r : s };
    }
    function Fb(n, e) {
      return $i(gt(e), n);
    }
    function Eb(n, e, t, o) {
      let r = e.start, i = e.size, s = t.start, c = t.size;
      return o ? { $: "Some", value: { $: "Area", page: n, x: r, y: s, w: i, h: c } } : { $: "None" };
    }
    function Pb(n, e, t, o) {
      return di(go(e, 1), mo(db(n, t), db(n, o)));
    }
    function qb(n, e, t, o) {
      return Eb(e, t, o, MA(n, e, t, o));
    }
    function kA(n, e, t, o, r, i, s) {
      return qb(e, t, hb(n, o, i), hb(n, r, s));
    }
    function _i(n, e) {
      let t = e.page, o = e.x, r = e.y, i = e.w, s = e.h;
      return di(go(t, 1), mo(go(i, 1), mo(go(s, 1), mo(gb(n, { $: "Span", start: o, size: i }), gb(n, { $: "Span", start: r, size: s })))));
    }
    function AA(n, e) {
      if (e.$ === "None") return true;
      {
        let t = e.value;
        return _i(n, t);
      }
    }
    function jA(n) {
      let e = n.x, t = n.y;
      return { $: "Point", across: e, down: t };
    }
    function FA(n) {
      let e = n.w, t = n.h;
      return { $: "Point", across: e, down: t };
    }
    function Ib(n, e, t, o) {
      let r = e.page, i = e.x, s = e.y, c = e.w, a = e.h;
      return t.$ === "Left" ? { $: "Area", page: r, x: ho(mb({ $: "Span", start: i, size: c }, o)), y: s, w: c, h: a } : t.$ === "Right" ? { $: "Area", page: r, x: ho(pb(n, { $: "Span", start: i, size: c }, o)), y: s, w: c, h: a } : t.$ === "Up" ? { $: "Area", page: r, x: i, y: ho(mb({ $: "Span", start: s, size: a }, o)), w: c, h: a } : { $: "Area", page: r, x: i, y: ho(pb(n, { $: "Span", start: s, size: a }, o)), w: c, h: a };
    }
    function Mb(n, e, t, o, r) {
      let i = t.page, s = t.x, c = t.y, a = t.w, $ = t.h;
      return o.$ === "Left" ? { $: "Area", page: i, x: s, y: c, w: gt(bb(e, { $: "Span", start: s, size: a }, r)), h: $ } : o.$ === "Right" ? { $: "Area", page: i, x: s, y: c, w: gt(wb(n, { $: "Span", start: s, size: a }, r)), h: $ } : o.$ === "Up" ? { $: "Area", page: i, x: s, y: c, w: a, h: gt(bb(e, { $: "Span", start: c, size: $ }, r)) } : { $: "Area", page: i, x: s, y: c, w: a, h: gt(wb(n, { $: "Span", start: c, size: $ }, r)) };
    }
    function Lb(n, e, t) {
      return n ? t : e;
    }
    function fi(n, e, t) {
      return Lb(LA(n, t), e, t);
    }
    function EA(n, e, t, o) {
      return fi(n, e, OA(n, e, t, o));
    }
    function PA(n, e, t, o, r) {
      return fi(n, t, TA(n, e, t, o, r));
    }
    function $i(n, e) {
      return qA(vA(n, e));
    }
    function di(n, e) {
      return n ? e : false;
    }
    function qA(n) {
      return n.$ !== "LT";
    }
    var IA = yb;
    var gt = xb;
    var go = $i;
    var db = Fb;
    var mo = di;
    var MA = Pb;
    var hb = Sb;
    var gb = zb;
    var mb = kb;
    var ho = Nb;
    var pb = vb;
    var bb = jb;
    var wb = Ab;
    var LA = _i;
    var OA = Ib;
    var TA = Mb;
    var BA = { start: W((n) => R(Nb(n)), 1), size: W((n) => R(xb(n)), 1), far: W((n) => R(yb(n)), 1), within: W((n, e) => R(zb(E(n), e)), 2), between: W((n, e) => R(Cb(E(n), E(e))), 2), span: W((n, e, t) => R(Sb(E(n), E(e), E(t))), 3), later: W((n, e, t) => R(vb(E(n), e, E(t))), 3), earlier: W((n, e) => R(kb(n, E(e))), 2), grow: W((n, e, t) => R(Ab(E(n), e, E(t))), 3), shrink: W((n, e, t) => R(jb(E(n), e, E(t))), 3), roomy: W((n, e) => R(Fb(E(n), e)), 2), make: W((n, e, t, o) => R(Eb(E(n), e, t, o)), 4), accepts: W((n, e, t, o) => R(Pb(E(n), E(e), t, o)), 4), frame: W((n, e, t, o) => R(qb(E(n), E(e), t, o)), 4), fit: W((n, e, t, o, r, i, s) => R(kA(E(n), E(e), E(t), E(o), E(r), E(i), E(s))), 7), valid: W((n, e) => R(_i(E(n), e)), 2), sound: W((n, e) => R(AA(E(n), e)), 2), corner: W((n) => R(jA(n)), 1), extent: W((n) => R(FA(n)), 1), moved: W((n, e, t, o) => R(Ib(E(n), e, t, E(o))), 4), resized: W((n, e, t, o, r) => R(Mb(E(n), E(e), t, o, E(r))), 5), pick: W((n, e, t) => R(Lb(n, e, t)), 3), guard: W((n, e, t) => R(fi(E(n), e, t)), 3), move: W((n, e, t, o) => R(EA(E(n), e, t, E(o))), 4), resize: W((n, e, t, o, r) => R(PA(E(n), E(e), t, o, E(r))), 5) };
    var JA = (n) => typeof n == "string" ? n : "";
    function DA(n) {
      let e = le(n);
      if (e.$ !== "JObject") throw new Error("Annotation JSON must be an object");
      return e;
    }
    function Ob(n, e) {
      let t = DA(n);
      return _e({ ...t, members: $1.recolor(t.members, JA(e)) });
    }
    var Tb = /* @__PURE__ */ new WeakMap();
    function Bb(n) {
      if (n && typeof n == "object" && !Object.isFrozen(n)) {
        Object.freeze(n);
        for (let e of Object.values(n)) Bb(e);
      }
      return n;
    }
    function Jb(n) {
      let e = n.fields, t = Tb.get(e);
      if (t) return { ...t };
      let o = { display: wn(e.display).join(`
`) };
      e.comment.$ === "Some" && (o.comment = wn(e.comment.value).join(`
`)), e.tags.$ === "Some" && (o.tags = e.tags.value);
      let r = Rp(Hr(n.id, e.json, o));
      for (let s of r.target?.[0]?.selector || []) s.type === "TextQuoteSelector" && (typeof s.prefix == "string" && (s.prefix = Gr(s.prefix)), typeof s.suffix == "string" && (s.suffix = Gr(s.suffix)));
      let i = Bb(r);
      return Tb.set(e, i), { ...i };
    }
    function de(n) {
      return Pn(n).blocks.map((e) => Jb(e));
    }
    function RA(n) {
      try {
        return { records: de(n), problems: [] };
      } catch (e) {
        let t;
        try {
          t = zr(n);
        } catch {
          throw e;
        }
        let o = [], r = /* @__PURE__ */ new Set(), i = t.diagnostics.map((s) => ({ line: Number(s.line) || 1, message: String(s.message) }));
        for (let s of t.blocks) if (!r.has(s.id)) {
          r.add(s.id);
          try {
            o.push(Jb(s));
          } catch (c) {
            i.push({ line: 1, message: `Annotation ${s.id} could not be read: ${String(c?.message || c)}` });
          }
        }
        return i.length || i.push({ line: 1, message: String(e?.message || e) }), { records: o, problems: i.sort((s, c) => s.line - c.line) };
      }
    }
    function WA(n, e, t) {
      if (de(n).some((o) => o.id === e.id)) throw new Error(`Duplicate annotation ID ${e.id}`);
      return Kr(n, e, e.id, t).source;
    }
    function UA(n, e) {
      let t = de(n).find(($) => $.id === e.id);
      if (!t) throw new Error("Annotation was removed externally; reload before editing.");
      let { text: o, tags: r, ...i } = t, { text: s, tags: c, ...a } = e;
      if (JSON.stringify(i) !== JSON.stringify(a)) throw new Error("Only comment and tag edits are supported here; annotation metadata changed.");
      return ve(n, e.id, { comment: s.split(`
`), tags: ut(c) });
    }
    function QA(n, e, t) {
      let o = Pn(n).blocks.find((i) => i.id === e);
      if (!o) throw new Error("Annotation was removed externally; reload before recolouring.");
      let r = ve(n, e, { json: Ob(o.fields.json, t) });
      return de(r), r;
    }
    function HA(n, e, t, o) {
      if (!/^[\w=&:.,]+$/.test(o)) throw new Error("This annotation's region cannot be rewritten in place.");
      return Db(n, e, t, o);
    }
    function Db(n, e, t, o) {
      let r = Pn(n).blocks.find((a) => a.id === e);
      if (!r) throw new Error("Annotation was removed externally; reload before moving its region.");
      let i = r.fields.json, s = i.split(JSON.stringify(t));
      if (s.length !== 2) throw new Error("This annotation's region cannot be rewritten in place.");
      let c = ve(n, e, { json: s.join(JSON.stringify(o)) });
      return de(c), c;
    }
    function GA(n, e) {
      return Wp(n, e).source;
    }
    function KA(n, e, t) {
      let o = de(n).find((N) => N.id === e.id);
      if (!o) return Kr(n, e, e.id, t).source;
      let r = Pn(n).blocks.find((N) => N.id === e.id), i = le(r.fields.json), s = wn(i.members), c = Object.entries(e).filter(([N, k]) => !["id", "text", "tags"].includes(N) && JSON.stringify(k) !== JSON.stringify(o[N]));
      for (let [N, k] of c) {
        if (k === void 0) throw new Error(`Cannot store undefined field ${N}`);
        let O = s.findIndex((M) => M.key === N), q = { $: "JsonPair", key: N, value: co(O < 0 ? void 0 : s[O].value, k) };
        O < 0 ? s.push(q) : s[O] = q;
      }
      let a = { comment: (e.text ?? o.text).split(`
`), tags: ut(e.tags ?? o.tags) };
      if (c.length && (a.json = _e({ ...i, members: Ae(s) }), c.some(([N]) => N === "target"))) {
        let N = e.target?.[0]?.selector?.find((M) => M.type === "TextQuoteSelector"), k = t?.includePrefix !== false ? `%%PREFIX%%${fe((N?.prefix || "").trim())}` : "", O = t?.includePostfix !== false ? `%%POSTFIX%%${fe((N?.suffix || "").trim())}` : "", q = t?.highlightHighlightedText !== false;
        a.display = `*${k}%%HIGHLIGHT%%${q ? " ==" : ""}${fe((N?.exact || "").trim())}${q ? "== " : ""}${O}*`;
      }
      let $ = ve(n, e.id, a);
      return de($), $;
    }
  }
});

// ../../src/annotationUtils.tsx
var import_codec = __toESM(require_codec());

// ../../src/constants.ts
var SAMPLE_PDF_URL = "https://arxiv.org/pdf/1702.08734.pdf";

// ../../src/annotationUtils.tsx
var makeAnnotationBlockRegex = (annotationId) => new RegExp(
  "(?<annotationBlock>^\n(>.*?\n)*?>```annotation-json(\n>.*?)*?)\n\\^(?<annotationId>" + (annotationId ? annotationId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "[a-zA-Z0-9-]+") + ")\n",
  "gm"
);
var getAnnotationFromAnnotationBlock = (annotationBlock, annotationId) => {
  const contentRegex = makeAnnotationContentRegex();
  const content = annotationBlock.split("\n").map((x) => x.substr(1)).join("\n");
  const {
    groups: { annotationJson, prefix, highlight, postfix, comment, tags }
  } = contentRegex.exec(content);
  const annotation = JSON.parse(annotationJson);
  const annotationTarget = annotation.target?.[0];
  if (annotationTarget && "selector" in annotationTarget) {
    annotationTarget.selector = annotationTarget.selector.map(
      (x) => x.type == "TextQuoteSelector" ? { ...x, prefix: prefix ?? x.prefix, exact: x.exact ?? highlight, suffix: postfix ?? x.suffix } : x
    );
  }
  annotation.text = comment;
  annotation.tags = tags.split(",").map((x) => x.trim().substr(1)).filter((x) => x);
  if ("group" in annotation) {
    delete annotation.group;
  }
  return { ...makeDefaultAnnotationObject(annotationId, annotation.tags), ...annotation };
};
var makeAnnotationContentRegex = () => new RegExp(
  [
    "(.|\\n)*?",
    "%%\\n",
    "```annotation-json\\n",
    "(?<annotationJson>(.|\\n)*?)\\n",
    "```\\n",
    "%%(.|\\n)*?\\*",
    "(%%PREFIX%%(?<prefix>(.|\\n)*?))?",
    "(%%HIGHLIGHT%%( ==)?(?<highlight>(.|\\n)*?)(== )?)?",
    "(%%POSTFIX%%(?<postfix>(.|\\n)*?))?\\*\\n",
    "(%%LINK%%(?<link>(.|\\n)*?)\\n)?",
    "(%%COMMENT%%\\n(?<comment>(.|\\n)*?)\\n)?",
    "(%%TAGS%%\\n(?<tags>(.|\\n)*))?",
    "$"
  ].join(""),
  "g"
);
var getAnnotationHighlightTextData = (annotation) => {
  let prefix = "";
  let exact = "";
  let suffix = "";
  annotation.target?.[0]?.selector?.forEach((x) => {
    if (x.type == "TextQuoteSelector") {
      prefix = x.prefix || "";
      exact = x.exact || "";
      suffix = x.suffix || "";
    }
  });
  return { prefix, exact, suffix };
};
function getAnnotationFromFileContent(annotationId, fileContent) {
  fileContent = fileContent.replace(/\r\n/g, "\n");
  const annotationRegex = makeAnnotationBlockRegex(annotationId);
  let m;
  if ((m = annotationRegex.exec(fileContent)) !== null) {
    if (m.index === annotationRegex.lastIndex) {
      annotationRegex.lastIndex++;
    }
    const {
      groups: { annotationBlock, annotationId: annotationId2 }
    } = m;
    return getAnnotationFromAnnotationBlock(annotationBlock, annotationId2);
  } else {
    return null;
  }
}
var makeDefaultAnnotationObject = (annotationId, tags) => ({
  group: "__world__",
  permissions: { read: ["Obsidian User"], update: ["Obsidian User"], delete: ["Obsidian User"] },
  tags,
  text: "",
  user: "Obsidian User",
  user_info: { display_name: "Obsidian User" },
  hidden: false,
  target: [],
  links: {},
  flagged: false,
  id: annotationId
});
var stripDefaultValues = (obj, defaultObj) => {
  const strippedObject = {};
  const toIgnore = ["group", "permissions", "user", "user_info"];
  for (const key of Object.keys(obj)) {
    if (JSON.stringify(obj[key]) !== JSON.stringify(defaultObj[key]) && !toIgnore.includes(key)) {
      strippedObject[key] = obj[key];
    }
  }
  return strippedObject;
};
function writeAnnotationToAnnotationFileString(annotation, annotationFileString, annotatorSettingsObject) {
  const id = annotation.id || Math.random().toString(36).substr(2);
  const response = { ...JSON.parse(JSON.stringify(annotation)), id, flagged: false };
  const source = (0, import_codec.write)(
    annotationFileString ?? "",
    response,
    annotatorSettingsObject.settings.annotationMarkdownSettings
  );
  return { newAnnotationFileString: source, newAnnotation: response };
}
function loadAnnotationsAtUriFromFileText(url, fileText) {
  if (fileText !== null) fileText = fileText.replace(/\r\n/g, "\n");
  const params = url ? Object.fromEntries(url.searchParams.entries()) : null;
  if (params?.uri == "app://obsidian.md/index.html") {
    return { rows: [], total: 0 };
  }
  const rows = [];
  const annotationRegex = makeAnnotationBlockRegex();
  if (fileText !== null) {
    let m;
    while ((m = annotationRegex.exec(fileText)) !== null) {
      if (m.index === annotationRegex.lastIndex) {
        annotationRegex.lastIndex++;
      }
      const {
        groups: { annotationBlock, annotationId }
      } = m;
      const completeAnnotation = getAnnotationFromAnnotationBlock(annotationBlock, annotationId);
      const annotationDocumentIdentifiers = [
        completeAnnotation.document?.documentFingerprint,
        completeAnnotation.uri
      ];
      if (url === null || // The offline iframe's physical origin/path can change between
      // hosts. EPUB sections are scoped by this annotation note and
      // identified by the canonical manifest href in ?loc=.
      annotationDocumentIdentifiers.some((identifier) => {
        if (typeof identifier !== "string" || typeof params?.uri !== "string") return false;
        try {
          const requested = new URL(params.uri).searchParams.get("loc");
          return requested !== null && new URL(identifier).searchParams.get("loc") === requested;
        } catch {
          return false;
        }
      }) || annotationDocumentIdentifiers.includes(params.uri) || annotationDocumentIdentifiers.includes(encodeURI(params.uri)) || annotationDocumentIdentifiers.includes(decodeURI(params.uri)) || annotationDocumentIdentifiers.includes(SAMPLE_PDF_URL)) {
        rows.push(completeAnnotation);
      }
    }
  }
  return { rows, total: rows.length };
}
function deleteAnnotationFromAnnotationFileString(annotationId, annotationFileString) {
  return annotationFileString === null ? null : (0, import_codec.remove)(annotationFileString, annotationId);
}
function checkPseudoAnnotationEquality(annotation, pseudoAnnotation) {
  const isPageNote = !annotation.target?.length;
  if (isPageNote) {
    return false;
  }
  const selectors = new Set(annotation.target[0].selector.map((x) => JSON.stringify(x)));
  return pseudoAnnotation?.target?.[0]?.selector?.map((x) => selectors.has(JSON.stringify(x))).reduce((a, b) => a || b);
}
export {
  checkPseudoAnnotationEquality,
  deleteAnnotationFromAnnotationFileString,
  getAnnotationFromFileContent,
  getAnnotationHighlightTextData,
  loadAnnotationsAtUriFromFileText,
  makeDefaultAnnotationObject,
  stripDefaultValues,
  writeAnnotationToAnnotationFileString
};
