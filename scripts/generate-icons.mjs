import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const projectRoot = process.cwd()
const sourceSvg = path.join(projectRoot, 'public', 'app-icon.svg')
const buildDir = path.join(projectRoot, 'build')
const iconsetDir = path.join(buildDir, 'icon.iconset')
const tempDir = path.join(buildDir, 'icon-tmp')

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf-8' })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`)
  }
  return result
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function renderPng(size, outputPath) {
  run('sips', ['-s', 'format', 'png', '-z', String(size), String(size), sourceSvg, '--out', outputPath])
}

function createIco(entries, outputPath) {
  const headerSize = 6
  const entrySize = 16
  let offset = headerSize + entrySize * entries.length
  const images = entries.map(({ size, file }) => {
    const image = fs.readFileSync(file)
    const directory = Buffer.alloc(entrySize)
    directory.writeUInt8(size >= 256 ? 0 : size, 0)
    directory.writeUInt8(size >= 256 ? 0 : size, 1)
    directory.writeUInt8(0, 2)
    directory.writeUInt8(0, 3)
    directory.writeUInt16LE(1, 4)
    directory.writeUInt16LE(32, 6)
    directory.writeUInt32LE(image.length, 8)
    directory.writeUInt32LE(offset, 12)
    offset += image.length
    return { directory, image }
  })

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)
  fs.writeFileSync(outputPath, Buffer.concat([
    header,
    ...images.map((entry) => entry.directory),
    ...images.map((entry) => entry.image),
  ]))
}

ensureDir(buildDir)
fs.rmSync(iconsetDir, { recursive: true, force: true })
fs.rmSync(tempDir, { recursive: true, force: true })
ensureDir(iconsetDir)
ensureDir(tempDir)

renderPng(1024, path.join(projectRoot, 'public', 'icon.png'))
renderPng(64, path.join(projectRoot, 'public', 'tray.png'))

const iconsetSizes = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024],
]

for (const [name, size] of iconsetSizes) {
  renderPng(size, path.join(iconsetDir, name))
}

run('iconutil', ['-c', 'icns', iconsetDir, '-o', path.join(buildDir, 'icon.icns')])

const icoEntries = [16, 32, 48, 256].map((size) => {
  const file = path.join(tempDir, `icon-${size}.png`)
  renderPng(size, file)
  return { size, file }
})
createIco(icoEntries, path.join(projectRoot, 'public', 'icon.ico'))

fs.rmSync(iconsetDir, { recursive: true, force: true })
fs.rmSync(tempDir, { recursive: true, force: true })

console.log('Generated public/icon.png, public/tray.png, public/icon.ico, build/icon.icns')
