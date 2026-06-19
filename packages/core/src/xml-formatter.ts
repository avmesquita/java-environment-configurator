export function formatXml(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  const lines = normalized.replace(/>\s*</g, '>\n<').split('\n');
  let indent = 0;
  const formatted: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith('</')) {
      indent = Math.max(0, indent - 1);
    }

    formatted.push(`${'  '.repeat(indent)}${line}`);

    const isOpeningTag = line.startsWith('<') && !line.startsWith('</') && !line.startsWith('<?') && !line.endsWith('/>');
    const closesInline = line.includes('</') && line.indexOf('</') > line.indexOf('>');
    if (isOpeningTag && !closesInline) {
      indent += 1;
    }
  }

  return `${formatted.join('\n')}\n`;
}
