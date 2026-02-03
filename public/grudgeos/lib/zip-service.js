/**
 * CloudPilot AI Studio - ZIP Service
 * Browser-based ZIP extraction without server dependencies
 * 
 * Phase 1: Security & Infrastructure
 * 
 * Features:
 * - Extract ZIP files directly in browser
 * - Stream large files to Puter storage
 * - Progress tracking
 * - Error recovery
 */

/**
 * ZIP Service for browser-based extraction
 * Uses JSZip-compatible approach with native decompression
 */
export class ZipService {
  constructor() {
    this.supportDeflate = typeof DecompressionStream !== 'undefined';
  }

  /**
   * Extract ZIP file and return file list
   * @param {File|Blob} zipFile - The ZIP file to extract
   * @param {Object} options - Extraction options
   * @returns {Promise<Array>} - Array of extracted file info
   */
  async extract(zipFile, options = {}) {
    const { 
      onProgress = null,
      filter = null,
      maxFiles = 1000,
      maxFileSize = 100 * 1024 * 1024
    } = options;

    const buffer = await zipFile.arrayBuffer();
    const view = new DataView(buffer);
    
    const entries = [];
    let offset = 0;
    let fileCount = 0;

    while (offset < buffer.byteLength && fileCount < maxFiles) {
      const signature = view.getUint32(offset, true);
      
      if (signature !== 0x04034b50) {
        break;
      }

      const compressionMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const uncompressedSize = view.getUint32(offset + 22, true);
      const fileNameLength = view.getUint16(offset + 26, true);
      const extraFieldLength = view.getUint16(offset + 28, true);

      const fileNameStart = offset + 30;
      const fileNameBytes = new Uint8Array(buffer, fileNameStart, fileNameLength);
      const fileName = new TextDecoder().decode(fileNameBytes);

      const dataStart = fileNameStart + fileNameLength + extraFieldLength;
      const compressedData = new Uint8Array(buffer, dataStart, compressedSize);

      if (uncompressedSize > maxFileSize) {
        console.warn(`[ZipService] Skipping large file: ${fileName} (${uncompressedSize} bytes)`);
        offset = dataStart + compressedSize;
        continue;
      }

      if (filter && !filter(fileName)) {
        offset = dataStart + compressedSize;
        continue;
      }

      let data;
      if (compressionMethod === 0) {
        data = compressedData;
      } else if (compressionMethod === 8 && this.supportDeflate) {
        try {
          data = await this.inflateDeflate(compressedData);
        } catch (e) {
          console.warn(`[ZipService] Failed to decompress: ${fileName}`, e);
          offset = dataStart + compressedSize;
          continue;
        }
      } else {
        console.warn(`[ZipService] Unsupported compression: ${compressionMethod} for ${fileName}`);
        offset = dataStart + compressedSize;
        continue;
      }

      const isDirectory = fileName.endsWith('/');
      
      entries.push({
        name: fileName,
        size: uncompressedSize,
        compressedSize,
        isDirectory,
        data: isDirectory ? null : data
      });

      fileCount++;
      
      if (onProgress) {
        onProgress({
          current: fileCount,
          fileName,
          bytesProcessed: offset
        });
      }

      offset = dataStart + compressedSize;
    }

    return entries;
  }

  /**
   * Decompress DEFLATE data using native stream
   */
  async inflateDeflate(compressedData) {
    const rawDeflateData = new Uint8Array(compressedData.length + 2);
    rawDeflateData[0] = 0x78;
    rawDeflateData[1] = 0x9c;
    rawDeflateData.set(compressedData, 2);

    const stream = new Blob([rawDeflateData]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate'));
    const reader = decompressedStream.getReader();
    
    const chunks = [];
    let done = false;
    
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) {
        chunks.push(result.value);
      }
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Extract ZIP to Puter filesystem
   * @param {File|Blob} zipFile - The ZIP file
   * @param {string} targetPath - Puter path to extract to
   * @param {Object} options - Options
   */
  async extractToPuter(zipFile, targetPath, options = {}) {
    const { onProgress = null, filter = null } = options;

    if (typeof window === 'undefined' || !window.puter) {
      throw new Error('Puter SDK not available');
    }

    const entries = await this.extract(zipFile, { filter, onProgress });
    const results = { success: [], failed: [], directories: [] };

    const directories = new Set();
    for (const entry of entries) {
      if (entry.isDirectory) {
        directories.add(entry.name);
      } else {
        const dir = entry.name.split('/').slice(0, -1).join('/');
        if (dir) directories.add(dir + '/');
      }
    }

    for (const dir of Array.from(directories).sort()) {
      const fullPath = `${targetPath}/${dir}`.replace(/\/+/g, '/').replace(/\/$/, '');
      try {
        await window.puter.fs.mkdir(fullPath);
        results.directories.push(fullPath);
      } catch (e) {
      }
    }

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      
      const fullPath = `${targetPath}/${entry.name}`.replace(/\/+/g, '/');
      
      try {
        const blob = new Blob([entry.data]);
        await window.puter.fs.write(fullPath, blob);
        results.success.push({ name: entry.name, path: fullPath, size: entry.size });
        
        if (onProgress) {
          onProgress({ 
            phase: 'upload',
            file: entry.name,
            uploaded: results.success.length,
            total: entries.filter(e => !e.isDirectory).length
          });
        }
      } catch (error) {
        results.failed.push({ name: entry.name, error: error.message });
      }
    }

    return results;
  }

