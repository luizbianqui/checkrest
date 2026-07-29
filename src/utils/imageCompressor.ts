import imageCompression from 'browser-image-compression'

/**
 * Compresses an image file using browser-image-compression.
 * Standardizes output as a WebP image with:
 * - maxSizeMB: 0.18 (under 200KB)
 * - maxWidthOrHeight: 1024 (HD resolution)
 * - fileType: 'image/webp'
 *
 * @param file The original image file
 * @returns A promise that resolves to the compressed WebP File
 */
export async function comprimirEvidencia(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.18,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: 'image/webp' as const,
  }

  try {
    const compressedBlob = await imageCompression(file, options)

    // Extract file name without extension
    const lastDotIndex = file.name.lastIndexOf('.')
    const nameWithoutExtension =
      lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name

    // Return as a standard File object with .webp extension
    return new File([compressedBlob], `${nameWithoutExtension}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } catch (error) {
    console.error('Erro ao comprimir imagem:', error)
    throw error
  }
}
