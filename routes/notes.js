const express = require('express');
const router = express.Router();
const File = require('../models/File');

router.get('/:semId/:subjId/:unit', async (req, res) => {
  const { semId, subjId, unit } = req.params;
  try {
    const files = await File.find({ semester: semId, subject: subjId, unit: unit });
    res.render('unitFiles', { files, semId, subjId, unit });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;