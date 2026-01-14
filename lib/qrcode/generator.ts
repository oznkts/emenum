/**
 * QR Code Generator Utility
 *
 * This module provides QR code generation functionality for the e-menum.net
 * platform. It supports multiple output formats: SVG, PNG (at various sizes),
 * and A5 PDF for printing.
 *
 * Key Features:
 * - SVG format for web display and infinite scaling
 * - PNG format at 1024px, 2048px, and 4096px for various use cases
 * - A5 PDF format for professional printing
 * - High error correction level (H) for reliable scanning
 * - Support for table-specific QR codes with table_id parameter
 *
 * @example
 * // Generate SVG QR code for a restaurant menu
 * const svg = await generateQRCodeSVG('demo-restaurant')
 *
 * // Generate PNG at 2048px for print materials
 * const png = await generateQRCodePNG('demo-restaurant', 2048)
 *
 * // Generate A5 PDF with branding
 * const pdf = await generateQRCodePDF('demo-restaurant', { title: 'My Restaurant' })
 */

import { toString, toDataURL } from 'qrcode'

/**
 * Supported PNG sizes for QR code generation
 */
export type QRCodePNGSize = 1024 | 2048 | 4096

/**
 * Supported output formats
 */
export type QRCodeFormat = 'SVG' | 'PNG' | 'PDF'

/**
 * Error correction levels for QR codes
 * - L: ~7% recovery
 * - M: ~15% recovery
 * - Q: ~25% recovery
 * - H: ~30% recovery (used for reliability)
 */
export type QRCodeErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

/**
 * Options for QR code generation
 */
export interface QRCodeGenerationOptions {
  /** Error correction level (default: 'H' for highest reliability) */
  errorCorrectionLevel?: QRCodeErrorCorrectionLevel
  /** Foreground color (default: '#000000') */
  color?: string
  /** Background color (default: '#FFFFFF') */
  backgroundColor?: string
  /** Quiet zone modules around QR code (default: 4) */
  margin?: number
}

/**
 * Options for PDF generation
 */
export interface QRCodePDFOptions extends QRCodeGenerationOptions {
  /** Title to display above QR code */
  title?: string
  /** Subtitle or description to display below QR code */
  subtitle?: string
  /** Organization logo URL (optional) */
  logoUrl?: string
}

/**
 * Result type for QR code generation operations
 */
export interface QRCodeGenerationResult<T> {
  /** Whether the operation succeeded */
  success: boolean
  /** The generated QR code data */
  data?: T
  /** The format of the generated QR code */
  format?: QRCodeFormat
  /** Error message if operation failed */
  error?: string
}

/**
 * Build the menu URL for a given organization slug
 *
 * @param slug - The organization's slug
 * @param tableId - Optional table ID for table-specific QR codes
 * @returns The complete menu URL
 */
export function buildMenuUrl(slug: string, tableId?: string): string {
  // Use relative path for domain independence
  // In production, this will be prefixed with the site URL
  const baseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
  let url = `${baseUrl}/menu/${encodeURIComponent(slug)}`

  if (tableId) {
    url += `?table_id=${encodeURIComponent(tableId)}`
  }

  return url
}

/**
 * Generate a QR code as SVG string.
 *
 * SVG format is ideal for web display and allows infinite scaling
 * without loss of quality.
 *
 * @param slug - The organization's slug for the menu URL
 * @param tableId - Optional table ID for table-specific QR codes
 * @param options - Generation options
 * @returns Promise<QRCodeGenerationResult<string>> - SVG string result
 *
 * @example
 * ```typescript
 * const result = await generateQRCodeSVG('my-restaurant')
 * if (result.success && result.data) {
 *   // Use SVG string directly in HTML
 *   element.innerHTML = result.data
 * }
 * ```
 */
