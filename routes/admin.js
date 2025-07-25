app.get('/admin/upload', requireAuth, (req, res) => {
  const { type, year, sem, subject, unit } = req.query;
  res.render('admin/upload', {
    years,
    semesters,
    subjects,
    type,
    year,
    sem,
    subject,
    unit
  });
});
