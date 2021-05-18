const nodemailer = require("nodemailer");
const pug = require("pug");
const htmlToText = require("html-to-text");
const mailgun = require("mailgun-js")({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_API_URL,
});
const mg = mailgun;

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `Subhash Chandra <${process.env.EMAIL_FROM}>`;
  }

  // newTransport() {
  //   // if (process.env.NODE_ENV === "production") {
  //   return nodemailer.createTransport({
  //     service: "Mailgun",
  //     auth: {
  //       user: process.env.MAILGUN_USERNAME,
  //       pass: process.env.MAILGUN_PASSWORD,
  //     },
  //   });
  //   // }

  //   // return nodemailer.createTransport({
  //   //   host: process.env.EMAIL_HOST,
  //   //   port: process.env.EMAIL_PORT,
  //   //   auth: {
  //   //     user: process.env.EMAIL_USERNAME,
  //   //     pass: process.env.EMAIL_PASSWORD,
  //   //   },
  //   // });
  // }

  // Send the actual email
  async send(template, subject) {
    console.log("send");
    //1.Render Html based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    //2.Define the email option
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };

    //3. Create a transport and send email

    await mg.messages().send(mailOptions, function (err, response) {
      if (err) console.log("error", err);
      if (response) console.log(response);
    });
  }

  async sendPasswordReset() {
    console.log("sendPasswordReset");
    await this.send("passwordReset", "Your password reset token (valid only for 10 mins");
  }
};
