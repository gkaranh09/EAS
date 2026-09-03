const Razorpay = require('razorpay');
const dotenv = require('dotenv');
dotenv.config();

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (key_id && key_secret) {
    try {
      return new Razorpay({ key_id, key_secret });
    } catch (err) {
      console.error('Failed to instantiate Razorpay:', err.message);
    }
  }
  return null;
};

module.exports = {
  getRazorpayInstance,
  getKeyId: () => process.env.RAZORPAY_KEY_ID || 'rzp_test_5174DemoEASKey',
  getKeySecret: () => process.env.RAZORPAY_KEY_SECRET || 'secret_test_5174DemoSecret'
};
