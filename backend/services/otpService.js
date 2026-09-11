function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtp(phone) {
    const otp = generateOtp();

    console.log("");
    console.log("========================================");
    console.log(" DEVELOPMENT OTP");
    console.log(" Phone:", phone);
    console.log(" OTP:", otp);
    console.log(" Valid for: 5 minutes");
    console.log("========================================");
    console.log("");

    return otp;
}

module.exports = {
    generateOtp,
    sendOtp
};