  /**
   * Create a ZIP file from entries
   * @param {Array} files - Array of {name, data} objects
   * @returns {Promise<Blob>} - ZIP file as Blob
   */
  async create(files) {
    const parts = [];
    const centralDirectory = [];
    let offset = 0;

    for (const file of files) {
      const nameBytes = new TextEncoder().encode(file.name);
      const data = file.data instanceof Uint8Array ? file.data :
                   typeof file.data === 'string' ? new TextEncoder().encode(file.data) :
                   new Uint8Array(await file.data.arrayBuffer());

      const header = new ArrayBuffer(30 + nameBytes.length);
      const headerView = new DataView(header);
      
      headerView.setUint32(0, 0x04034b50, true);
      headerView.setUint16(4, 20, true);
      headerView.setUint16(6, 0, true);
      headerView.setUint16(8, 0, true);
      headerView.setUint16(10, 0, true);
      headerView.setUint16(12, 0, true);
      headerView.setUint32(14, this.crc32(data), true);
      headerView.setUint32(18, data.length, true);
      headerView.setUint32(22, data.length, true);
      headerView.setUint16(26, nameBytes.length, true);
      headerView.setUint16(28, 0, true);
      new Uint8Array(header, 30).set(nameBytes);

      parts.push(new Uint8Array(header));
      parts.push(data);

      const cdEntry = new ArrayBuffer(46 + nameBytes.length);
      const cdView = new DataView(cdEntry);
      
      cdView.setUint32(0, 0x02014b50, true);
      cdView.setUint16(4, 20, true);
      cdView.setUint16(6, 20, true);
      cdView.setUint16(8, 0, true);
      cdView.setUint16(10, 0, true);
      cdView.setUint16(12, 0, true);
      cdView.setUint16(14, 0, true);
      cdView.setUint32(16, this.crc32(data), true);
      cdView.setUint32(20, data.length, true);
      cdView.setUint32(24, data.length, true);
      cdView.setUint16(28, nameBytes.length, true);
      cdView.setUint16(30, 0, true);
      cdView.setUint16(32, 0, true);
      cdView.setUint16(34, 0, true);
      cdView.setUint16(36, 0, true);
      cdView.setUint32(38, 0, true);
      cdView.setUint32(42, offset, true);
      new Uint8Array(cdEntry, 46).set(nameBytes);

      centralDirectory.push(new Uint8Array(cdEntry));
      offset += header.byteLength + data.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const entry of centralDirectory) {
      parts.push(entry);
      cdSize += entry.length;
    }

    const endRecord = new ArrayBuffer(22);
    const endView = new DataView(endRecord);
    
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, cdSize, true);
    endView.setUint32(16, cdOffset, true);
    endView.setUint16(20, 0, true);

    parts.push(new Uint8Array(endRecord));

    return new Blob(parts, { type: 'application/zip' });
  }

  /**
   * Calculate CRC32 checksum
   */
  crc32(data) {
    let crc = 0xffffffff;
    const table = this.getCRC32Table();
    
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
    }
    
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * Get CRC32 lookup table
   */
  getCRC32Table() {
    if (this._crc32Table) return this._crc32Table;
    
    const table = new Uint32Array(256);
    
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    
    this._crc32Table = table;
    return table;
  }
}

export const zipService = new ZipService();

if (typeof window !== 'undefined') {
  window.GrudgeOS = window.GrudgeOS || {};
  window.GrudgeOS.ZipService = zipService;
}

export default zipService;
