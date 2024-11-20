const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendBookingNotification = async (booking) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'mishraadarsh25104@gmail.com',
    subject: 'New Lab Booking Request',
    html: `
      <h2>New Lab Booking Request</h2>
      <p><strong>Name:</strong> ${booking.name}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Lab:</strong> ${booking.lab}</p>
      <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>
      <p><strong>Faculty:</strong> ${booking.selectedFaculty.join(', ')}</p>
      <p><strong>Equipment:</strong> ${booking.equipment}</p>
    `
  };

  return transporter.sendMail(mailOptions);
};

exports.sendBookingResponse = async (booking, isApproved) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: booking.email,
    subject: `Lab Booking ${isApproved ? 'Approved' : 'Rejected'}`,
    html: `
      <h2>Lab Booking ${isApproved ? 'Approved' : 'Rejected'}</h2>
      <p>Your lab booking request has been ${isApproved ? 'approved' : 'rejected'}.</p>
      <h3>Booking Details:</h3>
      <p><strong>Lab:</strong> ${booking.lab}</p>
      <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>
      ${isApproved 
        ? '<p><strong>Note:</strong> Please arrive on time and follow all lab safety protocols.</p>'
        : '<p>If you need to book the lab again, please submit a new request.</p>'
      }
    `
  };

  return transporter.sendMail(mailOptions);
};