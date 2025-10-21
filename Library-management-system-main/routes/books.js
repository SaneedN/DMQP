const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const requireAdmin = require('../middleware/auth');

// ==========================
// ADD BOOKS PAGE
// ==========================
router.get('/addBooks', requireAdmin, (req, res) => {
  res.render('admin/add-books', { message: '', book: {} });
});

// ==========================
// ADD BOOKS (POST)
// ==========================
router.post('/addBooks', requireAdmin, (req, res) => {
  const { isbn, bookName, authorName, publisherName, quantity } = req.body;

  db.query('SELECT * FROM books WHERE isbn = ?', [isbn], (err, results) => {
    if (err) throw err;

    // If book already exists
    if (results.length > 0) {
      const book = results[0];

      if (
        book.bookName === bookName &&
        book.authorName === authorName &&
        book.publisherName === publisherName
      ) {
        return res.send(`
          <script>
            if (confirm('This book already exists in the library. Do you want to add more quantity of this book into the library?')) {
              window.location.href = '/updateQuantity?isbn=${isbn}&quantity=${quantity}';
            } else {
              window.location.href = '/addBooks';
            }
          </script>
        `);
      } else {
        return res.render('admin/add-books', {
          message: "Book details don't match with ISBN. Please enter correct details.",
          book: { isbn, bookName, authorName, publisherName, quantity }
        });
      }
    }

    // If new book → insert
    const insert = `
      INSERT INTO books (isbn, bookName, authorName, publisherName, available, borrowed)
      VALUES (?, ?, ?, ?, ?, 0)
    `;
    db.query(insert, [isbn, bookName, authorName, publisherName, quantity], (err2) => {
      if (err2) throw err2;

      res.send(`
        <script>
          alert('Book(s) added successfully');
          window.location.href = '/manageInventory';
        </script>
      `);
    });
  });
});

// ==========================
// UPDATE QUANTITY (GET)
// ==========================
router.get('/updateQuantity', requireAdmin, (req, res) => {
  const { isbn, quantity } = req.query;
  const sql = 'UPDATE books SET available = available + ? WHERE isbn = ?';
  db.query(sql, [parseInt(quantity), isbn], (err) => {
    if (err) throw err;
    res.send(`
      <script>
        alert('Book quantity updated successfully');
        window.location.href = '/manageInventory';
      </script>
    `);
  });
});

// ==========================
// AJAX: FETCH BOOK DETAILS
// ==========================
router.post('/getBookDetailsByISBN', requireAdmin, (req, res) => {
  const { isbn } = req.body;
  if (!isbn) return res.json({ success: false });

  db.query('SELECT * FROM books WHERE isbn = ?', [isbn], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      const book = results[0];
      return res.json({
        success: true,
        bookName: book.bookName,
        authorName: book.authorName,
        publisherName: book.publisherName
      });
    }
    res.json({ success: false });
  });
});

// ==========================
// REMOVE BOOKS PAGE (GET)
// ==========================
router.get('/removeBooks', requireAdmin, (req, res) => {
  const { isbn, bookName, authorName } = req.query;
  res.render('admin/remove-books', {
    isbn: isbn || '',
    bookName: bookName || '',
    authorName: authorName || '',
    publisherName: '',
    quantity: 1,
    message: '',
    message2: ''
  });
});

// ==========================
// REMOVE BOOKS (POST)
// ==========================
router.post('/removeBooks', requireAdmin, (req, res) => {
  const { isbn, bookName, authorName, publisherName, quantity } = req.body;

  db.query('SELECT * FROM books WHERE isbn = ?', [isbn], (err, results) => {
    if (err) throw err;

    if (results.length === 0) {
      return res.render('admin/remove-books', {
        isbn,
        bookName,
        authorName,
        publisherName,
        quantity,
        message: "Invalid request! This book does not exist in the library.",
        message2: ''
      });
    }

    const book = results[0];
    const quantityAvailable = book.available;
    const borrowed = book.borrowed;
    const qty = parseInt(quantity);

    // Book details mismatch
    if (
      book.bookName !== bookName ||
      book.authorName !== authorName ||
      book.publisherName !== publisherName
    ) {
      return res.render('admin/remove-books', {
        isbn,
        bookName,
        authorName,
        publisherName,
        quantity,
        message: "Book details don't match with ISBN. Please enter the correct details.",
        message2: ''
      });
    }

    // Case 1: quantity < available
    if (qty < quantityAvailable) {
      const sql = 'UPDATE books SET available = ? WHERE isbn = ?';
      db.query(sql, [quantityAvailable - qty, isbn], (err2) => {
        if (err2) throw err2;
        res.send(`
          <script>
            alert('Book(s) removed successfully');
            window.location.href = '/manageInventory';
          </script>
        `);
      });
    }
    // Case 2: quantity == available
    else if (qty === quantityAvailable) {
      if (borrowed > 0) {
        db.query('UPDATE books SET available = 0 WHERE isbn = ?', [isbn], (err3) => {
          if (err3) throw err3;
          res.send(`
            <script>
              alert('Book(s) removed successfully!');
              window.location.href = '/manageInventory';
            </script>
          `);
        });
      } else {
        db.query('DELETE FROM books WHERE isbn = ?', [isbn], (err4) => {
          if (err4) throw err4;
          res.send(`
            <script>
              alert('Book(s) removed successfully');
              window.location.href = '/manageInventory';
            </script>
          `);
        });
      }
    }
    // Case 3: quantity > available
    else {
      return res.render('admin/remove-books', {
        isbn,
        bookName,
        authorName,
        publisherName,
        quantity,
        message: '',
        message2: 'Invalid quantity entered'
      });
    }
  });
});

module.exports = router;