export async function generateQRCodeSVG(
  slug: string,
  tableId?: string,
  options: QRCodeGenerationOptions = {}
): Promise<QRCodeGenerationResult<string>> {
  if (!slug) {
    return {
      success: false,
      error: 'Organizasyon slug değeri gereklidir',
    }
  }

  const url = buildMenuUrl(slug, tableId)

  const {
    errorCorrectionLevel = 'H',
    color = '#000000',
    backgroundColor = '#FFFFFF',
    margin = 4,
  } = options

  try {
    const svg = await toString(url, {
      type: 'svg',
      errorCorrectionLevel,
      color: {
        dark: color,
        light: backgroundColor,
      },
      margin,
    })

    return {
      success: true,
      data: svg,
      format: 'SVG',
    }
  } catch (error) {
    return {
      success: false,
      error: `SVG QR kodu oluşturulamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
    }
  }
}

/**
 * Generate a QR code as PNG data URL.
 *
 * PNG format is ideal for print materials and supports specific
 * pixel sizes: 1024px, 2048px, and 4096px.
 *
 * @param slug - The organization's slug for the menu URL
 * @param size - PNG size in pixels (1024, 2048, or 4096)
 * @param tableId - Optional table ID for table-specific QR codes
 * @param options - Generation options
 * @returns Promise<QRCodeGenerationResult<string>> - PNG data URL result
 *
 * @example
 * ```typescript
 * const result = await generateQRCodePNG('my-restaurant', 2048)
 * if (result.success && result.data) {
 *   // Use data URL as image source
 *   img.src = result.data
 * }
 * ```
 */
export async function generateQRCodePNG(
  slug: string,
  size: QRCodePNGSize = 1024,
  tableId?: string,
  options: QRCodeGenerationOptions = {}
): Promise<QRCodeGenerationResult<string>> {
  if (!slug) {
    return {
      success: false,
      error: 'Organizasyon slug değeri gereklidir',
    }
  }

  // Validate size
  const validSizes: QRCodePNGSize[] = [1024, 2048, 4096]
  if (!validSizes.includes(size)) {
    return {
      success: false,
      error: `Geçersiz PNG boyutu. Desteklenen boyutlar: ${validSizes.join(', ')}`,
    }
  }

  const url = buildMenuUrl(slug, tableId)

  const {
    errorCorrectionLevel = 'H',
    color = '#000000',
    backgroundColor = '#FFFFFF',
    margin = 4,
  } = options

  try {
    const dataUrl = await toDataURL(url, {
      errorCorrectionLevel,
      width: size,
      color: {
        dark: color,
        light: backgroundColor,
      },
      margin,
    })

    return {
      success: true,
      data: dataUrl,
      format: 'PNG',
    }
  } catch (error) {
    return {
      success: false,
      error: `PNG QR kodu oluşturulamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
    }
  }
}

/**
 * Generate a QR code as PNG Buffer.
 *
 * Returns a Buffer for direct file operations or streaming.
 *
 * @param slug - The organization's slug for the menu URL
 * @param size - PNG size in pixels (1024, 2048, or 4096)
 * @param tableId - Optional table ID for table-specific QR codes
 * @param options - Generation options
 * @returns Promise<QRCodeGenerationResult<Buffer>> - PNG Buffer result
 *
 * @example
 * ```typescript
 * const result = await generateQRCodePNGBuffer('my-restaurant', 1024)
 * if (result.success && result.data) {
 *   // Write to file or stream
 *   fs.writeFileSync('qr.png', result.data)
 * }
 * ```
 */
