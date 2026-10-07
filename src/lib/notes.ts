import sanitizeHtml from "sanitize-html";

export function sanitizeNotes(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "div", "strong", "b", "em", "i", "ul", "ol", "li", "h1", "h2", "h3", "blockquote"],
    allowedAttributes: {},
  });
}
