const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const pgtools = require('pgtools');
const express = require('express');
const multer = require('multer');
const fs = require('fs');

// Create an express app
const app = express();

// Create a connection pool for the PostgreSQL database
const pool = new Pool({
  user: 'chiheb',
  host: 'localhost',
  database: 'mail-service',
  password: '1234',
  port: 5432,
});

// Define the SQL statement to create the emails table
const createTableSql = `
CREATE TABLE IF NOT EXISTS emails (
  id SERIAL PRIMARY KEY,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment BYTEA
);`;

// Create the emails table
pool.query(createTableSql, (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log('emails table created successfully');
  }
});

// Configure multer to handle file uploads
const upload = multer({ dest: 'uploads/' });

// Define a POST request handler for sending emails
app.post('/sendemail', upload.single('attachment'), async (req, res) => {
  try {
    // Get the email details from the request body
    const { from,to, subject, body } = req.body;

    // Get the attachment file content, if present
    const attachmentContent = req.file ? fs.readFileSync(req.file.path) : null;

    // Create a nodemailer transport with your SMTP server settings
    const transporter = nodemailer.createTransport({
      service:"gmail",
      port: 587,
      secure: false,
      auth: {
        user: 'alertAppEnit@gmail.com',
        pass: 'pogbiapkycebkzeo',
      },
    });

    // Create a message to send
    const message = {
      from: from,
      to: to,
      subject: subject,
      text: body,
    };

    // If an attachment is present, add it to the message
    if (attachmentContent) {
      message.attachments = [
        {
          filename: req.file.originalname,
          content: attachmentContent,
        },
      ];
    }

    // Send the message using nodemailer
    const info = await transporter.sendMail(message);

    // Save the email to the PostgreSQL database
    const client = await pool.connect();
    await client.query(
      'INSERT INTO emails (from_address, to_address, subject, body, attachment) VALUES ($1, $2, $3, $4, $5)',
      [message.from, message.to, message.subject, message.text, attachmentContent]
    );
    client.release();

    // Delete the attachment file if present
    if (attachmentContent) {
      fs.unlinkSync(req.file.path);
    }

    // Send a success response
    res.status(200).send(`Email sent: ${info.messageId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error sending email');
  }
});

// Start the express app

app.listen(3000, () => {
    console.log('Server is listening on port 3000');
    });