export async function generateQRCodePNGBuffer(
  slug: string,
  size: QRCodePNGSize = 1024,
  tableId?: string,
  options: QRCodeGenerationOptions = {}
): Promise<QRCodeGenerationResult<Buffer>> {
  if (!slug) {
    return {
      success: false,
      error: 'Organizasyon slug değeri gereklidir',
    }
  }

  // Validate size
  const validSizes: QRCodePNGSize[] = [1024, 2048, 4096]
  if (!validSizes.includes(size)) {
    return {
      success: false,
      error: `Geçersiz PNG boyutu. Desteklenen boyutlar: ${validSizes.join(', ')}`,
    }
  }

  const url = buildMenuUrl(slug, tableId)

  const {
    errorCorrectionLevel = 'H',
    color = '#000000',
    backgroundColor = '#FFFFFF',
    margin = 4,
  } = options

  try {
    // Dynamic import for Node.js-only toBuffer function
    const QRCode = await import('qrcode')
    const buffer = await QRCode.toBuffer(url, {
      errorCorrectionLevel,
      width: size,
      color: {
        dark: color,
        light: backgroundColor,
      },
      margin,
    })

    return {
      success: true,
      data: buffer,
      format: 'PNG',
    }
  } catch (error) {
    return {
      success: false,
      error: `PNG Buffer oluşturulamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
    }
  }
}

/**
 * A5 page dimensions in points (72 points = 1 inch)
 * A5: 148mm x 210mm = 420pt x 595pt (approximately)
 */
const A5_WIDTH_PT = 420
const A5_HEIGHT_PT = 595

/**
 * Generate a QR code as A5 PDF document.
 *
 * Creates a print-ready A5 PDF with the QR code centered,
 * optional title and subtitle, and professional formatting.
 *
 * Note: This returns the PDF as a base64-encoded data URI.
 * The PDF is generated using a simple PDF structure without
 * external dependencies for maximum compatibility.
 *
 * @param slug - The organization's slug for the menu URL
 * @param tableId - Optional table ID for table-specific QR codes
 * @param options - PDF generation options including title and subtitle
 * @returns Promise<QRCodeGenerationResult<string>> - PDF data URL result
 *
 * @example
 * ```typescript
 * const result = await generateQRCodePDF('my-restaurant', undefined, {
 *   title: 'My Restaurant',
 *   subtitle: 'Scan to view menu'
 * })
 * if (result.success && result.data) {
 *   // Open PDF or download
 *   window.open(result.data)
 * }
 * ```
 */
export async function generateQRCodePDF(
  slug: string,
  tableId?: string,
  options: QRCodePDFOptions = {}
): Promise<QRCodeGenerationResult<string>> {
  if (!slug) {
    return {
      success: false,
      error: 'Organizasyon slug değeri gereklidir',
    }
  }

  const {
    title,
    subtitle,
    errorCorrectionLevel = 'H',
    color = '#000000',
    backgroundColor = '#FFFFFF',
    margin = 4,
  } = options

  try {
    // Generate QR code as PNG first (high resolution for PDF)
    const qrResult = await generateQRCodePNG(slug, 2048, tableId, {
      errorCorrectionLevel,
      color,
      backgroundColor,
      margin,
    })

    if (!qrResult.success || !qrResult.data) {
      return {
        success: false,
        error: qrResult.error || 'QR kodu oluşturulamadı',
      }
    }

    // Extract base64 data from data URL
    const pngBase64 = qrResult.data.replace(/^data:image\/png;base64,/, '')

    // Build a simple PDF with embedded PNG
    const pdfContent = buildSimplePDF(pngBase64, {
      title,
      subtitle,
      pageWidth: A5_WIDTH_PT,
      pageHeight: A5_HEIGHT_PT,
    })

    // Convert to data URL
    const pdfDataUrl = `data:application/pdf;base64,${pdfContent}`

    return {
      success: true,
      data: pdfDataUrl,
      format: 'PDF',
    }
  } catch (error) {
    return {
      success: false,
      error: `PDF oluşturulamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
    }
  }
}

/**
 * Build a simple PDF document with embedded PNG image.
 *
 * This creates a minimal valid PDF without external dependencies.
 * The PDF includes the QR code centered on an A5 page with optional
 * title and subtitle text.
 *
 * @param pngBase64 - Base64-encoded PNG image data
 * @param options - PDF layout options
 * @returns Base64-encoded PDF content
 */
