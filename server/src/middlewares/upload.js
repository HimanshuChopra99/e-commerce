import path from 'node:path'
import fs from 'node:fs'
import multer from 'multer'
import { env } from '../config/env.js'
import { ApiError } from '../utils/api-error.js'
import { publicId } from '../utils/helpers.js'

const UPLOAD_DIR = path.resolve(env.upload.dir)
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const EXTENSION = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // NEVER use file.originalname — "../../etc/passwd" is a real attack.
    // We generate the name ourselves and derive the extension from the MIME.
    cb(null, `${publicId()}${EXTENSION[file.mimetype] ?? '.bin'}`)
  },
})

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(ApiError.badRequest('Only JPEG, PNG, WebP or AVIF images are allowed.'))
  }
  cb(null, true)
}

export const upload = multer({
  storage,
  limits: { fileSize: env.upload.maxBytes, files: 8 },
  fileFilter,
})

// A product may have up to eight images per colour and 48 in total. Multer's
// file-size limit applies to each file independently.
export const productImageUpload = multer({
  storage,
  limits: { fileSize: env.upload.maxBytes, files: 48 },
  fileFilter,
})

export { UPLOAD_DIR }
