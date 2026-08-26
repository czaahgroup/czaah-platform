// Generates a short, shareable meeting room code in the same visual style
// as Google Meet links (e.g. "abc-defg-hij") — no database record needed,
// the code itself *is* the room: whoever has the link can join.
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

function randomSegment(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += LETTERS[Math.floor(Math.random() * LETTERS.length)]
  }
  return out
}

export function generateMeetingCode(): string {
  return `${randomSegment(3)}-${randomSegment(4)}-${randomSegment(3)}`
}