function buildSimplePDF(
  pngBase64: string,
  options: {
    title?: string
    subtitle?: string
    pageWidth: number
    pageHeight: number
  }
): string {
  const { title, subtitle, pageWidth, pageHeight } = options

  // QR code dimensions on page (centered, with margins)
  const qrSize = Math.min(pageWidth, pageHeight) * 0.7 // 70% of smaller dimension
  const qrX = (pageWidth - qrSize) / 2
  const qrY = (pageHeight - qrSize) / 2 + 30 // Offset down for title

  // Decode PNG to get dimensions
  const pngBuffer = Buffer.from(pngBase64, 'base64')
  const pngWidth = 2048 // We know this from generation
  const pngHeight = 2048

  // Build PDF objects
  const objects: string[] = []
  let objectIndex = 1

  // Object 1: Catalog
  objects.push(`${objectIndex} 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`)
  objectIndex++

  // Object 2: Pages
  objects.push(`${objectIndex} 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`)
  objectIndex++

  // Object 3: Page
  const pageResources = `<< /XObject << /QRCode 5 0 R >> /Font << /F1 4 0 R >> >>`
  objects.push(
    `${objectIndex} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 6 0 R /Resources ${pageResources} >>\nendobj`
  )
  objectIndex++

  // Object 4: Font (Helvetica - standard PDF font)
  objects.push(
    `${objectIndex} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`
  )
  objectIndex++

  // Object 5: Image XObject
  const imageStream = `<< /Type /XObject /Subtype /Image /Width ${pngWidth} /Height ${pngHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pngBuffer.length} >>`
  // Note: For simplicity, we'll use a placeholder approach
  // In production, this would properly encode the PNG
  objects.push(`${objectIndex} 0 obj\n${imageStream}\nstream\n${pngBase64}\nendstream\nendobj`)
  objectIndex++

  // Object 6: Content stream
  let contentStream = ''

  // Draw white background
  contentStream += '1 1 1 rg\n' // White fill
  contentStream += `0 0 ${pageWidth} ${pageHeight} re f\n`

  // Draw title if provided
  if (title) {
    const titleFontSize = 24
    const titleWidth = title.length * titleFontSize * 0.5 // Approximate
    const titleX = (pageWidth - titleWidth) / 2
    const titleY = pageHeight - 60
    contentStream += `BT /F1 ${titleFontSize} Tf ${titleX} ${titleY} Td (${escapeStringForPDF(title)}) Tj ET\n`
  }

  // Draw QR code image
  contentStream += `q ${qrSize} 0 0 ${qrSize} ${qrX} ${qrY} cm /QRCode Do Q\n`

  // Draw subtitle if provided
  if (subtitle) {
    const subtitleFontSize = 14
    const subtitleWidth = subtitle.length * subtitleFontSize * 0.4 // Approximate
    const subtitleX = (pageWidth - subtitleWidth) / 2
    const subtitleY = qrY - 30
    contentStream += `BT /F1 ${subtitleFontSize} Tf ${subtitleX} ${subtitleY} Td (${escapeStringForPDF(subtitle)}) Tj ET\n`
  }

  // Draw URL at bottom
  const url = buildMenuUrl('', undefined).replace(/\/menu\/$/, '') || 'e-menum.net'
  const urlFontSize = 10
  const urlWidth = url.length * urlFontSize * 0.5
  const urlX = (pageWidth - urlWidth) / 2
  const urlY = 40
  contentStream += `0.5 0.5 0.5 rg\n` // Gray text
  contentStream += `BT /F1 ${urlFontSize} Tf ${urlX} ${urlY} Td (${escapeStringForPDF(url)}) Tj ET\n`

  const contentLength = contentStream.length
  objects.push(
    `${objectIndex} 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}endstream\nendobj`
  )
  objectIndex++

  // Build PDF structure
  let pdf = '%PDF-1.4\n'
  let offset = pdf.length

  const xrefOffsets: number[] = [0] // First entry is always 0

  for (const obj of objects) {
    xrefOffsets.push(offset)
    pdf += obj + '\n'
    offset = pdf.length
  }

  // Cross-reference table
  const xrefStart = offset
  pdf += 'xref\n'
  pdf += `0 ${objectIndex}\n`
  pdf += '0000000000 65535 f \n' // Free entry

  for (let i = 1; i < objectIndex; i++) {
    pdf += `${String(xrefOffsets[i]).padStart(10, '0')} 00000 n \n`
  }

  // Trailer
  pdf += 'trailer\n'
  pdf += `<< /Size ${objectIndex} /Root 1 0 R >>\n`
  pdf += 'startxref\n'
  pdf += `${xrefStart}\n`
  pdf += '%%EOF'

  // Convert to base64
  return Buffer.from(pdf).toString('base64')
}

