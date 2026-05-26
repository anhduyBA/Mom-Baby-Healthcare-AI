import dotenv from "dotenv";
dotenv.config(); // load .env variables

import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

client.messages.create({
  body: "Test message from Healthsync",
  from: process.env.TWILIO_PHONE,
  to: "+919623082674"
})
.then(msg => console.log("Message sent:", msg.sid))
.catch(err => console.error(err));
