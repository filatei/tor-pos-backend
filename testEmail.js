const sendErrorEmail = require('./emailService'); // Adjust the path as needed

// Test the email sending functionality
(async () => {
    try {
        await sendErrorEmail("This is a test error message.");

        console.log("Test email sent successfully.");
    } catch (error) {
        console.error("Error in sending test email:", error);
    }
})();
