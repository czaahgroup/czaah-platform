// Stub for postal-mime, aliased in next.config.ts.
// resend's SDK statically imports postal-mime purely for parsing inbound
// email MIME content (its `resend.emails.receive()`-style helpers). This app
// only ever sends outbound email via resend.emails.send() (see
// src/lib/resend/client.ts) and never receives or parses inbound mail, so
// this stub only needs to fail the same way the real package would if it
// were genuinely missing, the same approach as src/stubs/react-email-render.ts.
const PostalMime = {
  parse(): never {
    throw new Error('postal-mime is not installed — inbound email parsing is not supported in this app.')
  },
}

export default PostalMime
