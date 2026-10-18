import { describe, expect, it } from 'vitest';
import {
  detectPresentationFormat,
  sanitizeFilename,
} from '@/lib/storage/presentation-file';

const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const ZIP_HEADER = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
const OLE2_HEADER = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ELF_HEADER = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]);

describe('detectPresentationFormat', () => {
  it('detects a PDF presented as .pdf', () => {
    expect(detectPresentationFormat(PDF_HEADER, '.pdf')).toEqual({
      format: 'pdf',
      mimeType: 'application/pdf',
    });
  });

  it('detects a pptx presented as .pptx', () => {
    expect(detectPresentationFormat(ZIP_HEADER, '.pptx')).toEqual({
      format: 'pptx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
  });

  it('detects legacy .ppt', () => {
    expect(detectPresentationFormat(OLE2_HEADER, '.ppt')).toEqual({
      format: 'ppt',
      mimeType: 'application/vnd.ms-powerpoint',
    });
  });

  // The core of the check: content and extension must agree.
  it('rejects a ZIP renamed to .pdf', () => {
    expect(detectPresentationFormat(ZIP_HEADER, '.pdf')).toBeNull();
  });

  it('rejects a PDF renamed to .pptx', () => {
    expect(detectPresentationFormat(PDF_HEADER, '.pptx')).toBeNull();
  });

  it('rejects an executable with any accepted extension', () => {
    expect(detectPresentationFormat(ELF_HEADER, '.pdf')).toBeNull();
    expect(detectPresentationFormat(ELF_HEADER, '.pptx')).toBeNull();
    expect(detectPresentationFormat(ELF_HEADER, '.ppt')).toBeNull();
  });

  it('rejects a truncated header', () => {
    expect(detectPresentationFormat(new Uint8Array([0x25, 0x50]), '.pdf')).toBeNull();
  });

  it('rejects an empty buffer', () => {
    expect(detectPresentationFormat(new Uint8Array(), '.pdf')).toBeNull();
  });

  it('is case insensitive about the extension', () => {
    expect(detectPresentationFormat(PDF_HEADER, '.PDF')).not.toBeNull();
  });
});

describe('sanitizeFilename', () => {
  it('keeps a reasonable name intact', () => {
    expect(sanitizeFilename('Fieldnote pitch v2.pdf')).toBe('Fieldnote pitch v2.pdf');
  });

  it('strips directory components from a traversal attempt', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('..\\..\\windows\\system32\\config')).toBe('config');
  });

  it('removes a leading dot so the file is not hidden', () => {
    expect(sanitizeFilename('.bashrc')).toBe('bashrc');
  });

  it('replaces characters that are unsafe in a header value', () => {
    expect(sanitizeFilename('pitch";drop.pdf')).toBe('pitch__drop.pdf');
  });

  it('strips control characters', () => {
    expect(sanitizeFilename('pitch\u0000\u001f.pdf')).toBe('pitch.pdf');
  });

  it('falls back to a default when nothing usable remains', () => {
    expect(sanitizeFilename('...')).toBe('presentation');
    expect(sanitizeFilename('')).toBe('presentation');
  });

  it('truncates an absurdly long name', () => {
    expect(sanitizeFilename(`${'a'.repeat(500)}.pdf`).length).toBeLessThanOrEqual(120);
  });
});
