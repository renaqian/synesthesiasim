const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
 
const app = express();
const PORT = 3000;
const AUDIO_DIR = path.join(__dirname, 'audiofiles');
 
// ensure audiofiles/ exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR);
}
 
// multer: save uploads to audiofiles/, keep original filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AUDIO_DIR),
  filename: (req, file, cb) => {
    // sanitize: strip non-alphanumeric except dot/dash/underscore
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safe);
  }
});
 
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.originalname.endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 files are allowed'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});
 
// serve frontend
app.use(express.static(path.join(__dirname, 'public')));
 
// serve audio files directly (so browser can fetch/stream them)
app.use('/audiofiles', express.static(AUDIO_DIR));
 
// POST /upload — receives a single MP3, saves to audiofiles/
app.post('/upload', upload.single('mp3'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    message: 'Upload successful',
    filename: req.file.filename,
    size: req.file.size
  });
});
 
// GET /files — returns list of all MP3s in audiofiles/
app.get('/files', (req, res) => {
  fs.readdir(AUDIO_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Could not read audio directory' });
    const mp3s = files.filter(f => f.endsWith('.mp3'));
    res.json(mp3s);
  });
});
 
// DELETE /files/:filename — remove a specific file
app.delete('/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filepath = path.join(AUDIO_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  fs.unlink(filepath, (err) => {
    if (err) return res.status(500).json({ error: 'Could not delete file' });
    res.json({ message: 'Deleted', filename });
  });
});
 
app.listen(PORT, () => {
  console.log(`Synesthesia server running at http://localhost:${PORT}`);
  console.log(`Audio files stored in: ${AUDIO_DIR}`);
});