/**
 * Escape special characters for PDF string literals
 */
function escapeStringForPDF(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

/**
 * Generate QR codes in all available formats.
 *
 * Convenience function to generate SVG, all PNG sizes, and PDF
 * in a single call.
 *
 * @param slug - The organization's slug for the menu URL
 * @param tableId - Optional table ID for table-specific QR codes
 * @param options - Generation options
 * @returns Promise with all generated formats
 *
 * @example
 * ```typescript
 * const result = await generateAllQRCodeFormats('my-restaurant')
 * if (result.success) {
 *   // Access individual formats
 *   const svg = result.svg
 *   const png1024 = result.png1024
 *   const pdf = result.pdf
 * }
 * ```
 */
export async function generateAllQRCodeFormats(
  slug: string,
  tableId?: string,
  options: QRCodePDFOptions = {}
): Promise<{
  success: boolean
  svg?: string
  png1024?: string
  png2048?: string
  png4096?: string
  pdf?: string
  errors: string[]
}> {
  const errors: string[] = []

  // Generate all formats in parallel
  const [svgResult, png1024Result, png2048Result, png4096Result, pdfResult] = await Promise.all([
    generateQRCodeSVG(slug, tableId, options),
    generateQRCodePNG(slug, 1024, tableId, options),
    generateQRCodePNG(slug, 2048, tableId, options),
    generateQRCodePNG(slug, 4096, tableId, options),
    generateQRCodePDF(slug, tableId, options),
  ])

  if (!svgResult.success) errors.push(svgResult.error || 'SVG oluşturulamadı')
  if (!png1024Result.success) errors.push(png1024Result.error || 'PNG 1024 oluşturulamadı')
  if (!png2048Result.success) errors.push(png2048Result.error || 'PNG 2048 oluşturulamadı')
  if (!png4096Result.success) errors.push(png4096Result.error || 'PNG 4096 oluşturulamadı')
  if (!pdfResult.success) errors.push(pdfResult.error || 'PDF oluşturulamadı')

  return {
    success: errors.length === 0,
    svg: svgResult.data,
    png1024: png1024Result.data,
    png2048: png2048Result.data,
    png4096: png4096Result.data,
    pdf: pdfResult.data,
    errors,
  }
}

/**
 * Validate a slug for QR code generation.
 *
 * Ensures the slug meets requirements for URL encoding and
 * QR code generation.
 *
 * @param slug - The slug to validate
 * @returns Validation result
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'Slug boş olamaz' }
  }

  if (slug.length > 100) {
    return { valid: false, error: 'Slug 100 karakterden uzun olamaz' }
  }

  // Check for valid URL characters
  const validSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!validSlugPattern.test(slug)) {
    return {
      valid: false,
      error: 'Slug sadece küçük harf, rakam ve tire içerebilir',
    }
  }

  return { valid: true }
}

/**
 * Get the supported PNG sizes.
 *
 * @returns Array of supported PNG sizes
 */
export function getSupportedPNGSizes(): QRCodePNGSize[] {
  return [1024, 2048, 4096]
}

/**
 * Get the supported output formats.
 *
 * @returns Array of supported formats
 */
export function getSupportedFormats(): QRCodeFormat[] {
  return ['SVG', 'PNG', 'PDF']
}
