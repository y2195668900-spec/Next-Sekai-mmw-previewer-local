// 极简 ZIP 打包器（无第三方依赖）。
//
// 为什么不用 PowerShell 的 Compress-Archive：它写出来的条目用反斜杠做路径分隔符
// （`assets\landing\chart.webp`），`unzip` 等遵循 ZIP 规范的工具会直接报
// 「appears to use backslashes as path separators」并解压失败；Explorer 虽然能歪打正着，
// 但跨工具不可靠。这里按规范统一用 `/`，小文件用 deflate、已压缩格式（png/mp3/webp/wasm）用 store。
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, relative, sep } from 'node:path'
import zlib from 'node:zlib'

const STORED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.mp3', '.m4a', '.ogg', '.zip'])

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (let index = 0; index < buffer.length; index += 1) {
    crc = crcTable[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function collectFiles(root) {
  const files = []
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const absolute = join(current, name)
      const stats = statSync(absolute)
      if (stats.isDirectory()) {
        walk(absolute)
      } else if (stats.isFile()) {
        files.push(absolute)
      }
    }
  }
  walk(root)
  return files
}

/** 把 `sourceDir` 的内容打进 `zipPath`，条目名相对于 sourceDir、统一 `/` 分隔。 */
export function createZip(sourceDir, zipPath) {
  const files = collectFiles(sourceDir).sort()
  // 条目带上顶层目录名，解压时才会得到一个文件夹，而不是把 499 个文件散在桌面。
  const prefix = `${basename(sourceDir)}/`
  const chunks = []
  const write = (buffer) => {
    chunks.push(buffer)
  }

  const central = []
  let offset = 0

  for (const absolute of files) {
    const name = prefix + relative(sourceDir, absolute).split(sep).join('/')
    const raw = readFileSync(absolute)
    const suffix = name.slice(name.lastIndexOf('.')).toLowerCase()
    const stored = STORED_EXTENSIONS.has(suffix) || raw.length === 0
    const compressed = stored ? raw : zlib.deflateRawSync(raw, { level: 9 })
    const method = stored ? 0 : 8
    const nameBuffer = Buffer.from(name, 'utf8')
    const checksum = crc32(raw)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // UTF-8 文件名
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(0, 10) // time
    local.writeUInt16LE(0x21, 12) // date: 1980-01-01
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(nameBuffer.length, 26)
    local.writeUInt16LE(0, 28)
    write(local)
    write(nameBuffer)
    write(compressed)

    central.push({ nameBuffer, method, checksum, compressedSize: compressed.length, rawSize: raw.length, offset })
    offset += local.length + nameBuffer.length + compressed.length
  }

  const centralStart = offset
  for (const entry of central) {
    const header = Buffer.alloc(46)
    header.writeUInt32LE(0x02014b50, 0)
    header.writeUInt16LE(20, 4) // version made by
    header.writeUInt16LE(20, 6) // version needed
    header.writeUInt16LE(0x0800, 8)
    header.writeUInt16LE(entry.method, 10)
    header.writeUInt16LE(0, 12)
    header.writeUInt16LE(0x21, 14)
    header.writeUInt32LE(entry.checksum, 16)
    header.writeUInt32LE(entry.compressedSize, 20)
    header.writeUInt32LE(entry.rawSize, 24)
    header.writeUInt16LE(entry.nameBuffer.length, 28)
    header.writeUInt16LE(0, 30) // extra
    header.writeUInt16LE(0, 32) // comment
    header.writeUInt16LE(0, 34) // disk
    header.writeUInt16LE(0, 36) // internal attrs
    header.writeUInt32LE(0, 38) // external attrs
    header.writeUInt32LE(entry.offset, 42)
    write(header)
    write(entry.nameBuffer)
    offset += header.length + entry.nameBuffer.length
  }

  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(central.length, 8)
  end.writeUInt16LE(central.length, 10)
  end.writeUInt32LE(offset - centralStart, 12)
  end.writeUInt32LE(centralStart, 16)
  end.writeUInt16LE(0, 20)
  write(end)
  const archive = Buffer.concat(chunks)
  writeFileSync(zipPath, archive)
  return { files: files.length, bytes: archive.length }
}
