const maskPII = (text) => {
    if (!text || typeof text !== 'string') return text;

    let maskedText = text;

    // 1. Mask Emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    maskedText = maskedText.replace(emailRegex, "[EMAIL_MASKED]");

    // 2. Mask Phone Numbers (Simple version)
    const phoneRegex = /(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    maskedText = maskedText.replace(phoneRegex, "[PHONE_MASKED]");

    // 3. Mask Credit Card Numbers (13-16 digits)
    const ccRegex = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b|\b\d{13,16}\b/g;
    maskedText = maskedText.replace(ccRegex, (match) => {
        // Keep last 4 digits if needed, or mask entirely
        return "[CARD_MASKED]";
    });

    return maskedText;
};

const piiMiddleware = (req, res, next) => {
    if (req.body && req.body.text) {
        req.body.text = maskPII(req.body.text);
    }
    next();
};

module.exports = { maskPII, piiMiddleware };
